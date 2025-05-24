let params = [
  {
    filterType: "ray",
    filterId: "myRay",
    time: 0,
    color: 0xcf00cf,
    alpha: 0.2,
    divisor: 32,
    anchorX: 0,
    anchorY: 0,
    animated: {
      time: {
        active: true,
        speed: 0.0005,
        animType: "move",
      },
    },
  },
];
await TokenMagic.addUpdateFiltersOnSelected(params);