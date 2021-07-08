console.log('Starting...');
const { match } = require('assert/strict');
const { table } = require('console');
const fs = require('fs');
const timeRegex = /(-?\d+) (action|bonus action|minute|hour|day|year|reaction|round|week)s?(, (.*))?/g;

//#region IO
/**
 * Reads all input files and parses them.
 */
const readAndParseInputFiles = () => {
    console.log('======================================\nReading input files...');
    const dirName = 'spells/levels/';
    const fileNames =fs.readdirSync(dirName);
    const allSpells = [];
    fileNames.forEach((fileName) => {
        const level = parseInt(fileName.substr(0, fileName.indexOf('.')));
        console.log('- Detected: ' + fileName);
        const contents = fs.readFileSync(dirName + fileName, { encoding: 'utf-8', flag: 'r' });
        allSpells.push(...parseOwlMarbleFile(contents, level));
    });

    // Sort first by name, then by level so we're sanely organized, not that the db really cares.
    sortSpellList(allSpells);
    return allSpells;
};

/**
 * Reads the spells from the specified db.
 * @param {string} path 
 * @returns 
 */
const readSpellDB = (path) => {
    console.log('======================================\nReading db file...\n- Path: ' + path);
    const contents = fs.readFileSync(path, { encoding: 'utf-8', flag: 'r' });
    const lines = contents.split('\n');
    const dbSpells = lines.filter((line) => line).map((line) => JSON.parse(line));
    return dbSpells;
}

/**
 * Reads and parses all imported spell files.
 * @returns [{}]
 */
const readAndParseImportedSpells = () => {
    console.log('======================================\nReading imported files...');
    const dirName = 'import/';
    const fileNames =fs.readdirSync(dirName);
    fileNames.sort();
    const allSpells = [];
    fileNames.forEach((fileName) => {
        const level = parseInt(fileName.substr(0, fileName.indexOf('.')));
        console.log('- Detected ' + fileName);
        const contents = fs.readFileSync(dirName + fileName, { encoding: 'utf-8', flag: 'r' });
        allSpells.push(...parseImportedFile(contents));
    });

    // Sort first by name, then by level so we're sanely organized, not that the db really cares.
    sortSpellList(allSpells);
    return allSpells;
}

/**
 * Prints the spells to the output folder in a db file.
 * @param {[{}]} spells
 * @param {string} path
 */
const printSpells = (spells, path) => {
    console.log('======================================\nPrinting to: ' + path + '\n======================================\n');
    const spellLines = spells.map((spell) => JSON.stringify(spell));
    const db = spellLines.join('\n') + '\n';
    fs.writeFileSync(path, db);
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
const parseOwlMarbleFile = (content, level) => {
    const spellTexts = content.replaceAll('\r', '')
        .split(/\n## /)
        .filter((spellText) => spellText)
        .map((spellText) => spellText.split('\n').filter((line) => line));
    return spellTexts
        .filter((text, index) => index > 0)
        .map((text) => parseSpellText(text, level));
};

/**
 * Parses the lines that make up a single spell.
 * @param {[string]} lines The lines of the spell.  May include whitespace and underscore lines.
 * @param {number} level The spell level.
 * @returns {{}}
 */
const parseSpellText = (lines, level) => {
    const name = lines[0];
    try {
        let oldName = undefined;
        const replacementMatch = lines[1].match(/_replaces (.*?)_/);
        if (replacementMatch) {
            oldName = replacementMatch[1];
            lines = [
                lines[0],
                ...lines.splice(2)
            ];
        }
        const school = parseSpellTrait('School', lines[1]);
        const castTime = parseSpellTrait('Casting Time', lines[2]);
        const range = parseSpellTrait('Range', lines[3]);
        const components = parseSpellTrait('Components', lines[4]);
        const duration = parseSpellTrait('Duration', lines[5]);
        const classes = parseSpellTrait('Classes', lines[6]).split(', ');// This is not actually used.
        const description = parseDescription(lines.splice(7));

        // Build the config.
        const spell = {
            _id: generateUUID(),
            name,
            oldName,
            permission: {
                default: 0
            },
            type: 'spell',
            data: {
                description: {
                    value: description,
                    chat: '',
                    unidentified: ''
                },
                source: 'OMM - ' + level,
                activation: getActivation(castTime),
                duration: getDuration(duration),
                target: getTarget(range, description),
                range: getRange(range),
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
                actionType: getActionType(description),
                attackBonus: 0,
                chatFlavor: '',
                critical: null,
                damage: {
                    parts: getDamage(description),
                    versatile: ''
                },
                formula: '',
                save: getSave(description),
                level,
                school: getSchoolCode(school),
                components: getComponents(castTime, duration, components),
                materials: getMaterials(components),
                preparation: {
                    mode: 'prepared',
                    prepared: false
                },
                scaling: getScaling(level, description),
                attributes: {
                    spelldc: 10
                }
            },
            sort: '0',
            flags: {
                exportSource: {
                    world: 'none',
                    system: 'dnd5e',
                    coreVersion: '0.8.8',
                    systemVersion: '1.3.6'
                }
            },
            img: getImage(school),
            'effects': []
        };
        return spell;
    } catch (e) {
        console.error('Failed to Parse ' + level + ' - ' + name);
        throw e;
    }
};
//#endregion

//#region Trait Parsing
/**
 * Retrieves the value of a key spell trait such as Casting Time
 * @param {string} trait 
 * @param {string} line 
 * @returns {string} The value of the trait.
 */
const parseSpellTrait = (trait, line) => {
    const prefix = '- **' + trait + '**: ';
    return line.substr(prefix.length);
};
//#endregion

//#region Description Parsing
/**
 * Parses the lines in a spell that are dedicated to its description.
 * @param {[string]} detailLines The lines used for the description.
 * @returns {string} The string for the description field.
 */
const parseDescription = (detailLines) => {
    const parsedLines = [];
    for (let i = 0; i < detailLines.length; i++) {
        let line = detailLines[i];
        const prevLine = i - 1 > -1 ? detailLines[i - 1] : '';
        const nextLine = i + 1 < detailLines.length ? detailLines[i + 1] : '';
        let nextLineInjection = undefined;

        // If we're in a list.
        const curDepth = listDepth(line);
        if (curDepth) {
            const prevDepth = prevLine ? listDepth(prevLine) : 0;
            const nextDepth = nextLine ? listDepth(nextLine) : 0;
            if (prevDepth < curDepth) {
                // This is the start of the list, so prefix this.
                parsedLines.push('<ul>');
            }
            if (nextDepth < curDepth) {
                nextLineInjection = '</ul>'.repeat(curDepth - nextDepth);
            }
            line = listify(line);
        } else if (lineIsHeader(line)) {
            line = headerify(line);
        } else if (lineIsTable(line)) {
            if (!lineIsTable(prevLine)) {
                // This is the start of the table.
                parsedLines.push('<table border="1"><tbody>');
                line = tableify(line, true);
                i++;// skip the |-----|--------|--------| line.
            } else if (!lineIsTable(nextLine)) {
                // This is the table, so close it.
                line = tableify(line, false);
                nextLineInjection = '</tbody></table>';
            } else {
                line = tableify(line, false);
            }
        } else {
            line = paragraphify(line);
        }
        
        line = preify(italicize(boldify(line)));
        parsedLines.push(line);
        if (nextLineInjection) {
            parsedLines.push(nextLineInjection);
        }
    };
    return parsedLines.join('');
};

/**
 * HTML-ifies the bolding by converting from ** to <strong>.
 * @param {string} line 
 * @returns {string}
 */
const boldify = (line) => {
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
};

/**
 * HTML-ifies the italicizing by converting from _ to <em>.
 * @param {string} line 
 * @returns {string}
 */
const italicize = (line) => {
    const count = (line.match(/_/g) || []).length;
    if (count % 2 != 0) {
        // We have an odd number, so don't even try to format this.  It would just get weird.
        console.log('Weird line found during italicization: ' + line);
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
};

/**
 * Replaces backtick blocks with <pre>.
 * @param {string} line 
 */
const preify = (line) => {
    const count = (line.match(/`/g) || []).length;
    if (count % 2 != 0) {
        // We have an odd number, so don't even try to format this.  It would just get weird.
        console.log('Weird line found during preformatted code parsing: ' + line);
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
};

/**
 * Converts a line with a number of #'s at the start into the appropriate html header, eg <h3>.
 * @param {string} line 
 * @returns {string}
 */
const headerify = (line) => {
    const heading = line.substr(line.indexOf(' ') + 1);
    const depth = (line.match(/#/g) || []).length;
    return tagify('h' + depth, heading);
};

/**
 * Converts a markdown table row into an html <tr>.
 * @param {string} line 
 * @param {boolean} isHeader 
 * @returns {string}
 */
const tableify = (line, isHeader) => {
    const tds = line.split('|').map((td) => td.trim()).filter((td) => td);
    const rowData = isHeader
        ? tds.map((td) => tagify('td', tagify('strong', td)))
        : tds.map((td) => tagify('td', td));
    return tagify('tr', rowData.join(''));
};

/**
 * HTML-ifies the paragraphs.
 * @param {string} line 
 * @returns {string}
 */
const paragraphify = (line) => {
    return '<p>' + line + '</p>';
};

/**
 * HTML-ifies the unordered lists.
 * @param {string} line 
 * @returns {string}
 */
const listify = (line) => {
    const content = line.match(/^\W*- (.*)/);
    return '<li>' + content[1] + '</li>';
};

/**
 * Wraps the string in the specified tag.  For example, 'h3' and 'blah' gives '<h3>blah</h3>'.
 * @param {string} tag 
 * @param {string} string 
 * @returns {string}
 */
const tagify = (tag, string) => {
    if (!string) {
        return '';
    }
    return `<${tag}>${string}</${tag}>`;
};

/**
 * Gets the current list depth, assuming two spaces per level.
 * @param {string} line 
 * @returns {number} the depth of the list
 */
const listDepth = (line) => {
    const lineMatch = line.match(/^(\W*)- .+/);
    if (lineMatch) { 
        return lineMatch[1].length / 2 + 1;
    }
    return 0;
};

/**
 * Checks if the current line starts with some number of #'s.
 * @param {string} line 
 * @returns {boolean}
 */
const lineIsHeader = (line) => {
    const depth = (line.match(/#/g) || []).length;
    return depth > 0;
};

/**
 * Checks if we're in a table by looking for pipes at the start and end of the line.
 * @param {string} line 
 * @returns {boolean}
 */
const lineIsTable = (line) => {
    return line.startsWith('|') && line.endsWith('|');
};
//#endregion

//#region Config Field Generators
//#region UUID
const generateUUID = () => {
    const options = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const chars = [];
    const uuidLength = 16;
    for (let i = 0; i < uuidLength; i++) {
        chars.push(options.charAt(getRandomInt(options.length)));
    }
    return chars.join('');
};

/**
 * Generates a random int from 0 (inclusive) to the max (exclusive).
 * @param {number} max The number of faces on the die.
 * @returns {number} a random number.
 */
const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
};
//#endregion

/**
 * Gets the activation object.
 * @param {string} castTime 
 * @return {{type: string, cost: number, condition: string}}
 */
const getActivation = (castTime) => {
    castTime = castTime.toLowerCase().replace(' ritual', '');
    const match = castTime.match(timeRegex);
    if (match) {
        return {
            cost: parseInt(match[1]),
            type: match[2],
            condition: match[4]
        };
    }

    throw new Error('Unrecognized cast time: ' + castTime);
};

/**
 * Generates the duration object.
 * @param {string} duration 
 * @returns {{value: number, units: string}}
 */
const getDuration = (duration) => {
    duration = duration.toLowerCase()
    .replace('concentration, ', '')
    .replace('up to ', '');

    const match = duration.match(timeRegex);
    if (match) {
        return {
            value: match[1],
            units: match[2]
        };
    } else if (duration === 'instantaneous') {
        return {
            value: null,
            units: 'inst'
        };
    } else if (duration === 'permanent' || duration === 'until dispelled') {
        return {
            value: null,
            units: 'perm'
        };
    } else if (duration === 'special') {
        return {
            value: null,
            units: 'spec'
        };
    } else {
        throw new Error('Unrecognized duration: ' + duration);
    }
};

/**
 * Generates the target object.
 * @param {string} range 
 * @param {string} description 
 * @returns {{value: number, units: string, type: string}}
 */
const getTarget = (range, description) => {
    range = range.toLowerCase();
    description = description.toLowerCase();
    const targetRegex = /(\d+)[-| ](.+) (cone|radius|cube|cylinder|line|radius|sphere|square|wall)/g;
    const creatureRegex = /creature|aberration|beast|celestial|construct|dragon|elemental|fey|fiend|giant|humanoid|monstrosity|monster|ooze|plant|undead/;
    const objectRegex = /object|club|magical eye|a nonmagical weapon|transmute your quiver|any trap|a chest|a weapon you touch|triggering attack/;
    const spaceRegex = /point|spot|space|part of the sky/;

    if (range === 'self') {
        return {
            value: null,
            units: '',
            type: 'self'
        };
    } else if (range.match(targetRegex)) {
        const matches = range.matchAll(targetRegex);
        const val = parseInt(matches[1]);
        let units = matches[2];
        units = units === 'foot' || units === 'feet' ? 'ft' : 'mi';
        const shape = matches[3];
        return {
            value: val,
            units: units,
            type: shape
        };
    } else if (description.match(targetRegex)) {
        const matches = description.matchAll(targetRegex);
        const val = parseInt(matches[1]);
        let units = matches[2];
        units = units === 'foot' || units === 'feet' ? 'ft' : 'mi';
        const shape = matches[3];
        return {
            value: val,
            units: units,
            type: shape
        };
    } else if (description.match(creatureRegex)) {
        return {
            value: 1,
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
};

/**
 * Generates the range object.
 * @param {string} range 
 * @returns {{value: number, long: number, units: string}}
 */
const getRange = (range) => {
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
            long: null,
            units: 'ft'
        };
    } else if (range.match(/\d+ miles/)) {
        const feetIndex = range.indexOf(' feet');
        const num = parseInt(range.substr(0, feetIndex));
        return {
            value: num,
            long: null,
            units: 'mi'
        };
    } else if (range === '1 mile') {
        return {
            value: 1,
            long: null,
            units: 'mi'
        }
    } else if (range.startsWith('self')) {
        return {
            value: null,
            long: null,
            units: 'self'
        }
    } else if (range.startsWith('sight') || range === 'special') {
        return {
            value: null,
            long: null,
            units: 'spec'
        }
    } else if (range === 'unlimited') {
        return {
            value: null,
            long: null,
            units: 'any'
        }
    } else {
        throw new Error('Unrecognized range: ' + range);
    }
};

/**
 * Returns the action type.
 * @param {string} description 
 * @returns {string}
 */
const getActionType = (description) => {
    description = description.toLowerCase();

    if (description.includes('ranged spell attack')) {
        return 'rsak';
    } else if (description.includes('ranged spell attack')) {
        return 'msak';
    } else if (description.includes('melee attack with a weapon')) {
        return 'mwak';
    } else if (description.includes('ranged attack with a weapon')) {
        return 'rwak';
    } else if (description.includes('saving throw') || description.includes('save')) {
        return 'save';
    } else {
        return 'util';
    }
};

/**
 * Generates the damage object.
 * @param {string} description 
 * @returns {{parts: [[string]], versatile: string}}
 */
const getDamage = (description) => {
    description = description.toLowerCase();
    const upcastTag = '<strong>higher levels</strong>: ';
    const upcastIndex = description.indexOf(upcastTag);
    const baseDesc = upcastIndex > -1 ? description.substr(0, upcastIndex) : description;
    const damageRegex = /(?<die>\d+(d\d+)?) ?(?<operator>\+|-|plus|minus)?([^\.]*?(?<shifter>\d+|modifier))?[^\.]*?(?<element>acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder|healing|temphp)/g;
    const parts = [];

    const damageMatches = baseDesc.matchAll(damageRegex);
    for (const match of damageMatches) {
        const full = match[0];
        const dice = match[1];
        const dieSize = match[2];
        const op = match[3];
        const longTag = match[4];
        const shifter = match[5] === 'modifier' ? '@mod' : match[5];
        const element = match[6];

        const damageLine = op ? `${dice} ${op} ${shifter}` : dice;
        parts.push([
            damageLine,
            element
        ]);
    }
    return {
        parts,
        versatile: ''
    };
};

/**
 * Generates the saving throw object.
 * @param {string} description
 * @returns {{ability: string, dc: number, value: string}}
 */
const getSave = (description) => {
    description = description.toLowerCase();
    const saveRegex = /(strength|dexterity|constitution|intelligence|wisdom|charisma) (save|saving throw)/;
    const saveMatch = description.match(saveRegex);
    if (saveMatch) {
        const stat = saveMatch[1];
        return {
            ability: stat.substr(0,3),
            dc: 0,
            scaling: 'spell'
        };
    }
    return {
        ability: '',
        dc: null,
        value: ''
    };
};

/**
 * Gets the 3-character school code.
 * @param {string} school 
 * @returns {string}
 */
const getSchoolCode = (school) => {
    switch (school) {
        case 'Abjuration':
            return 'abj';
        case 'Conjuration':
            return 'con';
        case 'Divination':
            return 'div';
        case 'Enchantment':
            return 'enc';
        case 'Evocation':
            return 'evo';
        case 'Illusion':
            return 'ill';
        case 'Necromancy':
            return 'nec';
        case 'Transmutation':
            return 'trs';
        default:
            throw new Error('Unrecognized School ' + school);
    }
};

/**
 * Gets the components object.
 * @param {string} castTime 
 * @param {string} duration 
 * @param {string} components 
 * @returns {{value: string, vocal: boolean, somatic: boolean, material: boolean, ritual: boolean, concentration: boolean}}
 */
const getComponents = (castTime, duration, components) => {
    castTime = castTime.toLowerCase();
    duration = duration.toLowerCase();
    components = components.toLowerCase();

    const isRitual = castTime.endsWith('ritual');
    const isConc = duration.startsWith('concentration');
    
    const openIndex = components.indexOf('(');
    const componentTerms = (openIndex > -1 ? components.substr(0, openIndex) : components).split(', ');

    return {
        value: '',
        vocal: componentTerms.includes('v'),
        somatic: componentTerms.includes('s'),
        material: componentTerms.includes('m'),
        ritual: isRitual,
        concentration: isConc
    };
};

/**
 * Generates the material consumption object.
 * @param {string} components 
 * @returns {{value: string, consumed: boolean, cost: number, supply: number}}
 */
const getMaterials = (components) => {
    components = components.toLowerCase();
    const consumed = components.includes('consume');
    const valuableRegex = /.*\(.*?(\d+) ?[gp|gold].*\)/g;
    const flavorRegex = /.*\((.*?)\)/g;
    const valuableMatches = components.matchAll(valuableRegex);
    const flavorMatches = components.matchAll(flavorRegex);
    if (valuableMatches) {
        const text = valuableMatches[1];
        const val = parseInt(valuableMatches[2]);
        return {
            value: text,
            consumed: consumed,
            cost: val,
            supply: 0
        };
    } else if (flavorMatches) {
        const text = flavorMatches[1];
        return {
            value: text,
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
};

/**
 * Generates the scaling object.
 * @param {number} level 
 * @param {string} description
 * @returns {{mode: string, formula: string}}
 */
const getScaling = (level, description) => {
    description = description.toLowerCase();
    const upcastTag = '<strong>higher levels</strong>: ';
    const upcastIndex = description.indexOf(upcastTag);
    if (upcastIndex === -1) {
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
    const scalingRegex = /((\d+d\d+)(\W|\.))|modifier/;
    const match = upcastDesc.match(scalingRegex);
    if (match) {
        let formula = match[0];
        formula = formula === 'modifier' ? '@mod' : formula;
        return {
            mode: 'level',
            formula
        };
    }
    return {
        mode: 'level',
        formula: ''
    };
};

/**
 * Gets the image for the provided school.
 * @param {string} school The school of magic.
 * @returns {string} path to the image
 */
const getImage = (school) => {
    return 'modules/owl-magic/icons/' + school.toLowerCase() + '.png';
}
//#endregion
//#endregion

//#region Parse Imported Spell
/**
 * Parses the spells in an imported file.
 * @param {string} contents 
 * @returns [{}]
 */
const parseImportedFile = (contents) => {
    const spells = JSON.parse(contents).spell;
    const parsed = [];
    for (let i = 0; i < spells.length; i++) {
        const spell = spells[i];
        try {
            const school = deimportSchool(spell.school);
            const description = parseImportedEntries(spell.entries) + parseImportedEntries(spell.entriesHigherLevel);
            const importedRange = getImportedRange(spell);
            const range = getRange(importedRange);
            parsed.push({
                _id: generateUUID(),
                name: spell.name,
                permission: {
                    default: 0
                },
                type: 'spell',
                data: {
                    description: {
                        value: description,
                        chat: '',
                        unidentified: ''
                    },
                    source: spell.source + ' - ' + spell.page,
                    activation: {
                        type: spell.time[0].unit,
                        cost: spell.time[0].number,
                        condition: spell.time[0].condition
                    },
                    duration: getImportedDuration(spell),
                    range: range,
                    target: getTarget(importedRange, description),
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
                    actionType: getActionType(description),
                    attackBonus: 0,
                    chatFlavor: '',
                    critical: null,
                    damage: {
                        parts: getDamage(description),
                        versatile: ''
                    },
                    formula: '',
                    save: getSave(description),
                    level: spell.level,
                    school: school,
                    components: getImportedComponents(spell),
                    materials: getImportedMaterials(spell),
                    preparation: {
                        mode: 'prepared',
                        prepared: false
                    },
                    scaling: getScaling(spell.level, description),
                    attributes: {
                        spelldc: 10
                    }
                },
                sort: 0,
                flags: {
                exportSource: {
                    world: 'none',
                    system: 'dnd5e',
                    coreVersion: '0.8.8',
                    systemVersion: '1.3.6'
                }
                },
                img: getImage(school),
                effects: []
            });
        } catch (e) {
            console.error('===============================================\nFailure on ' + spell.name);
            throw e;
        }
    }
    return parsed;
};

/**
 * Get the full spell name from the abbreviation.
 * @param {string} abbreviation 
 * @returns {string}
 */
const deimportSchool = (abbreviation) => {
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
};

/**
 * Parses the imported entries recursively for the description field.
 * @param {[string]} entries 
 * @returns {string}
 */
const parseImportedEntries = (entries) => {
    if (!entries) {
        return '';
    }
    return entries.map((entry) => {
        if (typeof entry === 'string') {
            return '<p>' + unwrap(entry) + '</p>';
        } else if (entry.type === 'list') {
            const items = entry.items.map((item) => '<li>' + unwrap(item) + '</li>').join('');
            return '<ul>' + items + '</ul>';
        } else if (entry.type === 'entries') {
            const boldName = tagify('strong', entry.name);
            return boldName + parseImportedEntries(entry.entries);
        } else if (entry.type === 'table') {
            const tableLines = [
                tagify('h3', entry.caption),
                '<table border="1">',
                tagify('tbody', [
                    tagify('tr', [
                        ...entry.colLabels.map((label) => `<td style="text-align: center;"><strong>${label}</strong></td>`)
                    ].join('')),
                    ...entry.rows.map((row) => tagify('tr', row.map((item) => tagify('td', unwrap(item))).join('')))
                ].join('')),
                '</table>'
            ]
            return tableLines.join('');
        } else if (entry.type === 'quote') {
            return '';
        } else {
            throw new Error('Unrecognized Entry: ' + JSON.stringify(entry));
        }
    }).join('');
}

/**
 * Unwraps text, such as {@spell blah blah|actual spell name}
 * @param {string|{*}} raw 
 * @returns {string}
 */
const unwrap = (raw) => {
    if (typeof raw === 'string') {
        return raw.replaceAll(/{@\w+ (\w+)\|?.*?}/g, (match, p, offset, prime) => p);
    } else if (raw.type === 'cell') {
        return JSON.stringify(raw.roll);
    } else {
        throw new Error('Failed to Unwrap: ' + raw);
    }
}

/**
 * Generates the duration object for an imported spell.
 * @param {{value: number, units: string}} spell 
 */
const getImportedDuration = (spell) => {
    const dur = spell.duration[0];
    if (dur.type === 'timed') {
        return {
            value: dur.duration.amount,
            units: dur.duration.type
        };
    } else if (dur.type === 'instant') {
        return {
            value: null,
            units: 'inst'
        };
    } else if (dur.type === 'permanent') {
        return {
            value: null,
            units: 'perm'
        };
    } else if (dur.type === 'special') {
        return {
            value: null,
            units: 'spec'
        };
    } else {
        throw new Error('Unrecognized Imported Duration: ' + JSON.stringify(spell.duration));
    }
};

const getImportedRange = (spell) => {
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
            range = `Self (${dist.amount}-${dist.type} ${spell.range.type})`
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
};

/**
 * Gets the components object.
 * @param {{*}} spell 
 * @returns {{value: string, vocal: boolean, somatic: boolean, material: boolean, ritual: boolean, concentration: boolean}}
 */
const getImportedComponents = (spell) => {
    const isRitual = spell.meta?.ritual;
    const isConcentration = !!spell.duration[0].concentration;
    return {
        value: '',
        vocal: !!spell.components.v,
        somatic: !!spell.components.v,
        material: !!spell.components.v,
        ritual: isRitual,
        concentration: isConcentration
    };
}

/**
 * Generates the material consumption object for imported spells.
 * @param {{*}} spell 
 * @returns {{value: string, consumed: boolean, cost: number, supply: number}}
 */
const getImportedMaterials = (spell) => {
    if (!spell.components.m) {
        return {
            value: '',
            consumed: false,
            cost: 0,
            supply: 0
        };
    }
    return {
        value: spell.components.m.text,
        consumed: spell.components.m.consume,
        cost: 1,
        supply: 0
    };
};
//#endregion

/**
 * Sorts a list of spells in-place based on level and name.
 * @param {[{}]} spells 
 */
const sortSpellList = (spells) => {
    spells.sort((a, b) => (a.name > b.name) ? 1 : -1);
    spells.sort((a, b) => (a.data.level >= b.data.level) ? 1 : -1);
};

/**
 * Merges two spell lists together.  If a spell in trump has a matching name or oldName with a spell in offSuit, it is overwritten.
 * @param {[{*}]} offSuit 
 * @param {[{}]} trump 
 * @returns {[{}]} merged list.
 */
const mergeSpellLists = (offSuit, trump) => {
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
    sortSpellList(merged);
    return merged;
};

/**
 * Main method.
 */
const run = () => {
    // Homebrew Only
    const homebrew = readAndParseInputFiles();
    printSpells(homebrew, 'output/owlmagic-only.db');

    // SRD + Homebrew
    const srd = readSpellDB('srd/srd.db');
    printSpells(mergeSpellLists(srd, homebrew), 'output/owlmagic-srd.db');

    // Publish
    printSpells(mergeSpellLists(srd, homebrew), 'foundry/packs/spells.db');

    // Imported
    const imported = readAndParseImportedSpells();
    sortSpellList(imported);
    printSpells(imported, 'output/imported.db');

    // Homebrew + Imported
    printSpells(mergeSpellLists(imported, homebrew), 'output/all.db');
};
run();
console.log('======================================\nDone.');