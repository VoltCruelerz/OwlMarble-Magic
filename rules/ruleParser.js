const fs = require('fs');
const path = require('path');
const seedrandom = require('seedrandom');


/**
 * Sets up a feat parser for OwlMarble Magic.
 * @class
 */
module.exports = class RuleParser {
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

    getAllMarkdown (rootPath) {
        const files = [];
        const getFilesRecursively = (directory) => {
            const filesInDirectory = fs.readdirSync(directory);
            for (const file of filesInDirectory) {
                const absolute = path.join(directory, file);
                if (fs.statSync(absolute).isDirectory()) {
                    getFilesRecursively(absolute);
                } else {
                    files.push(absolute);
                }
            }
        };
        getFilesRecursively(rootPath);
        return files.filter((file) => file.endsWith('.md'));
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

        // Compile all rule paths.
        const markdownPaths = [
            ...this.getAllMarkdown('./rules/'),
            ...this.getAllMarkdown('./classes/'),
            ...this.getAllMarkdown('./spells/')
        ];

        // Actually parse.
        let journalFiles = markdownPaths.map((path) => {
            const soloName = /.*\\(?<file>.*?)\.md/.exec(path).groups.file;
            const markdownLines = fs.readFileSync(path, { encoding: 'utf-8', flag: 'r' }).split('\r\n').filter((line) => line);

            // Parse content
            const journalLines = [];
            for (let i = 1; i < markdownLines.length; i++) {
                const prevLine = i - 1 > -1 ? markdownLines[i - 1] : '';
                const nextLine = i + 1 < markdownLines.length ? markdownLines[i + 1] : '';
                let line = markdownLines[i];
                let nextLineInjection = undefined;

                // Handle quotes first because they can encapsulate other formatting.
                const isQuote = line.startsWith('> ');
                if (isQuote) {
                    line = line.slice(2);
                    journalLines.push('<blockquote>');
                }

                // Handle other formatting.
                const curDepth = this.listDepth(line);
                if (curDepth) { // Check for lists.
                    const prevDepth = prevLine ? this.listDepth(prevLine) : 0;
                    const nextDepth = nextLine ? this.listDepth(nextLine) : 0;
                    if (prevDepth < curDepth) {
                        // This is the start of the list, so prefix this.
                        journalLines.push('<ul>');
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
                        journalLines.push('<table border="1"><tbody>');
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
                journalLines.push(formattedLine);

                // Insert table/list terminations.
                if (nextLineInjection) {
                    journalLines.push(nextLineInjection);
                }

                // If in a quote, close it out.
                if (isQuote) {
                    journalLines.push('</blockquote>');
                }
            }
            const journalString = journalLines
                .join('')// Merge lines.
                .replaceAll('</blockquote><blockquote>', '');// Merge adjacent block quotes.

            return {
                _id: this.generateUUID(`${path} (OwlMarble Magic - Rules)`),
                name: soloName,
                permission: {
                    default: 2
                },
                folder: '',
                flags: {
                    'owlmarble-magic': {
                        exportTime: (new Date()).toString()
                    }
                },
                content: journalString
            };
        });

        // Synchronize dates.
        journalFiles = this.synchronizeDates(this.getDbDict('packs/rules.db'), journalFiles);

        // Export.
        this.printDb(journalFiles, 'packs/rules.db');
        this.printDb(journalFiles, 'output/all/rules.db');
        this.printDb(journalFiles, 'output/owlmagic-only/rules.db');
        this.printDb(journalFiles, 'output/owlmagic-srd/rules.db');
        this.printDb(journalFiles, 'E:/Foundry VTT/Data/modules/owlmarble-magic/packs/rules.db');
    }
};