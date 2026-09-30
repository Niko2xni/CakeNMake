import * as THREE from 'three';
import { getFrostingMaterial, applyVerticalGradientUV } from './frostingMaterial';
import { markShared, parseGradientStops } from './materialUtils';
import { buildGradientTexture } from './cakeTextures';
import { SUGAR_COLORS } from '../../lib/cakeConfig';
import { buildStrawberryMesh } from './toppings/strawberry';
import { buildHersheysKissMesh } from './toppings/hersheysKiss';
import { buildFerreroRocherMesh } from './toppings/ferreroRocher';
import { buildOreoMesh } from './toppings/oreo';
import { buildCherryMesh } from './toppings/cherry';
import { buildBasketballMesh } from './toppings/basketball';
import { buildSoccerBallMesh } from './toppings/soccerBall';

// ─── Decoration Set Geometry — first working example per category ─────────
// Per instruction: keep every placeholder Set button in the UI (don't
// reduce the roster), but only ONE per category needs real 3D geometry
// right now, so the whole Surface/Center/Edge/Side data pipeline can
// actually be tested end-to-end before investing in every named design.
//
// Reused instead of rebuilt: Surface > Full Coverage (whippedSkirt)
// already has working geometry in sets/skirtHelpers.jsx from the old Sets
// system — wired directly in CakeScene.jsx, nothing new needed here.
// (Tuxedo used to be reused the same way from sets/tuxedoHelpers.jsx, but
// was retired along with Fondant Swag and Stripes in favor of Sunshine
// Play — see sets/sunshinePlayHelpers.js.) Center > Floral Cluster reuses
// CakeScene.jsx's existing addRosette() the same way. This module only
// covers the genuinely new geometry: Drip, Beaded Trim.

/**
 * Drip — a ring of teardrop blobs hanging from the top edge, each a
 * LatheGeometry profile (radially symmetric, tapering from a wide
 * attachment point at the top to a rounded tip at the bottom). Length
 * varies per instance via the instance matrix scale for a natural,
 * hand-piped irregularity instead of uniform drips.
 */
function buildDripUnitGeometry() {
  const points = [
    new THREE.Vector2(0.0, -1.0),   // tip — closed off (radius 0)
    new THREE.Vector2(0.05, -0.92),
    new THREE.Vector2(0.09, -0.68), // bulb — widest point
    new THREE.Vector2(0.07, -0.42),
    new THREE.Vector2(0.075, -0.18),
    new THREE.Vector2(0.09, 0.0),   // top — attachment radius
  ];
  return new THREE.LatheGeometry(points, 10);
}

export function buildDripRing(radius, colorHex, rand, opts = {}) {
  const count = opts.count ?? Math.max(14, Math.round((radius * Math.PI * 2) / 0.5));
  const baseLength = opts.baseLength ?? 0.9;
  const mat = new THREE.MeshPhysicalMaterial({ color: colorHex, roughness: 0.28, clearcoat: 0.55 });
  const geo = buildDripUnitGeometry();
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.15;
    const lengthVariation = 0.55 + rand() * 0.9; // irregular drip lengths, like real gravity-fed icing
    dummy.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    dummy.scale.set(1, baseLength * lengthVariation, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

/**
 * Beaded Trim — alternating large/small pearl beads along a ring, evenly
 * spaced with visible gaps (distinct from the tight, continuous look of
 * the "Round" piping tip in pipingTips.js — this is meant to read as a
 * strung decoration, not a piped border).
 */
export function computeEdgeTrimY(topSurfaceY, radius, decorationType = 'piping', exteriorFinishStyle = 'fullyFrosted', isBottom = false) {
  const isDollopType = decorationType === 'dollops'
    || (typeof decorationType === 'string' && decorationType.startsWith('whippedCreamRosette'))
    || (typeof decorationType === 'string' && decorationType.toLowerCase().includes('dollop'));
  const isFruitRim = [
    'strawberryRim',
    'hersheysKissRim',
    'ferreroRocherRim',
    'oreoRim',
    'cherryRim',
    'basketballRim',
    'soccerBallRim',
  ].includes(decorationType);

  if (isBottom) {
    if (isFruitRim) {
      return 0.0;
    }
    // Bottom edge decorations rest on top of the cake board / plate plane
    // rather than subtracting top-surface recess depths.
    if (isDollopType) {
      return -0.02; // Dollop base sits directly on top of the cake board
    }
    return -0.05;
  }
  if (isFruitRim) {
    return decorationType === 'strawberryRim' ? topSurfaceY - 0.04 : topSurfaceY;
  }
  if (exteriorFinishStyle === 'naked') {
    // compactDepth + extraInset below (0.10–0.16 depending on cake size
    // and decoration type — see the numbers this replaced) were tuned
    // assuming there's a frosting cap to recess the trim into. Naked's
    // top is bare flat sponge meeting the side wall at a hard, unbeveled
    // 90° corner — there's no material there to sink into, and no bevel
    // to visually absorb it either. Any real dip below the true top
    // surface doesn't nestle in, it punches straight through that corner
    // into the side wall's own geometry, which is exactly the
    // dripping/smearing artifact in the screenshots. topSurfaceY already
    // carries a small +0.05 buffer above the true flat surface (see
    // topY's own definition in CakeScene.jsx), which compactDepth alone
    // already exceeds on every realistic cake size — so this isn't a
    // constant that needs re-tuning, Naked genuinely needs a different
    // formula, not a different number in the same one. A small fixed
    // recess keeps it visually flush without ever going negative.
    return topSurfaceY - 0.02;
  }
  const compactDepth = Math.min(0.12, Math.max(0.06, radius * 0.08));
  const finishDepth = 0.06;
  const extraInset = decorationType === 'beadedTrim' ? 0.02 : 0.04;
  return topSurfaceY - (compactDepth + extraInset + finishDepth);
}

export function computeEdgeTrimRadius(edgeRadius, decorationType = 'piping', exteriorFinishStyle = 'fullyFrosted', isBottom = false) {
  // `edgeRadius` (topRadius/BASE_RADIUS in CakeScene.jsx) is the raw
  // sponge radius, identical for every finish — unlike topSurfaceY above,
  // nothing upstream adjusts it for frosting bulge. Deriving an actual
  // surfaceRadius first (the same frosting-bulge convention the Side
  // decorations already use), then applying ONE consistent radialInset on
  // top of that for every finish, keeps the trim sitting an equivalent
  // distance from each finish's own real edge.
  const surfaceRadius = exteriorFinishStyle === 'naked'
    ? edgeRadius - 0.02
    : edgeRadius + (exteriorFinishStyle === 'texturedButtercream' ? 0.08 : 0.06);

  const isWhippedCream = typeof decorationType === 'string' && decorationType.startsWith('whippedCreamRosette');
  const isDollopType = isWhippedCream || decorationType === 'dollops' || (typeof decorationType === 'string' && decorationType.toLowerCase().includes('dollop'));

  const baseTip = typeof decorationType === 'string'
    ? decorationType.replace(/Cherry$/, '').replace(/Strawberry$/, '').replace(/Alt$/, '')
    : decorationType;
  let topDollopInset = 0.76;
  if (baseTip === 'starDollopContinuous') {
    topDollopInset = 0.66;
  } else if (baseTip === 'starDollop' || baseTip === 'roundDollopMedium' || baseTip === 'kissDollopMedium') {
    topDollopInset = 0.76;
  } else if (baseTip === 'starDollopSparse' || baseTip === 'roundDollopSparse' || baseTip === 'kissDollopSparse') {
    topDollopInset = 0.82;
  } else if (baseTip === 'roundDollop' || baseTip === 'kissDollop') {
    topDollopInset = 0.58;
  } else if (baseTip === 'whippedCreamRosetteContinuous') {
    topDollopInset = 0.72;
  } else if (baseTip === 'whippedCreamRosette') {
    topDollopInset = 0.82;
  } else if (baseTip === 'whippedCreamRosetteSparse') {
    topDollopInset = 0.94;
  }

  let bottomRadialInset = -0.25;
  if (baseTip === 'beadedTrim') {
    bottomRadialInset = -0.10;
  } else if (baseTip === 'whippedCreamRosetteContinuous') {
    bottomRadialInset = -0.63;
  } else if (baseTip === 'whippedCreamRosette') {
    bottomRadialInset = -0.74;
  } else if (baseTip === 'whippedCreamRosetteSparse') {
    bottomRadialInset = -0.85;
  } else if (baseTip === 'starDollopContinuous' || baseTip === 'roundDollopContinuous' || baseTip === 'kissDollopContinuous') {
    bottomRadialInset = -0.464;
  } else if (baseTip === 'starDollop' || baseTip === 'roundDollopMedium' || baseTip === 'kissDollopMedium' || baseTip === 'dollops') {
    bottomRadialInset = -0.544;
  } else if (baseTip === 'starDollopSparse' || baseTip === 'roundDollopSparse' || baseTip === 'kissDollopSparse') {
    bottomRadialInset = -0.592;
  } else if (baseTip === 'roundDollop' || baseTip === 'kissDollop') {
    bottomRadialInset = -0.40;
  } else if (baseTip === 'ferreroRocherRim') {
    bottomRadialInset = -0.61;
  } else if (baseTip === 'hersheysKissRim') {
    bottomRadialInset = -0.41;
  } else if (baseTip === 'strawberryRim') {
    bottomRadialInset = -0.31;
  } else if (baseTip === 'oreoRim') {
    bottomRadialInset = -0.20;
  } else if (baseTip === 'cherryRim') {
    bottomRadialInset = -0.36;
  } else if (baseTip === 'basketballRim' || baseTip === 'soccerBallRim') {
    bottomRadialInset = -0.50;
  } else if (baseTip === 'bead') {
    bottomRadialInset = -0.34;
  } else if (baseTip === 'reverseShell') {
    bottomRadialInset = -0.24;
  } else if (baseTip === 'shell' || baseTip === 'elongatedShell') {
    bottomRadialInset = -0.22;
  } else if (['zigzag', 'wavePiping', 'ropeTwist', 'ropeTwistClassic', 'pulledDot'].includes(baseTip)) {
    bottomRadialInset = -0.21;
  } else if (isWhippedCream) {
    bottomRadialInset = -0.74;
  } else if (isDollopType) {
    bottomRadialInset = -0.544;
  }

  const topFruitRimInset = {
    strawberryRim: 0.42,
    hersheysKissRim: 0.48,
    ferreroRocherRim: 0.65,
    oreoRim: 0.22,
    cherryRim: 0.36,
    basketballRim: 0.50,
    soccerBallRim: 0.50,
  }[baseTip];
  const radialInset = isBottom
    ? bottomRadialInset
    : (topFruitRimInset ?? (baseTip === 'beadedTrim' ? 0.22
      : (isDollopType ? topDollopInset
      : (['shell', 'reverseShell', 'elongatedShell'].includes(baseTip) ? 0.40
      : (baseTip === 'bead' ? 0.38
      : (baseTip === 'pulledDot' ? 0.40
      : (baseTip === 'zigzag' ? 0.40
      : (baseTip === 'wavePiping' ? 0.40
      : (['ropeTwist', 'ropeTwistClassic'].includes(baseTip) ? 0.40 : 0.26)))))))));
  return Math.max(0.15, surfaceRadius - radialInset);
}

const beadedTrimMaterialCache = {};

export function getBeadedTrimMaterial(colorHex, colorId = null) {
  const cacheKey = colorId ? `${colorId}_${colorHex}` : colorHex;
  if (beadedTrimMaterialCache[cacheKey]) {
    return beadedTrimMaterialCache[cacheKey];
  }

  const sugarColor = colorId ? SUGAR_COLORS.find((c) => c.id === colorId) : null;
  const isGradient = sugarColor && sugarColor.swatchCss && sugarColor.swatchCss.includes('gradient');
  const isMetallic = !!(sugarColor && sugarColor.metallic);

  let gradientTexture = null;
  if (isGradient) {
    const colorStops = parseGradientStops(sugarColor.swatchCss);
    if (colorStops.length > 0) {
      gradientTexture = buildGradientTexture(colorStops, 512, 512);
      gradientTexture.wrapS = THREE.ClampToEdgeWrapping;
      gradientTexture.wrapT = THREE.ClampToEdgeWrapping;
      gradientTexture.needsUpdate = true;
    }
  }

  let mat;
  if (isGradient && gradientTexture) {
    mat = new THREE.MeshPhysicalMaterial({
      map: gradientTexture,
      roughness: 0.25,
      clearcoat: 0.6,
    });
    mat.userData.isGradient = true;
  } else if (isMetallic) {
    mat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: 0.2,
      metalness: 0.85,
      clearcoat: 0.8,
    });
    mat.userData.isMetallic = true;
  } else {
    mat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: 0.25,
      clearcoat: 0.6,
    });
  }

  beadedTrimMaterialCache[cacheKey] = markShared(mat);
  return mat;
}

/**
 * Beaded Trim — shares one geometry function across every bead-rhythm
 * design (`opts.pattern`): 'classic' (Big/Small alternating, the
 * original), 'trio' (Small → Big → Medium), 'petite' (uniform small),
 * 'graduated' (a swelling/tapering wave), 'spacer' (Big, Small, Small),
 * 'grand' (uniform bold), and three 'morse*' patterns (dot/dash Morse-code
 * rhythms, built from spheres + capsules rather than the plain sphere
 * ring the other patterns use).
 */
export function buildBeadedTrimRing(radius, colorHex, rand, opts = {}) {
  const pattern = opts.pattern || 'classic';
  const colorId = opts.colorId || null;
  const mat = getBeadedTrimMaterial(colorHex, colorId);

  if (pattern.startsWith('morse')) {
    const MORSE_SPECS = {
      morseDotDashDot: { nominal: 1.84, dots: [0.13, 1.39], dashes: [0.76], dashLen: 0.46 },
      morseDotDash: { nominal: 1.40, dots: [0.13], dashes: [0.76], dashLen: 0.46 },
      morseDotDotDash: { nominal: 1.84, dots: [0.13, 0.53], dashes: [1.16], dashLen: 0.46 },
    };
    const spec = MORSE_SPECS[pattern] || MORSE_SPECS.morseDotDashDot;
    const C = Math.PI * 2 * radius;
    const M = Math.max(4, Math.round(C / spec.nominal));
    const cycleLen = C / M;
    const k = cycleLen / spec.nominal;

    const dotAngles = [];
    const dashAngles = [];
    for (let c = 0; c < M; c++) {
      const cycleStartArc = c * cycleLen;
      for (const dOffset of spec.dots) {
        dotAngles.push((cycleStartArc + dOffset * k) / radius);
      }
      for (const dsOffset of spec.dashes) {
        dashAngles.push((cycleStartArc + dsOffset * k) / radius);
      }
    }

    const group = new THREE.Group();
    if (dotAngles.length > 0) {
      const dotGeo = applyVerticalGradientUV(new THREE.SphereGeometry(0.13, 14, 10));
      const dotMesh = new THREE.InstancedMesh(dotGeo, mat, dotAngles.length);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < dotAngles.length; i++) {
        const angle = dotAngles[i];
        dummy.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
        const scale = 0.95 + rand() * 0.10;
        dummy.scale.setScalar(scale);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        dotMesh.setMatrixAt(i, dummy.matrix);
      }
      dotMesh.instanceMatrix.needsUpdate = true;
      dotMesh.castShadow = true;
      dotMesh.receiveShadow = true;
      group.add(dotMesh);
    }

    if (dashAngles.length > 0) {
      const dashGeo = applyVerticalGradientUV(new THREE.CapsuleGeometry(0.13, spec.dashLen * k, 8, 14));
      const dashMesh = new THREE.InstancedMesh(dashGeo, mat, dashAngles.length);
      const dummy = new THREE.Object3D();
      const upVec = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < dashAngles.length; i++) {
        const angle = dashAngles[i];
        dummy.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
        const tangent = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
        dummy.quaternion.setFromUnitVectors(upVec, tangent);
        const scale = 0.95 + rand() * 0.10;
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        dashMesh.setMatrixAt(i, dummy.matrix);
      }
      dashMesh.instanceMatrix.needsUpdate = true;
      dashMesh.castShadow = true;
      dashMesh.receiveShadow = true;
      group.add(dashMesh);
    }

    return group;
  }

  let count = opts.count;
  if (!count) {
    const rawCount = Math.max(18, Math.round((radius * Math.PI * 2) / 0.28));
    if (pattern === 'trio' || pattern === 'spacer') {
      count = Math.max(18, Math.round(rawCount / 3) * 3);
    } else if (pattern === 'graduated') {
      count = Math.max(18, Math.round(rawCount / 6) * 6);
    } else if (pattern === 'classic') {
      count = Math.max(18, Math.round(rawCount / 2) * 2);
    } else {
      count = rawCount;
    }
  }
  const geo = applyVerticalGradientUV(new THREE.SphereGeometry(0.13, 14, 10));
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    let baseScale;
    if (pattern === 'trio') {
      const cyclePos = i % 3;
      baseScale = cyclePos === 0 ? 0.58 : cyclePos === 1 ? 1.05 : 0.82;
    } else if (pattern === 'petite') {
      baseScale = 0.62;
    } else if (pattern === 'graduated') {
      const cyclePos = i % 6;
      baseScale = [0.55, 0.72, 0.92, 1.06, 0.92, 0.72][cyclePos];
    } else if (pattern === 'spacer') {
      const cyclePos = i % 3;
      baseScale = cyclePos === 0 ? 1.06 : 0.55;
    } else if (pattern === 'grand') {
      baseScale = 1.02;
    } else {
      const big = i % 2 === 0;
      baseScale = big ? 1 : 0.62;
    }
    const scale = baseScale * (0.92 + rand() * 0.16);
    dummy.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

/**
 * Fresh Strawberries Rim — a handcrafted ring of complete ripe strawberries
 * sitting directly along the cake edge.
 */
export function buildStrawberryRimRing(radius, y, rand = Math.random, opts = {}) {
  const count = opts.count ?? Math.max(10, Math.round((radius * Math.PI * 2) / 1.45));
  const scale = opts.scale ?? 0.82;
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const cx = Math.sin(angle) * radius;
    const cz = Math.cos(angle) * radius;
    const strawberry = buildStrawberryMesh(cx, y, cz, scale, rand);
    strawberry.rotation.y = angle;
    strawberry.rotation.x = -0.38 + (rand() - 0.5) * 0.08;
    strawberry.rotation.z += (rand() - 0.5) * 0.08;
    group.add(strawberry);
  }
  return group;
}

/**
 * Hershey's Kisses Chocolate Rim — upright chocolate kisses lining the cake rim.
 */
export function buildHersheysKissRimRing(radius, y, rand = Math.random, opts = {}) {
  const count = opts.count ?? Math.max(12, Math.round((radius * Math.PI * 2) / 1.35));
  const scale = opts.scale ?? 0.36;
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const cx = Math.sin(angle) * radius;
    const cz = Math.cos(angle) * radius;
    const rotY = angle + (rand() - 0.5) * 0.3;
    const kiss = buildHersheysKissMesh(cx, y, cz, scale, rotY);
    group.add(kiss);
  }
  return group;
}

/**
 * Ferrero Rocher Truffle Rim — textured hazelnut chocolate truffles lining the cake rim.
 */
export function buildFerreroRocherRimRing(radius, y, rand = Math.random, opts = {}) {
  const count = opts.count ?? Math.max(8, Math.round((radius * Math.PI * 2) / 2.15));
  const scale = opts.scale ?? 0.45;
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const cx = Math.sin(angle) * radius;
    const cz = Math.cos(angle) * radius;
    const truffle = buildFerreroRocherMesh(cx, y, cz, scale);
    truffle.rotation.y = rand() * Math.PI * 2;
    group.add(truffle);
  }
  return group;
}

/**
 * Oreo Rim — complete embossed sandwich cookies standing tangent to the cake
 * edge. Top cookies are sunk slightly into the frosting so they look planted
 * rather than balanced above it. Bottom cookies rest on the board and lean
 * radially inward so their upper edges meet the cake wall.
 */
export function buildOreoRimRing(radius, y, rand = Math.random, opts = {}) {
  const count = opts.count ?? Math.max(10, Math.round((radius * Math.PI * 2) / 1.8));
  const scale = opts.scale ?? 0.3889;
  const isBottom = opts.isBottom ?? false;
  const inwardLean = isBottom ? 0.22 : 0;
  const surfaceOffset = (isBottom ? -0.04 : -0.18) * scale;
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const cx = Math.sin(angle) * radius;
    const cz = Math.cos(angle) * radius;
    const cookie = buildOreoMesh(
      cx,
      y + surfaceOffset,
      cz,
      scale,
      Math.PI / 2 - inwardLean,
      angle,
      0
    );
    cookie.rotation.z += (rand() - 0.5) * 0.08;
    group.add(cookie);
  }
  return group;
}

/** Cherry Rim — complete glossy cherries nestled along the cake edge. */
export function buildCherryRimRing(radius, y, rand = Math.random, opts = {}) {
  const count = opts.count ?? 18;
  const scale = opts.scale ?? 0.85;
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const cx = Math.sin(angle) * radius;
    const cz = Math.cos(angle) * radius;
    const cherry = buildCherryMesh(cx, y, cz, scale, rand);
    cherry.rotation.y = angle + (rand() - 0.5) * 0.3;
    cherry.rotation.x = (rand() - 0.5) * 0.06;
    cherry.rotation.z = (rand() - 0.5) * 0.06;
    group.add(cherry);
  }
  return group;
}

function buildBallRimRing(buildBall, radius, y, rand, opts) {
  const count = opts.count ?? 16;
  const scale = opts.scale ?? 0.18;
  const surfaceLift = 0.50 * scale;
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const cx = Math.sin(angle) * radius;
    const cz = Math.cos(angle) * radius;
    const ball = buildBall(cx, y + surfaceLift, cz, scale);
    ball.rotation.y = angle + rand() * Math.PI * 2;
    group.add(ball);
  }
  return group;
}

/** Basketball Rim — complete textured basketballs lining the cake edge. */
export function buildBasketballRimRing(radius, y, rand = Math.random, opts = {}) {
  return buildBallRimRing(buildBasketballMesh, radius, y, rand, opts);
}

/** Soccer Ball Rim — complete paneled soccer balls lining the cake edge. */
export function buildSoccerBallRimRing(radius, y, rand = Math.random, opts = {}) {
  return buildBallRimRing(buildSoccerBallMesh, radius, y, rand, opts);
}

/**
 * Checkered Pattern (Buttercream Stenciling) — real 3D raised squares,
 * NOT a flat printed texture. Every other decoration in this file (Drip,
 * Beaded Trim) is actual instanced geometry — the earlier texture-based
 * version was the inconsistent exception, which is part of why it read as
 * a printed edible sheet instead of a stenciled decoration. Only the
 * "black" squares get real geometry at all — the "white" squares are
 * simply absent, so the base frosting shows through naturally, exactly
 * like a real stencil where color is only pushed through the cutouts. One
 * fixed real-world square size is used for both the side wrap and the top
 * disc, so squares read as the same physical size everywhere instead of
 * the side ones looking shrunken.
 */
const CHECKER_SQUARE_SIZE = 1.22; // same physical size on sides AND top
const CHECKER_STANDOFF = -0.06;   // negative standoff embeds the back face into the cake to hide gaps
const CHECKER_THICKNESS = 0.12;   // increased thickness offsets the embedding so the front face stays visible
const CHECKER_GAP_RATIO = 0.9;    // slightly smaller than the grid cell, like stencil grout lines

// Was a plain THREE.MeshStandardMaterial({ color }) — a flat color only,
// with no way to build the real pattern/gradient/metallic material for
// Marble/Ombré/Rainbow Swirl/Gold Shimmer/Watercolor Pastel Mix/Red-White
// Gradient, so all six silently rendered as a flat swatch regardless of
// which was picked (same failure this had in common with Filling Piping/
// the Frosting Shell before those were fixed to pass a colorId through).
// Now delegates to getFrostingMaterial (frostingMaterial.js) — the same
// shared material Exterior Finish/Filling Piping/Glaze use — instead of
// building its own separate flat-color material, so Checkered Pattern
// gets the same pattern/gradient/metallic support those already have, and
// reads as the same "buttercream" material family the squares are
// actually meant to look like (see buildCheckerSideSquares' own "real
// raised squares (buttercream stenciling)" comment below).
function buildCheckerSquareMaterial(colorHex, colorId = null) {
  return getFrostingMaterial(colorHex ?? '#1F1F1F', colorId);
}

/** Raised black squares wrapped around a tier's side wall.
 *  - pattern 'full' (default) — checkerboard-spaced, only every other cell
 *    gets a square. Used by "Full Pattern". Adjacent black diagonals are
 *    separated by exactly 1 empty diagonal line (the tightest possible
 *    spacing on a checkerboard).
 *  - pattern 'leftDiagonal' / 'rightDiagonal' — both start from the same
 *    checkerboard grid, but instead of keeping every "black" diagonal,
 *    this thins that alternation further: it indexes the black diagonals
 *    themselves (0, 1, 2, 3, ... — NOT the raw row±col value, which only
 *    ever takes even values here and so can't distinguish more than 2
 *    buckets on its own), then within every `diagonalPeriod` of THAT
 *    index, only the first `diagonalBandWidth` stay fully solid black;
 *    the skipped diagonal(s) in between aren't fully removed either —
 *    every `gapDashPeriod`-th cell along them is kept as a "dash"
 *    (default: every other cell). Repeats around the whole cylinder, so
 *    the result reads as a solid diagonal stripe, a broken/dashed
 *    diagonal, a solid stripe, etc. — a shorter-feeling gap than a fully
 *    empty diagonal, while staying visibly less dense than Full Pattern
 *    (which has no empty cells at all on its diagonals).
 *    'leftDiagonal' groups diagonals by (col + row); 'rightDiagonal' by
 *    (col - row) — the mirror-image direction, so the stripe leans the
 *    opposite way around the cylinder.
 *
 *    `opts.color` sets the square color (defaults to '#1F1F1F', the
 *    original hardcoded black) — previously there was no way to pass a
 *    color in at all, so every checkered cake rendered black regardless
 *    of what was picked elsewhere in the app.
 *    Math note: because black/white diagonals strictly alternate by
 *    parity, a *fully emptied* gap between two solid diagonals is always
 *    an odd number of raw diagonal lines (1, 3, 5, ...) — 1 is Full
 *    Pattern, so 3 is the tightest fully-empty gap possible. Going
 *    shorter than that requires dashing the gap diagonal instead of
 *    emptying it, which is what `gapDashPeriod` does.
 *  - pattern 'parallelOuter' / 'parallelInner' — same checkerboard
 *    alternation as Full Pattern above (still discrete, separated boxes,
 *    not a solid band), just restricted to two of Pattern 1's own rows
 *    instead of every row:
 *      'parallelOuter' — row 1 (bottom-most) + row 4 (top-most): the two
 *        OUTER rows, middle two dropped.
 *      'parallelInner' — row 2 + row 3: the two INNER/middle rows,
 *        outer two dropped.
 *    Reuses the exact same `rows`/cellHeight grid every other pattern
 *    here renders with, rather than a separate virtual grid — so it
 *    inherits the same guaranteed-in-bounds sizing/placement Pattern 1
 *    already has, instead of needing its own bounds math. See
 *    selectParallelRows() below for the row selection.
 */

// Which of Pattern 1's (Full Pattern's) own rows to keep for
// parallelOuter/parallelInner — directly indexing the SAME `rows` grid
// every other checkered pattern already renders safely, rather than a
// separate virtual grid. Per instruction: "follow the design of checkered
// pattern 1, only this time the 2nd row and 3rd row are gone" — that's
// Outer. Inner is the mirror: keep only the 2nd and 3rd rows, drop the
// outer two.
//   parallelOuter — row 1 (bottom-most, index 0) + row 4 (top-most,
//     index rows-1): the two OUTER rows of the grid.
//   parallelInner — row 2 (index 1) + row 3 (index rows-2): the two
//     INNER/middle rows of the grid.
// Because these are real indices into Pattern 1's existing grid rather
// than a computed virtual position, there's no separate bounds math
// needed — any row that exists in Pattern 1's grid is already guaranteed
// to render fully inside the tier, so a subset of those rows is too. On a
// tier short enough that fewer than 4 rows exist, a requested index
// simply isn't added (Set collapses duplicates), same graceful
// degradation as before, just with no chance of overflow either way.
//
// Shared by Triangle Pattern below (see TRIANGLE_PATTERN_SETS in
// cakeConfig.js) since this is pure row-index selection — identical math
// regardless of whether the cell shape ends up a square or a triangle, so
// it's reused rather than copy-pasted a second time.
function selectParallelRows(pattern, rows) {
  const selected = new Set();
  if (pattern === 'parallelOuter') {
    const bottomIdx = 0;
    const topIdx = rows - 1;
    if (bottomIdx >= 0 && bottomIdx < rows) selected.add(bottomIdx);
    if (topIdx >= 0 && topIdx < rows) selected.add(topIdx);
  } else if (pattern === 'parallelInner') {
    const secondIdx = 1;
    const thirdIdx = rows - 2;
    if (secondIdx >= 0 && secondIdx < rows) selected.add(secondIdx);
    if (thirdIdx >= 0 && thirdIdx < rows) selected.add(thirdIdx);
  }
  return selected;
}
// Shared by buildCheckerSideSquares below so the pattern-selection logic
// (Full/Left Diagonal/Right Diagonal/Parallel Lines, gap dashing, etc.)
// lives in exactly one place.
function computeCheckerLayout(radius, height, opts = {}) {
  const pattern = opts.pattern ?? 'full';
  const isDiagonalPattern = pattern === 'leftDiagonal' || pattern === 'rightDiagonal';
  const diagonalPeriod = opts.diagonalPeriod ?? 2;
  const diagonalBandWidth = opts.diagonalBandWidth ?? 1;
  const gapDashPeriod = opts.gapDashPeriod ?? 2; // 1 = no dashing (fully empty gap)
  const size = CHECKER_SQUARE_SIZE;
  const circumference = radius * Math.PI * 2;

  // Column count must wrap seamlessly around the cylinder. For the plain
  // checkerboard, that only requires an EVEN column count (so the color
  // parity at col=cols-1 hands off correctly to col=0). But the diagonal
  // patterns add a second, coarser loop on top: they group black
  // diagonals into bands of `diagonalPeriod`, and that grouping only
  // closes cleanly if the total number of black diagonals going all the
  // way around (cols / 2) is itself evenly divisible by `diagonalPeriod`.
  // Nothing enforced that before, so most radii happened to land on a
  // multiple by luck and looped fine, but some didn't — the band pattern
  // would get cut short right where the loop closes, showing up as a
  // visible seam/dead-end. Rounding `cols` to the nearest multiple of
  // `unit` (instead of just the nearest even number) guarantees cols/2
  // divides evenly by diagonalPeriod every time, so the loop always
  // closes exactly where it started, regardless of the cake's radius.
  const unit = isDiagonalPattern ? 2 * diagonalPeriod : 2;
  const targetUnits = Math.max(3, Math.round(circumference / size / unit));
  const cols = targetUnits * unit;

  const isParallelPattern = pattern === 'parallelOuter' || pattern === 'parallelInner';

  // Same row count/cellHeight formula for every pattern, including
  // Parallel Lines — this is Pattern 1's (Full Pattern's) own grid,
  // already rendering safely with zero overflow, so reusing it directly
  // means Parallel Lines inherits that same safety instead of needing its
  // own bounds math.
  const rows = Math.max(2, Math.round(height / size));
  const cellAngle = (Math.PI * 2) / cols;
  const cellHeight = height / rows;

  const parallelRows = isParallelPattern ? selectParallelRows(pattern, rows) : null;

  const cells = [];
  for (let row = 0; row < rows; row++) {
    if (isParallelPattern && !parallelRows.has(row)) continue;

    for (let col = 0; col < cols; col++) {
      const isCheckerboardBlack = Math.abs(row + col) % 2 === 0;
      if (!isCheckerboardBlack) continue;

      if (isDiagonalPattern) {
        // Black diagonals sit at (col ± row) = 0, 2, 4, 6, ... — every
        // other diagonal line, never odd ones. Divide by 2 to get their
        // actual sequential index (0, 1, 2, 3, ...) before applying the
        // period/band interval; without this, `% diagonalPeriod` on the
        // raw even value can only ever land on 2 distinct buckets no
        // matter how large diagonalPeriod is, which was the bug — it made
        // every interval setting behave like a 1-skip-1 pattern.
        // 'leftDiagonal' groups by (col + row); 'rightDiagonal' by
        // (col - row) — the mirrored direction.
        const rawDiag = pattern === 'rightDiagonal' ? col - row : col + row;
        const diag = ((rawDiag % cols) + cols) % cols;
        const blackDiagIndex = diag / 2;
        const isPrimaryDiagonal = (blackDiagIndex % diagonalPeriod) < diagonalBandWidth;
        if (!isPrimaryDiagonal) {
          // In the gap: keep only every `gapDashPeriod`-th cell (by row)
          // so the gap reads as a shorter, dashed line rather than a
          // fully empty one.
          if (gapDashPeriod <= 1 || row % gapDashPeriod !== 0) continue;
        }
      }
      cells.push({ row, col });
    }
  }

  return { cells, cols, rows, cellAngle, cellHeight };
}

/**
 * Answers "how much is this point on the tier's side wall covered by an
 * active Checkered Pattern square?" as a 0..1 weight — NOT a mesh. Built
 * for Filling's own Piping Design (Mashed Circles/Mashed Swirls) to shave
 * its bumps down wherever a square will actually sit on top of it, so the
 * square itself can stay flat/rigid instead of having to bend to follow
 * the bump (see buildMashedCircleFillingGeometry's own `coverageFn`
 * option in spongeGeometry.js, and CakeScene.jsx's call site). Uncovered
 * points (the checkerboard's own grout gaps) return 0, so the filling's
 * real piped texture stays fully visible there.
 *
 * This returns a SMOOTHED weight (ramping 0->1 over a small margin near
 * each square's own edge), not a hard cutoff — an earlier version of this
 * returned a flat 0-or-1, which looked fine on the square itself (a real
 * rigid edge) but tore the CONTINUOUS filling mesh underneath: two
 * neighboring vertices on that mesh, one just inside the cutoff and one
 * just outside, would jump straight from "fully flattened" to "full bump
 * height" with nothing between them, which reads as a jagged/torn crease
 * under shading wherever a square's edge didn't happen to land exactly on
 * one of the filling mesh's own vertex rows (which is most of the time).
 * A short smoothstep ramp keeps the transition thin enough to still read
 * as "flat under the square, bumpy in the gap" while removing that
 * discontinuity.
 *
 * `localY` uses the SAME center-anchored convention buildCheckerSideSquares
 * itself uses for a cell's own y (-height/2..+height/2) — callers convert
 * to/from their own coordinate frame the same way CakeScene.jsx's
 * checkerCoverageFn adapter already does.
 */
export function getCheckerCoverageFn(radius, height, opts = {}) {
  const { cells, cols, rows, cellAngle, cellHeight } = computeCheckerLayout(radius, height, opts);
  const covered = new Set(cells.map(({ row, col }) => row * cols + col));

  // Half-width (in the cell's own 0..1 local space) of the square's real
  // footprint, matching CHECKER_GAP_RATIO's own shrink — the square's
  // real geometry is smaller than its full grid cell, so coverage should
  // only claim the square's actual footprint, not the whole cell
  // (otherwise the grout gap between adjacent squares would get shaved
  // too, even though nothing is there to hide it).
  const half = CHECKER_GAP_RATIO / 2;
  // Width of the smoothing ramp, in that same fraction-of-cell space —
  // small enough to stay visually "flat under the square", large enough
  // to comfortably span a few of the filling mesh's own vertex rows so
  // no single pair of adjacent vertices ever sees a hard jump.
  const smoothWidth = Math.min(half, 0.15);

  const smoothstep = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };

  return (angle, localY) => {
    const wrappedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const colF = wrappedAngle / cellAngle;
    const rowF = (localY + height / 2) / cellHeight;
    const col = Math.floor(colF);
    const row = Math.floor(rowF);
    if (row < 0 || row >= rows) return 0;
    if (!covered.has(row * cols + col)) return 0;

    // Distance from THIS cell's own center, along whichever axis is
    // closer to the square's edge — used to ramp coverage down to 0
    // right at the square's own edge instead of the full cell's edge.
    const fx = Math.abs(colF - col - 0.5);
    const fy = Math.abs(rowF - row - 0.5);
    const distInsideEdge = half - Math.max(fx, fy); // > 0 inside the square, <= 0 outside
    if (distInsideEdge <= 0) return 0;
    return smoothstep(distInsideEdge / smoothWidth);
  };
}

export function buildCheckerSideSquares(radius, height, opts = {}) {
  const { cells, cellAngle, cellHeight } = computeCheckerLayout(radius, height, opts);

  // Curve the square's own geometry along the cylinder's arc instead of
  // using a flat chord — teammate's improvement (mirrors the standoffRadius
  // used for instance placement below, computed once here and shared since
  // every instance uses the exact same curved shape template). Squares
  // are plain flat/rigid boxes — no relationship to Filling's Piping
  // Design at all.
  //
  // opts.embedOverride replaces CHECKER_STANDOFF's -0.06 embed on request
  // (CakeScene.jsx passes it under Ridge Comb/Ribbon Wrap/Vertical
  // Piping): -0.06 buries the box's back face 0.06 into the WALL radius
  // it's placed at, which hides the seam nicely against a flat wall, but
  // those three textures' wall isn't flat — their own ridge peaks reach
  // well past that buried-back-face radius, so part of the ridge
  // geometry ends up INSIDE the box's volume, poking through at the
  // box's edges. `radius` here already carries enough total clearance
  // from the bare tier (CakeScene's sideDecorStandoff) that the box just
  // needs to stop embedding — see the per-texture override values where
  // this is called from.
  const embed = opts.embedOverride ?? CHECKER_STANDOFF;
  const standoffRadius = radius + CHECKER_THICKNESS / 2 + embed;
  const arcLength = standoffRadius * cellAngle * CHECKER_GAP_RATIO;
  const mat = buildCheckerSquareMaterial(opts.color, opts.colorId);

  const geo = new THREE.BoxGeometry(arcLength, cellHeight * CHECKER_GAP_RATIO, CHECKER_THICKNESS, 4, 1, 1);
  const posAttribute = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < posAttribute.count; i++) {
    v.fromBufferAttribute(posAttribute, i);
    const theta = v.x / standoffRadius;
    const r = standoffRadius + v.z;
    const newX = r * Math.sin(theta);
    const newZ = r * Math.cos(theta) - standoffRadius;
    posAttribute.setXYZ(i, newX, v.y, newZ);
  }
  geo.computeVertexNormals();
  // Checker Pattern's Pick Color never had this applied before, so the
  // six gradient/metallic patterns (Marble/Ombré/Rainbow Swirl/Gold
  // Shimmer/Watercolor Pastel Mix/Red-White Gradient) fell back to a flat
  // swatch here specifically — same fix already applied elsewhere.
  applyVerticalGradientUV(geo);

  const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
  const dummy = new THREE.Object3D();

  cells.forEach(({ row, col }, i) => {
    const angle = (col + 0.5) * cellAngle;
    const y = -height / 2 + (row + 0.5) * cellHeight;
    dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
    dummy.rotation.set(0, angle, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// buildCheckerTopSquares() was removed along with the "Top Only" option —
// the 4th Checkered Pattern slot is now "Right Diagonal" (id
// 'rightDiagonal'), a side-wall treatment handled by
// buildCheckerSideSquares() above instead.


/**
 * Triangle Pattern — a duplicate of Checkered Pattern's entire
 * architecture (this file's buildCheckerSideSquares above, and
 * TRIANGLE_PATTERN_SETS in cakeConfig.js duplicating CHECKERED_PATTERN_SETS),
 * with one difference: each cell is a real 3D triangular prism instead of
 * a box. Same 6 variants (Full/Left Diagonal/X/Right Diagonal/Parallel
 * Outer/Parallel Inner), same cell-selection logic (reuses
 * selectParallelRows above — pure row-index math, identical regardless of
 * cell shape), same real-geometry-not-texture approach, same arc-bend
 * technique, same per-cell InstancedMesh placement. Only
 * buildTriangleCellGeometry (the shape itself) and the constants sized for
 * it are new; everything else mirrors buildCheckerSideSquares line for
 * line.
 */
const TRIANGLE_SIZE = 1.22;     // same physical size convention as CHECKER_SQUARE_SIZE
const TRIANGLE_STANDOFF = -0.06;
const TRIANGLE_THICKNESS = 0.12;
const TRIANGLE_GAP_RATIO = 0.9;

// Same fix as buildCheckerSquareMaterial above — was a plain
// THREE.MeshStandardMaterial({ color }), no colorId, so all six pattern
// colors (Marble/Ombré/Rainbow Swirl/Gold Shimmer/Watercolor Pastel Mix/
// Red-White Gradient) rendered as a flat swatch. Now delegates to
// getFrostingMaterial the same way.
function buildTriangleShapeMaterial(colorHex, colorId = null) {
  return getFrostingMaterial(colorHex ?? '#1F1F1F', colorId);
}

// One triangular prism cell — apex up, base at the bottom, spanning the
// same arcLength x cellHeight footprint a checkered square would. Built as
// a subdivided grid (base full-width, tapering to zero width at the apex)
// with real thickness — front face, back face, and side walls along the
// base/left/right edges — rather than a flat plane, so the per-vertex
// arc-bend below (identical to Checkered's own) has enough resolution to
// read as a smooth curve instead of just repositioning 3 corners.
function buildTriangleCellGeometry(arcLength, cellHeight, thickness) {
  const widthSegments = 6;
  const heightSegments = 4;
  const halfThickness = thickness / 2;
  const rows = heightSegments + 1;
  const cols = widthSegments + 1;

  const gridX = [], gridY = [];
  for (let j = 0; j < rows; j++) {
    const v = j / heightSegments;              // 0 at the base, 1 at the apex
    const y = -cellHeight / 2 + v * cellHeight;
    const halfW = (1 - v) * (arcLength / 2);    // full width at the base, tapers to 0 at the apex
    for (let i = 0; i < cols; i++) {
      const u = i / widthSegments;
      gridX.push(-halfW + u * (halfW * 2));
      gridY.push(y);
    }
  }

  const positions = [], indices = [];
  const vertsPerFace = rows * cols;

  // Front face — smooth-shaded across its own grid, which is what the
  // arc-bend applied after this needs to read as a smooth curve rather
  // than a faceted one.
  const frontOffset = 0;
  for (let n = 0; n < vertsPerFace; n++) positions.push(gridX[n], gridY[n], halfThickness);
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = frontOffset + j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  // Back face — its OWN separate vertex set (positions duplicated, not
  // shared with the front face's), so computeVertexNormals() below can't
  // blend its backward-facing normals into the front face's forward-facing
  // ones.
  const backOffset = positions.length / 3;
  for (let n = 0; n < vertsPerFace; n++) positions.push(gridX[n], gridY[n], -halfThickness);
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = backOffset + j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  // Side walls — left edge, right edge, and the base. These used to reuse
  // the front/back face indices directly, which meant computeVertexNormals
  // blended each wall's own sideways-facing normal together with the
  // front/back face's normal at every shared edge vertex — a soft
  // gradient/highlight along every triangle's edges that Checkered's
  // THREE.BoxGeometry never had (a box's faces don't share ANY vertices
  // with each other, so every face reads as a crisp, flat, distinctly-shaded
  // plane with no blending at all). Each wall segment now gets its own
  // freshly duplicated quad instead, so its normal comes out flat and
  // unblended — same crisp look Checkered's boxes have. Winding matches
  // the original left/right/base triangles exactly, just addressed via
  // these new local vertices instead of the shared front/back ones. The
  // apex still needs no wall of its own — the top row collapses to a
  // single point (halfW=0), same convergence as before.
  for (let j = 0; j < rows - 1; j++) {
    // Left wall: fA (front, this row), fB (front, next row), bA (back,
    // this row), bB (back, next row) — triangles (fA,fB,bB),(fA,bB,bA).
    const lOff = positions.length / 3;
    const iCur = j * cols, iNext = (j + 1) * cols;
    positions.push(
      gridX[iCur], gridY[iCur], halfThickness,    // fA
      gridX[iNext], gridY[iNext], halfThickness,  // fB
      gridX[iCur], gridY[iCur], -halfThickness,   // bA
      gridX[iNext], gridY[iNext], -halfThickness, // bB
    );
    indices.push(lOff, lOff + 1, lOff + 3, lOff, lOff + 3, lOff + 2);

    // Right wall: rFA, rFB, rBA, rBB — triangles (rFA,rBA,rBB),(rFA,rBB,rFB).
    const rOff = positions.length / 3;
    const riCur = j * cols + cols - 1, riNext = (j + 1) * cols + cols - 1;
    positions.push(
      gridX[riCur], gridY[riCur], halfThickness,    // rFA
      gridX[riNext], gridY[riNext], halfThickness,  // rFB
      gridX[riCur], gridY[riCur], -halfThickness,   // rBA
      gridX[riNext], gridY[riNext], -halfThickness, // rBB
    );
    indices.push(rOff, rOff + 2, rOff + 3, rOff, rOff + 3, rOff + 1);
  }
  // Base wall: fA, fB, bA, bB per column step — triangles (fA,bB,bA),(fA,fB,bB).
  for (let i = 0; i < cols - 1; i++) {
    const bOff = positions.length / 3;
    positions.push(
      gridX[i], gridY[i], halfThickness,        // fA
      gridX[i + 1], gridY[i + 1], halfThickness,    // fB
      gridX[i], gridY[i], -halfThickness,       // bA
      gridX[i + 1], gridY[i + 1], -halfThickness,   // bB
    );
    indices.push(bOff, bOff + 3, bOff + 2, bOff, bOff + 1, bOff + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  // No uv attribute existed on this geometry at all before — harmless for
  // the flat colorHex-only material this used to always get, but
  // getFrostingMaterial's gradient colors (Marble/Ombré/Rainbow Swirl/
  // Watercolor Pastel Mix/Red-White Gradient — everything except Gold
  // Shimmer, which is metalness/roughness only and doesn't sample a
  // texture) sample a texture via UV, and with nothing there to sample
  // against they rendered as a flat, wrong single color instead of the
  // actual gradient. Same fix as the Mashed Circles/Mashed Swirls
  // filling-piping geometry had earlier.
  applyVerticalGradientUV(geo);
  return geo;
}

/** Raised triangles wrapped around a tier's side wall — exact same 6
 * patterns, exact same cell-selection logic as buildCheckerSideSquares
 * above (see that function's own doc comment for the full pattern
 * explanation: 'full', 'leftDiagonal'/'rightDiagonal' with
 * diagonalPeriod/diagonalBandWidth/gapDashPeriod, 'parallelOuter'/
 * 'parallelInner' via selectParallelRows). The only difference from
 * Checkered is buildTriangleCellGeometry (a triangular prism) in place of
 * THREE.BoxGeometry, and the arc-bend applies to that triangle's own
 * (already width-subdivided) vertices instead of a box's.
 */
// Shared by buildTriangleSideShapes (builds the actual mesh) and
// getTriangleCoverageFn (answers "is this point covered by a triangle?"
// for Filling's own shaving) so the two can never drift out of sync on
// which cells are actually active — same reasoning Checkered Pattern's
// computeCheckerLayout used to have before its own filling-hugging
// feature was reverted; Triangle's own hasn't been.
function computeTriangleLayout(radius, height, opts = {}) {
  const pattern = opts.pattern ?? 'full';
  const isDiagonalPattern = pattern === 'leftDiagonal' || pattern === 'rightDiagonal';
  const diagonalPeriod = opts.diagonalPeriod ?? 2;
  const diagonalBandWidth = opts.diagonalBandWidth ?? 1;
  const gapDashPeriod = opts.gapDashPeriod ?? 2;
  const size = TRIANGLE_SIZE;
  const circumference = radius * Math.PI * 2;

  const unit = isDiagonalPattern ? 2 * diagonalPeriod : 2;
  const targetUnits = Math.max(3, Math.round(circumference / size / unit));
  const cols = targetUnits * unit;

  const isParallelPattern = pattern === 'parallelOuter' || pattern === 'parallelInner';

  const rows = Math.max(2, Math.round(height / size));
  const cellAngle = (Math.PI * 2) / cols;
  const cellHeight = height / rows;

  const parallelRows = isParallelPattern ? selectParallelRows(pattern, rows) : null;

  const cells = [];
  for (let row = 0; row < rows; row++) {
    if (isParallelPattern && !parallelRows.has(row)) continue;

    for (let col = 0; col < cols; col++) {
      const isCheckerboardBlack = Math.abs(row + col) % 2 === 0;
      if (!isCheckerboardBlack) continue;

      if (isDiagonalPattern) {
        const rawDiag = pattern === 'rightDiagonal' ? col - row : col + row;
        const diag = ((rawDiag % cols) + cols) % cols;
        const blackDiagIndex = diag / 2;
        const isPrimaryDiagonal = (blackDiagIndex % diagonalPeriod) < diagonalBandWidth;
        if (!isPrimaryDiagonal) {
          if (gapDashPeriod <= 1 || row % gapDashPeriod !== 0) continue;
        }
      }
      cells.push({ row, col });
    }
  }

  return { cells, cols, rows, cellAngle, cellHeight };
}

/**
 * Answers "how much is this point on the tier's side wall covered by an
 * active Triangle Pattern shape?" as a 0/1 weight, for Filling's own
 * Piping Design to shave against (see buildMashedCircleFillingGeometry's
 * `coverageFn` option in spongeGeometry.js, and CakeScene.jsx's call
 * site). Approximates each triangle's coverage as its bounding cell
 * footprint (same CHECKER_GAP_RATIO-style margin, via TRIANGLE_GAP_RATIO)
 * rather than its exact triangular silhouette — a small overcoverage
 * right at a triangle's own empty corners, not worth the extra precision
 * for a flattening cue that's already invisible under an opaque shape.
 */
export function getTriangleCoverageFn(radius, height, opts = {}) {
  const { cells, cols, rows, cellAngle, cellHeight } = computeTriangleLayout(radius, height, opts);
  const covered = new Set(cells.map(({ row, col }) => row * cols + col));
  const half = TRIANGLE_GAP_RATIO / 2;

  return (angle, localY) => {
    const wrappedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const colF = wrappedAngle / cellAngle;
    const rowF = (localY + height / 2) / cellHeight;
    const col = Math.floor(colF);
    const row = Math.floor(rowF);
    if (row < 0 || row >= rows) return 0;
    if (!covered.has(row * cols + col)) return 0;

    const fx = Math.abs(colF - col - 0.5);
    const fy = Math.abs(rowF - row - 0.5);
    if (fx > half || fy > half) return 0;
    return 1;
  };
}

/**
 * Glaze's own Triangle Pattern coverage — the triangle-shaped counterpart
 * of getCheckerCoverageFn. Unlike getTriangleCoverageFn above (a 0/1
 * bounding-box approximation, fine for Filling's flattening cue since it
 * hides under an opaque shape), Glaze's windows are what the viewer
 * actually SEES around each shape, so they need to follow the real
 * triangular silhouette: full width at the base, tapering to a point at
 * the apex (apex up) — exactly buildTriangleCellGeometry's own outline,
 * including its TRIANGLE_GAP_RATIO shrink — otherwise the glaze would be
 * cut into rectangular notches with bare sponge showing in the empty
 * corners beside each triangle.
 *
 * Returns a smoothed 0..1 weight (ramp inside the silhouette's edge, same
 * reasoning as getCheckerCoverageFn: a hard 0/1 tears the continuous
 * glaze mesh between neighboring vertices). Uses the same
 * computeTriangleLayout as the mesh, so the two can't drift apart.
 * `localY` is center-anchored, same convention as buildTriangleSideShapes.
 */
export function getGlazeTriangleCoverageFn(radius, height, opts = {}) {
  const { cells, cols, rows, cellAngle, cellHeight } = computeTriangleLayout(radius, height, opts);
  const covered = new Set(cells.map(({ row, col }) => row * cols + col));
  const half = TRIANGLE_GAP_RATIO / 2;
  const smoothWidth = Math.min(half, 0.12);
  const smoothstep = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };

  return (angle, localY) => {
    const wrappedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const colF = wrappedAngle / cellAngle;
    const rowF = (localY + height / 2) / cellHeight;
    const col = Math.floor(colF);
    const row = Math.floor(rowF);
    if (row < 0 || row >= rows) return 0;
    if (!covered.has(row * cols + col)) return 0;

    const fx = Math.abs(colF - col - 0.5);
    const fyFromBase = (rowF - row - 0.5) + half; // 0 at the base edge, 2*half at the apex
    if (fyFromBase <= 0 || fyFromBase >= 2 * half) return 0;
    const v = fyFromBase / (2 * half);            // 0 base .. 1 apex
    const halfWidthHere = (1 - v) * half;         // tapers to a point
    // Distance inside the nearest edge: the two slanted sides (measured
    // horizontally, slightly generous vs. true perpendicular distance) or
    // the flat base.
    const inside = Math.min(halfWidthHere - fx, fyFromBase);
    if (inside <= 0) return 0;
    return smoothstep(inside / smoothWidth);
  };
}

/** Raised triangles wrapped around a tier's side wall — exact same 6
 * patterns, exact same cell-selection logic as buildCheckerSideSquares
 * above (see that function's own doc comment for the full pattern
 * explanation: 'full', 'leftDiagonal'/'rightDiagonal' with
 * diagonalPeriod/diagonalBandWidth/gapDashPeriod, 'parallelOuter'/
 * 'parallelInner' via selectParallelRows). The only difference from
 * Checkered is buildTriangleCellGeometry (a triangular prism) in place of
 * THREE.BoxGeometry, and the arc-bend applies to that triangle's own
 * (already width-subdivided) vertices instead of a box's.
 */
export function buildTriangleSideShapes(radius, height, opts = {}) {
  const { cells, cellAngle, cellHeight } = computeTriangleLayout(radius, height, opts);

  // Same opts.embedOverride escape hatch as buildCheckerSideSquares — see
  // its own comment for why Ridge Comb/Ribbon Wrap/Vertical Piping need
  // this box to stop embedding into a wall that isn't actually flat.
  const embed = opts.embedOverride ?? TRIANGLE_STANDOFF;
  const standoffRadius = radius + TRIANGLE_THICKNESS / 2 + embed;
  const arcLength = standoffRadius * cellAngle * TRIANGLE_GAP_RATIO;
  const geo = buildTriangleCellGeometry(arcLength, cellHeight * TRIANGLE_GAP_RATIO, TRIANGLE_THICKNESS);
  // Same per-vertex arc-bend as Checkered's squares — identical formula,
  // just applied to the triangle's own (already subdivided) vertex set.
  const posAttribute = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < posAttribute.count; i++) {
    v.fromBufferAttribute(posAttribute, i);
    const theta = v.x / standoffRadius;
    const r = standoffRadius + v.z;
    const newX = r * Math.sin(theta);
    const newZ = r * Math.cos(theta) - standoffRadius;
    posAttribute.setXYZ(i, newX, v.y, newZ);
  }
  geo.computeVertexNormals();

  const mat = buildTriangleShapeMaterial(opts.color, opts.colorId);
  const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
  const dummy = new THREE.Object3D();

  cells.forEach(({ row, col }, i) => {
    const angle = (col + 0.5) * cellAngle;
    const y = -height / 2 + (row + 0.5) * cellHeight;
    dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
    dummy.rotation.set(0, angle, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Deterministic pearl layout — shared by every "scatter" Scatter Pearls
 * variant (Random Scatter, Big Pearls Scatter, Small Pearls Scatter) so all
 * three read as the same organic family, just at different sizes.
 *
 * Uses the same seeded linear-congruential generator as Sunshine Play's
 * Star Burst (scatterStarPositions in sets/sunshinePlayHelpers.js) —
 * genuinely random-looking placement, with the natural clumps and gaps
 * true randomness has, rather than the golden-angle Kronecker sequence
 * this used previously. That sequence was deliberately even/gapless
 * ("sunflower-seed" coverage with no clustering by construction), which
 * reads as a visibly different, too-uniform pattern next to Star Burst's
 * actual scatter — the mismatch this fixes. Still fully deterministic (a
 * fixed seed, not Math.random() or the `rand` PRNG passed into this file):
 * the same cake config always renders the exact same placement, it just
 * looks organically scattered instead of evenly gridded now. Uses its own
 * seed (distinct from Star Burst's 54321) so the two decorations don't
 * echo each other's exact layout despite sharing a method.
 */
function scatterPearlPositions(count) {
  const seed = 13579;
  const points = [];
  let current = seed;
  const seededRandom = () => {
    current = (current * 1103515245 + 12345) & 0x7fffffff;
    return current / 0x7fffffff;
  };
  for (let i = 0; i < count; i++) {
    points.push({
      angle:      seededRandom() * Math.PI * 2,
      heightFrac: seededRandom(),
      sizeFrac:   seededRandom(),
    });
  }
  return points;
}

/**
 * Same seeded-LCG scatter as scatterPearlPositions, but with a rejection
 * step: draws candidates one at a time and only keeps ones that clear a
 * minimum distance from every pearl already placed, so large pearls this
 * sparse never visually overlap or clip into each other. Only Big Pearls
 * Scatter uses this — it's the one variant sparse and large enough for
 * collisions between individually-readable pearls to actually show; the
 * denser/smaller pearl variants above are fine with the plain sequence.
 *
 * The distance check uses the true 3D straight-line distance between two
 * pearl centers on the cylinder (2·radius·sin(Δangle/2) for the
 * around-the-circumference component, combined with the height
 * difference) rather than arc length — arc length is always ≥ the actual
 * straight-line distance between two points on a circle, so using it here
 * would let some genuinely-overlapping pairs slip through as "far enough
 * apart".
 *
 * Deterministic like every other scatter in this file (fixed seed, no
 * Math.random()), and bounded: if the surface is packed tight enough that
 * a valid spot can't be found within a generous attempt budget, it simply
 * returns fewer pearls than asked for rather than looping forever or
 * letting a pearl through that collides.
 */
function scatterNonCollidingBigPearls(radius, height, targetCount, getScale) {
  const seed = 24680;
  let current = seed;
  const seededRandom = () => {
    current = (current * 1103515245 + 12345) & 0x7fffffff;
    return current / 0x7fffffff;
  };

  const GAP = 0.05; // minimum clear space left between two pearls' surfaces, not just "not touching"
  const MAX_ATTEMPTS = targetCount * 60;

  const accepted = [];
  let attempts = 0;
  while (accepted.length < targetCount && attempts < MAX_ATTEMPTS) {
    attempts++;
    const angle = seededRandom() * Math.PI * 2;
    const heightFrac = seededRandom();
    const sizeFrac = seededRandom();
    const y = -height / 2 + height * 0.05 + heightFrac * height * 0.9;
    const scale = getScale(sizeFrac);

    let collides = false;
    for (const p of accepted) {
      let dAngle = Math.abs(angle - p.angle) % (Math.PI * 2);
      if (dAngle > Math.PI) dAngle = Math.PI * 2 - dAngle;
      const chordXZ = 2 * radius * Math.sin(dAngle / 2); // true center-to-center distance around the circumference
      const dy = y - p.y;
      const dist = Math.sqrt(chordXZ * chordXZ + dy * dy);
      if (dist < scale + p.scale + GAP) {
        collides = true;
        break;
      }
    }

    if (!collides) accepted.push({ angle, y, scale });
  }

  return accepted;
}

export function buildScatterPearlsRing(radius, height, colorHex, colorId, rand, opts = {}) {
  const variant = opts.variant || 'randomScatter';
  // Was a dedicated glossy THREE.MeshPhysicalMaterial (clearcoat, low
  // roughness) — genuinely different from buttercream's matte procedural
  // look, and correct for real pearls. Switched to getFrostingMaterial
  // anyway, on request, to keep Pick Color support consistent and simple
  // across every Side treatment rather than maintaining a second,
  // gradient/metallic-aware material just for this one. The glossy
  // clearcoat look is the deliberate tradeoff — pearls now render in the
  // same matte buttercream material Checkered/Triangle/Piping Scrolls use,
  // not their own glass-bead finish.
  const mat = getFrostingMaterial(colorHex || '#FFFFFF', colorId);
  const geo = new THREE.SphereGeometry(1, 16, 16);

  if (variant === 'diamondGrid') {
    const rows = 4;
    const colsPerTier = Math.max(8, Math.round((radius * Math.PI * 2) / 0.8));
    const pearlCount = rows * colsPerTier;
    const mesh = new THREE.InstancedMesh(geo, mat, pearlCount);
    const dummy = new THREE.Object3D();

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const y = -height / 2 + (r + 0.5) * (height / rows);
      const rowOffset = (r % 2) * (Math.PI / colsPerTier);
      for (let c = 0; c < colsPerTier; c++) {
        const angle = (c / colsPerTier) * Math.PI * 2 + rowOffset;
        const scale = 0.16;
        const standoffRadius = radius + scale * 0.3;
        dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  if (variant === 'diamondGridBorder') {
    // Diamond Grid with its own 2nd and 3rd rows (of 4) removed — row
    // Y-positions, column count, and the per-row stagger offset are all
    // computed identically to 'diamondGrid' above (same totalRows=4
    // spacing), just skipping r=1 and r=2 so only the top and bottom rows
    // survive. Keeping the stagger (row 3 is still offset by half a
    // column relative to row 0, exactly as it would be inside the full
    // grid) is what keeps this reading as "Diamond Grid with rows
    // removed" rather than two independent plain rows.
    const totalRows = 4;
    const keepRows = [0, 3];
    const colsPerTier = Math.max(8, Math.round((radius * Math.PI * 2) / 0.8));
    const pearlCount = keepRows.length * colsPerTier;
    const mesh = new THREE.InstancedMesh(geo, mat, pearlCount);
    const dummy = new THREE.Object3D();

    let idx = 0;
    for (const r of keepRows) {
      const y = -height / 2 + (r + 0.5) * (height / totalRows);
      const rowOffset = (r % 2) * (Math.PI / colsPerTier);
      for (let c = 0; c < colsPerTier; c++) {
        const angle = (c / colsPerTier) * Math.PI * 2 + rowOffset;
        const scale = 0.16;
        const standoffRadius = radius + scale * 0.3;
        dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  if (variant === 'horizontalRows') {
    const rows = 3;
    const colsPerTier = Math.max(10, Math.round((radius * Math.PI * 2) / 0.65));
    const pearlCount = rows * colsPerTier;
    const mesh = new THREE.InstancedMesh(geo, mat, pearlCount);
    const dummy = new THREE.Object3D();

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const y = -height / 2 + (r + 1) * (height / (rows + 1));
      for (let c = 0; c < colsPerTier; c++) {
        const angle = (c / colsPerTier) * Math.PI * 2;
        const scale = (c % 2 === 0) ? 0.18 : 0.12;
        const standoffRadius = radius + scale * 0.3;
        dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  if (variant === 'bigPearlsScatter') {
    // Design 5 — same organic scatter family as Random Scatter below (same
    // seeded-LCG approach), fixed to a big-pearl-only size range. Bigger
    // pearls need more clearance from each other to read as individual
    // pearls rather than a fused blob, so this uses a much lower density
    // (bigger areaPerPearl budget) than Random Scatter or Small Pearls —
    // a deliberately sparse scatter of a few large pearls, not a dense
    // field of them. Placement itself also actively checks for and
    // rejects collisions (see scatterNonCollidingBigPearls) — at this
    // size and sparseness, two pearls landing close enough to visually
    // overlap is common enough with a plain unchecked sequence to be
    // worth guarding against directly, unlike the denser/smaller pearl
    // variants above.
    const areaPerPearl = 2.6;
    const targetCount = Math.max(15, Math.round((2 * Math.PI * radius * height) / areaPerPearl));
    const getScale = (sizeFrac) => 0.22 + sizeFrac * 0.06; // big pearls only: 0.22–0.28

    const placed = scatterNonCollidingBigPearls(radius, height, targetCount, getScale);
    const mesh = new THREE.InstancedMesh(geo, mat, placed.length);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < placed.length; i++) {
      const { angle, y, scale } = placed[i];
      // Centered exactly on the wall surface (no outward offset) so the
      // cut is right through the sphere's middle — half the pearl sits
      // buried in the frosting, half pokes out, instead of the small
      // 0.3×-scale outward nudge every other pearl variant uses (which
      // only buries a little over a third of it).
      const standoffRadius = radius;
      dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  if (variant === 'smallPearlsScatter') {
    // Design 6 — identical approach to Big Pearls Scatter (design 5) above,
    // fixed to a small-pearl-only size range instead. Small pearls can sit
    // much closer together without visually merging, so this uses a
    // higher density (smaller areaPerPearl budget) to still read as fully
    // populated at their smaller size.
    const areaPerPearl = 0.32;
    const pearlCount = Math.max(130, Math.round((2 * Math.PI * radius * height) / areaPerPearl));
    const mesh = new THREE.InstancedMesh(geo, mat, pearlCount);
    const dummy = new THREE.Object3D();

    const points = scatterPearlPositions(pearlCount);
    for (let i = 0; i < pearlCount; i++) {
      const { angle, heightFrac, sizeFrac } = points[i];
      const y = -height / 2 + height * 0.05 + heightFrac * height * 0.9;
      const scale = 0.07 + sizeFrac * 0.04; // small pearls only: 0.07–0.11
      const standoffRadius = radius + scale * 0.3;
      dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // Default: 'randomScatter'. Fixed, not randomized — see
  // scatterPearlPositions' docstring above. Every render of the same cake
  // shows the identical layout instead of reshuffling. This variant is tuned
  // intentionally lighter than the other scatter families: the pearls are
  // smaller and spread further apart so the pattern reads as "scattered"
  // instead of a dense cluster.
  const areaPerPearl = 0.75;
  const pearlCount = Math.max(70, Math.round((2 * Math.PI * radius * height) / areaPerPearl));
  const mesh = new THREE.InstancedMesh(geo, mat, pearlCount);
  const dummy = new THREE.Object3D();

  const points = scatterPearlPositions(pearlCount);
  for (let i = 0; i < pearlCount; i++) {
    const { angle, heightFrac, sizeFrac } = points[i];
    const y = -height / 2 + height * 0.05 + heightFrac * height * 0.9;
    const scale = 0.06 + sizeFrac * 0.10; // light scatter: small-to-medium pearls only
    const standoffRadius = radius + scale * 0.3;
    dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Answers "how much is this point on the tier's side wall covered by an
 * active Scatter Pearls pearl?" as a 0..1 weight, for Filling's own
 * Piping Design to shave against — same purpose/smoothstep-edge
 * reasoning as getCheckerCoverageFn above. Every Scatter Pearls variant
 * places pearls via a FIXED-seed formula (scatterPearlPositions/
 * scatterNonCollidingBigPearls use hardcoded LCG seeds, not the `rand`
 * this file's build functions otherwise take — see their own doc
 * comments), so this calls those exact same functions with the exact
 * same inputs each variant's own branch above uses, rather than a second,
 * driftable reimplementation of "roughly where the pearls probably are".
 *
 * A pearl's coverage footprint on the cylinder's surface is approximated
 * as a flat circle of radius = its own render scale (a sphere's actual
 * radius, since base SphereGeometry(1,...) scaled by `scale` gives a
 * real-world radius of `scale`) — ignoring the small extra reach a sphere
 * bulging away from a curved surface would really have, the same
 * flat-footprint approximation Checkered/Triangle/Chevron's own box/zigzag
 * shapes already use.
 */
export function getScatterPearlsCoverageFn(radius, height, opts = {}) {
  const variant = opts.variant || 'randomScatter';
  const pearls = []; // { angle, y, footprintR }

  if (variant === 'diamondGrid' || variant === 'diamondGridBorder') {
    const totalRows = 4;
    const keepRows = variant === 'diamondGrid' ? [0, 1, 2, 3] : [0, 3];
    const colsPerTier = Math.max(8, Math.round((radius * Math.PI * 2) / 0.8));
    const scale = 0.16;
    for (const r of keepRows) {
      const y = -height / 2 + (r + 0.5) * (height / totalRows);
      const rowOffset = (r % 2) * (Math.PI / colsPerTier);
      for (let c = 0; c < colsPerTier; c++) {
        const angle = (c / colsPerTier) * Math.PI * 2 + rowOffset;
        pearls.push({ angle, y, footprintR: scale });
      }
    }
  } else if (variant === 'horizontalRows') {
    const rows = 3;
    const colsPerTier = Math.max(10, Math.round((radius * Math.PI * 2) / 0.65));
    for (let r = 0; r < rows; r++) {
      const y = -height / 2 + (r + 1) * (height / (rows + 1));
      for (let c = 0; c < colsPerTier; c++) {
        const angle = (c / colsPerTier) * Math.PI * 2;
        const scale = (c % 2 === 0) ? 0.18 : 0.12;
        pearls.push({ angle, y, footprintR: scale });
      }
    }
  } else if (variant === 'bigPearlsScatter') {
    const areaPerPearl = 2.6;
    const targetCount = Math.max(15, Math.round((2 * Math.PI * radius * height) / areaPerPearl));
    const getScale = (sizeFrac) => 0.22 + sizeFrac * 0.06;
    const placed = scatterNonCollidingBigPearls(radius, height, targetCount, getScale);
    for (const p of placed) pearls.push({ angle: p.angle, y: p.y, footprintR: p.scale });
  } else if (variant === 'smallPearlsScatter') {
    const areaPerPearl = 0.32;
    const pearlCount = Math.max(130, Math.round((2 * Math.PI * radius * height) / areaPerPearl));
    for (const p of scatterPearlPositions(pearlCount)) {
      const y = -height / 2 + height * 0.05 + p.heightFrac * height * 0.9;
      pearls.push({ angle: p.angle, y, footprintR: 0.07 + p.sizeFrac * 0.04 });
    }
  } else {
    // 'randomScatter', the default.
    const areaPerPearl = 0.75;
    const pearlCount = Math.max(70, Math.round((2 * Math.PI * radius * height) / areaPerPearl));
    for (const p of scatterPearlPositions(pearlCount)) {
      const y = -height / 2 + height * 0.05 + p.heightFrac * height * 0.9;
      pearls.push({ angle: p.angle, y, footprintR: 0.06 + p.sizeFrac * 0.10 });
    }
  }

  const smoothstep = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };

  return (angle, localY) => {
    let coverage = 0;
    for (const p of pearls) {
      let dAngle = Math.abs(angle - p.angle) % (Math.PI * 2);
      if (dAngle > Math.PI) dAngle = Math.PI * 2 - dAngle;
      const arcDist = radius * dAngle;
      const yDist = localY - p.y;
      const dist = Math.sqrt(arcDist * arcDist + yDist * yDist);
      const distInsideEdge = p.footprintR - dist;
      if (distInsideEdge <= 0) continue;
      const smoothWidth = Math.max(0.02, p.footprintR * 0.25);
      coverage = Math.max(coverage, smoothstep(distInsideEdge / smoothWidth));
      if (coverage >= 1) break; // fully covered — no need to keep scanning the rest
    }
    return coverage;
  };
}

/**
 * Chevron Pattern (Multi-Color / Single Color / Two-Tone Zigzag Stripes)
 * Real 3D extruded chevron ribbons wrapped cylindrically around the side wall.
 */
const CHEVRON_THICKNESS = 0.10;
const CHEVRON_STANDOFF = -0.04;

const MULTI_COLOR_PALETTE = [
  '#3B5FA0', // dark navy (row 0 - bottom)
  '#7CC47A', // green (row 1)
  '#E9BE6A', // gold/yellow (row 2)
  '#6BA8D4', // sky blue (row 3)
  '#E87B5E', // coral/orange (row 4 - top)
];

function buildChevronRowGeometry(radius, rowY, rowHeight, numTeeth, thickness, embedOverride) {
  const stepsPerTooth = 8;
  const totalSteps = numTeeth * stepsPerTooth;
  // Same opts.embedOverride escape hatch as buildCheckerSideSquares/
  // buildTriangleSideShapes — see buildCheckerSideSquares' comment.
  // Chevron is a thick extruded ribbon (0.10) with its own -0.04 embed,
  // so it has the exact same problem under Ridge Comb/Ribbon
  // Wrap/Vertical Piping: verified, its back face was buried past those
  // textures' own real ridge peaks by 0.02–0.03.
  const embed = embedOverride ?? CHEVRON_STANDOFF;
  const standoffR = radius + thickness / 2 + embed;
  const rIn = standoffR - thickness / 2;
  const rOut = standoffR + thickness / 2;

  const bandHeight = rowHeight * 0.70;
  const amplitude = rowHeight * 0.28;

  const positions = [];
  const normals = [];
  const indices = [];

  for (let s = 0; s <= totalSteps; s++) {
    const angle = (s / totalSteps) * Math.PI * 2;
    const toothU = (s / stepsPerTooth) % 1;
    const T = (toothU < 0.5) ? (-1 + 4 * toothU) : (3 - 4 * toothU);
    const yCenter = rowY + amplitude * T;
    const yTop = yCenter + bandHeight / 2;
    const yBot = yCenter - bandHeight / 2;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    positions.push(
      rOut * sinA, yTop, rOut * cosA,
      rOut * sinA, yBot, rOut * cosA,
      rIn * sinA, yTop, rIn * cosA,
      rIn * sinA, yBot, rIn * cosA,
    );

    normals.push(
      sinA, 0, cosA,
      sinA, 0, cosA,
      -sinA, 0, -cosA,
      -sinA, 0, -cosA,
    );
  }

  for (let s = 0; s < totalSteps; s++) {
    const base = s * 4;
    const next = (s + 1) * 4;

    const outTopA = base + 0, outBotA = base + 1, inTopA = base + 2, inBotA = base + 3;
    const outTopB = next + 0, outBotB = next + 1, inTopB = next + 2, inBotB = next + 3;

    // Front face
    indices.push(outTopA, outBotA, outBotB, outTopA, outBotB, outTopB);
    // Back face
    indices.push(inTopA, inTopB, inBotB, inTopA, inBotB, inBotA);
    // Top face
    indices.push(outTopA, inTopA, inTopB, outTopA, inTopB, outTopB);
    // Bottom face
    indices.push(outBotA, outBotB, inBotB, outBotA, inBotB, inBotA);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  // Same fix as buildTriangleCellGeometry above — no uv attribute existed
  // here either, so getFrostingMaterial's gradient colors (everything
  // except Gold Shimmer, which doesn't sample a texture) had nothing to
  // sample against and rendered as a flat, wrong single color.
  applyVerticalGradientUV(geo);
  return geo;
}

/**
 * Answers "how much is this point on the tier's side wall covered by an
 * active Chevron Pattern stripe?" as a 0..1 weight, for Filling's own
 * Piping Design to shave against — same purpose as getCheckerCoverageFn/
 * getTriangleCoverageFn, same smoothstep-edge reasoning (a hard 0/1
 * cutoff creases the continuous filling mesh — see that comment for the
 * full explanation), just reproducing Chevron's own zigzag tooth-wave
 * formula (buildChevronRowGeometry's toothU/T/yCenter above) instead of a
 * grid of cells. Chevron sits at one FIXED radius across the whole
 * pattern (only its vertical center wobbles per angle, not its radius),
 * so unlike Checkered/Triangle this doesn't need a cell lookup at all —
 * just the same tooth-wave Y envelope evaluated at the query's own angle.
 */
export function getChevronCoverageFn(radius, height, opts = {}) {
  const setId = opts.setId || 'multiColor';
  let numRows = 5;
  if (setId === 'wideZigzag') numRows = 3;
  else if (setId === 'tightZigzag') numRows = 7;

  const rowHeight = height / numRows;
  const circumference = radius * Math.PI * 2;
  const targetToothWidth = 1.6;
  const numTeeth = Math.max(6, Math.round(circumference / targetToothWidth));
  const bandHeight = rowHeight * 0.70;
  const amplitude = rowHeight * 0.28;

  const activeRowYs = [];
  for (let r = 0; r < numRows; r++) {
    if (setId === 'singleColorGapped' && (r === 1 || r === 3)) continue;
    activeRowYs.push(-height / 2 + (r + 0.5) * rowHeight);
  }

  const smoothWidth = Math.max(0.01, bandHeight * 0.08);
  const smoothstep = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };

  return (angle, localY) => {
    const wrappedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const toothU = ((wrappedAngle / (Math.PI * 2)) * numTeeth) % 1;
    const T = (toothU < 0.5) ? (-1 + 4 * toothU) : (3 - 4 * toothU);
    const yOffset = amplitude * T;

    let coverage = 0;
    for (const rowY of activeRowYs) {
      const distFromCenter = Math.abs(localY - (rowY + yOffset));
      const distInsideEdge = bandHeight / 2 - distFromCenter;
      if (distInsideEdge <= 0) continue;
      coverage = Math.max(coverage, smoothstep(distInsideEdge / smoothWidth));
      if (coverage >= 1) break;
    }
    return coverage;
  };
}

export function buildChevronSideStripes(radius, height, opts = {}) {
  const group = new THREE.Group();
  const setId = opts.setId || 'multiColor';
  const mainColor = opts.color || '#3B5FA0';
  const mainColorId = opts.colorId || null;

  let numRows = 5;
  if (setId === 'wideZigzag') numRows = 3;
  else if (setId === 'tightZigzag') numRows = 7;

  const rowHeight = height / numRows;
  const circumference = radius * Math.PI * 2;
  const targetToothWidth = 1.6;
  const numTeeth = Math.max(6, Math.round(circumference / targetToothWidth));

  for (let r = 0; r < numRows; r++) {
    // 'singleColorGapped' — identical row layout to Single Color (same
    // numRows, same rowY positions below), just skipping rows 2 and 4
    // (1-indexed; r === 1 and r === 3 here) so those two lines are simply
    // absent rather than the remaining rows being re-spaced to fill the gap.
    if (setId === 'singleColorGapped' && (r === 1 || r === 3)) continue;

    const rowY = -height / 2 + (r + 0.5) * rowHeight;
    // isMainColorRow tracks whether THIS row is actually the one driven
    // by Sugar Color (mainColor/mainColorId) — 'multiColor' cycles its
    // own fixed MULTI_COLOR_PALETTE regardless of Sugar Color (Color
    // Override is already disabled for it in SideSection.jsx, so there's
    // nothing to fix there), and 'twoTone's alternate row is hardcoded
    // white, never Sugar Color either. Only the rows that actually ARE
    // mainColor need the colorId-aware material below.
    let hexColor;
    let isMainColorRow = false;
    if (setId === 'multiColor') {
      hexColor = MULTI_COLOR_PALETTE[r % MULTI_COLOR_PALETTE.length];
    } else if (setId === 'twoTone') {
      if (r % 2 === 0) {
        hexColor = mainColor;
        isMainColorRow = true;
      } else {
        hexColor = '#FFFFFF';
      }
    } else {
      hexColor = mainColor;
      isMainColorRow = true;
    }

    // Same fix as buildCheckerSquareMaterial/buildTriangleShapeMaterial
    // above, but scoped to just the rows Sugar Color actually drives —
    // those get getFrostingMaterial so Marble/Ombré/Rainbow Swirl/Gold
    // Shimmer/Watercolor Pastel Mix/Red-White Gradient render correctly;
    // multiColor's fixed palette and twoTone's white alternate keep their
    // own plain flat material exactly as before, unaffected, since Sugar
    // Color was never meant to apply to those rows at all.
    const mat = isMainColorRow
      ? getFrostingMaterial(hexColor, mainColorId)
      : new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.55,
          metalness: 0.05,
          side: THREE.DoubleSide
        });

    const geo = buildChevronRowGeometry(radius, rowY, rowHeight, numTeeth, CHEVRON_THICKNESS, opts.embedOverride);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}