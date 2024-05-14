/* global TokenMagic, token */
const toggle = async () => {
    const id = 'oilSheen';
    if (TokenMagic.hasFilterId(token,id)) {
        await TokenMagic.deleteFiltersOnSelected(id);
    } else {
        const params = [{
            filterType: 'field',
            filterId: id,
            shieldType: 1,
            gridPadding: 1,
            color: 0xD8DB12,
            time: 0,
            blend: 0,
            intensity: 0.7,
            lightAlpha: 1,
            lightSize: 0.02,
            scale: 1,
            radius: 1,
            chromatic: false,
            zOrder: 512,
            animated:
            {
                time: { 
                    active: true, 
                    speed: 0.0002, 
                    animType: 'move' 
                }
            }
        }];
        await TokenMagic.addUpdateFiltersOnSelected(params);
    }
};
toggle();
