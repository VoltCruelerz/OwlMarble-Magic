/* global TokenMagic, token */
const toggle = async () => {
    const id = 'petrify';
    if (TokenMagic.hasFilterId(token,id)) {
        await TokenMagic.deleteFiltersOnSelected(id);
    } else {
        const params = [{
            filterType: 'xfire',
            filterId: id,
            color: 0x918f8C,
            time: 1,
            blend: 5,
            amplitude: 1.0,
            dispersion: 0,
            chromatic: false,
            scaleX: 1,
            scaleY: 1,
            inlay: true
        }];
        await TokenMagic.addUpdateFiltersOnSelected(params);
    }
};
toggle();