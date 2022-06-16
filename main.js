const SpellParser = require('./src/spellParser.js');
const test = require('./tests/tests.js');
const FeatParser = require('./src/featParser.js');
const ClassParser = require('./src/classParser.js');
const WeaponParser = require('./src/weaponParser.js');
const JournalParser = require('./src/journalParser.js');
const thickWall = '======================================';
const thinWall = '--------------------------------------';

const blockStart = (name) => {
    console.log(`\n${thickWall}\nParsing ${name}...\n${thinWall}`);
};

const blockStop = (name) => {
    console.log(`${thinWall}\n${name} Parsing Done.\n${thickWall}`);
};

console.log(thickWall + '\n' + thickWall + '\nBEGIN PROCESSING');

blockStart('Spells');
const spellParser = new SpellParser();
const { omm, srd } = spellParser.run();
console.log(thinWall + '\nRunning Tests...');
test(omm, srd);
console.log(thinWall + '\nTests Done.');
blockStop('Spell');

blockStart('Feats');
const featParser = new FeatParser();
featParser.run(omm);
blockStop('Feat');

blockStart('Classes');
const classParser = new ClassParser();
classParser.run(omm);
blockStop('Class');

blockStart('Weapons');
const weaponParser = new WeaponParser();
weaponParser.run();
blockStop('Weapons');

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
blockStop('Journal');

console.log('\n' + thickWall + '\nPROCESSING COMPLETE AT: ' + (new Date()).toString() + '\n' + thickWall);