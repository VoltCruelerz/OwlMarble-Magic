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
    let flavorExpected = expected.value.endsWith('.')
        ? expected.value.substring(0, expected.value.length - 1)
        : expected.value;
    flavorExpected = flavorExpected.replaceAll(' ', '').replace(',', '').toLowerCase();
    let flavorActual = actual.value.endsWith('.')
        ? actual.value.substring(0, actual.value.length - 1)
        : actual.value;
    flavorActual = flavorActual.replaceAll(' ', '').replace(',', '').toLowerCase();
    

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

// This is the list of manually validated spells that are not meaningfully different from their SRD counterparts.
const approvedSpells = [
    'Druidcraft',
    'Prestidigitation',
    'Goodberry',
    'Sleep',
    'Resistance',
    'Revivify',
    'Heroes\' Feast',
    'Teleportation Circle',
    'Mirage Arcane',
    'Project Image',
    'Simulacrum',
    'Holy Aura',
    'Weird',
    'Dancing Lights',
    'Mage Hand',
    'Spare the Dying',
    'Thaumaturgy',
    'True Strike',
    'Identify',
    'Shield',
    'Feather Fall',
    'Unseen Servant',
    'Aid',
    'Slick',
    'Alter Self',
    'Find Steed',
    'Magic Weapon',
    'Warding Bond',
    'Beacon of Hope',
    'Bestow Curse',
    'Call Lightning',
    'Counterspell',
    'Glyph of Warding',
    'Meld into Stone',
    'Sending',
    'Animate Objects',
    'Hallow',
    'Raise Dead',
    'Tree Stride',
    'Wall of Force',
    'Forbiddance',
    'Divine Word',
    'Reverse Gravity',
    'Teleport',
    'Gate',
    'Prismatic Wall',
    'Storm of Vengeance',
    'Wish',
    'Guidance',
    'Light',
    'Mending',
    'Message',
    'Minor Figment',
    'False Life',
    'Find Familiar',
    'Heroism',
    'Protection from Evil and Good',
    'Arcane Lock',
    'Enlarge/Reduce',
    'Enthrall',
    'Flaming Sphere',
    'Heat Metal',
    'Magic Mouth',
    'Mirror Image',
    'Misty Step',
    'Rope Trick',
    'Scorching Ray',
    'See Invisibility',
    'Spike Growth',
    'Zone of Truth',
    'Clairvoyance',
    'Create Food and Water',
    'Gaseous Form',
    'Haste',
    'Magic Circle',
    'Phantom Steed',
    'Vampiric Touch',
    'Arcane Eye',
    'Banishment',
    'Compulsion',
    'Control Water',
    'Dimension Door',
    'Divination',
    'Fire Shield',
    'Giant Insect',
    'Guardian of Faith',
    'Hallucinatory Terrain',
    'Cloudkill',
    'Conjure Elemental',
    'Creation',
    'Dream',
    'Hold Monster',
    'Legend Lore',
    'Passwall',
    'Reincarnate',
    'Scrying',
    'Seeming',
    'Create Undead',
    'Disintegrate',
    'Find the Path',
    'Globe of Invulnerability',
    'Harm',
    'Magic Jar',
    'Planar Ally',
    'Sunbeam',
    'Wall of Thorns',
    'Wind Walk',
    'Word of Recall',
    'Transport via Plants',
    'Etherealness',
    'Plane Shift',
    'Regenerate',
    'Resurrection',
    'Symbol',
    'Antimagic Field',
    'Clone',
    'Astral Projection',
    'Produce Flame',
    'Poison Spray',
    'Foresight',
    'Imprisonment',
    'Power Word Kill',
    'Shapechange',
    'Time Stop',
    'True Polymorph',
    'Alarm',
    'Bless',
    'Detect Magic',
    'Disguise Self',
    'Divine Favor',
    'Expeditious Retreat',
    'Faerie Fire',
    'Fog Cloud',
    'Shillelagh',
    'Hunter\'s Mark',
    'Illusory Script',
    'Longstrider',
    'Purify Food and Drink',
    'Sanctuary',
    'Animate Dead',
    'Conjure Animals',
    'Sleet Storm',
    'Speak with Death',
    'Spirit Guardians',
    'Water Breathing',
    'Water Walk',
    'Confusion',
    'Conjure Minor Elementals',
    'Conjure Woodland Beings',
    'Locate Creature',
    'Dispel Evil and Good',
    'Animal Shapes',
    'Demiplane',
    'Glibness',
    'Maze',
    'Mass Heal',
    'True Resurrection',
    'Augury',
    'Detect Thoughts',
    'Enhance Ability',
    'Find Traps',
    'Locate Animals or Plants',
    'Locate Object',
    'Moonbeam',
    'Pass without Trace',
    'Protection from Poison',
    'Mislead',
    'Conjure Fey',
    'Guards and Wards',
    'Mass Suggestion',
    'Conjure Celestial',
    'Entangle',
    'Flame Strike',
    'Meteor Swarm',
    'Spiritual Weapon',
    'Speak with Dead',
    'Ice Storm',
    'Delayed Blast Fireball',
    'Detect Poison and Disease',
    'Bane',
    'Command',
    'Detect Evil and Good',
    'Stone Shape',
    'Wall of Ice',
    'Forcecage'
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
    errorReport.sort((a,b) => (a.errors.length <= b.errors.length) ? 1 : -1 );

    const lines = [];
    const header = `${wall}\nERROR REPORT - ${totalErrors} ERRORS ACROSS ${errorReport.length}/${srd.length} SRD SPELLS\n${wall}`;
    console.log(header);
    if (errorReport.length > 0) {
        lines.push(header);
        errorReport.forEach((line) => {
            lines.push(`${wall}\n- ${line.spell}: ${line.errors.length}/${verbatimFields.length}\n${wall}`);
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
    fs.writeFileSync('test.log', content);
};