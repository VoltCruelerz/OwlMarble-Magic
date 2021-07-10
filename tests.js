const assert = require('assert/strict');
const fs = require('fs');

// Animate Objects (table formatting)


// Booming Blade (damage, scaling)

// Fire Bolt (damage, scaling)

// Cone of Cold (AoE, damage, scaling)

// Cure Wounds (healing, scaling)

// Fireball (AoE, damage, scaling, components)

// Find Familiar (ritual, cast time)

// Magic Missile (damage, scaling)

// Shocking Grasp (msak)

//


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
                const message = `\n- SPELL: ${ommSpell.name}\n- FIELD: ${field}\n\n- OMM ================\n${JSON.stringify(ommSpell)}\n\n- SRD ================\n${JSON.stringify(srdSpell)}`;
                assert.deepStrictEqual(JSON.stringify(srdData[field]).toLowerCase(), JSON.stringify(ommData[field]).toLowerCase(), message);
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
    if (errorReport.length > 0) {
        lines.push(`${wall}\nERROR REPORT - ${totalErrors} ERRORS ACROSS ${errorReport.length}/${srd.length} SPELLS\n${wall}`);
        errorReport.forEach((line) => {
            lines.push(`- ${line.spell}: ${line.errors.length}/${verbatimFields.length}`);
            line.errors.forEach((error, i) => {
                const pipe = i < line.errors.length - 1 ? '|' : ' ';
                lines.push(`L - [${i}/${line.errors.length}] - ${error.field}`);
                lines.push(pipe + ' L - SRD: ' + JSON.stringify(error.expected));
                lines.push(pipe + ' L - OMM: ' + JSON.stringify(error.actual));
            });
            console.log('');
        });
    }

    const content = lines.join('\r\n');
    fs.writeFileSync('test.log', content);
    console.log(content);
};