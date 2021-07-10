const assert = require('assert/strict');
const fs = require('fs');

/**
 * Handles a field.
 * @param {{*}} expected
 * @param {{*}} expected
 */
const defaultHandler = (expected, actual) => {
    assert.deepStrictEqual(
        JSON.stringify(expected).toLowerCase(),
        JSON.stringify(actual).toLowerCase());
};

/**
 * Handles target field.
 * @param {{value: number, units: string, type: object }} expected
 * @param {{value: number, units: string, type: object }} actual
 */
 const targetHandler = (expected, actual) => {
    const unitEquivalency = {};
    unitEquivalency[''] = '';
    unitEquivalency['spec'] = '';

    if (expected.value !== actual.value) {
        defaultHandler(expected, actual);
    } else if (expected.type !== actual.type) {
        defaultHandler(expected, actual);
    } else if (unitEquivalency[expected.units] !== unitEquivalency[actual.units]) {
        defaultHandler(expected, actual);
    }
};

/**
 * Run tests.
 * @param {[{*}]} omm
 * @param {[{*}]} srd
 */
module.exports = (omm, srd) => {
    const wall = '===================================================';
    console.log('OMM Size: ' + omm.length);
    console.log('SRD Size: ' + srd.length);

    const srdLookup = srd.reduce((acc, spell) => {
        acc[spell.name] = spell;
        return acc;
    }, {});
    
    const spellErrors = {};
    const verbatimFields = [
        'activation',
        'duration',
        'target',
        'range',
        'uses',
        'actionType',
        'damage',
        'save',
        'components',
        'materials',
        'scaling'
    ];

    console.log('Checking SRD Verbatim Fields...');
    let totalErrors = 0;
    omm.forEach((ommSpell) => {
        const srdSpell = srdLookup[ommSpell.name] || srdLookup[ommSpell.oldName];
        if (!srdSpell) {
            return;
        }
        const srdData = srdSpell.data;
        const ommData = ommSpell.data;

        verbatimFields.forEach((field) => {
            try {
                const expected = srdData[field];
                const actual = ommData[field];
                if (field === 'target') {
                    targetHandler(expected, actual);
                } else {
                    defaultHandler(expected, actual);
                }
            } catch (e) {
                totalErrors++;
                const error = {
                    field: field,
                    actual: ommData[field],
                    expected: srdData[field]
                };
                if (spellErrors[ommSpell.name]) {
                    spellErrors[ommSpell.name].push(error);
                } else {
                    spellErrors[ommSpell.name] = [error];
                }
            }
        });
    });

    const errorReport = Object.keys(spellErrors).reduce((arr, spellName) => {
        arr.push({
            spell: spellName,
            errors: spellErrors[spellName]
        });
        return arr;
    }, []);
    errorReport.sort((a,b) => (a.errors.length <= b.errors.length) ? 1 : -1 );

    const lines = [];
    const header = `${wall}\nERROR REPORT - ${totalErrors} ERRORS ACROSS ${errorReport.length}/${srd.length} SPELLS\n${wall}`;
    console.log(header);
    if (errorReport.length > 0) {
        lines.push(header);
        errorReport.forEach((line) => {
            lines.push(`${wall}\n- ${line.spell}: ${line.errors.length}/${verbatimFields.length}\n${wall}`);
            line.errors.forEach((error, i) => {
                const pipe = i < line.errors.length - 1 ? '|' : ' ';
                lines.push(`L - [${i}/${line.errors.length}] - ${error.field}`);
                lines.push(pipe + ' L - SRD: ' + JSON.stringify(error.expected));
                lines.push(pipe + ' L - OMM: ' + JSON.stringify(error.actual));
            });
            lines.push('');
        });
    }

    const content = lines.join('\n');
    fs.writeFileSync('test.log', content);
};