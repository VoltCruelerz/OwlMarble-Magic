const fs = require('fs');
const Parser = require('./parser');

/**
 * Sets up a feat parser for OwlMarble Magic.
 * @class
 */
module.exports = class FeatParser extends Parser {
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
                featLines.push(this.boldify(this.italilink(line, featName, i, spellDict)));

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

        feats = this.synchronizeDates(this.getDbDict('packs/feats.db'), feats);

        this.printDb(feats, [
            'packs/feats.db',
            'output/all/feats.db',
            'output/owlmagic-only/feats.db',
            'output/owlmagic-srd/feats.db',
            'E:/Foundry VTT/Data/modules/owlmarble-magic/packs/feats.db',
        ]);

        return feats;
    }
};