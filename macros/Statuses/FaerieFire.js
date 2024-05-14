/* global TokenMagic, token */
const toggle = async () => {
    const id = 'faerieFire';
    if (TokenMagic.hasFilterId(token,id)) {
        await TokenMagic.deleteFiltersOnSelected(id);
    } else {
        const params = [{
            filterType: 'globes',
            filterId: id,
            time: 0,
            color: 0xFDFD66,
            distortion: 50.4,
            scale: 1.0,
            alphaDiscard: false,
            zOrder: 1,
            animated: {
                time: { 
                    active: true, 
                    speed: 0.0001, 
                    animType: 'move' 
                }
            }
        }];
        await TokenMagic.addUpdateFiltersOnSelected(params);
    }
};
toggle();
