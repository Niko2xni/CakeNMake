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
  '6x6': {
    tiers: [
      { diameter: 6, height: 4 },
      { diameter: 4, height: 3 },
    ],
  },
  '8x8': {
    tiers: [
      { diameter: 8, height: 6 },
      { diameter: 6, height: 4 },
    ],
  },
  '10x10': {
    tiers: [
      { diameter: 10, height: 8 },
      { diameter: 8, height: 6 },
    ],
  },
  '12x12': {
    tiers: [
      { diameter: 12, height: 10 },
      { diameter: 10, height: 8 },
    ],
  },
  // Bento cake sizes (single tier only)
  miniBento: {
    tiers: [
      { diameter: 3.5, height: 2 },
    ],
  },
  standardBento: {
    tiers: [
      { diameter: 4, height: 2 },
    ],
  },
  largeBento: {
    tiers: [
      { diameter: 5, height: 3 },
    ],
  },
  // Petits Four cake sizes (single tier 4-pack)
  classicCube: {
    tiers: [
      { diameter: 1, height: 1, width: 1, length: 1 },
    ],
  },
  largeCube: {
    tiers: [
      { diameter: 2, height: 2, width: 2, length: 2 },
    ],
  },
  // Backwards compatibility aliases
  small: {
    tiers: [
      { diameter: 6, height: 4 },
      { diameter: 4, height: 3 },
    ],
  },
  big: {
    tiers: [
      { diameter: 8, height: 6 },
      { diameter: 6, height: 4 },
    ],
  },
};

// tierIndex defaults to 0 (base tier), so the existing single-arg call
// pattern (getRenderDimensions(cakeSize)) is unchanged. Out-of-range
// tierIndex clamps to the last defined tier rather than throwing.
export const getRenderDimensions = (cakeSize, tierIndex = 0) => {
  const sizeEntry = REAL_DIMENSIONS[cakeSize] || REAL_DIMENSIONS['8x8'] || REAL_DIMENSIONS.big;
  const tiers = sizeEntry.tiers;
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

// The GLAZE_PATTERNS variants (see cakeConfig.js), expressed as
// buildGlazeGeometry's `opts.carve` shape.
//
// longGaps ("Long Drips") is the legacy pattern deep enough (deepFrac: 1.0,
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
  unevenCombo: { cyclePattern: [0.88, 0.28, 0.55, 0.22, 0.82, 0.32, 0.60, 0.25], lobeSpacing: 1.0 },
};

// Drip-count reference radius (scene units = inches): the 6x6 size's own
// radius. buildGlazeGeometry counts its carve lobes (drips) from
// circumference, so without pinning, bigger sizes rendered proportionally
// MORE drips than this reference size — each one narrower, reading thin
// and stretched next to 6x4's healthy-looking fingers. Round cakes pass
// Math.min(radius, GLAZE_DRIP_COUNT_RADIUS) as buildGlazeGeometry's
// lobeCountRadius, so every standard size (8x6 / 10x8 / 12x10) renders
// exactly the drip count the reference size renders. Smaller formats
// (Bento tiers, Petits Fours pieces) sit below the reference and stay
// proportional.
export const GLAZE_DRIP_COUNT_RADIUS = 3;

/**
 * Petit Fours specific carve profiles:
 * Adapts Drips and Coverage designs into an organic, uneven distribution for the mini cake cubes.
 * Each pieceIndex (0..3) introduces seeded organic variation so pieces look handcrafted.
 */
/**
 * Helper to construct a Petit Fours carve pattern. Each drip is ONE continuous
 * tear-shaped curve (like a hand-drawn drip) rather than separate pieces:
 *
 *   depth(angle) = MANTLE + sum over drips of three smooth bells
 *     - flare : wide, shallow bell -> the rounded arch/shoulder blending into the mantle
 *     - mid   : medium bell        -> gradual taper of the tear
 *     - tail  : narrow flat-tipped bell -> slender near-vertical tail with a rounded tip
 *
 * The profile is a plain sum of smooth functions, so it has no neck, shoulder or
 * bead joints: the arch between two drips curves down into the tail with
 * continuous slope and curvature. A very soft, wide swell near the tip keeps a
 * hint of droplet volume without any visible edge.
 */
function buildSeamlessBeadCarve(dripCenters, baseDepths, opts = {}) {
  const {
    angularCycles = 32,
    seed = 0,
    mantle = 0.14, // depth of the mantle edge between drips (smaller = shallower)
  } = opts;

  const TAU = Math.PI * 2;
  const MANTLE = mantle;
  const wrap = (d) => {
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return d;
  };
  const bell = (x, sigma, p) => Math.exp(-Math.pow(Math.abs(x) / sigma, p));

  // Organic, slightly asymmetric parameters per drip (left/right widths differ a little)
  const dripConfigs = dripCenters.map((center, i) => {
    const h1 = Math.sin(seed + i * 3.73);
    const h2 = Math.cos(seed + i * 5.19);
    const h3 = Math.sin(seed + i * 8.41);

    const total = Math.max(0.1, baseDepths[i] - MANTLE);
    const flareAmp = Math.min(total * 0.5, 0.11 + Math.abs(h1) * 0.02);
    const rest = total - flareAmp;

    return {
      center,
      baseDepth: baseDepths[i],
      flareAmp,
      midAmp: rest * 0.3,
      tailAmp: rest * 0.7,
      flareSigL: 0.17 + h2 * 0.02,
      flareSigR: 0.17 + h3 * 0.02,
      midSigL: 0.075 + h2 * 0.008,
      midSigR: 0.075 + h3 * 0.008,
      tailSigL: 0.030 + h2 * 0.004,
      tailSigR: 0.030 + h3 * 0.004,
    };
  });

  const customProfileFn = (angle) => {
    const a = (angle % TAU + TAU) % TAU;
    let depth = MANTLE;
    for (let i = 0; i < dripConfigs.length; i++) {
      const c = dripConfigs[i];
      const diff = wrap(a - c.center);
      const left = diff < 0;
      depth +=
        c.flareAmp * bell(diff, left ? c.flareSigL : c.flareSigR, 2) +
        c.midAmp * bell(diff, left ? c.midSigL : c.midSigR, 2) +
        c.tailAmp * bell(diff, left ? c.tailSigL : c.tailSigR, 3);
    }
    return Math.min(0.96, depth);
  };

  // Very soft, wide swell toward the tip: no hard edge, just a hint of volume.
  const thicknessMulFn = (angle, y, Ay = 0.55) => {
    const a = (angle % TAU + TAU) % TAU;
    const d = Ay > 0 ? (Ay - y) / Ay : 0;
    let swell = 0;
    for (let i = 0; i < dripConfigs.length; i++) {
      const c = dripConfigs[i];
      const dx = wrap(a - c.center) / 0.035;
      const dy = (d - (c.baseDepth - 0.04)) / 0.09;
      const s = 0.18 * Math.exp(-(dx * dx + dy * dy));
      if (s > swell) swell = s;
    }
    return 1.0 + swell;
  };

  return { customProfileFn, thicknessMulFn, angularCycles };
}

/**
 * Long Drips builder: a deep, hand-poured, CROOKED mantle with slender tear drips.
 *
 * - The mantle edge between two drips is not a clean arch: it runs from one
 *   level to another (shelf-like step shaped by a seeded exponent) with extra
 *   wobbles, so it dips and rises irregularly on the way down.
 * - Every drip has its own LEFT and RIGHT mantle level, so one side of a tear
 *   meets the mantle very low (short wall) while the other side meets it much
 *   higher (tall wall), like the hand-drawn reference.
 * - The drip itself is a narrow near-vertical tail (flat-tipped bell) with a
 *   small fillet bell at the junction so it still blends into either side.
 */
function buildCrookedMantleCarve(dripCenters, baseDepths, leftLevels, rightLevels, opts = {}) {
  const { angularCycles = 32, seed = 0, crookedness = 1 } = opts;
  const TAU = Math.PI * 2;
  const WS = 0.05; // half-width of the zone where left level blends into right level
  const wrap = (d) => {
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return d;
  };
  const sstep = (t) => {
    const x = Math.min(1, Math.max(0, t));
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  const bell = (x, sigma, p) => Math.exp(-Math.pow(Math.abs(x) / sigma, p));

  const drips = dripCenters.map((center, i) => ({
    center,
    baseDepth: baseDepths[i],
    left: leftLevels[i],
    right: rightLevels[i],
    tailSig: 0.038 + Math.cos(seed + i * 2.7) * 0.003,
  })).sort((a, b) => a.center - b.center);
  const n = drips.length;

  // Per-gap crooked shape parameters (gap k runs from drips[k] to drips[k+1])
  const gaps = drips.map((_, k) => ({
    gamma: crookedness === 1
      ? 0.8 + 0.8 * (0.5 + 0.5 * Math.sin(seed + k * 4.1))
      : 1 + (0.8 + 0.8 * (0.5 + 0.5 * Math.sin(seed + k * 4.1)) - 1) * crookedness,
    a1: (0.045 + 0.02 * Math.abs(Math.sin(seed + k * 1.3))) * crookedness,
    f1: 1.4 + 0.5 * Math.abs(Math.cos(seed + k * 2.2)),
    p1: seed + k * 2.9,
    a2: (0.025 + 0.012 * Math.abs(Math.cos(seed + k * 3.3))) * crookedness,
    f2: 3.3 + 0.7 * Math.abs(Math.sin(seed + k * 1.9)),
    p2: seed * 1.7 + k * 5.3,
  }));

  const mantleAt = (a) => {
    // Inside a drip's junction zone: blend the left level into the right level
    for (let i = 0; i < n; i++) {
      const diff = wrap(a - drips[i].center);
      if (Math.abs(diff) < WS) {
        const u = sstep((diff + WS) / (2 * WS));
        return drips[i].left * (1 - u) + drips[i].right * u;
      }
    }
    // Otherwise find the gap and shape it
    for (let k = 0; k < n; k++) {
      const d0 = drips[k];
      const d1 = drips[(k + 1) % n];
      const span = n === 1 ? TAU : (d1.center - d0.center + TAU) % TAU;
      const delta = (a - d0.center + TAU) % TAU;
      if (delta <= span + 1e-9) {
        const g = gaps[k];
        const t = span > 0 ? delta / span : 0.5;
        const step = sstep(Math.pow(t, g.gamma));
        const win = Math.pow(Math.sin(Math.PI * t), 2);
        const wobble =
          g.a1 * Math.sin(t * TAU * g.f1 + g.p1) + g.a2 * Math.sin(t * TAU * g.f2 + g.p2);
        return d0.right + (d1.left - d0.right) * step + wobble * win;
      }
    }
    return 0.25;
  };

  const customProfileFn = (angle) => {
    const a = (angle % TAU + TAU) % TAU;
    const m = mantleAt(a);
    let depth = m;
    for (let i = 0; i < n; i++) {
      const d = drips[i];
      const diff = wrap(a - d.center);
      const mc = 0.5 * (d.left + d.right);
      const total = Math.max(0.1, d.baseDepth - mc);
      // narrow tail + a small fillet bell so both walls blend into the mantle
      depth += total * (0.82 * bell(diff, d.tailSig, 2.5) + 0.18 * bell(diff, d.tailSig * 2.2, 2));
    }
    return Math.min(0.96, depth);
  };

  const thicknessMulFn = (angle, y, Ay = 0.55) => {
    const a = (angle % TAU + TAU) % TAU;
    const dd = Ay > 0 ? (Ay - y) / Ay : 0;
    let swell = 0;
    for (let i = 0; i < n; i++) {
      const dx = wrap(a - drips[i].center) / 0.035;
      const dy = (dd - (drips[i].baseDepth - 0.04)) / 0.09;
      const s = 0.18 * Math.exp(-(dx * dx + dy * dy));
      if (s > swell) swell = s;
    }
    return 1.0 + swell;
  };

  return { customProfileFn, thicknessMulFn, angularCycles };
}

function buildNaturalTearGlazeCarve(seed = 0, crookedness = 1) {
  const baseAngles = [0.40, 1.50, 2.38, 3.55, 4.40, 5.52];
  const baseDepths = [0.92, 0.86, 0.90, 0.84, 0.91, 0.88];
  const leftBase = [0.22, 0.46, 0.20, 0.50, 0.26, 0.44];
  const rightBase = [0.48, 0.24, 0.46, 0.28, 0.50, 0.22];
  const dripCenters = baseAngles.map((angle, index) => (
    (angle + Math.sin(seed + index * 1.5) * 0.05 * crookedness + Math.PI * 2) % (Math.PI * 2)
  ));
  const leftLevels = leftBase.map((value, index) => {
    const level = Math.min(0.58, Math.max(0.16, value + Math.sin(seed + index * 2.1) * 0.04));
    const mean = (level + rightBase[index]) / 2;
    return mean + (level - mean) * crookedness;
  });
  const rightLevels = rightBase.map((value, index) => {
    const level = Math.min(0.58, Math.max(0.16, value + Math.cos(seed + index * 1.7) * 0.04));
    const mean = (level + leftBase[index]) / 2;
    return mean + (level - mean) * crookedness;
  });
  const carve = buildCrookedMantleCarve(dripCenters, baseDepths, leftLevels, rightLevels, {
    angularCycles: 40,
    seed,
    crookedness,
  });

  return carve;
}

export function getNaturalTearGlazeCarve(patternKey = 'naturalTear', seed = 0) {
  // Standard and Bento reuse the Petit Fours Natural Tear design. Keep both
  // stored pattern ids valid so existing saved configurations render the
  // replacement design instead of falling back to a different carve.
  return buildNaturalTearGlazeCarve(seed, 1);
}

export function getPetitFoursGlazeCarve(patternKey = 'unevenCombo', pieceIndex = 0, rand = Math.random) {
  let key = patternKey || 'unevenCombo';
  if (key === 'petitLong') key = 'longGaps';
  else if (key === 'petitMedium') key = 'longShortAlt';
  else if (key === 'petitShort') key = 'shortDrips';

  const seed = pieceIndex * 1.618;
  const smootherstep = (t) => {
    const x = Math.min(1, Math.max(0, t));
    return x * x * x * (x * (x * 6 - 15) + 10);
  };

  if (key === 'unevenCombo') {
    // Signature Petit Fours Drip & Coverage:
    // Organic, imperfect, asymmetric starting expansion at the shoulder,
    // slender stem going down, and subtle teardrop bump at the end.
    const baseAngles = [0.32, 0.88, 1.45, 2.05, 2.65, 3.25, 3.85, 4.45, 5.05, 5.68];
    const baseDepths = [0.92, 0.48, 0.78, 0.90, 0.52, 0.82, 0.46, 0.88, 0.55, 0.76];
    const dripCenters = baseAngles.map((a, i) => (a + Math.sin(seed + i * 1.9) * 0.03 + Math.PI * 2) % (Math.PI * 2));
    return buildSeamlessBeadCarve(dripCenters, baseDepths, { angularCycles: 32, seed });
  }

  if (key === 'longGaps') {
    return buildNaturalTearGlazeCarve(seed, 1);
  }

  if (key === 'longShortAlt') {
    // Long & Short Drips: alternating tall and shorter thin fingers with organic starting expansion
    const baseAngles = [0.35, 1.05, 1.75, 2.45, 3.15, 3.85, 4.55, 5.25, 5.95];
    const baseDepths = [0.90, 0.48, 0.85, 0.50, 0.92, 0.46, 0.88, 0.52, 0.86];
    const dripCenters = baseAngles.map((a, i) => (a + Math.sin(seed + i) * 0.03 + Math.PI * 2) % (Math.PI * 2));
    return buildSeamlessBeadCarve(dripCenters, baseDepths, { angularCycles: 32, seed });
  }

  if (key === 'shortDrips') {
    // Short Drips: shallow ring of drips
    const baseAngles = [0.4, 1.2, 2.0, 2.8, 3.6, 4.4, 5.2, 6.0];
    const baseDepths = [0.48, 0.42, 0.52, 0.40, 0.50, 0.44, 0.46, 0.42];
    const dripCenters = baseAngles.map((a, i) => (a + Math.sin(seed + i) * 0.08 + Math.PI * 2) % (Math.PI * 2));
    const dripDepths = baseDepths.map((d, i) => Math.min(0.58, d + Math.cos(seed + i) * 0.04));
    const dripWidth = 0.28;

    const customProfileFn = (angle) => {
      const a = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const base = 0.18;
      let maxDrip = 0;
      for (let i = 0; i < dripCenters.length; i++) {
        let diff = Math.abs(a - dripCenters[i]);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < dripWidth) {
          const t = 1 - diff / dripWidth;
          const drop = smootherstep(t) * (dripDepths[i] - base);
          if (drop > maxDrip) maxDrip = drop;
        }
      }
      return Math.min(0.60, base + maxDrip);
    };
    return { customProfileFn, angularCycles: 16 };
  }

  if (key === 'tinyTip') {
    // Tiny Tip: mantle-only. No tear-like drips: the glaze is a deep, soft cap whose
    // lower edge is a crooked wave made of a few low-frequency sines plus wide,
    // uneven lobes that sag lower in places (like a thick cream cap on a mousse cake).
    const TAU = Math.PI * 2;
    const wrapA = (d) => {
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      return d;
    };
    // Smooth, even wave: a single clean sine around the full turn. The cube has 4
    // faces, so 8 cycles gives exactly 2 humps per face. No warping, wandering
    // spacing or uneven heights; only the starting phase shifts per piece.
    const WAVE_CYCLES = 8;
    const BASE = 0.42;
    const AMP = 0.10;
    const customProfileFn = (angle) => {
      const a = (angle % TAU + TAU) % TAU;
      return BASE + AMP * Math.sin(WAVE_CYCLES * a + seed * 0.9);
    };
    return { customProfileFn, angularCycles: 64 };
  }

  if (key === 'longWave') {
    // Full Coverage: reaches almost to the base with soft organic scalloped edge
    const customProfileFn = (angle) => {
      const a = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      return 0.82 + 0.06 * Math.sin(a * 4 + seed) + 0.03 * Math.cos(a * 2);
    };
    return { customProfileFn, angularCycles: 16 };
  }

  if (key === 'midWave') {
    // Mid Coverage: halfway down with soft organic scalloped edge
    const customProfileFn = (angle) => {
      const a = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      return 0.50 + 0.05 * Math.sin(a * 4 + seed) + 0.03 * Math.cos(a * 2);
    };
    return { customProfileFn, angularCycles: 16 };
  }

  if (key === 'shortWave') {
    // Short Coverage: shallow mantle near top with soft organic scalloped edge
    const customProfileFn = (angle) => {
      const a = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      return 0.24 + 0.04 * Math.sin(a * 4 + seed) + 0.02 * Math.cos(a * 2);
    };
    return { customProfileFn, angularCycles: 16 };
  }

  return GLAZE_PATTERN_CARVES[key] || GLAZE_PATTERN_CARVES.longGaps;
}