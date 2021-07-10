console.log('Starting...');
const fs = require('fs');
const seedrandom = require('seedrandom');
const { detailedDiff } = require('deep-object-diff');

const timeRegex = /(-?\d+) (action|bonus action|minute|hour|day|year|reaction|round|week)s?(, (.*))?/;
const healingRegex = /heal|((restore|regain).*hit points)/;

//#region IO
/**
 * Indexes the spells and monsters.
 * @returns {{*}} A dictionary containing spell and creature names to the github permalink.
 */
const indexSpellsAndMonsters = () => {
    console.log('======================================\nIndexing files...');
    const indices = {};
    const github = 'https://github.com/VoltCruelerz/OwlMarble-Magic/blob/master/spells';

    // Load all the spells.
    const spellNameTag = '## ';
    const spellNameRegex = /## (.*)/;
    const dirName = 'spells/levels/';
    const fileNames = fs.readdirSync(dirName);
    fileNames.forEach((fileName) => {
        const level = parseInt(fileName.substr(0, fileName.indexOf('.')));
        const contents = fs.readFileSync(dirName + fileName, { encoding: 'utf-8', flag: 'r' });
        const spellNames = contents.split('\r\n')
            .filter((line) => line.startsWith(spellNameTag))
            .map((spellLine) => spellLine.match(spellNameRegex)[1]);
        spellNames.forEach((spellName) => {
            const linkableName = spellName.replaceAll(' ','-').toLowerCase();
            indices[spellName] = `${github}/levels/${fileName}#${linkableName}`;
        });
    });

    // Load the monsters.
    const monsterNameTag = '> ## ';
    const monsterNameRegex = /> ## (.*)/;
    const monsterNames = fs.readFileSync('spells/Monster Blocks.md', { encoding: 'utf-8', flag: 'r' })
        .split('\r\n')
        .filter((line) => line.startsWith(monsterNameTag))
        .map((monsterNameLine) => monsterNameLine.match(monsterNameRegex)[1]);
    monsterNames.forEach((monsterName) => {
        const linkableName = monsterName.replace(' ', '-').toLowerCase();
        indices[monsterName] = `${github}/Monster%20Blocks.md#${linkableName}`;
    });

    return indices;
};

/**
 * Updates all references (proper names wrapped by underscores) in the spell source files.
 * @param {{*}} indices 
 */
const updateReferences = (indices) => {
    const dirName = 'spells/levels/';
    const fileNames = fs.readdirSync(dirName);
    fileNames.forEach((fileName) => {
        const contents = fs.readFileSync(dirName + fileName, { encoding: 'utf-8', flag: 'r' });
        const updated = contents.replaceAll(/(^|\W)_(\w.*?\w)_(\W|$)/g, (match, g1, g2, g3, offset, prime) => {
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
const readAndParseInputFiles = () => {
    console.log('======================================\nReading input files...');
    const dirName = 'spells/levels/';
    const fileNames =fs.readdirSync(dirName);
    const allSpells = [];
    fileNames.forEach((fileName) => {
        const level = parseInt(fileName.substr(0, fileName.indexOf('.')));
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
    console.log('Printing to: ' + path);
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
            _id: generateUUID(name + ' (OwlMarble Magic)'),
            name,
            permission: {
                default: 0
            },
            type: 'spell',
            img: getImage(school),
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
                damage: getDamage(description),
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
                classes: classes
            },
            effects: [],
            sort: 0,
            flags: {
                exportSource: {
                    world: 'none',
                    system: 'dnd5e',
                    coreVersion: '0.8.8',
                    systemVersion: '1.3.6'
                }
            }
        };
        if (oldName) {
            spell.oldName = oldName;
        }
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
        
        line = linkify(preify(italicize(boldify(line))));
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
 * Replaces markdown links with html links.
 * @param {string} line 
 * @returns {string}
 */
const linkify = (line) => {
    return line.replaceAll(/(^|\W)\[(\w.*?\w)\]\((https:\/\/.*?)\)(\W|$)/g, (match, g1, g2, g3, g4, offset, prime) => {
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
    return !!line.match(/>? ?#+ /);
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
/**
 * Generates a UUID from a PRNG seeded on the spell's name.
 * @param {string} seed The seed for the RNG.
 * @returns {string} The UUID.
 */
const generateUUID = (seed) => {
    const rng = seedrandom(seed);
    const options = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const chars = [];
    const uuidLength = 16;
    for (let i = 0; i < uuidLength; i++) {
        chars.push(options.charAt(getRandomInt(options.length, rng)));
    }
    return chars.join('');
};

/**
 * Generates a random int from 0 (inclusive) to the max (exclusive).
 * @param {number} max The number of faces on the die.
 * @param {{*}} rng The random number generator.
 * @returns {number} a random number.
 */
const getRandomInt = (max, rng) => {
    return Math.floor(rng() * max);
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
            type: match[2],
            cost: parseInt(match[1]),
            condition: match[4] || ''
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
 * Generates an object for AoEs.
 * @param {[*]} match 
 * @returns {{value: number, units: string, shape: string}}
 */
const getAoE = (match) => {
    let val = parseInt(match[1]);
    let units = match[2];
    if (units.startsWith('foot') || units.startsWith('feet')) {
        units = 'ft';
    } else if (units.startsWith('mile') || units.startsWith('miles')) {
        units = 'mi';
    }
    
    let shape = match[3];
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

    return {
        value: val,
        units: units,
        type: shape
    };
}

/**
 * Generates the target object.
 * @param {string} range 
 * @param {string} description 
 * @returns {{value: number, units: string, type: string}}
 */
const getTarget = (range, description) => {
    range = range.toLowerCase();
    description = description.toLowerCase();
    const targetRegex = /(\d+)\W(.+?)\W(cone|cube|radius\Wcylinder|diameter\Wcylinder|radius\Wsphere|diameter\Wsphere|radius|square|wall|line)/;
    const creatureRegex = /creature|aberration|beast|celestial|construct|dragon|elemental|fey|fiend|giant|humanoid|monstrosity|monster|ooze|plant|undead/;
    const objectRegex = /object|club|magical eye|a nonmagical weapon|transmute your quiver|any trap|a chest|a weapon you touch|triggering attack|figment/;
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
        const aoe = getAoE(match);
        if (aoe.units === 'ft' || aoe.units === 'mi') {
            return aoe;
        }
    } 
    if (description.match(targetRegex)) {
        const match = description.match(targetRegex);
        const aoe = getAoE(match);
        if (aoe.units === 'ft' || aoe.units === 'mi') {
            return aoe;
        }
    } 
    
    if (description.match(creatureRegex)) {
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
    } else if (description.match(healingRegex)) {
        return 'heal';
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
    const upcastTag = '<strong>higher levels</strong>';
    const upcastIndex = description.indexOf(upcastTag);
    const baseDesc = upcastIndex > -1 ? description.substr(0, upcastIndex) : description;
    const parts = [];

    // Normally, people write damage like "deal 8d6 fire damage" or "deal 1d8 plus your spellcasting ability modifier".
    const damageRegex = /(?<die>\d+(d\d+)?) ?(?<operator>\+|-|plus|minus)?([^\.]*?(?<shifter>\d+|modifier))?[^\.]*?(?<element>acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder|heal|temporary hit point)/g;
    
    // but sometimes, healing is written the opposite way
    const invertedHealingRegex = /(heal|regain|restore).*?(\d+(d\d+)?) ?(\+|-|plus|minus)?([^\.]*?(\d+|modifier))?/g;

    const damageMatches = baseDesc.matchAll(damageRegex);
    for (const match of damageMatches) {
        const full = match[0];
        const dice = match[1];
        const dieSize = match[2];
        let op = match[3];
        const longTag = match[4];
        const shifter = match[5] === 'modifier' ? '@mod' : match[5];
        let element = match[6];

        if (op === 'plus') {
            op = '+';
        } else if (op === 'minus') {
            op = '-';
        }

        if (element === 'heal') {
            element = 'healing';
        } else if (element === 'temporary hit point') {
            element = 'temphp';
        }

        // Ignore wordings like "5-foot radius".
        if (op && !shifter) {
            continue;
        }

        const damageLine = op ? `${dice} ${op} ${shifter}` : dice;
        parts.push([
            damageLine,
            element
        ]);
    }
    const healingMatches = baseDesc.matchAll(invertedHealingRegex);
    for (const match of healingMatches) {
        const full = match[0];
        const operation = match[1];
        const dice = match[2];
        const dieSize = match[3];
        let op = match[4];
        const longTag = match[5];
        const shifter = match[6] === 'modifier' ? '@mod' : match[6];

        if (op === 'plus') {
            op = '+';
        } else if (op === 'minus') {
            op = '-';
        }

        const healLine = op ? `${dice} ${op} ${shifter}` : dice;
        parts.push([
            healLine,
            'healing'
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
};

/**
 * Decodes the school code back into the school.  eg 'abj' => 'Abjuration'
 * @param {string} schoolCode 
 * @returns {string}
 */
const decodeSchool = (schoolCode) => {
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
    const componentTerms = (openIndex > -1 ? components.substr(0, openIndex) : components).split(', ').map((term) => term.trim());

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
    const valuableRegex = /.*\(.*?(\d+) ?[gp|gold].*\)/;
    const flavorRegex = /.*\((.*?)\)/;
    const valuableMatches = components.match(valuableRegex);
    const flavorMatches = components.match(flavorRegex);
    if (valuableMatches && flavorMatches) {
        const cost = parseInt(valuableMatches[1]);
        const flavor = flavorMatches[1];
        return {
            value: flavor,
            consumed: consumed,
            cost: cost,
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
const parseImportedFile = (contents) => {
    const spells = JSON.parse(contents).spell;
    const parsed = [];
    for (let i = 0; i < spells.length; i++) {
        const spell = spells[i];
        try {
            const school = deimportSchool(spell.school);
            const description = parseImportedEntries(spell.entries) + parseImportedEntries(spell.entriesHigherLevel).replace('<strong>At Higher Levels</strong>', '<strong>Higher Levels</strong>');
            const importedRange = getImportedRange(spell);
            const range = getRange(importedRange);
            parsed.push({
                _id: generateUUID(spell.name + ' (Imported)'),
                name: spell.name,
                permission: {
                    default: 0
                },
                type: 'spell',
                img: getImage(school),
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
                        condition: spell.time[0].condition || ''
                    },
                    duration: getImportedDuration(spell),
                    target: getTarget(importedRange, description),
                    range: range,
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
                    damage: getDamage(description),
                    formula: '',
                    save: getSave(description),
                    level: spell.level,
                    school: getSchoolCode(school),
                    components: getImportedComponents(spell),
                    materials: getImportedMaterials(spell),
                    preparation: {
                        mode: 'prepared',
                        prepared: false
                    },
                    scaling: getScaling(spell.level, description),
                    classes: getImportedClasses(spell)
                },
                effects: [],
                sort: 0,
                flags: {
                    exportSource: {
                        world: 'none',
                        system: 'dnd5e',
                        coreVersion: '0.8.8',
                        systemVersion: '1.3.6'
                    }
                }
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
        return raw
            .replaceAll(/{@\w+ (\w+)\|?.*?}/g, (match, p, offset, prime) => p)
            .replaceAll('}','');// Clean up termination of nested wrappers.
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
        somatic: !!spell.components.s,
        material: !!spell.components.m,
        ritual: !!isRitual,
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
    if (typeof spell.components.m === 'string') {
        return {
            value: spell.components.m,
            consumed: false,
            cost: 0,
            supply: 0
        };
    }
    return {
        value: spell.components.m.text,
        consumed: spell.components.m.consume,
        cost: spell.components.m.cost / 100,
        supply: 0
    };
};

/**
 * Parses the classes for the imported spells.
 * @param {{*}} spell 
 */
const getImportedClasses = (spell) => {
    const classLookup = {};
    try {
        spell?.classes?.fromClassList?.forEach((classEntry) => {
            if (classEntry.source === 'PHB' || classEntry.source === 'TCE') {
                classLookup[classEntry.name] = true;
            }
        });
        spell?.classes?.fromClassListVariant?.forEach((varEntry) => {
            if (varEntry.definedInSource === 'UAClassFeatureVariants') {
                classLookup[varEntry.name];
            }
        });
    } catch (e) {
        console.log('Failure on importing classes list: ' + spell.classes);
        throw e;
    }
    return Object.keys(classLookup);
}
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
 * Exports the spell lists for each class.
 * @param {[{*}]} spells 
 * @param {{*}} indices
 */
const exportSpellLists = (spells, indices) => {
    const wall = ('======================================');
    console.log(wall + '\nExporting Class Spell Lists...');
    const classes = Object.keys(spells.reduce((acc, spell) => {
        spell.data.classes.forEach((casterClass) => {
            acc[casterClass] = true;
        });
        return acc;
    }, {}));
    classes.sort();

    console.log('Classes: ' + classes);

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
            const currentSpells = spells.filter((spell) => spell.data.classes.includes(clazz) && spell.data.level === i);
            if (currentSpells.length === 0) {
                continue;
            }
            outputLines.push(`### ${level} - _${clazz}_`);
            outputLines.push('');
            currentSpells.forEach((spell) => {
                const tags = [];
                const components = [];
                if (spell.data.components.vocal) {
                    components.push('V');
                }
                if (spell.data.components.somatic) {
                    components.push('S');
                }
                if (spell.data.components.material) {
                    let materialTerm = 'M';
                    if (spell.data.materials.cost) {
                        materialTerm += '$';
                        if (spell.data.materials.consumed) {
                            materialTerm += 'X';
                        }
                    }
                    components.push(materialTerm);
                }
                tags.push(components.join('/'));

                if (spell.data.components.ritual) {
                    tags.push('[R]');
                }
                if (spell.data.components.concentration) {
                    tags.push('[C]');
                }

                const tagString = tags.length > 0 ? ' - ' + tags.join(' ') + ' - ' : ' - ';

                // Link locally if it's homebrew, but otherwise, just point to D&D beyond.
                const link = indices[spell.name]
                    ? `[${spell.name}](${indices[spell.name]})`
                    : `[${spell.name}](${dndbeyond + spell.name.toLowerCase().replaceAll(' ','-')})`;
                outputLines.push(`- ${link}${tagString}(${spell.data.source})`)
            });
            outputLines.push('');
        }
    });
    const output = outputLines.join('\r\n');// It burns us, precious!  (windows line breaks)

    fs.writeFileSync('spells/Spells by Class.md', output);
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
 * Generates a diff report for the old spells vs the new spells.
 * @param {[{*}]} oldSpells 
 * @param {[{*}]} newSpells 
 */
const logDiff = (oldSpells, newSpells) => {
    const wall = ('======================================');
    console.log(wall + '\nChecking for diffs...');

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
};

/**
 * Main method.
 */
const run = () => {
    // Index the spells and synchronize any links.
    const indices = indexSpellsAndMonsters();
    updateReferences(indices);

    // Homebrew Only
    const homebrew = readAndParseInputFiles();
    printSpells(homebrew, 'output/owlmagic-only/spells.db');

    // SRD + Homebrew
    const srd = readSpellDB('srd/srd.db');
    srd.forEach((srdSpell) => { srdSpell.img = getImage(decodeSchool(srdSpell.data.school)); });
    printSpells(mergeSpellLists(srd, homebrew), 'output/owlmagic-srd/spells.db');

    // Publishable
    printSpells(mergeSpellLists(srd, homebrew), 'packs/spells.db');

    // Imported only
    const imported = readAndParseImportedSpells();
    sortSpellList(imported);
    printSpells(imported, 'output/imported/spells.db');

    // Homebrew + Imported
    const allSpells = mergeSpellLists(imported, homebrew);
    const oldSpells = readSpellDB('output/all/spells.db');
    printSpells(allSpells, 'output/all/spells.db');

    // Export the spell lists for all included classes.
    exportSpellLists(allSpells, indices);

    // Export all to current foundry install.
    console.log('======================================\nExporting spells to foundry install...');
    printSpells(allSpells, 'E:/Foundry VTT/Data/modules/owlmarble-magic/packs/spells.db');

    // Log differences to spells.
    logDiff(oldSpells, allSpells);
};
run();
console.log('======================================\nDone.');