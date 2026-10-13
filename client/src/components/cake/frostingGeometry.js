import * as THREE from 'three';

/**
 * Builds a continuous frosting shell with soft, beveled edges at the top and
 * bottom, and applies a low-frequency noise displacement to the vertices to
 * create an organic, hand-frosted silhouette (breaking perfect symmetry).
 */
export function buildOrganicFrostingGeometry(radius, height, topDomeHeight = 0) {
  const bevelSize = 0.15; // Soft edge radius
  const path = new THREE.Path();

  // Start at bottom center
  path.moveTo(0, 0);

  // Bottom flat cap to start of bevel
  const rBottom = radius - bevelSize;
  if (rBottom > 0) {
    path.lineTo(rBottom, 0);
  }

  // Bottom bevel
  path.quadraticCurveTo(radius, 0, radius, bevelSize);

  // Straight side up to top bevel
  path.lineTo(radius, height - bevelSize);

  // Top bevel
  path.quadraticCurveTo(radius, height, radius - bevelSize, height);

  // Top cap to center, with optional dome
  if (topDomeHeight > 0) {
    path.quadraticCurveTo(
      (radius - bevelSize) / 2, height + topDomeHeight,
      0, height + topDomeHeight
    );
  } else {
    path.lineTo(0, height);
  }

  // Generate LatheGeometry (128 radial segments for smooth corner coverage)
  const geo = new THREE.LatheGeometry(path.getPoints(12), 128);

  // Fix UV coordinates for proper vertical gradient mapping
  const uvAttribute = geo.attributes.uv;
  const posAttribute = geo.attributes.position;

  // Calculate min and max Y values for normalization
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < posAttribute.count; i++) {
    const y = posAttribute.getY(i);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  // Remap V coordinates based on actual height (bottom = 0, top = 1)
  for (let i = 0; i < uvAttribute.count; i++) {
    const y = posAttribute.getY(i);
    const normalizedY = (y - minY) / (maxY - minY);
    uvAttribute.setY(i, normalizedY);
  }

  // Apply subtle organic wobble to the outer vertices (always positive so frosting never dips below base radius)
  const vertex = new THREE.Vector3();

  for (let i = 0; i < posAttribute.count; i++) {
    vertex.fromBufferAttribute(posAttribute, i);

    // Only displace vertices near the outer radius
    const distSq = vertex.x * vertex.x + vertex.z * vertex.z;
    if (distSq > (radius * 0.5) * (radius * 0.5)) {
      const angle = Math.atan2(vertex.z, vertex.x);

      // Low-frequency positive organic wobble
      const wobble =
        (Math.sin(angle * 3 + vertex.y * 2) * 0.5 + 0.5) * 0.01 +
        (Math.cos(angle * 5 - vertex.y * 1.5) * 0.5 + 0.5) * 0.008;

      const dist = Math.sqrt(distSq);
      const newDist = dist + wobble;

      vertex.x = (vertex.x / dist) * newDist;
      vertex.z = (vertex.z / dist) * newDist;

      posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }

  geo.computeVertexNormals();
  return geo;
}

export function quadBezier2(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

export function makeRidgeProfileFn(height, ridgeAmplitude, ridgeSpacing, shapePow, minRidgeCount) {
  const bevelSize = 0.15;
  const sideStart = bevelSize;
  const sideEnd = height - bevelSize;
  const sideSpan = Math.max(sideEnd - sideStart, 0.001);
  const ridgeCount = Math.max(minRidgeCount, Math.round(sideSpan / ridgeSpacing));
  const smoothstep = (edge0, edge1, t) => {
    const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
  };
  return (y) => {
    const t = (y - sideStart) / sideSpan;
    if (t < 0 || t > 1) return 0;
    const edgeFade = smoothstep(0, 0.08, t) * (1 - smoothstep(0.92, 1, t));
    const base = Math.sin(t * Math.PI * 2 * ridgeCount) * 0.5 + 0.5;
    const shaped = shapePow > 1 ? Math.pow(base, shapePow) : base;
    return shaped * ridgeAmplitude * edgeFade;
  };
}

export function computeRidgeCount(height, ridgeSpacing, minRidgeCount) {
  const bevelSize = 0.15;
  const sideSpan = Math.max(height - bevelSize * 2, 0.001);
  return Math.max(minRidgeCount, Math.round(sideSpan / ridgeSpacing));
}

export function buildGlazeGeometry(radius, height, topDomeHeight, rand, opts = {}) {
  const {
    // How far the glaze's OUTER (visible) surface puffs out past the
    // frosting underneath — unchanged in meaning from before.
    coatThickness = 0.16,
    ridgeProfileFn = null,
    capLift = 0.05,
    // Width of the rounded shoulder joining the top cap (dome or flat)
    // down to the outer wall — the profile runs (capRadius - bevelSize,
    // H) -> (capRadius, H - bevelSize) via a quadratic curl. The 0.15
    // default is tuned for standard tiers, where it is a subtle
    // ~4%-of-radius edge roll, but Petit Fours pieces are only ~0.5 in
    // radius: the same absolute width swallows nearly a third of their
    // top and reads as an obvious hill bump around the perimeter instead
    // of a flat top like a standard cake's, so CakeScene's Petit Fours
    // path passes a small pfBevel (~0.04-0.08) scaled to the piece.
    bevelSize = 0.15,
    sideSamples = 48,
    ridgeHugStrength = 1,
    edgeFadeDist = 0.4,
    // Keeps the angular drip pattern anchored to a reference cake size.
    // Larger cakes retain the same count, so each drip scales up with the
    // circumference instead of adding more, narrower drips.
    lobeCountRadius = null,
    // How much of that gap is actually solid glaze, measured in from the
    // outer surface. Previously buildGlazeGeometry only ever built the
    // outer surface (a single, zero-thickness lathed membrane): fine where
    // it stays fully closed, but at every carved drip edge — the whole
    // point of the Pattern picker — that membrane just stopped, with no
    // cross-section at all, reading as paper-thin no matter how big
    // coatThickness was. Defaults to HALF of coatThickness rather than the
    // full gap — unlike the Textured Buttercream variants below (which are
    // the cake's own frosting body, solid by construction), Glaze is a
    // poured coat *on top of* another finish, so its drip edge should read
    // as a thinner applied layer rather than matching the full puffed-out
    // offset. Pass something closer to coatThickness if a future look
    // wants the coat solid the whole way in to the frosting instead.
    wallThickness = coatThickness / 2,
    // Continues the deepest columns' own geometry outward/down to lie flat
    // and reach the plate — a genuine extension of the same continuous
    // surface, not a separate mesh, so a long finger reads as one
    // unbroken pour: down the cake, then flat across the plate. Off by
    // default (poolOuterRadius null). Only columns whose depth is within
    // poolThreshold of the ring's deepest point get this extension
    // (weighted smoothly in via poolWeight, a per-COLUMN value); shallower
    // columns' extra rows just collapse back onto their existing
    // endpoint, so nothing needs to be stitched by hand.
    poolOuterRadius = null,
    poolFloorY = 0,
    poolThreshold = 0.85,
    poolSamples = 14,
    // (angle, y) -> 0..1. Where this returns 1, glaze's outer AND inner
    // wall radius both collapse to the bare `radius` (no protrusion at
    // all) at that sample point — letting an active Side pattern (which
    // builds its own geometry further out, see CakeScene.jsx's
    // sideDecorationRadius) become the actual outermost visible surface
    // there, instead of glaze's own coat continuing to paint over it.
    // Returns 0 (untouched, full coatThickness) for any uncovered point —
    // gaps between a Checkered/Triangle Pattern's own cut shapes, say —
    // so glaze still shows through exactly where the pattern doesn't
    // cover, same "shave only where covered" contract spongeGeometry.js's
    // buildMashedCircleFillingGeometry coverageFn already uses for
    // Filling's own bumps. Both walls collapse toward the SAME target
    // (bare `radius`) proportionally, so outer never ends up thinner
    // than inner even at partial coverage.
    coverageFn = null,
  } = opts;

  const H = height + capLift;

  const capRadius = radius + coatThickness;
  const A = { x: capRadius, y: H - bevelSize };
  const bevelCtrl = { x: capRadius, y: H };
  const B = { x: capRadius - bevelSize, y: H };
  const topProfile = [];
  if (topDomeHeight > 0) {
    const domeCtrl = { x: (capRadius - bevelSize) / 2, y: H + topDomeHeight };
    const apex = { x: 0, y: H + topDomeHeight };
    const domeSamples = 20;
    for (let s = domeSamples; s >= 0; s--) {
      topProfile.push(quadBezier2(B, domeCtrl, apex, s / domeSamples));
    }
  } else {
    topProfile.push({ x: 0, y: H });
  }
  const bevelSamples = 10;
  for (let s = 1; s <= bevelSamples; s++) {
    topProfile.push(quadBezier2(B, bevelCtrl, A, s / bevelSamples));
  }
  const topProfileLen = topProfile.length;

  const carve = opts.carve || {};
  let carveYFracAt;
  let angularCycles;
  if (typeof carve.customProfileFn === 'function') {
    carveYFracAt = carve.customProfileFn;
    angularCycles = carve.angularCycles ?? 24;
  } else if (carve.wave) {
    const baseFrac = carve.baseFrac ?? 0.5;
    const ampFrac = carve.ampFrac ?? 0.05;
    const waveCount = carve.lobeCount ?? (10 + Math.floor(rand() * 3));
    const phase = rand() * Math.PI * 2;
    carveYFracAt = (angle) => baseFrac + ampFrac * Math.sin(angle * waveCount + phase);
    angularCycles = waveCount;
  } else {
    const deepFrac = carve.deepFrac ?? 0.85;
    const shortFrac = carve.shortFrac ?? 0.25;
    const cyclePattern = carve.cyclePattern || [deepFrac, shortFrac];
    const lobeSpacing = carve.lobeSpacing || 1.0;
    const countRadius = lobeCountRadius == null ? radius : Math.min(radius, lobeCountRadius);
    const approxLobeCount = (2 * Math.PI * countRadius) / lobeSpacing;
    const stepCount = cyclePattern.length;
    const fullCycles = Math.max(1, Math.round(approxLobeCount / stepCount));
    const totalLobes = fullCycles * stepCount;
    angularCycles = totalLobes;
    const smoothstep = (edge0, edge1, t) => {
      const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
      return x * x * (3 - 2 * x);
    };
    carveYFracAt = (angle) => {
      const u = (angle / (Math.PI * 2)) * totalLobes;
      const i0 = Math.floor(u);
      const frac = u - i0;
      const d0 = cyclePattern[((i0 % stepCount) + stepCount) % stepCount];
      const d1 = cyclePattern[(((i0 + 1) % stepCount) + stepCount) % stepCount];
      const blend = smoothstep(0, 1, frac);
      return d0 + (d1 - d0) * blend;
    };
  }

  const angularSamplesPerCycle = 16;
  const segments = Math.max(96, Math.min(256, angularCycles * angularSamplesPerCycle));

  const poolActive = poolOuterRadius != null;
  const rowsPerColumn = topProfileLen + sideSamples + (poolActive ? poolSamples : 0);
  const positions = [];
  const uvs = [];
  const indices = [];

  const smoothstep = (edge0, edge1, t) => {
    const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
  };

  // Deepest point the carve reaches at ANY angle, sampled coarsely once up
  // front. Needed so every column can be walked down the same absolute
  // height ladder below (see the loop's comment) instead of each column
  // normalizing its own row index to its own depth.
  let maxCarveFrac = 0;
  const carveFracProbeSteps = 360;
  for (let i = 0; i <= carveFracProbeSteps; i++) {
    const probeAngle = (i / carveFracProbeSteps) * Math.PI * 2;
    maxCarveFrac = Math.max(maxCarveFrac, carveYFracAt(probeAngle));
  }
  const globalBottomY = A.y * (1 - maxCarveFrac);

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const uCoord = i / segments;

    for (let j = 0; j < topProfileLen; j++) {
      const p = topProfile[j];
      positions.push(p.x * cosA, p.y, p.x * sinA);
      uvs.push(uCoord, (H - p.y) / H);
    }

    const carveFrac = carveYFracAt(angle);
    const bottomY = A.y * (1 - carveFrac);

    for (let s = 1; s <= sideSamples; s++) {
      const t = s / sideSamples;
      const yGlobal = A.y - (A.y - globalBottomY) * t;
      const y = Math.max(yGlobal, bottomY);

      // edgeFade: 0 right at this column's own tip (y === bottomY),
      // ramping to 1 by edgeFadeDist above it. Previously only scaled the
      // ridge-hug ADDITION below, leaving the BASE protrusion at a
      // constant full coatThickness the entire way down every column —
      // so each drip held full thickness right up to its cut point, then
      // (via the outer/inner rim stitch) ended in a thick, rounded cross-
      // section instead of pinching down close to the cake. Now scales
      // the base protrusion too, so the coat tapers in toward `radius`
      // (hugging close) as it nears its own tip, the way a real dripped
      // coat thins out rather than holding constant thickness to a blunt,
      // poofy end.
      const edgeFade = smoothstep(0, edgeFadeDist, y - bottomY);
      let r = radius + coatThickness * edgeFade;
      if (ridgeProfileFn && ridgeHugStrength > 0) {
        // angle passed as a second argument — existing Y-only profile
        // functions (Ridge Comb's makeRidgeProfileFn output) simply
        // ignore it, JS doesn't error on unused extra arguments, so this
        // is fully backward compatible. Lets a profile fn be genuinely
        // angle-aware instead of returning one shared displacement for
        // the whole angular sweep at a given height — see CakeScene.jsx's
        // Mashed Circles/Mashed Swirls hugging for the case that needs it.
        r += ridgeProfileFn(y, angle) * ridgeHugStrength * edgeFade;
      }
      if (coverageFn) {
        const coverage = THREE.MathUtils.clamp(coverageFn(angle, y), 0, 1);
        r = radius + (r - radius) * (1 - coverage);
      }

      positions.push(r * cosA, y, r * sinA);
      uvs.push(uCoord, (H - y) / H);

      if (poolActive && s === sideSamples) {
        // Picks up exactly where the hugged wall left off (r ≈ radius,
        // y ≈ globalBottomY for a genuinely deep column) and continues
        // outward/down toward the plate — the "then falls flat and hugs
        // the plate" half of the same continuous pour.
        const poolWeight = maxCarveFrac > 0
          ? smoothstep(poolThreshold, 1, carveFrac / maxCarveFrac)
          : 0;
        for (let p = 1; p <= poolSamples; p++) {
          const tp = smoothstep(0, 1, p / poolSamples);
          const spread = poolWeight * tp;
          const rp = r + (poolOuterRadius - r) * spread;
          const yp = y + (poolFloorY - y) * spread;
          positions.push(rp * cosA, yp, rp * sinA);
          uvs.push(uCoord, (H - yp) / H);
        }
      }
    }
  }

  const outerBase = 0;
  for (let i = 0; i < segments; i++) {
    const col0 = outerBase + i * rowsPerColumn;
    const col1 = outerBase + (i + 1) * rowsPerColumn;
    for (let r = 0; r < rowsPerColumn - 1; r++) {
      const a = col0 + r;
      const b = col1 + r;
      const c = col0 + r + 1;
      const d = col1 + r + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  // --- Inner wall -----------------------------------------------------
  // A second copy of the same lathed surface, pulled in by wallThickness
  // and with no ridge-hugging (it sits flush against the frosting, where
  // that surface texture wouldn't read through anyway). Same row/column
  // layout as the outer wall so the two line up exactly at every angle,
  // including each column's own carved bottom edge.
  const innerRadiusOffset = Math.max(0, coatThickness - wallThickness);
  const innerCapRadius = radius + innerRadiusOffset;
  const outerToInnerScale = capRadius > 0 ? innerCapRadius / capRadius : 1;
  const innerBase = positions.length / 3;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const uCoord = i / segments;

    for (let j = 0; j < topProfileLen; j++) {
      const p = topProfile[j];
      const r = p.x * outerToInnerScale;
      positions.push(r * cosA, p.y, r * sinA);
      uvs.push(uCoord, (H - p.y) / H);
    }

    const carveFrac = carveYFracAt(angle);
    const bottomY = A.y * (1 - carveFrac);

    for (let s = 1; s <= sideSamples; s++) {
      const t = s / sideSamples;
      const yGlobal = A.y - (A.y - globalBottomY) * t;
      const y = Math.max(yGlobal, bottomY);

      // Same taper as the outer wall just above — keeps the inner wall
      // proportionally inside the outer wall as both converge toward
      // `radius` near the tip, instead of the inner wall staying at a
      // fixed offset while only the outer wall thins (which would
      // invert the shell — inner ending up outside outer — right at the
      // point where it matters most).
      const edgeFade = smoothstep(0, edgeFadeDist, y - bottomY);
      let r = radius + (innerCapRadius - radius) * edgeFade;
      if (coverageFn) {
        const coverage = THREE.MathUtils.clamp(coverageFn(angle, y), 0, 1);
        r = radius + (r - radius) * (1 - coverage);
      }

      positions.push(r * cosA, y, r * sinA);
      uvs.push(uCoord, (H - y) / H);

      if (poolActive && s === sideSamples) {
        // Same continuation as the outer wall, converging to the SAME
        // target (poolOuterRadius, poolFloorY) so the coat tapers to zero
        // thickness right at the plate's edge too, same principle as the
        // tip-hug convergence just above it.
        const poolWeight = maxCarveFrac > 0
          ? smoothstep(poolThreshold, 1, carveFrac / maxCarveFrac)
          : 0;
        for (let p = 1; p <= poolSamples; p++) {
          const tp = smoothstep(0, 1, p / poolSamples);
          const spread = poolWeight * tp;
          const rp = r + (poolOuterRadius - r) * spread;
          const yp = y + (poolFloorY - y) * spread;
          positions.push(rp * cosA, yp, rp * sinA);
          uvs.push(uCoord, (H - yp) / H);
        }
      }
    }
  }

  // Reversed winding relative to the outer wall so the inner wall's
  // normals face into the coat (toward the frosting) instead of out.
  for (let i = 0; i < segments; i++) {
    const col0 = innerBase + i * rowsPerColumn;
    const col1 = innerBase + (i + 1) * rowsPerColumn;
    for (let r = 0; r < rowsPerColumn - 1; r++) {
      const a = col0 + r;
      const b = col1 + r;
      const c = col0 + r + 1;
      const d = col1 + r + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // --- Rim: stitch outer to inner along each column's carved bottom edge
  // so the drip actually has a visible cross-section there instead of
  // ending in a zero-thickness edge.
  const lastRow = rowsPerColumn - 1;
  for (let i = 0; i < segments; i++) {
    const outerA = outerBase + i * rowsPerColumn + lastRow;
    const outerB = outerBase + (i + 1) * rowsPerColumn + lastRow;
    const innerA = innerBase + i * rowsPerColumn + lastRow;
    const innerB = innerBase + (i + 1) * rowsPerColumn + lastRow;
    indices.push(outerA, outerB, innerA);
    indices.push(outerB, innerB, innerA);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * A flat body of glaze lying on the plate around the base of the cake —
 * independent of buildGlazeGeometry's drip wall/carve entirely. Long
 * Drips' own fingers are left exactly as buildGlazeGeometry already
 * builds them (some touching the plate, some not, per the carve pattern);
 * this is a second, separate mesh meant to sit right under/around them so
 * the whole base reads as "the glaze spread out and covered the plate",
 * regardless of which specific angles the drip fingers happen to reach.
 *
 * Built with the same TOP + BOTTOM dual-surface construction
 * buildGlazeGeometry's own wall uses (outer/inner there), rather than a
 * single one-sided sheet — a lone top surface has no actual cross-section
 * to it, so even a very solid-looking `thickness` still read as a thin
 * floating shell with nothing under it. The bottom surface sits flush at
 * y=0 (resting directly on the plate) across the whole radius; the top
 * holds at `thickness` for most of the disc, then feathers down to 0 by
 * outerRadius — which is exactly where the flat bottom already is, so the
 * two surfaces meet there on their own with no separate rim needed.
 * `startFeatherFrac` controls how much of the radius is spent on that
 * outer feather. The disc's own outer radius always matches `outerRadius`
 * exactly — no independent organic variation of its own — since it's
 * meant to sit precisely on the plate (see CakeScene.jsx's call site,
 * which passes PLATE_RADIUS directly), not wander to a size/shape that
 * doesn't actually correspond to the plate underneath it.
 */
export function buildGlazePoolGeometry(outerRadius, thickness = 0.05, rand = Math.random, opts = {}) {
  const {
    radialSamples = 28,
    angularSegments = 128,
    startFeatherFrac = 0.72,
  } = opts;

  const smoothstep = (edge0, edge1, t) => {
    const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
  };

  const positions = [];
  const uvs = [];
  const indices = [];

  const rowsPerColumn = radialSamples + 1;
  const topBase = 0;

  for (let i = 0; i <= angularSegments; i++) {
    const angle = (i / angularSegments) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const uCoord = i / angularSegments;

    for (let s = 0; s <= radialSamples; s++) {
      const t = s / radialSamples;
      const r = outerRadius * t;
      const height = thickness * (1 - smoothstep(startFeatherFrac, 1, t));
      positions.push(r * cosA, height, r * sinA);
      uvs.push(uCoord, t);
    }
  }

  for (let i = 0; i < angularSegments; i++) {
    const col0 = topBase + i * rowsPerColumn;
    const col1 = topBase + (i + 1) * rowsPerColumn;
    for (let r = 0; r < rowsPerColumn - 1; r++) {
      const a = col0 + r;
      const b = col1 + r;
      const c = col0 + r + 1;
      const d = col1 + r + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  // --- Bottom surface ---------------------------------------------------
  // Flush at y=0 across the whole radius (it's resting directly on the
  // plate), using the SAME outerRadius as the top so the two surfaces'
  // outer edges land on exactly the same (x, y, z) at t=1 — that's what
  // closes the shape there with no visible seam or hollow rim.
  const bottomBase = positions.length / 3;

  for (let i = 0; i <= angularSegments; i++) {
    const angle = (i / angularSegments) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const uCoord = i / angularSegments;

    for (let s = 0; s <= radialSamples; s++) {
      const t = s / radialSamples;
      const r = outerRadius * t;
      positions.push(r * cosA, 0, r * sinA);
      uvs.push(uCoord, t);
    }
  }

  // Reversed winding relative to the top surface, so its normals face
  // downward (toward the plate) instead of up — same convention
  // buildGlazeGeometry's inner wall uses relative to its outer wall.
  for (let i = 0; i < angularSegments; i++) {
    const col0 = bottomBase + i * rowsPerColumn;
    const col1 = bottomBase + (i + 1) * rowsPerColumn;
    for (let r = 0; r < rowsPerColumn - 1; r++) {
      const a = col0 + r;
      const b = col1 + r;
      const c = col0 + r + 1;
      const d = col1 + r + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function makeGlazeMaterial(colorHex) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    side: THREE.DoubleSide,
  });
}

/**
 * Textured Buttercream variant of buildOrganicFrostingGeometry (Ridged Comb).
 */
export function buildTexturedButtercreamGeometry(radius, height, topDomeHeight = 0) {
  const bevelSize = 0.15;
  const ridgeAmplitude = 0.07;
  const ridgeSpacing = 0.42;
  const path = new THREE.Path();

  path.moveTo(0, 0);

  const rBottom = radius - bevelSize;
  if (rBottom > 0) path.lineTo(rBottom, 0);

  path.quadraticCurveTo(radius, 0, radius, bevelSize);

  const sideStart = bevelSize;
  const sideEnd = height - bevelSize;
  const sideSpan = Math.max(sideEnd - sideStart, 0.001);
  const ridgeCount = Math.max(3, Math.round(sideSpan / ridgeSpacing));
  const sideSteps = Math.max(32, ridgeCount * 12);

  const smoothstep = (edge0, edge1, t) => {
    const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
  };

  for (let i = 1; i <= sideSteps; i++) {
    const t = i / sideSteps;
    const y = sideStart + sideSpan * t;
    const edgeFade = smoothstep(0, 0.08, t) * (1 - smoothstep(0.92, 1, t));
    const ridgeShape = Math.sin(t * Math.PI * 2 * ridgeCount) * 0.5 + 0.5;
    const ridge = ridgeShape * ridgeAmplitude * edgeFade;
    path.lineTo(radius + ridge, y);
  }

  path.quadraticCurveTo(radius, height, radius - bevelSize, height);

  if (topDomeHeight > 0) {
    path.quadraticCurveTo(
      (radius - bevelSize) / 2, height + topDomeHeight,
      0, height + topDomeHeight
    );
  } else {
    path.lineTo(0, height);
  }

  const geo = new THREE.LatheGeometry(path.getPoints(sideSteps + 8), 96);

  const posAttribute = geo.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < posAttribute.count; i++) {
    vertex.fromBufferAttribute(posAttribute, i);

    const distSq = vertex.x * vertex.x + vertex.z * vertex.z;
    if (distSq > (radius * 0.5) * (radius * 0.5)) {
      const angle = Math.atan2(vertex.z, vertex.x);

      const wobble =
        (Math.sin(angle * 4) * 0.5 + 0.5) * 0.01 +
        (Math.cos(angle * 6) * 0.5 + 0.5) * 0.006;

      const dist = Math.sqrt(distSq);
      const newDist = dist + wobble;

      vertex.x = (vertex.x / dist) * newDist;
      vertex.z = (vertex.z / dist) * newDist;

      posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Ribbon Wrap variant of Textured Buttercream.
 */
export function buildRibbonWrapButtercreamGeometry(radius, height, topDomeHeight = 0) {
  const bevelSize = 0.15;
  const ridgeAmplitude = 0.05;
  const ridgeSpacing = 0.26;
  const path = new THREE.Path();

  path.moveTo(0, 0);

  const rBottom = radius - bevelSize;
  if (rBottom > 0) path.lineTo(rBottom, 0);

  path.quadraticCurveTo(radius, 0, radius, bevelSize);

  const sideStart = bevelSize;
  const sideEnd = height - bevelSize;
  const sideSpan = Math.max(sideEnd - sideStart, 0.001);
  const ridgeCount = Math.max(4, Math.round(sideSpan / ridgeSpacing));
  const sideSteps = Math.max(40, ridgeCount * 14);

  const smoothstep = (edge0, edge1, t) => {
    const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
  };

  for (let i = 1; i <= sideSteps; i++) {
    const t = i / sideSteps;
    const y = sideStart + sideSpan * t;
    const edgeFade = smoothstep(0, 0.08, t) * (1 - smoothstep(0.92, 1, t));
    const bandShape = Math.pow(Math.sin(t * Math.PI * 2 * ridgeCount) * 0.5 + 0.5, 3.5);
    const ridge = bandShape * ridgeAmplitude * edgeFade;
    path.lineTo(radius + ridge, y);
  }

  path.quadraticCurveTo(radius, height, radius - bevelSize, height);

  if (topDomeHeight > 0) {
    path.quadraticCurveTo(
      (radius - bevelSize) / 2, height + topDomeHeight,
      0, height + topDomeHeight
    );
  } else {
    path.lineTo(0, height);
  }

  const geo = new THREE.LatheGeometry(path.getPoints(sideSteps + 8), 96);

  const posAttribute = geo.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < posAttribute.count; i++) {
    vertex.fromBufferAttribute(posAttribute, i);

    const distSq = vertex.x * vertex.x + vertex.z * vertex.z;
    if (distSq > (radius * 0.5) * (radius * 0.5)) {
      const angle = Math.atan2(vertex.z, vertex.x);

      const wobble =
        (Math.sin(angle * 4) * 0.5 + 0.5) * 0.008 +
        (Math.cos(angle * 6) * 0.5 + 0.5) * 0.005;

      const dist = Math.sqrt(distSq);
      const newDist = dist + wobble;

      vertex.x = (vertex.x / dist) * newDist;
      vertex.z = (vertex.z / dist) * newDist;

      posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Vertical Piping variant of Textured Buttercream.
 */
export function buildVerticalPipingButtercreamGeometry(radius, height, topDomeHeight = 0) {
  const bevelSize = 0.15;
  const path = new THREE.Path();

  path.moveTo(0, 0);

  const rBottom = radius - bevelSize;
  if (rBottom > 0) path.lineTo(rBottom, 0);

  path.quadraticCurveTo(radius, 0, radius, bevelSize);
  path.lineTo(radius, height - bevelSize);
  path.quadraticCurveTo(radius, height, radius - bevelSize, height);

  if (topDomeHeight > 0) {
    path.quadraticCurveTo(
      (radius - bevelSize) / 2, height + topDomeHeight,
      0, height + topDomeHeight
    );
  } else {
    path.lineTo(0, height);
  }

  const RADIAL_SEGMENTS = 224;
  const geo = new THREE.LatheGeometry(path.getPoints(24), RADIAL_SEGMENTS);

  const pipeCount = 32;
  const pipeAmplitude = 0.095;

  const posAttribute = geo.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < posAttribute.count; i++) {
    vertex.fromBufferAttribute(posAttribute, i);

    const distSq = vertex.x * vertex.x + vertex.z * vertex.z;
    const fullRadiusThreshold = (radius * 0.5) * (radius * 0.5);

    if (distSq > fullRadiusThreshold) {
      const angle = Math.atan2(vertex.z, vertex.x);
      const pipeShape = Math.pow(Math.sin(angle * pipeCount) * 0.5 + 0.5, 5);

      const dist = Math.sqrt(distSq);
      const fullRadius = Math.sqrt(fullRadiusThreshold);
      const radialFade = Math.min(1, Math.max(0, (dist - fullRadius) / (radius - fullRadius)));

      const ridge = pipeShape * pipeAmplitude * radialFade;
      const newDist = dist + ridge;

      vertex.x = (vertex.x / dist) * newDist;
      vertex.z = (vertex.z / dist) * newDist;

      posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }

  geo.computeVertexNormals();
  return geo;
}