'use strict';

const { isPetitsFourStructure } = require('../../lib/cakeConfig');

// Cake pricing rules — draft. Pure functions, no I/O: give it the designer's
// (new-format) config and a rates table, get back the same shape the quote
// endpoint already returns to the frontend:
//   { lineItems: [{ componentKey, label, quantity, unitPriceMinor, lineTotalMinor }],
//     totalMinor, warnings: [...] }
// Anything without a configured price is priced at 0 and reported in
// `warnings` (same behavior PricingPanel already explains to the customer).
//
// All rates below are in PESOS for readability; everything returned is in
// minor units (centavos).
//
// `null` in a rates table means "not decided yet" — see the TODO list in the
// hand-off message. Nothing in here guesses a price.

// Dollops row of the Edge tab: solid + alternating, plain / cherry /
// strawberry (mirrors DOLLOPS_VARIATIONS_DELUXE in cakeConfig.js).
function dollopIds() {
  const bases = ['starDollopContinuous', 'starDollop', 'starDollopSparse', 'roundDollop', 'roundDollopMedium', 'roundDollopSparse'];
  const ids = [];
  for (const alt of ['', 'Alt']) {
    for (const topping of ['', 'Cherry', 'Strawberry']) {
      for (const base of bases) ids.push(`${base}${alt}${topping}`);
    }
  }
  return ids;
}

const SIDE_SECTIONS = [
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

const EDGE_SECTIONS = [
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

const DRIP_SECTIONS = [
  {
    id: 'dripPatterns',
    title: 'Drip Patterns',
    description: 'Poured glaze coats and dripping silhouette patterns',
    items: [
      { id: 'naturalTear', label: 'Natural Tear', defaultPrice: 100 },
      { id: 'naturalTear2', label: 'Natural Tear 2', defaultPrice: 100 },
      { id: 'longGaps', label: 'Long Drips', defaultPrice: 100 },
      { id: 'longShortAlt', label: 'Long & Short Drips', defaultPrice: 110 },
      { id: 'shortDrips', label: 'Short Drips', defaultPrice: 90 },
      { id: 'longWave', label: 'Full Coverage', defaultPrice: 120 },
      { id: 'midWave', label: 'Mid Coverage', defaultPrice: 105 },
      { id: 'shortWave', label: 'Short Coverage', defaultPrice: 95 },
    ],
  },
];

const DEFAULT_DRIP_RATES = Object.fromEntries(
  DRIP_SECTIONS.flatMap((s) => s.items.map((it) => [it.id, it.defaultPrice]))
);

const DEFAULT_SIDE_RATES = Object.fromEntries(
  SIDE_SECTIONS.flatMap((s) => s.items.map((it) => [it.key, it.defaultPrice]))
);

const DEFAULT_EDGE_RATES = Object.fromEntries(
  EDGE_SECTIONS.flatMap((s) => s.items.map((it) => [it.id, it.defaultPrice]))
);

const DEFAULT_RATES = {
  // One tier on its own. Filling is part of the sponge price (no charge).
  // Any flavor costs the same.
  sponge: {
    naked: { classicCube: 400, largeCube: 600, miniBento: 350, standardBento: 450, largeBento: 550, '6x6': 700, '8x8': 1500, '10x10': 2200, '12x12': 3000, big: 1500, small: 700 }, // Petits Four, Bento, 6x6, 8x8, 10x10, 12x12
    frosted: { classicCube: 500, largeCube: 800, miniBento: 500, standardBento: 600, largeBento: 750, '6x6': 1000, '8x8': 1700, '10x10': 2500, '12x12': 3400, big: 1700, small: 1000 }, // Frosted
    textured: { classicCube: 500, largeCube: 800, miniBento: 500, standardBento: 600, largeBento: 750, '6x6': 1000, '8x8': 1700, '10x10': 2500, '12x12': 3400, big: 1700, small: 1000 }, // Textured
  },
  // Two tiers: 8x5 bottom + 6x4 top, priced as a set.
  // Naked: 1500 + 700 = 2200. Frosted / Textured: 1700 + 1000 = 2700.
  twoTier: { naked: 2200, frosted: 2700, textured: 2700 },

  // Glaze / drip: any tier, any flavor, any design.
  glazePerTier: 100,

  // Independent Drip Item Rates:
  drip: { ...DEFAULT_DRIP_RATES },

  // Independent Side Item Rates:
  side: { ...DEFAULT_SIDE_RATES },

  // Independent Edge Item Rates:
  edge: { ...DEFAULT_EDGE_RATES },

  // Legacy tier rates for backwards compatibility
  sideEdge: { small: 100, big: 150 },
  // Side keys are `${side.mode}.${setId}`.
  sideQuantity: {
    'checkeredPattern.wholeCake': 'big',
    'checkeredPattern.xPattern': 'big',
    'checkeredPattern.sidesOnly': 'small',
    'checkeredPattern.rightDiagonal': 'small',
    'checkeredPattern.parallelOuter': 'small',
    'checkeredPattern.parallelInner': 'small',
    'trianglePattern.wholeCake': 'big',
    'trianglePattern.xPattern': 'big',
    'trianglePattern.sidesOnly': 'small',
    'trianglePattern.rightDiagonal': 'small',
    'trianglePattern.parallelOuter': 'small',
    'trianglePattern.parallelInner': 'small',
    'chevronPattern.multiColor': 'big',
    'chevronPattern.singleColor': 'big',
    'chevronPattern.twoTone': 'big',
    'chevronPattern.wideZigzag': 'big',
    'chevronPattern.tightZigzag': 'big',
    'chevronPattern.singleColorGapped': 'small',
    'scatterPearls.randomScatter': 'big',
    'scatterPearls.diamondGrid': 'big',
    'scatterPearls.horizontalRows': 'big',
    'scatterPearls.bigPearlsScatter': 'big',
    'scatterPearls.smallPearlsScatter': 'big',
    'scatterPearls.diamondGridBorder': 'small',
    'pipingScrolls.waveRope': 'small',
    'pipingScrolls.pairedScrolls': 'small',
    'pipingScrolls.fleurDeLisRow': 'small',
    'pipingScrolls.shellBorderRow': 'small',
    'pipingScrolls.vineAndTendrils': 'small',
    'pipingScrolls.loopChain': 'small',
    'sunshinePlay.rainbowArc': 'small',
    'sunshinePlay.cloudyChump': 'small',
    'sunshinePlay.starBurst': 'big',
    'sunshinePlay.assortedStarBurst': 'big',
    'sunshinePlay.starryRainbow': 'big',
    'sunshinePlay.assortedStarryRainbow': 'big',
    'victorianLambeth.classic': 'big',
    'victorianLambeth.noRosette': 'big',
    'victorianLambeth.ropesOnly': 'big',
    'victorianLambeth.noRopes': 'big',
    'victorianLambeth.doubleBand': 'big',
    'victorianLambeth.tripleBand': 'big',
  },
  // Edge keys are the piping tip id. Border Piping (solid + alternating) is
  // big, Beaded Trim is small, Dollops are big except the sparse (8 pc)
  // ones.
  edgeQuantity: {
    ...Object.fromEntries(['shell', 'reverseShell', 'bead', 'ropeTwist', 'ropeTwistClassic', 'elongatedShell',
      'shellAlt', 'reverseShellAlt', 'beadAlt', 'ropeTwistAlt', 'ropeTwistClassicAlt', 'elongatedShellAlt'].map((id) => [id, 'big'])),
    ...Object.fromEntries(['beadedTrim', 'beadedTrimPetite', 'beadedTrimGrand', 'beadedTrimMorseDotDashDot',
      'beadedTrimMorseDotDash', 'beadedTrimMorseDotDotDash'].map((id) => [id, 'small'])),
    ...Object.fromEntries(dollopIds().map((id) => [id, /Sparse/.test(id) ? 'small' : 'big'])),
    hersheysKissRim: 'big',
    hersheysKissRimSparse: 'small',
    ferreroRocherRim: 'big',
    ferreroRocherRimSparse: 'small',
    cherryRim: 'big',
    cherryRimSparse: 'small',
  },

  // Center is priced by quantity BRACKET, not per piece: 1-4 pcs cost one
  // price, 5-10 pcs the next, and so on. `maxQty` is inclusive, and the last
  // bracket's maxQty is the most of that item the designer should allow.
  //   brackets[key] = [{ maxQty, price }, ...]  (ascending)
  //   perPiece[key] = price for EACH piece (not bracketed)
  // Keys: designIds from CENTER_PLACEABLE_DESIGNS, except basketball and
  // soccerball share one 'fondantBalls' count, plus
  //   buttercreamText (placed letters, counted in letters)
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

const DESIGN_LABELS = {
  strawberry: 'Strawberry',
  cherry: 'Cherry',
  blueberry: 'Blueberry',
  mangoCube: 'Mango Cube',
  mango: 'Mango Cube',
  ferreroRocher: 'Ferrero Rocher',
  hersheysKisses: "Hershey's Kiss",
  oreo: 'Oreo',
  chocolateBear: 'Chocolate Bear',
  fondantBalls: 'Fondant Ball',
  buttercreamText: '3D Fondant Text',
};

const centavos = (pesos) => Math.round(pesos * 100);
const frostClass = (style) => {
  if (style === 'naked' || !style) return 'naked';
  if (style === 'texturedButtercream' || style === 'textured') return 'textured';
  return 'frosted';
};

function bracketPrice(brackets, quantity) {
  if (!Array.isArray(brackets) || brackets.length === 0) return { price: null, reason: 'no price configured' };
  const hit = brackets.find((b) => quantity <= b.maxQty);
  if (!hit) {
    const highest = brackets[brackets.length - 1];
    if (highest && typeof highest.price === 'number') {
      return { price: highest.price, bracket: highest };
    }
    return { price: null, reason: `${quantity} pcs is above the highest configured bracket` };
  }
  return { price: hit.price, bracket: hit };
}

function calculateCakePrice(config, rates = DEFAULT_RATES) {
  const lineItems = [];
  const warnings = [];
  const add = (componentKey, label, unitPricePesos, quantity = 1, details = null) => {
    const unitPriceMinor = centavos(unitPricePesos);
    const item = { componentKey, label, quantity, unitPriceMinor, lineTotalMinor: unitPriceMinor * quantity };
    if (details) item.details = details;
    lineItems.push(item);
  };
  const missing = (label, reason) => warnings.push({ label, reason });

  const structure = config.structure || {};
  const tiers = structure.layers === 2 ? 2 : 1;
  const isPetitsFour = isPetitsFourStructure(structure);
  const isIndividual = structure.layerDesign === 'individual' && (tiers > 1 || isPetitsFour);
  const exterior = config.exteriorFinish || {};
  const styleOfTier = (i) => (isIndividual ? (exterior.layerStyles || [])[i] : exterior.style) || exterior.style || 'naked';

  // ── Fundamentals: sponge (filling included) ────────────────────────────
  const finishLabel = (cls) => (cls === 'naked' ? 'Naked' : cls === 'textured' ? 'Textured' : 'Frosted');
  const title = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getTierSpecs = (tierIndex = 0, sizeClass = '8x8', tierLabel = '1 Tier', finishCls = 'naked') => {
    const dims = sizeClass === 'classicCube' ? '1x1' : sizeClass === 'largeCube' ? '2x2' : sizeClass === 'miniBento' ? '3.5x2' : sizeClass === 'standardBento' ? '4x2' : sizeClass === 'largeBento' ? '5x3' : sizeClass === '12x12' ? '12x10' : sizeClass === '10x10' ? '10x8' : sizeClass === '6x6' || sizeClass === 'small' ? '6x4' : sizeClass === '4x4' ? '4x3' : sizeClass === '4x3' ? '4x3' : sizeClass === '6x4' ? '6x4' : sizeClass === '8x6' ? '8x6' : sizeClass === '10x8' ? '10x8' : '8x6';
    let finish = `${finishLabel(finishCls)} Finish`;
    if (finishCls === 'textured') {
      const textureId = isIndividual
        ? exterior.layerButtercreamTextures?.[tierIndex] || exterior.buttercreamTexture
        : exterior.buttercreamTexture;
      const textureName = textureId === 'ribbonWrap'
        ? 'Ribbon Wrap'
        : (textureId === 'ridged' || !textureId)
        ? 'Ridge Comb'
        : title(textureId);
      finish = `Textured: ${textureName}`;
    }
    const sponge = isIndividual
      ? config.sponge?.layerFlavors?.[tierIndex] || config.sponge?.flavor
      : config.sponge?.flavor;
    const spongeName = `${title(sponge || 'Vanilla')} Sponge`;

    const fillingEnabled = config.filling?.enabled !== false;
    const fillingLayers = config.filling?.layers || 1;
    const fillingFlavor = isIndividual
      ? config.filling?.layerFlavors?.[tierIndex] || config.filling?.flavor
      : config.filling?.flavor;
    const fillingName = fillingEnabled
      ? `Filling: ${title(fillingFlavor || 'Vanilla')} (${fillingLayers} ${fillingLayers === 1 ? 'Layer' : 'Layers'})`
      : 'Filling: None';

    const piping = config.filling?.piping;
    const pipingTip = piping?.tip ? title(piping.tip) : 'None';

    const fillingSugar = (isIndividual ? config.sugarColorOverrides?.[`filling-${tierIndex}`] : null)
      || config.sugarColorOverrides?.filling;

    let rawPipingColor = null;
    if (fillingSugar?.mode === 'colorOverride' && fillingSugar?.colorId) {
      rawPipingColor = fillingSugar.colorId;
    } else if (config.sugarColor?.mode === 'colorOverride' && config.sugarColor?.colorId) {
      rawPipingColor = config.sugarColor.colorId;
    } else if (fillingSugar?.mode === 'default') {
      rawPipingColor = fillingFlavor || 'Vanilla';
    } else if (piping?.colorId && piping.colorId !== 'vanilla') {
      rawPipingColor = piping.colorId;
    } else {
      rawPipingColor = fillingFlavor || piping?.colorId || 'Vanilla';
    }

    const pipingColor = title(rawPipingColor || 'Vanilla');

    return [
      tierLabel,
      dims,
      finish,
      spongeName,
      fillingName,
      `Piping Design: ${pipingTip}`,
      `Piping Sugar Color: ${pipingColor}`,
    ];
  };

  if (isPetitsFour) {
    const size = structure.size || 'classicCube';
    if (!isIndividual) {
      const cls = frostClass(styleOfTier(0));
      const price = rates.sponge?.[cls]?.[size] ?? rates.sponge?.[cls]?.classicCube ?? 500;
      const dims = size === 'largeCube' ? '2" Cube (4 pcs)' : '1" Cube (4 pcs)';
      const specs = getTierSpecs(0, size, 'Petits Four (4 pcs)', cls);
      add('sponge', `Petits Four Set — ${finishLabel(cls)} (${dims})`, price, 1, specs);
    } else {
      for (let p = 0; p < 4; p++) {
        const cls = frostClass(styleOfTier(p));
        const fullPrice = rates.sponge?.[cls]?.[size] ?? rates.sponge?.[cls]?.classicCube ?? 500;
        const piecePrice = Math.round(fullPrice / 4);
        const dims = size === 'largeCube' ? '2" Cube' : '1" Cube';
        const specs = getTierSpecs(p, size, `Variant ${p + 1}`, cls);
        add(`sponge-variation-${p}`, `Petit Four — Variant ${p + 1} (${finishLabel(cls)}, ${dims})`, piecePrice, 1, specs);
      }
    }
  } else if (tiers === 1) {
    const cls = frostClass(styleOfTier(0));
    const size = structure.size || '8x8';
    const price = rates.sponge?.[cls]?.[size] ?? rates.sponge?.[cls]?.[size === '6x6' || size === 'small' ? 'small' : 'big'] ?? (cls === 'textured' ? (rates.sponge?.frosted?.[size] ?? rates.sponge?.frosted?.[size === '6x6' || size === 'small' ? 'small' : 'big']) : undefined);
    const dims = size === 'miniBento' ? '3.5x2' : size === 'standardBento' ? '4x2' : size === 'largeBento' ? '5x3' : size === '12x12' ? '12x10' : size === '10x10' ? '10x8' : size === '6x6' || size === 'small' ? '6x4' : '8x6';
    const specs = getTierSpecs(0, size, '1 Tier', cls);
    if (price == null) missing(`1 tier ${cls} sponge ${dims}`, 'no price configured');
    else add('sponge', `1 Tier ${finishLabel(cls)} Cake (${dims})`, price, 1, specs);
  } else {
    // 2 Tiers: Split into independent Bottom Tier and Top Tier line items
    const bottom = frostClass(styleOfTier(0));
    const top = frostClass(styleOfTier(1));
    const baseSize = structure.size || '8x8';
    const topSize = baseSize === '12x12' ? '10x8' : baseSize === '10x10' ? '8x6' : baseSize === '6x6' || baseSize === 'small' ? '4x3' : '6x4';
    const b = rates.sponge?.[bottom]?.[baseSize] ?? rates.sponge?.[bottom]?.big ?? (bottom === 'textured' ? (rates.sponge?.frosted?.[baseSize] ?? rates.sponge?.frosted?.big) : undefined);
    const t = rates.sponge?.[top]?.[topSize] ?? rates.sponge?.[top]?.small ?? (top === 'textured' ? (rates.sponge?.frosted?.[topSize] ?? rates.sponge?.frosted?.small) : undefined);

    if (b == null || t == null) {
      missing('2 tier sponge', 'no price configured');
    } else {
      const baseDims = baseSize === '12x12' ? '12x10' : baseSize === '10x10' ? '10x8' : baseSize === '6x6' || baseSize === 'small' ? '6x4' : '8x6';
      const topDims = baseSize === '12x12' ? '10x8' : baseSize === '10x10' ? '8x6' : baseSize === '6x6' || baseSize === 'small' ? '4x3' : '6x4';
      const d0 = getTierSpecs(0, baseSize, 'Bottom Tier', bottom);
      const d1 = getTierSpecs(1, topSize, 'Top Tier', top);
      add('sponge', `Bottom Tier ${finishLabel(bottom)} Cake (${baseDims})`, b, 1, d0);
      add('sponge-top', `Top Tier ${finishLabel(top)} Cake (${topDims})`, t, 1, d1);
    }
  }

  // ── Fundamentals: drip, per drip tier ──────────────────────────────────
  const surface = config.surfaceTreatment || {};
  if (tiers === 2) {
    const dripSlots = [
      { tierIdx: 1, slotKey: 'top', label: 'Drip Top' },
      { tierIdx: 0, slotKey: 'bottom', label: 'Drip Bottom' },
    ];
    for (const { tierIdx, slotKey, label } of dripSlots) {
      const tierSurface = isIndividual
        ? (surface.layerTreatments?.[tierIdx] || surface || {})
        : (surface || {});
      if (tierSurface.mode === 'glaze') {
        const patternId = tierSurface.pattern || 'naturalTear2';
        const specificDripPrice = rates.drip?.[patternId] ?? DEFAULT_DRIP_RATES[patternId] ?? rates.glazePerTier ?? 100;
        const dripLabel = DRIP_SECTIONS[0]?.items?.find((it) => it.id === patternId)?.label || title(patternId);
        if (specificDripPrice == null) {
          missing(`${label} — ${dripLabel}`, 'no price configured');
        } else {
          const colorId = config.sugarColorOverrides?.[`surface-${tierIdx}`]?.colorId
            || config.sugarColorOverrides?.surface?.colorId
            || config.sugarColorOverrides?.surfaceTreatment?.colorId
            || tierSurface.colorId
            || config.sugarColor?.colorId
            || 'vanilla';
          const colorText = title(colorId);

          const dripDetails = [
            `${label}:`,
            `Design: ${dripLabel}`,
            `Sugar Color: ${colorText}`,
          ];
          add(`glaze-${slotKey}`, `${label} — ${dripLabel}`, specificDripPrice, 1, dripDetails);
        }
      }
    }
  } else {
    // 1 Tier Drip
    if (surface.mode === 'glaze') {
      const patternId = surface.pattern || 'naturalTear2';
      const specificDripPrice = rates.drip?.[patternId] ?? DEFAULT_DRIP_RATES[patternId] ?? rates.glazePerTier ?? 100;
      const dripLabel = DRIP_SECTIONS[0]?.items?.find((it) => it.id === patternId)?.label || title(patternId);
      if (specificDripPrice == null) {
        missing('Drip', 'no price configured');
      } else {
        const colorId = config.sugarColorOverrides?.surface?.colorId
          || config.sugarColorOverrides?.surfaceTreatment?.colorId
          || surface.colorId
          || config.sugarColor?.colorId
          || 'vanilla';
        const colorText = title(colorId);

        const dripDetails = [
          'Drip:',
          `Design: ${dripLabel}`,
          `Sugar Color: ${colorText}`,
        ];
        add('glaze', `Drip — ${dripLabel}`, specificDripPrice, 1, dripDetails);
      }
    }
  }

  // ── Side: independent per tier ─────────────────────────────────────────
  if (tiers === 2) {
    for (let i = 0; i < 2; i++) {
      const tierLabel = i === 0 ? 'Bottom Tier' : 'Top Tier';
      const sideTier = isIndividual ? config.side?.layerTreatments?.[i] || config.side || {} : config.side || {};
      if (sideTier.mode) {
        const setId = sideTier[sideTier.mode]?.setId;
        const sideKey = `${sideTier.mode}.${setId}`;
        const specificPrice = rates.side?.[sideKey] ?? rates.side?.[sideTier.mode]?.[setId];
        const qty = rates.sideQuantity?.[sideKey];
        const legacyPrice = qty ? rates.sideEdge?.[qty] : null;
        const price = specificPrice !== undefined ? specificPrice : (legacyPrice ?? DEFAULT_SIDE_RATES[sideKey] ?? 100);
        if (price == null) {
          missing(`Side (${tierLabel}) — ${setId || sideTier.mode}`, 'no price configured for this design');
        } else {
          const sideItem = SIDE_SECTIONS.flatMap((s) => s.items).find((it) => it.key === sideKey || it.id === setId);
          const sideDesignLabel = sideItem?.label || title(setId || sideTier.mode);
          const sideColorId = config.sugarColorOverrides?.[`side-${i}`]?.colorId
            || config.sugarColorOverrides?.side?.colorId
            || sideTier[sideTier.mode]?.colorId
            || config.sugarColor?.colorId
            || 'vanilla';
          const sideFlavorId = sideTier[sideTier.mode]?.flavorId;
          const colorText = sideFlavorId && sideFlavorId !== sideColorId
            ? `${title(sideColorId)} / ${title(sideFlavorId)}`
            : title(sideColorId);

          const sideDetails = [
            `Side (${tierLabel}):`,
            `Design: ${sideDesignLabel}`,
            `Sugar Color: ${colorText}`,
          ];
          add(`side-${i === 0 ? 'bottom' : 'top'}`, `Side (${tierLabel}) — ${sideDesignLabel}`, price, 1, sideDetails);
        }
      }
    }
  } else {
    // 1 Tier Side
    const side = config.side || {};
    if (side.mode) {
      const setId = side[side.mode]?.setId;
      const sideKey = `${side.mode}.${setId}`;
      const specificPrice = rates.side?.[sideKey] ?? rates.side?.[side.mode]?.[setId];
      const qty = rates.sideQuantity?.[sideKey];
      const legacyPrice = qty ? rates.sideEdge?.[qty] : null;
      const price = specificPrice !== undefined ? specificPrice : (legacyPrice ?? DEFAULT_SIDE_RATES[sideKey] ?? 100);
      if (price == null) {
        missing(`Side — ${setId || side.mode}`, 'no price configured for this design');
      } else {
        const sideItem = SIDE_SECTIONS.flatMap((s) => s.items).find((it) => it.key === sideKey || it.id === setId);
        const sideDesignLabel = sideItem?.label || title(setId || side.mode);
        const sideColorId = config.sugarColorOverrides?.side?.colorId || side[side.mode]?.colorId || config.sugarColor?.colorId || 'vanilla';
        const sideFlavorId = side[side.mode]?.flavorId;
        const colorText = sideFlavorId && sideFlavorId !== sideColorId
          ? `${title(sideColorId)} / ${title(sideFlavorId)}`
          : title(sideColorId);

        const sideDetails = [
          'Side:',
          `Design: ${sideDesignLabel}`,
          `Sugar Color: ${colorText}`,
        ];
        add('side', `Side — ${sideDesignLabel}`, price, 1, sideDetails);
      }
    }
  }

  // ── Edge: independent per slot (Edge Top, Edge Middle, Edge Bottom) ────
  const edge = config.edge || {};
  const isBoth = edge.mode === 'both';
  const slotsToProcess = [];

  if (isBoth) {
    if (edge.both && (edge.both.piping?.tip || edge.both.decorations?.setId)) {
      slotsToProcess.push({ slotKey: 'top', slotLabel: 'Edge Top', slotData: edge.both });
      if (tiers > 1) {
        const midData = edge.middle && (edge.middle.piping?.tip || edge.middle.decorations?.setId) ? edge.middle : edge.both;
        slotsToProcess.push({ slotKey: 'middle', slotLabel: 'Edge Middle', slotData: midData });
      }
      slotsToProcess.push({ slotKey: 'bottom', slotLabel: 'Edge Bottom', slotData: edge.both });
    }
  } else {
    if (edge.top && (edge.top.piping?.tip || edge.top.decorations?.setId)) {
      slotsToProcess.push({ slotKey: 'top', slotLabel: 'Edge Top', slotData: edge.top });
    }
    if (tiers > 1 && edge.middle && (edge.middle.piping?.tip || edge.middle.decorations?.setId)) {
      slotsToProcess.push({ slotKey: 'middle', slotLabel: 'Edge Middle', slotData: edge.middle });
    }
    if (edge.bottom && (edge.bottom.piping?.tip || edge.bottom.decorations?.setId)) {
      slotsToProcess.push({ slotKey: 'bottom', slotLabel: 'Edge Bottom', slotData: edge.bottom });
    }
  }

  for (const { slotKey, slotLabel, slotData } of slotsToProcess) {
    const tip = slotData.piping?.tip || slotData.decorations?.setId;
    if (!tip) continue;

    const specificPrice = rates.edge?.[tip];
    const legacyQty = rates.edgeQuantity?.[tip];
    const legPrice = legacyQty ? rates.sideEdge?.[legacyQty] : null;
    const price = specificPrice !== undefined ? specificPrice : (legPrice ?? DEFAULT_EDGE_RATES[tip] ?? 150);

    if (price == null) {
      missing(`${slotLabel} — ${tip}`, 'no price configured for this design');
    } else {
      const edgeItem = EDGE_SECTIONS.flatMap((s) => s.items).find((it) => it.id === tip);
      const edgeDesignLabel = edgeItem?.label || title(tip);

      const slotOverride = slotKey === 'top'
        ? (config.sugarColorOverrides?.edgeTop?.colorId || config.sugarColorOverrides?.edgeBoth?.colorId)
        : slotKey === 'middle'
        ? (config.sugarColorOverrides?.edgeMiddle?.colorId || config.sugarColorOverrides?.edgeBoth?.colorId)
        : (config.sugarColorOverrides?.edgeBottom?.colorId || config.sugarColorOverrides?.edgeBoth?.colorId);

      const edgeColorId = slotOverride
        || config.sugarColorOverrides?.edge?.colorId
        || slotData.piping?.colorId
        || slotData.decorations?.colorId
        || config.sugarColor?.colorId
        || 'vanilla';

      const secOverride = slotKey === 'top'
        ? (config.sugarColorOverrides?.edgeTopSecondary?.colorId || config.sugarColorOverrides?.edgeBothSecondary?.colorId)
        : slotKey === 'middle'
        ? (config.sugarColorOverrides?.edgeMiddleSecondary?.colorId || config.sugarColorOverrides?.edgeBothSecondary?.colorId)
        : (config.sugarColorOverrides?.edgeBottomSecondary?.colorId || config.sugarColorOverrides?.edgeBothSecondary?.colorId);

      const secColorId = slotData.piping?.secondaryColorId || secOverride;
      const isAlt = tip.toLowerCase().includes('alt') || Boolean(secColorId);
      const colorText = (isAlt && secColorId && secColorId !== edgeColorId)
        ? `${title(edgeColorId)} / ${title(secColorId)}`
        : title(edgeColorId);

      const isEdibleDelicate = EDGE_SECTIONS.find((s) => s.id === 'edibleDelicates')?.items.some((it) => it.id === tip);

      const edgeDetails = [
        `${slotLabel}:`,
        `Design: ${edgeDesignLabel}`,
        ...(isEdibleDelicate ? [] : [`Sugar Color: ${colorText}`]),
      ];

      add(`edge-${slotKey}`, `${slotLabel} — ${edgeDesignLabel}`, price, 1, edgeDetails);
    }
  }

const CENTER_RADII = {
  strawberry: 0.30,
  cherry: 0.34,
  blueberry: 0.25,
  mangoCube: 0.24,
  mango: 0.24,
  ferreroRocher: 0.62,
  oreo: 0.875,
  hersheysKisses: 0.40,
  chocolateBear: 0.56,
  basketball: 0.54,
  soccerball: 0.54,
};

function getFootprint(item, scale = 1) {
  if (!item) return null;
  const toolType = item.type || `center-${item.designId || ''}`;
  const parts = typeof toolType === 'string' ? toolType.split('-') : [];
  const designId = parts[1] || item.designId || '';
  const orientation = parts[2] || item.orientation || 'default';
  const x = Number(item.x) || 0;
  const z = Number(item.z) || 0;

  if (designId === 'oreo') {
    const isStanding = orientation === 'standing';
    if (isStanding) {
      return {
        type: 'obb',
        x,
        z,
        halfLength: 0.875 * scale,
        halfWidth: 0.23 * scale,
        angle: Number(item.rotation) || 0,
      };
    }
    return { type: 'circle', x, z, radius: 0.875 * scale };
  }

  if (/^letter(Upper|Lower)/.test(designId)) {
    const isUpper = /^letterUpper/.test(designId);
    return {
      type: 'obb',
      x,
      z,
      halfLength: (isUpper ? 0.36 : 0.27) * scale,
      halfWidth: (isUpper ? 0.16 : 0.13) * scale,
      angle: Number(item.rotation) || 0,
    };
  }

  const baseRadius = CENTER_RADII[designId] || 0.45;
  const isDelicate = ['strawberry', 'cherry', 'blueberry', 'mangoCube', 'mango', 'ferreroRocher', 'hersheysKisses', 'basketball', 'soccerball'].includes(designId);
  const radius = isDelicate ? baseRadius : baseRadius * scale;
  return { type: 'circle', x, z, radius };
}

function doFootprintsClash(a, b, gap = 0.02) {
  if (!a || !b) return false;
  if (a.type === 'circle' && b.type === 'circle') {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const distSq = dx * dx + dz * dz;
    const minDist = a.radius + b.radius + gap;
    return distSq < minDist * minDist;
  }
  const obb = a.type === 'obb' ? a : b;
  const other = a.type === 'obb' ? b : a;
  if (other.type === 'circle') {
    const cosA = Math.cos(-obb.angle);
    const sinA = Math.sin(-obb.angle);
    const dx = other.x - obb.x;
    const dz = other.z - obb.z;
    const lx = cosA * dx - sinA * dz;
    const lz = sinA * dx + cosA * dz;
    const effectiveRadius = other.radius + gap;
    const cx = Math.max(-obb.halfLength, Math.min(obb.halfLength, lx));
    const cz = Math.max(-obb.halfWidth, Math.min(obb.halfWidth, lz));
    const ex = lx - cx;
    const ez = lz - cz;
    return (ex * ex + ez * ez) < effectiveRadius * effectiveRadius;
  }
  return false;
}

const DELICATES_SPECS = {
  ferreroRocherRim: {
    inset: 0.65,
    radius: 0.62,
    countFn: (r) => Math.max(6, Math.round((r * Math.PI * 2) / 2.8)),
  },
  ferreroRocherRimSparse: {
    inset: 0.65,
    radius: 0.62,
    countFn: (r) => {
      const ferreros = Math.max(3, Math.round((r * Math.PI * 2) / 4.8)) + 1;
      return ferreros * 2;
    },
    itemAt: (i) => (i % 2 === 0 ? { radius: 0.62 } : { radius: 0.34 }),
  },
  hersheysKissRim: {
    inset: 0.48,
    radius: 0.40,
    countFn: (r) => Math.max(10, Math.round((r * Math.PI * 2) / 1.7)),
  },
  hersheysKissRimSparse: {
    inset: 0.65,
    radius: 0.62,
    countFn: (r) => {
      const kisses = Math.max(3, Math.round((r * Math.PI * 2) / 3.4));
      return kisses * 2;
    },
    itemAt: (i) => (i % 2 === 0 ? { radius: 0.40 } : { radius: 0.62 }),
  },
  cherryRim: {
    inset: 0.36,
    radius: 0.34,
    countFn: () => 10,
  },
  cherryRimSparse: {
    inset: 0.48,
    radius: 0.40,
    countFn: (r) => {
      const cherries = Math.max(3, Math.round((r * Math.PI * 2) / 4.2));
      return cherries * 2;
    },
    itemAt: (i) => (i % 2 === 0 ? { radius: 0.34 } : { radius: 0.40 }),
  },
};

function filterPrunedPlacedItems(config) {
  const items = config?.place?.items || [];
  if (!Array.isArray(items) || items.length === 0) return [];
  const edge = config?.edge || {};
  const mode = edge.mode || 'both';
  const top = edge.top || null;
  const both = edge.both || null;
  const tip = mode === 'both'
    ? (both?.pipingTip || both?.piping?.tip)
    : (top?.pipingTip || top?.piping?.tip);

  const spec = DELICATES_SPECS[tip];
  if (!spec) return items;

  const size = config?.structure?.size || '8x8';
  const layers = config?.structure?.layers || 1;
  const topRadius = size === 'classicCube'
    ? 0.5
    : size === 'largeCube'
    ? 1.0
    : size === 'miniBento'
    ? 1.75
    : size === 'standardBento'
    ? 2.0
    : size === 'largeBento'
    ? 2.5
    : size === '12x12'
    ? (layers >= 2 ? 5.0 : 6.0)
    : size === '10x10'
    ? (layers >= 2 ? 4.0 : 5.0)
    : size === '6x6' || size === 'small'
    ? (layers >= 2 ? 2.0 : 3.0)
    : (layers >= 2 ? 3.0 : 4.0);
  const finish = config?.exteriorFinish?.style || 'fullyFrosted';
  const surfaceRadius = finish === 'naked' ? topRadius - 0.02 : topRadius + (finish === 'texturedButtercream' ? 0.08 : 0.06);
  const ringRadius = Math.max(0.15, surfaceRadius - spec.inset);
  const count = typeof spec.countFn === 'function' ? spec.countFn(ringRadius) : 12;
  const obstacles = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const itemInfo = typeof spec.itemAt === 'function' ? spec.itemAt(i) : null;
    obstacles.push({
      type: 'circle',
      x: Math.sin(angle) * ringRadius,
      z: Math.cos(angle) * ringRadius,
      radius: itemInfo?.radius || spec.radius,
    });
  }
  const boundaryR = Math.max(0, ringRadius - spec.radius);
  const scale = Number(config?.center?.scale) || 1;

  return items.filter((item) => {
    const fp = getFootprint(item, scale);
    if (!fp) return true;
    const dist = Math.hypot(fp.x, fp.z);
    if (dist + (fp.radius || Math.hypot(fp.halfLength, fp.halfWidth)) > boundaryR + 0.05) {
      return false; // outside Delicates boundary
    }
    const hits = obstacles.some((obs) => doFootprintsClash(fp, obs, 0.02));
    return !hits;
  });
}

  // ── Center: price by quantity bracket, per design ──────────────────────
  const activePlacedItems = filterPrunedPlacedItems(config);
  const counts = {};
  for (const item of activePlacedItems) {
    if (typeof item.type !== 'string' || !item.type.startsWith('center-')) continue;
    const designId = item.type.split('-')[1];
    const key = /^letter(Upper|Lower)/.test(designId) ? 'buttercreamText'
      : (designId === 'basketball' || designId === 'soccerball') ? 'fondantBalls'
      : designId;
    counts[key] = (counts[key] || 0) + 1;
  }
  // ── Center: Decorations & Text ─────────────────────────────────────────
  const decoEntries = [];
  let decoTotalPrice = 0;

  for (const [designId, quantity] of Object.entries(counts)) {
    if (designId === 'buttercreamText') continue;
    const label = DESIGN_LABELS[designId] || designId;
    const each = rates.center?.perPiece?.[designId] ?? DEFAULT_RATES.center?.perPiece?.[designId];
    if (each != null) {
      decoTotalPrice += each * quantity;
      decoEntries.push(`${label} x ${quantity}`);
      continue;
    }

    const defaultBrackets = DEFAULT_RATES.center?.brackets?.[designId] || [];
    const customBrackets = rates.center?.brackets?.[designId];
    let effectiveBrackets = defaultBrackets;

    if (Array.isArray(customBrackets) && customBrackets.length > 0) {
      effectiveBrackets = defaultBrackets.map((defB, idx) => {
        const customB = customBrackets[idx];
        return {
          maxQty: customB?.maxQty ?? defB.maxQty,
          price: customB?.price ?? defB.price,
        };
      });
      if (customBrackets.length > defaultBrackets.length) {
        effectiveBrackets = [
          ...effectiveBrackets,
          ...customBrackets.slice(defaultBrackets.length),
        ];
      }
    }

    const { price, reason } = bracketPrice(effectiveBrackets, quantity);
    if (price == null) {
      missing(`Center — ${label} × ${quantity}`, reason);
    } else {
      decoTotalPrice += price;
      decoEntries.push(`${label} x ${quantity}`);
    }
  }

  if (decoEntries.length > 0) {
    const decoDetails = [
      'Center Decorations:',
      ...decoEntries,
    ];
    add('center-decorations', 'Center Decorations', decoTotalPrice, 1, decoDetails);
  }

  // 3D Fondant Text
  if (counts.buttercreamText) {
    const quantity = counts.buttercreamText;
    const defaultBrackets = DEFAULT_RATES.center?.brackets?.buttercreamText || [];
    const customBrackets = rates.center?.brackets?.buttercreamText;
    let effectiveBrackets = defaultBrackets;

    if (Array.isArray(customBrackets) && customBrackets.length > 0) {
      effectiveBrackets = defaultBrackets.map((defB, idx) => {
        const customB = customBrackets[idx];
        return {
          maxQty: customB?.maxQty ?? defB.maxQty,
          price: customB?.price ?? defB.price,
        };
      });
      if (customBrackets.length > defaultBrackets.length) {
        effectiveBrackets = [
          ...effectiveBrackets,
          ...customBrackets.slice(defaultBrackets.length),
        ];
      }
    }

    const { price, reason } = bracketPrice(effectiveBrackets, quantity);
    if (price == null) {
      missing(`Center Text × ${quantity}`, reason);
    } else {
      add('center-buttercreamText', 'Center Text:', price, 1, [`Letters x ${quantity}`]);
    }
  }

  const totalMinor = lineItems.reduce((sum, item) => sum + item.lineTotalMinor, 0);
  return { lineItems, totalMinor, warnings };
}

// Most pieces of a Center design the designer should allow (the top of its
// highest bracket), or null when there's no limit (per-piece / flat items).
function centerMaxQuantity(designId, rates = DEFAULT_RATES) {
  const key = designId === 'basketball' || designId === 'soccerball' ? 'fondantBalls' : designId;
  const brackets = rates.center?.brackets?.[key];
  if (!brackets || brackets.length === 0) return null;
  const top = brackets[brackets.length - 1].maxQty;
  return Number.isFinite(top) ? top : null;
}

module.exports = {
  DEFAULT_RATES,
  calculateCakePrice,
  bracketPrice,
  centerMaxQuantity,
  DRIP_SECTIONS,
  DEFAULT_DRIP_RATES,
  SIDE_SECTIONS,
  EDGE_SECTIONS,
  DEFAULT_SIDE_RATES,
  DEFAULT_EDGE_RATES,
};