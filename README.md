# OwlMarble Magic

Made on behalf of, and in collaboration with, [u/TheOwlMarble](https://www.reddit.com/user/TheOwlMarble) to ease the import of their homebrew spell list into FoundryVTT.

## Spells

### Spells by Level

- [Cantrips](./spells/levels/00.md)
- [Level 1 Spells](./spells/levels/01.md)
- [Level 2 Spells](./spells/levels/02.md)
- [Level 3 Spells](./spells/levels/03.md)
- [Level 4 Spells](./spells/levels/04.md)
- [Level 5 Spells](./spells/levels/05.md)
- [Level 6 Spells](./spells/levels/06.md)
- [Level 7 Spells](./spells/levels/07.md)
- [Level 8 Spells](./spells/levels/08.md)
- [Level 9 Spells](./spells/levels/09.md)
- [Level 10 Spells](./spells/levels/10.md)

### Appendices

- [**General Rules**](./spells/General%20Rules.md): overall spellcasting rules.
- [**Monster Stat Blocks**](./spells/Monster%20Blocks.md): stat blocks of homebrew monsters that are referenced by spells.
- [**Spells by Class**](./spells/Spells%20by%20Class.md): a list of all spells for each class once OMM is accounted for.
- [**OGL**](./spells/OGL.license): This is all just fan content, so here's Wizards' OGL.

## Features

### Player-Facing Features

- **Direct Foundry Import**: my previous spell parser read HTML files and converted those to Roll20's format.  When my table made the jump to FoundryVTT, rather than manually parse HTML all over again, I wrote _another_ parser to convert Roll20's format to Foundry's format.  This double-conversion had _many_ shortcomings.
  - Loss of Formatting
  - Performance
  - Desynchronization
- **Hyperlinks**: Spells can now direclty reference other spells and even monsters.
- **Advanced Lookup**: The [Spells by Class](./spells/Spells%20by%20Class.md) document allows you to navigate to any spell quickly, as well as providing an easily searchable list of all spells for your class.
- **Improved Performance**: Because not every spell is loaded in its entirety, the display pages are more performant, letting you find the spell you want faster.
- **Preserved Formatting**: Paragraphs, lists, quotes, tables, bold, and italics are all preserved, allowing for richer imports of spells to your game.
- **Self-Versioning**: Previously, all my changes were not intrinsically tracked, meaning I had to manually document when spells changed.  With github, this is no longer required.

### Developer-Facing Features

- **Self-Indexing**: when the parser runs, it searches all its spell level markdown files for a spell or monster name surrounded by underscores like this: `_Bestow Curse_`.  When it finds that, it will replace it with a reference to the spell if it is homebrewed.  When this occurs, the parser prints a notification of the change.
- **Self-Documenting**: `Spells by Class.md` is autogenerated, negating the requirement for me to ever have to do that myself.
- **Self-Versioning**: Version control is a wonderful thing.
- **Triple Import**: Supports importing from Markdown, Foundry's database files, and json.
- **Autoparsing**: Parses and generates outputs, even for complex fields like areas of effect.
- **Diff Notification**: When a change is made to the parser that causes the generated spells to differ, upon the next execution of the parser, a report is generated for the user reporting which fields changed.
- **SRD Comparison Testing**: Autogeneration is compared to the SRD spells for validation.
- **Versioned Manual Override**: For particularly odd spells, it _is_ possible to override the default value generated for a field, but you must specify what you're changing it from so if it becomes desynced, it will alert you.

## Development

### Parser Execution

1. deposit any spell input files you wish to parse into `import/` and `srd/`.
2. run `npm install`
3. run `node main.js`.
4. review `test.log` for any issues.

### Known Issues

See [test.log](./tests/test.log) to see any automatically detected issues.
