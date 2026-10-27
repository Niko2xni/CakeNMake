import * as THREE from 'three';
import { applySurfaceIrregularity } from './cakeMath';

/**
 * Builds one continuous sponge-section mesh: rounded side bevels, plus an
 * optional top bump and/or bottom socket folded directly into the same
 * profile curve — instead of separate hill/socket meshes glued on after.
 * Because it's all one LatheGeometry, there's no seam and no possibility
 * of a gap ever appearing between the body and its bump/socket.
 */
export function buildSpongeProfileGeometry(radius, height, opts = {}) {
  const {
    bevelSize = 0.18,
    topBumpHeight = 0,
    bottomSocketHeight = 0,
    segments = 72,
    // Set to false on any face that butts against a filling layer — those
    // need to stay flush at full radius, not taper inward, or you get a
    // visible gap/step where the filling meets the sponge.
    bevelTop = true,
    bevelBottom = true,
  } = opts;

  const bTop = bevelTop ? Math.min(bevelSize, radius * 0.12, height * 0.12) : 0;
  const bBottom = bevelBottom ? Math.min(bevelSize, radius * 0.12, height * 0.12) : 0;
  const innerRTop = radius - bTop;
  const innerRBottom = radius - bBottom;
  const arcSteps = 8;
  const domeSteps = 10;
  const points = [];

  if (bottomSocketHeight > 0) {
    const bh = bottomSocketHeight;
    const R = (innerRBottom * innerRBottom + bh * bh) / (2 * bh);
    const capAngle = Math.acos(1 - bh / R);
    for (let j = 0; j < domeSteps; j++) {
      const t = capAngle * (j / domeSteps);
      const x = R * Math.sin(t);
      const y = (-height / 2 + bh) - R * (1 - Math.cos(t));
      points.push(new THREE.Vector2(x, y));
    }
  } else {
    points.push(new THREE.Vector2(0, -height / 2));
  }

  for (let j = 0; j <= arcSteps; j++) {
    const t = (Math.PI / 2) * (j / arcSteps);
    points.push(new THREE.Vector2(
      innerRBottom + bBottom * Math.sin(t),
      (-height / 2 + bBottom) - bBottom * Math.cos(t)
    ));
  }

  const bevelArcLen = (Math.PI / 2) * Math.max(bevelSize, 0.02);
  const wallLen = Math.max(0, (height / 2 - bTop) - (-height / 2 + bBottom));
  const wallSteps = Math.max(1, Math.round(wallLen / (bevelArcLen / arcSteps)));
  for (let j = 1; j <= wallSteps; j++) {
    const y = THREE.MathUtils.lerp(-height / 2 + bBottom, height / 2 - bTop, j / wallSteps);
    points.push(new THREE.Vector2(radius, y));
  }

  for (let j = 0; j <= arcSteps; j++) {
    const t = (Math.PI / 2) * (j / arcSteps);
    points.push(new THREE.Vector2(
      innerRTop + bTop * Math.cos(t),
      (height / 2 - bTop) + bTop * Math.sin(t)
    ));
  }

  if (topBumpHeight > 0) {
    const bh = topBumpHeight;
    const R = (innerRTop * innerRTop + bh * bh) / (2 * bh);
    const capAngle = Math.acos(1 - bh / R);
    for (let j = 1; j <= domeSteps; j++) {
      const t = capAngle * (1 - j / domeSteps);
      const x = R * Math.sin(t);
      const y = (height / 2 + bh) - R * (1 - Math.cos(t));
      points.push(new THREE.Vector2(x, y));
    }
  } else {
    points.push(new THREE.Vector2(0, height / 2));
  }

  const geo = new THREE.LatheGeometry(points, segments);
  applySurfaceIrregularity(geo, radius);
  return geo;
}

/**
 * Filling layer geometry — a soft barrel/lathe profile instead of a flat
 * cylinder disc.
 */
export function buildFillingProfileGeometry(radius, height, oozeAmount = 0) {
  const segments = 64;
  const steps = 10;
  const points = [];
  points.push(new THREE.Vector2(0, -height / 2));
  for (let j = 0; j <= steps; j++) {
    const t = j / steps;
    const bulge = Math.sin(Math.PI * t) * oozeAmount;
    points.push(new THREE.Vector2(radius + bulge, -height / 2 + t * height));
  }
  points.push(new THREE.Vector2(0, height / 2));
  return new THREE.LatheGeometry(points, segments);
}

/**
 * The per-bump randomized parameters buildMashedCircleFillingGeometry
 * uses (widthFrac/heightMul/vScale/phase, one set per bump around the
 * ring). Pulled out to its own export so a caller that needs to
 * reproduce this exact mesh's displacement elsewhere — Glaze's hugging
 * profile in CakeScene.jsx, specifically — can generate (or receive) the
 * SAME jitter values rather than re-consuming `rand`'s sequence a second
 * time, which would desync from wherever `rand` had already advanced to
 * and produce different-looking bumps than the actual mesh.
 */
export function makeMashedBumpJitter(bumpCount, vScaleMin, vScaleMax, rand = Math.random, pattern = 'none') {
  if (pattern === 'diagonalSlashes') {
    for (let i = 0; i < 13; i++) rand();
  }
  return Array.from({ length: bumpCount }, () => ({
    widthFrac: 0.86 + rand() * 0.3,
    heightMul: 0.6 + rand() * 0.55,
    vScale: Math.min(1, vScaleMin + rand() * (vScaleMax - vScaleMin)),
    phase: (rand() - 0.4) * 0.12,
  }));
}

/**
 * Filling body for the "Mashed Circles" design (see FILLING_PIPING_DESIGNS
 * in cakeConfig.js).
 */
export function buildMashedCircleFillingGeometry(radius, height, {
  bumpCount = 22,
  peakBulge = radius * 0.075,
  valleyRecess = radius * 0.12,
  vScaleMin = 0.55,
  vScaleMax = 1.0,
  pattern = 'none',
  rand = Math.random,
  // Pass a jitter array already produced by makeMashedBumpJitter to use
  // it as-is instead of generating (and consuming rand() for) a fresh
  // one — see that function's own doc comment for why a caller would
  // need this.
  precomputedJitter = null,
  // Optional (angle, y) -> 0..1 weight. Where this returns 1, the bump at
  // that point is fully shaved down to the flat baseline radius instead
  // of bulging/recessing — used so a covering Side Treatment (e.g.
  // Checkered Pattern) can stay flat/rigid rather than having to bend to
  // follow bumps that will just sit underneath its own squares anyway
  // (see CakeScene.jsx's checkerCoverageFn and getCheckerCoverageFn in
  // DecorationSets.jsx, which is what callers actually build this from).
  // Returns 0 (untouched) for any uncovered point — e.g. the checkerboard's
  // own grout-line gaps — so the real piped texture stays fully visible
  // there, same as if nothing were covering it at all.
  coverageFn = null,
} = {}) {
  const angularSegments = bumpCount * 12;
  const heightSegments = 24;
  const positions = [];
  const indices = [];

  const vShapePower = 4;
  const verticalEnvelope = (t, vScale) => {
    const s = 2 * t - 1;
    const sScaled = THREE.MathUtils.clamp(s / vScale, -1, 1);
    return Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(sScaled), vShapePower)));
  };

  const bumpJitter = precomputedJitter || makeMashedBumpJitter(bumpCount, vScaleMin, vScaleMax, rand, pattern);

  const shapePower = 4;
  const slashCount = 3;
  const slashDepth = radius * 0.012;
  const slashGroove = (u, sScaled) => Math.sin((u + sScaled) * slashCount * Math.PI) * slashDepth;

  for (let iy = 0; iy <= heightSegments; iy++) {
    const t = iy / heightSegments;
    const y = -height / 2 + t * height;
    for (let ia = 0; ia <= angularSegments; ia++) {
      const angle = (ia / angularSegments) * Math.PI * 2;

      const bumpF = (angle / (Math.PI * 2)) * bumpCount;
      const bumpIndex = Math.floor(bumpF) % bumpCount;
      const j = bumpJitter[bumpIndex];

      const localFrac = (bumpF - Math.floor(bumpF) - 0.5) - j.phase;
      const halfWidth = 0.5 * j.widthFrac;
      const u = THREE.MathUtils.clamp(localFrac / halfWidth, -1, 1);
      const dome = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(u), shapePower)));
      const signedBulge = (dome * peakBulge - (1 - dome) * valleyRecess) * j.heightMul;

      const vEnv = verticalEnvelope(t, j.vScale);
      let bulge = vEnv * signedBulge;

      if (pattern === 'diagonalSlashes') {
        const sScaled = THREE.MathUtils.clamp((2 * t - 1) / j.vScale, -1, 1);
        bulge += vEnv * dome * slashGroove(u, sScaled);
      }

      if (coverageFn) {
        const weight = THREE.MathUtils.clamp(coverageFn(angle, y), 0, 1);
        bulge *= 1 - weight;
      }

      const r = radius + bulge;
      positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
    }
  }

  const ringStride = angularSegments + 1;
  for (let iy = 0; iy < heightSegments; iy++) {
    for (let ia = 0; ia < angularSegments; ia++) {
      const a = iy * ringStride + ia;
      const b = iy * ringStride + ia + 1;
      const c = (iy + 1) * ringStride + ia;
      const d = (iy + 1) * ringStride + ia + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const bottomCenterIndex = positions.length / 3;
  positions.push(0, -height / 2, 0);
  for (let ia = 0; ia < angularSegments; ia++) {
    indices.push(bottomCenterIndex, ia, ia + 1);
  }
  const topRingStart = heightSegments * ringStride;
  const topCenterIndex = positions.length / 3;
  positions.push(0, height / 2, 0);
  for (let ia = 0; ia < angularSegments; ia++) {
    indices.push(topCenterIndex, topRingStart + ia + 1, topRingStart + ia);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Filling body for the "Mashed Swirls" design (see FILLING_PIPING_DESIGNS
 * in cakeConfig.js).
 */
export function buildMashedSwirlFillingGeometry(radius, height, options = {}) {
  return buildMashedCircleFillingGeometry(radius, height, {
    bumpCount: 15,
    peakBulge: radius * 0.1,
    valleyRecess: radius * 0.155,
    vScaleMin: 0.85,
    vScaleMax: 1.0,
    ...options,
    pattern: 'diagonalSlashes',
  });
}
