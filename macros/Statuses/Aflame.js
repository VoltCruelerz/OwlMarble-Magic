/* global TokenMagic, token */
const toggle = async () => {
    const id = 'aflame';
    if (TokenMagic.hasFilterId(token,id)) {
        await TokenMagic.deleteFiltersOnSelected(id);
    } else {
        const params = [{
            filterType: 'fire',
            filterId: id,
            intensity: 1,
            color: 0xFFFFFF,
            amplitude: 1,
            time: 0,
            blend: 2,
            fireBlend: 1,
            animated: {
                time: { 
                    active: true, 
                    speed: -0.0024, 
                    animType: 'move' 
                },
                intensity: {
                    active:true,
                    loopDuration: 15000,
                    val1: 0.8,
                    val2: 2,
                    animType: 'syncCosOscillation'
                },
                amplitude: {
                    active:true,
                    loopDuration: 4400,
                    val1: 1,
                    val2: 1.4,
                    animType: 'syncCosOscillation'
                }
            }
        }];
        await TokenMagic.addUpdateFiltersOnSelected(params);
    }
};
toggle();
