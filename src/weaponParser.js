const fs = require('fs');
const Parser = require('./parser');
const chalk = require('chalk');

class MasteryPrereq {
    /**
     * Constructor
     * @param {string} text 
     */
    constructor(text) {
        this.text;
        this.everApproved = false;
        this.alwaysApproved = true;
        this.isNegative = text.startsWith('Not ');
        if (this.isNegative) {
            text = text.substring('Not '.length);
        }
        this.isDamage = false;
        this.damageType = '';
        this.isProperty = false;
        this.property = '';
        this.allPropertiesBanned = false;
        this.requiresMelee = false;
        if (text.includes('Damage')) {
            this.isDamage = true;
            this.damageType = text.split(' ')[0].toLowerCase();
        } else if (text.includes('Property')) {
            this.isProperty = true;
            this.property = text.split(' ')[0];
        } else if (text === 'No Properties') {
            this.allPropertiesBanned = true;
        } else if (text === 'Melee Weapon') {
            this.requiresMelee = true;
        } else {
            throw new Error(chalk.red('Unrecognized Mastery Prereq: ' + text));
        }
    }

    /**
     * Checks if there is a match.
     * @param {string} damageType 
     * @param {[string]} properties 
     * @returns 
     */
    match(damageType, properties) {
        let value = false;
        if (this.isDamage) {
            value = damageType.includes(this.damageType);
        } else if (this.isProperty) {
            value = properties.some(p => p.startsWith(this.property));
        } else if (this.allPropertiesBanned) {
            value = properties[0] === '-';
        } else if (this.requiresMelee) {
            value = !properties.includes('Ammunition');
        } else {
            throw new Error(chalk.red(`Unable to check match ${this.text} against damage type ${damageType} and properties ${properties}`));
        }
        return this.isNegative ? !value : value;
    }
}

class Mastery {
    /**
     * Creates a Mastery
     * @param {[string]} lines 
     */
    constructor(lines) {
        this.usingWeapons = 0;
        this.name = lines[0].substring(0, lines[0].indexOf('[') - 1);
        this.text = lines.join('\n');
        const result = this.text.match(/_Prerequisite: (?<prereqs>.+)_/);
        if (!result?.groups.prereqs) {
            throw new Error(chalk.red(`Invalid Mastery ${this.name}\n${lines.join('\n')}`));
        }
        if (result.groups.prereqs === 'None') {
            this.prereqs = [];
            return;
        }
        const prereqText = result.groups.prereqs;
        this.isOr = prereqText.includes(' or ');
        const prereqTerms = prereqText.split(/, and |, or | and | or |, /);
        this.prereqs = prereqTerms.map(p => {
            const truncated = p.replaceAll('and ', '').replaceAll('or ', '');
            try {
                return new MasteryPrereq(truncated);
            } catch (e) {
                console.error(chalk.red('Error inside mastery ' + this.name));
                throw e;
            }
        });
    }

    /**
     * Checks if there is a match.
     * @param {string} damageType 
     * @param {[string]} properties 
     * @returns 
     */
    match(damageType, properties) {
        if (this.prereqs.length === 0) {
            this.usingWeapons++;
            return true;
        }
        const result = this.isOr 
            ? this.prereqs.some(prereq => prereq.match(damageType, properties))
            : this.prereqs.every(prereq => prereq.match(damageType, properties));
        if (result) {
            this.usingWeapons++;
        }
        return result;
    }
}

/**
 * Sets up a feat parser for OwlMarble Magic.
 * @class
 */
module.exports = class WeaponParser extends Parser {
    /**
     * Parses out the range from the property list by looking for Ammunition, Thrown, Reach, and Extended Reach properties.
     * @param {string} propStr 
     * @returns 
     */
    getRange (propStr) {
        const result = /(?:Ammunition|Thrown) \((?<short>\d+)\/(?<long>\d+)\)/.exec(propStr);
        let value = result?.groups.short;
        let long = result?.groups.long || null;
        if (!value) {
            value = 5;
            value = propStr.includes('Reach') ? 10 : value;
            value = propStr.includes('Extended Reach') ? 15 : value;
        }
        return {
            value,
            long,
            units: 'ft'
        };
    }

    /**
     * Gets the object of boolean properties.
     * @param {string} propStr 
     * @returns 
     */
    getProperties (propStr) {
        const properties = propStr.split('<h4>');

        return {
            ada: !!properties.find((p) => p.startsWith('Adamantine')),
            amm: !!properties.find((p) => p.startsWith('Ammunition')),
            fin: !!properties.find((p) => p.startsWith('Finesse')),
            fir: !!properties.find((p) => p.startsWith('Firearm')),
            foc: !!properties.find((p) => p.startsWith('Focus')),
            hvy: !!properties.find((p) => p.startsWith('Heavy')),
            lgt: !!properties.find((p) => p.startsWith('Light')),
            lod: !!properties.find((p) => p.startsWith('Loading')),
            mgc: !!properties.find((p) => p.startsWith('Magical')),
            rch: !!properties.find((p) => p.startsWith('Reach')),
            rel: !!properties.find((p) => p.startsWith('Reload')),
            ret: !!properties.find((p) => p.startsWith('Returning')),
            sil: !!properties.find((p) => p.startsWith('Silvered')),
            spc: propStr.includes('<strong>Special</strong>:'),
            thr: !!properties.find((p) => p.startsWith('Thrown')),
            two: !!properties.find((p) => p.startsWith('Two-Handed')),
            ver: !!properties.find((p) => p.startsWith('Versatile'))
        };
    }

    /**
     * Get the path to the weapon
     * @param {} weaponName 
     * @returns 
     */
    getWeaponImage(weaponName) {
        // This is ugly, but the file names are all over the place, and not even in the same folder.
        switch (weaponName) {
            // Improvised
            case 'Improvised Weapon': return 'modules/taring-kyburn/icons/items/inventory/stake.jpg';
            case 'Unarmed Strike': return 'modules/taring-kyburn/icons/items/equipment/Gloves/Gloves_01.png';
            // Simple Melee
            case 'Club': return 'icons/weapons/clubs/club-baton-blue.webp';
            case 'Dagger': return 'icons/weapons/daggers/dagger-jeweled-purple.webp';
            case 'Greatclub': return 'icons/weapons/clubs/club-heavy-barbed-black.webp';
            case 'Handaxe': return 'icons/weapons/axes/axe-broad-engraved.webp';
            case 'Javelin': return 'icons/weapons/polearms/javelin.webp';
            case 'Light Hammer': return 'icons/weapons/hammers/shorthammer-claw.webp';
            case 'Mace': return 'icons/weapons/maces/mace-flanged-steel.webp';
            case 'Quarterstaff': return 'icons/weapons/staves/staff-simple.webp';
            case 'Sickle': return 'icons/weapons/sickles/sickle-curved.webp';
            case 'Spear': return 'icons/weapons/polearms/spear-flared-blue.webp';
            // Martial Melee
            case 'Battleaxe': return 'icons/weapons/axes/axe-double-simple-brown.webp';
            case 'Billhook': return 'icons/weapons/polearms/spear-hooked-spike.webp';
            case 'Claws': return 'icons/weapons/fist/claw-leather-black.webp';
            case 'Flail': return 'icons/weapons/maces/flail-ball-grey.webp';
            case 'Glaive': return 'modules/taring-kyburn/icons/items/weapons/spears/Spear_16.png';
            case 'Greataxe': return 'icons/weapons/axes/axe-broad-grey.webp';
            case 'Greatsword': return 'icons/weapons/swords/greatsword-crossguard-silver.webp';
            case 'Halberd': return 'modules/taring-kyburn/icons/items/weapons/spears/Spear_v2_02.png';
            case 'Hook Sword (Separate)': return 'modules/taring-kyburn/icons/magic%20items/Hook%20Sword.jpg';
            case 'Hook Swords (Linked)': return 'modules/taring-kyburn/icons/magic%20items/Hook%20Swords.webp';
            case 'Lance': return 'modules/taring-kyburn/icons/items/weapons/spears/Spear_27.png';
            case 'Longsword': return 'icons/weapons/swords/greatsword-crossguard-steel.webp';
            case 'Man Catcher': return 'modules/taring-kyburn/icons/items/weapons/man-catcher.webp';
            case 'Maul': return 'icons/weapons/maces/mace-round-studded.webp';
            case 'Morningstar': return 'icons/weapons/maces/mace-round-spiked-black.webp';
            case 'Pike': return 'icons/weapons/polearms/pike-flared-brown.webp';
            case 'Rapier': return 'modules/taring-kyburn/icons/items/weapons/swords/Sword_v2_36.png';
            case 'Scimitar': return 'modules/taring-kyburn/icons/items/weapons/swords/Sword_47%20(2).png';
            case 'Shortsword': return 'icons/weapons/swords/sword-guard-bronze.webp';
            case 'Spearsword': return 'modules/taring-kyburn/icons/items/weapons/spears/Spear_14.png';
            case 'Studded Gauntlets': return 'icons/equipment/hand/gauntlet-armored-leather-brown.webp';
            case 'Trident': return 'icons/weapons/polearms/trident-silver-blue.webp';
            case 'War Pick': return 'icons/weapons/hammers/hammer-war-spiked.webp';
            case 'Warhammer': return 'icons/weapons/hammers/hammer-war-rounding.webp';
            case 'Voulge': return 'modules/taring-kyburn/icons/items/weapons/spears/Spear_v2_09.png';
            case 'War Scythe': return 'modules/taring-kyburn/icons/items/weapons/spears/War%20Scythe.png';
            // Simple Ranged
            case 'Light Crossbow': return 'icons/weapons/crossbows/crossbow-slotted.webp';
            case 'Shortbow': return 'icons/weapons/bows/shortbow-recurve.webp';
            case 'Sling': return 'modules/taring-kyburn/icons/items/inventory/textiles/Tailoring_52_bandages.png';
            case 'Blowgun': return 'modules/taring-kyburn/icons/items/weapons/staff.png';
            // Martial Ranged
            case 'Hand Crossbow': return 'icons/weapons/crossbows/crossbow-simple-red.webp';
            case 'Heavy Crossbow': return 'icons/weapons/crossbows/crossbow-blue.webp';
            case 'Longbow': return 'modules/taring-kyburn/icons/items/weapons/bows/Bow_08.png';
            case 'Warbow': return 'modules/taring-kyburn/icons/items/weapons/bows/Bow_12.png';
            case 'Net': return 'icons/tools/fishing/net-simple-tan.webp';
            case 'Whip': return 'icons/weapons/misc/whip-red-yellow.webp';
            case 'Dart': return 'modules/taring-kyburn/icons/items/weapons/ammo/dart.png';
            case 'Musket': return 'modules/taring-kyburn/icons/items/weapons/guns/Gun_v2_13.png';
            case 'Pistol': return 'modules/taring-kyburn/icons/items/weapons/guns/Gun_v2_01.png';
            case 'Flintlock Pistol': return 'modules/taring-kyburn/icons/items/weapons/guns/Gun_v2_01.png';
            // Unhandled Error
            default: throw new Error('No image set for "' + weaponName + '". Please set one in the giant switch-case block above.');
        }
    }

    /**
     * Generates the description string for the weapon based on its properties.
     * @param {string} name - The name of the weapon
     * @param {string} damageStr - The damage string
     * @param {string} propStr - The property string to parse
     * @param {{*}} propDict - The dictionary of properties
     * @param {string} altStr - The Alternatives list 
     * @param {[Mastery]} masteries - The list of masteries
     * @param {string} mastery - The mastery property
     * @param {{}} range - The range object
     * @returns 
     */
    getDescription (name, damageStr, propStr, propDict, altStr, masteries, mastery, range) {
        const groups = propStr.replaceAll('_', '').split('<br/>');
        const properties = groups[0].split(', ');
        const isSpecial = groups.length > 1;
        
        const propRegex = /(?<prop>Adamantine|Ammunition|Couched|Dismounting|Extended Reach|Finesse|Firearm|Focus|Handy|Heavy|Inner Range|Light|Loading|Magical|Parrying|Reach|Reload|Returning|silvered|Special|Thrown|Two-Handed|Versatile|Vigorous)( \((?<short>\d+)\/(?<long>\d+)\))?/;
        const lines = properties.map((p) => {
            const propName = propRegex.exec(p)?.groups.prop.trim();
            if (propName && propName !== 'Special') {
                if (!propDict[propName]) {
                    throw new Error('Prop "' + propName + '" was not found in "Weapon Properties.md"');
                }
                const propertyContent = propDict[propName].content;
                return `${this.tagify('h4', this.boldify(p))}${propertyContent}`;
            }
            return '';
        });
        if (isSpecial) {
            lines.splice(0, 0, this.paragraphify(this.boldify(groups[1])));
        }
        
        const isRanged = !!range.long;
        const rangeStr = isRanged ? `${range.value}/${range.long}` : range.value;
        const startingLine = this.paragraphify(
            `<em><b>${isRanged ? 'Ranged' : 'Melee'} Weapon Attack.</b></em> `
            + `<em>${isRanged ? 'Range' : 'Reach'}</em>: ${rangeStr} feet. `
            + `<em>Hit:</em> ${damageStr}.`
        );

        lines.splice(0, 0, startingLine);
        if (altStr) {
            lines.push('<br/>' + this.tagify('blockquote', '<b>Alternatives</b>: ' + altStr));
        }
        if (mastery) {
            const defaultMasteries = mastery.split(/, | \(|\)/);
            const compatible = masteries.filter(m => m.match(damageStr, properties) && !defaultMasteries.includes(m.name));
            const compatibleStr = compatible.length > 1
                ? ` and also supports the ${compatible.map(m => m.name).join(', ')} masteries.`
                : '';
            const masteryStr = `A ${name.toLowerCase()} possesses the ${mastery} mastery${compatibleStr}`;
            lines.push('<br/>' + this.tagify('em', masteryStr));
        }
        return lines.join('');
    }

    /**
     * Executes the parsing of the feats.
     * @param {[{}]} spells 
     * @returns 
     */
    async run () {
        // Parse Weapon Properties
        const propPath = './rules/items/Weapon Properties.md';
        const propText = fs.readFileSync(propPath, { encoding: 'utf-8', flag: 'r'});
        const propertiesRaw = propText.split('##');
        const properties = propertiesRaw.map((p) => {
            const lines = p.split('\r\n');
            const titleLine = lines[0];
            let propName = titleLine;
            if (titleLine.includes('[')) {
                const titleMatch = titleLine.match(/(.+)( \[(.*)\])/);
                if (!titleMatch) {
                    throw new Error('Unrecognized title format: ' + titleLine);
                }
                propName = titleMatch[1];
            }
            propName = propName.trim();

            const contentLines = lines.filter((line, i) => line && i > 0).map((line, i) => {
                return this.paragraphify(this.linkify(
                    this.boldify(this.italilink(line, propName, i, {})),
                    propPath));
            });
            const id = this.generateUUID(`${propName} (OwlMarble Magic - Properties)`);
            return {
                _id: id,
                _key: '!journal!' + id,
                name: propName,
                permission: {
                    default: 2
                },
                folder: '',
                flags: {
                    'owlmarble-magic': {
                        exportTime: (new Date()).toString()
                    }
                },
                content: contentLines
            };
        });
        console.log('Parsed ' + properties.length + ' properties');
        const propDict = properties.reduce((acc, p) => {
            acc[p.name] = p;
            return acc;
        }, {});

        // Parse Weapon Masteries
        const masterPath = './rules/items/Weapon Masteries.md';
        const masterText = fs.readFileSync(masterPath, { encoding: 'utf-8', flag: 'r'});
        const masterRaw = masterText.split('##').filter(m => !m.startsWith('# '));
        const masteries = masterRaw.map((mastery) => {
            const lines = mastery.split('\r\n').filter(p => p).map(p => p.trim()).filter(p => p);
            return new Mastery(lines);
        });
        console.log('Parsed ' + masterRaw.length + ' masteries');


        // Parse Weapons
        const weaponText = fs.readFileSync('./rules/items/Weapons.md', { encoding: 'utf-8', flag: 'r'});
        const categoriesLines = weaponText.split('###');
        let weapons = categoriesLines.reduce((acc, cat) => {
            const lines = cat.split('\r\n');
            const type = lines[0];
            const weaponSubset = lines
                .filter((p, i) => p && i > 3 && p.startsWith('|') && !p.startsWith('| **Name**') && !p.startsWith('|:-'))
                .map((weaponLine) => {
                    const terms = weaponLine.split('|').map((w) => w.trim());
                    const name = /\*\*(?<name>.*?)\*\*/.exec(terms[1]).groups.name;
                    const price = parseFloat(terms[2]) || 0;
                    const weight = parseFloat(terms[3]) || 0;
                    const damageStr = terms[4];
                    const damage = this.getDamage(' ' + damageStr + ' ');// The parser is designed for the middle of text blocks, so wrap it.
                    const propStr = terms[5];
                    const altStr = terms[6] === '-' ? '' : terms[6];
                    const mastery = terms[7] === '-' ? '' : terms[7];
                    if (damage.parts.length > 0) {
                        damage.parts[0][0] = damage.parts[0][0] + ' + @mod';// Always add the mod.
                    }
                    damage.versatile = /Versatile \((?<versatileDamage>.*)\)/.exec(propStr)?.groups.versatileDamage || '';

                    const range = this.getRange(propStr);
                    const description = this.getDescription(name, damageStr, propStr, propDict, altStr, masteries, mastery, range);
                    const properties = this.getProperties(description);

                    let actionType = type.includes('Melee') ? 'mwak' : 'rwak';
                    let weaponType = (type.includes('Simple') ? 'simple' : 'martial')
                        + (type.includes('Melee') ? 'M' : 'R');

                    const id = this.generateUUID(`${name} (OwlMarble Magic - Weapons)`);
                    return {
                        _id: id,
                        _key: '!items!' + id,
                        name: name,
                        type: 'weapon',
                        img: this.getWeaponImage(name),
                        data: {
                            description: {
                                value: description,
                                chat: '',
                                unidentified: ''
                            },
                            source: 'OMM',
                            quantity: 1,
                            weight,
                            price,
                            attunement: 0,
                            equipped: false,
                            rarity: 'common',
                            identified: true,
                            activation: {
                                type: 'action',
                                cost: 1,
                                condition: ''
                            },
                            duration: {
                                value: 0,
                                units: ''
                            },
                            target: {
                                value: 0,
                                width: null,
                                units: '',
                                type: ''
                            },
                            range,
                            uses: {
                                value: null,
                                max: '',
                                per: ''
                            },
                            consume: {
                                type: '',
                                target: '',
                                amount: null
                            },
                            ability: '',
                            actionType,
                            attackBonus: '0',
                            chatFlavor: '',
                            critical: {
                                threshold: null,
                                damage: ''
                            },
                            damage,
                            formula: '',
                            save: {
                                ability: '',
                                dc: null,
                                scaling: 'spell'
                            },
                            armor: {
                                value: 0
                            },
                            hp: {
                                value: 0,
                                max: 0,
                                dt: null,
                                conditions: ''
                            },
                            weaponType,
                            baseItem: name,
                            properties,
                            proficient: true,
                            cptooltipmode: [
                                'hid',
                                'hid'
                            ]
                        },
                        effects: [],
                        flags: {
                            'owlmarble-magic': {
                                exportTime: (new Date()).toString()
                            }
                        }
                    };
                });

            acc = acc.concat(weaponSubset);
            return acc;
        }, []);
        console.log('Parsed ' + weapons.length + ' weapons');
        masteries.filter(m => !m.usingWeapons).forEach((m) => {
            console.error(chalk.yellow('- Warning: mastery ' + m.name + ' is never used!'));
        });

        weapons = this.synchronizeDates(this.getDbDict('packs/weapons.db'), weapons);

        this.printDb(weapons, [
            'packs/weapons.db',
            'output/all/weapons.db',
            'output/owlmagic-only/weapons.db',
            'output/owlmagic-srd/weapons.db',
            'E:/Foundry VTT/Data/modules/owlmarble-magic/packs/weapons.db',
        ]);
        return await this.exportDb(weapons, 'weapons');
    }
};