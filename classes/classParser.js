const fs = require('fs');
const seedrandom = require('seedrandom');


/**
 * Sets up a feat parser for OwlMarble Magic.
 * @class
 */
module.exports = class ClassPraser {
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
     * Gets the title depth of a given line based on the number of #'s in it.
     * @param {string} line The line to evaluate.
     * @returns The number.
     */
    getTitleDepth (line) {
        const trackedTitleRegexGetDepth = /((?<depth>#+) (?:.*?))/;
        const result = trackedTitleRegexGetDepth.exec(line);
        if (!result) {
            return 0;
        }
        return result.groups.depth;
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
        const trackedTitleRegex = /((?:#+) (?:.*?) \[(?:\w+)])/;
        const trackedTitleRegexGetName = /((?:#+) (?<name>.*?) \[(?:\w+)])/;

        // Read Classes
        const classes = fs.readdirSync('classes');
        const folders = classes.filter((p) => !p.includes('.'));
        console.log('Folders: ' + folders);

        let features = [];
        for (let i = 0; i < folders.length; i++) {
            const folder = folders[i];
            const classFileName = folder.charAt(0).toUpperCase() + folder.slice(1);
            const raw = fs.readFileSync(`./classes/${folder}/${classFileName}.md`, { encoding: 'utf-8', flag: 'r'});

            const trackedFeatures = raw.split(trackedTitleRegex);

            // Every other element in tracked features will be a feature title.
            // The following element is their description plus whatever else until the next tracked title.
            // For each title, we need to splice out anything that has a lower title depth.

            // Discard the first element because that's just going to be boilerplate.
            const rawFeatures = [];
            for (let j = 1; j < trackedFeatures.length; j++) {
                const current = trackedFeatures[j];

                if (current.match(trackedTitleRegex)) {
                    const rawFeatureLines = [trackedTitleRegexGetName.exec(current).groups.name];
                    const depth = this.getTitleDepth(current);
                    const next = j + 1 < trackedFeatures.length ? trackedFeatures[j + 1] : '';
                    const descLineOptions = next.split('\r\n').filter((line) => line);
                    for (let k = 0; k < descLineOptions.length; k++) {
                        const consideredLine = descLineOptions[k];
                        const consideredDepth = this.getTitleDepth(consideredLine);
                        if (consideredDepth === 0 || consideredDepth > depth) {
                            // Continue adding to this description.
                            rawFeatureLines.push(consideredLine);
                        } else {
                            // Break out. We've reached an untracked feature.
                            break;
                        }
                    }
                    rawFeatures.push(rawFeatureLines);
                } else {
                    // Do nothing. We'll handle this later (if at all).
                }
            }

            rawFeatures.forEach((rawFeatureLines) => {
                
                // Parse name and origin
                const featureName = rawFeatureLines[0];
    
                // Parse content
                const featureLines = [];
                for (let i = 1; i < rawFeatureLines.length; i++) {
                    const prevLine = i - 1 > -1 ? rawFeatureLines[i - 1] : '';
                    const nextLine = i + 1 < rawFeatureLines.length ? rawFeatureLines[i + 1] : '';
                    let line = rawFeatureLines[i];
                    let nextLineInjection = undefined;
    
                    const curDepth = this.listDepth(line);
                    if (curDepth) { // Check for lists.
                        const prevDepth = prevLine ? this.listDepth(prevLine) : 0;
                        const nextDepth = nextLine ? this.listDepth(nextLine) : 0;
                        if (prevDepth < curDepth) {
                            // This is the start of the list, so prefix this.
                            featureLines.push('<ul>');
                        }
                        if (nextDepth < curDepth) {
                            nextLineInjection = '</ul>'.repeat(curDepth - nextDepth);
                        }
                        line = this.listify(line);
                    } else if (this.lineIsHeader(line)) {
                        line = this.headerify(line);
                    } else if (this.lineIsTable(line)) {
                        if (!this.lineIsTable(prevLine)) {
                            // This is the start of the table.
                            featureLines.push('<table border="1"><tbody>');
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
                    featureLines.push(this.boldify(this.italilink(line, spellDict)));
    
                    // Insert list terminations.
                    if (nextLineInjection) {
                        featureLines.push(nextLineInjection);
                    }
                }
                const featureString = featureLines.join('');
    
                features.push({
                    _id: this.generateUUID(featureName + ' (OwlMarble Magic)'),
                    name: featureName,
                    type: 'feat',
                    img: 'modules/owlmarble-magic/icons/classes/' + classFileName + '.svg',
                    data: {
                        description: {
                            value: `<div>${featureString}</div>`,
                            chat: '',
                            unidentified: ''
                        },
                        source: 'OMM',
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
                        requirements: classFileName,
                        recharge: {
                            value: 0,
                            charged: false
                        }
                    },
                    effects: [],
                    flags: {}
                });
            });
        }


        this.printDb(features, 'packs/features.db');
        this.printDb(features, 'output/all/features.db');
        this.printDb(features, 'output/owlmagic-only/features.db');
        this.printDb(features, 'output/owlmagic-srd/features.db');
        this.printDb(features, 'E:/Foundry VTT/Data/modules/owlmarble-magic/packs/features.db');

        return features;
    }
};