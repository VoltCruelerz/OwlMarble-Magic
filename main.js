const SpellParser = require('./src/parser.js');
const test = require('./tests/tests.js');
const FeatParser = require('./feats/parser.js');
const wall = '======================================';

console.log('Starting Spell Parser...');
const spellParser = new SpellParser();
const { omm, srd } = spellParser.run();
console.log(wall + '\nRunning Tests...');
test(omm, srd);
console.log(wall + '\nTests Done.');

console.log(wall + '\n\n' + wall + '\nParsing Feats...');
const featParser = new FeatParser();
featParser.run(omm);
console.log(wall + '\nFeat Parsing Done.');
