const OwlMarbleParser = require('./parser.js');
const test = require('./tests.js');
const wall = '======================================';

console.log('Starting...');
const parser = new OwlMarbleParser();
const { omm, srd } = parser.run();
console.log(wall + '\nRunning Tests...');
test(omm, srd);
console.log(wall + '\nDone.');