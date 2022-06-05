const SpellParser = require('./src/spellParser.js');
const test = require('./tests/tests.js');
const FeatParser = require('./feats/featParser.js');
const ClassParser = require('./classes/classParser.js');
const RuleParser = require('./rules/ruleParser.js');
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

console.log(wall + '\n\n' + wall + '\nParsing Classes...');
const classParser = new ClassParser();
classParser.run(omm);
console.log(wall + '\nClass Parsing Done.');

console.log(wall + '\n\n' + wall + '\nParsing Rules...');
const ruleParser = new RuleParser();
ruleParser.run(omm);
console.log(wall + '\nRule Parsing Done.');
