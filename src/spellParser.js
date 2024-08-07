const fs = require('fs');
const chalk = require('chalk');
const Parser = require('./parser');
const { detailedDiff } = require('deep-object-diff');
const overrides = require('./parseOverrides');

/**
 * Sets up a spell parser for OwlMarble Magic.
 * @class
 */
module.exports = class SpellParser extends Parser {
    constructor () {
        super();
        this.timeRegex = /(-?\d+) (action|bonus action|minute|hour|day|year|reaction|round|week)s?(, (.*))?/;
        this.healingRegex = /heal|((restore|regain).*hit points?)/;
    }

    /**
     * If the spell has overriden fields in `parseOverrides.json`, replace them here.  If the override is outdated, warn the user.
     * @param {{*}} spell 
     * @param {string} src 
     */
    overrideSpell (spell, src) {
        const softWall = chalk.gray('─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ');
              
        // Handle manual override substitutions.
        if (overrides[spell.name]) {
            const overData = overrides[spell.name];
            if (!overData)
                throw new Error('Unrecognized overData for spell ' + spell.name + ':\n' + chalk.yellow(JSON.stringify(overData, null, 4)));
            const spellData = spell.system;
            if (!spellData)
                throw new Error('Unrecognized spellData for spell ' + spell.name + ':\n' + chalk.yellow(JSON.stringify(spellData, null, 4)));
            const fields = Object.keys(overData);
            fields.forEach((field) => {
                const overField = overData[field];
                const targetField = JSON.stringify(overField[src.toLowerCase()] || overField.old);
                if (targetField !== JSON.stringify(spellData[field])) {
                    console.warn(chalk.yellow(`${softWall}\nWARNING - Outdated Override for ${src} L${spell.system.level} ${spell.name}'s ${field}\n- Expected: ${targetField}\n-    Found: ${JSON.stringify(spellData[field])}\n${softWall}`));
                }
                spellData[field] = overField.new;
            });
        }
    }

    //#region IO
    /**
     * Indexes the spells and monsters.
     * @returns {{*}} A dictionary containing spell and creature names to the github permalink.
     */
    indexSpellsAndMonsters () {
        console.log('Indexing spells and monsters...');
        const indices = {};
        const github = 'https://github.com/VoltCruelerz/OwlMarble-Magic/blob/master/';

        // Load all the spells.
        const spellNameTag = '## ';
        const spellNameRegex = /## (.*)/;
        const dirName = 'spells/levels/';
        const fileNames = fs.readdirSync(dirName);
        fileNames.forEach((fileName) => {
            const contents = fs.readFileSync(dirName + fileName, { encoding: 'utf-8', flag: 'r' });
            const spellNames = contents.split('\r\n')
                .filter((line) => line.startsWith(spellNameTag))
                .map((spellLine) => spellLine.match(spellNameRegex)[1]);
            spellNames.forEach((spellName) => {
                const linkableName = spellName
                    .replaceAll(' ','-')
                    .replaceAll('\'','')
                    .toLowerCase();
                indices[spellName] = `${github}/spells/levels/${fileName}#${linkableName}`;
            });
        });

        // Load the monsters.
        const monsterNameTag = '> ## ';
        const monsterNameRegex = /> ## (.*)/;
        const monsterNames = fs.readFileSync('monsters/Monster Blocks.md', { encoding: 'utf-8', flag: 'r' })
            .split('\r\n')
            .filter((line) => line.startsWith(monsterNameTag))
            .map((monsterNameLine) => monsterNameLine.match(monsterNameRegex)[1]);
        monsterNames.forEach((monsterName) => {
            const linkableName = monsterName.replaceAll(' ', '-').toLowerCase();
            indices[monsterName] = `${github}/monsters/Monster%20Blocks.md#${linkableName}`;
        });

        return indices;
    }

    /**
     * Updates all references (proper names wrapped by underscores) in the spell source files.
     * @param {{*}} indices 
     */
    updateReferences (indices) {
        const dirName = 'spells/levels/';
        const fileNames = fs.readdirSync(dirName);
        fileNames.forEach((fileName) => {
            const contents = fs.readFileSync(dirName + fileName, { encoding: 'utf-8', flag: 'r' });
            const updated = contents.replaceAll(/(^|\W)_(\w.*?\w)_(s\W|\W|$)/g, (match, g1, g2, g3) => {
                if (match.startsWith('_replaces ') || !indices[g2]) {
                    return match;
                }
                const replacement = `${g1}[${g2}](${indices[g2]})${g3}`;
                console.log('Replacing with Index...');
                console.log(' - From: ' + match);
                console.log(' - To: ' + replacement);
                return replacement;
            });

            // Don't rewrite the file if nothing changed.
            if (updated === contents) {
                return;
            }

            // Rewrite the file with the new content.
            try {
                fs.writeFileSync(dirName + fileName, updated, { encoding: 'utf-8', flag: 'w' });
            } catch (e) {
                console.error(e);
            }
        });
    }

    /**
     * Reads all input files and parses them.
     */
    readAndParseInputFiles () {
        console.log(this.thinWall + '\nReading input files...');
        const dirName = 'spells/levels/';
        const fileNames =fs.readdirSync(dirName);
        const allSpells = [];
        fileNames.forEach((fileName) => {
            const level = parseInt(fileName.substr(0, fileName.indexOf('.')));
            const contents = fs.readFileSync(dirName + fileName, { encoding: 'utf-8', flag: 'r' });
            allSpells.push(...this.parseOwlMarbleFile(contents, level));
        });

        // Sort first by name, then by level so we're sanely organized, not that the db really cares.
        this.sortSpellList(allSpells);
        return allSpells;
    }

    /**
     * Reads the spells from the specified db.
     * @param {string} path 
     * @returns 
     */
    readSpellDB (path) {
        console.log(this.thinWall + '\nReading db file: ' + path);
        const contents = fs.readFileSync(path, { encoding: 'utf-8', flag: 'r' });
        const lines = contents.split('\n');
        const dbSpells = lines.filter((line) => line).map((line) => JSON.parse(line));
        return dbSpells;
    }

    /**
     * Reads and parses all imported spell files.
     * @returns [{}]
     */
    readAndParseImportedSpells () {
        console.log(this.thinWall + '\nReading imported files...');
        const dirName = 'import/spells/';
        const fileNames =fs.readdirSync(dirName);
        fileNames.sort();
        const allSpells = [];
        fileNames.forEach((fileName) => {
            const contents = fs.readFileSync(dirName + fileName, { encoding: 'utf-8', flag: 'r' });
            allSpells.push(...this.parseImportedFile(contents));
        });

        // Sort first by name, then by level so we're sanely organized, not that the db really cares.
        this.sortSpellList(allSpells);
        return allSpells;
    }

    /**
     * Prints the spells to the output folder in a db file.
     * @param {[{}]} oldSpells
     * @param {[{}]} newSpells
     * @param {string} path
     * @param {string} exportDir 
     * @returns {Promise<boolean>} didExport
     */
    async printSpells (oldSpells, newSpells, path, exportDir) {
        console.log('Printing to: ' + path);

        // Build dictionary.
        const oldLookup = oldSpells.reduce((acc, spell) => {
            acc[spell.name] = spell;
            return acc;
        }, {});

        // Create deep copy so we can add a timestamp without gumming up the diff checker.
        newSpells = JSON.parse(JSON.stringify(newSpells));
        newSpells.forEach((newSpell) => {
            const oldSpell = oldLookup[newSpell.name];

            // Create timeless versions for comparison.
            const timelessOld = JSON.parse(JSON.stringify(oldSpell || {}));
            const timelessNew = JSON.parse(JSON.stringify(newSpell));
            if (!timelessOld.flags) {
                timelessOld.flags = {
                    ['owlmarble-magic']: {
                        exportTime: 'IGNORE ME'
                    }
                };
            }
            timelessOld.flags['owlmarble-magic'].exportTime = 'IGNORE ME';
            if (!timelessNew.flags['owlmarble-magic']) {
                timelessNew.flags['owlmarble-magic'] = {
                    exportTime: 'IGNORE ME'
                };
            }
            timelessNew.flags['owlmarble-magic'].exportTime = 'IGNORE ME';

            // Only update the export time if it's actually changed somehow.
            if (!oldSpell || JSON.stringify(timelessOld) !== JSON.stringify(timelessNew)) {
                newSpell.flags['owlmarble-magic'] = {
                    exportTime: (new Date()).toString()
                };
            } else {
                newSpell.flags['owlmarble-magic'] = {
                    exportTime: oldSpell.flags['owlmarble-magic'].exportTime
                };
            }
        });
        
        // Print.
        const spellLines = newSpells.map((spell) => JSON.stringify(spell));
        const db = spellLines.join('\n') + '\n';
        fs.writeFileSync(path, db);

        // Export.
        if (exportDir !== '') {
            return await this.exportDb(newSpells, 'spells', exportDir);
        }
        return false;
    }

    /**
     * Prints the spells' class ownership for the Compendium Browser module.
     * @param {[{}]} spells
     * @param {string} path
     */
    exportSpellListsJson (spells, path) {
        console.log('Exporting Ownership to: ' + path);
        const ownership = {};
        spells.forEach((spell) => {
            const name = spell.name.toLowerCase().replaceAll(/\W/g,'');
            ownership[name] = spell.system.classes.join(',').toLowerCase();
        });

        const ordered = Object.keys(ownership).sort().reduce(
            (obj, key) => { 
                obj[key] = ownership[key]; 
                return obj;
            }, 
            {}
        );
        fs.writeFileSync(path, JSON.stringify(ordered, null, 2));
    }

    /**
     * Prints the spells' class ownership for the Compendium Browser module.
     * @param {[{}]} spells
     */
    exportCompendiumBrowser (spells) {
        console.log('Exporting to Compendium Browser');
        const startTarget = 'let list = {';
        const stopTarget = '};';

        const payload = spells
            .sort((a,b) => a.name > b.name)
            .map((spell, i) => {
                const name = spell.name.toLowerCase().replaceAll(/\W/g,'');
                const users = spell.system.classes.join(',').toLowerCase();
                const isLast = i === spells.length - 1;
                const comma = isLast ? '' : ',';
                return `${name}: "${users}"${comma}`;
            });

        Parser.setCompendiumBetweenTargets(startTarget, stopTarget, payload);
    }
    //#endregion

    //#region Parse OwlMagic
    //#region High-Level Parsing
    /**
     * Parses the string content from a file into spells.
     * @param {string} content String contents.
     * @param {number} level The current level.
     * @returns {[{}]} Array of spell objects.
     */
    parseOwlMarbleFile (content, level) {
        const spellTexts = content.replaceAll('\r', '')
            .split(/\n## /)
            .filter((spellText) => spellText)
            .map((spellText) => spellText.split('\n').filter((line) => line));
        return spellTexts
            .filter((text, index) => index > 0)
            .map((text) => this.parseHomebrewSpellText(text, level));
    }

    /**
     * Parses the lines that make up a single homebrew spell.
     * @param {[string]} lines The lines of the spell.  May include whitespace and underscore lines.
     * @param {number} level The spell level.
     * @returns {{}}
     */
    parseHomebrewSpellText (lines, level) {
        const name = lines[0];
        try {
            let oldName = undefined;
            if (lines[1].includes('_Replaces ')) {
                throw new Error(chalk.red(name + ' should have had "_replaces", not "_Replaces"'));
            }
            const replacementMatch = lines[1].match(/_replaces (.*?)_/);
            if (replacementMatch) {
                oldName = replacementMatch[1];
                lines = [
                    lines[0],
                    ...lines.splice(2)
                ];
            }
            const school = this.parseSpellTrait('School', lines[1]);
            const castTime = this.parseSpellTrait('Casting Time', lines[2]);
            const range = this.parseSpellTrait('Range', lines[3]);
            const components = this.parseSpellTrait('Components', lines[4]);
            const duration = this.parseSpellTrait('Duration', lines[5]);
            const classes = this.parseSpellTrait('Classes', lines[6]).split(', ');// This is not actually used.
            const description = this.parseDescription(lines.splice(7));

            // Build the config.
            const id = this.generateUUID(name + ' (OwlMarble Magic)');
            const spell = {
                _id: id,
                _key: '!items!' + id,
                name,
                type: 'spell',
                img: this.getImage(school),
                system: {
                    description: {
                        value: description,
                        chat: ''
                    },
                    source: {
                        custom: 'OMM - ' + level
                    },
                    activation: this.getActivation(castTime),
                    duration: this.getDuration(duration),
                    target: this.getTarget(range, description),
                    range: this.getRange(range),
                    uses: {
                        value: 0,
                        max: 0,
                        per: null,
                        recovery: '',
                        prompt: true
                    },
                    ability: '',
                    actionType: this.getActionType(description),
                    attackBonus: 0,
                    chatFlavor: '',
                    critical: {
                        threshold: null,
                        damage: ''
                    },
                    damage: this.getDamage(description),
                    formula: '',
                    save: this.getSave(level, description),
                    level,
                    school: this.getSchoolCode(school),
                    properties: this.getComponents(castTime, duration, components),
                    materials: this.getMaterials(components),
                    preparation: {
                        mode: 'prepared',
                        prepared: false
                    },
                    scaling: this.getScaling(level, description),
                    attack: {
                        bonus: '',
                        flat: false
                    },
                    cover: null,
                    crewed: false,
                    consume: {
                        type: '',
                        target: null,
                        amount: null,
                        scale: false
                    },
                    summons: null,
                    classes: classes
                },
                effects: [],
                sort: 0,
                flags: {
                    exportSource: {
                        world: 'none',
                        system: 'dnd5e',
                        coreVersion: '11.315',
                        systemVersion: '3.1.2'
                    },
                    'owlmarble-magic': {}
                },
                _stats: {
                    systemId: 'dnd5e',
                    systemVersion: '3.1.2',
                    coreVersion: '11.315',
                    createdTime: 0,
                    modifiedTime: 0,
                    lastModifiedBy: 'gxIfijvGnRnAJg5u'
                }
            };
            if (oldName) {
                spell.oldName = oldName;
            }

            this.overrideSpell(spell, 'OMM');

            return spell;
        } catch (e) {
            console.error('Failed to Parse ' + level + ' - ' + name);
            throw e;
        }
    }
    //#endregion

    //#region Trait Parsing
    /**
     * Retrieves the value of a key spell trait such as Casting Time
     * @param {string} trait 
     * @param {string} line 
     * @returns {string} The value of the trait.
     */
    parseSpellTrait (trait, line) {
        const prefix = '- **' + trait + '**: ';
        return line.substr(prefix.length);
    }
    //#endregion

    //#region Description Parsing
    /**
     * Parses the lines in a spell that are dedicated to its description.
     * @param {[string]} detailLines The lines used for the description.
     * @returns {string} The string for the description field.
     */
    parseDescription (detailLines) {
        const parsedLines = [];
        for (let i = 0; i < detailLines.length; i++) {
            let line = detailLines[i];
            const prevLine = i - 1 > -1 ? detailLines[i - 1] : '';
            const nextLine = i + 1 < detailLines.length ? detailLines[i + 1] : '';
            let nextLineInjection = undefined;

            // If we're in a list.
            const curDepth = this.listDepth(line);
            if (curDepth) {
                const prevDepth = prevLine ? this.listDepth(prevLine) : 0;
                const nextDepth = nextLine ? this.listDepth(nextLine) : 0;
                if (prevDepth < curDepth) {
                    // This is the start of the list, so prefix this.
                    parsedLines.push('<ul>');
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
                    parsedLines.push('<table border="1"><tbody>');
                    line = this.tableify(line, true);
                    i++;// skip the |-----|--------|--------| line.
                } else if (!this.lineIsTable(nextLine)) {
                    // This is the table, so close it.
                    line = this.tableify(line, false);
                    nextLineInjection = '</tbody></table>';
                } else {
                    line = this.tableify(line, false);
                }
            } else {
                line = this.paragraphify(line);
            }
            
            line = this.linkify(this.preify(this.italicize(this.boldify(line))));
            parsedLines.push(line);
            if (nextLineInjection) {
                parsedLines.push(nextLineInjection);
            }
        }
        return parsedLines.join('');
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
            console.log(chalk.yellow('Weird line found during boldification: ' + line));
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
     * HTML-ifies the italicizing by converting from _ to <em>.
     * @param {string} line 
     * @returns {string}
     */
    italicize (line) {
        const count = (line.match(/_/g) || []).length;
        if (count % 2 !== 0) {
            // We have an odd number, so don't even try to format this. It would just get weird.
            const knownWeirdLines = [
                '<p><strong>Source</strong>: [Empyreal Worlds](https://www.reddit.com/r/DnDHomebrew/comments/p47mrf/dark_dilemma_a_9thlevel_warlock_spells_doom_your/)</p>'
            ];
            if (!knownWeirdLines.includes(line)) {
                console.log(chalk.yellow('Weird line found during italicization: ' + line));
            }
            return line;
        }
        while (line.includes('_')) {
            if (line.lastIndexOf('<em>') <= line.lastIndexOf('</em>')) {
                // This means that we have closed the latest italics tag, so start a new one.
                line = line.replace('_', '<em>');
            } else {
                // We have a hanging open tag, so close it.
                line = line.replace('_', '</em>');
            }
        }
        return line;
    }

    /**
     * Replaces backtick blocks with <pre>.
     * @param {string} line 
     */
    preify (line) {
        const count = (line.match(/`/g) || []).length;
        if (count % 2 != 0) {
            // We have an odd number, so don't even try to format this.  It would just get weird.
            console.log(chalk.yellow('Weird line found during preformatted code parsing: ' + line));
            return line;
        }
        while (line.includes('`')) {
            if (line.lastIndexOf('<pre>') <= line.lastIndexOf('</pre>')) {
                // This means that we have closed the latest preformatted tag, so start a new one.
                line = line.replace('`', '<pre>');
            } else {
                // We have a hanging open tag, so close it.
                line = line.replace('`', '</pre>');
            }
        }
        return line;
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
     * Replaces markdown links with html links.
     * @param {string} line 
     * @returns {string}
     */
    linkify (line) {
        return line.replaceAll(/(^|\W)\[(\w.*?\w)\]\((https:\/\/.*?)\)(\W|$)/g, (match, g1, g2, g3, g4) => {
            const pre = g1;
            const name = g2;
            const url = g3;
            const post = g4;
            return `${pre}<a href="${url}">${name}</a>${post}`;
        });
    }

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

    //#region Config Field Generators
    /**
     * Gets the activation object.
     * @param {string} castTime 
     * @return {{type: string, cost: number, condition: string}}
     */
    getActivation (castTime) {
        castTime = castTime.toLowerCase().replace(' ritual', '');
        const match = castTime.match(this.timeRegex);
        if (match) {
            return {
                type: match[2].split(' ')[0],
                cost: parseInt(match[1]),
                condition: match[4] || ''
            };
        }
        if (castTime === 'special') {
            return {
                'type': 'special',
                'cost': null,
                'condition': ''
            };
        }
        throw new Error('Unrecognized cast time: ' + castTime);
    }

    /**
     * Generates the duration object.
     * @param {string} duration 
     * @returns {{value: number, units: string}}
     */
    getDuration (duration) {
        duration = duration.toLowerCase()
            .replace('concentration, ', '')
            .replace('up to ', '');

        const match = duration.match(this.timeRegex);
        if (match) {
            return {
                value: parseInt(match[1]),
                units: match[2]
            };
        } else if (duration === 'instantaneous') {
            return {
                value: '',
                units: 'inst'
            };
        } else if (duration === 'permanent' || duration === 'until dispelled') {
            return {
                value: '',
                units: 'perm'
            };
        } else if (duration === 'special') {
            return {
                value: '',
                units: 'spec'
            };
        } else {
            throw new Error('Unrecognized duration: ' + duration);
        }
    }

    /**
     * Generates an object for AoEs.
     * @param {[*]} match 
     * @param {{*}} description
     * @returns {{value: number, units: string, shape: string}}
     */
    getAoE (match, description) {
        let val = parseInt(match[1]);
        let units = match[2];
        if (units.startsWith('foot') || units.startsWith('feet')) {
            units = 'ft';
        } else if (units.startsWith('mile') || units.startsWith('miles')) {
            units = 'mi';
        }
        
        let shape = match[3];

        // Walls are defined by three traits: length, height, and width.
        if (shape === 'wall') {
            const longRegex = /(\d+) (foot|feet|mile|miles) (long|in length)/;
            const tallRegex = /(\d+) (foot|feet|mile|miles) (tall|in height|high)/;
            const widthRegex = /(\d+) (foot|feet|mile|miles) (thick|deep)/;
            const longMatch = description.match(longRegex);
            const tallMatch = description.match(tallRegex);
            const widthMatch = description.match(widthRegex);
            if (longMatch && tallMatch && widthMatch) {
                const length = parseInt(longMatch[1]);
                const width = parseInt(widthMatch[1]);
                return {
                    value: length,
                    units: units,
                    width: width,
                    type: shape
                };
            }
        }

        // Normal shapes are defined by shape and one dimension.
        shape = shape.replaceAll('-', ' ');
        const terms = shape.split(' ');
        if (terms.length === 2) {
            const isRound = terms[1] === 'sphere' || terms[1] === 'cylinder';
            if (terms[0] === 'radius' && isRound) {
                shape = terms[1];
            } else if (terms[0] === 'diameter' && isRound) {
                val /= 2;
                shape = terms[1];
            } else {
                throw new Error('Unrecognized AoE: ' + match[0]);
            }
        } else if (terms.length === 1) {
            if (shape === 'sphere' || shape === 'cylinder') {
                // If someone decided to measure a sphere without a term, assume they meant diameter.
                val /= 2;
            }
        } else {
            throw new Error('Unrecognized AoE: ' + match[0]);
        }

        if (shape === 'radius' && (description.includes('cylinder') || description.includes('pillar') || description.includes('column'))) {
            shape = 'cylinder';
        }

        return {
            value: val,
            units: units,
            type: shape,
            width: null,
            prompt: true
        };
    }

    /**
     * Generates the target object.
     * @param {string} range 
     * @param {string} description 
     * @returns {{value: number, units: string, type: string}}
     */
    getTarget (range, description) {
        range = range.toLowerCase();
        description = description.toLowerCase()
            .replaceAll('zero', '0')
            .replaceAll('one', '1')
            .replaceAll('two', '2')
            .replaceAll('three', '3')
            .replaceAll('four', '4')
            .replaceAll('five', '5')
            .replaceAll('six', '6')
            .replaceAll('seven', '7')
            .replaceAll('eight', '8')
            .replaceAll('nine', '9')
            .replaceAll('ten', '10');
        const targetRegex = /(\d+)\W(\D+?)\W(cone|cube|radius\Wcylinder|diameter\Wcylinder|radius\Wsphere|diameter\Wsphere|radius|square|wall|line)/;
        const creatureRegex = /((\d+) )?(creature|aberration|beast|celestial|construct|dragon|elemental|fey|fiend|giant|humanoid|monstrosity|monster|ooze|plant|undead)s?/;
        const objectRegex = /object|club|magical eye|a nonmagical weapon|transmute your quiver|any trap|a chest|touch a melee weapon|a steel weapon you touch|triggering attack|figment/;
        const spaceRegex = /point|spot|space|part of the sky|within range/;

        if (range === 'self') {
            return {
                value: null,
                units: '',
                type: 'self'
            };
        }
        if (range.match(targetRegex)) {
            const match = range.match(targetRegex);
            const aoe = this.getAoE(match, description);
            if (aoe.units === 'ft' || aoe.units === 'mi') {
                return aoe;
            }
        }
        if (description.match(targetRegex)) {
            const match = description.match(targetRegex);
            const aoe = this.getAoE(match, description);
            if (aoe.units === 'ft' || aoe.units === 'mi') {
                return aoe;
            }
        } 
        
        if (description.match(creatureRegex)) {
            const match = description.match(creatureRegex);
            const count = parseInt(match[2] || '1');
            return {
                value: count,
                units: '',
                type: 'creature'
            };
        } else if (description.match(objectRegex)) {
            return {
                value: 1,
                units: '',
                type: 'object'
            };
        } else if (description.match(spaceRegex)) {
            return {
                value: null,
                units: 'any',
                type: 'space'
            };
        } else if (description.includes('target')) {
            return {
                value: null,
                units: 'any',
                type: ''
            };
        } else {
            throw new Error('Unrecognized target type: \nRANGE: ' + range + '\nDESC: ' + description);
        }
    }

    /**
     * Generates the range object.
     * @param {string} range 
     * @returns {{value: number, long: number, units: string}}
     */
    getRange (range) {
        range = range.toLowerCase();
        if (range.startsWith('touch')) {
            return {
                value: null,
                long: null,
                units: 'touch'
            };
        } else if (range.match(/\d+ feet/)) {
            const feetIndex = range.indexOf(' feet');
            const num = parseInt(range.substr(0, feetIndex));
            return {
                value: num,
                long: 0,
                units: 'ft'
            };
        } else if (range.includes('mile')) {
            const mileIndex = range.indexOf(' mile');
            const num = parseInt(range.substr(0, mileIndex));
            return {
                value: num,
                long: 0,
                units: 'mi'
            };
        } else if (range === '1 mile') {
            return {
                value: 1,
                long: null,
                units: 'mi'
            };
        } else if (range.startsWith('self')) {
            return {
                value: null,
                long: null,
                units: 'self'
            };
        } else if (range.startsWith('sight') || range === 'special') {
            return {
                value: null,
                long: null,
                units: 'spec'
            };
        } else if (range === 'unlimited') {
            return {
                value: null,
                long: null,
                units: 'any'
            };
        } else {
            throw new Error('Unrecognized range: ' + range);
        }
    }

    /**
     * Returns the action type.
     * @param {string} description 
     * @returns {string}
     */
    getActionType (description) {
        description = description.toLowerCase();

        if (description.includes('ranged spell attack')) {
            return 'rsak';
        } else if (description.includes('melee spell attack')) {
            return 'msak';
        } else if (description.includes('melee attack with a weapon')) {
            return 'mwak';
        } else if (description.includes('ranged attack with a weapon')) {
            return 'rwak';
        } else if (description.includes('saving throw') || description.includes('save')) {
            return 'save';
        } else if (description.match(this.healingRegex)) {
            return 'heal';
        } else if (description.includes('damage')) {
            return 'other';
        } else {
            return 'util';
        }
    }

    /**
     * Generates the saving throw object.
     * @param {number} level
     * @param {string} description
     * @returns {{ability: string, dc: number, value: string}}
     */
    getSave (level, description) {
        description = description.toLowerCase();
        const saveRegex = /(?:dc (\d+) )?(strength|dexterity|constitution|intelligence|wisdom|charisma) (save|saving throw)/;
        const saveMatch = description.match(saveRegex);
        if (saveMatch) {
            const dc = saveMatch[1] ? parseInt(saveMatch[1]) : 0;
            const stat = saveMatch[2];
            return {
                ability: stat.substr(0,3),
                dc: dc,
                scaling: 'spell'
            };
        }
        return {
            ability: '',
            dc: null,
            value: '',
            scaling: level > 0 && description.includes('<strong>higher levels</strong>') ? 'spell' : undefined
        };
    }

    /**
     * Gets the 3-character school code.
     * @param {string} school 
     * @returns {string}
     */
    getSchoolCode (school) {
        school = school.toLowerCase();
        switch (school) {
            case 'abjuration':
                return 'abj';
            case 'conjuration':
                return 'con';
            case 'divination':
                return 'div';
            case 'enchantment':
                return 'enc';
            case 'evocation':
                return 'evo';
            case 'illusion':
                return 'ill';
            case 'necromancy':
                return 'nec';
            case 'transmutation':
                return 'trs';
            default:
                throw new Error('Unrecognized School ' + school);
        }
    }

    //#region Decode

    /**
     * Decodes the school code back into the school.  eg 'abj' => 'Abjuration'
     * @param {string} schoolCode 
     * @returns {string}
     */
    decodeSchool (schoolCode) {
        switch (schoolCode) {
            case 'abj':
                return 'Abjuration';
            case 'con':
                return 'Conjuration';
            case 'div':
                return 'Divination';
            case 'enc':
                return 'Enchantment';
            case 'evo':
                return 'Evocation';
            case 'ill':
                return 'Illusion';
            case 'nec':
                return 'Necromancy';
            case 'trs':
                return 'Transmutation';
            default:
                throw new Error('Unrecognized School Code ' + schoolCode);
        }
    }

    /**
     * Decodes the activation json into html.
     * @param {{type: string, cost: number, condition: string}} activation 
     * @param {boolean} isRitual
     * @returns {string}
     */
    decodeCasting (activation, isRitual) {
        let decodedCasting = activation.cost + ' ' + this.capFirst(activation.type);
        if (activation.condition) {
            decodedCasting += ', ' + activation.condition;
        }
        if (isRitual) {
            decodedCasting += ' Ritual';
        }
        return decodedCasting;
    }

    /**
     * Decodes the activation object into html.
     * @param {{value: number, long: number, units: string}} range 
     * @returns {string}
     */
    decodeRange (range) {
        let result = '';
        if (range.value) {
            result += range.value;
            if (range.long) {
                result += '/' + range.long;
            }
        }
        result = result.length
            ? result + ' ' + range.units
            : this.capFirst(range.units);
        return result;
    }

    /**
     * Decodes the activation object into html.
     * @param {{value: string, vocal: boolean, somatic: boolean, material: boolean, ritual: boolean, concentration: boolean}|[string]} components 
     * @param {{value: string, consumed: boolean, cost: number, supply: number}} materials
     * @returns {string}
     */
    decodeComponents (components, materials) {
        let terms = [];
        if (typeof components !== Array) {
            // Use legacy parsing
            terms = [
                components.vocal ? 'V' : '',
                components.somatic ? 'S' : '',
                components.material ? 'M' : ''
            ];
    
        } else {
            // Use Foundry v11 parsing
            terms = [
                components.includes('vocal') ? 'V' : '',
                components.includes('somatic') ? 'S' : '',
                components.includes('material') ? 'M' : ''
            ];
        }

        const compTerms = terms.filter((comp) => comp).join(', ');
        return materials.value ? compTerms + ' (' + materials.value + ')' : compTerms;
    }

    /**
     * Decodes the duration object into html.
     * @param {{value: number, units: string}} duration 
     * @param {boolean} isConc
     */
    decodeDuration (duration, isConc) {
        let val;
        switch (duration.units) {
            case 'spec':
                return 'Special';
            case 'inst':
                return 'Instantaneous';
            case 'perm':
                return 'Permanent';
            default:
                val = duration.value
                    ? duration.value + ' ' + this.capFirst(duration.units)
                    : this.capFirst(duration.units);
                if (isConc) {
                    val = 'Concentration, up to ' + val;
                }
                val += duration.value && duration.value > 1 ? 's' : '';
                return val;
        }
    }
    //#endregion

    /**
     * Gets the components object.
     * @param {string} castTime 
     * @param {string} duration 
     * @param {string} components 
     * @returns {{value: string, vocal: boolean, somatic: boolean, material: boolean, ritual: boolean, concentration: boolean}}
     */
    getComponents (castTime, duration, components) {
        castTime = castTime.toLowerCase();
        duration = duration.toLowerCase();
        components = components.toLowerCase();

        const isRitual = castTime.endsWith('ritual');
        const isConc = duration.startsWith('concentration');
        
        const openIndex = components.indexOf('(');
        const componentTerms = (openIndex > -1 ? components.substr(0, openIndex) : components).split(', ').map((term) => term.trim());

        const retVal = [];
        if (componentTerms.includes('v')) retVal.push('vocal');
        if (componentTerms.includes('s')) retVal.push('somatic');
        if (componentTerms.includes('m')) retVal.push('material');
        if (isConc) retVal.push('concentration');
        if (isRitual) retVal.push('ritual');
        return retVal;
    }

    /**
     * Generates the material consumption object.
     * @param {string} components 
     * @returns {{value: string, consumed: boolean, cost: number, supply: number}}
     */
    getMaterials (components) {
        components = components.toLowerCase();
        const consumed = components.includes('consume');
        const valuableRegex = /.*\(.*?(\d+) ?[gp|gold].*\)/;
        const flavorRegex = /.*\((.*?)\)/;
        const valuableMatches = components.match(valuableRegex);
        const flavorMatches = components.match(flavorRegex);
        if (valuableMatches && flavorMatches) {
            const cost = parseInt(valuableMatches[1]);
            let flavor = flavorMatches[1];
            if (flavor.endsWith('.')) {
                flavor = flavor.substring(0, flavor.length - 1);
            }
            return {
                value: flavor,
                consumed: !!consumed,
                cost: cost,
                supply: 0
            };
        } else if (flavorMatches) {
            let flavor = flavorMatches[1];
            if (flavor.endsWith('.')) {
                flavor = flavor.substring(0, flavor.length - 1);
            }
            return {
                value: flavor,
                consumed: false,
                cost: 0,
                supply: 0
            };
        } else {
            return {
                value: '',
                consumed: false,
                cost: 0,
                supply: 0
            };
        }
    }

    /**
     * Generates the scaling object.
     * @param {number} level 
     * @param {string} description
     * @returns {{mode: string, formula: string}}
     */
    getScaling (level, description) {
        description = description.toLowerCase();
        const upcastTag = '<strong>higher levels</strong>';
        const upcastIndex = description.indexOf(upcastTag);
        if (upcastIndex === -1 && !description.includes(' spell\'s damage increases by')) {
            return {
                mode: 'none',
                formula: ''
            };
        } else if (level === 0) {
            return {
                mode: 'cantrip',
                formula: ''
            };
        }
        const upcastDesc = upcastIndex > -1 ? description.substr(upcastIndex + upcastTag.length) : '';
        const scalingRegex = /(\d+d\d+)\W|modifier/;
        const match = upcastDesc.match(scalingRegex);
        if (match) {
            let formula = match[1];
            formula = formula === 'modifier' ? '@mod' : formula;
            return {
                mode: 'level',
                formula
            };
        }
        const healingScaleRegex = /(healing|hit point).+?(\d+)/;
        const healingMatch = upcastDesc.match(healingScaleRegex);
        if (healingMatch) {
            const formula = healingMatch[2];
            return {
                mode: 'level',
                formula
            };
        }
        return {
            mode: 'level',
            formula: ''
        };
    }

    /**
     * Gets the image for the provided school.
     * @param {string} school The school of magic.
     * @returns {string} path to the image
     */
    getImage (school) {
        return 'modules/owlmarble-magic/icons/' + school.toLowerCase() + '.png';
    }
    //#endregion
    //#endregion

    //#region Parse Imported Spell
    /**
     * Parses the spells in an imported file.
     * @param {string} contents 
     * @returns [{}]
     */
    parseImportedFile (contents) {
        const spells = JSON.parse(contents).spell;
        const parsed = [];
        for (let i = 0; i < spells.length; i++) {
            const spell = spells[i];
            try {
                const school = this.deimportSchool(spell.school);
                const description = this.parseImportedEntries(spell.entries) + this.parseImportedEntries(spell.entriesHigherLevel).replace('<strong>At Higher Levels</strong>', '<strong>Higher Levels</strong>');
                const importedRange = this.getImportedRange(spell);
                const range = this.getRange(importedRange);
                const id = this.generateUUID(spell.name + ' (Imported)');
                const importedSpell = {
                    _id: id,
                    _key: '!items!' + id, 
                    name: spell.name,
                    permission: {
                        default: 0
                    },
                    type: 'spell',
                    img: this.getImage(school),
                    system: {
                        description: {
                            value: description,
                            chat: '',
                            unidentified: ''
                        },
                        source: spell.source + ' - ' + spell.page,
                        activation: {
                            type: spell.time[0].unit,
                            cost: spell.time[0].number,
                            condition: spell.time[0].condition || ''
                        },
                        duration: this.getImportedDuration(spell),
                        target: this.getTarget(importedRange, description),
                        range: range,
                        uses: {
                            value: 0,
                            max: 0,
                            per: ''
                        },
                        ability: '',
                        actionType: this.getActionType(description),
                        attackBonus: 0,
                        chatFlavor: '',
                        critical: null,
                        damage: this.getDamage(description),
                        formula: '',
                        save: this.getSave(spell.level, description),
                        level: spell.level,
                        school: this.getSchoolCode(school),
                        properties: this.getImportedComponents(spell),
                        materials: this.getImportedMaterials(spell),
                        preparation: {
                            mode: 'prepared',
                            prepared: false
                        },
                        scaling: this.getScaling(spell.level, description),
                        classes: this.getImportedClasses(spell)
                    },
                    effects: [],
                    sort: 0,
                    flags: {
                        exportSource: {
                            world: 'none',
                            system: 'dnd5e',
                            coreVersion: '0.8.8',
                            systemVersion: '1.3.6'
                        },
                        'owlmarble-magic': {}
                    }
                };                
                this.overrideSpell(importedSpell, spell.source);
                parsed.push(importedSpell);
            } catch (e) {
                console.error(this.thinWall + '=========\nFailure on ' + spell.name);
                throw e;
            }
        }
        return parsed;
    }

    /**
     * Get the full spell name from the abbreviation.
     * @param {string} abbreviation 
     * @returns {string}
     */
    deimportSchool (abbreviation) {
        switch (abbreviation) {
            case 'A':
                return 'abjuration';
            case 'C':
                return 'conjuration';
            case 'D':
                return 'divination';
            case 'E':
                return 'enchantment';
            case 'I':
                return 'illusion';
            case 'N':
                return 'necromancy';
            case 'T':
                return 'transmutation';
            case 'V':
                return 'evocation';
            default:
                throw new Error('Unrecognized Imported School ' + abbreviation);
        }
    }

    /**
     * Generates the duration object for an imported spell.
     * @param {{value: number, units: string}} spell 
     */
    getImportedDuration (spell) {
        const dur = spell.duration[0];
        if (dur.type === 'timed') {
            return {
                value: dur.duration.amount,
                units: dur.duration.type
            };
        } else if (dur.type === 'instant') {
            return {
                value: '',
                units: 'inst'
            };
        } else if (dur.type === 'permanent') {
            return {
                value: '',
                units: 'perm'
            };
        } else if (dur.type === 'special') {
            return {
                value: '',
                units: 'spec'
            };
        } else {
            throw new Error('Unrecognized Imported Duration: ' + JSON.stringify(spell.duration));
        }
    }

    getImportedRange (spell) {
        let range;
        const selfShapeRegex = /radius|sphere|line|cone|square|cube|cylinder|wall/;
        if (spell.range.type === 'point') {
            const dist = spell.range.distance;
            if (dist.type === 'touch' || dist.type === 'self') {
                range = dist.type;
            } else if (dist.type === 'feet' || dist.type === 'miles') {
                range = dist.amount + ' ' + dist.type;
            } else if (dist.type === 'sight' || dist.type === 'unlimited') {
                range = dist.type;
            }
        } else if (spell.range.type.match(selfShapeRegex)) {
            const dist = spell.range.distance;
            if (dist.type === 'feet' || dist.type === 'miles') {
                range = `Self (${dist.amount}-${dist.type} ${spell.range.type})`;
            }
        } else if (spell.range.type === 'special') {
            range = 'Special';
        } else if (spell.range.type === 'sight') {
            range = 'Sight';
        }
        if (!range) {
            throw new Error('Unrecognized Range Type: ' + JSON.stringify(spell.range));
        }
        return range;
    }

    /**
     * Gets the components object.
     * @param {{*}} spell 
     * @returns {{value: string, vocal: boolean, somatic: boolean, material: boolean, ritual: boolean, concentration: boolean}}
     */
    getImportedComponents (spell) {
        const isRitual = spell.meta?.ritual;
        const isConcentration = !!spell.duration[0].concentration;
        const retVal = [];
        if (spell.components.v) retVal.push('vocal');
        if (spell.components.s) retVal.push('somatic');
        if (spell.components.m) retVal.push('material');
        if (isConcentration) retVal.push('concentration');
        if (isRitual) retVal.push('ritual');
        return retVal;
    }

    /**
     * Generates the material consumption object for imported spells.
     * @param {{*}} spell 
     * @returns {{value: string, consumed: boolean, cost: number, supply: number}}
     */
    getImportedMaterials (spell) {
        if (!spell.components.m) {
            return {
                value: '',
                consumed: false,
                cost: 0,
                supply: 0
            };
        }
        if (typeof spell.components.m === 'string') {
            return {
                value: spell.components.m,
                consumed: !!spell.components.m.match(/\W(?:shatter(s)?|break|destroy(ed)?|consume(s|d)?)\W/),
                cost: 0,
                supply: 0
            };
        }
        return {
            value: spell.components.m.text,
            consumed: !!spell.components.m.consume,
            cost: spell.components.m.cost / 100,
            supply: 0
        };
    }

    /**
     * Parses the classes for the imported spells.
     * @param {{*}} spell 
     */
    getImportedClasses (spell) {
        const classLookup = {};
        try {
            spell?.classes?.fromClassList?.forEach((classEntry) => {
                if (classEntry.source === 'PHB' || classEntry.source === 'TCE') {
                    classLookup[classEntry.name] = true;
                }
            });
            spell?.classes?.fromClassListVariant?.forEach((varEntry) => {
                if (varEntry.definedInSource === 'TCE') {
                    classLookup[varEntry.name] = true;
                }
            });
        } catch (e) {
            console.log('Failure on importing classes list: ' + spell.classes);
            throw e;
        }
        return Object.keys(classLookup);
    }
    //#endregion

    //#region Spell Lists
    /**
     * Sorts a list of spells in-place based on level and name.
     * @param {[{}]} spells 
     */
    sortSpellList (spells) {
        spells.sort((a, b) => (a.name > b.name) ? 1 : -1);
        spells.sort((a, b) => (a.system.level >= b.system.level) ? 1 : -1);
    }

    /**
     * Exports the spell lists for each class.
     * @param {[{*}]} spells 
     * @param {{*}} indices
     * @param {Promise<string>} dataPath 
     */
    async exportSpellLists (spells, indices, dataPath) {
        const wall = (this.thinWall + '');
        console.log(wall + '\nExporting Class Spell Lists...');
        const classes = Object.keys(spells.reduce((acc, spell) => {
            spell.system.classes.forEach((casterClass) => {
                acc[casterClass] = true;
            });
            return acc;
        }, {}));
        classes.sort();

        const htmlSpells = spells.reduce((acc, spell) => {
            acc[spell.name] = this.htmlify(spell);
            return acc;
        }, {});

        const outputLines = [
            '# Spells by Class', '',
            '**Note**: this file is autogenerated.', '',
            'Spells names link to the appropriate local file if it was altered by OwlMarble Magic.  Otherwise, they link to D&D Beyond.', ''
        ];
        const dndbeyond = 'https://www.dndbeyond.com/spells/';
        classes.forEach((clazz) => {
            outputLines.push('## ' + clazz);
            outputLines.push('');
            for (let i = 0; i <= 10; i++) {
                const level = i === 0 ? 'Cantrip' : `Level ${i}`;
                const currentSpells = spells.filter((spell) => spell.system.classes.includes(clazz) && spell.system.level === i);
                if (currentSpells.length === 0) {
                    continue;
                }
                outputLines.push(`### ${level} - _${clazz}_`);
                outputLines.push('');
                currentSpells.forEach((spell) => {
                    const tags = [];
                    const components = [];
                    if (spell.system.properties.vocal) {
                        components.push('V');
                    }
                    if (spell.system.properties.somatic) {
                        components.push('S');
                    }
                    if (spell.system.properties.material) {
                        let materialTerm = 'M';
                        if (spell.system.materials.cost) {
                            materialTerm += '$';
                            if (spell.system.materials.consumed) {
                                materialTerm += 'X';
                            }
                        }
                        components.push(materialTerm);
                    }
                    tags.push(components.join('/'));

                    if (spell.system.properties.ritual) {
                        tags.push('[R]');
                    }
                    if (spell.system.properties.concentration) {
                        tags.push('[C]');
                    }

                    const tagString = tags.length > 0 ? ' - ' + tags.join(' ') + ' - ' : ' - ';

                    // Link locally if it's homebrew, but otherwise, just point to D&D beyond.
                    const link = indices[spell.name]
                        ? `[${spell.name}](${indices[spell.name]})`
                        : `[${spell.name}](${dndbeyond + spell.name.toLowerCase().replaceAll(' ','-')})`;
                    outputLines.push(`- ${link}${tagString}(${spell.system.source.custom})`);
                });
                outputLines.push('');
            }
        });
        const output = outputLines.join('\r\n');// It burns us, precious!  (windows line breaks)

        fs.writeFileSync('spells/Spells by Class.md', output);

        // Export standalone HTML files and add to collective Journal DB.
        const dbRows = [];
        const dbLines = [];
        classes.forEach((clazz) => {
            const htmlLines = [
                '<!DOCTYPE html>',
                '<html>',
                '<body>'
            ];
            const contentLines = [];
            contentLines.push(this.tagify('h1', clazz));
            for (let i = 0; i <= 10; i++) {
                contentLines.push(this.tagify('h2', i === 0 ? 'Cantrip' : `Level ${i}`));
                const currentSpells = spells
                    .filter((spell) => spell.system.classes.includes(clazz) && spell.system.level === i)
                    .map((spell) => htmlSpells[spell.name]);

                currentSpells.forEach((htmlSpell) => {
                    contentLines.push(htmlSpell);
                });
            }
            htmlLines.push(contentLines.join('\r\n'));

            // Close html.
            htmlLines.push('<body>');
            htmlLines.push('</html>');

            // Export to HTML.
            const path = 'spells/class-lists/' + clazz + '.html';
            fs.writeFileSync(path, htmlLines.join('\r\n'));
            
            // Add to db.
            const id = this.generateUUID();
            const row = {
                _id: id,
                _key: '!journal!' + id,
                name: clazz,
                permission: {
                    default: 2
                },
                folder: '',
                flags: {},
                content: contentLines.join('').replace('\r\n', '')
            };
            dbRows.push(row);
            dbLines.push(JSON.stringify(row));
        });
        fs.writeFileSync('spells/class-lists/lists.db', dbLines.join('\n'));
        fs.writeFileSync('E:/Foundry VTT/Data/modules/owlmarble-magic/packs/lists.db', dbLines.join('\n'));
        await this.exportDb(dbRows, 'lists', dataPath);
    }

    /**
     * Exports the spell lists for each class.
     * @param {[{*}]} spells
     * @returns {string}
     */
    htmlify (spell) {
        const keyTraitLines = [
            this.tagify('li', this.tagify('strong', 'School: ') + this.decodeSchool(spell.system.school)),
            this.tagify('li', this.tagify('strong', 'Casting Time: ') + this.decodeCasting(spell.system.activation, spell.system.properties.ritual)),
            this.tagify('li', this.tagify('strong', 'Range: ') + this.decodeRange(spell.system.range)),
            this.tagify('li', this.tagify('strong', 'Components: ') + this.decodeComponents(spell.system.properties, spell.system.materials)),
            this.tagify('li', this.tagify('strong', 'Duration: ') + this.decodeDuration(spell.system.duration, spell.system.properties.concentration)),
        ];

        const lines = [
            this.tagify('h3', spell.name),
            this.tagify('ul', keyTraitLines.join('\r\n')),
            spell.system.description.value
        ];

        const result = lines.join('\r\n');
        return result;
    }

    /**
     * Merges two spell lists together.  If a spell in trump has a matching name or oldName with a spell in offSuit, it is overwritten.
     * @param {[{*}]} offSuit 
     * @param {[{}]} trump 
     * @returns {[{}]} merged list.
     */
    mergeSpellLists (offSuit, trump) {
        const lookup = trump.reduce((acc, val) => {
            acc[val.name] = val;
            if (val.oldName) {
                acc[val.oldName] = val;
            }
            return acc;
        }, {});
        const merged = [
            ...offSuit.filter((offSuitSpell) => !lookup[offSuitSpell.name]),
            ...trump
        ];
        this.sortSpellList(merged);
        return merged;
    }

    /**
     * Generates a diff report for the old spells vs the new spells.
     * @param {[{*}]} oldSpells 
     * @param {[{*}]} newSpells 
     */
    logDiff (oldSpells, newSpells) {
        const wall = (this.thinWall + '');
        console.log(wall + '\nChecking for diffs...');

        // Ignore the export timestamps
        oldSpells = JSON.parse(JSON.stringify(oldSpells));
        oldSpells.forEach((spell) => {
            spell.flags['owlmarble-magic'].exportTime = 'IGNORE ME';
        });
        newSpells = JSON.parse(JSON.stringify(newSpells));
        newSpells.forEach((spell) => {
            spell.flags['owlmarble-magic'].exportTime = 'IGNORE ME';
        });

        // Build dictionaries.
        const oldLookup = oldSpells.reduce((acc, spell) => {
            acc[spell.name] = spell;
            return acc;
        }, {});

        const newLookup = newSpells.reduce((acc, spell) => {
            acc[spell.name] = spell;
            return acc;
        }, {});

        const addedSpells = newSpells.filter((newSpell) => !oldLookup[newSpell.name]);
        if (addedSpells.length) {
            console.log(wall + '\nADDED ' + addedSpells.length + ' SPELLS!');
            addedSpells.forEach((spell) => console.log('- ' + spell.name));
        }

        const removedSpells = oldSpells.filter((oldSpell) => !newLookup[oldSpell.name]);
        if (removedSpells.length) {
            console.log(wall + '\nREMOVED ' + removedSpells.length + ' SPELLS!');
            removedSpells.forEach((spell) => console.log('- ' + spell.name));
        }

        const updatedSpells = newSpells.map((newSpell) => {
            const oldSpell = oldLookup[newSpell.name];
            if (!oldSpell) {
                return;
            }

            const oldString = JSON.stringify(oldSpell);
            const newString = JSON.stringify(newSpell);
            if (oldString === newString) {
                return;
            }

            return {
                name: newSpell.name,
                oldSpell,
                newSpell 
            };
        }).filter((mapping) => mapping);
        if (updatedSpells.length) {
            console.log(wall + '\nUPDATED ' + updatedSpells.length + ' SPELLS!');
            updatedSpells.forEach((mapping) => {
                console.log('- Updated ' + mapping.name);
                console.log(detailedDiff(mapping.oldSpell, mapping.newSpell));
            });
        }
    }
    //#endregion

    //#region Version Migration
    /**
     * Migrates all SRD spells to the latest version
     * @param {[{}]} spells 
     */
    migrateTo_11_315(spells) {
        spells.forEach(spell => {
            // Data is out, system is in.
            const data = spell.data;
            delete spell.data;
            spell.system = data;

            // Source wrapper
            spell.system.source = {
                custom: spell.system.source
            };

            // Components
            const components = spell.system.components;
            delete spell.system.components;
            const compArr = [];
            if (components.vocal) compArr.push('vocal');
            if (components.somatic) compArr.push('somatic');
            if (components.material) compArr.push('material');
            if (components.concentration) compArr.push('concentration');
            if (components.ritual) compArr.push('ritual');
            spell.system.properties = compArr;
        });
        return spells;
    }

    //#endregion

    /**
     * Parse.
     * @param {string} dataPath export data path
     * @returns {Promise<{omm: [{}]; srd: [{}]}>}
     */
    async run (dataPath) {
        // Index the spells and synchronize any links.
        const indices = this.indexSpellsAndMonsters();
        this.updateReferences(indices);

        // Homebrew Only
        const homebrew = this.readAndParseInputFiles();
        await this.printSpells(this.readSpellDB('output/owlmagic-only/spells.db'), homebrew, 'output/owlmagic-only/spells.db', '');

        // SRD + Homebrew
        const srd = this.migrateTo_11_315(this.readSpellDB('srd/srd.db'));
        srd.forEach((srdSpell) => { srdSpell.img = this.getImage(this.decodeSchool(srdSpell.system.school)); });
        await this.printSpells(this.readSpellDB('output/owlmagic-srd/spells.db'), this.mergeSpellLists(srd, homebrew), 'output/owlmagic-srd/spells.db', '');

        // Publishable
        await this.printSpells(this.readSpellDB('packs/spells.db'), this.mergeSpellLists(srd, homebrew), 'packs/spells.db', '');

        // Imported only
        const imported = this.readAndParseImportedSpells();
        this.sortSpellList(imported);
        await this.printSpells(this.readSpellDB('output/imported/spells.db'), imported, 'output/imported/spells.db', '');

        // Homebrew + Imported
        const allSpells = this.mergeSpellLists(imported, homebrew);
        const oldSpells = this.readSpellDB('output/all/spells.db');
        await this.printSpells(oldSpells, allSpells, 'output/all/spells.db', '');

        // Export the spell lists for all included classes.
        await this.exportSpellLists(allSpells, indices, dataPath);
        this.exportSpellListsJson(allSpells, 'output/spell-classes.json');
        this.exportCompendiumBrowser(allSpells);

        // Export all to current foundry install.
        console.log(this.thinWall + '\nExporting spells to foundry install...');
        const exportSuccess = await this.printSpells(oldSpells, allSpells, 'E:/Foundry VTT/Data/modules/owlmarble-magic/packs/spells.db', dataPath);

        // Log differences to spells.
        this.logDiff(oldSpells, allSpells);

        return { omm: allSpells, srd, exportSuccess };
    }
};
