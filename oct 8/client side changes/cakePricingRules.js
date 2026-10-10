// Cake pricing rules and configuration definitions for client

export const SIDE_SECTIONS = [
  {
    id: 'checkeredPattern',
    title: 'Checkered Pattern',
    description: 'Geometric checkerboard and diagonal grid side wraps',
    items: [
      { id: 'wholeCake', key: 'checkeredPattern.wholeCake', label: 'Full Pattern', defaultPrice: 150 },
      { id: 'sidesOnly', key: 'checkeredPattern.sidesOnly', label: 'Left Diagonal', defaultPrice: 100 },
      { id: 'xPattern', key: 'checkeredPattern.xPattern', label: 'X Pattern', defaultPrice: 110 },
      { id: 'rightDiagonal', key: 'checkeredPattern.rightDiagonal', label: 'Right Diagonal', defaultPrice: 100 },
      { id: 'parallelOuter', key: 'checkeredPattern.parallelOuter', label: 'Parallel Lines — Outer', defaultPrice: 100 },
      { id: 'parallelInner', key: 'checkeredPattern.parallelInner', label: 'Parallel Lines — Inner', defaultPrice: 100 },
    ],
  },
  {
    id: 'trianglePattern',
    title: 'Triangle Pattern',
    description: 'Geometric triangular mosaic side wraps',
    items: [
      { id: 'wholeCake', key: 'trianglePattern.wholeCake', label: 'Full Pattern', defaultPrice: 150 },
      { id: 'sidesOnly', key: 'trianglePattern.sidesOnly', label: 'Left Diagonal', defaultPrice: 100 },
      { id: 'xPattern', key: 'trianglePattern.xPattern', label: 'X Pattern', defaultPrice: 110 },
      { id: 'rightDiagonal', key: 'trianglePattern.rightDiagonal', label: 'Right Diagonal', defaultPrice: 100 },
      { id: 'parallelOuter', key: 'trianglePattern.parallelOuter', label: 'Parallel Lines — Outer', defaultPrice: 100 },
      { id: 'parallelInner', key: 'trianglePattern.parallelInner', label: 'Parallel Lines — Inner', defaultPrice: 100 },
    ],
  },
  {
    id: 'chevronPattern',
    title: 'Chevron Pattern',
    description: 'Dynamic chevron and zigzag stripe wraps',
    items: [
      { id: 'multiColor', key: 'chevronPattern.multiColor', label: 'Multi-Color', defaultPrice: 125 },
      { id: 'singleColor', key: 'chevronPattern.singleColor', label: 'Single Color', defaultPrice: 105 },
      { id: 'twoTone', key: 'chevronPattern.twoTone', label: 'Two-Tone', defaultPrice: 115 },
      { id: 'wideZigzag', key: 'chevronPattern.wideZigzag', label: 'Wide Zigzag', defaultPrice: 120 },
      { id: 'tightZigzag', key: 'chevronPattern.tightZigzag', label: 'Tight Zigzag', defaultPrice: 130 },
      { id: 'singleColorGapped', key: 'chevronPattern.singleColorGapped', label: 'Single Color, Gapped', defaultPrice: 95 },
    ],
  },
  {
    id: 'scatterPearls',
    title: 'Scatter Pearls',
    description: 'Elegant sugar pearl arrangements and grids',
    items: [
      { id: 'randomScatter', key: 'scatterPearls.randomScatter', label: 'Random Scatter', defaultPrice: 95 },
      { id: 'diamondGrid', key: 'scatterPearls.diamondGrid', label: 'Diamond Grid', defaultPrice: 105 },
      { id: 'horizontalRows', key: 'scatterPearls.horizontalRows', label: 'Horizontal Rows', defaultPrice: 100 },
      { id: 'diamondGridBorder', key: 'scatterPearls.diamondGridBorder', label: 'Diamond Grid Border', defaultPrice: 90 },
      { id: 'bigPearlsScatter', key: 'scatterPearls.bigPearlsScatter', label: 'Big Pearls Scatter', defaultPrice: 115 },
      { id: 'smallPearlsScatter', key: 'scatterPearls.smallPearlsScatter', label: 'Small Pearls Scatter', defaultPrice: 90 },
    ],
  },
  {
    id: 'pipingScrolls',
    title: 'Piping Scrolls',
    description: 'Delicate hand-piped scrollwork and flourishes',
    items: [
      { id: 'waveRope', key: 'pipingScrolls.waveRope', label: 'Continuous Wave Rope', defaultPrice: 105 },
      { id: 'pairedScrolls', key: 'pipingScrolls.pairedScrolls', label: 'Paired Opposing Scrolls', defaultPrice: 110 },
      { id: 'fleurDeLisRow', key: 'pipingScrolls.fleurDeLisRow', label: 'Fleur-de-lis Row', defaultPrice: 115 },
      { id: 'shellBorderRow', key: 'pipingScrolls.shellBorderRow', label: 'Shell Border Row', defaultPrice: 110 },
      { id: 'vineAndTendrils', key: 'pipingScrolls.vineAndTendrils', label: 'Vine and Tendrils', defaultPrice: 120 },
      { id: 'loopChain', key: 'pipingScrolls.loopChain', label: 'Interlocking Loop Chain', defaultPrice: 115 },
    ],
  },
  {
    id: 'sunshinePlay',
    title: 'Sunshine Play',
    description: 'Whimsical rainbow, cloud, and star burst accents',
    items: [
      { id: 'rainbowArc', key: 'sunshinePlay.rainbowArc', label: 'Rainbow Arc', defaultPrice: 140 },
      { id: 'cloudyChump', key: 'sunshinePlay.cloudyChump', label: 'Cloudy Champ', defaultPrice: 130 },
      { id: 'starBurst', key: 'sunshinePlay.starBurst', label: 'Star Burst', defaultPrice: 125 },
      { id: 'assortedStarBurst', key: 'sunshinePlay.assortedStarBurst', label: 'Assorted Star Burst', defaultPrice: 135 },
      { id: 'starryRainbow', key: 'sunshinePlay.starryRainbow', label: 'Starry Rainbow', defaultPrice: 170 },
      { id: 'assortedStarryRainbow', key: 'sunshinePlay.assortedStarryRainbow', label: 'Assorted Starry Rainbow', defaultPrice: 180 },
    ],
  },
  {
    id: 'victorianLambeth',
    title: 'Victorian Lambeth',
    description: 'Traditional tiered over-piping and garland ropes',
    items: [
      { id: 'classic', key: 'victorianLambeth.classic', label: 'Classic', defaultPrice: 150 },
      { id: 'noRosette', key: 'victorianLambeth.noRosette', label: 'No Rosette', defaultPrice: 125 },
      { id: 'ropesOnly', key: 'victorianLambeth.ropesOnly', label: 'Ropes Only', defaultPrice: 100 },
      { id: 'noRopes', key: 'victorianLambeth.noRopes', label: 'No Ropes', defaultPrice: 130 },
      { id: 'doubleBand', key: 'victorianLambeth.doubleBand', label: 'Double Band', defaultPrice: 175 },
      { id: 'tripleBand', key: 'victorianLambeth.tripleBand', label: 'Triple Band', defaultPrice: 210 },
    ],
  },
];

export const EDGE_SECTIONS = [
  {
    id: 'borderPiping',
    title: 'Border Piping',
    description: 'Classic and alternating piped rim borders',
    items: [
      { id: 'shell', label: 'Shell Border', defaultPrice: 150 },
      { id: 'reverseShell', label: 'Reverse Shell', defaultPrice: 150 },
      { id: 'bead', label: 'Bead Piping', defaultPrice: 150 },
      { id: 'ropeTwist', label: 'Rope Twist', defaultPrice: 150 },
      { id: 'ropeTwistClassic', label: 'Rope Twist Classic', defaultPrice: 150 },
      { id: 'elongatedShell', label: 'Elongated Shell Border', defaultPrice: 150 },
      { id: 'shellAlt', label: 'Shell Border - Alternating', defaultPrice: 160 },
      { id: 'reverseShellAlt', label: 'Reverse Shell - Alternating', defaultPrice: 160 },
      { id: 'beadAlt', label: 'Bead Piping - Alternating', defaultPrice: 160 },
      { id: 'ropeTwistAlt', label: 'Rope Twist - Alternating', defaultPrice: 160 },
      { id: 'ropeTwistClassicAlt', label: 'Rope Twist Classic - Alternating', defaultPrice: 160 },
      { id: 'elongatedShellAlt', label: 'Elongated Shell Border - Alternating', defaultPrice: 160 },
    ],
  },
  {
    id: 'beadedTrim',
    title: 'Beaded Trim',
    description: 'Petite and rhythmic beaded edge trims',
    items: [
      { id: 'beadedTrim', label: 'Beaded Trim', defaultPrice: 100 },
      { id: 'beadedTrimPetite', label: 'Petite Beaded Trim', defaultPrice: 100 },
      { id: 'beadedTrimGrand', label: 'Grand Beaded Trim', defaultPrice: 110 },
      { id: 'beadedTrimMorseDotDashDot', label: 'Morse Dot-Dash-Dot', defaultPrice: 105 },
      { id: 'beadedTrimMorseDotDash', label: 'Morse Alternating', defaultPrice: 105 },
      { id: 'beadedTrimMorseDotDotDash', label: 'Morse Double-Dot Dash', defaultPrice: 105 },
    ],
  },
  {
    id: 'dollops',
    title: 'Dollops',
    description: 'Star and round tip dollop rings with optional cherries',
    items: [
      { id: 'starDollopContinuous', label: 'Continuous Star Dollop', defaultPrice: 140 },
      { id: 'starDollop', label: 'Star Dollop', defaultPrice: 130 },
      { id: 'starDollopSparse', label: 'Sparse Star Dollop', defaultPrice: 100 },
      { id: 'roundDollop', label: 'Continuous Round Tip Dollop', defaultPrice: 140 },
      { id: 'roundDollopMedium', label: 'Round Tip Dollop', defaultPrice: 130 },
      { id: 'roundDollopSparse', label: 'Sparse Round Tip Dollop', defaultPrice: 100 },
      { id: 'starDollopContinuousCherry', label: 'Continuous Star Dollop with Cherry', defaultPrice: 175 },
      { id: 'starDollopCherry', label: 'Star Dollop with Cherry', defaultPrice: 165 },
      { id: 'starDollopSparseCherry', label: 'Sparse Star Dollop with Cherry', defaultPrice: 135 },
      { id: 'roundDollopCherry', label: 'Continuous Round Tip Dollop with Cherry', defaultPrice: 175 },
      { id: 'roundDollopMediumCherry', label: 'Round Tip Dollop with Cherry', defaultPrice: 165 },
      { id: 'roundDollopSparseCherry', label: 'Sparse Round Tip Dollop with Cherry', defaultPrice: 135 },
      { id: 'starDollopContinuousAlt', label: 'Continuous Star Dollop - Alternating', defaultPrice: 150 },
      { id: 'starDollopAlt', label: 'Star Dollop - Alternating', defaultPrice: 140 },
      { id: 'starDollopSparseAlt', label: 'Sparse Star Dollop - Alternating', defaultPrice: 110 },
      { id: 'roundDollopAlt', label: 'Continuous Round Tip Dollop - Alternating', defaultPrice: 150 },
      { id: 'roundDollopMediumAlt', label: 'Round Tip Dollop - Alternating', defaultPrice: 140 },
      { id: 'roundDollopSparseAlt', label: 'Sparse Round Tip Dollop - Alternating', defaultPrice: 110 },
      { id: 'starDollopContinuousAltCherry', label: 'Continuous Star Dollop - Alternating with Cherry', defaultPrice: 185 },
      { id: 'starDollopAltCherry', label: 'Star Dollop - Alternating with Cherry', defaultPrice: 175 },
      { id: 'starDollopSparseAltCherry', label: 'Sparse Star Dollop - Alternating with Cherry', defaultPrice: 145 },
      { id: 'roundDollopAltCherry', label: 'Continuous Round Tip Dollop - Alternating with Cherry', defaultPrice: 185 },
      { id: 'roundDollopMediumAltCherry', label: 'Round Tip Dollop - Alternating with Cherry', defaultPrice: 175 },
      { id: 'roundDollopSparseAltCherry', label: 'Sparse Round Tip Dollop - Alternating with Cherry', defaultPrice: 145 },
    ],
  },
  {
    id: 'whippedCreamRosettes',
    title: 'Whipped Cream Rosettes',
    description: 'Swirled rosettes in solid, alternating, and cherry variations',
    items: [
      { id: 'whippedCreamRosetteContinuous', label: 'Continuous Whipped Cream Rosettes', defaultPrice: 150 },
      { id: 'whippedCreamRosette', label: 'Whipped Cream Rosettes', defaultPrice: 130 },
      { id: 'whippedCreamRosetteContinuousAlt', label: 'Continuous Whipped Cream Rosettes - Alternating', defaultPrice: 160 },
      { id: 'whippedCreamRosetteAlt', label: 'Whipped Cream Rosettes - Alternating', defaultPrice: 140 },
      { id: 'whippedCreamRosetteContinuousCherry', label: 'Continuous Whipped Cream Rosettes with Cherry', defaultPrice: 185 },
      { id: 'whippedCreamRosetteCherry', label: 'Whipped Cream Rosettes with Cherry', defaultPrice: 165 },
    ],
  },
  {
    id: 'edibleDelicates',
    title: 'Edible Delicates',
    description: 'Full rings of confectionery chocolates and fresh cherries',
    items: [
      { id: 'hersheysKissRim', label: "Hershey's Kisses Rim", defaultPrice: 160 },
      { id: 'hersheysKissRimSparse', label: 'Hershey and Ferrero', defaultPrice: 140 },
      { id: 'ferreroRocherRim', label: 'Ferrero Rocher Rim', defaultPrice: 170 },
      { id: 'ferreroRocherRimSparse', label: 'Ferrero and Cherry', defaultPrice: 150 },
      { id: 'cherryRim', label: 'Cherry Rim', defaultPrice: 160 },
      { id: 'cherryRimSparse', label: 'Cherry and Hershey', defaultPrice: 140 },
    ],
  },
];

export const DRIP_SECTIONS = [
  {
    id: 'dripPatterns',
    title: 'Drip Patterns',
    description: 'Poured glaze coats and dripping silhouette patterns',
    items: [
      { id: 'longGaps', label: 'Long Drips', defaultPrice: 100 },
      { id: 'longShortAlt', label: 'Long & Short Drips', defaultPrice: 110 },
      { id: 'shortDrips', label: 'Short Drips', defaultPrice: 90 },
      { id: 'longWave', label: 'Full Coverage', defaultPrice: 120 },
      { id: 'midWave', label: 'Mid Coverage', defaultPrice: 105 },
      { id: 'shortWave', label: 'Short Coverage', defaultPrice: 95 },
    ],
  },
];

export const DEFAULT_DRIP_RATES = Object.fromEntries(
  DRIP_SECTIONS.flatMap((s) => s.items.map((it) => [it.id, it.defaultPrice]))
);

export const DEFAULT_SIDE_RATES = Object.fromEntries(
  SIDE_SECTIONS.flatMap((s) => s.items.map((it) => [it.key, it.defaultPrice]))
);

export const DEFAULT_EDGE_RATES = Object.fromEntries(
  EDGE_SECTIONS.flatMap((s) => s.items.map((it) => [it.id, it.defaultPrice]))
);

export const DEFAULT_RATES = {
  sponge: {
    naked: { big: 1500, small: 700 }, // 8x5 | 6x4
    frosted: { big: 1700, small: 1000 }, // Frosted
    textured: { big: 1700, small: 1000 }, // Textured
  },
  twoTier: { naked: 2200, frosted: 2700, textured: 2700 },
  glazePerTier: 100,

  // Independent Drip Item Rates:
  drip: { ...DEFAULT_DRIP_RATES },

  // Independent Side Item Rates:
  side: { ...DEFAULT_SIDE_RATES },

  // Independent Edge Item Rates:
  edge: { ...DEFAULT_EDGE_RATES },

  // Backwards compatibility tier fallbacks
  sideEdge: { small: 100, big: 150 },

  center: {
    brackets: {
      strawberry: [{ maxQty: 4, price: 150 }, { maxQty: 10, price: 200 }],
      cherry: [{ maxQty: 4, price: 175 }, { maxQty: 10, price: 250 }],
      blueberry: [{ maxQty: 4, price: 150 }, { maxQty: 10, price: 200 }],
      mangoCube: [{ maxQty: 4, price: 150 }, { maxQty: 12, price: 200 }],
      ferreroRocher: [{ maxQty: 3, price: 60 }, { maxQty: 8, price: 120 }],
      oreo: [{ maxQty: 4, price: 8 }, { maxQty: 8, price: 15 }],
      hersheysKisses: [{ maxQty: 4, price: 37 }, { maxQty: 9, price: 74 }],
      fondantBalls: [{ maxQty: 3, price: 50 }, { maxQty: 8, price: 100 }],
      buttercreamText: [
        { maxQty: 10, price: 50 },
        { maxQty: 20, price: 100 },
        { maxQty: 30, price: 150 },
        { maxQty: 40, price: 200 },
        { maxQty: 50, price: 250 },
      ],
    },
    perPiece: {
      chocolateBear: 200,
    },
  },
};

export const CENTER_DECORATION_META = {
  strawberry: { label: 'Strawberry', unit: 'pcs', description: 'Fresh strawberries placed in center' },
  cherry: { label: 'Cherry', unit: 'pcs', description: 'Maraschino cherries' },
  blueberry: { label: 'Blueberry', unit: 'pcs', description: 'Fresh blueberries placed in center' },
  mangoCube: { label: 'Mango Cube', unit: 'pcs', description: 'Fresh diced mango cubes placed in center' },
  ferreroRocher: { label: 'Ferrero Rocher', unit: 'pcs', description: 'Hazelnut chocolates' },
  oreo: { label: 'Oreo', unit: 'pcs', description: 'Standing / flat cookies' },
  hersheysKisses: { label: "Hershey's Kisses", unit: 'pcs', description: 'Chocolate kisses' },
  fondantBalls: { label: 'Fondant Balls (Sports)', unit: 'pcs', description: 'Basketball & Soccer balls' },
};

export const CENTER_PER_PIECE_META = {
  chocolateBear: { label: 'Chocolate Bear', unit: 'piece', description: 'Large sculpted chocolate figure' },
};

export const TEXT_PRICING_META = {
  buttercreamText: { label: '3D Fondant Text', unit: 'letters', description: '3D standing fondant letters' },
};

export const CENTER_ITEM_META = {
  ...CENTER_DECORATION_META,
  ...TEXT_PRICING_META,
  ...CENTER_PER_PIECE_META,
};

