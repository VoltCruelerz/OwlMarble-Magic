const fs = require('fs');
const path = require('path');
const seedrandom = require('seedrandom');

module.exports = class Parser {
    constructor () {
        this.thickWall = '======================================';
        this.thinWall = '--------------------------------------';
    }

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
     * @param {string} filename The name of the file.
     * @param {number} lineNumber The line in the file.
     * @param {{}} spellDict The spell dictionary.
     * @returns A html-ified variant with compendium links.
     */
    italilink (line, filename, lineNumber, spellDict) {
        if (!spellDict) {
            throw new Error('No spell dictionary provided. Did all parameters get sent?');
        }
        const noUrlLine = line.replaceAll(/\[.+\]\(.+?\)/g, '');
        const count = (noUrlLine.match(/_/g) || []).length;
        if (count === 0) {
            // Ignore URLs or empty lines.
            return line;
        }
        if (count % 2 !== 0) {
            // We have an odd number, so don't even try to format this.  It would just get weird.
            console.log(`${filename}[${lineNumber}]: Weird line will be ignored by italilink: ${line}`);
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
     * Replaces markdown links with html links.
     * @param {string} line 
     * @param {string} activePath - The path from the root directory to the currently processed file.
     * @returns {string}
     */
    linkify (line, activePath = '') {
        // Convert reddit users into proper urls.
        line = line.replaceAll(/(\W+)u\/([\w\-]+)(\]\(http)?/g, (match, g1, g2, g3) => {
            const pre = g1;
            const username = g2;
            const existingLink = g3;

            // It's possible that I wrote a reddit link out like this: [u/User](https://reddit.com/path/to/submission/here).
            // In such a situation, it's already a link, so no need to try to parse it to their username.
            if (existingLink) {
                return match;
            }

            const url = 'https://www.reddit.com/user/' + username;
            return `${pre}<a href="${url}">u/${username}</a>`;
        });

        // Fix any stupid windows path slashes.
        activePath = activePath
            .replaceAll('\\', '/')
            .replaceAll(' ', '%20');
        // Local markdown link to html link to Github page.
        line = line.replaceAll(/(^|\W)\[(\w.*?\w)\]\((\..*?)\)(\W|$)/g, (match, g1, g2, g3, g4) => {
            const pre = g1;
            const name = g2;
            const localPath = g3;
            const post = g4;
            if (!line) {
                console.log('WARNING: no active path provided for ' + activePath);
            }
            
            // Now we have to navigate locally, so split things based on levels.
            const activeParts = activePath.split('/');
            const localParts = localPath.split('/');
            let activeRegressionLevels = 0;
            const localRegressionLevels = localParts.reduce((total, term, index) => {
                if (term === '.') {
                    activeRegressionLevels++;
                    total++;
                } else if (index === 0 && term === '..') {
                    activeRegressionLevels += 2;
                    total++;
                } else if (term === '..') {
                    activeRegressionLevels++;
                    total++;
                }

                return total;
            }, 0);

            const mergedPath = activeParts
                .slice(0, activeParts.length - activeRegressionLevels)
                .concat(localParts.slice(localRegressionLevels))
                .join('/');
            const url = `<a href="https://github.com/VoltCruelerz/OwlMarble-Magic/blob/master/${mergedPath}">${name}</a>`;
            return `${pre}${url}${post}`;
        });

        // General markdown link to html link.
        return line.replaceAll(/(^|\W)\[(\w.*?\w)\]\((https:\/\/.*?)\)(\W|$)/g, (match, g1, g2, g3, g4) => {
            const pre = g1;
            const name = g2;
            const url = g3;
            const post = g4;
            return `${pre}<a href="${url}">${name}</a>${post}`;
        });
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

    /**
     * Checks to see if the line is purely hyphens or underscores
     * @param {Input line} line 
     * @returns 
     */
    lineIsHR (line) {
        return line.match(/^(?:> )?[_|-]+$/) || line === '```';
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
    //#endregion

    //#region ID
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
    //#endregion

    //#region I/O
    /**
     * Prints the json objects to a Foundry db.
     * @param {[{}]} items
     * @param {string[]} path
     */
    printDb (items, paths) {
        console.log(`Printing to ${paths.length} files`);
        paths.forEach((path) => {
            const lines = items.map((item) => JSON.stringify(item));
            const db = lines.join('\n') + '\n';
            fs.writeFileSync(path, db);
        });
    }

    /**
     * Retrieves a DB file and parses it to a string -> entry dictionary.
     * @param {string} path 
     * @returns {{*}} dictionary
     */
    getDbDict (path) {
        console.log(this.thinWall + '\nReading db file: ' + path);
        const contents = fs.readFileSync(path, { encoding: 'utf-8', flag: 'r' });
        const lines = contents.split('\n');
        const entries = lines.filter((line) => line).map((line) => JSON.parse(line));
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
     * Retrieves all Markdown files in the provided directory (recursively).
     * @param {string} rootPath 
     * @returns 
     */
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
    //#endregion
};