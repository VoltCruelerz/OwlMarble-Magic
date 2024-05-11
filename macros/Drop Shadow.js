// Icon: modules/tokenmagic/gui/macros/images/03%20-%20Drop%20Shadow.webp
let params =
[{
    filterType: "shadow",
    filterId: "myShadow",
    rotation: 35,
    blur: 2,
    quality: 5,
    distance: 20,
    alpha: 0.7,
    padding: 10,
    shadowOnly: false,
    color: 0x000000,
    zOrder: 6000,
    animated:
    {
        blur:     
        { 
           active: true, 
           loopDuration: 5000, 
           animType: "syncCosOscillation", 
           val1: 4, 
           val2: 4.1
        },
        rotation:
        {
           active: true,
           loopDuration: 1000,
           animType: "syncSinOscillation",
           val1: 36,
           val2: 37
        }
     }
}];

await TokenMagic.addUpdateFiltersOnSelected(params);