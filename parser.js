console.log('Starting...');
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
    allSpells.sort((a, b) => (a.name > b.name) ? 1 : -1);
    allSpells.sort((a, b) => (a.level >= b.level) ? 1 : -1);
    console.log('All Spells:\n' + JSON.stringify(allSpells));
    return allSpells;
};

/**
 * Prints the spells to the output folder in a db file.
 * @param {[{}]} spells 
 */
const printSpells = (spells) => {
    const spellLines = spells.map((spell) => JSON.stringify(spell));
    const db = spellLines.join('\n') + '\n';
    fs.writeFileSync('output/owlmagic.db', db);
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
    const lines = content.split(/\r?\n/).filter((line) => !line.startsWith('<div') && line);
    const spellText = [];
    let readingSpellsYet = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect the end of the preamble.
        if (line === '## Spells') {
            readingSpellsYet = true;
            console.log('Reached spells section...');
            continue;
        } else if (line === '## Appendix') {
            console.log('Reached spell end.');
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
    const school = parseSpellTrait('School', lines[1]);
    const castTime = parseSpellTrait('Casting Time', lines[2]);
    const range = parseSpellTrait('Range', lines[3]);
    const components = parseSpellTrait('Components', lines[4]).split(', ');
    const duration = parseSpellTrait('Duration', lines[5]);
    const classes = parseSpellTrait('Classes', lines[6]).split(', ');
    const description = parseDescription(lines.splice(7));
    const spell = {
        level,
        name,
        school,
        castTime,
        range,
        components,
        duration,
        classes,
        description
    };
    return spell;
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


//#region Main
// Do work.
printSpells(readAndParseInputFiles());
//#endregion
console.log('Done.');