const chalk = require('chalk');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const spawn = require('child_process').spawn;
const readline = require('node:readline');
const SpellParser = require('./src/spellParser.js');
const test = require('./tests/tests.js');
const FeatParser = require('./src/featParser.js');
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

const main = async () => {
    console.log(thickWall + '\n' + chalk.bold(chalk.green('BEGIN PROCESSING')));
    
    blockStart('Spells');
    const spellParser = new SpellParser();
    const result = await spellParser.run();
    const allSpells = result.omm;
    const srdSpells = result.srd;
    let exportSuccess = result.exportSuccess;
    console.log(thinWall + '\nRunning Tests...');
    const passed = test(allSpells, srdSpells);
    console.log(thinWall + '\nTests Done.');
    
    blockStart('Feats');
    const featParser = new FeatParser();
    exportSuccess = await featParser.run(allSpells) && exportSuccess;
    
    blockStart('Classes');
    const classParser = new ClassParser();
    exportSuccess = await classParser.run(allSpells) && exportSuccess;
    
    blockStart('Weapons');
    const weaponParser = new WeaponParser();
    exportSuccess = await weaponParser.run() && exportSuccess;
    
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
        'rules') && exportSuccess;
    exportSuccess = await journalParser.run(
        allSpells,
        [
            './setting/'
        ],
        'journals') && exportSuccess;
    
    const coloredWall = passed ? chalk.green(thickWall) : chalk.yellow(thickWall);
    const message = passed
        ? chalk.green('PROCESSING COMPLETE')
        : chalk.yellow('PROCESSING COMPLETE WITH TEST ERRORS');
    console.log(`\n${coloredWall}\n${chalk.bold(message)} at ${chalk.gray((new Date()).toString())}\n${coloredWall}`);

    if (passed && exportSuccess) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('Would you like to run Foundry? (y/n)', async (response) => {
            rl.close();
            if (response.toLowerCase() === 'y' || response.toLowerCase() === 'yes') {
                console.log('Starting Foundry...');
                const path = (await exec('fvtt configure get installPath')).stdout.split('\n')[0];
                const cmd = `${path}/Foundry Virtual Tabletop.exe`;
                console.log('Executing ' + cmd);
                spawn(cmd, ['&'], { detached: true }).unref();
            }
        });
    }
};

main();