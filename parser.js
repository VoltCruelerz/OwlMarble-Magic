console.log('Starting...');
const { match } = require('assert/strict');
const fs = require('fs');

//#region IO
/**
 * Reads all input files and parses them.
 */
const readAndParseInputFiles = () => {
    console.log('Reading input files...');
    const dirName = 'input/';
    const fileNames =fs.readdirSync(dirName);
    const allSpells = [];
    fileNames.forEach((fileName) => {
        const level = parseInt(fileName.substr(0, fileName.indexOf('.')));
        console.log('Detected ' + fileName);
        const contents = fs.readFileSync(dirName + fileName, { encoding: 'utf-8', flag: 'r' });
        allSpells.push(...parseFile(contents, level));
    });

    // Sort first by name, then by level so we're sanely organized, not that the db really cares.
    sortSpellList(allSpells);
    // console.log('All Spells:\n' + JSON.stringify(allSpells));
    return allSpells;
};

const readSpellDB = (path) => {
    const contents = fs.readFileSync(path, { encoding: 'utf-8', flag: 'r' });
    const lines = contents.split('\n');
    const dbSpells = lines.filter((line) => line).map((line) => JSON.parse(line));
    return dbSpells;
}

/**
 * Prints the spells to the output folder in a db file.
 * @param {[{}]} spells
 * @param {string} path
 */
const printSpells = (spells, path) => {
    const spellLines = spells.map((spell) => JSON.stringify(spell));
    const db = spellLines.join('\n') + '\n';
    fs.writeFileSync(path, db);
}
//#endregion

//#region High-Level Parsing
/**
 * Parses the string content from a file into spells.
 * @param {string} content String contents.
 * @param {number} level The current level.
 * @returns {[{}]} Array of spell objects.
 */
const parseFile = (content, level) => {
    const lines = content.split(/\r?\n/).filter((line) => line && !line.startsWith('<div') && line !== '```');
    const spellText = [];
    let readingSpellsYet = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect the end of the preamble.
        if (line === '## Spells') {
            readingSpellsYet = true;
            continue;
        } else if (line === '## Appendix') {
            break;
        }

        // If we're still in the preamble, ignore things.
        if (!readingSpellsYet) {
            continue;
        }

        // We're parsing a spell now, so find the next ### and the following one, and snip out that section.
        const spellLines = [];
        let foundStart = false;

        for (let j = i; j < lines.length; j++) {
            const jLine = lines[j];
            if (jLine.startsWith('### ') || jLine.startsWith('## ')) {
                if (!foundStart) {
                    // This is the start.
                    foundStart = true;
                    spellLines.push(jLine.substr('### '.length));
                } else {
                    // This is the termination, so advance i.
                    spellText.push(spellLines);
                    i = j - 1;
                    break;
                }
            } else if (foundStart && jLine && !jLine.match(/_+/)) {
                spellLines.push(jLine);
            }
        }
    }

    return spellText.map((text) => parseSpellText(text, level));
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
    detailLines.forEach((line, i) => {
        const prevLine = i - 1 > -1 ? detailLines[i - 1] : '';
        const nextLine = i + 1 < detailLines.length ? detailLines[i + 1] : '';
        let nextLineInjection = undefined;

        // If we're in a list.
        if (lineIsList(line)) {
            if (!lineIsList(prevLine)) {
                // This is the start of the list, so prefix this.
                parsedLines.push('<ul>');
            }
            if (!lineIsList(nextLine)) {
                nextLineInjection = '</ul>';
            }
            line = listify(line);
        } else {
            line = paragraphify(line);
        }
        
        line = italicize(boldify(line));
        parsedLines.push(line);
        if (nextLineInjection) {
            parsedLines.push(nextLineInjection);
        }
    });
    return parsedLines.join('');
};

/**
 * HTML-ifies the bolding.
 * @param {string} line 
 * @returns {string}
 */
const boldify = (line) => {
    const count = (line.match(/\*\*/g) || []).length;
    if (count % 2 != 0) {
        // We have an odd number, so don't even try to format this.  It would just get weird.
        console.log('Weird Line Found: ' + line);
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
 * HTML-ifies the italicizing.
 * @param {string} line 
 * @returns {string}
 */
const italicize = (line) => {
    const count = (line.match(/_/g) || []).length;
    if (count % 2 != 0) {
        // We have an odd number, so don't even try to format this.  It would just get weird.
        console.log('Weird Line Found: ' + line);
        return line;
    }
    while (line.includes('_')) {
        if (line.lastIndexOf('<em>') < line.lastIndexOf('</em>')) {
            // This means that we have closed the latest italics tag, so start a new one.
            line = line.replace('**', '<strong>');
        } else {
            // We have a hanging open tag, so close it.
            line = line.replace('**', '</strong>');
        }
    }
    return line;
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
    return '<li>' + line.substr('- '.length) + '</li>';
}

/**
 * Checks if the provided line is a list line or not.
 * @param {string} line 
 * @returns {boolean}
 */
const lineIsList = (line) => {
    return line.match(/- .+/);
}
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

    if (castTime === '1 action') {
        return {
            type: 'action',
            cost: 1,
            condition: ''
        };
    } else if (castTime === '1 bonus action') {
        return {
            type: 'bonus',
            cost: 1,
            condition: ''
        };
    } else if (castTime === '1 reaction') {
        const conditionIndex = castTime.indexOf(',');
        const condition = conditionIndex > -1 ? castTime.substr(conditionIndex + 1) : '';
        return {
            type: 'reaction',
            cost: 1,
            condition
        };
    } else if (castTime === '1 minute') {
        return {
            type: 'minute',
            cost: 1,
            condition: ''
        };
    } else if (castTime === '10 minutes') {
        return {
            type: 'minute',
            cost: 10,
            condition: ''
        };
    } else {
        throw new Error('Unrecognized cast time: ' + castTime);
    }
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

    if (duration === 'instantaneous') {
        return {
            value: null,
            units: 'inst'
        };
    } else if (duration === '1 round') {
        return {
            value: 1,
            units: 'round'
        };
    } else if (duration === '1 minute') {
        return {
            value: 1,
            units: 'minute'
        };
    } else if (duration === '10 minutes') {
        return {
            value: 10,
            units: 'minute'
        };
    } else if (duration === '1 hour') {
        return {
            value: 1,
            units: 'hour'
        };
    } else if (duration === '8 hours') {
        return {
            value: 8,
            units: 'hour'
        };
    } else if (duration === 'permanent' || duration === 'until dispelled') {
        return {
            value: null,
            units: 'perm'
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
    } else if (description.includes('creature')) {
        return {
            value: 1,
            units: '',
            type: 'creature'
        };
    } else if (description.includes('object') || description.includes('club')) {
        return {
            value: 1,
            units: '',
            type: 'object'
        };
    } else if (description.includes('point') || description.includes('spot')) {
        return {
            value: null,
            units: 'any',
            type: 'space'
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
    if (range === 'touch') {
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
    } else if (range === 'sight') {
        return {
            value: null,
            long: null,
            units: 'spec'
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

/**
 * Generates a lookup table for a list of spells, keyed by name.
 * @param {[{}]} spellList 
 * @returns 
 */
const getSpellLookup = (spellList) => {
    return spellList.reduce((acc, val) => {
        acc[val.name] = val;
        return acc;
    }, {});
};

const getSpellListFromLookup = (lookup) => {
    return Object.keys(lookup).reduce((acc, val) => {
        acc.push(lookup[val]);
        return acc;
    }, []);
};

/**
 * Sorts a list of spells in-place based on level and name.
 * @param {[{}]} spells 
 */
const sortSpellList = (spells) => {
    spells.sort((a, b) => (a.name > b.name) ? 1 : -1);
    spells.sort((a, b) => (a.data.level >= b.data.level) ? 1 : -1);
};

const run = () => {
    // Homebrew Only
    const homebrew = readAndParseInputFiles();
    printSpells(homebrew, 'output/owlmagic-homebrew.db');

    // SRD + Homebrew
    const srd = readSpellDB('srd/srd.db');
    const srd_homebrew_lookup = getSpellLookup(srd);
    homebrew.forEach((spell) => {
        srd_homebrew_lookup[spell.name] = spell;
    });
    const srd_homebrew = getSpellListFromLookup(srd_homebrew_lookup);
    sortSpellList(srd_homebrew);
    printSpells(srd_homebrew, 'output/owlmagic-srd-homebrew.db');
    console.log('SRD + HOMEBREW:\n' + JSON.stringify(srd_homebrew));
};
run();
console.log('Done.');