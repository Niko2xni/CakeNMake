import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Visual scale system constants - separates real bakery dimensions from 3D render
// ---------------------------------------------------------------------------
export const CAKE_SCALE = 2;

export const REAL_DIMENSIONS = {
  small: { diameter: 6, height: 5 },
  big: { diameter: 8, height: 5 }
};

export const getRenderDimensions = (cakeSize) => ({
  diameter: REAL_DIMENSIONS[cakeSize].diameter,  // Big: 8 units, Small: 6 units
  height: REAL_DIMENSIONS[cakeSize].height  // Each layer is 5 units tall (real height)
});

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
export const GLAZE_PATTERN_CARVES = {
  longGaps: { deepFrac: 0.95, shortFrac: 0.18, lobeSpacing: 1.0 },
  longShortAlt: { cyclePattern: [0.95, 0.18, 0.55, 0.18], lobeSpacing: 1.0 },
  shortDrips: { deepFrac: 0.55, shortFrac: 0.18, lobeSpacing: 1.0 },
  longWave: { wave: true, baseFrac: 0.86, ampFrac: 0.05, lobeCount: 11 },
  midWave: { wave: true, baseFrac: 0.5, ampFrac: 0.05, lobeCount: 11 },
  shortWave: { wave: true, baseFrac: 0.16, ampFrac: 0.05, lobeCount: 11 },
};
