# Travel

## Nightly Risk Table

This is a summary of the below rules.

| Hours Prepping Camp | Nightly Encounter Chance | ZH None (DC  0) | ZH Minimal (DC 5) | ZH Mild (DC 10) | ZH Moderate (DC 15) | ZH Severe (DC 20) | ZH Extreme (DC 25) | ZH Intolerable (DC 30) |
|:-------------------:|:------------------------:|:-----------:|:--------------:|:------------:|:----------------:|:--------------:|:---------------:|:-------------------:|
| 0                   | 50%                      | 0           | 5              | 10           | 15               | 20             | 25              | 30                  |
| 1                   | 50%                      | 0           | 4              | 9            | 14               | 19             | 24              | 29                  |
| 2                   | 45%                      | 0           | 3              | 8            | 13               | 18             | 23              | 28                  |
| 3                   | 45%                      | 0           | 2              | 7            | 12               | 17             | 22              | 27                  |
| 4                   | 40%                      | 0           | 1              | 6            | 11               | 16             | 21              | 26                  |
| 5                   | 40%                      | 0           | 0              | 5            | 10               | 15             | 20              | 25                  |
| 6                   | 35%                      | 0           | 0              | 4            | 9                | 14             | 19              | 24                  |
| 7                   | 35%                      | 0           | 0              | 3            | 8                | 13             | 18              | 23                  |
| 8                   | 30%                      | 0           | 0              | 2            | 7                | 12             | 17              | 22                  |
| 9                   | 30%                      | 0           | 0              | 1            | 6                | 11             | 16              | 21                  |
| 10                  | 25%                      | 0           | 0              | 0            | 5                | 10             | 15              | 20                  |
| 11                  | 25%                      | 0           | 0              | 0            | 4                | 9              | 14              | 19                  |
| 12                  | 20%                      | 0           | 0              | 0            | 3                | 8              | 13              | 18                  |
| 13                  | 20%                      | 0           | 0              | 0            | 2                | 7              | 12              | 17                  |
| 14                  | 15%                      | 0           | 0              | 0            | 1                | 6              | 11              | 16                  |
| 15                  | 15%                      | 0           | 0              | 0            | 0                | 5              | 10              | 15                  |
| 16                  | 10%                      | 0           | 0              | 0            | 0                | 4              | 9               | 14                  |
| 17                  | 10%                      | 0           | 0              | 0            | 0                | 3              | 8               | 13                  |
| 18                  | 5%                       | 0           | 0              | 0            | 0                | 2              | 7               | 12                  |
| 19                  | 5%                       | 0           | 0              | 0            | 0                | 1              | 6               | 11                  |
| 20+                 | 5%                       | 0           | 0              | 0            | 0                | 0              | 5               | 10                  |

## Encounters

Each day, party rolls once on the daily encounter table and once for the nightly encounter table.

- `d20: <11`: trigger a random encounter.
- `d20: >10`: safe passage

If the party travels, they roll again on the same table, based on the time of day.

When camping, for every 2 hours spent prepping camp (`floor/manHours/partySize`), increase the party's roll on the encounter table by 1, to a maximum of 9.

## Wilderness Resting

### Short Rest

When the party travels through the wilderness and must make camp daily to rest, they can run into challenges resting properly.  When the party would finish a short rest, the PCs must each make a Constitution saving throw with a DC detailed below, based on the number of man hours the spend securing their camp and the hostility of the environment. On a success, they short rest as normal. On a failure, the party benefits from a sleep only.

`DC = max(0, zoneHostility + weatherModifier - floor(manHours/partySize))`

At the DM’s discretion, certain externalities may further increase or decrease this DC.

#### Seasons & Weather

| Weather Event | Weather Modifier |
| :------------ | :--------------- |
| Thunderstorm  | 0                |
| Winter        | 5                |
| Hurricane     | 10               |

#### Camp Magic

For spells that make resting easier, such as _Goodberry_ (removing the need for foraging) or _Leomund’s Tiny Hut_ (protection from the elements and monsters), treat the spell as extra man-hours of effort prepping camp equal to the level of the spell for each creature that benefits from it.

#### Zone Hostility

The following list provides some basic examples of zone hostility.

|  Level   | DC  | Examples |
| :------: | :-: | :-------------------------------------------------------------------- |
|   None   |  0  | Civilized indoor areas under normal circumstances. |
| Minimal  |  5  | Civilized outdoor areas, such as formalized campgrounds, or civilized indoor areas with moderate disruptions. |
|   Mild   | 10  | Most mundane forests, grasslands, and coastlines would fall under this category. Civilized indoor areas with substantial disruptions also fall under this category. |
| Moderate | 15  | Areas of increased threat such as regions known to have higher monster populations or adverse weather. |
| Severe | 20 | Areas of severe, ever-present danger, such as ancient haunted battlefields or much of the Underdark. |
| Extreme | 25 | Regions of extreme hostility are rare, and usually a product of a magical or natural disaster leaving an area all but unihabitable. |
| Intolerable | 30 | Intolerable regions are innately deadly to the average mortal. The air may be poison, there may be a leak from the Positive Energy Plane, or the territory may be claimed by an evil being of awesome power who does not suffer interlopers. |

#### Sleeping in Armor

Sleeping in your armor imposes a penalty to your Wilderness Resting Saving Throw.

- **Light**: +1 zone hostility
- **Medium**: +3 zone hostility
- **Heavy**: +5 zone hostility
