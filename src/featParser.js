const fs = require('fs');
const Parser = require('./parser');
const chalk = require('chalk');

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
    async run (spells, dataPath) {
        const spellDict = spells.reduce((acc, spell) => {
            acc[spell.name] = spell;
            return acc;
        }, {});

        // Read Feats
        const stock = this.readAndParseImportedFeats();
        const homebrew = this.readHomebrewFeats(spellDict);
        const merged = this.synchronizeDates(this.getDbDict('packs/feats.db'), this.mergeByName(stock, homebrew));
        merged.sort((a, b) => a.name > b.name);

        // Export
        this.generateHalfFeatTable(merged);
        this.printDb(merged, [
            'packs/feats.db',
            'output/all/feats.db',
            'output/owlmagic-only/feats.db',
            'output/owlmagic-srd/feats.db',
            'E:/Foundry VTT/Data/modules/owlmarble-magic/packs/feats.db',
        ]);
        return await this.exportDb(merged, 'feats', dataPath);
    }

    readHomebrewFeats(spellDict) {
        const basicFeatsRaw = fs.readFileSync('feats/Feats.md', { encoding: 'utf-8', flag: 'r' })
            .split('\r\n## ')
            .filter((p, i) => i > 0);// Trim title line.
        console.log('Found ' + basicFeatsRaw.length + ' feats');
        const epicFeatsRaw = fs.readFileSync('feats/Epic Boons.md', { encoding: 'utf-8', flag: 'r' })
            .split('\r\n## ')
            .filter((p, i) => i > 0);// Trim title line.
        console.log('Found ' + epicFeatsRaw.length + ' epic boons');

        const featsRaw = [...basicFeatsRaw, ...epicFeatsRaw];

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
            const id = this.generateUUID(featName + ' (OwlMarble Magic)');
            return {
                _id: id,
                _key: '!items!' + id,
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
                    ],
                    type: {
                        value: 'feat',
                        subtype: ''
                    }
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
        return feats;
    }

    /**
     * Reads and parses all imported feat files.
     * @returns {[{}]}
     */
    readAndParseImportedFeats () {
        console.log(this.thinWall + '\nReading imported files...');
        const dirName = 'import/feats/';
        const fileNames =fs.readdirSync(dirName);
        fileNames.sort();
        const allFeats = [];
        fileNames.forEach((fileName) => {
            const contents = fs.readFileSync(dirName + fileName, { encoding: 'utf-8', flag: 'r' });
            allFeats.push(...this.parseImportedFile(JSON.parse(contents)));
        });

        // Sort first by name, then by level so we're sanely organized, not that the db really cares.
        allFeats.sort((a, b) => a.name < b.name);
        return allFeats;
    }

    /**
     * Parses the imported feats into husks
     * @param {{ feat: [{
     *   name: string,
     *   source: string,
     *   prerequisite: [{*}]
     *   ability: [{*}],
     *   additionalSpells: [{*}],
     *   entries: []
     * }]}} contents 
     * @returns {[
     * {
     *   _id: string,
     *   name: string,
     *   data: { description: {value: string } },
     * }
     * ]}
     */
    parseImportedFile(contents) {
        const feats = contents.feat;
        return feats.map(f => {
            try {
                const id = this.generateUUID(`${f.name} (${f.source})`);
    
                // For some reason, half-feats have the ASI selection outside entries.
                if (f.ability?.length) {
                    const asi = f.ability[0];
                    const options = [
                        asi.str || asi.choose?.from?.includes('str') ? 'Strength' : '',
                        asi.dex || asi.choose?.from?.includes('dex') ? 'Dexterity' : '',
                        asi.con || asi.choose?.from?.includes('con') ? 'Constitution' : '',
                        asi.int || asi.choose?.from?.includes('int') ? 'Intelligence' : '',
                        asi.wis || asi.choose?.from?.includes('wis') ? 'Wisdom' : '',
                        asi.cha || asi.choose?.from?.includes('cha') ? 'Charisma' : ''
                    ].filter(opt => opt);
    
                    const override = asi.choose?.from?.entry;
                    const str = options.length < 6
                        ? `Increase your ${this.orListString(options)} by 1, to a maximum of 20.`
                        : 'Increase any ability score by 1, to a maximum of 20';
                    const firstList = f.entries.find(entry => entry.type === 'list');
                    if (!firstList) throw new Error(chalk.red('First list did not exist for ' + f.name));
                    firstList.items.unshift(override || str);
                }
    
                return {
                    _id: id,
                    _key: '!items!' + id,
                    name: f.name,
                    type: 'feat',
                    img: 'icons/svg/upgrade.svg',
                    data: {
                        description: {
                            value: `<div>${this.parseImportedEntries(f.entries)}</div>`,
                            chat: '',
                            unidentified: ''
                        },
                        source: f.source,
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
                        requirements: this.parseImportedRequirements(f.prerequisite),
                        recharge: {
                            value: 0,
                            charged: false
                        },
                        cptooltipmode: [
                            'hid',
                            'hid'
                        ],
                        type: {
                            value: 'feat',
                            subtype: ''
                        }
                    },
                    effects: [],
                    flags: {
                        'owlmarble-magic': {
                            exportTime: (new Date()).toString()
                        }
                    }
                };
            }
            catch (e) {
                console.log('Failed to parse imported feat ' + f.name);
                console.error(e);
                return null;
            }
        }).filter(f => f);
    }

    /**
     * Parse imported prereqs
     * @param {[{*}]} prereqs
     * @returns {string} 
     */
    parseImportedRequirements(prereqs) {
        return prereqs?.map(p => {
            try {
                const elements = [];
                if (p.spellcasting) elements.push('Spellcasting');
                if (p.spellcastingPrepared) elements.push('Ability to prepare spells');
                if (p.level) elements.push('Level ' + p.level);
                if (p.feat) p.feat.forEach(f => elements.push(`${f.split('|')[0]}`));
                if (p.race) elements.push(p.race.map(r => `${r.subrace ? r.subrace + ' ' : ''}${r.name}`).join(' or '));
                if (p.proficiency) p.proficiency.forEach(prof => {
                    elements.push(Object.keys(prof).map(k => `${prof[k]} ${k}`)[0]);
                });
                if (p.ability) p.ability.forEach(a => elements.push(`${Object.keys(a)[0].toUpperCase()} ${a[Object.keys(a)[0]]}`));
                if (p.other) elements.push(p.other);
                return elements.join(', ');
            }
            catch (e) {
                console.error(chalk.red('Failed to parse ' + JSON.stringify(p)));
                return 'PARSE ERROR';
            }
        })?.join('; ') || '';
    }

    /**
     * Merges the two existing ones into a single array. B trumps A.
     * @param {[{name: string}]} a 
     * @param {[{name: string}]} b 
     * @return {[{name: string}]} merged
     */
    mergeByName(a, b) {
        const dict = {};
        a.forEach(el => {
            dict[el.name] = el;
        });
        b.forEach(el => {
            if (el.data.source === 'Updated') {
                el.data.source = `OMM(${dict[el.name].data.source})`;
            } else if (el.data.source.includes('Updated by')) {
                const author = el.data.source.split('Updated by ')[1];
                el.data.source = `${author}(${dict[el.name].data.source})`;
            } else if (el.data.source.includes('Updated from')) {
                const author = el.data.source.split('Updated from ')[1];
                el.data.source = `OMM(${author})`;
            }
            dict[el.name] = el;
        });
        return Object.keys(dict).map(k => dict[k]);
    }

    /**
     * Generates a markdown table of half feats.
     * @param {[{name: string}]} feats 
     */
    generateHalfFeatTable(feats) {
        const nameLeng = Math.max(...feats.map(f => f.name.length)) + '****'.length;
        const sourceLeng = Math.max(...feats.map(f => f.data.source.length));
        const lines = [
            '# Half Feats',
            '',
            `| ${'Feat'.padEnd(nameLeng, ' ')} | ${'Source'.padEnd(sourceLeng, ' ')} | STR | DEX | CON | INT | WIS | CHA | Prereqsuisite |`,
            `|:${''.padEnd(nameLeng, '-')}-|:${''.padEnd(sourceLeng, '-')}-|:---:|:---:|:---:|:---:|:---:|:---:|:--------------|`,
        ];
        const asiFlag = 'to a maximum of 20';

        let halfFeats = 0;
        feats.forEach(f => {
            const text = f.data.description.value;
            const isHalfFeat = text.includes(asiFlag);
            if (!isHalfFeat) return;

            const name = `**${f.name}**`.padEnd(nameLeng, ' ');
            const source = f.data.source.padEnd(sourceLeng, ' ');

            const asiLine = text.split('</li>').find(li => li.includes(asiFlag))?.toLowerCase();
            if (!asiLine) {
                console.error(chalk.red('Unable to find ASI line for ' + f.name));
                return;
            }
            const str = asiLine.includes('strength');
            const dex = asiLine.includes('dexterity');
            const con = asiLine.includes('constitution');
            const int = asiLine.includes('intelligence');
            const wis = asiLine.includes('wisdom');
            const cha = asiLine.includes('charisma');
            const any = !str && !dex && !con && !int && !wis && !cha;
            const gives = (ability) => ability || any ? '  ✓  ' : '     ';
            lines.push(`| ${name} | ${source} |${gives(str)}|${gives(dex)}|${gives(con)}|${gives(int)}|${gives(wis)}|${gives(cha)}| ${f.data.requirements} |`);
            halfFeats++;
        });
        lines.push('');
        console.log(`Found ${halfFeats} half feats`);
        fs.writeFileSync('./feats/Half Feats.md', lines.join('\n'));
    }
};