const assert = require('assert/strict');
const fs = require('fs');
const approvedErrors = require('./approvedErrors.json');

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
    const simplify = (str) => {
        str = str.endsWith('.')
            ? str.substring(0, str.length - 1)
            : str;
        str = str
            .replaceAll(' ', '')
            .replaceAll(',', '')
            .replaceAll('’','\'')
            .toLowerCase();
        return str;
    };
    let flavorExpected = simplify(expected.value);
    let flavorActual = simplify(actual.value);
    
    if (flavorExpected !== flavorActual) {
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
 * Handles save field.
 * @param {{ability: string, dc: number, value: string, scaling: spell }} expected
 * @param {{ability: string, dc: number, value: string, scaling: spell }} expected
 */
const saveHandler = (expected, actual) => {
    const dcEqual = {};
    dcEqual[null] = 0;

    if (expected.ability !== actual.ability || !isEquivalent(dcEqual, expected.dc, actual.dc) || expected.value !== actual.value) {
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

/**
 * Run tests.
 * @param {[{*}]} omm
 * @param {[{*}]} srd
 */
module.exports = (omm, srd) => {
    const wall = '===================================================';
    const thinWall = '---------------------------------------------------';
    const tab = '    ';
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
                const expected = approvedErrors[ommSpell.name] && approvedErrors[ommSpell.name][field] 
                    ? approvedErrors[ommSpell.name][field]
                    : srdData[field];
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
                } else if (field === 'save') {
                    saveHandler(expected, actual);
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
    
    // errorReport.sort((a,b) => (a.errors.length <= b.errors.length) ? 1 : -1 );

    const lines = [];
    const header = `${wall}\nERROR REPORT - ${totalErrors} ERRORS ACROSS ${errorReport.length}/${srd.length} SRD SPELLS\n${wall}`;
    console.log(header);
    if (errorReport.length > 0) {
        lines.push(header);
        errorReport.forEach((line) => {
            lines.push(`${wall}\n- ${line.spell}: ${line.errors.length}/${verbatimFields.length}\n${thinWall}`);
            lines.push(`${tab}"${line.spell}": {`);
            line.errors.forEach((error, i) => {
                const comma = i < line.errors.length - 1
                    ? ','
                    : '';
                lines.push(`${tab + tab}"${error.field}": ${JSON.stringify(error.actual)}${comma}`);
            });
            lines.push(`${tab}}`);
            lines.push(thinWall);
            line.errors.forEach((error, i) => {
                const pipe = i < line.errors.length - 1 ? '|' : ' ';
                lines.push(`L - [${i + 1}/${line.errors.length}] - ${error.field}`);
                lines.push(pipe + ' L - SRD: ' + JSON.stringify(error.expected));
                lines.push(pipe + ' L - OMM: ' + JSON.stringify(error.actual));
            });
            lines.push('');
        });
    }

    const content = lines.join('\n');
    fs.writeFileSync('tests/test.log', content);
};