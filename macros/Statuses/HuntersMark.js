/* global TokenMagic, token */
const toggle = async () => {
    const id = 'huntersMark';
    if (TokenMagic.hasFilterId(token,id)) {
        await TokenMagic.deleteFiltersOnSelected(id);
    } else {
        const params = [{
            filterType: 'shockwave',
            filterId: id,
            time: 0,
            amplitude: 8,
            wavelength: 75,
            radius: 500,
            brightness: 1.5,
            speed: 25,
            padding: 0,
            animated: {
                time: {
                    animType: 'cosOscillation',
                    active: true,
                    loopDuration: 1800,
                    val1: 0,
                    val2: 10,
                },
            },
        }];
        await TokenMagic.addUpdateFiltersOnSelected(params);
    }
};
toggle();
