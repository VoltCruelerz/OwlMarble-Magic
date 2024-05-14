/* global TokenMagic, token */
const toggle = async () => {
    const id = 'bless';
    if (TokenMagic.hasFilterId(token,id)) {
        await TokenMagic.deleteFiltersOnSelected(id);
    } else {
        const params = [{
            filterType: 'glow',
            filterId: id,
            outerStrength: 4,
            innerStrength: 0,
            color: 0x5099DD,
            quality: 0.5,
            padding: 10,
            animated: {
                color: {
                    active: true, 
                    loopDuration: 3000, 
                    animType: 'colorOscillation', 
                    val1:0x5099DD, 
                    val2:0x90EEFF
                }
            }
        }];
        await TokenMagic.addUpdateFiltersOnSelected(params);
    }
};
toggle();
