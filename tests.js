const assert = require('assert/strict');
const fs = require('fs');

//#region Handlers
/**
 * Provides a lookup for equivalency tables
 * @param {{*}} lookup 
 * @param {*} val 
 */
const getEquivalency = (lookup, val) => {
    if (lookup[val] !== undefined) {
        return lookup[val];
    }
    return val;
};

/**
 * Checks if two values are the same, accounting for equivalency.
 * @param {{*}} lookup 
 * @param {*} a 
 * @param {*} b 
 * @returns {boolean}
 */
const isEquivalent = (lookup, a, b) => {
    if (a === undefined) {
        a = 'undefined';
    }
    if (b === undefined) {
        b = 'undefined';
    }
    return getEquivalency(lookup, a) === getEquivalency(lookup, b);
};

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
    unitEquivalency[null] = '';

    if (expected.value !== actual.value) {
        defaultHandler(expected, actual);
    } else if (expected.type !== actual.type) {
        defaultHandler(expected, actual);
    } else if (getEquivalency(unitEquivalency, expected.units) !== getEquivalency(unitEquivalency, actual.units)) {
        defaultHandler(expected, actual);
    }
};

/**
 * Handles actionType field.
 * @param {string} expected
 * @param {string} actual
 */
const actionTypeHandler = (expected, actual) => {
    const actionEquivalency = {};
    actionEquivalency['util'] = 'other';

    if (getEquivalency(actionEquivalency, expected) !== getEquivalency(actionEquivalency, actual)) {
        defaultHandler(expected, actual);
    }
};

/**
 * Handles materials field.
 * @param {{value: string, consumed: boolean, cost: number, supply: number }} expected
 * @param {{value: string, consumed: boolean, cost: number, supply: number }} actual
 */
const materialsHandler = (expected, actual) => {
    const flavorExpected = expected.value.endsWith('.')
        ? expected.value.substring(0, expected.value.length - 1)
        : expected.value;
    const flavorActual = actual.value.endsWith('.')
        ? actual.value.substring(0, actual.value.length - 1)
        : actual.value;
    

    if (flavorExpected.replaceAll(' ', '').toLowerCase() !== flavorActual.replaceAll(' ', '').toLowerCase()) {
        defaultHandler(expected, actual);
    } else if (expected.consumed !== actual.consumed) {
        defaultHandler(expected, actual);
    } else if (expected.cost !== actual.cost) {
        defaultHandler(expected, actual);
    } else if (expected.supply !== actual.supply) {
        defaultHandler(expected, actual);
    }
};

/**
 * Handles range field.
 * @param {{value: number, long: number, units: string }} expected
 * @param {{value: number, long: number, units: string }} actual
 */
const rangeHandler = (expected, actual) => {
    const nullEquiv = {};
    nullEquiv[null] = 0;

    if (isEquivalent(nullEquiv, expected.long, actual.long)) {
        return;
    }
    defaultHandler(expected, actual);
};

/**
 * Handler for the damage field.
 * @param {{parts:[[string]], versatile: string, value: string}} expected 
 * @param {{parts:[[string]], versatile: string, value: string}} actual 
 */
const damageHandler = (expected, actual) => {
    const valueEquiv = {};
    valueEquiv['undefined'] = '';

    if (JSON.stringify(expected.parts) !== JSON.stringify(actual.parts)) {
        defaultHandler(expected, actual);
    } else if (expected.versatile !== actual.versatile) {
        defaultHandler(expected, actual);
    } else if (!isEquivalent(valueEquiv, expected.value, actual.value)) {
        defaultHandler(expected, actual);
    }
};
//#endregion

const approvedSpells = [
    'Druidcraft',
    'Prestidigitation',
    'Goodberry',
    'Sleep',
    'Resistance'
].reduce((acc, val) => {
    acc[val] = true;
    return acc;
}, {});

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
        if (!srdSpell || approvedSpells[ommSpell.name]) {
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
                } else if (field === 'actionType') {
                    actionTypeHandler(expected, actual);
                } else if (field === 'range') {
                    rangeHandler(expected, actual);
                } else if (field === 'materials') {
                    materialsHandler(expected, actual);
                } else if (field === 'damage') {
                    damageHandler(expected, actual);
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