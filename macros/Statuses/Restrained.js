/* global TokenMagic, token */
const toggle = async () => {
    const id = 'restrained';
    if (TokenMagic.hasFilterId(token,id)) {
        await TokenMagic.deleteFiltersOnSelected(id);
    } else {
        const params = [{
            filterType: 'web',
            filterId: id,
            time: 100,
            div1: 8,
            div2: 6,
            tear: 0.45,
            amplitude: 0.8,
            thickness: 0.5,
            zOrder: 1024,
            animated: {
                time: { 
                    active: true, 
                    speed: 0.005, 
                    animType: 'move' 
                }
            }
        }];
        await TokenMagic.addUpdateFiltersOnSelected(params);
    }
};
toggle();