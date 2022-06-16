const fs = require('fs');
const Parser = require('./parser');

/**
 * Sets up a journal parser for OwlMarble Magic.
 * @class
 */
module.exports = class RuleParser extends Parser {
    /**
     * Executes the parsing of the feats.
     * @param {[{}]} spells 
     * @param {string[]} inputFolders
     * @param {string[]} outputPaths
     * @returns 
     */
    run (spells, inputFolders, outputName) {
        const spellDict = spells.reduce((acc, spell) => {
            acc[spell.name] = spell;
            return acc;
        }, {});

        // Compile all rule paths.
        let markdownPaths = [];
        inputFolders.forEach((folder) => {
            markdownPaths = markdownPaths.concat(this.getAllMarkdown(folder));
        });
        console.log('Markdown Paths: ' + markdownPaths.length);

        // Actually parse.
        let journalFiles = markdownPaths.map((path) => {
            const soloName = /.*\\(?<file>.*?)\.md/.exec(path).groups.file;
            const markdownLines = fs.readFileSync(path, { encoding: 'utf-8', flag: 'r' })
                .split('\r\n')
                .filter((line) => line && line !== '>');

            // Parse content
            const journalLines = [];
            for (let i = 1; i < markdownLines.length; i++) {
                const prevLine = i - 1 > -1 ? markdownLines[i - 1] : '';
                const nextLine = i + 1 < markdownLines.length ? markdownLines[i + 1] : '';
                let line = markdownLines[i];
                let nextLineInjection = undefined;

                // Handle quotes first because they can encapsulate other formatting.
                const isQuote = line.startsWith('>');
                if (isQuote) {
                    line = /> ?(?<content>.*)/.exec(line).groups.content;
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
                } else if (this.lineIsHR(line)) {
                    line = '<hr />';
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
                let formattedLine = this.linkify(
                    this.boldify(this.italilink(line, soloName, i, spellDict)),
                    path);

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
        journalFiles = this.synchronizeDates(this.getDbDict(`packs/${outputName}.db`), journalFiles);

        // Export.
        this.printDb(journalFiles, [
            `packs/${outputName}.db`,
            `output/all/${outputName}.db`,
            `output/owlmagic-only/${outputName}.db`,
            `output/owlmagic-srd/${outputName}.db`,
            `E:/Foundry VTT/Data/modules/owlmarble-magic/packs/${outputName}.db`
        ]);
    }
};