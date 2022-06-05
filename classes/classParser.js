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
    headerify (line, offset = 0) {
        const heading = line.substr(line.indexOf(' ') + 1);
        const depth = (line.match(/#/g) || []).length - offset;
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
        return line.match(/^(?:> )?\|(?:.*?\|)+$/);
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
     * Retrieves a DB file and parses it to a string -> entry dictionary.
     * @param {string} path 
     * @returns {{*}} dictionary
     */
    getDbDict (path) {
        console.log('======================================\nReading db file: ' + path);
        const contents = fs.readFileSync(path, { encoding: 'utf-8', flag: 'r' });
        const lines = contents.split('\n');
        const entries = lines.filter((line) => line).map((line) => JSON.parse(line));
        console.log('Entries: ' + entries.length);
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
            const oldItem = oldItemDict[newItem.name];
            if (oldItem) {
                const oldTimeless = JSON.parse(JSON.stringify(oldItem));
                const newTimeless = JSON.parse(JSON.stringify(newItem));
                oldTimeless.flags['owlmarble-magic'].exportTime = 'IGNORE ME';
                newTimeless.flags['owlmarble-magic'].exportTime = 'IGNORE ME';
                if (JSON.stringify(oldTimeless) === JSON.stringify(newTimeless)) {
                    newItem.flags['owlmarble-magic'].exportTime = oldItem.flags['owlmarble-magic'].exportTime;
                }
            }
            return newItem;
        });
    }

    /**
     * Gets the title depth of a given line based on the number of #'s in it.
     * @param {string} line The line to evaluate.
     * @returns {number} The number.
     */
    getTitleDepth (line) {
        const trackedTitleRegexGetDepth = /((?<depth>#+) (?:.*?))/;
        const result = trackedTitleRegexGetDepth.exec(line);
        if (!result) {
            return 0;
        }
        return parseInt(result.groups.depth.length);
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

        // Parse classes and their features
        let features = [];
        for (let i = 0; i < folders.length; i++) {
            const folder = folders[i];
            const classFileName = folder.charAt(0).toUpperCase() + folder.slice(1);
            const raw = fs.readFileSync(`./classes/${folder}/${classFileName}.md`, { encoding: 'utf-8', flag: 'r'});

            // After splitting, every other element in tracked features will be a feature title.
            // The following element is their description plus whatever else until the next tracked title.
            // For each title, we need to splice out anything that has a lower title depth.
            const trackedFeatures = raw.split(trackedTitleRegex);

            const rawFeatures = [];
            // Discard the first element because that's just going to be boilerplate.
            for (let j = 1; j < trackedFeatures.length; j++) {
                const current = trackedFeatures[j];

                if (current.match(trackedTitleRegex)) {
                    const rawFeatureLines = [current];
                    const depth = this.getTitleDepth(current);
                    const next = j + 1 < trackedFeatures.length ? trackedFeatures[j + 1] : '';
                    const descLineOptions = next.split('\r\n').filter((line) => line && line !== '>');
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

            // Process features.
            rawFeatures.forEach((rawFeatureLines) => {
                // Parse name
                const featureName = trackedTitleRegexGetName.exec(rawFeatureLines[0]).groups.name;

                // Parse depth for the offset.
                // For example, if the header is ###, and it has a subheading ####, that should be ultimately rendered as h1, not h4.
                const depth = this.getTitleDepth(rawFeatureLines[0]);
    
                // Parse content
                const featureLines = [];
                for (let i = 1; i < rawFeatureLines.length; i++) {
                    const prevLine = i - 1 > -1 ? rawFeatureLines[i - 1] : '';
                    const nextLine = i + 1 < rawFeatureLines.length ? rawFeatureLines[i + 1] : '';
                    let line = rawFeatureLines[i];
                    let nextLineInjection = undefined;
    
                    // Handle quotes first because they can encapsulate other formatting.
                    const isQuote = line.startsWith('> ');
                    if (isQuote) {
                        line = line.slice(2);
                        featureLines.push('<blockquote>');
                    }

                    // Handle other formatting.
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
                        line = this.headerify(line, depth);
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
                    
                    // Handle final formatting
                    let formattedLine = this.boldify(this.italilink(line, spellDict));

                    // Add the line.
                    featureLines.push(formattedLine);
    
                    // Insert table/list terminations.
                    if (nextLineInjection) {
                        featureLines.push(nextLineInjection);
                    }

                    // If in a quote, close it out.
                    if (isQuote) {
                        featureLines.push('</blockquote>');
                    }
                }
                const featureString = featureLines
                    .join('')// Merge lines.
                    .replaceAll('</blockquote><blockquote>', '');// Merge adjacent block quotes.

                features.push({
                    _id: this.generateUUID(`${featureName} - ${classFileName} (OwlMarble Magic - Features)`),
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
                    flags: {
                        'owlmarble-magic': {
                            exportTime: (new Date()).toString()
                        }
                    }
                });
            });
        }

        // Check for name collisions.
        features.reduce((acc, feature) => {
            if (!acc[feature.name]) {
                acc[feature.name] = feature;
            } else {
                const existing = acc[feature.name];
                console.log(`- Disambiguating Name Collision for "${feature.name}" between ${existing.data.requirements} and ${feature.data.requirements}`);
                // Check that we haven't already updated the other one.
                if (feature.name === existing.name) {
                    // Update the existing feature.
                    existing.name = `${existing.name} (${existing.data.requirements})`;
                }

                // Update the current one.
                feature.name = `${feature.name} (${feature.data.requirements})`;
            }
            return acc;
        }, {});
        features = this.synchronizeDates(this.getDbDict('packs/features.db'), features);

        this.printDb(features, 'packs/features.db');
        this.printDb(features, 'output/all/features.db');
        this.printDb(features, 'output/owlmagic-only/features.db');
        this.printDb(features, 'output/owlmagic-srd/features.db');
        this.printDb(features, 'E:/Foundry VTT/Data/modules/owlmarble-magic/packs/features.db');

        return features;
    }
};