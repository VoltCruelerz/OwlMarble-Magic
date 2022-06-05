const fs = require('fs');
const seedrandom = require('seedrandom');


/**
 * Sets up a feat parser for OwlMarble Magic.
 * @class
 */
module.exports = class FeatParser {
    //#region Formatting
    /**
     * Wraps the string in the specified tag.  For example, 'h3' and 'blah' gives '<h3>blah</h3>'.
     * @param {string} tag 
     * @param {string} string 
     * @returns {string}
     */
    tagify (tag, string) {
        if (!string) {
            return '';
        }
        return `<${tag}>${string}</${tag}>`;
    }
    
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
     * Converts a line with a number of #'s at the start into the appropriate html header, eg <h3>.
     * @param {string} line 
     * @returns {string}
     */
    headerify (line) {
        const heading = line.substr(line.indexOf(' ') + 1);
        const depth = (line.match(/#/g) || []).length;
        return this.tagify('h' + depth, heading);
    }

    /**
     * Converts a markdown table row into an html <tr>.
     * @param {string} line 
     * @param {boolean} isHeader 
     * @returns {string}
     */
    tableify (line, isHeader) {
        const tds = line.split('|').map((td) => td.trim()).filter((td) => td);
        const rowData = isHeader
            ? tds.map((td) => this.tagify('td', this.tagify('strong', td)))
            : tds.map((td) => this.tagify('td', td));
        return this.tagify('tr', rowData.join(''));
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
     * Checks if the current line starts with some number of #'s.
     * @param {string} line 
     * @returns {boolean}
     */
    lineIsHeader (line) {
        return !!line.match(/>? ?#+ /);
    }

    /**
     * Checks if we're in a table by looking for pipes at the start and end of the line.
     * @param {string} line 
     * @returns {boolean}
     */
    lineIsTable (line) {
        return line.startsWith('|') && line.endsWith('|');
    }
    //#endregion

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
     * Retrieves a DB file and parses it to a string -> entry dictionary.
     * @param {string} path 
     * @returns {{*}} dictionary
     */
    getDbDict (path) {
        console.log('======================================\nReading db file: ' + path);
        const contents = fs.readFileSync(path, { encoding: 'utf-8', flag: 'r' });
        const lines = contents.split('\n');
        const entries = lines.filter((line) => line).map((line) => JSON.parse(line));
        return entries.reduce((acc, entry) => {
            acc[entry.name] = entry;
            return acc;
        }, {});
    }

    /**
     * If the new item and old item are the same except for the date, use the old timestamp.
     * @param {[{}]} oldItems
     * @param {[{}]} newItems
     * @param {string} path
     */
    synchronizeDates (oldItemDict, newItems) {
        return newItems.map((newItem) => {
            const oldItem = oldItemDict[newItem.name] || {};
            const oldTimeless = JSON.parse(JSON.stringify(oldItem));
            const newTimeless = JSON.parse(JSON.stringify(newItem));
            oldTimeless.flags['owlmarble-magic'].exportTime = 'IGNORE ME';
            newTimeless.flags['owlmarble-magic'].exportTime = 'IGNORE ME';
            if (oldItem && JSON.stringify(oldTimeless) === JSON.stringify(newTimeless)) {
                newItem.flags['owlmarble-magic'].exportTime = oldItem.flags['owlmarble-magic'].exportTime;
            }
        });
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

        const oldFeats = this.getDbDict('packs/feats.db');

        // Read Feats
        const featsRaw = fs.readFileSync('feats/feats.md', { encoding: 'utf-8', flag: 'r' })
            .split('\r\n## ')
            .filter((p, i) => i > 0);// Trim title line.
        console.log('Found ' + featsRaw.length + ' feats');

        let feats = featsRaw.map((raw) => {
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
                } else if (this.lineIsHeader(line)) {
                    line = this.headerify(line);
                } else if (this.lineIsTable(line)) {
                    if (!this.lineIsTable(prevLine)) {
                        // This is the start of the table.
                        featLines.push('<table border="1"><tbody>');
                        line = this.tableify(line, true);
                        i++;// skip the |-----|--------|--------| line.
                    } else if (!this.lineIsTable(nextLine)) {
                        // This is the table, so close it.
                        line = this.tableify(line, false);
                        nextLineInjection = '</tbody></table>';
                    } else {
                        line = this.tableify(line, false);
                    }
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
                flags: {
                    'owlmarble-magic': {
                        exportTime: (new Date()).toString()
                    }
                }
            };
        });

        feats = this.synchronizeDates(oldFeats, feats);

        this.printDb(feats, 'packs/feats.db');
        this.printDb(feats, 'output/all/feats.db');
        this.printDb(feats, 'output/owlmagic-only/feats.db');
        this.printDb(feats, 'output/owlmagic-srd/feats.db');
        this.printDb(feats, 'E:/Foundry VTT/Data/modules/owlmarble-magic/packs/feats.db');

        return feats;
    }
};