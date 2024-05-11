const getSign = () => Math.random() > 0.5 ? 1 : -1;
const genHarmonics = (durationMin, durationOffset, xShift, yShift, harmonics, transforms = []) => {
    const durationX = durationMin + durationOffset * Math.random();
    const durationY = durationMin + durationOffset * Math.random();
    
    const sin = Math.random() * xShift;
    const cos = Math.random() * yShift;
    const sinSign = getSign();
    const cosSign = getSign();

    console.log(`[${harmonics}|X] Create Harmonic: dur=${durationX}ms, shift=${xShift}, sign=${sinSign}`);
    console.log(`[${harmonics}|Y] Create Harmonic: dur=${durationY}ms, shift=${yShift}, sign=${cosSign}`);
    
    const filter = {
        filterType: "transform",
        filterId: "idleShift",
        padding: 0,
        animated:
        {
            translationX:
            {
                animType: "sinOscillation",
                val1: -sinSign * sin,
                val2: sinSign * sin,
                loopDuration: durationX,
            },
            translationY:
            {
                animType: "cosOscillation",
                val1: -cosSign * cos,
                val2: cosSign * cos,
                loopDuration: durationY,
            }
        }
    };

    transforms.push(filter);
    if (harmonics > 0) {
        const harmDuration = 1 + Math.random();// 1.00 - 2.00
        const harmShift = 0.25 + Math.random() * 0.5;// 0.25 - 0.75

        genHarmonics(durationMin * harmDuration,
            durationOffset * harmDuration,
            xShift * harmShift,
            yShift * harmShift,
            harmonics - 1,
            transforms);
    }
    return transforms;
};

await TokenMagic.addUpdateFiltersOnSelected(genHarmonics(24000, 5000, 0.02, 0.02, 2, [
    {
        filterType: "transform",
        filterId: "idleBulge",
        bpRadiusPercent: 70,
        padding: 100,
        animated:
        {
            bpStrength:// Bulge
            {
                animType: "cosOscillation",
                val1: 0,
                val2: 0.05,
                loopDuration: 12000 + Math.random() * 5000,
            },
            rotation:
            {
                animType: "sinOscillation",
                val1: -3,
                val2: +3,
                loopDuration: 12000 + Math.random() * 5000,
            }
        }
    },
    {
        filterType: "shadow",
        filterId: "shadow",
        rotation: 35,
        blur: 2,
        quality: 5,
        distance: 10,
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
    }
]));