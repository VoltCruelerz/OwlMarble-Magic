const fs = require('fs');
const seedrandom = require('seedrandom');
const { detailedDiff } = require('deep-object-diff');


/**
 * Sets up a feat parser for OwlMarble Magic.
 * @class
 */
module.exports = class SpellParser {
    /**
     * HTML-ifies the bolding by converting from ** to <strong>.
     * @param {string} line 
     * @returns {string}
     */
    boldify (line) {
        const count = (line.match(/\*\*/g) || []).length;
        if (count % 2 != 0) {
            // We have an odd number, so don't even try to format this.  It would just get weird.
            console.log('Weird line found during boldification: ' + line);
            return line;
        }
        while (line.includes('**')) {
            if (line.lastIndexOf('<strong>') <= line.lastIndexOf('</strong>')) {
                // This means that we have closed the latest bold tag, so start a new one.
                line = line.replace('**', '<strong>');
            } else {
                // We have a hanging open tag, so close it.
                line = line.replace('**', '</strong>');
            }
        }
        return line;
    }

    /**
     * Italicizes or links anything enclosed in underscores.
     * @param {string} line The line to parse for italics and spell links.
     * @param {{}} spellDict The spell dictionary.
     * @returns A html-ified variant with compendium links.
     */
    italilink (line, spellDict) {
        const count = (line.match(/_/g) || []).length;
        if (count % 2 != 0) {
            // We have an odd number, so don't even try to format this.  It would just get weird.
            console.log('Weird line found during italilinking: ' + line);
            return line;
        }
        return line.replaceAll(/_(.*?)_/gm, (match, g1) => {
            const spell = spellDict[g1];
            if (spell) {
                return `@Compendium[owlmarble-magic.spells.${spell._id}]{${g1}}`;
            } else {
                return `<em>${g1}</em>`;
            }
        });
    }
    
    /**
     * HTML-ifies the paragraphs.
     * @param {string} line 
     * @returns {string}
     */
    paragraphify (line) {
        return '<p>' + line + '</p>';
    }

    /**
     * HTML-ifies the unordered lists.
     * @param {string} line 
     * @returns {string}
     */
    listify (line) {
        const content = line.match(/^\W*- (.*)/);
        return '<li>' + content[1] + '</li>';
    }

    /**
     * Gets the current list depth, assuming two spaces per level.
     * @param {string} line 
     * @returns {number} the depth of the list
     */
    listDepth (line) {
        const lineMatch = line.match(/^(\W*)- .+/);
        if (lineMatch) { 
            return lineMatch[1].length / 2 + 1;
        }
        return 0;
    }

    /**
     * Generates a UUID from a PRNG seeded on the spell's name.
     * @param {string} seed The seed for the RNG.
     * @returns {string} The UUID.
     */
    generateUUID (seed) {
        const rng = seedrandom(seed);
        const options = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const chars = [];
        const uuidLength = 16;
        for (let i = 0; i < uuidLength; i++) {
            chars.push(options.charAt(this.getRandomInt(options.length, rng)));
        }
        return chars.join('');
    }

    /**
     * Generates a random int from 0 (inclusive) to the max (exclusive).
     * @param {number} max The number of faces on the die.
     * @param {{*}} rng The random number generator.
     * @returns {number} a random number.
     */
    getRandomInt (max, rng) {
        return Math.floor(rng() * max);
    }

    /**
     * Prints the json objects to a Foundry db.
     * @param {[{}]} items
     * @param {string} path
     */
    printDb (items, path) {
        console.log('Printing to: ' + path);
        const lines = items.map((item) => JSON.stringify(item));
        const db = lines.join('\n') + '\n';
        fs.writeFileSync(path, db);
    }

    /**
     * Executes the parsing of the feats.
     * @param {[{}]} spells 
     * @returns 
     */
    run (spells) {
        const spellDict = spells.reduce((acc, spell) => {
            acc[spell.name] = spell;
            return acc;
        }, {});

        // Read Feats
        const featsRaw = fs.readFileSync('feats/feats.md', { encoding: 'utf-8', flag: 'r' })
            .split('\r\n## ')
            .filter((p, i) => i > 0);// Trim title line.
        console.log('Found ' + featsRaw.length + ' feats');

        const feats = featsRaw.map((raw) => {
            const featRawLines = raw.split('\r\n').filter((line) => line.length > 0);

            // Parse name and origin
            const featTitleLine = featRawLines[0];
            const titleMatch = featTitleLine.match(/(.*?) \[(.*?)\]/);
            if (!titleMatch) {
                throw new Error('Unrecognized title format: ' + featTitleLine);
            }
            const featName = titleMatch[1];
            let featOrigin = titleMatch[2];
            if (featOrigin === 'New') {
                featOrigin = 'OMM';
            }

            // Parse content
            const featLines = [];
            let requirements = '';
            for (let i = 1; i < featRawLines.length; i++) {
                const prevLine = i - 1 > -1 ? featRawLines[i - 1] : '';
                const nextLine = i + 1 < featRawLines.length ? featRawLines[i + 1] : '';
                let line = featRawLines[i];
                let nextLineInjection = undefined;

                const curDepth = this.listDepth(line);
                if (curDepth) { // Check for lists.
                    const prevDepth = prevLine ? this.listDepth(prevLine) : 0;
                    const nextDepth = nextLine ? this.listDepth(nextLine) : 0;
                    if (prevDepth < curDepth) {
                        // This is the start of the list, so prefix this.
                        featLines.push('<ul>');
                    }
                    if (nextDepth < curDepth) {
                        nextLineInjection = '</ul>'.repeat(curDepth - nextDepth);
                    }
                    line = this.listify(line);

                } else if (i === 1 && line.startsWith('_')) { // Check for prereq.
                    requirements = line
                        .replaceAll('_','')
                        .replaceAll('Requirement: ', '');
                } else { // All others are assumed to be normal text.
                    line = this.paragraphify(line);
                }
                featLines.push(this.boldify(this.italilink(line, spellDict)));

                // Insert list terminations.
                if (nextLineInjection) {
                    featLines.push(nextLineInjection);
                }
            }
            const featStr = featLines.join('');

            return {
                _id: this.generateUUID(featName + ' (OwlMarble Magic)'),
                name: featName,
                type: 'feat',
                img: 'icons/svg/upgrade.svg',
                data: {
                    description: {
                        value: `<div>${featStr}</div>`,
                        chat: '',
                        unidentified: ''
                    },
                    source: featOrigin,
                    activation: {
                        type: '',
                        cost: 0,
                        condition: ''
                    },
                    duration: {
                        value: 0,
                        units: ''
                    },
                    target: {
                        value: 0,
                        width: null,
                        units: '',
                        type: 'Creature'
                    },
                    range: {
                        value: 0,
                        long: 0,
                        units: ''
                    },
                    uses: {
                        value: 0,
                        max: 0,
                        per: ''
                    },
                    consume: {
                        type: '',
                        target: '',
                        amount: null
                    },
                    ability: '',
                    actionType: '',
                    attackBonus: 0,
                    chatFlavor: '',
                    critical: {
                        threshold: null,
                        damage: null
                    },
                    damage: {
                        parts: [],
                        versatile: ''
                    },
                    formula: '',
                    save: {
                        ability: '',
                        dc: null,
                        scaling: 'spell'
                    },
                    requirements: requirements,
                    recharge: {
                        value: 0,
                        charged: false
                    },
                    cptooltipmode: [
                        'hid',
                        'hid'
                    ]
                },
                effects: [],
                flags: {}
            };
        });

        this.printDb(feats, 'output/all/feats.db');
        this.printDb(feats, 'output/owlmagic-only/feats.db');
        this.printDb(feats, 'output/owlmagic-srd/feats.db');
        this.printDb(feats, 'E:/Foundry VTT/Data/modules/owlmarble-magic/packs/feats.db');

        return feats;
    }
};