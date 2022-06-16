# Kyburnian Items

A Magic Item Crafting System for High Magic D&D 5e Campaigns

## Substrate quality

Mundane (non-magical) items come in varying qualities.

- **Ceremonial**: gorgeous items that serve more decorative purposes than functional.
  - Effect: Non-magical damage and AC bonuses are halved (rounded up)
  - Creation DC: 15 and must make a DC 10 Performance check
  - Infusion DC: +5
  - Price: x100
  - Construction Time: x10
- **Masterwork**: beautiful pieces of the highest functional quality that are frequently used as the substrate for magical items.  This is what happens when a master of a craft is set free to create an item to their heart’s content.
  - Effect: will not fail under even strenuous circumstances
  - Creation DC: 20
  - Infusion DC: +0
  - Price: x3
  - Construction Time: x3
- **Fine**: high-quality item produced by a master of his or her craft.
  - Effect: will not fail under norm-Hital use, may fail under extreme use
  - Creation DC: 15
  - Infusion DC: +5
  - Price: x2
  - Construction Time: x2
- **Standard**: the base items as described in the various guides.  This is what the average journeyman craftsman can make.  Unless otherwise specified, assume a non-magical object is this quality.
  - Effect: will not fail under normal use, may fail under heavy use
  - Creation DC: 10
  - Infusion DC: +10
  - Price: x1
  - Construction Time: x1
- **Mediocre**: what one might find from an apprentice or a rural worker without much skill
  - Effect: may fail under normal use
  - Creation DC: 5
  - Infusion DC: +15
  - Price: x0.5
  - Construction Time: x0.5
- **Crude**: produced without time, attention, or skill
  - Effect: not reliable even for normal use
  - Creation DC: 0
  - Infusion DC: +20
  - Price: x0.25
  - Construction Time: x0.25

## Mundane Items

Please see the [dedicated document](./Mundane%20Items.md) for more information.

## Magic Items

These rules are intended to allow players to create or purchase magical items.

### Crafting Options

There are many ways to make a magic item under Kyburnian Crafting.  This system relies upon enchanting items to have the behavior of existing spells. If you would like to have a custom spell, speak with your DM.  Additionally, some combinations may prove overpowered in your campaign, so always speak with your DM before crafting.

- **Quality**: any substrate material can be any quality.  Higher quality eases crafting.
- **Material**: There are many substrates that can be enchanted and each has unique properties.
- **Enchantment Source**: this determines how frequently you can use an enchanted item, how long it takes to recharge, and how often it must be maintained.  When a source is created, it gains the spell exactly as the creator can cast it, excluding temporary buffs.  Permanent features like Spell Sniper do apply.
  - **Saturation**: saturated items are bombarded by magic until the entire item assumes the effects.  Saturated items can be used indefinitely, never need to recharge, and are always Attuned.  Saturation supports Parasitic Cantrips.
  - **Reactor**: reactor-based items have a number of charges stored in Nodes that regenerate over time.  Reactors can be Isolated or Attuned.  Attuned reactors support Parasitic Cantrips.
  - **Runes**: Runes are single-use magical storage mechanisms.  To restore expended runes, you must re-enchant the item.  Runes are always Isolated.
    - **Known**: Runes can be constructed to require knowledge of the runes as in Spell Scrolls.
    - **Unstable**: Unstable runes deal the spell's level in force damage to the substrate upon activation as in Potions or Spell Scrolls.
- **Special Effects**: There are several special effects that can add to a basic enchantment.
  - **Parasitic Cantrips**: Attuned Reactors and Saturated items exude magic passively which can be harnessed by cantrip enchantments which consume minimal magical power in comparison.  Parasitic Cantrips can be used at will without fear of affecting the main enchantment.  Parasitic Cantrips are limited by the Impulse of the exuded magic and the spell level.  See the [spreadsheet](https://docs.google.com/spreadsheets/d/1haNL3t50BvkoqeXe7kK7csZ4fYS9GOFDG8YCDvf33q4/edit) for details.
  - **On-Hit**: Once a melee item has been enchanted with Magic Weapon, it can have on-hit Cantrips.  The total cantrip grades triggered on hit must be no more than the +X bonus of Magic Weapon.  Only Touch and Self ranged Cantrips may be used.  At time of enchantment, you can specify if a Touch cantrip targets the user, the item, or the target.  On-Hit effects only trigger on attacks taken as part of the Attack action (or Multiattack for NPCs).
  - **On-Shot**: Once a ranged weapon has been enchanted with Magic Weapon, it can trigger ranged cantrips to target the same thing. Make separate attack rolls as relevant.  Only ranged cantrips can be triggered by On-Shot.  The maximum number of cantrip grades that can be triggered is equal to the bonus from Magic Weapon.
  - **On-Struck**: Armor enchanted with Magic Armor can be made to trigger cantrips with any sort of range upon the wearer taking damage.  At time of enchantment, you must specify if the cantrip targets the user, attacker, or armor itself.  You may trigger no more cantrip grades than the bonus granted by Magic Armor.
  - **Quick Activation**: By default, activating a magic item requires a full action.  For spells with a casting time of a bonus action or a reaction, if you enchantment an item to have the Parasitic Cantrip Zenith's Servant, you can specify an activation word that you can say as a bonus action or reaction to trigger the enchantment.
- **Special Cases**
  - **Ammunition**: Ammunition is enchanted in bulk for small items (arrows, darts, bolts) and individually for large items (spears, daggers, etc).  See the costs section below for details.
  - **Healing**: enchantments that restore lost hit points have healing effects as if down-cast by one level and cannot be saturated.
  - **Multiple Sources**: An item has no Spell Flux limit, but an item cannot occupy more than one attunement slot at a time.  This has some implications.
    - **Saturation**: Cannot coexist with attuned reactors.
    - **Runes**: Runes can be safely applied to any item.
    - **Attuned Reactors**: More than one of these can exist on an item, but a user cannot have more than one active at a time and must fully unattune and attune when switching between them.
    - **Isolated Reactors**: There is no limit to the number of Isolated Reactors on an item.
    - **Parasitic Cantrips**: the parasitic cantrips remain bound to the primary source and cannot feed off other sources on an item.
  - **Autonomy**: to instill an item with intelligence or autonomy requires particular enchantments, such as Zenith's Servant, Unseen Servant, Awaken, and Imprisonment.

### Spell Flux

**Spell Flux** is a new limitation, similar to Attunement or Encumbrance Capacity that affects magical items.  A player’s maximum Spell Flux is equal to 10x their level.  A player cannot have more spell flux worth of items on them than their maximum.  Every round this has been exceeded, they take 1 point of force damage.

The following dictates the magical flux given off by various items.  Cantrips count as Grade/2:

- **Saturated**: 3 times spell level
- **Reactor Nodes**: reactor nodes times spell level
- **Attuned Reactor**: mana per day divided by 2
- **Isolated Reactor**: mana per day divided by 4
- **Runes**: rune count times spell level

Items in a bag of holding do not give off spell flux.

### Materials

- **Steel**: standard stats
- **Silvered Steel**: bonus damage to a few creatures
  - **Price**: +100 for equipment, +10 for ammunition
- **Bronze**: immune to rusting effects
  - **Price**: x1.3
- **Quicksilver**: A highly flexible metal that vibrates surprisingly little when struck.
  - **Armor**: No stealth penalty due to sound
  - **Weapons**: counts as silver
  - **Price**: x1.5
- **Faeleaf**: dense, flexible plant matter grown by the Seely Court
  - **Armor**: Heavy armor made from this material allows a wearer to add their Dexterity modifier to their AC (max 2)
  - **Price**: x2.
- **Mithral**: weighs a third as much as steel
  - **Armor**: no strength requirement, can be treated as one class down for proficiencies
  - **Weapons**: heavy trait is lost and normal weapons become light.  If a weapon could increase its damage die by using two hands, that is now its standard die.  Using two hands has no benefit.
  - **Price**: x2
  - Only comes as Masterwork (x6 to cost in practice)
- **Adamantine**: metal that cannot be shattered
  - **Armor**: Crit range of incoming attacks reduced by 1 and all incoming damage is reduced by 1.
  - **Shields**: +1 AC
  - **Weapons**: Crit Range increased by 1 and use larger damage die.
  - **Foci**: +1 to AC that does not stack with shields.
  - **Price**: x3
  - Only comes as Masterwork. (x9 to cost in practice)
- **Orichalcum**: priceless metal of the gods
  - **Armor**: resists all non-magical physical damage, gives a reductive damage threshold equal to twice the item’s AC bonus, and immunity to spells below fourth level
  - **Shields**: +2 AC
  - **Weapons**: Ignores resistances and counts as magical damage
  - **Foci**: up-casts spells by one level
  - **Price**: N/A.  Orichalcum is so rare and powerful that it cannot be bought by any discrete gold value and must instead be traded for or killed over.

Players can purchase or craft items with enchantments on them, but the number of times you can use an object, the player’s prior experience crafting that item, the player’s access to the appropriate tools, the player’s spellcasting level, and the spell level of the enchantment all affect how long it takes and how much it costs.

### Can You Craft It?

A player may construct their own magical item, should they meet the following conditions:

1. They have a spell slot for the spell level of the effect
2. The player has the substrate item (i.e. a sword for a +1 sword)
3. The player has the gold to create the item with
4. The player has access to the relevant tool set (i.e. Smith’s Tools if they wish to make a +1 sword).  They need not be proficient in it (though it will certainly help).
5. At least one of the following:
  A. The player has a complete Formula for the item.
  B. The player knows and has the relevant spell prepared.
  C. The player has a partial formula and an assistant with the spell known and prepared.

### Item Cost

The gold value of the item is altered by the following:

- **Base Cost**: please see the [spreadsheet](https://docs.google.com/spreadsheets/d/1haNL3t50BvkoqeXe7kK7csZ4fYS9GOFDG8YCDvf33q4/edit) for the base enchantment cost.
  - **Spell Level**: the higher the level of the spell (or grade of the cantrip), the greater the cost.
  - **Healing**: enchantments that heal will usually need to be up-cast.
  - **Saturation**: as this is unlimited, it is expensive.
    - **Parasitic Cantrips**: The cost of the corresponding Parasitic Cantrips is the same as the cantrip’s default Saturation Cost if it existed alone.
  - **Runes**: Runes are cheaper when made in bulk.
    - **Unstable Runes**: Rune cost = rune cost / 2
    - **Rune Knowledge**: Rune cost = rune cost / 2
  - **Reactors**: Reactors absorb ambient magic and store it in Nodes.  The greater a Reactor’s rate of generation, the higher the cost.  An item may have more than one Reactor, but only one (and by extension the spell it stores inside it) can be Attuned at a time.
    - **Nodes**: a multi-use store of magic that is recharged by a Reactor.  The more Nodes that are attached to a Reactor, the more expensive it becomes.
    - **Parasitic Cantrips**: The cost of a Parasitic Cantrips is the cantrip's Saturation Cost if it were alone.
- **Formula**: possession of a Formula for the item significantly impacts the item creation.  When calculating the rarity of an item, use its Commission Cost (partial formula).
  - **Complete Formula**: cost = [spreadsheet](https://docs.google.com/spreadsheets/d/1haNL3t50BvkoqeXe7kK7csZ4fYS9GOFDG8YCDvf33q4/edit) / 2
    - The price of an item with a complete formula is its Mass Production Cost
  - **Partial Formula**: cost = [spreadsheet](https://docs.google.com/spreadsheets/d/1haNL3t50BvkoqeXe7kK7csZ4fYS9GOFDG8YCDvf33q4/edit)
    - The price of an item with a partial formula is its Commission Cost
  - **No Formula**: cost = [spreadsheet](https://docs.google.com/spreadsheets/d/1haNL3t50BvkoqeXe7kK7csZ4fYS9GOFDG8YCDvf33q4/edit) * 2
    - The price of an item without a formula is its Prototype Cost
- **Isolation**:
  - **Isolated Reactor**: Total Renewable Cost = Total Renewable Cost * 5
  - **Isolated Cantrip Saturation**: Total Cost = Total Cost * 5
- **Ammunition**: Ammunition is enchanted in bundles of 10 for arrows/bolts/darts/needles.  Ballista missiles, javelins, and other large projectiles are done individually.  A bundle of arrows has the same enchantment cost as a single normal enchanted item, but the effect may be reduced arithmetically when done in smaller bundles. Ammunition cannot be enchanted with ranged spell attacks.
  - **Runes**: may be used with any class of projectile
  - **Potion** (single stable rune without knowledge with a liquid substrate): not directly possible for ammunition, but potions may be spread among however many projectiles as a user wishes, but the potion only remains viable for one hour and each projectile to which the potion is applied takes a portion of the effect.  Applying a Fireball (8d6) potion to 8 arrows would cause each to do only 1d6 damage.
  - **Reactor**: the if a bundle of projectiles, they come with a case containing the Reactor and each projectile has one Node in it.
- **Multiple Sources**: to have multiple reactors or mix reactors with saturation, you must isolate some of the reactors, which adds to the cost.
- **Autonomy**: degrees of autonomy impact cost.  The higher-autonomy effects have their costs stack with their prerequisites.
  - **Command Word**: to make a source triggered by a Command Word, it just have to parasitic cantrip Zenith's Servant.
  - **Minor Autonomy**: to make an item able to follow basic instructions, it must be enchanted with Unseen Servant.
  - **Sentience**: enchant the object with Unseen Servant and then cast Awaken on it. For this to take hold, the substrate must be Masterwork. Sentient items may be given a simple command at time of Awakening such as “Destroy Evil” or “Protect Elves.” The order becomes the item’s idea of axiomatic good.
  - **Sapience**: A sapient item is fully conscious and aware and can be conversed with just as any person could.  See the sapient weapon race in the house rules document for more information.  Creating a Sapient item requires enchanting the item with 9th level Soul Safe.
- **Spell Has Consumable Material Component**: if the spell requires a consumable component every time it is cast, special rules apply.
  - **Runes**: for each rune added to an object, the consumable component must be supplied.
  - **Reactors**: Enchantment reactors cannot contain consumable material components.
  - **Saturated**: Saturated items do not include consumable components.
- **Spell Has Valuable Reusable Component**: if the spell has a non-consumed component with an assigned gold cost, the component must be physically integrated into the final construction or else must be supplied by the user.

### Crafting Speed

How quickly an item is made depends on many things which stack with each other.  The player expends gold each 8-hour shift as they work toward the total item price.  “Exhaustive” means they work a 12-hour shift and receive a level of exhaustion at the end. Exhaustive shifts increase production by 50% after all other modifiers.

#### Default Speed

- **Player Character**
  - **Baseline Speed**: `100gp / day`
  - **Exhaustive Speed**: `150gp / day`
- **Master Magical Artisan (NPC)**
  - **Baseline Speed**: `200gp / day`
    - **Salary**: `250gp / day`
  - **Exhaustive Speed**: `300gp / day`
    - **Salary**: `400 gp / day`
- **Apprentice (NPC)**
  - **Baseline Speed**: `50gp / day`
    - **Salary**: `40 + 2d10gp`
  - **Exhaustive Speed**: `100gp / day`
    - **Salary**: `100gp + 2d10`

#### Modifiers

- **In Dedicated Environment**: `+50gp/day` (i.e. Alchemist’s lab, if making potions).  Stacks additively with Proficiency in Tools.
- **Proficiency Tier**: `+50gp/day` per level (Proficient -> Expertise -> Mastery -> Supremacy)

#### Collaboration

If multiple players work together on an item, they must each be able to make it individually or there will be no change in crafting time.  The total speed is their individual speeds added together. To work successfully together on any given day, the lead crafter must succeed on a Charisma check with a DC equal to the spell level.

- **Natural 20**: roll represents a synergistic epiphany and work speed for the day is doubled.
- **Normal Success**: normal work speed
- **Normal Failure**: work speed is halved
- **Natural 1**: due to personality conflicts, only the lead is able to make progress today. All others head home for the day.

### Difficulty Class

How hard it is to craft an item scales with many things.  This is the DC that the player checks against when they have completed their attempt at the item to see if they were successful or not.

- **Rarity**
  - Divine: >1Mgp
    - DC = 30
  - Legendary: >200kgp
    - DC = 25
  - Very Rare: >50kgp
    - DC = 30
  - Rare: >5kgp
    - DC = 15
  - Uncommon: >500gp
    - DC = 10
  - Common: >0gp
    - DC = 5
- **Formula**
  - Complete Formula: DC = DC - 5
  - Partial Formula: DC = DC
  - No Formula: DC = DC + 5
- **Substrate Quality** (does not apply to Potions or Spell Scrolls)
  - Ceremonial: DC = DC + 5
  - Masterwork: DC = DC
  - Fine: DC = DC + 5
  - Standard: DC = DC + 10
  - Mediocre: DC = DC + 15
  - Crude: DC = DC + 20

### Crafting Check

The final check to create an item is a rather simple ability check:

`Check = d20 + relevant ability modifier + tool proficiency`

- **Relevant Ability Modifier**: see Details section below
- **Tool Proficiency**: see Details section below

### Item Deconstruction

A player may deconstruct the magical echoes of an existing, Identified, Kyburnian magical item by expending 50gp per day for a number of days equal to the total spell levels of the item plus 2 hours for each cantrip to retrieve a complete formula for it on a successful Arcana check.  The DC is 5 + twice the total spell levels + the number of cantrips the item is enchanted with.  Failing the DC by less than 5 results in a partial formula.  Failing by 5 or more destroys the item and no formula is gained.  If the item had multiple effects, they receive formulas for all effects upon completion.  Deconstructing an item is not possible until after the item’s effects have been Dispelled.

## Details

### Hired Artisans

If a particular magical item is not in stock in a major city, a player may contract a Master Magical Artisan (MMA).  The hired artisan will work toward the price of the item at 200gp per day.  If a player wishes to receive an item faster, they can break apart the job into sub-contracts if there are a large enough number of sufficiently-skilled magical artisans in the city.  For each MMA after the first, the player must also pay an administrative fee of 10% of the item’s cost as the MMAs must work together to ensure that their work meets up properly.  As an example a 1000gp potion could be created by a single MMA in 5 days for 1000gp.  2 MMAs could craft it in 3 days (round up) for 1100gp.  5 MMAs could create it by the end of the day, though it would cost the player 1500gp.  Note that a player may have to make a Persuasion check if they wish to make rival MMAs work together on the same project.

At the GM’s discretion, it is possible that an MMA may have apprentices allowing them to work faster without charging more money.

MMAs will also impose a difficulty fee, which is the DC (for them) divided by 10.  That percentage is then added to the item’s cost.  They will then charge again on top of that for profit margins.

**Example**: Nezznar, with whom the Cursed Spear Campaign’s party had a deal to get 20% of the profits of the Forge of Spells.
To craft an item with a DC 10 (for him), he would increase the total price of the item by 100%
He (personally) uses a profit margin of 40%, so when the players who had a deal with him make a purchase, it’s only 32%.

Thus, the total cost of the players buying something from Nezznar, is 232% of the actual enchantment cost

### Player Crafting

The actual cost to manually manufacture a magic item is usually going to be different than the Market Value as instead of using the default CL of 5, you will enter the creating player’s actual CL.  At lower levels, this is not likely to be economical and will more serve the purpose of making player-desired items and giving the players a stock of Formulas that could be used later.

A player works toward the completion of an item at a rate of 100gp per day in an 8-hour shift or 150gp in a 12-hour shift during which they must expend spell slots for any enhancements made.  Upon completion of a 12-hour shift, a player takes a level of Exhaustion.  For instance, to create Boots of Flying, every day during their construction, the player would have to expend a 3rd-level Spell Slot (as Fly is a 3rd-level spell).  Productivity increases by 50gp per day if the player is proficient with the relevant tools for creating the object (ie smithing proficiency makes creating a +1 sword go faster).  Productivity also increases by 50gp per day if it the player is creating the item in an area designed for the task (ie an alchemist’s workshop would speed up potion making).  It is assumed that MMAs have the relevant tool proficiencies and the right facilities which is why they have a production rate of 200 gp.

If, for some reason, a player wishes to pause construction on one magical item to go adventuring or work on something else, they may do so.  No detriment will be imposed for this per se, but if you leave your 99% complete Wand of DOOM lying around where anyone could walk off with it, it’s probably not going to be there when you get back.  Provided the incomplete item is stored safely, there’s no reason for the player to doubt it will be fine when they return.  Obviously, a creative DM could make a whole quest or campaign about retrieving a stolen nearly-complete magical item if he or she believes it would be more fun for the party.

Upon completion of the construction of the item, the player will make a roll with a DC based upon the rarity of the item.  If the player passes, the item is successfully created.  Regardless of the success or failure of the roll, the gold spent to attempt to create the item is still consumed.  If the DC is missed by a small interval, at the DM’s discretion, the item may be considered still in-progress or may be complete but may have an opposite or lesser effect.  For example, an attempt to make a +2 Sword that fails its DC by 1 might end up being a +1 Sword instead.  A Ring of Feather Fall that fails by 2 might instead make things fall faster.  While that would make the item useless for its intended purpose, a creative party might be able to find alternative uses for it.  If the player fails significantly, perhaps the effect of the spell is instant and reversed, so a player attempting to craft a Potion of Invisibility is instead affected in such a way that the universe becomes invisible to the user and they simply see a white abyss in all directions.

#### Success/Failure Roll

The DC of an item creation roll is dependent on its rarity, which is determined by its gold value.  Ties result in successful item creation.  Natural 20s automatically result in a successful creation.  Critical Failures will completely destroy the physical item and do a DM-determined amount of non-lethal damage to the player.  If the DM so desires, the player could also be poisoned, cursed, or have some other status placed upon them.  It is this guide’s recommendation that the scale of the negative status scale with the rarity of the attempted item and that the effect be relevant to the attempted magical effect.  For instance, a failed Belt of Unlimited Misty Step might cause the player to uncontrollably teleport around the room for the next couple days while a failed Belt of Unlimited Gates might cause the player to accidentally teleport into a volcano!  A failed Wand of Meteor Swarms might accidentally obliterate a nearby town, incurring the wrath of the locals.  A failed Ring of Feather Fall might increase fall damage for a time.  You get the idea.

#### Roll Calculations

The tool used for enchantment depends on the substrate material.  Each tool has a corresponding ability modifier that is added to it.  For instance, a player proficient in Smith’s Tools, a +2 Proficiency Bonus, and +3 Strength would add +5 to their rolls to create magical swords (presuming they are made of metal).

##### Substrate Material: Tool, Ability

- **Fluid**: Alchemy, Intelligence
- **Wood**
  - **Structural/Functional**: Carpentry, Strength
  - **Artisanal**: Woodcarving, Charisma
- **Leather**: Leather-working, Wisdom
- **Metal**: Smithing, Strength
- **Stone**: Mason, Wisdom
- **Crystal**: Jeweler, Dexterity
- **Glass**: Glassblower, Constitution
- **Cloth**: Weaver, Wisdom
- **Food**: Cook, Charisma
- **Clay**: Potter, Dexterity
- **Paper**: Calligraphy, Dexterity
- **Clockwork**: Tinker, Intelligence

#### Formulas

A Formula is a blueprint for the creation of a magical item.  Depending on the completeness, relevance, and condition of a Formula, it can dramatically impact the quality and reliability of the final creation.  Should a player stumble upon an existing magic item, they may wish to empower it further or deconstruct it to learn its nature.  Also, as Formulas are rare and valuable, a Formula’s cost is 5x (or more) its item’s gold cost.

##### Parameter Combinations

An individual enchantment formula is for a given combination of parameters:

- Spell
- Saturation
- Spell Level
- Quantity of Runes
- Quantity of Nodes
- Reactor Rate

The Spell itself and whether the item is Saturated with that spell are considered Critical Parameters.  They must remain unchanged for a formula to qualify.  The others are considered Lesser Parameters.

##### Formula Grades

- **Complete**: Successful creation of a magic item yields a Complete Formula for the given Critical Parameters and Lesser Parameters as well as for any combination of Lesser Parameters with lower values than those associated with the original enchantment.  It also qualifies as a Partial Formula for any other enchantment with the same Critical Parameters and improved Lesser Parameters.
- **Partial**: A failed attempt at a magic item results in a Partial Formula that is also a Partial Formula for all combinations of Lesser Parameters with the same Critical Parameters.

##### Formula Price Impacts

- **Complete Formula**: a complete formula halves the cost of an item
- **Partial Formula**: a partial formula leaves the cost of an item as it is in the [spreadsheet](https://docs.google.com/spreadsheets/d/1haNL3t50BvkoqeXe7kK7csZ4fYS9GOFDG8YCDvf33q4/edit).  Acquiring a Partial Formula is considered standard practice before attempting to craft an item.
- **No Formula**: doubles the gold cost of the item due to the research and testing time required.

#### Rarities and Costs

Given a custom item’s Commision Cost, use the following to determine its rarity and maximum stats.

| Rarity    | Gold Range | DC |
|:---------:|:----------:|:--:|
| Common    | 0-500      | 5  |
| Uncommon  | 501-5k | 10 |
| Rare      | 5k-50k | 15 |
| Very Rare | 50k-200k | 20 |
| Legendary | 200k-1M | 25 |
| Divine    | >1M     | 30 |

#### Resources

All magic items require construction from an item of Masterwork quality. Each level lower in item quality increases the item DC by 5.

- **Masterwork**: No DC penalty
- **Fine**: +5 to DC
- **Standard**: +10 to DC
- **Mediocre**: +15 to DC
- **Crude**: +20 to DC

For certain Rare and above magic items, the DM may rule that special materials may be required from which the base non-magical item be constructed.
Additionally, Spell Scrolls and Potions require Spellpaper (5gp) and Inert Vials (10 gp) respectively, which can be purchased in a medium or larger city. Inert Vials can also be reused.

#### Speeding Up Crafting

To expedite the process of creating an item, a player may choose to employ others.  Any willing PCs (or allied and willing or contracted NPCs) that could individually craft the item may do so collectively without overhead costs.  In such a case where there are multiple crafters, one is considered the Lead Crafter and is the one to make the skill check against the item’s Difficulty Class to determine if creation is successful or not.  It is the Lead Crafter’s Caster Level that is also used in the affiliated [spreadsheet](https://docs.google.com/spreadsheets/d/1haNL3t50BvkoqeXe7kK7csZ4fYS9GOFDG8YCDvf33q4/edit) to determine gold cost.

Should the lead crafter die, any unfinished items they have are to be converted to a %done number (1000gp of 2000gp would be 50% done).  A player may pick up a dead player’s (or steal a living one’s) partially complete magic item.  In such a case, its gold cost must be reevaluated using the [spreadsheet](https://docs.google.com/spreadsheets/d/1haNL3t50BvkoqeXe7kK7csZ4fYS9GOFDG8YCDvf33q4/edit).  If the item’s new owner were of higher level, it might only take the new owner 600gp to get the last 50% done.

As another option to speed up creation time, apprentices may be hired.  An apprentice performs 50gp of progress per day for 40+2d10 gold.  Apprentices cannot be fired after being hired.  If an apprentice is working on a Very Rare item, roll a d4.  If a 4, the apprentice attempts to steal it.  Apprentices cannot be trusted at all on items of Legendary or Divine rarity.

#### Attunement and Isolation

Magical items are inherently unstable as they contain forces that alter the world.  As such, while any object can be enchanted, most are not, and even of those that are, few include Isolation Circles due to the costs involved.  Without them, a user of a magic item that is either Saturated or contains Mana Reactors must attune to it, a one-hour process whereby their own River controls the flow of the Mana through the item, warming it up from a safe inactive state and stabilizing it.

Found in magical creatures in the forms of circular body parts such as the irises of animals, the horn of a unicorn, the feather stems of a coatl, or even the halo of an angel, Isolation Circles are entities that bind and protect magic from outside influence, forming a barrier that prevents interference in either direction.  Some creatures creatures could not survive without their evolved Isolation Circles.  The few unfortunate angels to have their halos destroyed usually detonate.  

Isolation Circles can also be added to creations, which is why most larger magical objects are circular in shape.

Isolation also makes dispelling magic harder; isolated objects have a +2 bonus to their difficulty class to dispel them, making the DC = 12+level. For items with multiple effects, the effects must be dispelled individually.

To make an item with an Isolation Circle, you must spend time and magic to master and barricade the object’s magic from the outside world. An isolated magical object requires the creator to expend five times as much gold coins worth of materials when creating the enchantment.

It is possible to create an item with multiple attunement requiring enchantments, but only one of them may be attuned to the user at any given time as the others will be in a safety shutdown state.  To have supplementary Reactors active, the supplementary Reactors must be Isolated.

#### Improving Existing Items

When altering the spell effects of an existing magic item, it must first be unattuned (if relevant).  Existing enchantments can be upgraded into greater versions of themselves with half the existing enchantment gold cost counting toward the upgraded gold cost if it is an improvement to an existing enchantment.  New enchantments must start from scratch, though as stated above, they must obey the Isolation rules if applicable.

Multiple magical items may be attached to one another, but be wary of Isolation causing problems in this case.  If two attunement-requiring items are attached to one another, the DM will flip a coin to determine which enchantment immediately enters a safety shutdown.

If you wish to raise the DC of an item, you must both have a higher DC and the full formula for that item.  You may then expend 100 gold per spell level per DC level, up to your Spell Save DC.
