const SpellParser = require('./src/spellParser.js');
const test = require('./tests/tests.js');
const FeatParser = require('./src/featParser.js');
const ClassParser = require('./src/classParser.js');
const WeaponParser = require('./src/weaponParser.js');
const JournalParser = require('./src/journalParser.js');
const chalk = require('chalk');
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
    const { omm, srd } = await spellParser.run();
    console.log(thinWall + '\nRunning Tests...');
    const passed = test(omm, srd);
    console.log(thinWall + '\nTests Done.');
    
    blockStart('Feats');
    const featParser = new FeatParser();
    await featParser.run(omm);
    
    blockStart('Classes');
    const classParser = new ClassParser();
    await classParser.run(omm);
    
    blockStart('Weapons');
    const weaponParser = new WeaponParser();
    await weaponParser.run();
    
    blockStart('Journals');
    const journalParser = new JournalParser();
    await journalParser.run(
        omm,
        [
            './rules/',
            './classes/',
            './monsters/',
            './spells/'
        ],
        'rules');
    await journalParser.run(
        omm,
        [
            './setting/'
        ],
        'journals');
    
    const message = passed
        ? chalk.green('PROCESSING COMPLETE')
        : chalk.yellow('PROCESSING COMPLETE WITH TEST ERRORS');
    console.log(`\n${thickWall}\n${chalk.bold(message)} at ${chalk.gray((new Date()).toString())}\n${thickWall}`);
};

main();