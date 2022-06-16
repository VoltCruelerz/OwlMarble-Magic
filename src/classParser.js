const fs = require('fs');
const Parser = require('./parser');


/**
 * Sets up a feat parser for OwlMarble Magic.
 * @class
 */
module.exports = class ClassPraser extends Parser {
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
        const classFolder = 'classes';
        const classes = fs.readdirSync(classFolder);
        const folders = classes.filter((p) => !p.includes('.'));
        console.log('Folders: ' + folders);

        // Parse classes and their features
        let features = [];
        for (let i = 0; i < folders.length; i++) {
            const folder = folders[i];
            const classFileName = folder.charAt(0).toUpperCase() + folder.slice(1);
            const classPath = `./${classFolder}/${folder}/${classFileName}.md`;
            const raw = fs.readFileSync(classPath, { encoding: 'utf-8', flag: 'r'});

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
                    const descLineOptions = next
                        .split('\r\n')
                        .filter((line) => line && line !== '>');
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
                    const isQuote = line.startsWith('>');
                    if (isQuote) {
                        line = /> ?(?<content>.*)/.exec(line).groups.content;
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
                    } else if (this.lineIsHR(line)) {
                        line = '<hr />';
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
                    let formattedLine = this.linkify(this.boldify(this.italilink(line, `${classFileName}:${featureName}`, i, spellDict)));

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

        this.printDb(features, [
            'packs/features.db',
            'output/all/features.db',
            'output/owlmagic-only/features.db',
            'output/owlmagic-srd/features.db',
            'E:/Foundry VTT/Data/modules/owlmarble-magic/packs/features.db'
        ]);

        return features;
    }
};