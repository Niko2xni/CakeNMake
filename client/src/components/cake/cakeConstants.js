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
      { diameter: 6, height: 4 }, // 6x4 base tier
      { diameter: 4, height: 3 }, // 4x3 second tier
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

// ---------------------------------------------------------------------------
// Interior Preview Cutaway Clipping Planes
// ---------------------------------------------------------------------------

// Standard 180° / 180° 2-way split: clips front-right 180° (x + z > 0)
export const INTERIOR_PREVIEW_CLIP_PLANES_2WAY = [
  new THREE.Plane(new THREE.Vector3(-1, 0, -1).normalize(), 0),
];

// Backwards-compatible alias
export const INTERIOR_PREVIEW_CLIP_PLANES = INTERIOR_PREVIEW_CLIP_PLANES_2WAY;

const DEG2RAD = Math.PI / 180;
const norm = (deg) => new THREE.Vector3(Math.cos(deg * DEG2RAD), 0, Math.sin(deg * DEG2RAD)).normalize();

// ---------------------------------------------------------------------------
// 3-Way 120° / 120° / 120° Split
// Sector 1: [-15°, 105°] (Naked 120°)
// Sector 2: [105°, 225°] (Feature 1 120°)
// Sector 3: [225°, 345°] (Feature 2 120°)
// ---------------------------------------------------------------------------

// Frosting in 3-way split: kept in 240° arc (Sector 2 & Sector 3), clipped in Sector 1 (120°)
// Used with clipIntersection = true
export const INTERIOR_PREVIEW_FROSTING_3WAY_PLANES = [
  new THREE.Plane(norm(-105), 0),
  new THREE.Plane(norm(195), 0),
];

// Sector 2 in 3-way split: kept in [105°, 225°] (120°), clipped in Sector 1 & 3 (240°)
// Used with clipIntersection = false (e.g. Drip in Naked + Drip + Side)
export const INTERIOR_PREVIEW_SECTOR2_3WAY_PLANES = [
  new THREE.Plane(norm(195), 0),
  new THREE.Plane(norm(135), 0),
];

// Sector 3 in 3-way split: kept in [225°, 345°] (120°), clipped in Sector 1 & 2 (240°)
// Used with clipIntersection = false (e.g. Drip in Frosted + Drip, or Side in Frosted + Side / Naked + Drip + Side)
export const INTERIOR_PREVIEW_SECTOR3_3WAY_PLANES = [
  new THREE.Plane(norm(-105), 0),
  new THREE.Plane(norm(315), 0),
];

export const INTERIOR_PREVIEW_DRIP_3WAY_PLANES = INTERIOR_PREVIEW_SECTOR3_3WAY_PLANES;
export const INTERIOR_PREVIEW_SIDE_3WAY_PLANES = INTERIOR_PREVIEW_SECTOR3_3WAY_PLANES;

// ---------------------------------------------------------------------------
// 4-Way 90° / 90° / 90° / 90° Split
// Sector 1: [0°, 90°] (Naked 90°)
// Sector 2: [90°, 180°] (Frosting / Textured Finish 90°)
// Sector 3: [180°, 270°] (Drip 90°)
// Sector 4: [270°, 360°] (Side Selection 90°)
// ---------------------------------------------------------------------------

// Frosting in 4-way split: kept in 270° arc (Sector 2, 3, 4: [90°, 360°]), clipped in Sector 1 (90°)
// Used with clipIntersection = true
export const INTERIOR_PREVIEW_4WAY_FROSTING_PLANES = [
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
];

// Drip / Glaze in 4-way split: kept in Sector 3 & Sector 4 ([180°, 360°], 180° arc), clipped in Sector 1 & 2 (180°)
// Used with clipIntersection = false
export const INTERIOR_PREVIEW_4WAY_DRIP_PLANES = [
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
];

// Side in 4-way split: kept in Sector 4 ([270°, 360°], 90°), clipped in Sector 1, 2, 3 (270°)
// Used with clipIntersection = false
export const INTERIOR_PREVIEW_4WAY_SIDE_PLANES = [
  new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
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
