import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Visual scale system constants - separates real bakery dimensions from 3D render
// ---------------------------------------------------------------------------
export const CAKE_SCALE = 2;

// Real bakery dimensions per cake size, per tier. Tier 0 is always the
// base/bottom tier; tier 1 (if present) is the smaller second tier
// stacked on top for a 2-layer cake. 1 3D scene unit == 1 real inch for
// radius/height throughout this file -- confirmed by REFERENCE_TOP_RADIUS
// in CakeScene.jsx, which is tuned against tier 0 of 'big' (8x5)
// specifically: BASE_RADIUS = diameter/2 = 4 units for an 8in cake.
export const REAL_DIMENSIONS = {
  small: {
    tiers: [
      { diameter: 6, height: 5 }, // 6x5 base tier
      { diameter: 4, height: 4 }, // 4x4 second tier
    ],
  },
  big: {
    tiers: [
      { diameter: 8, height: 5 }, // 8x5 base tier
      { diameter: 6, height: 4 }, // 6x4 second tier
    ],
  },
};

// tierIndex defaults to 0 (base tier), so the existing single-arg call
// pattern (getRenderDimensions(cakeSize)) is unchanged. Out-of-range
// tierIndex clamps to the last defined tier rather than throwing.
export const getRenderDimensions = (cakeSize, tierIndex = 0) => {
  const tiers = REAL_DIMENSIONS[cakeSize].tiers;
  const clampedIndex = Math.max(0, Math.min(tierIndex, tiers.length - 1));
  const tier = tiers[clampedIndex];
  return { diameter: tier.diameter, height: tier.height };
};

export const FROSTING_COLORS = {
  vanilla: '#FFF8E7',
  chocolate: '#5C3317',
  strawberry: '#FF8BA7',
  cheese: '#FFE082',
  ube: '#8E5EA2',
  mocha: '#9C7A5E',
};

export const PIPING_FLAVOR_COLORS = {
  mango: '#FFAB00',
  ube: '#8E5EA2',
  chocolate: '#5C3317',
  mocha: '#A4775A',
  cheese: '#FFD54F',
};

export const FILLING_COLORS = {
  vanilla: '#FFF4DC',
  chocolate: '#5D4037',
  strawberry: '#FFB6C1',
  cheese: '#FFF59D',
  ube: '#9C27B0',
  mocha: '#8D6E63',
};

// Interior Preview cutaway: a single plane through the cake's central (Y)
// axis. Its normal points along the -X/-Z diagonal, so the half-space it
// clips away is {x + z > 0} — the front-right half of the cake, a clean
// 180° cutaway, camera-facing by default since the camera sits on the
// +X/+Z side. This only ever gets applied to materials that actually cover
// the sponge/filling (currently just the frosting shell).
export const INTERIOR_PREVIEW_CLIP_PLANES = [
  new THREE.Plane(new THREE.Vector3(-1, 0, -1).normalize(), 0),
];

// The six GLAZE_PATTERNS variants (see cakeConfig.js), expressed as
// buildGlazeGeometry's `opts.carve` shape.
//
// longGaps ("Long Drips") is the one pattern deep enough (deepFrac: 1.0,
// reaching the geometry's own local floor) that its longest fingers touch
// the plate rather than stopping partway down the cake's side. CakeScene.jsx
// also adds a separate flat puddle mesh (buildGlazePoolGeometry) around the
// base whenever this pattern is selected, so the base reads as fully
// covered regardless of which specific angles the fingers reach.
export const GLAZE_PATTERN_CARVES = {
  longGaps: { deepFrac: 1.0, shortFrac: 0.18, lobeSpacing: 1.0 },
  longShortAlt: { cyclePattern: [0.95, 0.18, 0.55, 0.18], lobeSpacing: 1.0 },
  shortDrips: { deepFrac: 0.55, shortFrac: 0.18, lobeSpacing: 1.0 },
  longWave: { wave: true, baseFrac: 0.86, ampFrac: 0.05, lobeCount: 11 },
  midWave: { wave: true, baseFrac: 0.5, ampFrac: 0.05, lobeCount: 11 },
  shortWave: { wave: true, baseFrac: 0.16, ampFrac: 0.05, lobeCount: 11 },
};