/* global TokenMagic, token */
const toggle = async () => {
    const id = 'holdingBreath';
    if (TokenMagic.hasFilterId(token,id)) {
        await TokenMagic.deleteFiltersOnSelected(id);
    } else {
        const params = [{
            filterType: 'flood',
            filterId: id,
            time: 0,
            color: 0x0020BB,
            billowy: 0.43,
            tintIntensity: 0.72,
            glint: 0.31,
            scale: 70,
            padding: 10,
            animated: {
                time : { 
                    active: true, 
                    speed: 0.0006, 
                    animType: 'move'
                }
            }
        }];
        await TokenMagic.addUpdateFiltersOnSelected(params);
    }
};
toggle();
