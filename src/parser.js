const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');
const seedrandom = require('seedrandom');
const chalk = require('chalk');
const ProgressBar = require('./ProgressBar');

module.exports = class Parser {
    constructor () {
        this.thickWall = chalk.gray('══════════════════════════════════════════');
        this.thinWall =  chalk.gray('─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ');
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
            console.log(chalk.yellow(`${filename}[${lineNumber}]: Weird line will be ignored by italilink: ${line}`));
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
    // #endregion

    // #region Parsing
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

    /**
     * Generates the damage object.
     * @param {string} description 
     * @returns {{parts: [[string]], versatile: string}}
     */
    getDamage (description) {
        description = description.toLowerCase()
            .replaceAll('plus', '+')
            .replaceAll('minus', '-')
            .replaceAll(/\d+ (?:action|bonus action|minute|hour|day|year|reaction|round|week)/g, () => '');
        const upcastTag = '<strong>higher levels</strong>';
        const upcastIndex = description.indexOf(upcastTag);
        const baseDesc = upcastIndex > -1 ? description.substr(0, upcastIndex) : description;
        const parts = [];

        // Normally, people write damage like "deal 8d6 fire damage" or "deal 1d8 plus your spellcasting ability modifier".
        const damageRegex = /(\d+(d\d+)?) ?(\+|-)?(\W*?(\d+|(?:your spellcasting ability )?(modifier)))?[^\.]*?(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder|heal|temporary hit point)s?\W/g;
        
        // but sometimes, things are written the opposite way
        const invertedHealingRegex = /(heal|regain|restore|hit point maximum).{1,50}?(\d+(d\d+)?) ?(\+|-)?([^\.]*?(\d+|modifier))?/g;
        const invertedDamageRegex = /(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder).*?(\d+(d\d+))(.*?(\+|-).*?(\d+|modifier))?/g;

        const lines = baseDesc.split(/<p>|<td>|<li>|<h3>|<h4>|<h5>|<br>|<br\/>/);
        lines.forEach((line) => {
            const damageMatches = line.matchAll(damageRegex);
            for (const match of damageMatches) {
                // const full = match[0];
                const dice = match[1];
                // const dieSize = match[2];
                let op = match[3];
                // const longTag = match[4];
                const shifter = match[6] === 'modifier' ? '@mod' : match[5];
                let element = match[7];
    
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
            const healingMatches = line.matchAll(invertedHealingRegex);
            for (const match of healingMatches) {
                // const full = match[0];
                // const operation = match[1];
                const dice = match[2];
                // const dieSize = match[3];
                let op = match[4];
                // const longTag = match[5];
                const shifter = match[6] === 'modifier' ? '@mod' : match[6];
    
                const healLine = op ? `${dice} ${op} ${shifter}` : dice;
                parts.push([
                    healLine,
                    'healing'
                ]);
            }
        });
        // If we still haven't found anything, try inverting the order.
        if (parts.length === 0) {
            const invertedDamageMatches = baseDesc.matchAll(invertedDamageRegex);
            for (const match of invertedDamageMatches) {
                const element = match[1];
                const dice = match[2];
                let op = match[5];
                const shifter = match[6] === 'modifier' ? '@mod' : match[6];
    
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
        }
        return {
            parts,
            versatile: '',
            value: ''
        };
    }

    /**
     * Parses the imported entries recursively for the description field.
     * @param {[string]} entries 
     * @returns {string}
     */
    parseImportedEntries (entries) {
        if (!entries) {
            return '';
        }
        return entries.map((entry) => {
            if (typeof entry === 'string') {
                return '<p>' + this.unwrap(entry) + '</p>';
            } else if (entry.type === 'list') {
                const items = entry.items.map((item) => {
                    const listItem = (item.type === 'list')
                        ? this.parseImportedEntries([item])
                        : this.unwrap(item);
                    return '<li>' + listItem + '</li>';
                }).join('');
                return '<ul>' + items + '</ul>';
            } else if (entry.type === 'section') {
                return this.parseImportedEntries(entry.entries);
            } else if (entry.type === 'entries' || entry.type === 'inset') {
                const boldName = this.tagify('strong', entry.name);
                return boldName + this.parseImportedEntries(entry.entries);
            } else if (entry.type === 'table') {
                const tableLines = [
                    this.tagify('h3', entry.caption),
                    '<table border="1">',
                    this.tagify('tbody', [
                        this.tagify('tr', [
                            ...entry.colLabels.map((label) => `<td style="text-align: center;"><strong>${this.unwrap(label)}</strong></td>`)
                        ].join('')),
                        ...entry.rows.map((row) => this.tagify('tr', row.map((item) => this.tagify('td', this.unwrap(item))).join('')))
                    ].join('')),
                    '</table>'
                ];
                return tableLines.join('');
            } else if (entry.type === 'quote') {
                return '';
            } else {
                throw new Error(chalk.red('Unrecognized Entry: ' + JSON.stringify(entry, null, 4)));
            }
        }).join('');
    }
    
    /**
     * unwraps text, such as {@spell blah blah|actual spell name}
     * @param {string|{*}} raw 
     * @returns {string}
     */
    unwrap (raw) {
        if (typeof raw === 'string') {
            return raw
                .replaceAll(/{@(?:dice|damage) (.+?)(?:\|\d+)?}/g, (g0, g1) => '[[/r ' + g1.replaceAll('x', '*') + ']]')
                .replaceAll(/{@creature (.+?)\|.*?}/g, (g0, g1) => g1)
                .replaceAll(/{@filter (.+?)\|.+}/g, (g0, g1) => g1)
                .replaceAll(/{@b (.+?)}/g, (g0, g1) => this.tagify('strong', g1))
                .replaceAll(/{@i (.+?)}/g, (g0, g1) => this.tagify('em', g1))
                .replaceAll(/{@scale(?:dice|damage) \|?.*?\|?(\w+)}/g, (g0, g1) => g1)
                .replaceAll(/{@(?:condition|action|sense|skill|race) (.*?)}/g, (g0, g1) => g1)
                .replaceAll(/{@d20 (.*?)}/g, (g0, g1) => '[[/r 1d20+' + g1 + ']]')
                .replaceAll(/{@(?:item|book|classFeature) (\w+)\|?.*?}/g, (g0, g1) => g1)
                .replaceAll(/{@creature (.*?)}/g, (g0, g1) => g1)
                .replaceAll(/{@spell (.*?)}/g, (g0, g1) => {
                    const words = g1.split(' ').map((word) => this.capFirst(word));
                    const formatted = this.tagify('em', words.join(' '));
                    return formatted;
                })
                .replaceAll(/{@chance (\d+)\|?.*?}/g, (g0, g1) => g1 + '% [[1d100]]')
                .replaceAll(/{@class (.+?)(\|.+?)*}/g, (g0, g1) => g1)
                .replaceAll(/{@quickref (.+?)(\|.+?)*}/g, (g0, g1) => g1)
                .replaceAll(/{@table (.+?)(\|.+?)*}/g, (g0, g1) => g1)
                .replaceAll(/{@status (.+?)(\|.+?)*}/g, (g0, g1) => g1)
                .replaceAll(/{@variantrule (.+?)(\|.+?)*}/g, (g0, g1) => g1)
                .replaceAll(/{@note (.+?)}/g, (g0, g1) => g1)
                .replaceAll(/{@language (.+?)}/g, (g0, g1) => g1)
                .replaceAll(/{@\w+ (\w+)\|?.*?}/g, (g0, g1) => {
                    console.log(chalk.yellow('- Missing Handler for Tag: ' + g0));
                    return g1;
                })
                .replaceAll('}','');// Clean up termination of nested wrappers.
        } else if (raw.type === 'cell') {
            if (raw.roll.min || raw.roll.max) {
                return raw.roll.min + ' - ' + raw.roll.max;
            } else if (raw.roll.exact) {
                return raw.roll.exact + '';
            }
            return JSON.stringify(raw.roll);
        } else if (raw.type === 'item') {
            return this.tagify('b', raw.name) + ' ' + raw.entries.map((entry) => {
                return entry.type === 'table'
                    ? this.parseImportedEntries([entry])
                    : this.unwrap(entry);
            }).join('\n');
        } else {
            throw new Error(chalk.red('Failed to unwrap: ' + raw + '\n' + JSON.stringify(raw, null, 4)));
        }
    }
    
    /**
     * Capitalizes the first letter in the string.
     * @param {string} str 
     */
    capFirst (str) {
        return str.charAt(0).toUpperCase() + str.substr(1);
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

    //#region Compendium Browser
    /**
     * 
     * @param {string} startTarget 
     * @param {string} stopTarget 
     * @param {[string]} injectionLines 
     */
    static setCompendiumBetweenTargets(startTarget, stopTarget, injectionLines) {
        const src = fs.readFileSync('E:\\Foundry VTT\\Data\\modules\\compendium-browser\\module\\compendium-browser.js', 'utf8')
            .split('\n');
        let startLine = -1;
        let stopLine = -1;
        let indentation = '';
        for (let i = 0; i < src.length; i++) {
            const line = src[i].trim();
            if (line === startTarget) {
                startLine = i;
                indentation = src[i].substring(0, src[i].indexOf(line)) + '    ';
                break;
            }
        }
        for (let i = startLine + 1; i < src.length; i++) {
            const line = src[i].trim();
            if (line === stopTarget) {
                stopLine = i;
                break;
            }
        }

        // Copy to output
        const output = [];
        for (let i = 0; i <= startLine; i++) output.push(src[i]);
        injectionLines.forEach(inj => output.push(indentation + inj));
        for (let i = stopLine; i < src.length; i++) output.push(src[i]);

        fs.writeFileSync('E:\\Foundry VTT\\Data\\modules\\compendium-browser\\module\\compendium-browser.js', output.join('\n'), 'utf8');
    }

    // /**
    //  * 
    //  * @param {{any: [string]}} classMappings 
    //  */
    // static setCompendiumSubclasses(classMappings) {
    //     const startTarget = 'static subClasses = {';
    //     const stopTarget = '};';
    //     const payload = [];
    //     Parser.setCompendiumBetweenTargets(startTarget, stopTarget, payload);
    // }
    //#endregion

    //#region I/O
    /**
     * Gets Foundry's Process ID, or -1 if not found.
     * @returns {Promise<number>} -1 or a PID
     */
    static async getFoundryPID() {
        const cmd = 'tasklist /fo csv';
        const { stdout } = await exec(cmd);
        const stripQuotes = (str) => str.substr(1, str.length - 2);
        const rows = stdout.toLowerCase().split('\n').map(row => row.split(',').map(stripQuotes));
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row[0] === 'foundry virtual tabletop.exe') {
                return row[1];
            }
        }
        return -1;
    }

    static async attempt (cmd) {
        const result = await exec(cmd);
        if (result.stderr.length > 0) {
            if (result.stderr.startsWith('Debugger attached'))
                console.warn(chalk.bgYellow(`DEBUG BLOCKED EXEC: "${cmd}"`));
            else
                throw new Error(`Export Command Failed:\n$ ${cmd}\n` + result.stderr);
        }
        return result.stdout;
    }

    /**
     * Prints the json objects to a Foundry db.
     * @param {[{}]} items
     * @param {string[]} paths
     */
    printDb (items, paths) {
        const pgb = new ProgressBar(40);
        pgb.str('json db');
        paths.forEach((path, i) => {
            pgb.set(i / paths.length);
            const lines = items.map((item) => JSON.stringify(item));
            const db = lines.join('\n') + '\n';
            fs.writeFileSync(path, db);
        });
        pgb.set(1);
    }

    /**
     * Prints the json objects to a Level db.
     * @param {[{}]} entries - the rows to export
     * @param {string} compendium - the name of the compendium folder
     * @param {string} dataPath - the directory where the foundry Data folder is
     * @param {Promise<boolean>} - TRUE if exported, FALSE if not.
     */
    async exportDb (entries, compendium, dataPath) {
        if (await Parser.getFoundryPID() > -1) {
            console.warn(chalk.yellow(`[WARNING] - Foundry is currently running, so export to "${compendium}" will not occur.`));
            return false;
        }

        const sanitize = (str) => {
            str = str.replace(/\W/g, '_');
            return str;
        };

        const pgb = new ProgressBar(40);
        pgb.str('level db');
        const cmd = `fvtt package pack "${compendium}"`;
        try {
            const exportDir = `${dataPath}/Data/modules/owlmarble-magic/packs/${compendium}/_source`;
            entries.forEach((entry, i) => {
                pgb.set(i / entries.length);
                const path = `${exportDir}/${sanitize(entry.name)}_${entry._id}.json`;
                fs.writeFileSync(path, JSON.stringify(entry), 'utf8');
            });
            
            const pack = await exec(cmd);
            if (pack.stderr.length > 0) throw new Error(pack.stderr);
            pgb.set(1);
        }
        catch (err) {
            pgb.set(1);
            if (err.message.includes('Debugger attached')) {
                console.warn(chalk.bgYellow(`DEBUG BLOCKED EXEC: "${cmd}"`));
                return false;
            }
            console.error(chalk.bgRed(`Failed to Export "${compendium}"`));
            console.error(chalk.red(err));
            return false;
        }
        return true;
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