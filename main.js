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

console.log(thickWall + '\n' + chalk.bold(chalk.green('BEGIN PROCESSING')));

blockStart('Spells');
const spellParser = new SpellParser();
const { omm, srd } = spellParser.run();
console.log(thinWall + '\nRunning Tests...');
test(omm, srd);
console.log(thinWall + '\nTests Done.');

blockStart('Feats');
const featParser = new FeatParser();
featParser.run(omm);

blockStart('Classes');
const classParser = new ClassParser();
classParser.run(omm);

blockStart('Weapons');
const weaponParser = new WeaponParser();
weaponParser.run();

blockStart('Journals');
const journalParser = new JournalParser();
journalParser.run(
    omm,
    [
        './rules/',
        './classes/',
        './monsters/',
        './spells/'
    ],
    'rules');
journalParser.run(
    omm,
    [
        './setting/'
    ],
    'journals');

console.log(`\n${thickWall}\n${chalk.bold(chalk.green('PROCESSING COMPLETE'))} at ${chalk.gray((new Date()).toString())}\n${thickWall}`);