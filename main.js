const chalk = require('chalk');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const spawn = require('child_process').spawn;
const readline = require('node:readline');
const SpellParser = require('./src/spellParser.js');
const test = require('./tests/tests.js');
const FeatParser = require('./src/featParser.js');
const Parser = require('./src/parser.js');
const ClassParser = require('./src/classParser.js');
const WeaponParser = require('./src/weaponParser.js');
const JournalParser = require('./src/journalParser.js');
const thickWall =           '══════════════════════════════════════════';
const thinWall = chalk.gray('──────────────────────────────────────────');

const blockStart = (name) => {
    const content = chalk.blue(`Parsing ${name}...`);
    console.log(`${thickWall}\n${content}\n${thinWall}`);
};

const blockStop = () => {
    console.log(thickWall);
};

/**
 * Asks a question to the user with a time limit
 * @param {string} prompt 
 * @param {string} truthy The value that is considered to be TRUE. All else is FALSE
 * @param {function} ifCase If response === truthy, exec
 * @param {function} elseCase  If response !== truthy, exec
 * @param {string} defaultVal - The default value if fuse expires
 * @param {number} fuse time delay in ms before forcing. -1 is no force.
 */
const boolWithFuse = (prompt, truthy, ifCase, elseCase = (() => {}), defaultVal = '', fuse = -1) => {
    const rl = readline.createInterface(process.stdin, process.stdout);
    const forceTerminate = fuse > -1 ? setTimeout(() => rl.write(defaultVal + '\n'), fuse) : false;
    const forceTag = fuse > -1 ? chalk.gray(`\n(will assume ${defaultVal} after ${fuse/1000}s)`) : '';
    rl.question(prompt + forceTag, async (response) => {
        rl.close();
        if (fuse > -1) clearTimeout(forceTerminate);
        truthy === response ? ifCase() : elseCase();
    });
};

const main = async () => {
    console.log(thickWall + '\n' + chalk.bold(chalk.green('BEGIN PROCESSING')));
    await Parser.attempt('fvtt configure');
    const dataPath = (await Parser.attempt('fvtt configure get dataPath')).split('\n')[0];
    await Parser.attempt('fvtt package workon "owlmarble-magic"');
    console.log('Foundry Data Path: ' + dataPath);
    
    blockStart('Spells');
    const spellParser = new SpellParser();
    const result = await spellParser.run(dataPath);
    const allSpells = result.omm;
    const srdSpells = result.srd;
    let exportSuccess = result.exportSuccess;
    console.log(thinWall + '\nRunning Tests...');
    const passed = test(allSpells, srdSpells);
    console.log(thinWall + '\nTests Done.');
    
    blockStart('Feats');
    const featParser = new FeatParser();
    exportSuccess = await featParser.run(allSpells, dataPath) && exportSuccess;
    
    blockStart('Classes');
    const classParser = new ClassParser();
    exportSuccess = await classParser.run(allSpells, dataPath) && exportSuccess;
    
    blockStart('Weapons');
    const weaponParser = new WeaponParser();
    exportSuccess = await weaponParser.run(dataPath) && exportSuccess;
    
    blockStart('Journals');
    const journalParser = new JournalParser();
    exportSuccess = await journalParser.run(
        allSpells,
        [
            './rules/',
            './classes/',
            './monsters/',
            './spells/'
        ],
        'rules', dataPath) && exportSuccess;
    exportSuccess = await journalParser.run(
        allSpells,
        [
            './setting/'
        ],
        'journals', dataPath) && exportSuccess;
    
    const coloredWall = passed ? chalk.green(thickWall) : chalk.yellow(thickWall);
    const message = passed
        ? chalk.green('PROCESSING COMPLETE')
        : chalk.yellow('PROCESSING COMPLETE WITH TEST ERRORS');
    console.log(`\n${coloredWall}\n${chalk.bold(message)} at ${chalk.gray((new Date()).toString())}\n${coloredWall}`);

    if (passed && exportSuccess) {
        boolWithFuse('Would you like to run Foundry? (y/n)', 'y',
            async () => {
                console.log('Starting Foundry...');
                const path = (await exec('fvtt configure get installPath')).stdout.split('\n')[0];
                const cmd = `${path}/Foundry Virtual Tabletop.exe`;
                console.log('Executing ' + cmd);
                spawn(cmd, ['&'], { detached: true }).unref();
                console.log('OMM Parser will exit on its own shortly...');
                setTimeout(() => process.exit(), 10000);
            },
            undefined,
            'n', 10000);
    }
};

Parser.getFoundryPID()
    .then(pid => {
        if (pid > -1) {
            boolWithFuse('Foundry is running. Would you like to stop it? (y/n)', 'y',
                async () => {
                    console.log(chalk.red('Terminating FoundryVTT...'));
                    const { stdout, stderr } = await exec(`taskkill /pid ${pid} /f`);
                    console.log(stdout);
                    if (stderr.length > 0) throw new Error(stderr);
                    setTimeout(main, 1000);
                },
                main,
                'n', 10000);
        } else {
            main();
        }
    });