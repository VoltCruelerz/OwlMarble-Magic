const fs = require('fs');
const Parser = require('./parser');


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
        let long = result?.groups.long;
        if (!value) {
            value = 5;
            value = propStr.includes('Reach') ? 10 : null;
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
        const groups = propStr.replaceAll('_', '').split('<br/>');
        const properties = groups[0].split(', ');
        if (groups.length > 1) {
            properties.push('Special');
        }

        return {
            ada: properties.find((p) => p === 'Adamantine'),
            amm: properties.find((p) => p.startsWith('Ammunition')),
            fin: properties.find((p) => p === 'Finesse'),
            fir: properties.find((p) => p === 'Firearm'),
            foc: properties.find((p) => p === 'Focus'),
            hvy: properties.find((p) => p === 'Heavy'),
            lgt: properties.find((p) => p === 'Light'),
            lod: properties.find((p) => p === 'Loading'),
            mgc: properties.find((p) => p === 'Magical'),
            rch: properties.find((p) => p === 'Reach'),
            rel: properties.find((p) => p === 'Reload'),
            ret: properties.find((p) => p === 'Returning'),
            sil: properties.find((p) => p === 'Silvered'),
            spc: properties.find((p) => p === 'Special'),
            thr: properties.find((p) => p.startsWith('Thrown')),
            two: properties.find((p) => p === 'Two-Handed'),
            ver: properties.find((p) => p === 'Versatile')
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
            case 'Improvised Weapon': return 'modules/taring-kyburn/icons/items/inventory/stake.jpg';
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
            case 'Man Catcher': return 'icons/weapons/polearms/spear-ornate-gold.webp';
            case 'Maul': return 'icons/weapons/maces/mace-round-studded.webp';
            case 'Morningstar': return 'icons/weapons/maces/mace-round-spiked-black.webp';
            case 'Pike': return 'icons/weapons/polearms/pike-flared-brown.webp';
            case 'Rapier': return 'modules/taring-kyburn/icons/items/weapons/swords/Sword_v2_36.png';
            case 'Shortsword': return 'icons/weapons/swords/sword-guard-bronze.webp';
            case 'Studded Gauntlets': return 'icons/equipment/hand/gauntlet-armored-leather-brown.webp';
            case 'Trident': return 'icons/weapons/polearms/trident-silver-blue.webp';
            case 'War Pick': return 'icons/weapons/hammers/hammer-war-spiked.webp';
            case 'Warhammer': return 'icons/weapons/hammers/hammer-war-rounding.webp';
            case 'Voulge': return 'modules/taring-kyburn/icons/items/weapons/spears/Spear_v2_09.png';
            case 'War Scythe': return 'modules/taring-kyburn/icons/items/weapons/scythes/Scythe_03.png';
            case 'Light Crossbow': return 'icons/weapons/crossbows/crossbow-slotted.webp';
            case 'Dart': return 'icons/weapons/ammunition/arrow-broadhead.webp';
            case 'Shortbow': return 'icons/weapons/bows/shortbow-recurve.webp';
            case 'Sling': return 'modules/taring-kyburn/icons/items/inventory/textiles/Tailoring_52_bandages.png';
            case 'Blowgun': return 'modules/taring-kyburn/icons/items/weapons/staff.png';
            case 'Hand Crossbow': return 'icons/weapons/crossbows/crossbow-simple-red.webp';
            case 'Heavy Crossbow': return 'icons/weapons/crossbows/crossbow-blue.webp';
            case 'Longbow': return 'modules/taring-kyburn/icons/items/weapons/bows/Bow_08.png';
            case 'Net': return 'icons/tools/fishing/net-simple-tan.webp';
            case 'Whip': return 'icons/weapons/misc/whip-red-yellow.webp';
            default:
                console.log('No image set for ' + weaponName);
                return 'modules/owlmarble-magic/icons/items/weapons/';
        }
    }

    /**
     * Generates the description string for the weapon based on its properties.
     * @param {} propStr 
     * @param {*} propDict 
     * @returns 
     */
    getDescription (propStr, propDict) {
        const groups = propStr.replaceAll('_', '').split('<br/>');
        const properties = groups[0].split(', ');
        const isSpecial = groups.length > 1;
        
        const propRegex = /(?<prop>Adamantine|Ammunition|Couched|Dismounting|Extended Reach|Finesse|Firearm|Focus|Handy|Heavy|Inner Range|Light|Loading|Magical|Parrying|Reach|Reload|Returning|silvered|Special|Thrown|Two-Handed|Versatile)( \((?<short>\d+)\/(?<long>\d+)\))?/;
        let propDescriptions = properties.map((p) => {
            const propName = propRegex.exec(p)?.groups.prop.trim();
            if (propName && propName !== 'Special') {
                const propertyContent = propDict[propName].content;
                return `${this.tagify('h4', this.boldify(p))}${propertyContent}`;
            }
            return '';
        });
        if (isSpecial) {
            propDescriptions.splice(0, 0, this.paragraphify(this.boldify(groups[1])));
        }
        return propDescriptions.join('');
    }

    /**
     * Executes the parsing of the feats.
     * @param {[{}]} spells 
     * @returns 
     */
    run () {
        // Parse weapon properties
        const propPath = './rules/items/Weapon Properties.md';
        const propText = fs.readFileSync(propPath, { encoding: 'utf-8', flag: 'r'});
        const propertiesRaw = propText.split('##');
        let properties = propertiesRaw.map((p) => {
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
            return {
                _id: this.generateUUID(`${propName} (OwlMarble Magic - Properties)`),
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
                    const price = parseFloat(terms[2]);
                    const weight = parseFloat(terms[3]);
                    const damage = this.getDamage(' ' + terms[4] + ' ');// The parser is designed for the middle of text blocks, so wrap it.
                    if (damage.parts.length > 0) {
                        damage.parts[0][0] = damage.parts[0][0] + ' + @mod';// Always add the mod.
                    }
                    damage.versatile = /Versatile \((?<versatileDamage>.*)\)/.exec(terms[5])?.groups.versatileDamage || '';

                    const description = this.getDescription(terms[5], propDict);
                    const properties = this.getProperties(description);
                    const range = this.getRange(terms[5]);

                    let actionType = type.includes('Melee') ? 'mwak' : 'rwak';
                    let weaponType = (type.includes('Simple') ? 'simple' : 'martial')
                        + (type.includes('Melee') ? 'M' : 'R');

                    return {
                        _id: this.generateUUID(`${name} (OwlMarble Magic - Weapons)`),
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

        weapons = this.synchronizeDates(this.getDbDict('packs/weapons.db'), weapons);

        this.printDb(weapons, [
            'packs/weapons.db',
            'output/all/weapons.db',
            'output/owlmagic-only/weapons.db',
            'output/owlmagic-srd/weapons.db',
            'E:/Foundry VTT/Data/modules/owlmarble-magic/packs/weapons.db',
        ]);

        return weapons;
    }
};