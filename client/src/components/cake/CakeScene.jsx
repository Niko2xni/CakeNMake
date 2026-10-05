import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { addWhippedCreamSkirt } from './sets/skirtHelpers';
import { buildPipingScrolls, getPipingScrollsCoverageFn } from './sets/pipingScrollsHelpers';
import { buildSunshinePlay, getSunshinePlayCoverageFn } from './sets/sunshinePlayHelpers';
import { buildVictorianLambeth, getVictorianLambethCoverageFn } from './sets/victorianLambethHelpers';
import { buildPipingRing } from './pipingTipsDeluxe';
import {
  buildDripRing,
  buildBeadedTrimRing,
  buildStrawberryRimRing,
  buildHersheysKissRimRing,
  buildHersheysKissRimRingSparse,
  buildFerreroRocherRimRing,
  buildFerreroRocherRimRingSparse,
  buildCherryRimRing,
  buildCherryRimRingSparse,
  buildBasketballRimRing,
  buildSoccerBallRimRing,
  buildCheckerSideSquares,
  getCheckerCoverageFn,
  buildTriangleSideShapes,
  getTriangleCoverageFn,
  getGlazeTriangleCoverageFn,
  buildScatterPearlsRing,
  getScatterPearlsCoverageFn,
  buildChevronSideStripes,
  getChevronCoverageFn,
  computeEdgeTrimY,
  computeEdgeTrimRadius,
} from './DecorationSets';
import { getFrostingMaterial, applyVerticalGradientUV } from './frostingMaterial';
import {
  SUGAR_COLORS,
  TOP_SURFACE_SLOTS,
  computeSlotPosition,
  getSlotById,
  PLACE_ITEM_RADII,
  CENTER_ITEM_RADII,
  getCenterItemRadius,
  getItemFootprint,
  doFootprintsClash,
  isFootprintInBoundary,
  CENTER_BOUNDARY_RESERVE,
  getCenterPlacementBoundaryRadius,
  getEdgeDelicatesObstacles,
  getDelicatesAwareBoundaryRadius,
  pruneItemsCollidingWithEdgeDelicates,
  getEdgeFerreroObstacles,
  getFerreroAwareBoundaryRadius,
  pruneItemsCollidingWithEdgeFerrero,
  isFootprintCollidingWithText,
  getCenterItemLimit,
  getCenterItemCount,
} from '../../lib/cakeConfig';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { getPacificoFont, getHandwrittenFont, areFontsReady, onFontsReady } from './cakeFonts';
import { makePRNG, hashStr } from './cakeMath';
import {
  FROSTING_COLORS,
  PIPING_FLAVOR_COLORS,
  FILLING_COLORS,
  INTERIOR_PREVIEW_CLIP_PLANES,
  INTERIOR_PREVIEW_CLIP_PLANES_2WAY,
  INTERIOR_PREVIEW_FROSTING_3WAY_PLANES,
  INTERIOR_PREVIEW_DRIP_3WAY_PLANES,
  GLAZE_PATTERN_CARVES,
  getRenderDimensions,
} from './cakeConstants';
import {
  disposeSceneObject,
  registerNewChildrenForClipping,
  getInteriorPreviewClippingConfig,
  isAngleUnclippedByPlanes,
} from './sceneUtils';
import {
  buildSpongeProfileGeometry,
  buildFillingProfileGeometry,
  buildMashedCircleFillingGeometry,
  buildMashedSwirlFillingGeometry,
  makeMashedBumpJitter,
} from './spongeGeometry';
import {
  buildOrganicFrostingGeometry,
  buildGlazeGeometry,
  makeGlazeMaterial,
  makeRidgeProfileFn,
  computeRidgeCount,
  buildTexturedButtercreamGeometry,
  buildRibbonWrapButtercreamGeometry,
  buildVerticalPipingButtercreamGeometry,
} from './frostingGeometry';
import { getSpongeMaterial } from './spongeMaterial';
import {
  addPremadeDoodle,
  addCherry,
  addStrawberry,
  addCandle,
  addChocolateChip,
  addRosette,
  buildFerreroRocherMesh,
  buildHersheysKissMesh,
  buildOreoMesh,
  buildOreoMeshFlat,
  buildChocolateBearMesh,
  buildBasketballMesh,
  buildSoccerBallMesh,
  addPipingPattern,
} from './toppings';

export function getEdgeSlotsToRender({
  edgeMode,
  edgeTop,
  edgeBottom,
  edgeBoth,
  topY,
  topRadius,
  baseRadius,
  glazeProtrusion,
}) {
  const clearance = glazeProtrusion || 0;
  if (edgeMode === 'both') {
    return [
      { slot: edgeBoth, y: topY, radius: topRadius + clearance, isBottom: false },
      { slot: edgeBoth, y: 0, radius: baseRadius + clearance, isBottom: true },
    ];
  }

  return [
    { slot: edgeTop, y: topY, radius: topRadius + clearance, isBottom: false },
    { slot: edgeBottom, y: 0, radius: baseRadius + clearance, isBottom: true },
  ];
}

export function getMiddlePipingRadius(topTierRadius) {
  return Math.max(0.2, topTierRadius + 0.2);
}

export function makeFillingBandHugFn(bands, originY, meshBaseRadius, fillingHeight) {
  const shapePower = 4;
  const vShapePower = 4;
  const slashCount = 3;
  return (localY, angle) => {
    let bulge = 0;
    for (const band of bands) {
      const centerY = band.y - originY;
      const t = (localY - centerY) / fillingHeight + 0.5;
      if (t < 0 || t > 1) continue;

      const peakBulge = meshBaseRadius * (band.isSwirl ? 0.1 : 0.075);
      const valleyRecess = meshBaseRadius * (band.isSwirl ? 0.155 : 0.12);
      const bumpF = (angle / (Math.PI * 2)) * band.bumpCount;
      const bumpIndex = Math.floor(bumpF) % band.bumpCount;
      const jitter = band.bumpJitter[bumpIndex];
      const localFrac = (bumpF - Math.floor(bumpF) - 0.5) - jitter.phase;
      const halfWidth = 0.5 * jitter.widthFrac;
      const u = Math.min(1, Math.max(-1, localFrac / halfWidth));
      const dome = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(u), shapePower)));
      const signedBulge = (dome * peakBulge - (1 - dome) * valleyRecess) * jitter.heightMul;
      const s = 2 * t - 1;
      const sScaled = Math.min(1, Math.max(-1, s / jitter.vScale));
      const vEnv = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(sScaled), vShapePower)));
      let bandBulge = vEnv * signedBulge;

      if (band.isSwirl) {
        const slashDepth = meshBaseRadius * 0.012;
        const slashGroove = Math.sin((u + sScaled) * slashCount * Math.PI) * slashDepth;
        bandBulge += vEnv * dome * slashGroove;
      }

      bulge += bandBulge;
    }
    return bulge;
  };
}

export function getTierGlazeProfileOptions({
  descriptor,
  exteriorFinishStyle,
  buttercreamTexture,
  fillingPipingTip,
  fillingHeight,
  carve,
}) {
  let ridgeProfileFn = null;
  let ridgeSpacing = null;
  let edgeFadeCycles = 4.5;
  let coatThickness;
  let sideSamples;
  let edgeFadeDist;

  if (descriptor.hasFrosting && exteriorFinishStyle === 'texturedButtercream') {
    const thicknessBoost = 1.5;
    if (buttercreamTexture === 'verticalPiping') {
      coatThickness = (0.095 + 0.02) * thicknessBoost;
    } else if (buttercreamTexture === 'ribbonWrap') {
      ridgeSpacing = 0.26;
      ridgeProfileFn = makeRidgeProfileFn(descriptor.totalHeight, 0.05, ridgeSpacing, 3.5, 4);
      sideSamples = Math.max(160, computeRidgeCount(descriptor.totalHeight, ridgeSpacing, 4) * 24);
      coatThickness = 0.08 * thicknessBoost;
    } else {
      ridgeSpacing = 0.42;
      edgeFadeCycles = 3;
      ridgeProfileFn = makeRidgeProfileFn(descriptor.totalHeight, 0.07, ridgeSpacing, 1, 3);
      sideSamples = Math.max(140, computeRidgeCount(descriptor.totalHeight, ridgeSpacing, 3) * 20);
      coatThickness = 0.1 * thicknessBoost;
    }

    if (ridgeProfileFn && !carve.wave) {
      edgeFadeDist = ridgeSpacing * edgeFadeCycles;
    }
  } else if (fillingPipingTip === 'mashedCircles' || fillingPipingTip === 'mashedSwirls') {
    ridgeProfileFn = makeFillingBandHugFn(
      descriptor.fillingBands,
      descriptor.frostMeshY,
      descriptor.radius * 0.95,
      fillingHeight,
    );
    sideSamples = Math.max(140, Math.ceil((descriptor.totalHeight / fillingHeight) * 10));
    coatThickness = 0.08;
  }

  return { ridgeProfileFn, sideSamples, coatThickness, edgeFadeDist };
}

// Builds one decoration item (any of the 9 Center designs) into targetGroup
// at local (x,y,z). Hoisted to module scope (rather than living inside
// buildCake, where it originally was) so it can also be called from the
// separate click-handling closure for ghost-preview rendering -- see
// updateCenterGhost below. It only ever depended on its own parameters and
// the top-level imported build functions above, plus a `prng || rand`
// fallback that's been removed here since every call site already passes
// prng explicitly (rand for the real render, Math.random for the ghost).
export function buildAndAddDecoration(targetGroup, setId, x, y, z, scaleFactor, decorColor, prng, orientation, colorId = null) {
  const edibleDelicateScale = [
    'strawberry',
    'cherry',
    'ferreroRocher',
    'hersheysKisses',
    'basketball',
    'soccerball',
  ].includes(setId) ? 1 : scaleFactor;

  if (setId === 'floralCluster') {
    const unitGroup = new THREE.Group();
    addRosette(unitGroup, 0, 0, 0, decorColor);
    unitGroup.scale.setScalar(0.75 * scaleFactor);
    unitGroup.position.set(x, y, z);
    targetGroup.add(unitGroup);
  } else if (setId === 'strawberry') {
    const unitGroup = new THREE.Group();
    addStrawberry(unitGroup, 0, 0, 0);
    unitGroup.scale.setScalar(0.82 * edibleDelicateScale);
    unitGroup.position.set(x, y, z);
    targetGroup.add(unitGroup);
  } else if (setId === 'cherry') {
    const unitGroup = new THREE.Group();
    addCherry(unitGroup, 0, 0, 0, prng);
    unitGroup.scale.setScalar(0.85 * edibleDelicateScale);
    unitGroup.position.set(x, y, z);
    targetGroup.add(unitGroup);
  } else if (setId === 'fruitRing') {
    const unitGroup = new THREE.Group();
    addStrawberry(unitGroup, -0.15 * scaleFactor, 0, 0);
    addCherry(unitGroup, 0.22 * scaleFactor, 0, 0.1 * scaleFactor, prng);
    unitGroup.scale.setScalar(0.65 * scaleFactor);
    unitGroup.position.set(x, y, z);
    targetGroup.add(unitGroup);
  } else if (setId === 'ferreroRocher') {
    const rocherScale = 0.45 * edibleDelicateScale;
    const rocherMesh = buildFerreroRocherMesh(x, y, z, rocherScale);
    targetGroup.add(rocherMesh);
  } else if (setId === 'hersheysKisses') {
    const kissScale = 0.36 * edibleDelicateScale;
    const rot = prng ? prng() * Math.PI * 2 : 0;
    const kissMesh = buildHersheysKissMesh(x, y, z, kissScale, rot);
    targetGroup.add(kissMesh);
  } else if (setId === 'oreo') {
    // Real Oreo is ~1.75in across; wafer geometry is 4.5 units (2.25
    // radius) unscaled, and 1 scene unit == 1 real inch (see
    // REFERENCE_TOP_RADIUS note above), so 1.75 / 4.5 = 0.3889 is the
    // scale that renders it at true size instead of ~51% of it.
    // Same scale either way -- orientation only changes the pose,
    // not the physical cookie.
    const oreoScale = 0.3889 * scaleFactor;
    if (orientation === 'flat') {
      const spin = prng ? prng() * Math.PI * 2 : 0;
      const oreoFlatMesh = buildOreoMeshFlat(x, y, z, oreoScale, spin);
      targetGroup.add(oreoFlatMesh);
    } else {
      const oreoMesh = buildOreoMesh(x, y, z, oreoScale, Math.PI / 2, 0, 0);
      targetGroup.add(oreoMesh);
    }
  } else if (setId === 'chocolateBear') {
    const bearMesh = buildChocolateBearMesh(x, y, z, 0.28 * scaleFactor);
    targetGroup.add(bearMesh);
  } else if (setId === 'basketball') {
    const basketballMesh = buildBasketballMesh(x, y, z, 0.18 * edibleDelicateScale);
    targetGroup.add(basketballMesh);
  } else if (setId === 'soccerball') {
    const soccerMesh = buildSoccerBallMesh(x, y, z, 0.18 * edibleDelicateScale);
    targetGroup.add(soccerMesh);
  } else if (setId.startsWith('letterUpper') || setId.startsWith('letterLower')) {
    // Buttercream Text -- one character, built the moment it's needed
    // rather than a shared/cached mesh like the other designs above,
    // since there are 52 of these (Uppercase + Lowercase, see
    // BUTTERCREAM_LETTERS_UPPER/_LOWER in cakeConfig.js) and (unlike a
    // fixed cherry or oreo mesh) each one is genuinely different geometry.
    // Font loads asynchronously (see fontsReady in the component below);
    // if it isn't ready yet this just renders nothing for this one build
    // pass -- the component's own fontsReady-triggered rebuild (also what
    // Piping Text relies on) picks it up as soon as the font arrives, no
    // separate readiness plumbing needed here.
    const font = getPacificoFont();
    if (!font) return;
    const isUpper = setId.startsWith('letterUpper');
    const baseChar = isUpper ? setId.slice('letterUpper'.length) : setId.slice('letterLower'.length);
    const ch = isUpper ? baseChar : baseChar.toLowerCase();
    const letterGeo = new TextGeometry(ch, {
      font,
      size: 0.55,
      // Noticeably thicker than Piping Text's 0.015 depth (see the main
      // text-building block further down) -- Piping Text is meant to
      // read as a thin piped line resting on the surface; Buttercream
      // Text is a standalone placed object, the same category as a
      // Hershey's Kiss or a chocolate chip, so it needs real 3D volume
      // to look like a solid hardened letter rather than a flat decal.
      depth: 0.22,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.035,
      bevelSegments: 4,
    });
    applyVerticalGradientUV(letterGeo);
    letterGeo.computeBoundingBox();
    const bbox = letterGeo.boundingBox;
    const letterMat = getFrostingMaterial(decorColor, colorId);
    const letterMesh = new THREE.Mesh(letterGeo, letterMat);
    // Stand upright facing front to the user (facing along +Z toward camera, height along +Y,
    // resting flush on surface at base y=0, centered horizontally on X and thickness on Z)
    const centerX = -0.5 * (bbox.min.x + bbox.max.x);
    const centerZ = -0.5 * (bbox.min.z + bbox.max.z);
    letterMesh.position.set(x + centerX * scaleFactor, y - bbox.min.y * scaleFactor, z + centerZ * scaleFactor);
    letterMesh.scale.setScalar(scaleFactor);
    letterMesh.castShadow = true;
    letterMesh.receiveShadow = true;
    targetGroup.add(letterMesh);
  }
}

// Deep-clones every material in a built decoration and turns it into a
// translucent, tinted ghost -- used for the drag/hover preview before an
// item is actually dropped. Cloning matters: many of these designs share
// cached materials (getSharedOreoWaferMaterial, etc.) across every instance
// already placed on the cake, so mutating opacity/color directly on
// mesh.material would make every real Oreo on the cake go translucent too.
// Dedicated ghost materials -- created once, reused for every mesh in every
// ghost, regardless of design. Unlit (MeshBasicMaterial) on purpose: it
// renders at exactly the specified color no matter the scene lighting, and
// completely ignores whatever the underlying mesh's own material does
// (metalness, roughness, textures). That's the point -- these are a
// dedicated "cursor placing color", intentionally decoupled from each
// design's own appearance, not a modified copy of it.
let _ghostMaterialValid = null;
let _ghostMaterialInvalid = null;
function getGhostMaterial(valid) {
  if (valid) {
    if (!_ghostMaterialValid) {
      _ghostMaterialValid = new THREE.MeshBasicMaterial({
        color: '#10B981',
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });
    }
    return _ghostMaterialValid;
  }
  if (!_ghostMaterialInvalid) {
    _ghostMaterialInvalid = new THREE.MeshBasicMaterial({
      color: '#EF4444',
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
  }
  return _ghostMaterialInvalid;
}

function tintAsGhost(root, valid) {
  // Swap in the dedicated ghost material -- never clone, never modify,
  // never even read the mesh's original material. The decoration's own
  // color/material is completely untouched by this function; it's simply
  // not used for the ghost at all. Real placed items (which never pass
  // through this function) keep their exact original appearance, satisfying
  // "the Decorations must keep the color they have when rebuilt" by
  // construction -- there's nothing here that could alter them.
  const ghostMaterial = getGhostMaterial(valid);
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.material = Array.isArray(obj.material)
      ? obj.material.map(() => ghostMaterial)
      : ghostMaterial;
    obj.castShadow = false;
    obj.receiveShadow = false;
  });
}

// Ghost-specific clearing: NOT the generic disposeSceneObject, and no
// disposal at all. The ghost's meshes reuse SHARED, cached geometry (from
// buildAndAddDecoration -- every real placement of that design on the
// actual cake uses the same buffers) and, since tintAsGhost above, SHARED
// dedicated ghost materials too (the two getGhostMaterial singletons,
// reused across every ghost render regardless of design). Nothing in this
// group is ever uniquely owned by a single ghost instance, so there's
// nothing left that needs disposing when it's cleared -- doing so would
// corrupt either the real cake's geometry or every future ghost's material.
function clearGhostGroup(group) {
  while (group.children.length > 0) {
    group.remove(group.children[0]);
  }
}

// Every design's mesh is built with its own local (0,0,0) wherever that
// design's own code happens to put it -- for almost everything here,
// that's the item's resting BASE (built to sit flush on a surface),
// not its true geometric middle. Rotating around that base is fine for a
// small, roughly round item (the offset from base to true center is
// small, so any resulting swing is subtle), but for anything visibly
// asymmetric -- most obviously Buttercream Text letters, which are flat
// and thin in one direction -- rotating around the base instead of the
// real center makes the whole object swing/orbit away from where it was
// placed instead of spinning in place, worse the further from 0° the
// tilt goes. Measured once via Box3/bounding-sphere (same technique
// DecorationPreview.jsx's camera-fit already uses) and cached by design,
// so buildRotatedDecoration below always has the real number to pivot
// around regardless of each design's own internal convention.
/**
 * Computes a bounding box for an object while ignoring any decorative stems,
 * sticks, or secondary appendages marked with userData.ignoreGrounding (e.g. cherry stem).
 */
export function computeGroundingBox(object) {
  const box = new THREE.Box3();
  const tempBox = new THREE.Box3();
  let found = false;

  object.traverse((child) => {
    if (child.userData.ignoreGrounding) return;
    if (child.geometry) {
      if (!child.geometry.boundingBox) {
        child.geometry.computeBoundingBox();
      }
      tempBox.copy(child.geometry.boundingBox);
      tempBox.applyMatrix4(child.matrixWorld);
      box.union(tempBox);
      found = true;
    }
  });

  return (!found || box.isEmpty()) ? new THREE.Box3().setFromObject(object) : box;
}

const _designCenterOffsetCache = {};
function getDesignCenterOffset(designId, orientation) {
  const cacheKey = `${designId}__${orientation || 'default'}`;
  if (_designCenterOffsetCache[cacheKey] !== undefined) return _designCenterOffsetCache[cacheKey];

  const scratch = new THREE.Group();
  // Scale 1 -- same reference-size convention as everywhere else that
  // measures a design's own geometry -- multiplied back out by the real
  // render scale at use time in buildRotatedDecoration below.
  buildAndAddDecoration(scratch, designId, 0, 0, 0, 1, '#F6DEAB', Math.random, orientation);
  scratch.updateMatrixWorld(true);
  const box = computeGroundingBox(scratch);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const offset = { x: sphere.center.x, y: sphere.center.y, z: sphere.center.z, minY: box.min.y };

  // Deliberately not disposing scratch's meshes -- same shared-geometry/
  // material caching reasoning as elsewhere in this file (these meshes
  // reference the same cached GPU resources every real placement of that
  // design uses).
  _designCenterOffsetCache[cacheKey] = offset;
  return offset;
}

// Builds one Center design, rotated by (tiltX, rotationY) around its own
// measured true center (see getDesignCenterOffset above) rather than
// around whatever local-origin convention its mesh-building code uses.
// Returns an unpositioned wrapper group -- the caller sets .position to
// wherever the item is actually anchored (the surface point it was
// dropped on). At tiltX = rotationY = 0 this renders in EXACTLY the same
// place as the old direct "build at origin, rotate the wrapper" approach
// (the +offset/-offset pair cancels out completely), so the untouched,
// far more common untilted case is pixel-identical to before -- only
// nonzero tilt/rotation actually changes anything visually.
//
// rollRight (optional, radians, default 0) is the left/right tilt: how far
// the item leans toward the viewer's RIGHT (negative = leans left), a roll
// around the axis pointing at the camera. Euler order is 'ZXY' so that roll
// is applied last, in the fixed view frame -- exactly how tiltX already
// behaves relative to rotationY -- and with rollRight = 0 the matrix is
// identical to the old (tiltX, rotationY, 0) 'XYZ' set, so existing placed
// items render exactly as before. Added as a trailing param so any other
// caller (e.g. DecorationPreview) keeps working unchanged.
//
// normal (optional, THREE.Vector3): local surface normal of the cake dome/bump
// at the drop point. When provided, aligns the anchor to hug the slope of the hill.
export function buildRotatedDecoration(designId, orientation, tiltX, rotationY, scale, color, prng, rollRight = 0, colorId = null) {
  const anchor = new THREE.Group();
  anchor.userData.designId = designId;

  const offset = getDesignCenterOffset(designId, orientation);
  const rotationCore = new THREE.Group();
  rotationCore.position.set(offset.x * scale, offset.y * scale, offset.z * scale);
  // Camera looks down -Z from +Z, so a positive Z rotation leans LEFT on
  // screen; negate so rollRight > 0 leans right.
  rotationCore.rotation.set(tiltX, rotationY, -rollRight, 'ZXY');
  const meshGroup = new THREE.Group();
  meshGroup.position.set(-offset.x * scale, -offset.y * scale, -offset.z * scale);
  buildAndAddDecoration(meshGroup, designId, 0, 0, 0, scale, color, prng, orientation, colorId);
  rotationCore.add(meshGroup);
  anchor.add(rotationCore);

  const localUp = new THREE.Vector3(0, 1, 0).applyEuler(rotationCore.rotation);
  anchor.userData.localUpY = localUp.y;

  // Grounding: Ensure the lowest point of the rotated decoration rests
  // at anchor Y = 0 in local space, regardless of orientation or tilt angle.
  // For items with thin stems/sticks (like cherries), grounds by the main body.
  anchor.updateMatrixWorld(true);
  const bbox = computeGroundingBox(anchor);
  if (isFinite(bbox.min.y)) {
    rotationCore.position.y -= bbox.min.y;
    anchor.updateMatrixWorld(true);
  }

  return anchor;
}

/**
 * Calculates the exact 3D surface point on top of the cake at (x, z),
 * following the dome bump and shoulder bevel smoothly with no jumps.
 */
export function getCakeTopSurfacePoint(x, z, topMetrics) {
  if (!topMetrics) {
    return { y: 0 };
  }
  const { baseY = 0, domeHeight = 0, radius = 4 } = topMetrics;
  const r = Math.sqrt(x * x + z * z);
  const R = Math.max(0.1, radius - 0.18); // shoulder radius where dome meets bevel

  let y = baseY;

  if (r < R) {
    const factor = 1 - (r / R) * (r / R);
    y = baseY + domeHeight * factor;
  } else {
    // Shoulder bevel curve down to the cake's outer rim
    const bevelWidth = Math.max(0.01, radius - R);
    const dr = Math.min(bevelWidth, r - R);
    const t = dr / bevelWidth;
    const drop = 0.15 * Math.sin((Math.PI / 2) * t);
    y = baseY - drop;
  }

  return { y };
}

/**
 * Ensures that any placed or previewed decoration lands flush on the cake surface
 * no matter what angle or tilt it has.
 * Reads the actual bottom contact points of the rotated mesh relative to the cake's
 * surface elevation directly underneath, guaranteeing zero floating at any angle.
 * For items with stems (like cherries), only reads the fruit body so the cherry
 * body rests firmly on the surface.
 */
export function getDecorationLandingY(anchor, px, pz, topMetrics) {
  const fallbackY = getCakeTopSurfacePoint(px, pz, topMetrics).y;
  if (!anchor || !topMetrics) return fallbackY;

  anchor.updateMatrixWorld(true);
  const bbox = computeGroundingBox(anchor);
  if (!isFinite(bbox.min.y)) return fallbackY;

  const height = Math.max(0.01, bbox.max.y - bbox.min.y);
  // Bottom contact band: vertices within the lowest 15% of the object height (or 0.12 units)
  const contactThreshold = bbox.min.y + Math.min(height * 0.15, 0.12);

  const contactPoints = [];
  let lowestVertex = null;
  let lowestY = Infinity;

  anchor.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    if (child.userData.ignoreGrounding) return; // Skip stem, stick, or secondary appendages
    const pos = child.geometry.attributes.position;
    if (!pos) return;
    const v = new THREE.Vector3();
    const stride = Math.max(1, Math.floor(pos.count / 32));
    for (let i = 0; i < pos.count; i += stride) {
      v.fromBufferAttribute(pos, i);
      v.applyMatrix4(child.matrixWorld);
      if (v.y < lowestY) {
        lowestY = v.y;
        lowestVertex = { dx: v.x, dy: v.y, dz: v.z };
      }
      if (v.y <= contactThreshold && contactPoints.length < 80) {
        contactPoints.push({ dx: v.x, dy: v.y, dz: v.z });
      }
    }
  });

  if (lowestVertex) {
    contactPoints.push(lowestVertex);
  }

  // Fallback if no vertices were collected (e.g. custom procedural object)
  if (contactPoints.length === 0) {
    contactPoints.push({ dx: 0, dy: bbox.min.y, dz: 0 });
    const midX = (bbox.min.x + bbox.max.x) * 0.5;
    const midZ = (bbox.min.z + bbox.max.z) * 0.5;
    contactPoints.push({ dx: midX, dy: bbox.min.y, dz: midZ });
  }

  // Find the exact landing Y so that every contact point sits on or above the cake surface
  // (i.e. the lowest contact point touches the cake surface directly underneath it)
  let maxLandingY = -Infinity;
  for (const pt of contactPoints) {
    const worldX = px + pt.dx;
    const worldZ = pz + pt.dz;
    const surfaceY = getCakeTopSurfacePoint(worldX, worldZ, topMetrics).y;
    const requiredY = surfaceY - pt.dy;
    if (requiredY > maxLandingY) {
      maxLandingY = requiredY;
    }
  }

  // Base nestle into frosting so it sits firmly on the cake with zero daylight
  let nestle = 0.015;

  const designId = anchor.userData?.designId;
  const isLetter = typeof designId === 'string' &&
    (designId.startsWith('letterUpper') || designId.startsWith('letterLower'));

  // When conical/pointy items (like Hershey's Kiss) are tilted upside down,
  // bury them progressively deeper into the frosting the more they tilt upside down,
  // so the pointy tip sinks well into the cake and the wider cone body is firmly grounded.
  if (designId === 'hersheysKisses') {
    const upY = anchor.userData.localUpY ?? 1.0;
    if (upY < 0) {
      // upY ranges from 0 (on its side) to -1.0 (pointing straight down).
      // Smoothly scale up extra bury to ~0.20 units as it goes upside down.
      const upsideDownFactor = Math.abs(upY);
      nestle += upsideDownFactor * 0.20;
    }
  } else if (designId === 'strawberry') {
    const upY = anchor.userData.localUpY ?? 1.0;
    // Base extra nestle so strawberry rests firmly in frosting on all sides:
    nestle += 0.02;
    // Bury upright strawberry into frosting so the pointy apex tip doesn't float or balance on a point:
    if (upY >= 0) {
      nestle += upY * 0.035;
    } else {
      // Bury upside-down strawberry into frosting so the crown/leaves sit embedded:
      const upsideDownFactor = Math.abs(upY);
      nestle += upsideDownFactor * 0.07;
    }
  } else if (designId === 'oreo' || designId === 'chocolateBear') {
    const upY = anchor.userData.localUpY ?? 1.0;
    // For every angle tilt (0 -> 90 deg), bury progressively into frosting:
    const tiltFactor = Math.min(1.0, Math.max(0, 1.0 - upY));
    nestle += tiltFactor * 0.08;

    // As it goes upside down (past 90 deg toward 180 deg), bury even deeper just like Hershey's:
    if (upY < 0) {
      const upsideDownFactor = Math.abs(upY);
      nestle += upsideDownFactor * 0.16;
    }
  } else if (designId === 'ferreroRocher') {
    const upY = anchor.userData.localUpY ?? 1.0;
    nestle += 0.045;
    if (upY < 0) {
      nestle += Math.abs(upY) * 0.04;
    }
  } else if (designId === 'cherry') {
    const upY = anchor.userData.localUpY ?? 1.0;
    nestle += 0.04;
    if (upY < 0) {
      nestle += Math.abs(upY) * 0.04;
    }
  } else if (designId === 'basketball' || designId === 'soccerball') {
    const upY = anchor.userData.localUpY ?? 1.0;
    nestle += 0.045;
    if (upY < 0) {
      nestle += Math.abs(upY) * 0.04;
    }
  } else if (designId === 'fruitRing') {
    nestle += 0.035;
  } else if (isLetter) {
    const upY = anchor.userData.localUpY ?? 1.0;
    // Minimal nestle when standing straight up so letters are crisp and clearly visible on top of frosting:
    nestle = 0.008;

    // Peak bury when lying flat on the surface (around 90 deg tilt, upY close to 0):
    // When upright (upY -> 1) or completely upside down (upY -> -1), extra tilt bury eases off
    // so the letter rests cleanly on the surface without sinking deep into the cake.
    const sideTiltFactor = 1.0 - Math.abs(upY);
    nestle += sideTiltFactor * 0.09;
  }

  const landingY = (isFinite(maxLandingY) ? maxLandingY : fallbackY) - nestle;
  return landingY;
}

// isCenterTool/parseCenterTool: module scope (not closure-local) so both
// the click-handling closure below AND the render function (which derives
// the cursor icon's props from the activeTool prop) can use the same
// parsing logic, rather than duplicating it a third time.
function isCenterTool(toolType) {
  return typeof toolType === 'string' && toolType.startsWith('center-');
}

function parseCenterTool(toolType) {
  const [, designId, orientationTag] = toolType.split('-');
  return { designId, orientation: orientationTag === 'default' ? null : orientationTag };
}

function isButtercreamLetterDesign(designId) {
  return designId?.startsWith('letterUpper') || designId?.startsWith('letterLower');
}

// Place-tab items (cherry, strawberry, candle, chocolateChip, rosette,
// piping) — formerly slot-snapped onto TOP_SURFACE_SLOTS, now placed
// freeform with real-size collision checking, same idea as Center tools
// but without pile-stacking (these are small single items, not designs
// meant to be stacked). Doodles intentionally aren't included here yet —
// they still use the old slot system for now.
function isPlaceItemTool(toolType) {
  return typeof toolType === 'string' && Object.prototype.hasOwnProperty.call(PLACE_ITEM_RADII, toolType);
}

const CakeScene = React.forwardRef(function CakeScene({
  cakeConfig,
  activeTool,
  onPlace,
  onSelectTool,
  onPlacementBlocked,
  selectedCenterItemId = null,
  onCenterItemSelect,
  onDeleteCenterItem,
  onPlacedItemsChange,
  thumbnailMode = false,
  disabled = false,
  readOnly = false,
}, ref) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const thumbnailCameraRef = useRef(null);
  const cakeGroupRef = useRef(null);
  const groundRef = useRef(null);
  const animFrameRef = useRef(null);
  const mouseRef = useRef({ isDown: false, prevX: 0, prevY: 0, moved: false });
  const autoRotateRef = useRef(false);
  const activeToolRef = useRef(activeTool);
  const disabledRef = useRef(disabled);
  const readOnlyRef = useRef(readOnly);
  const onPlaceRef = useRef(onPlace);
  const onSelectToolRef = useRef(onSelectTool);
  const onPlacementBlockedRef = useRef(onPlacementBlocked);
  const onCenterItemSelectRef = useRef(onCenterItemSelect);
  const onDeleteCenterItemRef = useRef(onDeleteCenterItem);
  const onPlacedItemsChangeRef = useRef(onPlacedItemsChange);
  const selectedCenterItemIdRef = useRef(selectedCenterItemId);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const cakeConfigRef = useRef(cakeConfig);
  const lastValidGhostDropRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fontsReady, setFontsReady] = useState(() => areFontsReady());
  const isCapturingThumbnailRef = useRef(false);
  const baselineYRef = useRef(0);
  const coveringMaterialsRef = useRef([]);

  // Predefined slot & ghost preview refs
  const slotsGroupRef = useRef(null);
  const ghostGroupRef = useRef(null);
  const selectionOverlayGroupRef = useRef(null);
  const refreshSelectionOverlayRef = useRef(null);
  const hoveredSlotRef = useRef(null);
  // Set inside the main scene-setup effect once updateCenterGhost/
  // updatePlaceItemGhost exist; called from the activeTool-sync effect
  // below (and by the keyboard rotation shortcut) so a rotation/tilt
  // change updates the ghost immediately, at wherever the mouse last was,
  // instead of leaving it stale until the next real mousemove over the
  // canvas.
  const refreshGhostRef = useRef(null);
  const topMetricsRef = useRef({ baseY: 0, domeHeight: 0, topY: 0, radius: 4 });
  const handleResizeRef = useRef(null);

  // Update visual slot markers and ghost preview
  const updateSlotVisuals = useCallback(() => {
    if (!slotsGroupRef.current || !ghostGroupRef.current) return;
    const slotsGroup = slotsGroupRef.current;
    const ghostGroup = ghostGroupRef.current;

    // Clear old slot markers
    while (slotsGroup.children.length > 0) {
      const child = slotsGroup.children[0];
      disposeSceneObject(child);
      slotsGroup.remove(child);
    }

    if (!activeToolRef.current || cakeConfigRef.current?.interiorPreview) {
      clearGhostGroup(ghostGroup);
      return;
    }

    // Center tools and Place-tab item tools both place freeform now, not
    // into TOP_SURFACE_SLOTS -- their hover feedback (including clearing
    // their own ghost) is owned entirely by updateCenterGhost/
    // updatePlaceItemGhost, refreshed via refreshGhostRef below. This
    // function used to unconditionally clear the ghost group before this
    // check ran, regardless of tool type -- meaning any activeTool change
    // at all (not just switching tools, but also a rotation slider
    // tweaking the SAME tool's rotationY/rotationX) wiped the ghost mesh
    // out of the scene here, with nothing here to rebuild it since this
    // function's job for these tool types is just to no-op. The visible
    // "cursor" for these tools *is* the ghost mesh (cursor-none hides the
    // real OS cursor), so that wipe read as the cursor blinking/
    // disappearing every time the rotation slider moved, until the next
    // mousemove over the canvas happened to rebuild it.
    const activeToolType = typeof activeToolRef.current === 'object' ? activeToolRef.current.type : activeToolRef.current;
    if (isCenterTool(activeToolType) || isPlaceItemTool(activeToolType)) return;

    clearGhostGroup(ghostGroup);

    const { radius, baseY, domeHeight, topY } = topMetricsRef.current;
    const placedItems = cakeConfigRef.current?.placedItems || [];
    const occupiedSlotIds = new Set(placedItems.map(it => it.slotId).filter(Boolean));
    const hoveredSlot = hoveredSlotRef.current;

    TOP_SURFACE_SLOTS.forEach(slot => {
      const pos = computeSlotPosition(slot, radius);
      const R = radius - 0.15;
      const r = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      let surfaceY = baseY;
      if (r < R) {
        surfaceY += domeHeight * (1 - (r / R) * (r / R));
      } else {
        surfaceY = topY;
      }
      surfaceY += 0.03; // slightly above frosting surface

      const isHovered = hoveredSlot?.id === slot.id;
      const isOccupied = occupiedSlotIds.has(slot.id);

      // Create slot marker disc
      const markerRadius = isHovered ? 0.32 : 0.22;
      const markerGeo = new THREE.CircleGeometry(markerRadius, 24);
      const markerColor = isHovered
        ? (isOccupied ? '#EF4444' : '#EC4899')
        : (isOccupied ? '#10B981' : '#F43F5E');
      const markerOpacity = isHovered ? 0.85 : (isOccupied ? 0.45 : 0.3);

      const markerMat = new THREE.MeshBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: markerOpacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(pos.x, surfaceY, pos.z);
      marker.userData.slotId = slot.id;
      slotsGroup.add(marker);
    });
  }, []);

  // Expose renderer ref to parent
  React.useImperativeHandle(ref, () => ({
    getRenderer: () => rendererRef.current,
    resetCamera: () => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const mount = mountRef.current;
      if (!camera || !controls) return;
      camera.position.set(0, 8, 22);
      controls.target.set(0, 4, 0);
      if (mount && mount.clientWidth && mount.clientHeight) {
        const aspect = mount.clientWidth / mount.clientHeight;
        const baseFov = 40;
        const baseAspect = 1.6;
        if (aspect < baseAspect) {
          const fovRad = 2 * Math.atan(Math.tan((baseFov * Math.PI) / 360) * (baseAspect / aspect));
          camera.fov = Math.min(62, Math.max(35, (fovRad * 180) / Math.PI));
        } else {
          camera.fov = baseFov;
        }
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
      controls.update();
    },
    captureScreenshot: () => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const cam = cameraRef.current;
      if (!renderer || !scene || !cam) return null;

      const prevGroundVisible = groundRef.current ? groundRef.current.visible : true;
      const prevShadowMap = renderer.shadowMap.enabled;
      if (groundRef.current) groundRef.current.visible = false;
      renderer.shadowMap.enabled = false;

      renderer.render(scene, cam);
      const url = renderer.domElement.toDataURL('image/png');

      if (groundRef.current) groundRef.current.visible = prevGroundVisible;
      renderer.shadowMap.enabled = prevShadowMap;
      return url;
    },
    captureThumbnail: () => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const thumbnailCam = thumbnailCameraRef.current;
      if (!renderer || !scene || !thumbnailCam) return null;

      const prevClipStates = coveringMaterialsRef.current.map(mat => mat.clippingPlanes);
      coveringMaterialsRef.current.forEach(mat => { mat.clippingPlanes = []; });

      const prevSlotsVisible = slotsGroupRef.current ? slotsGroupRef.current.visible : true;
      const prevGhostVisible = ghostGroupRef.current ? ghostGroupRef.current.visible : true;
      const prevGroundVisible = groundRef.current ? groundRef.current.visible : true;
      const prevShadowMap = renderer.shadowMap.enabled;
      if (slotsGroupRef.current) slotsGroupRef.current.visible = false;
      if (ghostGroupRef.current) ghostGroupRef.current.visible = false;
      if (groundRef.current) groundRef.current.visible = false;
      renderer.shadowMap.enabled = false;

      const prevRotY = cakeGroupRef.current?.rotation?.y ?? 0;
      if (cakeGroupRef.current) cakeGroupRef.current.rotation.set(0, 0, 0);

      let dataUrl;
      try {
        renderer.render(scene, thumbnailCam);
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 640 / Math.max(renderer.domElement.width, renderer.domElement.height));
        canvas.width = Math.max(1, Math.round(renderer.domElement.width * scale));
        canvas.height = Math.max(1, Math.round(renderer.domElement.height * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(renderer.domElement, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      } finally {
        if (cakeGroupRef.current) cakeGroupRef.current.rotation.y = prevRotY;
        coveringMaterialsRef.current.forEach((mat, i) => { mat.clippingPlanes = prevClipStates[i]; });
        if (slotsGroupRef.current) slotsGroupRef.current.visible = prevSlotsVisible;
        if (ghostGroupRef.current) ghostGroupRef.current.visible = prevGhostVisible;
        if (groundRef.current) groundRef.current.visible = prevGroundVisible;
        renderer.shadowMap.enabled = prevShadowMap;
      }
      return dataUrl;
    },

    // Cake Blueprint captures. Built-in and automatic — the designer page
    // calls this once, when the Send to Bakery order succeeds; users never
    // trigger it themselves. Returns
    //   { hero, front, back, top, side }   (JPEG data URLs, or null)
    // - hero: Start Page. One big three-quarter shot (top + front + side
    //   visible together), full A4 page.
    // - front/back/top/side: Angle Page. Each is the shape of one cell of
    //   the 2x2 grid (half the page wide, half tall — A4's own 1:sqrt(2)
    //   ratio holds), so nothing is cropped or stretched in the PDF.
    //
    // Framing is tier-aware and measured, not guessed: the camera distance
    // is found by projecting the cake's real round footprint (a ring of
    // points at the bottom and top of the cake, radius from its bounds —
    // grows with every tier and decoration) and backing off until all of
    // it sits inside the frame. The viewing elevation also drops as the
    // cake gets taller: a short 1-tier cake needs a higher angle to show
    // its top decoration, while a tall stack would hide its upper tier if
    // looked at too steeply.
    //
    // Renders through the SAME WebGLRenderer as the live view (a render
    // target would skip ACES tone mapping and the colors would drift from
    // what the person designed), so the canvas is briefly resized, drawn
    // once per shot, then restored — all synchronously, so no frame is
    // ever painted at the temporary size.
    captureBlueprintViews: ({ quality = 0.92 } = {}) => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const cakeGroup = cakeGroupRef.current;
      if (!renderer || !scene || !cakeGroup) return null;

      const tiers = Math.max(1, Number(cakeConfigRef.current?.layers) || 1);
      const deg = THREE.MathUtils.degToRad;
      const pick = (one, two, many) => deg(tiers <= 1 ? one : tiers === 2 ? two : many);

      const GRID = { width: 930, height: 1315 };
      const HERO = { width: 1240, height: 1754 };
      const gridTilt = pick(13, 8, 5);
      const shots = [
        // Three-quarter: turned 40° toward the right so front AND side show,
        // raised enough that the top face reads too.
        { name: 'hero', ...HERO, azimuth: deg(40), tilt: pick(26, 20, 15) },
        { name: 'front', ...GRID, azimuth: 0, tilt: gridTilt },
        { name: 'back', ...GRID, azimuth: Math.PI, tilt: gridTilt },
        { name: 'top', ...GRID, azimuth: 0, tilt: Math.PI / 2 },
        { name: 'side', ...GRID, azimuth: Math.PI / 2, tilt: gridTilt },
      ];

      const prevSlotsVisible = slotsGroupRef.current ? slotsGroupRef.current.visible : true;
      const prevGhostVisible = ghostGroupRef.current ? ghostGroupRef.current.visible : true;
      const prevClipStates = coveringMaterialsRef.current.map((mat) => mat.clippingPlanes);
      const prevRotation = cakeGroup.rotation.clone();
      const prevSize = renderer.getSize(new THREE.Vector2());
      const prevPixelRatio = renderer.getPixelRatio();
      const result = {};

      try {
        // Same clean-up captureThumbnail does: interior-preview clipping,
        // slot markers and the placement ghost never belong in a blueprint
        // (and must not inflate the framing bounds either).
        coveringMaterialsRef.current.forEach((mat) => { mat.clippingPlanes = []; });
        if (slotsGroupRef.current) slotsGroupRef.current.visible = false;
        if (ghostGroupRef.current) ghostGroupRef.current.visible = false;
        cakeGroup.rotation.set(0, 0, 0);
        cakeGroup.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(cakeGroup);
        if (box.isEmpty()) return null;
        const center = box.getCenter(new THREE.Vector3());
        const dims = box.getSize(new THREE.Vector3());
        const ringRadius = Math.max(dims.x, dims.z) / 2;
        const minRadius = Math.max(dims.x, dims.y, dims.z) / 2; // camera must stay outside this

        // Round footprint: a ring at the bottom and one at the top.
        const points = [];
        for (let i = 0; i < 32; i++) {
          const a = (i / 32) * Math.PI * 2;
          for (const y of [box.min.y, box.max.y]) {
            points.push(new THREE.Vector3(center.x + Math.cos(a) * ringRadius, y, center.z + Math.sin(a) * ringRadius));
          }
        }

        const FIT = 0.94; // fill the frame, keep a sliver of margin
        const fov = 30;
        const projected = new THREE.Vector3();
        const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 300);

        renderer.setPixelRatio(1);

        for (const shot of shots) {
          camera.aspect = shot.width / shot.height;
          camera.up.set(0, shot.tilt >= Math.PI / 2 ? 0 : 1, shot.tilt >= Math.PI / 2 ? -1 : 0);
          const horizontalFactor = Math.cos(shot.tilt);
          const dir = new THREE.Vector3(
            Math.sin(shot.azimuth) * horizontalFactor,
            Math.sin(shot.tilt),
            Math.cos(shot.azimuth) * horizontalFactor
          );

          const place = (d) => {
            camera.position.copy(center).addScaledVector(dir, d);
            camera.lookAt(center);
            camera.updateProjectionMatrix();
            camera.updateMatrixWorld(true);
          };
          const fits = (d) => {
            place(d);
            return points.every((p) => {
              projected.copy(p).project(camera);
              return Math.abs(projected.x) <= FIT && Math.abs(projected.y) <= FIT && projected.z < 1;
            });
          };

          // Smallest distance at which the whole footprint fits (bisection —
          // fitting only gets easier the farther back the camera goes).
          let lo = minRadius;
          let hi = minRadius * 40;
          for (let i = 0; i < 28; i++) {
            const mid = (lo + hi) / 2;
            if (fits(mid)) hi = mid; else lo = mid;
          }
          place(hi);

          renderer.setSize(shot.width, shot.height, false);
          renderer.render(scene, camera);
          result[shot.name] = renderer.domElement.toDataURL('image/jpeg', quality);
        }
      } catch (err) {
        console.warn('Blueprint capture failed:', err);
        return null;
      } finally {
        renderer.setPixelRatio(prevPixelRatio);
        renderer.setSize(prevSize.x, prevSize.y, false);
        cakeGroup.rotation.copy(prevRotation);
        coveringMaterialsRef.current.forEach((mat, i) => { mat.clippingPlanes = prevClipStates[i]; });
        if (slotsGroupRef.current) slotsGroupRef.current.visible = prevSlotsVisible;
        if (ghostGroupRef.current) ghostGroupRef.current.visible = prevGhostVisible;
      }

      return result;
    },

    // 8-Angle Template Camera Screenshot Engine
    // Captures exactly 8 high-definition multi-angle views around the cake
    // for use in template catalogs, slideshows, and details modals.
    captureTemplateViews: ({ quality = 0.92, width = 800, height = 800 } = {}) => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const cakeGroup = cakeGroupRef.current;
      if (!renderer || !scene || !cakeGroup) return [];

      const deg = THREE.MathUtils.degToRad;
      const tiers = Math.max(1, Number(cakeConfigRef.current?.layers) || 1);
      const eyeTilt = deg(tiers <= 1 ? 16 : tiers === 2 ? 11 : 8);
      const isoTilt = deg(tiers <= 1 ? 26 : tiers === 2 ? 20 : 15);

      const shots = [
        { label: 'Front View', angle: '0°', azimuth: deg(0), tilt: eyeTilt },
        { label: 'Front-Right Angle', angle: '45°', azimuth: deg(45), tilt: isoTilt },
        { label: 'Right Side View', angle: '90°', azimuth: deg(90), tilt: eyeTilt },
        { label: 'Back-Right Angle', angle: '135°', azimuth: deg(135), tilt: isoTilt },
        { label: 'Back View', angle: '180°', azimuth: deg(180), tilt: eyeTilt },
        { label: 'Back-Left Angle', angle: '225°', azimuth: deg(225), tilt: isoTilt },
        { label: 'Left Side View', angle: '270°', azimuth: deg(270), tilt: eyeTilt },
        { label: 'Top-Down View', angle: 'Top', azimuth: deg(0), tilt: Math.PI / 2 },
      ];

      const prevSlotsVisible = slotsGroupRef.current ? slotsGroupRef.current.visible : true;
      const prevGhostVisible = ghostGroupRef.current ? ghostGroupRef.current.visible : true;
      const prevGroundVisible = groundRef.current ? groundRef.current.visible : true;
      const prevBackground = scene.background;
      const prevShadowMap = renderer.shadowMap.enabled;
      const prevClipStates = coveringMaterialsRef.current.map((mat) => mat.clippingPlanes);
      const prevRotation = cakeGroup.rotation.clone();
      const prevSize = renderer.getSize(new THREE.Vector2());
      const prevPixelRatio = renderer.getPixelRatio();
      const views = [];

      try {
        coveringMaterialsRef.current.forEach((mat) => { mat.clippingPlanes = []; });
        if (slotsGroupRef.current) slotsGroupRef.current.visible = false;
        if (ghostGroupRef.current) ghostGroupRef.current.visible = false;
        if (groundRef.current) groundRef.current.visible = false;
        renderer.shadowMap.enabled = false;
        cakeGroup.rotation.set(0, 0, 0);
        cakeGroup.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(cakeGroup);
        if (box.isEmpty()) return [];
        const center = box.getCenter(new THREE.Vector3());
        const dims = box.getSize(new THREE.Vector3());
        const ringRadius = Math.max(dims.x, dims.z) / 2;
        const minRadius = Math.max(dims.x, dims.y, dims.z) / 2;

        const points = [];
        for (let i = 0; i < 32; i++) {
          const a = (i / 32) * Math.PI * 2;
          for (const y of [box.min.y, box.max.y]) {
            points.push(new THREE.Vector3(center.x + Math.cos(a) * ringRadius, y, center.z + Math.sin(a) * ringRadius));
          }
        }

        const FIT = 0.90;
        const fov = 32;
        const projected = new THREE.Vector3();
        const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 300);

        renderer.setPixelRatio(1);

        for (const shot of shots) {
          camera.aspect = width / height;
          camera.up.set(0, shot.tilt >= Math.PI / 2 ? 0 : 1, shot.tilt >= Math.PI / 2 ? -1 : 0);
          const horizontalFactor = Math.cos(shot.tilt);
          const dir = new THREE.Vector3(
            Math.sin(shot.azimuth) * horizontalFactor,
            Math.sin(shot.tilt),
            Math.cos(shot.azimuth) * horizontalFactor
          );

          const place = (d) => {
            camera.position.copy(center).addScaledVector(dir, d);
            camera.lookAt(center);
            camera.updateProjectionMatrix();
            camera.updateMatrixWorld(true);
          };
          const fits = (d) => {
            place(d);
            return points.every((p) => {
              projected.copy(p).project(camera);
              return Math.abs(projected.x) <= FIT && Math.abs(projected.y) <= FIT && projected.z < 1;
            });
          };

          let lo = minRadius;
          let hi = minRadius * 40;
          for (let i = 0; i < 28; i++) {
            const mid = (lo + hi) / 2;
            if (fits(mid)) hi = mid; else lo = mid;
          }
          place(hi);

          renderer.setSize(width, height, false);

          // 1. Render clean display view (matching exact display shown in Image 3)
          renderer.render(scene, camera);
          const displayUrl = renderer.domElement.toDataURL('image/png');

          // 2. Render clean transparent cutout directly from WebGL (zero flood-fill)
          scene.background = null;
          renderer.render(scene, camera);
          const transparentUrl = renderer.domElement.toDataURL('image/png');
          scene.background = prevBackground;

          views.push({
            label: shot.label,
            angle: shot.angle,
            url: displayUrl,
            rawUrl: displayUrl,
            transparentUrl: transparentUrl,
            cutoutUrl: transparentUrl,
          });
        }
      } catch (err) {
        console.warn('Template 8-angle capture failed:', err);
        return [];
      } finally {
        scene.background = prevBackground;
        renderer.setPixelRatio(prevPixelRatio);
        renderer.setSize(prevSize.x, prevSize.y, false);
        cakeGroup.rotation.copy(prevRotation);
        coveringMaterialsRef.current.forEach((mat, i) => { mat.clippingPlanes = prevClipStates[i]; });
        if (slotsGroupRef.current) slotsGroupRef.current.visible = prevSlotsVisible;
        if (ghostGroupRef.current) ghostGroupRef.current.visible = prevGhostVisible;
        if (groundRef.current) groundRef.current.visible = prevGroundVisible;
        renderer.shadowMap.enabled = prevShadowMap;
      }

      return views;
    }
  }));

  useEffect(() => {
    activeToolRef.current = activeTool;
    updateSlotVisuals();
    refreshGhostRef.current?.();
    refreshSelectionOverlayRef.current?.();
  }, [activeTool, updateSlotVisuals]);
  useEffect(() => { onPlaceRef.current = onPlace; }, [onPlace]);
  useEffect(() => { onSelectToolRef.current = onSelectTool; }, [onSelectTool]);
  useEffect(() => { onPlacementBlockedRef.current = onPlacementBlocked; }, [onPlacementBlocked]);
  useEffect(() => { onCenterItemSelectRef.current = onCenterItemSelect; }, [onCenterItemSelect]);
  useEffect(() => { onDeleteCenterItemRef.current = onDeleteCenterItem; }, [onDeleteCenterItem]);
  useEffect(() => { onPlacedItemsChangeRef.current = onPlacedItemsChange; }, [onPlacedItemsChange]);
  useEffect(() => {
    selectedCenterItemIdRef.current = selectedCenterItemId;
    refreshSelectionOverlayRef.current?.();
  }, [selectedCenterItemId]);
  useEffect(() => {
    disabledRef.current = disabled;
    if (disabled) {
      if (ghostGroupRef.current) clearGhostGroup(ghostGroupRef.current);
      if (selectionOverlayGroupRef.current) {
        while (selectionOverlayGroupRef.current.children.length > 0) {
          const child = selectionOverlayGroupRef.current.children[0];
          disposeSceneObject(child);
          selectionOverlayGroupRef.current.remove(child);
        }
      }
      if (hoveredSlotRef.current) {
        hoveredSlotRef.current = null;
        updateSlotVisuals();
      }
    }
    if (controlsRef.current) {
      controlsRef.current.enabled = !disabled;
    }
  }, [disabled, updateSlotVisuals]);

  useEffect(() => {
    readOnlyRef.current = readOnly;
    if (readOnly) {
      if (ghostGroupRef.current) clearGhostGroup(ghostGroupRef.current);
      if (selectionOverlayGroupRef.current) {
        while (selectionOverlayGroupRef.current.children.length > 0) {
          const child = selectionOverlayGroupRef.current.children[0];
          disposeSceneObject(child);
          selectionOverlayGroupRef.current.remove(child);
        }
      }
      if (hoveredSlotRef.current) {
        hoveredSlotRef.current = null;
        updateSlotVisuals();
      }
      if (rendererRef.current?.domElement) {
        rendererRef.current.domElement.style.cursor = '';
      }
    }
  }, [readOnly, updateSlotVisuals]);

  // Trigger a scene rebuild when fonts finish loading asynchronously
  useEffect(() => {
    if (fontsReady) return;
    onFontsReady(() => setFontsReady(true));
  }, [fontsReady]);
  useEffect(() => {
    cakeConfigRef.current = cakeConfig;
    if (cakeConfig?.interiorPreview) {
      if (ghostGroupRef.current) clearGhostGroup(ghostGroupRef.current);
      if (slotsGroupRef.current) {
        while (slotsGroupRef.current.children.length > 0) {
          const child = slotsGroupRef.current.children[0];
          disposeSceneObject(child);
          slotsGroupRef.current.remove(child);
        }
      }
      if (selectionOverlayGroupRef.current) {
        while (selectionOverlayGroupRef.current.children.length > 0) {
          const child = selectionOverlayGroupRef.current.children[0];
          disposeSceneObject(child);
          selectionOverlayGroupRef.current.remove(child);
        }
      }
      hoveredSlotRef.current = null;
      lastValidGhostDropRef.current = null;
      if (rendererRef.current?.domElement) {
        rendererRef.current.domElement.style.cursor = '';
      }
    } else {
      updateSlotVisuals();
      refreshGhostRef.current?.();
      refreshSelectionOverlayRef.current?.();
    }
  }, [cakeConfig, updateSlotVisuals]);

  const buildCake = useCallback(() => {
    if (!sceneRef.current || !cakeGroupRef.current) return;

    const group = cakeGroupRef.current;
    while (group.children.length > 0) {
      const child = group.children[0];
      disposeSceneObject(child);
      group.remove(child);
    }
    // Tracks every material that visually covers the sponge/filling (currently
    // just the frosting shell) so Interior Preview's cutaway can clip them, and
    // so thumbnail capture can temporarily un-clip them regardless of the
    // current preview state.
    coveringMaterialsRef.current = [];

    const {
      layers, frostingColor, toppings = [], cakeColor, plateVisible, placedItems = [],
      designMode, layerColors, layerFrostings, fillingColor, layerFillings, cakeSize = 'big',
      fillingEnabled = false, fillingLayers = 1, interiorPreview = false, exteriorFinishStyle = 'fullyFrosted',
      // Only meaningful when exteriorFinishStyle === 'texturedButtercream'
      // — picks which of the three ripple geometries below gets built.
      buttercreamTexture = 'ridged',
      fillingPipingTip = null, fillingPipingColor = '#F6DEAB', fillingPipingColorId = null,
      layerFillingSugarColors = [], layerFillingSugarColorIds = [],
      // New Surface/Center/Edge/Side/Place fields — all pre-resolved to real
      // hex colors by configAdapter.js. NONE of these have corresponding
      // geometry in CakeScene yet (see CAKE_SETS_REWORK_SPEC.md §12 step 7);
      // destructured here so the contract is explicit and ready to wire up
      // without touching this line again.
      surfaceFrostingColorHex = null,
      surfaceFrostingColorId = null,
      layerSurfaceFrostingColors = [],
      layerSurfaceFrostingColorIds = [],
      centerDecorationColor = '#F6DEAB', centerDecorationColorId = null,
      centerTextColor = '#F6DEAB', centerTextColorId = null, centerTextColorMode = 'uniform',
      // Surface Treatment is Glaze-only now (Textured Buttercream moved to
      // exteriorFinishStyle — see the frostGeo branch below, and
      // cakeConfig.js's comment on exteriorFinish for why). Glaze is built
      // below, after topY/topRadius are known, via buildGlazeGeometry.
      surfaceTreatmentMode = null,
      surfaceTreatmentColorHex = '#F6DEAB',
      surfaceTreatmentPattern = 'longGaps', // one of GLAZE_PATTERNS ids, see GLAZE_PATTERN_CARVES above
      layerSurfaceTreatmentModes = [],
      layerSurfaceTreatmentColors = [],
      layerSurfaceTreatmentPatterns = [],
      sideCheckeredPatternSetId = null,
      sideTrianglePatternSetId = null,
      sideChevronPatternSetId = 'multiColor',
      sideScatterPearlsSetId = 'randomScatter',
      sidePipingScrollsSetId = 'waveRope',
      sideSunshinePlaySetId = 'rainbowArc',
      sideVictorianLambethSetId = 'classic',
      sideNoNameSetId = null,
      centerText = '', centerTextTop = '', centerTextMiddle = '', centerTextBottom = '', centerTextSpacing = 0.28, centerTextFont = 'default',
      edgeMode = 'both', edgeTop = null, edgeBottom = null, edgeBoth = null,
      edgeMiddle = null,
      sideDecorationColor = '#F6DEAB', sideDecorationColorId = null,
      sideCheckeredColor = '#F6DEAB', sideCheckeredColorId = null,
      sideTriangleColor = '#F6DEAB', sideTriangleColorId = null,
      sideChevronColor = '#F6DEAB', sideChevronColorId = null,
      sideChevronSecondaryColor = '#D6293E', sideChevronSecondaryColorId = 'red',
      sideNoNameColor = '#F6DEAB',
      sideDecorationSetId = null, sideDecorationVariant = 0,
      layerSideTreatments = [],
    } = cakeConfig;
    const isIndividual = designMode === 'individual' && layers > 1;
    const sharedSideTreatment = {
      sideDecorationSetId,
      sideDecorationColor,
      sideDecorationColorId,
      sideCheckeredPatternSetId,
      sideCheckeredColor,
      sideCheckeredColorId,
      sideTrianglePatternSetId,
      sideTriangleColor,
      sideTriangleColorId,
      sideChevronPatternSetId,
      sideChevronColor,
      sideChevronColorId,
      sideChevronSecondaryColor,
      sideChevronSecondaryColorId,
      sideScatterPearlsSetId,
      sidePipingScrollsSetId,
      sideSunshinePlaySetId,
      sideVictorianLambethSetId,
      sideNoNameSetId,
      sideNoNameColor,
    };

    // Seed the PRNG from stable config properties so the random visual details
    // (candle colors, drip heights, sprinkle positions) are consistent across
    // re-renders triggered by unrelated changes like frosting color or tool selection.
    const seed = hashStr(
      [layers, cakeSize, cakeColor, frostingColor, ...(toppings || [])].join('|')
    );
    const rand = makePRNG(seed);

    // Use visual scale system for render dimensions
    const renderDims = getRenderDimensions(cakeSize);
    const BASE_RADIUS = renderDims.diameter / 2;  // Half of diameter
    const RADIUS_STEP = 0.5;   // 1" per tier in radius = 0.5 display units
    const PLATE_RADIUS = BASE_RADIUS + 1.2;
    const PLATE_RIM = BASE_RADIUS + 1.4;

    // Layer geometry dimensions based on render height
    const LAYER_H = renderDims.height;  // Base tier height for the selected size
    const FROST_H = 0.25;  // ~0.5" frosting band
    const FILLING_H = LAYER_H * 0.06; // Filling height

    // Builds a (localY, angle) -> radial bulge function that reproduces a
    // Mashed Circles/Mashed Swirls filling band's exact per-bump
    // displacement (see buildMashedCircleFillingGeometry in
    // spongeGeometry.js) at a given point on some OTHER mesh's own
    // surface — so that mesh can hug the filling's bumps/valleys instead
    // of sitting at a plain fixed radius and either floating off a valley
    // or getting poked through by a peak. Originally inline only inside
    // the Surface Treatment > Glaze block below (Glaze is a continuous
    // shell, sampled per-vertex); pulled out here so any side treatment —
    // starting with Checkered Pattern — can reuse the exact same
    // displacement math against its own discrete geometry instead of a
    // second, drifting reimplementation.
    //
    // `originY` is the world Y that corresponds to y=0 in the CALLING
    // mesh's own local frame (e.g. a frosting shell's mesh.position.y, or
    // a per-tier decoration group's own equivalent) — every band's world
    // Y gets re-based against that same origin so `localY` (whatever the
    // caller's own per-vertex/per-cell local Y already is) lines up with
    // it directly, no matter whether that caller's local Y is bottom-
    // anchored (Glaze) or center-anchored (Checkered Pattern's own
    // per-cell Y).
    // `meshBaseRadius` mirrors buildMashedCircleFillingGeometry's own
    // `radius` parameter, since peakBulge/valleyRecess are computed as a
    // fraction of it — pass the calling mesh's own base radius (before
    // any bulge) so the peaks/valleys scale correctly against IT specifically,
    // not always the frosting shell's.
    if (plateVisible !== false) {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(PLATE_RADIUS, PLATE_RIM, 0.15, 64),
        new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.1, metalness: 0.05, clearcoat: 0.8 })
      );
      plate.position.y = -0.15;  // just below ground level
      plate.castShadow = true;
      plate.receiveShadow = true;
      group.add(plate);
    }

    let currentY = 0;
    let lastRadius = BASE_RADIUS;
    // Tracks the topmost tier's own wall height (distinct from lastRadius's
    // "last iteration's radius"). Same "carry the last iteration's value
    // out" reasoning as lastFrostColor below — used as the Naked-cake
    // fallback height for Glaze (see lastFrostTotalHeight/lastFrostDomeH
    // just below, which take over whenever a real frosting shell exists).
    let lastHeight = renderDims.height;
    const layerCount = Math.max(1, Math.min(2, layers));

    let topLayerBaseY = 0;
    let topLayerDomeHeight = 0;
    let ledgeY = 0;
    let layer1OuterRadius = BASE_RADIUS;
    // frostColor itself is block-scoped inside the per-layer loop below
    // (recomputed each iteration since flavor/override can vary per layer
    // in Individual mode) — this carries the LAST iteration's value out
    // for the Drip ring, which renders after the loop ends and needs
    // whatever the topmost layer's Sugar-Color-driven color was.
    let lastFrostColor = null;
    // Same "carry the last iteration's value out" reasoning as
    // lastFrostColor, for Glaze (built after this loop ends — see the
    // Surface Treatment > Glaze block below). Glaze is a "secondary copy"
    // of the top tier's own Frosting shell (buildGlazeGeometry mirrors
    // buildOrganicFrostingGeometry's top exactly), so it needs that
    // shell's real height/dome/Y-position, not fixed constants. Defaulted
    // here to a Naked-cake fallback (wrap the sponge directly, no cap
    // padding) and overwritten inside the Frosting Shell block below
    // whenever a real frosting shell is actually built for that tier.
    let lastHasFrosting = false;
    let lastFrostTotalHeight = lastHeight;
    let lastFrostDomeH = lastHeight * 0.05;
    let lastFrostMeshY = 0;
    // Full descriptor (Y position, exact per-bump jitter, bumpCount, and
    // amplitude parameters) of every Mashed Circles/Mashed Swirls filling
    // piping band, captured for Glaze's hugging profile below — needs the
    // jitter object itself, not just Y, so the hugging can reproduce the
    // real mesh's exact per-bump shape at each angle rather than an
    // angle-uniform approximation. Reset per tier (same pattern as
    // lastHasFrosting etc.), so by the time the loop ends this holds only
    // the TOP tier's bands — there can be more than one if Filling Layers
    // > 1.
    let lastFillingBands = [];
    // Same "carry the last iteration's value out" pattern as lastRadius/
    // lastFrostColor above — Center Tab (computeSlotPosition) and Edge
    // Tab (edgeSlotsToRender) both place/build after this loop ends, and
    // per the layer-ordering direction below (Filling < Glaze < Side <
    // Center < Edge), they need to clear whatever the topmost tier's own
    // Glaze protrusion is, the same way sideDecorStandoff/
    // sideDecorationRadius already do inside the loop. Declared here so
    // it exists even when the loop's own `glazeMaxProtrusion` (used
    // in-loop by Side) never runs a 'glaze' iteration at all.
    let lastGlazeMaxProtrusion = 0;
    // Same reasoning as lastGlazeMaxProtrusion just above — Glaze is
    // built once, after the loop, from the topmost tier's own values.
    // activeSideCoverageFn (checkerCoverageFn etc.'s own returned
    // wrapper) expects its Y argument as "absoluteY", which it converts
    // internally via absoluteY - (currentY + height/2) — see
    // checkerOriginY's own definition below. buildGlazeGeometry's
    // internal `y` is tier-base-relative (0 at the tier's own base,
    // matching how the built mesh is positioned at currentY afterward —
    // see glaze.position.y = descriptor.currentY further below), so the
    // correct absoluteY to pass is `currentY + y`, NOT `y - height/2` —
    // that would double up the wrapper's own centering and silently
    // shift every sampled row down by half the tier's height.
    let lastActiveSideCoverageFn = null;
    let lastCurrentY = 0;
    const layerGlazeDescriptors = [];

    for (let i = 0; i < layerCount; i++) {
      const tierSide = isIndividual ? layerSideTreatments[i] : null;
      const sideDecorationSetId = tierSide ? tierSide.sideDecorationSetId : sharedSideTreatment.sideDecorationSetId;
      const sideDecorationColor = tierSide ? tierSide.sideDecorationColor : sharedSideTreatment.sideDecorationColor;
      const sideDecorationColorId = tierSide ? tierSide.sideDecorationColorId : sharedSideTreatment.sideDecorationColorId;
      const sideCheckeredPatternSetId = tierSide ? tierSide.sideCheckeredPatternSetId : sharedSideTreatment.sideCheckeredPatternSetId;
      const sideCheckeredColor = tierSide ? tierSide.sideCheckeredColor : sharedSideTreatment.sideCheckeredColor;
      const sideCheckeredColorId = tierSide ? tierSide.sideCheckeredColorId : sharedSideTreatment.sideCheckeredColorId;
      const sideTrianglePatternSetId = tierSide ? tierSide.sideTrianglePatternSetId : sharedSideTreatment.sideTrianglePatternSetId;
      const sideTriangleColor = tierSide ? tierSide.sideTriangleColor : sharedSideTreatment.sideTriangleColor;
      const sideTriangleColorId = tierSide ? tierSide.sideTriangleColorId : sharedSideTreatment.sideTriangleColorId;
      const sideChevronPatternSetId = tierSide ? tierSide.sideChevronPatternSetId : sharedSideTreatment.sideChevronPatternSetId;
      const sideChevronColor = tierSide ? tierSide.sideChevronColor : sharedSideTreatment.sideChevronColor;
      const sideChevronColorId = tierSide ? tierSide.sideChevronColorId : sharedSideTreatment.sideChevronColorId;
      const sideScatterPearlsSetId = tierSide ? tierSide.sideScatterPearlsSetId : sharedSideTreatment.sideScatterPearlsSetId;
      const sidePipingScrollsSetId = tierSide ? tierSide.sidePipingScrollsSetId : sharedSideTreatment.sidePipingScrollsSetId;
      const sideSunshinePlaySetId = tierSide ? tierSide.sideSunshinePlaySetId : sharedSideTreatment.sideSunshinePlaySetId;
      const sideVictorianLambethSetId = tierSide ? tierSide.sideVictorianLambethSetId : sharedSideTreatment.sideVictorianLambethSetId;
      const sideNoNameSetId = tierSide ? tierSide.sideNoNameSetId : sharedSideTreatment.sideNoNameSetId;
      const sideNoNameColor = tierSide ? tierSide.sideNoNameColor : sharedSideTreatment.sideNoNameColor;

      // Layer 1: base dimensions, Layer 2: smaller dimensions
      let radius, height;
      if (i === 0) {
        // Bottom layer
        radius = BASE_RADIUS;
        height = renderDims.height;  // Selected size's base-tier height
      } else {
        // Top layer (second layer) -- real per-size dimensions from
        // cakeConstants.js: big's second tier is 6x4, small's is 4x3.
        const tierDims = getRenderDimensions(cakeSize, i);
        radius = tierDims.diameter / 2;
        height = tierDims.height;
      }
      lastRadius = radius;
      lastHeight = height;

      const cakeKey = isIndividual ? (layerColors?.[i] || cakeColor) : cakeColor;
      const frostKey = isIndividual ? (layerFrostings?.[i] || frostingColor) : frostingColor;
      const fillingKey = isIndividual ? (layerFillings?.[i] || fillingColor) : fillingColor;
      const frostColorBase = frostKey ? FROSTING_COLORS[frostKey] : null;
      // Pick Color replaces the flavor's natural frosting color. When
      // it is not selected, the frosting keeps using the flavor color.
      const frostColor = layerSurfaceFrostingColors[i] || surfaceFrostingColorHex || frostColorBase;
      const frostColorId = layerSurfaceFrostingColorIds?.[i] || surfaceFrostingColorId || null;
      console.log('Layer frost color:', frostColor, 'Color ID:', frostColorId);
      lastFrostColor = frostColor;
      const fillColor = fillingKey ? FILLING_COLORS[fillingKey] : null;

      const tierHasFrost = Boolean(frostColor && exteriorFinishStyle !== 'naked');
      const tierHasGlaze = isIndividual
        ? (layerSurfaceTreatmentModes?.[i] === 'glaze')
        : (surfaceTreatmentMode === 'glaze');
      const tierHasSideDrip = isIndividual
        ? (sideNoNameSetId === 'drip')
        : (sharedSideTreatment.sideNoNameSetId === 'drip');
      const tierHasDrip = tierHasGlaze || tierHasSideDrip;
      const tierHasSideDecor = isIndividual
        ? Boolean(
            (sideNoNameSetId && sideNoNameSetId !== 'drip') ||
            sideCheckeredPatternSetId ||
            sideTrianglePatternSetId ||
            sideDecorationSetId
          )
        : Boolean(
            (sharedSideTreatment.sideNoNameSetId && sharedSideTreatment.sideNoNameSetId !== 'drip') ||
            sharedSideTreatment.sideCheckeredPatternSetId ||
            sharedSideTreatment.sideTrianglePatternSetId ||
            sharedSideTreatment.sideDecorationSetId
          );

      const tierClipConfig = getInteriorPreviewClippingConfig({
        hasFrosting: tierHasFrost,
        hasDrip: tierHasDrip,
        hasSide: tierHasSideDecor,
        interiorPreview,
      });

      // Build layer with separate sections: Sponge Body + Filling Layers + Frosting Shell

      // Calculate sponge height (subtract filling space if enabled)
      const totalFillingHeight = fillingEnabled ? (FILLING_H * fillingLayers) : 0;
      const spongeHeight = height - totalFillingHeight;

      // Sponge Body (main interior cake body) - use procedural texture system
      const spongeMat = cakeKey ? getSpongeMaterial(cakeKey) : null;

      if (isIndividual && sideNoNameSetId === 'drip') {
        const tierTopY = currentY + height + (frostColor && exteriorFinishStyle !== 'naked' ? FROST_H : 0) + 0.05;
        const dripRing = buildDripRing(radius, sideNoNameColor, rand);
        dripRing.position.y = tierTopY;
        dripRing.material.clippingPlanes = tierClipConfig.drip.planes;
        dripRing.material.clipIntersection = tierClipConfig.drip.clipIntersection;
        dripRing.material.clipShadows = true;
        coveringMaterialsRef.current.push(dripRing.material);
        group.add(dripRing);
      }

      // Build sponge sections separated by filling layers
      let spongeCurrentY = currentY;
      const spongeSectionHeight = spongeHeight / (fillingEnabled ? fillingLayers + 1 : 1);

      // The pointy-top dome amount is derived from the FULL tier height (not the
      // per-section height above), so it stays constant no matter how many
      // Filling Layers (1-3) the section height ends up getting divided into.
      const domeAmount = height * 0.05;

      // Naked-cake fallback for Glaze (see lastFrostTotalHeight/lastFrostDomeH/
      // lastFrostMeshY's declaration above) — overwritten below by the
      // Frosting Shell block whenever this tier actually gets frosted.
      lastHasFrosting = false;
      lastFrostTotalHeight = height;
      lastFrostDomeH = domeAmount;
      lastFrostMeshY = currentY;
      lastFillingBands = [];

      // Checkered/Triangle Pattern's standoff above the tier radius has to
      // clear whichever Exterior Finish shell they're sitting on. A flat
      // 0.08 clearance is enough for a smooth Fully Frosted shell, but
      // Textured Buttercream's ridges are real bulging geometry (not a
      // texture map) — a flat 0.08 doesn't reliably clear a ridge peak, so
      // the ridge pokes through the flat square/triangle face as a visible
      // wavy cut line across it.
      //
      // The ridge clearance numbers below (0.1/0.08/0.115) are the same
      // worst-case ridge+wobble amplitude figures Glaze's own
      // coatThickness uses per texture (see the Surface Treatment > Glaze
      // block further below) — but Glaze adds coatThickness on top of
      // radius + 0.06 (the frosting shell's own base radius: its call
      // site passes `lastRadius + (lastHasFrosting ? 0.06 : 0)` in, since
      // the ridge geometry itself is carved starting from that base, not
      // from the bare tier radius — see buildTexturedButtercreamGeometry's
      // call site further below). Adding those same numbers straight onto
      // the bare `radius` under-clears by exactly that missing 0.06, which
      // is why the ridge still poked through even with this "fix" in
      // place — the +0.06 below is what actually closes that gap.
      //
      // Glaze is now an INNER layer relative to Side/Center/Edge Tab
      // (per latest direction: Filling < Glaze < Side < Center < Edge) —
      // so it's Side Tab's job to clear Glaze, not the other way around
      // (see the Surface Treatment > Glaze block further below, which
      // used to do the reverse and has had that logic removed).
      //
      // Glaze only ever wraps the TOPMOST tier (it's built once, after
      // this whole per-tier loop, from that final iteration's "last*"
      // values) — so this only matters on `i === layerCount - 1`.
      //
      // A flat conservative worst-case, same reasoning as every other
      // Side-decoration protrusion estimate in this file (not exact
      // hugging — Glaze's own radius varies by carve pattern/ridge-hug/
      // filling-hug in ways not worth reproducing a third time here):
      // 0.18 covers Textured Buttercream's own worst per-texture
      // coatThickness (Vertical Piping's (0.095+0.02)*1.5 ≈ 0.17, the
      // largest of the three — see the Surface Treatment > Glaze block's
      // own coatThickness branches). `0.08 + radius*0.1` covers the
      // Naked + active Mashed Swirls filling-hug case instead, whose
      // bulge amplitude scales with the tier's own radius rather than
      // being a fixed number — mirrors buildMashedSwirlFillingGeometry's
      // own peakBulge formula (radius*0.95*0.1, rounded up here since
      // this only needs to be a safe ceiling, not exact).
      const tierSurfaceTreatmentMode = isIndividual
        ? (layerSurfaceTreatmentModes[i] || null)
        : surfaceTreatmentMode;
      const glazeMaxProtrusion = (tierSurfaceTreatmentMode === 'glaze')
        ? 0.04
        : 0;
      lastGlazeMaxProtrusion = glazeMaxProtrusion;
      lastCurrentY = currentY;

      // Hoisted up here (out of its original spot right before the
      // Checkered Pattern block) so Filling can shave its own Piping
      // Design bumps to match an active Checkered Pattern (Full Pattern
      // only) or Triangle Pattern's actual shape footprint (see
      // checkerCoverageFn/triangleCoverageFn just below), instead of the
      // shapes having to bend to follow bumps that were never flattened.
      const sideDecorStandoff = (() => {
        // Naked used to just return 0 unconditionally here — correct
        // when Glaze isn't in the picture, but Glaze can still be active
        // on a Naked cake (this screenshot's own scenario), so that
        // early return would have silently skipped glazeMaxProtrusion
        // entirely. Naked's own base standoff is still 0; only the Glaze
        // term gets added on top of it now.
        const base = (() => {
          if (!(frostColor && exteriorFinishStyle !== 'naked')) return 0; // naked — sits right at the sponge radius, unchanged
          if (exteriorFinishStyle === 'texturedButtercream') {
            const frostBase = 0.06; // matches Glaze's own call-site offset
            if (buttercreamTexture === 'ribbonWrap') return frostBase + 0.08;
            if (buttercreamTexture === 'verticalPiping') return frostBase + 0.115;
            return frostBase + 0.1; // 'ridged' (Ridge Comb), also the default
          }
          return 0.08; // smooth Fully Frosted shell, unchanged — its own base IS radius + 0.06, no ridge on top of it to clear
        })();
        return base + glazeMaxProtrusion;
      })();

      // Glaze windows (glaze* coverage functions + Chevron's) apply on a
      // Naked cake AND a Fully Frosted one. Filling-only coverage (the
      // checkerCoverageFn/triangleCoverageFn/... chain) stays Naked-only —
      // Filling piping doesn't exist under frosting (see configAdapter's
      // regionsHidden). Textured Buttercream is deliberately excluded: it
      // has its own ridge geometry/clearances.
      const glazeWindowStyleOk = exteriorFinishStyle === 'naked' || exteriorFinishStyle === 'fullyFrosted';
      // The wall radius the Side decorations actually sit at: mirrors
      // sideDecorationRadius (declared further down, so it can't be read
      // from here) — frosted tiers add the 0.06 shell, naked ones recess
      // 0.02, both plus Glaze's own clearance. Checkered/Triangle already
      // use `radius + sideDecorStandoff`, which is frosting-aware itself.
      const glazeDecoRadius = ((frostColor && exteriorFinishStyle !== 'naked') ? radius + 0.06 : radius - 0.02) + glazeMaxProtrusion;

      // (angle, localY) -> 0..1 coverage weight for Filling's own Piping
      // Design to shave its bumps against, when this tier's Checkered
      // Pattern is set to Full Pattern specifically (see
      // activeSideCoverageFn below). Only Full Pattern — the other five
      // Checkered variants (diagonals/parallel lines) leave real gaps
      // between squares by design, so a filling bump showing through
      // those gaps is the same "gaps show what's underneath" look the
      // checkerboard has always had, not something to correct for. Only
      // actually built when relevant (Full Pattern selected AND Naked,
      // since sideDecorStandoff is otherwise nonzero and this feature
      // only applies to a Naked cake's exposed filling edge) — cheap to
      // always compute otherwise, but no reason to.
      //
      // getCheckerCoverageFn works in Checkered's own angle convention
      // (x = sin(angle)*r, z = cos(angle)*r — see buildCheckerSideSquares)
      // and its own center-anchored local Y (checkerSide's own position.y
      // further below). buildMashedCircleFillingGeometry uses the OPPOSITE
      // convention for its own `angle` (x = cos(angle)*r, z = sin(angle)*r
      // — see spongeGeometry.js), which is a reflection, not just an
      // offset: for the same physical point, checkerAngle = π/2 -
      // fillingAngle. This adapter converts both that and the Y origin
      // (checkerSide's local y=0 sits at currentY + height/2 in this same
      // "world" numbering fillingY already uses) so Filling can call this
      // with ITS OWN native angle/Y and get the right answer, with the
      // reflection and origin shift handled once, here.
      const checkerCoverageFn = (() => {
        if (exteriorFinishStyle !== 'naked') return null;
        if (sideCheckeredPatternSetId !== 'wholeCake') return null;
        const effectiveRadius = radius + sideDecorStandoff; // === radius here (Naked)
        const rawCoverageFn = getCheckerCoverageFn(effectiveRadius, height, { pattern: 'full' });
        const checkerOriginY = currentY + height / 2;
        return (fillingAngle, absoluteY) => {
          const checkerAngle = Math.PI / 2 - fillingAngle;
          const checkerLocalY = absoluteY - checkerOriginY;
          return rawCoverageFn(checkerAngle, checkerLocalY);
        };
      })();

      // Glaze's own Checkered coverage — covers ALL SIX variants (Full
      // Pattern, Left Diagonal, X Pattern, Right Diagonal, Parallel Lines
      // Outer/Inner), unlike checkerCoverageFn above, which is
      // deliberately wholeCake-only because it exists for FILLING: only
      // Full Pattern shaves Filling's Mashed Circles/Swirls bumps to its
      // own footprint; the other five leave Filling untouched so their
      // gaps show it (see the comment on the Checkered mesh build
      // further below). Glaze has no such exception — a Checkered square
      // should stay visible on top of it whichever variant placed it —
      // so it gets its own function instead of loosening Filling's.
      //
      // pattern/gapDashPeriod are mapped EXACTLY as the mesh build
      // below maps them (patternForId, and gapDashPeriod: xPattern ? 2
      // : 1 — computeCheckerLayout defaults gapDashPeriod to 2, so
      // omitting it here would keep dashed gap cells the mesh doesn't
      // render on Left/Right Diagonal), and effectiveRadius is the same
      // radius + sideDecorStandoff the mesh uses, since radius drives
      // the column count — any difference would misalign the two grids
      // progressively around the circumference. Same adapter (angle
      // reflection + origin shift) as checkerCoverageFn, so everything
      // downstream (the Glaze call sites' own counter-reflection and
      // currentY + y) applies unchanged.
      const glazeCheckerCoverageFn = (() => {
        if (!glazeWindowStyleOk) return null;
        const glazePatternForId = {
          wholeCake: 'full',
          sidesOnly: 'leftDiagonal',
          xPattern: 'leftDiagonal',
          rightDiagonal: 'rightDiagonal',
          parallelOuter: 'parallelOuter',
          parallelInner: 'parallelInner',
        }[sideCheckeredPatternSetId];
        if (!glazePatternForId) return null;
        const effectiveRadius = radius + sideDecorStandoff;
        const rawCoverageFn = getCheckerCoverageFn(effectiveRadius, height, {
          pattern: glazePatternForId,
          gapDashPeriod: sideCheckeredPatternSetId === 'xPattern' ? 2 : 1,
        });
        const checkerOriginY = currentY + height / 2;
        // NOTE: deliberately NO Math.PI/2 reflection here (unlike
        // checkerCoverageFn above, which serves Filling). Glaze's two
        // call sites already pass (Math.PI/2 - glazeAngle) into this
        // function, and the checker mesh places cells at x = sin(c),
        // z = cos(c) while Glaze's lathe uses x = cos(a), z = sin(a), so
        // the correct checker angle is c = PI/2 - a — i.e. exactly
        // what arrives here. Reflecting again (the old code) cancelled it
        // back to c = a, mirroring the windows. On Full Pattern / Parallel
        // Lines a mirrored checkerboard still looks like a checkerboard,
        // so it read as roughly right; on Left Diagonal / X Pattern /
        // Right Diagonal the windows visibly landed on the wrong cells
        // (verified numerically: 0 of N squares covered before, N of N after).
        return (glazeArg, absoluteY) => {
          const checkerLocalY = absoluteY - checkerOriginY;
          return rawCoverageFn(glazeArg, checkerLocalY);
        };
      })();

      // Same idea as checkerCoverageFn immediately above — Triangle
      // Pattern uses the exact same placement convention as Checkered
      // (buildTriangleSideShapes's own `Math.sin(angle)*standoffRadius`),
      // so this adapter is identical, just built from
      // getTriangleCoverageFn/sideTrianglePatternSetId instead. Unlike
      // Checkered's, this one still applies to all six Triangle
      // variants, not just Full Pattern — Triangle's own filling-hugging
      // was never reverted, only Checkered's was.
      const triangleCoverageFn = (() => {
        if (exteriorFinishStyle !== 'naked') return null;
        if (
          sideTrianglePatternSetId !== 'wholeCake' &&
          sideTrianglePatternSetId !== 'sidesOnly' &&
          sideTrianglePatternSetId !== 'xPattern' &&
          sideTrianglePatternSetId !== 'rightDiagonal' &&
          sideTrianglePatternSetId !== 'parallelOuter' &&
          sideTrianglePatternSetId !== 'parallelInner'
        ) return null;
        const trianglePatternForId = {
          wholeCake: 'full',
          sidesOnly: 'leftDiagonal',
          xPattern: 'leftDiagonal',
          rightDiagonal: 'rightDiagonal',
          parallelOuter: 'parallelOuter',
          parallelInner: 'parallelInner',
        }[sideTrianglePatternSetId];
        const triangleEffectiveRadius = radius + sideDecorStandoff; // === radius here (Naked)
        const rawCoverageFn = getTriangleCoverageFn(triangleEffectiveRadius, height, {
          pattern: trianglePatternForId,
          gapDashPeriod: sideTrianglePatternSetId === 'xPattern' ? 2 : 1,
        });
        const triangleOriginY = currentY + height / 2;
        return (fillingAngle, absoluteY) => {
          const triangleAngle = Math.PI / 2 - fillingAngle;
          const triangleLocalY = absoluteY - triangleOriginY;
          return rawCoverageFn(triangleAngle, triangleLocalY);
        };
      })();

      // Glaze's own Triangle Pattern coverage — same relationship to
      // triangleCoverageFn as glazeCheckerCoverageFn has to
      // checkerCoverageFn, for the same two reasons:
      //  1. Angle: triangleCoverageFn (built for Filling) reflects the
      //     angle (Math.PI/2 - a) to convert Filling's convention into
      //     the mesh's sin/cos one. Glaze's two call sites ALREADY apply
      //     that reflection before calling in, so reusing
      //     triangleCoverageFn double-reflected and mirrored every
      //     window — invisible on Full Pattern / Parallel Lines, but
      //     Left Diagonal / X / Right Diagonal windows landed on the
      //     wrong cells. This one takes the already-reflected angle
      //     as-is.
      //  2. Shape: uses getGlazeTriangleCoverageFn (real triangular
      //     silhouette, smoothed edge) instead of getTriangleCoverageFn's
      //     rectangular 0/1 cell footprint, so the glaze is cut into
      //     triangles rather than boxes around them.
      // Pattern/gapDashPeriod/radius mapping is identical to the mesh
      // build's own (patternForId etc.).
      const glazeTriangleCoverageFn = (() => {
        if (!glazeWindowStyleOk) return null;
        const glazeTrianglePatternForId = {
          wholeCake: 'full',
          sidesOnly: 'leftDiagonal',
          xPattern: 'leftDiagonal',
          rightDiagonal: 'rightDiagonal',
          parallelOuter: 'parallelOuter',
          parallelInner: 'parallelInner',
        }[sideTrianglePatternSetId];
        if (!glazeTrianglePatternForId) return null;
        const rawCoverageFn = getGlazeTriangleCoverageFn(radius + sideDecorStandoff, height, {
          pattern: glazeTrianglePatternForId,
          gapDashPeriod: sideTrianglePatternSetId === 'xPattern' ? 2 : 1,
        });
        const triangleOriginY = currentY + height / 2;
        return (glazeArg, absoluteY) => rawCoverageFn(glazeArg, absoluteY - triangleOriginY);
      })();

      // Same idea as checkerCoverageFn/triangleCoverageFn above — Chevron
      // uses the exact same sin/cos placement convention (see
      // buildChevronRowGeometry's `rOut * sinA, y, rOut * cosA`), so the
      // same angle-reflection adapter applies unchanged. The radius here
      // mirrors sideDecorationRadius's own naked-branch formula (`radius
      // - 0.02 + glazeMaxProtrusion`) rather than referencing
      // sideDecorationRadius itself, since that variable isn't declared
      // until the Side Tab block much further below (after Filling is
      // built) — this only needs the naked case anyway (Chevron's own
      // actual build call further below uses ridgedTextureRadius, which
      // falls back to exactly this same sideDecorationRadius formula
      // whenever exteriorFinishStyle isn't 'texturedButtercream').
      // height * 0.92 matches that same real call site exactly.
      const chevronCoverageFn = (() => {
        if (!glazeWindowStyleOk) return null;
        if (sideDecorationSetId !== 'chevronPattern') return null;
        const chevronEffectiveRadius = glazeDecoRadius;
        const chevronHeight = height * 0.92;
        const rawCoverageFn = getChevronCoverageFn(chevronEffectiveRadius, chevronHeight, {
          setId: sideChevronPatternSetId || 'multiColor',
        });
        const chevronOriginY = currentY + height / 2;
        return (fillingAngle, absoluteY) => {
          const chevronAngle = Math.PI / 2 - fillingAngle;
          const chevronLocalY = absoluteY - chevronOriginY;
          return rawCoverageFn(chevronAngle, chevronLocalY);
        };
      })();

      // Same idea again — Scatter Pearls' own build call also uses
      // sideDecorationRadius (never ridgedTextureRadius) and height *
      // 0.92, matched exactly here for the same reason as Chevron above.
      const scatterPearlsCoverageFn = (() => {
        if (exteriorFinishStyle !== 'naked') return null;
        if (sideDecorationSetId !== 'scatterPearls') return null;
        const pearlsEffectiveRadius = radius - 0.02 + glazeMaxProtrusion;
        const pearlsHeight = height * 0.92;
        const rawCoverageFn = getScatterPearlsCoverageFn(pearlsEffectiveRadius, pearlsHeight, {
          variant: sideScatterPearlsSetId || 'randomScatter',
        });
        const pearlsOriginY = currentY + height / 2;
        return (fillingAngle, absoluteY) => {
          const pearlsAngle = Math.PI / 2 - fillingAngle;
          const pearlsLocalY = absoluteY - pearlsOriginY;
          return rawCoverageFn(pearlsAngle, pearlsLocalY);
        };
      })();

      // Glaze's own Scatter Pearls coverage — same relationship to
      // scatterPearlsCoverageFn as glazeCheckerCoverageFn has to
      // checkerCoverageFn. scatterPearlsCoverageFn (built for Filling)
      // reflects the angle (Math.PI/2 - a) into the pearls' sin/cos mesh
      // convention, but Glaze's two call sites ALREADY apply that same
      // reflection before calling in, so reusing it cancelled the two
      // and read the glaze's raw angle as if it were the mesh's —
      // mirroring every window around the cake. Diamond Grid happened to
      // survive because its columns are mirror-symmetric; every other
      // variant (and Horizontal Rows whenever its column count isn't a
      // multiple of 4) drifted off its pearls. This version takes the
      // already-reflected angle as-is. Radius/height/variant mirror
      // scatterPearlsCoverageFn (and the real build call) exactly, so
      // Big Pearls' collision-rejected layout — which depends on radius —
      // is the identical one the mesh draws. Everything here is fixed-
      // seed/deterministic: no per-render randomness.
      const glazeScatterPearlsCoverageFn = (() => {
        if (!glazeWindowStyleOk) return null;
        if (sideDecorationSetId !== 'scatterPearls') return null;
        const pearlsEffectiveRadius = glazeDecoRadius;
        const pearlsHeight = height * 0.92;
        const rawCoverageFn = getScatterPearlsCoverageFn(pearlsEffectiveRadius, pearlsHeight, {
          variant: sideScatterPearlsSetId || 'randomScatter',
        });
        const pearlsOriginY = currentY + height / 2;
        return (glazeArg, absoluteY) => rawCoverageFn(glazeArg, absoluteY - pearlsOriginY);
      })();

      // Piping Scrolls/Sunshine Play/Victorian Lambeth all use
      // ridgedTextureRadius and height * 0.85 at their real build call
      // sites further below — in the naked case gated on here,
      // ridgedTextureRadius falls back to exactly the same
      // sideDecorationRadius formula the other coverage functions above
      // already mirror, so the same `radius - 0.02 + glazeMaxProtrusion`
      // applies here too.
      const pipingScrollsCoverageFn = (() => {
        if (exteriorFinishStyle !== 'naked') return null;
        if (sideDecorationSetId !== 'pipingScrolls') return null;
        const scrollsEffectiveRadius = radius - 0.02 + glazeMaxProtrusion;
        const scrollsHeight = height * 0.85;
        const rawCoverageFn = getPipingScrollsCoverageFn(scrollsEffectiveRadius, scrollsHeight, {
          variant: sidePipingScrollsSetId || 'waveRope',
        });
        const scrollsOriginY = currentY + height / 2;
        return (fillingAngle, absoluteY) => {
          const scrollsAngle = Math.PI / 2 - fillingAngle;
          const scrollsLocalY = absoluteY - scrollsOriginY;
          return rawCoverageFn(scrollsAngle, scrollsLocalY);
        };
      })();

      // Glaze's own Piping Scrolls coverage — same relationship to
      // pipingScrollsCoverageFn as glazeCheckerCoverageFn has to
      // checkerCoverageFn. pipingScrollsCoverageFn (built for Filling)
      // reflects the angle (Math.PI/2 - a) into the scrolls' sin/cos
      // mesh convention, but Glaze's two call sites ALREADY apply that
      // same reflection before calling in, so reusing it cancelled the
      // two: every window was read at the glaze's raw angle instead of
      // the mesh's, i.e. mirrored around the cake. That left the
      // window shapes correct but sitting off the piping (Fleur-de-lis,
      // Shell Border: visibly shifted; Wave Rope: nearly-overlapping)
      // or, for the designs whose piping is asymmetric (Paired Opposing
      // Scrolls, Vine and Tendrils, Interlocking Loop Chain), leaving
      // the piping mostly buried under an un-shaved coat with only
      // slivers showing at window edges. This version takes the
      // already-reflected angle as-is. Radius/height/variant mirror
      // pipingScrollsCoverageFn and the real buildPipingScrolls call
      // exactly.
      const glazePipingScrollsCoverageFn = (() => {
        if (!glazeWindowStyleOk) return null;
        if (sideDecorationSetId !== 'pipingScrolls') return null;
        const scrollsEffectiveRadius = glazeDecoRadius;
        const scrollsHeight = height * 0.85;
        const rawCoverageFn = getPipingScrollsCoverageFn(scrollsEffectiveRadius, scrollsHeight, {
          variant: sidePipingScrollsSetId || 'waveRope',
        });
        const scrollsOriginY = currentY + height / 2;
        return (glazeArg, absoluteY) => rawCoverageFn(glazeArg, absoluteY - scrollsOriginY);
      })();

      const sunshinePlayCoverageFn = (() => {
        if (exteriorFinishStyle !== 'naked') return null;
        if (sideDecorationSetId !== 'sunshinePlay') return null;
        const sunshineEffectiveRadius = radius - 0.02 + glazeMaxProtrusion;
        const sunshineHeight = height * 0.85;
        const rawCoverageFn = getSunshinePlayCoverageFn(sunshineEffectiveRadius, sunshineHeight, {
          variant: sideSunshinePlaySetId || 'rainbowArc',
        });
        const sunshineOriginY = currentY + height / 2;
        return (fillingAngle, absoluteY) => {
          const sunshineAngle = Math.PI / 2 - fillingAngle;
          const sunshineLocalY = absoluteY - sunshineOriginY;
          return rawCoverageFn(sunshineAngle, sunshineLocalY);
        };
      })();

      // Glaze's own Sunshine Play coverage — same relationship to
      // sunshinePlayCoverageFn as glazeCheckerCoverageFn has to
      // checkerCoverageFn. sunshinePlayCoverageFn (built for Filling)
      // reflects the angle (Math.PI/2 - a) into the decoration's own
      // sin/cos mesh convention, but Glaze's two call sites ALREADY apply
      // that same reflection before calling in, so reusing it cancelled
      // the two and read every window at the mirrored angle — a correctly
      // shaped window (rainbow arc, cloud, stars) landing beside its
      // decoration instead of under it. This version takes the already-
      // reflected angle as-is. Radius/height/variant mirror
      // sunshinePlayCoverageFn and the real buildSunshinePlay call
      // exactly.
      const glazeSunshinePlayCoverageFn = (() => {
        if (!glazeWindowStyleOk) return null;
        if (sideDecorationSetId !== 'sunshinePlay') return null;
        const sunshineEffectiveRadius = glazeDecoRadius;
        const sunshineHeight = height * 0.85;
        const rawCoverageFn = getSunshinePlayCoverageFn(sunshineEffectiveRadius, sunshineHeight, {
          variant: sideSunshinePlaySetId || 'rainbowArc',
          // Glaze-only: full star footprint + margin, and Starry Rainbow's
          // scattered sky stars (see getSunshinePlayCoverageFn).
          forGlaze: true,
        });
        const sunshineOriginY = currentY + height / 2;
        return (glazeArg, absoluteY) => rawCoverageFn(glazeArg, absoluteY - sunshineOriginY);
      })();

      const lambethHeight = height * 0.9;
      const lambethStandoff = 0.02;
      const lambethVerticalOffset = 0.1;

      const victorianLambethCoverageFn = (() => {
        if (exteriorFinishStyle !== 'naked') return null;
        if (sideDecorationSetId !== 'victorianLambeth') return null;
        const lambethEffectiveRadius = radius - 0.02 + glazeMaxProtrusion + lambethStandoff;
        const rawCoverageFn = getVictorianLambethCoverageFn(lambethEffectiveRadius, lambethHeight, {
          variant: sideVictorianLambethSetId || 'classic',
        });
        const lambethOriginY = currentY + height / 2 + lambethVerticalOffset;
        return (fillingAngle, absoluteY) => {
          const lambethAngle = Math.PI / 2 - fillingAngle;
          const lambethLocalY = absoluteY - lambethOriginY;
          return rawCoverageFn(lambethAngle, lambethLocalY);
        };
      })();

      // Glaze's own Victorian Lambeth coverage — same relationship to
      // victorianLambethCoverageFn as glazeCheckerCoverageFn has to
      // checkerCoverageFn. Without this term in glazeSideCoverageFn the
      // glaze had no windows at all under Lambeth and stayed one
      // continuous coat over the piping. `forGlaze: true` routes
      // getVictorianLambethCoverageFn to getVictorianLambethGlazeCoverageFn,
      // which opens a window per REAL element (rope capsules, curtain
      // drape, rosette + leaves, pearls, fleur-de-lis) instead of
      // Filling's coarse 3-region approximation.
      //  - Angle: takes the already-reflected angle as-is (the Glaze call
      //    sites apply Math.PI/2 - angle before calling in), so NO extra
      //    reflection here, unlike victorianLambethCoverageFn.
      //  - Radius: glazeDecoRadius + lambethStandoff mirrors the real
      //    build call (ridgedTextureRadius + lambethStandoff), which is
      //    sideDecorationRadius on Naked/Fully Frosted.
      //  - Height/origin: lambethHeight and currentY + height/2 +
      //    lambethVerticalOffset, exactly as the mesh is positioned.
      const glazeVictorianLambethCoverageFn = (() => {
        if (!glazeWindowStyleOk) return null;
        if (sideDecorationSetId !== 'victorianLambeth') return null;
        const rawCoverageFn = getVictorianLambethCoverageFn(
          glazeDecoRadius + lambethStandoff,
          lambethHeight,
          { variant: sideVictorianLambethSetId || 'classic', forGlaze: true },
        );
        const lambethOriginY = currentY + height / 2 + lambethVerticalOffset;
        return (glazeArg, absoluteY) => rawCoverageFn(glazeArg, absoluteY - lambethOriginY);
      })();

      // Whichever Side Treatment is actually active on this tier (at
      // most one ever is — Side Treatment is a single exclusive choice)
      // — Filling itself doesn't need to care which, just whether
      // SOMETHING is covering a given point. All seven Side Tab designs
      // are covered now — Piping Scrolls/Sunshine Play use real curve/
      // shape sampling matching their own placement math; Victorian
      // Lambeth uses a coarser per-segment approximation given its sheer
      // number of interacting elements (see its own coverage function's
      // comment in victorianLambethHelpers.js).
      const activeSideCoverageFn = (
        checkerCoverageFn || triangleCoverageFn || chevronCoverageFn ||
        scatterPearlsCoverageFn || pipingScrollsCoverageFn ||
        sunshinePlayCoverageFn || victorianLambethCoverageFn || null
      );
      // Glaze's own selection: same chain as activeSideCoverageFn above,
      // except Checkered contributes glazeCheckerCoverageFn (all six
      // variants) instead of checkerCoverageFn (wholeCake only, because
      // Filling needs it that way). Kept as a separate variable rather
      // than widening activeSideCoverageFn itself, since Filling reads
      // that one directly (see the buildMashedGeometry call below) and
      // must keep NOT shaving its bumps under the other five variants.
      // Only one Side treatment can be active at a time
      // (side.mode is single-valued), so at most one term in this chain
      // is ever non-null and the order doesn't matter.
      const glazeSideCoverageFn = (
        glazeCheckerCoverageFn || glazeTriangleCoverageFn || chevronCoverageFn ||
        glazeScatterPearlsCoverageFn || glazePipingScrollsCoverageFn ||
        glazeSunshinePlayCoverageFn || glazeVictorianLambethCoverageFn || null
      );
      lastActiveSideCoverageFn = glazeSideCoverageFn;

      for (let s = 0; s < (fillingEnabled ? fillingLayers + 1 : 1); s++) {
        const isTopSection = s === (fillingEnabled ? fillingLayers + 1 : 1) - 1;
        const fillingActive = fillingEnabled && !!fillColor;

        let bottomSocketHeight = 0;
        // (Socket-into-the-tier-below removed — see the matching removal of
        // the frosting dome for intermediate tiers below. Two tiers meeting
        // via a bump+socket pair only works if BOTH sides are shaped to
        // match; the frosting was flat/domed inconsistently, which is what
        // caused the visible floating gap. Simple flush flat-to-flat
        // stacking is robust and doesn't depend on getting that matching
        // exactly right.)

        const isFrostedTier = Boolean(frostColor && exteriorFinishStyle !== 'naked');
        const spongeRadius = isFrostedTier ? radius - 0.08 : radius - 0.02;
        const spongeGeo = buildSpongeProfileGeometry(spongeRadius, spongeSectionHeight, {
          // Only the very last tier's very last section gets the pointy
          // dome top — intermediate tiers (with another tier stacked on
          // them) get a flat top so the next tier sits flush against it.
          topBumpHeight: (isTopSection && i === layerCount - 1) ? (isFrostedTier ? Math.max(0, domeAmount - 0.02) : domeAmount) : 0,
          bottomSocketHeight,
          bevelSize: isFrostedTier ? 0.22 : 0.18,
          // Flush (no taper) on any face that meets a filling layer, so the
          // filling can sit flat against it with no gap.
          bevelTop: !(fillingActive && s < fillingLayers),
          bevelBottom: !(fillingActive && s > 0),
        });

        if (spongeMat) {
          const spongeSection = new THREE.Mesh(spongeGeo, spongeMat);
          spongeSection.position.y = spongeCurrentY + spongeSectionHeight / 2;
          spongeSection.castShadow = true;
          spongeSection.receiveShadow = true;
          group.add(spongeSection);
        }

        spongeCurrentY += spongeSectionHeight;

        // Add filling layer after sponge section (except after last section)
        if (fillingEnabled && s < fillingLayers && fillColor) {
          const fillingY = spongeCurrentY + FILLING_H / 2;

          // "Mashed Circles" and "Mashed Swirls" both replace the filling
          // body itself with the bumped geometry below, piped in the
          // decorative Piping Color — the dome bulges ARE the exposed
          // filling edge, not a separate trim mesh added in front of a
          // plain flat cylinder (see buildMashedCircleFillingGeometry's
          // comment for why). Mashed Swirls is the same body with a
          // diagonal slash groove pattern switched on — see
          // buildMashedSwirlFillingGeometry, a thin wrapper right below
          // buildMashedCircleFillingGeometry.
          if (fillingPipingTip === 'mashedCircles' || fillingPipingTip === 'mashedSwirls') {
            // Uses getFrostingMaterial (the same buttercream shader as
            // Fully Frosted / Textured Buttercream elsewhere in this file),
            // NOT getFillingMaterial — that one's tuned for a glossy
            // whipped-cream/jam look (see its own doc comment), which read
            // wrong for a design that's meant to look piped in buttercream.
            // Second argument mirrors the Frosting Shell's frostColorId
            // below — without a SUGAR_COLORS id, getFrostingMaterial can't
            // build the actual pattern/gradient/metallic material for
            // Marble/Ombré/Rainbow Swirl/Gold Shimmer/Watercolor Pastel
            // Mix/Red-White Gradient and silently falls back to a flat
            // swatch, which is why Pick Color for those six previously
            // only ever displayed correctly on Exterior Finish.
            const pipingMat = getFrostingMaterial(
              layerFillingSugarColors[i] || fillingPipingColor,
              layerFillingSugarColorIds[i] || fillingPipingColorId
            );
            const isSwirl = fillingPipingTip === 'mashedSwirls';
            const buildMashedGeometry = isSwirl
              ? buildMashedSwirlFillingGeometry
              : buildMashedCircleFillingGeometry;
            // bumpCount/peakBulge/valleyRecess/vScaleMin values mirror
            // buildMashedCircleFillingGeometry's own defaults and
            // buildMashedSwirlFillingGeometry's override in
            // spongeGeometry.js exactly — duplicated here (rather than
            // imported) only because Glaze's hugging profile below needs
            // them as plain numbers ahead of the actual geometry call, to
            // build the exact same jitter via makeMashedBumpJitter BEFORE
            // consuming rand() for it — generating jitter separately
            // afterward would call rand() a second time and desync from
            // the sequence the actual mesh used, producing different
            // bumps than what's rendered.
            const bumpCount = isSwirl ? 15 : 22;
            const vScaleMin = isSwirl ? 0.85 : 0.55;
            const pattern = isSwirl ? 'diagonalSlashes' : 'none';
            const bumpJitter = makeMashedBumpJitter(bumpCount, vScaleMin, 1.0, rand, pattern);
            // Adds this specific band's own absolute Y (fillingY, just
            // below) on top of the tier-level activeSideCoverageFn's
            // origin conversion — see that function's own comment for why
            // the angle also needs converting, not just the Y.
            // Naked + Filling + Glaze: the Filling bumps sit UNDER the glaze
            // (Filling < Glaze < Side), and wherever a Side design has its
            // window cut into the glaze, the bump has to stay flat too —
            // otherwise it pokes out through that empty space right where
            // the Side piping/pearls/squares are supposed to sit. Filling's
            // own activeSideCoverageFn can't do that: it is Filling-only
            // (e.g. Checkered contributes just Full Pattern, and the
            // shape-accurate glaze windows don't exist there). So when this
            // tier has Glaze on, use the SAME chain the glaze itself is cut
            // with (glazeSideCoverageFn) — bumps and glaze then open and
            // close on identical windows. Angle: glazeSideCoverageFn takes
            // the glaze call sites' Math.PI/2 - angle; Filling's angle is the
            // same convention as Glaze's raw angle (makeFillingBandHugFn
            // feeds this mesh's own bump index from that angle), so the same
            // Math.PI/2 - angle applies here. Without Glaze, behavior is
            // exactly as before (activeSideCoverageFn, untouched).
            const fillingSideCoverageFn = (tierSurfaceTreatmentMode === 'glaze' && glazeSideCoverageFn)
              ? (angle, absoluteY) => glazeSideCoverageFn(Math.PI / 2 - angle, absoluteY)
              : activeSideCoverageFn;
            const coverageFn = fillingSideCoverageFn
              ? (angle, localY) => fillingSideCoverageFn(angle, fillingY + localY)
              : null;
            const mashedGeometry = buildMashedGeometry(radius * 0.95, FILLING_H, { rand, precomputedJitter: bumpJitter, coverageFn });
            // Recompute UV.v as a clean top-to-bottom 0→1 ramp over this
            // geometry's own bounding box — see applyVerticalGradientUV's
            // doc comment in frostingMaterial.js. Fixes gradient Color
            // Overrides (Marble/Ombré/Rainbow Swirl/Watercolor Pastel Mix/
            // Red-White Gradient) on this bump geometry to match what
            // "None" already shows, without altering spongeGeometry.js.
            applyVerticalGradientUV(mashedGeometry);
            const mashedFilling = new THREE.Mesh(
              // Starting point pushed deeper into the cake (radius * 0.95,
              // vs. the plain filling profile's flat -0.02 recess below) —
              // this is the baseline the whole bump shape (peaks AND
              // valleys) is built from, so recessing it further sells the
              // valley's "cut into the cake" look even more convincingly,
              // without touching bumpCount/peakBulge/valleyRecess/widthFrac
              // themselves.
              mashedGeometry,
              pipingMat
            );
            mashedFilling.position.y = fillingY;
            mashedFilling.castShadow = true;
            mashedFilling.receiveShadow = true;
            group.add(mashedFilling);
            // Recorded for Glaze's hugging profile below — see
            // lastFillingBands' declaration above. isSwirl/bumpJitter are
            // captured too, since exactly reproducing this band's
            // displacement needs the SAME jitter the mesh above was
            // actually built with, not a freshly (and differently)
            // randomized one.
            lastFillingBands.push({ y: fillingY, isSwirl, bumpCount, bumpJitter });
          } else {
            // "None" — no piping design chosen. Uses getFrostingMaterial,
            // the same buttercream shader as Mashed Circles/Mashed Swirls
            // above (and Fully Frosted/Textured Buttercream elsewhere in
            // this file), so the plain filling edge reads as the same
            // buttercream, just without the piped bump geometry — not the
            // glossy whipped-cream/jam material getFillingMaterial is
            // tuned for (see that function's own doc comment).
            // Color source matches the Mashed Circles/Mashed Swirls branch
            // above (layerFillingSugarColors[i] || fillingPipingColor) —
            // previously this used the flavor's plain fillColor directly,
            // which skipped Sugar Color entirely, so Pick Color applied
            // to Mashed Circles/Mashed Swirls but never to None. Same
            // colorId second argument as that branch too, for the same
            // pattern/gradient/metallic reason.
            const fillingMat = getFrostingMaterial(
              layerFillingSugarColors[i] || fillingPipingColor,
              layerFillingSugarColorIds[i] || fillingPipingColorId
            );
            const fillingSection = new THREE.Mesh(
              buildFillingProfileGeometry(radius - 0.02, FILLING_H, 0),
              fillingMat
            );
            fillingSection.position.y = fillingY;
            fillingSection.castShadow = true;
            fillingSection.receiveShadow = true;
            group.add(fillingSection);

            // No separate piping trim here: this branch only ever runs
            // when fillingPipingTip is null ("None") — FILLING_PIPING_DESIGNS
            // only has 'mashedCircles'/'mashedSwirls', both handled by the
            // branch above, so there's no other tip value this could be.
          }

          spongeCurrentY += FILLING_H;
        }
      }

      // Frosting Shell (exterior coating - solid cylinder covering entire layer)
      // Only add frosting if a color is selected AND not a naked cake
      if (frostColor && exteriorFinishStyle !== 'naked') {
        const frostMat = getFrostingMaterial(frostColor, frostColorId);
        // Interior Preview cutaway — real geometric clipping, not an overlay.
        // clipIntersection must be set even when clippingPlanes is empty so
        // it's already correct the moment interiorPreview turns on.
        frostMat.clippingPlanes = tierClipConfig.frosting.planes;
        frostMat.clipIntersection = tierClipConfig.frosting.clipIntersection;
        frostMat.clipShadows = true;
        coveringMaterialsRef.current.push(frostMat);
        // Unified organic frosting geometry (replaces separate cylinder and caps)
        const FROST_CAP_H = 0.12;
        const isOverallTopTier = i === layerCount - 1;
        // The upper tier's bottom bevel can otherwise expose a thin strip of
        // sponge at the tier seam. Extend its frosting downward into the
        // frosting beneath it without changing the tier stack height.
        const tierSeamOverlap = i > 0 ? 0.08 : 0;

        const totalFrostHeight = isOverallTopTier
          ? FROST_CAP_H + height + tierSeamOverlap
          : FROST_CAP_H + height + FROST_H + tierSeamOverlap;

        const domeH = isOverallTopTier ? (domeAmount + 0.05) : 0;

        const frostGeo = exteriorFinishStyle === 'texturedButtercream'
          ? (
            buttercreamTexture === 'ribbonWrap'
              ? buildRibbonWrapButtercreamGeometry(radius + 0.06, totalFrostHeight, domeH)
              : buttercreamTexture === 'verticalPiping'
                ? buildVerticalPipingButtercreamGeometry(radius + 0.06, totalFrostHeight, domeH)
                : buildTexturedButtercreamGeometry(radius + 0.06, totalFrostHeight, domeH) // 'ridged', also the default
          )
          : buildOrganicFrostingGeometry(radius + 0.06, totalFrostHeight, domeH);
        // Same fix as Mashed Circles/Mashed Swirls in the filling loop
        // above (see applyVerticalGradientUV's doc comment in
        // frostingMaterial.js): the three Textured Buttercream ridge/
        // ribbon/piping geometries are parametric bump shapes whose own
        // UVs weren't authored for a flat gradient wash, which is why
        // Marble/Ombré/Rainbow Swirl/Watercolor Pastel Mix/Red-White
        // Gradient displayed correctly on Fully Frosted's smooth
        // buildOrganicFrostingGeometry but not here. Safe to call
        // unconditionally — recomputing buildOrganicFrostingGeometry's
        // own UV this same way doesn't change how it already renders.
        applyVerticalGradientUV(frostGeo);

        const frost = new THREE.Mesh(frostGeo, frostMat);
        frost.position.y = currentY - FROST_CAP_H - tierSeamOverlap;
        frost.castShadow = true;
        group.add(frost);

        // Glaze (see buildGlazeGeometry) is a "secondary copy" of THIS
        // tier's own frosting shell, built after the loop ends — capture
        // the real numbers it was just built from so Glaze's shoulder
        // matches this shell's shoulder exactly instead of drifting off
        // fixed constants. Only meaningful for isOverallTopTier in
        // practice (Glaze only ever wraps the outermost/topmost tier, the
        // same "poured from the very top" convention Drip already uses),
        // but harmless to set on every tier — the last iteration wins.
        lastHasFrosting = true;
        lastFrostTotalHeight = totalFrostHeight;
        lastFrostDomeH = domeH;
        lastFrostMeshY = frost.position.y;
      }


      // Side > No Name — merged former Full Coverage (tuxedo, whipped
      // skirt) + former Partial Coverage (drip), moved here from Surface.
      // This is what actually covers the sponge/filling directly on a
      // Naked cake, or sits on top of the frosting when one exists —
      // either way it registers into coveringMaterialsRef so Interior
      // Preview's wedge clips through whatever is actually covering things
      // right now, not just frosting.
      if (sideNoNameSetId === 'whippedSkirt') {
        const startIdx = group.children.length;
        addWhippedCreamSkirt(group, radius, currentY, height, sideNoNameColor);
        registerNewChildrenForClipping(group, startIdx, coveringMaterialsRef, interiorPreview, tierClipConfig.side.planes, tierClipConfig.side.clipIntersection);
      }

      // Checkered/Triangle Pattern's standoff above the tier radius has to
      // clear whichever Exterior Finish shell they're sitting on — see
      // sideDecorStandoff's declaration earlier in this tier's block (it
      // was hoisted above the section loop so checkerCoverageFn/
      // triangleCoverageFn, used by Filling's own Piping Design further
      // up, could see it before Checkered/Triangle Pattern themselves run
      // below).

      // Side > Checkered Pattern (sides) — real raised squares
      // (buttercream stenciling), not a printed texture. Tinted via
      // Sugar Color's frostColor now (Side's own Checkered Pattern color
      // grid was removed) — was hardcoded black regardless of selection
      // until DecorationSets.jsx's buildCheckerSideSquares was updated to
      // accept a color option.
      // "Full Pattern" (id 'wholeCake') gets the full alternating
      // checkerboard, applied uniformly to every tier's side wall.
      // "Left Diagonal" (id 'sidesOnly'), "X Pattern" (id 'xPattern'), and
      // "Right Diagonal" (id 'rightDiagonal') all start from that same
      // checkerboard, then thin its naturally-diagonal black lines at a
      // repeating interval (see buildCheckerSideSquares's 'leftDiagonal'/
      // 'rightDiagonal' patterns in DecorationSets.jsx). Left Diagonal and
      // Right Diagonal are mirror images of each other (which way the
      // stripe leans) with a fully empty gap between stripes; X Pattern
      // uses the same left-leaning direction as Left Diagonal but dashes
      // the gap instead, creating the crossing look.
      // "Parallel Lines — Outer" (id 'parallelOuter') and "Parallel Lines
      // — Inner" (id 'parallelInner') are a different family entirely —
      // not checkerboard-derived, just two full horizontal bands at
      // specific row positions (1st-from-top/4th-from-bottom for Outer,
      // 2nd-from-top/3rd-from-bottom for Inner). See
      // buildCheckerSideSquares's 'parallelOuter'/'parallelInner' patterns
      // in DecorationSets.jsx.
      // Registered into coveringMaterialsRef for the same reason as No
      // Name above — on a Naked cake this IS the covering layer sitting
      // directly on the sponge/filling.
      if (
        sideCheckeredPatternSetId === 'wholeCake' ||
        sideCheckeredPatternSetId === 'sidesOnly' ||
        sideCheckeredPatternSetId === 'xPattern' ||
        sideCheckeredPatternSetId === 'rightDiagonal' ||
        sideCheckeredPatternSetId === 'parallelOuter' ||
        sideCheckeredPatternSetId === 'parallelInner'
      ) {
        const patternForId = {
          wholeCake: 'full',
          sidesOnly: 'leftDiagonal',
          xPattern: 'leftDiagonal',
          rightDiagonal: 'rightDiagonal',
          parallelOuter: 'parallelOuter',
          parallelInner: 'parallelInner',
        }[sideCheckeredPatternSetId];
        // Compensate for frosting thickness: when there's a frosting shell
        // on this tier, the checker squares need to sit on top of that
        // extra layer, not at the bare sponge radius, or they'd end up
        // partially buried in the frosting. sideDecorStandoff (computed
        // above) also accounts for Textured Buttercream's actual ridge
        // geometry, not just a flat frosting thickness — see its comment.
        //
        // Full Pattern specifically hugs the cake at this same plain
        // radius (no extra clearance) even with an active Mashed Circles/
        // Mashed Swirls filling band underneath — Filling itself already
        // shaved its own bumps down to match Full Pattern's real square
        // footprint (see checkerCoverageFn, built earlier in this tier's
        // block, before Filling was constructed, for exactly this
        // reason). The other five Checkered variants don't get this —
        // their own gaps are meant to show what's underneath.
        const effectiveRadius = radius + sideDecorStandoff;
        const checkerSide = buildCheckerSideSquares(effectiveRadius, height, {
          pattern: patternForId,
          // Only 'xPattern' dashes the gap (the crossing look); Left
          // Diagonal and Right Diagonal both use a fully empty gap.
          gapDashPeriod: sideCheckeredPatternSetId === 'xPattern' ? 2 : 1,
          // Ridge Comb/Ribbon Wrap/Vertical Piping: stop burying the
          // box's back face into the wall (buildCheckerSideSquares'
          // default -0.06 embed) — that wall isn't flat under these
          // three, and their ridge peaks reach past a buried-0.06 back
          // face, poking into the box (verified: pierces the box's own
          // volume by 0.03–0.05 with the default embed, at every
          // texture). +0.02 instead sits the box's back face just past
          // each texture's own real peak (amplitude + angular wobble,
          // taken straight from their geometry builders in
          // frostingGeometry.js), with margin — same idea as Glaze's own
          // per-texture coatThickness just below, but sized off the
          // BACK face here since that's the one that was embedding into
          // the peak, not the front.
          embedOverride: exteriorFinishStyle === 'texturedButtercream' ? 0.02 : undefined,
          // Colored by Sugar Color's frostColor now (Side's per-treatment
          // color pickers were removed) — see the "Sugar Color applies
          // everywhere outside Fundamentals" pass. colorId lets
          // buildCheckerSquareMaterial build the real pattern/gradient/
          // metallic material for Marble/Ombré/Rainbow Swirl/Gold
          // Shimmer/Watercolor Pastel Mix/Red-White Gradient instead of
          // falling back to a flat swatch for all six, same fix already
          // applied to Filling Piping/the Frosting Shell/Glaze.
          color: sideCheckeredColor,
          colorId: sideCheckeredColorId,
        });
        checkerSide.position.y = currentY + height / 2;
        checkerSide.material.clippingPlanes = tierClipConfig.side.planes;
        checkerSide.material.clipIntersection = tierClipConfig.side.clipIntersection;
        checkerSide.material.clipShadows = true;
        coveringMaterialsRef.current.push(checkerSide.material);
        group.add(checkerSide);
      }

      // Side > Triangle Pattern (sides) — duplicate of Checkered Pattern's
      // exact dispatch above, real raised triangles instead of squares.
      // Tinted via Sugar Color's frostColor now (Side's own Triangle
      // Pattern color grid was removed). Same 6 variants, same
      // pattern-id mapping, same frosting-thickness compensation, same
      // Interior Preview clipping — see buildTriangleSideShapes's own doc
      // comment in DecorationSets.jsx for the geometry (itself a
      // duplicate of buildCheckerSideSquares).
      if (
        sideTrianglePatternSetId === 'wholeCake' ||
        sideTrianglePatternSetId === 'sidesOnly' ||
        sideTrianglePatternSetId === 'xPattern' ||
        sideTrianglePatternSetId === 'rightDiagonal' ||
        sideTrianglePatternSetId === 'parallelOuter' ||
        sideTrianglePatternSetId === 'parallelInner'
      ) {
        const trianglePatternForId = {
          wholeCake: 'full',
          sidesOnly: 'leftDiagonal',
          xPattern: 'leftDiagonal',
          rightDiagonal: 'rightDiagonal',
          parallelOuter: 'parallelOuter',
          parallelInner: 'parallelInner',
        }[sideTrianglePatternSetId];
        // Same frosting-thickness (and Textured Buttercream ridge)
        // compensation as Checkered Pattern — see sideDecorStandoff above.
        const triangleEffectiveRadius = radius + sideDecorStandoff;
        // Colored by Sugar Color's frostColor now (Side's per-treatment
        // color pickers were removed). colorId lets
        // buildTriangleShapeMaterial build the real pattern/gradient/
        // metallic material for Marble/Ombré/Rainbow Swirl/Gold Shimmer/
        // Watercolor Pastel Mix/Red-White Gradient instead of falling back
        // to a flat swatch — same fix already applied to Checkered.
        const triangleSide = buildTriangleSideShapes(triangleEffectiveRadius, height, {
          pattern: trianglePatternForId,
          gapDashPeriod: sideTrianglePatternSetId === 'xPattern' ? 2 : 1,
          color: sideTriangleColor,
          colorId: sideTriangleColorId,
          // Same fix as Checkered's own build call above — see its
          // comment for why Ridge Comb/Ribbon Wrap/Vertical Piping need
          // this box to stop embedding into their bumpy wall.
          embedOverride: exteriorFinishStyle === 'texturedButtercream' ? 0.02 : undefined,
        });
        triangleSide.position.y = currentY + height / 2;
        triangleSide.material.clippingPlanes = tierClipConfig.side.planes;
        triangleSide.material.clipIntersection = tierClipConfig.side.clipIntersection;
        triangleSide.material.clipShadows = true;
        coveringMaterialsRef.current.push(triangleSide.material);
        group.add(triangleSide);
      }

      // Side > Decorations (Scatter Pearls, Piping Scrolls, Sunshine Play, Victorian Lambeth, Chevron)
      // Colored by Sugar Color's frostColor now (Side's per-treatment
      // color pickers were removed) — see the "Sugar Color applies
      // everywhere outside Fundamentals" pass. The old '#F6DEAB' fallback
      // swap-to-white (for decorations that read better on white than the
      // old default vanilla-ish tan) no longer applies since frostColor
      // is never that specific placeholder value — decorations now simply
      // render in whatever frostColor actually is.
      const hasFrostingForDeco = frostColor && exteriorFinishStyle !== 'naked';
      // Same Glaze clearance as sideDecorStandoff above (see its own
      // comment for glazeMaxProtrusion's reasoning) — this is the radius
      // Chevron/Piping Scrolls/Sunshine Play/Victorian Lambeth actually
      // fall back to outside Textured Buttercream (see ridgedTextureRadius
      // below), and the one Scatter Pearls always uses, so it needs the
      // same clearance folded in here too, not just at sideDecorStandoff.
      const sideDecorationRadius = (hasFrostingForDeco ? radius + 0.06 : radius - 0.02) + glazeMaxProtrusion;

      // Chevron Pattern, Piping Scrolls, Sunshine Play, and Victorian
      // Lambeth all need the same Textured Buttercream ridge-clearance fix
      // Checkered/Triangle Pattern got (see sideDecorStandoff above) —
      // sideDecorationRadius's shared flat 0.06 clearance is even tighter
      // than Checkered/Triangle's old 0.08 was, so ridge peaks poke
      // through these the same way they did through those before that
      // fix. All four build genuine flat/relief-faced shapes (squares,
      // triangles, chevron teeth, scroll/rainbow/lace relief), so a ridge
      // peak breaking the surface reads as a visible cut line the same
      // way. Reuses sideDecorStandoff's already-texture-aware value
      // (falls back to sideDecorationRadius untouched for Naked/Fully
      // Frosted, so nothing changes there for these either). Scatter
      // Pearls is left on sideDecorationRadius, unchanged — it builds
      // round-rod/bead instanced geometry, which doesn't get visibly cut
      // into by a ridge poking through it the way a flat face does;
      // Scatter Pearls in particular already blends fine with the ridges
      // as-is per visual review.
      const ridgedTextureRadius = (exteriorFinishStyle === 'texturedButtercream' && hasFrostingForDeco)
        ? radius + sideDecorStandoff
        : sideDecorationRadius;

      if (sideDecorationSetId === 'scatterPearls') {
        const startIdx = group.children.length;
        const pearlRand = makePRNG(hashStr(`pearls-${cakeSize}-${sideDecorationVariant}-tier${i}`));
        const pearls = buildScatterPearlsRing(sideDecorationRadius, height * 0.92, sideDecorationColor, sideDecorationColorId, pearlRand, {
          variant: sideScatterPearlsSetId || 'randomScatter'
        });
        pearls.position.y = currentY + height / 2;
        group.add(pearls);
        registerNewChildrenForClipping(group, startIdx, coveringMaterialsRef, interiorPreview, tierClipConfig.side.planes, tierClipConfig.side.clipIntersection);
      }

      layerGlazeDescriptors.push({
        radius,
        height,
        currentY,
        frostMeshY: lastFrostMeshY,
        fillingBands: lastFillingBands,
        hasFrosting: lastHasFrosting,
        totalHeight: lastFrostTotalHeight,
        domeHeight: lastFrostDomeH,
        color: isIndividual
          ? (layerSurfaceTreatmentColors[i] || '#F6DEAB')
          : surfaceTreatmentColorHex,
        mode: isIndividual ? (layerSurfaceTreatmentModes[i] || null) : surfaceTreatmentMode,
        pattern: isIndividual ? (layerSurfaceTreatmentPatterns[i] || 'longGaps') : surfaceTreatmentPattern,
        sideDecor: tierHasSideDecor,
        // This tier's OWN Side coverage — not the topmost tier's — so a
        // lower tier's glaze recedes under ITS OWN Side pattern, not
        // whatever the top tier happens to have. glazeSideCoverageFn, not
        // activeSideCoverageFn — the latter is Filling's (wholeCake-only
        // for Checkered), see where glazeSideCoverageFn is defined. See
        // the two buildGlazeGeometry call sites further below that
        // consume this.
        coverageFn: glazeSideCoverageFn,
      });

      if (sideDecorationSetId === 'pipingScrolls') {
        const startIdx = group.children.length;
        const scrolls = buildPipingScrolls(ridgedTextureRadius, height * 0.85, sideDecorationColor, sideDecorationColorId, sidePipingScrollsSetId || 'waveRope');
        scrolls.position.y = currentY + height / 2;
        group.add(scrolls);
        registerNewChildrenForClipping(group, startIdx, coveringMaterialsRef, interiorPreview, tierClipConfig.side.planes, tierClipConfig.side.clipIntersection);
      }

      if (sideDecorationSetId === 'sunshinePlay') {
        const startIdx = group.children.length;
        // A single accent piece stuck to one spot on the wall (see
        // buildSunshinePlay's own doc comment) rather than a treatment
        // that wraps/tiles around it like the others here — it positions
        // itself against ridgedTextureRadius internally, same standoff
        // logic as Piping Scrolls above.
        const sunshine = buildSunshinePlay(
          ridgedTextureRadius, height * 0.85, sideDecorationColor, sideDecorationColorId,
          sideSunshinePlaySetId || 'rainbowArc', undefined,
          {
            // Cloudy Champ / Starry Rainbow / Assorted Starry Rainbow's
            // clouds sit almost flush (0.002) against ridgedTextureRadius
            // by design — correct for Naked/Fully Frosted, where the
            // wall really is flat, but Textured Buttercream's wall isn't:
            // its own ridge peak reaches past ridgedTextureRadius by a
            // thin margin (0.016–0.028, verified against each texture's
            // real geometry), so a ridge crest can poke past a cloud's
            // flat face or graze its silhouette edge — same family of
            // bug as Checkered/Triangle/Chevron's embed-into-the-ridge
            // problem, just too little outward clearance instead of too
            // much backward embed. Stars and the rainbow arc don't show
            // this (their own standoffs already clear the ridge), so
            // only clouds get pushed out further, via
            // buildSunshinePlay's own cloudStandoff option — see its
            // comment and buildCloudyChump's. +0.05 gives a real margin
            // (0.064–0.076, verified) across all three textures with one
            // shared number, rather than tuning per texture.
            cloudStandoff: exteriorFinishStyle === 'texturedButtercream' ? 0.05 : undefined,
          },
        );
        sunshine.position.y = currentY + height / 2;
        group.add(sunshine);
        registerNewChildrenForClipping(group, startIdx, coveringMaterialsRef, interiorPreview, tierClipConfig.side.planes, tierClipConfig.side.clipIntersection);
      }

      if (sideDecorationSetId === 'victorianLambeth') {
        const startIdx = group.children.length;
        const lambeth = buildVictorianLambeth(ridgedTextureRadius + lambethStandoff, lambethHeight, sideDecorationColor, undefined, sideVictorianLambethSetId || 'classic', sideDecorationColorId);
        lambeth.position.y = currentY + height / 2 + lambethVerticalOffset;
        group.add(lambeth);
        registerNewChildrenForClipping(group, startIdx, coveringMaterialsRef, interiorPreview, tierClipConfig.side.planes, tierClipConfig.side.clipIntersection);
      }

      if (sideDecorationSetId === 'chevronPattern') {
        const startIdx = group.children.length;
        const chevron = buildChevronSideStripes(ridgedTextureRadius, height * 0.92, {
          setId: sideChevronPatternSetId || 'multiColor',
          color: sideChevronColor,
          colorId: sideChevronColorId,
          secondaryColor: sideChevronSecondaryColor,
          secondaryColorId: sideChevronSecondaryColorId,
          // Same fix as Checkered/Triangle's own build calls — see
          // buildCheckerSideSquares' comment. Chevron's ribbons are a
          // thick extruded shape with their own embed (CHEVRON_STANDOFF),
          // same category of problem as those two, just a smaller number.
          embedOverride: exteriorFinishStyle === 'texturedButtercream' ? 0.02 : undefined,
        });
        chevron.position.y = currentY + height / 2;
        group.add(chevron);
        registerNewChildrenForClipping(group, startIdx, coveringMaterialsRef, interiorPreview, tierClipConfig.side.planes, tierClipConfig.side.clipIntersection);
      }

      if (i === 0 && layerCount >= 2) {
        const hasFrosting0 = frostColor && exteriorFinishStyle !== 'naked';
        ledgeY = currentY + height + (hasFrosting0 ? FROST_H : 0);
        layer1OuterRadius = hasFrosting0 ? radius + 0.06 : radius;
      }

      if (i === layerCount - 1) {
        topLayerBaseY = currentY + height;
        const domeAmount = height * 0.05;
        topLayerDomeHeight = (frostColor && exteriorFinishStyle !== 'naked') ? (domeAmount + 0.05) : domeAmount;
      }

      const hasFrosting = frostColor && exteriorFinishStyle !== 'naked';
      currentY += height + (hasFrosting ? FROST_H : 0);
    }

    const topY = currentY + 0.05;
    const topRadius = lastRadius;

    topMetricsRef.current = {
      baseY: topLayerBaseY,
      domeHeight: topLayerDomeHeight,
      topY,
      radius: topRadius,
    };

    const overallHasFrost = Boolean(lastFrostColor && exteriorFinishStyle !== 'naked');
    const overallHasGlaze = surfaceTreatmentMode === 'glaze';
    const overallHasSideDrip = sharedSideTreatment.sideNoNameSetId === 'drip';
    const overallHasSideDecor = Boolean(
      (sharedSideTreatment.sideNoNameSetId && sharedSideTreatment.sideNoNameSetId !== 'drip') ||
      sharedSideTreatment.sideCheckeredPatternSetId ||
      sharedSideTreatment.sideTrianglePatternSetId ||
      sharedSideTreatment.sideDecorationSetId
    );
    const overallClipConfig = getInteriorPreviewClippingConfig({
      hasFrosting: overallHasFrost,
      hasDrip: overallHasGlaze || overallHasSideDrip,
      hasSide: overallHasSideDecor,
      interiorPreview,
    });

    // Surface > No Name > Drip — a real covering treatment, so (unlike the
    // decorations below) it's built OUTSIDE the interiorPreview gate and
    // registers into coveringMaterialsRef so Interior Preview's wedge
    // clips through it correctly, same as the frosting shell. Colored by
    // Sugar Color's frostColor (captured as lastFrostColor since
    // frostColor itself is block-scoped inside the per-layer loop above,
    // and this renders after that loop ends) — Side's color picker for
    // this was removed.
    if (!isIndividual && sideNoNameSetId === 'drip') {
      const dripRing = buildDripRing(topRadius, sideNoNameColor, rand);
      dripRing.position.y = topY;
      dripRing.material.clippingPlanes = overallClipConfig.drip.planes;
      dripRing.material.clipIntersection = overallClipConfig.drip.clipIntersection;
      dripRing.material.clipShadows = true;
      coveringMaterialsRef.current.push(dripRing.material);
      group.add(dripRing);
    }

    // Surface Treatment > Glaze — same "real covering treatment" reasoning
    // as Drip just above: built outside the interiorPreview gate and
    // registered into coveringMaterialsRef so Interior Preview's cutaway
    // shows the full Sponge → Frosting → Glaze stack correctly. Independent
    // of (and stacks with) Side's own Drip above — a Naked cake with Glaze,
    // or a Fully-Frosted cake with both Side's Drip AND a Glaze coat, are
    // both valid combinations (see SurfaceTreatmentSection.jsx's comment on
    // why Glaze stayed out of exteriorFinish.style).
    //
    // buildGlazeGeometry (a "secondary copy" of buildOrganicFrostingGeometry,
    // defined right beside it above) is built from the SAME height/dome/
    // Y-position the top tier's own Frosting shell was just built from
    // (lastFrostTotalHeight/lastFrostDomeH/lastFrostMeshY, captured inside
    // that shell's own construction above) — so its top matches the
    // frosting's shoulder exactly and only its carved-away bottom differs.
    //
    // For Textured Buttercream, "matches the shoulder" isn't enough on its
    // own for Ridge Comb — its ridges are real geometry, not a flat
    // radius, so a uniform clearance would either bury them under a
    // smooth shell (too little clearance: they'd poke through) or sit
    // disconnected above them (too much: no hugging). makeRidgeProfileFn
    // reproduces Ridge Comb's own Y-based ridge formula so Glaze's side
    // wall can follow it point-for-point. Ribbon Wrap does the same with
    // its own band formula (see its branch below). Vertical Piping skips
    // hugging by design instead (its ridges are angle-based, see
    // buildVerticalPipingButtercreamGeometry, and hugging those isn't
    // implemented) — it falls back to a flat clearance sized to fully
    // clear that texture's own amplitude instead of following it.
    if (surfaceTreatmentMode === 'glaze') {
      const carve = GLAZE_PATTERN_CARVES[surfaceTreatmentPattern] || GLAZE_PATTERN_CARVES.longGaps;
      let ridgeProfileFn = null;
      let ridgeSpacing = null;
      let edgeFadeCycles = 4.5; // how many ridge cycles the boundary fade covers — overridden per texture below
      let coatThickness;   // undefined -> buildGlazeGeometry's own 0.06 default
      let sideSamples;     // undefined -> buildGlazeGeometry's own 48 default (fine for a flat/smooth side)
      let ridgeHugStrength; // undefined -> buildGlazeGeometry's own full-strength (1) default
      let edgeFadeDist;     // undefined -> buildGlazeGeometry's own 0.4 default
      if (lastHasFrosting && exteriorFinishStyle === 'texturedButtercream') {
        // Deliberate +50% on top of each texture's own clearance-based
        // coatThickness below — a look/feel preference (Glaze read as too
        // thin sitting over Textured Buttercream specifically), not a fix
        // for texture poking through; the per-texture baselines already
        // handle that clearance on their own, documented inline below.
        // Scaling all three uniformly keeps that existing "just enough
        // margin over this texture's own worst-case amplitude" reasoning
        // intact — it's just a bigger floor on top of it now. Naked/Fully
        // Frosted Glaze is untouched; this only applies in this branch.
        const texturedButtercreamGlazeThicknessBoost = 1.5;
        if (buttercreamTexture === 'verticalPiping') {
          coatThickness = (0.095 + 0.02) * texturedButtercreamGlazeThicknessBoost; // clears the piping lines' own amplitude + wobble, without hugging them
        } else if (buttercreamTexture === 'ribbonWrap') {
          // Glaze hugs Ribbon Wrap's bands the same way it hugs Ridge
          // Comb's ridges: makeRidgeProfileFn reproduces
          // buildRibbonWrapButtercreamGeometry's own Y-based band formula
          // point-for-point — same bevel/edge-fade, same
          // ridgeAmplitude (0.05), same ridgeSpacing (0.26), same minimum
          // ridge count (4), and the same sharpened band shape
          // (sin*0.5+0.5)^3.5, which is what makes these read as narrow
          // ribbons with flat gaps rather than Ridge Comb's rounded
          // waves (shapePow 3.5 vs 1). If any of those five numbers
          // change in buildRibbonWrapButtercreamGeometry, change them
          // here too.
          //
          // (An earlier version deliberately skipped hugging here and
          // rendered Glaze as a plain flat coat; hugging is now
          // requested, so that special case is gone.)
          ridgeSpacing = 0.26;
          // Same fade-length reasoning as the 4.5 default at
          // edgeFadeCycles: at 0.26 spacing that's ~1.17 of fade, a
          // little SHORTER than Ridge Comb's 3 cycles at 0.42 (~1.26),
          // so drips keep about the same amount of visibly textured
          // length while still fading smoothly into the carve edge.
          ridgeProfileFn = makeRidgeProfileFn(lastFrostTotalHeight, 0.05, ridgeSpacing, 3.5, 4);
          // Ribbon Wrap's bands are much narrower than a full sine cycle
          // (the ^3.5 shaping squeezes each crest into roughly a third of
          // its period), so sample a bit denser per ridge than Ridge
          // Comb's 20 to keep every crest smooth instead of faceted.
          sideSamples = Math.max(160, computeRidgeCount(lastFrostTotalHeight, ridgeSpacing, 4) * 24);
          // Floor at the carve edge — the hugging bulge fades to exactly
          // 0 there on purpose, so a flat coatThickness alone has to clear
          // Ribbon Wrap's own ridgeAmplitude (0.05) plus its angular
          // wobble (buildRibbonWrapButtercreamGeometry's 0.008+0.005,
          // ~0.013 worst case, ~0.063 total). The boosted 0.08 * 1.5 =
          // 0.12 clears that with real margin, unchanged from before.
          coatThickness = 0.08 * texturedButtercreamGlazeThicknessBoost;
        } else {
          ridgeSpacing = 0.42;
          // A smaller cycle count than Ribbon Wrap's: at 4.5 (the same
          // ratio that fixed Ribbon Wrap's staircase), Ridge Comb's wider
          // spacing pushed the fade zone wide enough to swallow most of
          // a short/medium drip's own length, so the ridge texture barely
          // showed before fading back out — read as "the hugging starts,
          // then just goes flat/off before finishing" rather than a
          // staircase. 3 cycles, combined with the smoothstep fade curve
          // above (a strict improvement over the old linear ramp on its
          // own), keeps enough of each drip's visible length actually
          // textured while still smoothing the transition cleanly.
          edgeFadeCycles = 3;
          ridgeProfileFn = makeRidgeProfileFn(lastFrostTotalHeight, 0.07, ridgeSpacing, 1, 3); // 'ridged', also the default
          sideSamples = Math.max(140, computeRidgeCount(lastFrostTotalHeight, ridgeSpacing, 3) * 20);
          // Same floor reasoning as Ribbon Wrap just above, but the gap
          // this closes is much bigger here: Ridge Comb's own ridgeAmplitude
          // (0.07) plus its own angular wobble (buildTexturedButtercream-
          // Geometry's 0.01+0.006, ~0.016 worst case) tops out at ~0.086 —
          // a full ~0.026 past the old 0.06 default. That deficit is what
          // read as the Ridge Comb texture visibly poking through the
          // glaze in a jagged/toothed line along every carve edge (the
          // "hugging" bulge that covers it everywhere else fades to
          // exactly 0 right at that edge, on purpose — see edgeFadeDist
          // below — so only a flat coatThickness floor is left to cover
          // the ridge there, and 0.06 was never big enough to). 0.1 clears
          // the ~0.086 worst case with real margin, same margin philosophy
          // as Ribbon Wrap's 0.08 above and Vertical Piping's 0.115.
          // texturedButtercreamGlazeThicknessBoost then scales that 0.1 up
          // by another 50% on top, same as the other two branches.
          coatThickness = 0.1 * texturedButtercreamGlazeThicknessBoost;
        }
        if (ridgeProfileFn && !carve.wave) {
          // Long Drips / Long & Short Drips / Short Drips carve so
          // dramatically (a single column can go from nearly full
          // coverage to nearly none within a handful of neighboring
          // columns) that this used to read as wrinkled along every
          // carved edge. That was never really an edge-fade-strength
          // problem, though — buildGlazeGeometry sampled each column's
          // rows as a fraction of THAT column's own (angle-dependent)
          // depth, so mesh-adjacent columns near a drip tip (where depth
          // changes fastest) were sampling ridgeProfileFn at very
          // different, uncorrelated absolute heights and then stitching
          // those together as if they matched. Dialing ridgeHugStrength
          // down (or off) only ever masked that misalignment, it didn't
          // fix it. buildGlazeGeometry now samples every column against
          // the same absolute height grid, so the root cause is gone and
          // full-strength hugging is safe here again — only the taper
          // right at each column's own cut edge (a separate, legitimate
          // concern: an abruptly-sliced ridge looks odd) still needs
          // tuning, via edgeFadeDist below.
          edgeFadeDist = ridgeSpacing * edgeFadeCycles;
        }
      } else if (fillingPipingTip === 'mashedCircles' || fillingPipingTip === 'mashedSwirls') {
        // True hugging for the Naked-cake case where the exposed Filling
        // edge has Mashed Circles/Mashed Swirls piping active —
        // fillingPipingTip is only ever non-null when exteriorFinishStyle
        // is already 'naked' (regionsHidden nulls it out otherwise, see
        // configAdapter.js), so no separate style check is needed here.
        //
        // Unlike Ridge Comb/Ribbon Wrap, this isn't a repeating pattern
        // across the whole tier height — buildMashedCircleFillingGeometry
        // (spongeGeometry.js) builds ONE localized bump band per filling
        // layer, centered on that layer's own Y and only FILLING_H tall.
        //
        // This reproduces that mesh's own displacement formula exactly —
        // bumpF/bumpIndex/dome/signedBulge/vEnv, even the diagonalSlashes
        // groove for Mashed Swirls — rather than an angle-uniform
        // approximation. frostingGeometry.js's buildGlazeGeometry now
        // calls ridgeProfileFn(y, angle) (angle added there specifically
        // for this; existing Y-only callers like Ridge Comb's
        // makeRidgeProfileFn output just ignore the extra argument), so a
        // bump that's really there at this angle bulges the glaze out to
        // match it, a valley between bumps dips the glaze in correctly,
        // and flat cake between bands stays untouched — not one shared
        // "is there roughly a bump around here" value smeared uniformly
        // around the whole circumference.
        //
        // The one piece this still can't do anything about: buildGlazeGeo
        // metry's own angular sampling (`segments`) is sized off the CARVE
        // pattern's lobe count, not off bumpCount — so a very high
        // bumpCount relative to a low-lobe-count pattern could sample a
        // given bump a bit coarsely. That's a resolution ceiling in
        // buildGlazeGeometry itself, not something this profile function
        // can compensate for.
        const meshBaseRadius = lastRadius * 0.95;

        ridgeProfileFn = makeFillingBandHugFn(lastFillingBands, lastFrostMeshY, meshBaseRadius, FILLING_H);
        // Default sideSamples (48) spreads evenly across the WHOLE tier
        // height — with FILLING_H typically a small slice of that, most
        // samples would land outside every band and the bump could go
        // completely unsampled. This guarantees at least ~10 samples
        // across each band's own height, regardless of how the two
        // heights relate for a given cake size.
        sideSamples = Math.max(140, Math.ceil((lastFrostTotalHeight / FILLING_H) * 10));
        // coatThickness stays a normal, small, uniform coat thickness
        // (same scale as Ribbon Wrap's own 0.08 above) — it's the
        // baseline for the ENTIRE glaze surface, not just the piping
        // band, so sizing it off the bump's own worst-case peak (like
        // Ridge Comb's floor-at-the-edge logic does) would float the
        // whole glaze visibly away from the flat cake everywhere else,
        // which is exactly the earlier bug this replaced.
        //
        // Known tradeoff: right at a carve edge (where edgeFadeDist
        // tapers the hugging bulge above to 0), only this small
        // coatThickness is left to cover a peak that happens to fall
        // there, so a thin sliver of piping could still poke through in
        // that narrow edge zone specifically — everywhere else, the
        // hugging above is now exact, not an approximation, so this is a
        // much smaller and rarer residual case than before.
        coatThickness = 0.08;
      }

      // Layer ordering (per latest direction): Filling Piping Design <
      // Glaze < Side Tab < Center Tab < Edge Tab, inner to outer — Glaze
      // is no longer the outermost layer, it sits just outside Filling
      // but INSIDE Side/Center/Edge now. Side Tab clearing Glaze (not the
      // reverse) is handled at sideDecorStandoff/sideDecorationRadius's
      // own declarations above instead — see the comment there for the
      // matching glazeMaxProtrusion this replaced.

      const glazeGeo = buildGlazeGeometry(
        lastRadius + (lastHasFrosting ? 0.06 : 0),
        lastFrostTotalHeight,
        lastFrostDomeH,
        rand,
        {
          coatThickness, ridgeProfileFn, sideSamples, carve, ridgeHugStrength, edgeFadeDist,
          // lastActiveSideCoverageFn (checkerCoverageFn etc.'s own
          // returned wrapper) expects "absoluteY", converting internally
          // via absoluteY - (currentY + height/2) — see checkerOriginY's
          // own definition above. buildGlazeGeometry's `y` is already
          // tier-base-relative (0 at this tier's own base — the mesh
          // itself gets positioned at lastCurrentY afterward, same as
          // glaze.position.y = descriptor.currentY further below), so
          // the correct absoluteY here is lastCurrentY + y. (An earlier
          // version of this subtracted lastHeight/2 instead, which
          // double-applied the wrapper's own centering and silently
          // shifted every sampled row down by half a tier's height —
          // harmless-looking for interior rows, but it pushed the
          // bottom-most row's query below row 0 entirely, always
          // reading as "nothing here" regardless of what was actually
          // there.)
          //
          // Math.PI/2 - angle: lastActiveSideCoverageFn internally
          // applies this exact reflection to convert FILLING's angle
          // convention into the checker/triangle mesh's native one (see
          // checkerCoverageFn's own comment/definition above). Glaze's
          // raw angle already matches the mesh's native convention (same
          // Math.cos(angle)/Math.sin(angle) placement buildCheckerSideSquares
          // itself uses) — feeding it straight into that wrapper without
          // this counter-reflection first was a separate earlier bug: a
          // reflection has a fixed point (here, near angle === π/4), so
          // results looked approximately right near that point and
          // increasingly wrong further from it. Since a reflection is
          // its own inverse, applying the same Math.PI/2 - angle here
          // cancels the wrapper's own reflection back out to the correct
          // raw angle.
          // Origin is the glaze mesh's own position (lastFrostMeshY), NOT
          // lastCurrentY: they are identical on a Naked tier, but a frosted
          // tier's shell (and this glaze copy of it) sits lower by
          // FROST_CAP_H + tierSeamOverlap, which would otherwise shift
          // every window down relative to the Side decoration.
          coverageFn: lastActiveSideCoverageFn
            ? (angle, y) => {
                if (interiorPreview && overallClipConfig.side.planes?.length) {
                  if (!isAngleUnclippedByPlanes(angle, overallClipConfig.side.planes, overallClipConfig.side.clipIntersection)) {
                    return 0;
                  }
                }
                return lastActiveSideCoverageFn(Math.PI / 2 - angle, lastFrostMeshY + y);
              }
            : undefined,
        },
      );
      const glazeMat = makeGlazeMaterial(surfaceTreatmentColorHex);
      glazeMat.clippingPlanes = overallClipConfig.drip.planes;
      glazeMat.clipIntersection = overallClipConfig.drip.clipIntersection;
      glazeMat.clipShadows = true;
      coveringMaterialsRef.current.push(glazeMat);
      const glaze = new THREE.Mesh(glazeGeo, glazeMat);
      glaze.position.y = lastFrostMeshY;
      glaze.castShadow = true;
      group.add(glaze);
    }

    // Individual layer design: Glaze is a real treatment on each selected
    // tier, rather than one coat copied from the topmost tier. The detailed
    // texture-hugging path above remains the Uniform path; individual coats
    // use the same geometry with each tier's own dimensions and selection.
    if (isIndividual) {
      for (const descriptor of layerGlazeDescriptors) {
        if (descriptor.mode !== 'glaze') continue;

        const carve = GLAZE_PATTERN_CARVES[descriptor.pattern] || GLAZE_PATTERN_CARVES.longGaps;
        const tierGlazeOptions = getTierGlazeProfileOptions({
          descriptor,
          exteriorFinishStyle,
          buttercreamTexture,
          fillingPipingTip,
          fillingHeight: FILLING_H,
          carve,
        });
        const tierClipConfig = getInteriorPreviewClippingConfig({
          hasFrosting: Boolean(descriptor.hasFrosting),
          hasDrip: true,
          hasSide: Boolean(descriptor.sideDecor),
          interiorPreview,
        });
        const glazeGeo = buildGlazeGeometry(
          descriptor.radius + (descriptor.hasFrosting ? 0.06 : 0),
          descriptor.totalHeight,
          descriptor.domeHeight,
          rand,
          {
            carve,
            ...tierGlazeOptions,
            // This descriptor's OWN tier's coverage, not the topmost
            // tier's — see the coverageFn field added where
            // layerGlazeDescriptors is built. descriptor.frostMeshY + y
            // (not y - descriptor.height/2, an earlier version's mistake
            // that double-centered against the wrapper's own internal
            // centering — see the topmost-tier call's full comment for
            // why) gives the correct world-space absoluteY the wrapper
            // expects. Math.PI/2 - angle: see the matching comment on
            // the topmost-tier buildGlazeGeometry call above —
            // descriptor.coverageFn is the SAME Filling-angle-adapted
            // wrapper, needing the same counter-reflection to correctly
            // read Glaze's raw angle.
            coverageFn: descriptor.coverageFn
              ? (angle, y) => {
                  if (interiorPreview && tierClipConfig.side.planes?.length) {
                    if (!isAngleUnclippedByPlanes(angle, tierClipConfig.side.planes, tierClipConfig.side.clipIntersection)) {
                      return 0;
                    }
                  }
                  return descriptor.coverageFn(Math.PI / 2 - angle, descriptor.frostMeshY + y);
                }
              : undefined,
          },
        );
        const glazeMat = makeGlazeMaterial(descriptor.color);
        glazeMat.clippingPlanes = tierClipConfig.drip.planes;
        glazeMat.clipIntersection = tierClipConfig.drip.clipIntersection;
        glazeMat.clipShadows = true;
        coveringMaterialsRef.current.push(glazeMat);
        const glaze = new THREE.Mesh(glazeGeo, glazeMat);
        glaze.position.y = descriptor.frostMeshY;
        glaze.castShadow = true;
        group.add(glaze);
      }
    }

    // Uniform mode applies the same Glaze selection to every tier. The
    // existing detailed mesh above is retained for the top tier; add the
    // lower tiers here with their own dimensions and positions.
    if (!isIndividual && surfaceTreatmentMode === 'glaze' && layerGlazeDescriptors.length > 1) {
      for (const descriptor of layerGlazeDescriptors.slice(0, -1)) {
        const carve = GLAZE_PATTERN_CARVES[descriptor.pattern] || GLAZE_PATTERN_CARVES.longGaps;
        const tierGlazeOptions = getTierGlazeProfileOptions({
          descriptor,
          exteriorFinishStyle,
          buttercreamTexture,
          fillingPipingTip,
          fillingHeight: FILLING_H,
          carve,
        });
        const glazeGeo = buildGlazeGeometry(
          descriptor.radius + (descriptor.hasFrosting ? 0.06 : 0),
          descriptor.totalHeight,
          descriptor.domeHeight,
          rand,
          {
            carve,
            ...tierGlazeOptions,
            // Same fixes as the other two buildGlazeGeometry call sites
            // above — see the topmost-tier one's full comment for both
            // the descriptor.currentY + y (not y - descriptor.height/2)
            // and Math.PI/2 - angle reasoning.
            coverageFn: descriptor.coverageFn
              ? (angle, y) => {
                  if (interiorPreview && overallClipConfig.side.planes?.length) {
                    if (!isAngleUnclippedByPlanes(angle, overallClipConfig.side.planes, overallClipConfig.side.clipIntersection)) {
                      return 0;
                    }
                  }
                  return descriptor.coverageFn(Math.PI / 2 - angle, descriptor.frostMeshY + y);
                }
              : undefined,
          },
        );
        const glazeMat = makeGlazeMaterial(descriptor.color);
        glazeMat.clippingPlanes = overallClipConfig.drip.planes;
        glazeMat.clipIntersection = overallClipConfig.drip.clipIntersection;
        glazeMat.clipShadows = true;
        coveringMaterialsRef.current.push(glazeMat);
        const glaze = new THREE.Mesh(glazeGeo, glazeMat);
        glaze.position.y = descriptor.frostMeshY;
        glaze.castShadow = true;
        group.add(glaze);
      }
    }

    // Note: "Top Only"'s checkered-top-squares block used to live here.
    // It's been removed — the 4th Checkered Pattern option is now
    // "Right Diagonal" (id 'rightDiagonal'), handled in the side-squares
    // block above alongside Full Pattern / Left Diagonal / X Pattern,
    // since it's a side-wall treatment, not a top-surface one.

    // Tuxedo set — uniform: top layer only; individual: each assigned layer
    const frostColor2 = FROSTING_COLORS[frostingColor] || FROSTING_COLORS.vanilla;

    // Interior Preview: Skip decorations, borders, drips, topper, and manual placement
    // Only show sponge, filling, and exterior finish
    if (!interiorPreview) {
      // Auto-scattered toppings
      if (toppings.includes('cherry')) {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const px = Math.cos(angle) * topRadius * 0.6;
          const pz = Math.sin(angle) * topRadius * 0.6;
          const py = getCakeTopSurfacePoint(px, pz, topMetricsRef.current).y - 0.04;
          addCherry(group, px, py, pz, rand);
        }
      }

      if (toppings.includes('sprinkles')) {
        const sprinkleColors = ['#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF', '#FF8B3D', '#C77DFF'];
        for (let i = 0; i < 80; i++) {
          const angle = rand() * Math.PI * 2;
          const r = rand() * topRadius * 0.85;
          const px = Math.cos(angle) * r;
          const pz = Math.sin(angle) * r;
          const py = getCakeTopSurfacePoint(px, pz, topMetricsRef.current).y + 0.02;
          const sGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.30, 6);
          const sprinkle = new THREE.Mesh(sGeo, new THREE.MeshStandardMaterial({ color: sprinkleColors[Math.floor(rand() * sprinkleColors.length)] }));
          sprinkle.position.set(px, py, pz);
          sprinkle.rotation.x = rand() * Math.PI;
          sprinkle.rotation.z = rand() * Math.PI;
          group.add(sprinkle);
        }
      }

      if (toppings.includes('candles')) {
        const candleCount = Math.min(layerCount + 2, 7);
        for (let i = 0; i < candleCount; i++) {
          const angle = (i / candleCount) * Math.PI * 2;
          const px = Math.cos(angle) * topRadius * 0.5;
          const pz = Math.sin(angle) * topRadius * 0.5;
          const py = getCakeTopSurfacePoint(px, pz, topMetricsRef.current).y - 0.02;
          addCandle(group, px, py, pz, rand);
        }
      }

      if (toppings.includes('strawberries')) {
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + 0.3;
          const px = Math.cos(angle) * topRadius * 0.55;
          const pz = Math.sin(angle) * topRadius * 0.55;
          const py = getCakeTopSurfacePoint(px, pz, topMetricsRef.current).y - 0.04;
          addStrawberry(group, px, py, pz);
        }
      }

      if (toppings.includes('chocolateChips')) {
        for (let i = 0; i < 40; i++) {
          const angle = rand() * Math.PI * 2;
          const r = rand() * topRadius * 0.8;
          const px = Math.cos(angle) * r;
          const pz = Math.sin(angle) * r;
          const py = getCakeTopSurfacePoint(px, pz, topMetricsRef.current).y - 0.02;
          addChocolateChip(group, px, py, pz);
        }
      }

      if (toppings.includes('rosettes')) {
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const px = Math.cos(angle) * topRadius * 0.7;
          const pz = Math.sin(angle) * topRadius * 0.7;
          const py = getCakeTopSurfacePoint(px, pz, topMetricsRef.current).y - 0.02;
          addRosette(group, px, py, pz, frostColor2);
        }
      }

      // Center > Decorations — shared adaptation helpers so every set
      // here (Floral Cluster, Ferrero Rocher, Hershey's Kisses, Oreo,
      // Chocolate Bear, Basketball, Soccer Ball) responds the same way to
      // the rest of the design instead of each hardcoding a flat Y and a
      // fixed absolute scale:
      //
      // 1. centerSurfaceY(x, z) — the topmost tier's top is a DOME, not a
      //    flat plane, whenever Exterior Finish adds a shell (Fully
      //    Frosted / Textured Buttercream both set a non-zero
      //    topLayerDomeHeight; Naked's is smaller/zero). A flat `topY`
      //    only matches the true surface height at the rim — anything
      //    placed nearer the center of the top needs the same
      //    "topLayerBaseY + dome bulge" formula the click-to-place items
      //    below (placedItems, doodles) already use, or it renders
      //    embedded in the frosting/glaze instead of resting on it. Glaze
      //    (Surface Treatment) mirrors the frosting shell's top exactly
      //    (see buildGlazeGeometry's call site above), so this formula
      //    already covers Glaze too without a separate case.
      // 2. centerDecorScale — these sets were modeled/tuned against a
      //    single-layer "big" (8×5) cake, i.e. topRadius === 4. Cake
      //    Structure's size (small/6×5 vs big/8×5) and layer count (the
      //    2nd tier is narrower than the 1st, per RADIUS_STEP above) both
      //    change topRadius, so scaling every mesh by
      //    topRadius/REFERENCE_TOP_RADIUS keeps them sized proportionally
      //    to whatever top tier they're actually sitting on, instead of
      //    staying pinned at their "big, 1 layer" size regardless of
      //    structure. REFERENCE_TOP_RADIUS === 4 means a big, 1-layer
      //    cake — the config these were originally tuned on — renders
      //    identically to before this change.
      const REFERENCE_TOP_RADIUS = 4;
      const centerDecorScale = topRadius / REFERENCE_TOP_RADIUS;
      const centerSurfaceY = (x, z) => {
        return getCakeTopSurfacePoint(x, z, topMetricsRef.current).y;
      };

      // Center > Decorations — 6-Variation Parametric Placement System
      // Spacing definitions per asset (scaled dynamically with centerDecorScale and topRadius)
      const DECORATION_SPACING = {
        floralCluster: 1.1,
        strawberry: 0.95,
        cherry: 0.85,
        fruitRing: 1.2,
        ferreroRocher: 1.1,
        hersheysKisses: 0.75,
        oreo: 1.9, // matches the corrected ~1.75in real diameter, plus a small gap
        chocolateBear: 1.32,
        basketball: 1.28,
        soccerball: 1.28,
      };
      // Buttercream Text letters (see buildAndAddDecoration's letter
      // branch) all share one approximate footprint per case rather than
      // 52 hand-tuned values -- at the 0.55 font size used there, most
      // single characters land in roughly the same size ballpark within
      // each case. Wide letters (M, W) will sit a little closer to their
      // neighbors than perfectly accurate and narrow ones (I, L) a little
      // farther -- close enough for collision purposes without measuring
      // every glyph's real rendered width. Lowercase gets a smaller
      // footprint than Uppercase since Pacifico's lowercase forms are
      // visibly smaller than its capitals at the same font size.
      for (let i = 0; i < 26; i++) {
        const ch = String.fromCharCode(65 + i);
        DECORATION_SPACING[`letterUpper${ch}`] = 0.7;
        DECORATION_SPACING[`letterLower${ch}`] = 0.55;
      }

      // ── Center's exclusive top-surface placement zone ───────────────────
      // Single constant boundary reserve (0.75 units) that all Center designs
      // strictly respect at all times. This permanently reserves the outer rim
      // for Edge designs, guaranteeing that if the user later selects or changes
      // an Edge design (piping, beaded trim, fruit rim rings, etc.), the edge
      // treatment will NEVER overlay or clash with already-placed Center designs.
      // No smart detector is needed on Edge designs because Center designs never
      // cross this fine line boundary.
      const centerPlacementBoundaryRadius = getCenterPlacementBoundaryRadius(topRadius);

      // Smart Detector: true physical footprint radii for Center items
      // Calibrated to the exact visual 3D mesh dimensions so that items sit
      // cleanly next to each other and never overlap, clash, or clip into each other.
      const centerItemRadii = {};
      Object.keys(CENTER_ITEM_RADII).forEach((designId) => {
        centerItemRadii[designId] = getCenterItemRadius(designId, centerDecorScale);
      });
      for (let i = 0; i < 26; i++) {
        const ch = String.fromCharCode(65 + i);
        centerItemRadii[`letterUpper${ch}`] = getCenterItemRadius(`letterUpper${ch}`, centerDecorScale);
        centerItemRadii[`letterLower${ch}`] = getCenterItemRadius(`letterLower${ch}`, centerDecorScale);
      }

      // ── Text-Aware Collision Bounds Calculation ─────────────────────────
      const isHandwritten = centerTextFont === 'handwritten';
      const activeFont = isHandwritten ? getHandwrittenFont() : getPacificoFont();

      const topStr = (centerTextTop || '').trim();
      const middleStr = (centerTextMiddle || '').trim();
      const bottomStr = (centerTextBottom || '').trim();
      const hasExplicitSlots = Boolean(
        centerTextTop !== undefined || centerTextMiddle !== undefined || centerTextBottom !== undefined
      );

      let activeTextSlots = [];
      const spacingRatio = typeof centerTextSpacing === 'number' ? centerTextSpacing : 0.28;

      if (hasExplicitSlots) {
        if (topStr) activeTextSlots.push({ line: topStr, zRatio: -spacingRatio });
        if (middleStr) activeTextSlots.push({ line: middleStr, zRatio: 0.00 });
        if (bottomStr) activeTextSlots.push({ line: bottomStr, zRatio: spacingRatio });
      } else if (centerText && centerText.trim()) {
        const lines = centerText.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length === 1) {
          activeTextSlots.push({ line: lines[0], zRatio: 0.00 });
        } else if (lines.length === 2) {
          activeTextSlots.push({ line: lines[0], zRatio: -spacingRatio * 0.65 });
          activeTextSlots.push({ line: lines[1], zRatio: spacingRatio * 0.65 });
        } else if (lines.length >= 3) {
          activeTextSlots.push({ line: lines[0], zRatio: -spacingRatio });
          activeTextSlots.push({ line: lines[1], zRatio: 0.00 });
          activeTextSlots.push({ line: lines[2], zRatio: spacingRatio });
        }
      }

      // Compute 2D collision bounding boxes for active text lines
      const computeActiveTextBounds = (slots, isScriptOrHand, rTop, decorPadding) => {
        const charW = isScriptOrHand ? 0.22 : 0.20;
        const lineH = isScriptOrHand ? 0.45 : 0.40;
        return slots.map((slot) => {
          const w = Math.max(0.8, slot.line.length * charW);
          const zAnchor = slot.zRatio * rTop;
          return {
            minX: -w / 2 - decorPadding,
            maxX: +w / 2 + decorPadding,
            minZ: zAnchor - lineH / 2 - decorPadding,
            maxZ: zAnchor + lineH / 2 + decorPadding,
          };
        });
      };

      const isScriptOrHand = isHandwritten || centerTextFont === 'default';
      const activeTextBounds = computeActiveTextBounds(activeTextSlots, isScriptOrHand, topRadius, 0.08);

      const edgeConfig = cakeConfig?.edge || { mode: edgeMode, top: edgeTop, bottom: edgeBottom, both: edgeBoth };
      const edgeObstacles = getEdgeDelicatesObstacles(edgeConfig, topRadius, exteriorFinishStyle);
      const delicatesBoundaryRadius = getDelicatesAwareBoundaryRadius(topRadius, edgeConfig, exteriorFinishStyle);
      const isDelicatesEdgeOnTop = edgeObstacles.length > 0;

      topMetricsRef.current = {
        ...topMetricsRef.current,
        centerDecorScale,
        centerPlacementBoundaryRadius: isDelicatesEdgeOnTop ? delicatesBoundaryRadius : centerPlacementBoundaryRadius,
        isFerreroRocherEdgeOnTop: isDelicatesEdgeOnTop,
        isDelicatesEdgeOnTop,
        edgeObstacles,
        activeTextBounds,
        centerItemRadii,
        // Place-tab items (cherry, strawberry, etc.) share Center's boundary
        // (same top surface, same edge-treatment clearance) but use their
        // own fixed radii, not scaled by centerDecorScale -- these items
        // keep their real-world size regardless of the Center decoration scale slider.
        placeItemRadii: PLACE_ITEM_RADII,
      };

      // Center decorations are now placed individually via click-and-drop
      // (see the placedItems loop below, 'center-' tagged items) rather
      // than an algorithmic preset pattern -- computeVariantPositions and
      // the old centerDecorationSetId/Variation/Orientation-driven block
      // that used to render here have been removed.

      const textSlots = activeTextSlots;
      if (textSlots.length > 0 && activeFont) {
        const textMat = getFrostingMaterial(centerTextColor, centerTextColorId);
        const textGroup = new THREE.Group();

        textSlots.forEach((slot) => {
          const textGeo = new TextGeometry(slot.line, {
            font: activeFont,
            size: isHandwritten ? 0.40 : 0.35,
            depth: 0.015,
            curveSegments: 8,
            bevelEnabled: true,
            bevelThickness: isHandwritten ? 0.03 : 0.025,
            bevelSize: isHandwritten ? 0.015 : 0.01,
            bevelSegments: 4,
          });
          textGeo.computeBoundingBox();
          const bbox = textGeo.boundingBox;
          const xOffset = -0.5 * (bbox.max.x - bbox.min.x);
          const yOffset = -slot.zRatio * topRadius;

          // Conform the text to the cake's domed surface
          const R = topRadius - 0.15; // Bevel size is 0.15
          const pos = textGeo.attributes.position;
          for (let v = 0; v < pos.count; v++) {
            const vx = pos.getX(v);
            const vy = pos.getY(v);
            const vz = pos.getZ(v);

            const worldX = vx + xOffset;
            const worldZ = -(vy + yOffset);
            const r = Math.sqrt(worldX * worldX + worldZ * worldZ);

            let heightAtR = topLayerBaseY;
            if (r < R) {
              heightAtR += topLayerDomeHeight * (1 - (r / R) * (r / R));
            }

            pos.setZ(v, vz + heightAtR);
          }
          textGeo.computeVertexNormals();

          const textMesh = new THREE.Mesh(textGeo, textMat);
          textMesh.position.set(xOffset, yOffset, 0);
          textMesh.castShadow = true;
          textMesh.receiveShadow = true;
          textGroup.add(textMesh);
        });

        textGroup.rotation.x = -Math.PI / 2;
        textGroup.position.set(0, 0, 0);
        group.add(textGroup);
      }

      // Edge > Decorations > Beaded Trim + Edge > Piping — colored by
      // Sugar Color's frostColor now (the per-slot pickers were removed)
      // — see the "Sugar Color applies everywhere outside Fundamentals"
      // pass. Uses lastFrostColor (see Floral Cluster's comment above)
      // since this runs after the per-layer loop where frostColor itself
      // is declared.
      //
      // This used to branch on edgeDesignSet into a separate, simpler
      // "Classic" path alongside this one — Classic (and the toggle
      // itself) has been deleted, this is the only Edge dispatch now.
      // + lastGlazeMaxProtrusion on every radius here — Edge Tab is
      // outermost per the Filling < Glaze < Side < Center < Edge
      // ordering (see the Surface Treatment > Glaze block's own comment),
      // so its ring needs to clear Glaze's own protrusion the same way
      // Side already does via sideDecorStandoff/sideDecorationRadius.
      // Applied uniformly to both Top and Bottom (not just Top, where
      // Glaze is actually built) for the same reason Side's clearance
      // doesn't special-case per carve pattern — the "Long Drips" pattern
      // alone can reach all the way to the base plate on a 1-tier cake,
      // and reproducing every pattern's exact reach here isn't worth it
      // for a few hundredths of a unit of extra clearance on the cases
      // where it doesn't.
      const edgeSlotsToRender = getEdgeSlotsToRender({
        edgeMode,
        edgeTop,
        edgeBottom,
        edgeBoth,
        topY,
        topRadius,
        baseRadius: BASE_RADIUS,
        glazeProtrusion: lastGlazeMaxProtrusion,
      });

      const BEADED_TRIM_PATTERNS = {
        beadedTrim: 'classic',
        beadedTrimTrio: 'trio',
        beadedTrimPetite: 'petite',
        beadedTrimGraduated: 'graduated',
        beadedTrimSpacer: 'spacer',
        beadedTrimGrand: 'grand',
        beadedTrimMorseDotDashDot: 'morseDotDashDot',
        beadedTrimMorseDotDash: 'morseDotDash',
        beadedTrimMorseDotDotDash: 'morseDotDotDash',
      };
      const FRUIT_RIM_BUILDERS = {
        strawberryRim: buildStrawberryRimRing,
        hersheysKissRim: buildHersheysKissRimRing,
        hersheysKissRimSparse: buildHersheysKissRimRingSparse,
        ferreroRocherRim: buildFerreroRocherRimRing,
        ferreroRocherRimSparse: buildFerreroRocherRimRingSparse,
        cherryRim: buildCherryRimRing,
        cherryRimSparse: buildCherryRimRingSparse,
        basketballRim: buildBasketballRimRing,
        soccerBallRim: buildSoccerBallRimRing,
      };
      for (const { slot, y, radius: edgeRadius, isBottom } of edgeSlotsToRender) {
        const baseTip = typeof slot?.pipingTip === 'string'
          ? slot.pipingTip.replace(/Alt$/, '').replace(/Cherry$/, '').replace(/Strawberry$/, '')
          : '';
        const isDollop = baseTip.toLowerCase().includes('dollop');
        const isWhippedCreamEdge = baseTip.startsWith('whippedCreamRosette');
        const isShell = ['shell', 'reverseShell', 'elongatedShell'].includes(baseTip);
        const isBead = baseTip === 'bead';
        const isZigzag = baseTip === 'zigzag';
        const isWavePiping = baseTip === 'wavePiping';
        const isRopeTwist = ['ropeTwist', 'ropeTwistClassic'].includes(baseTip);
        const beadedTrimPattern = BEADED_TRIM_PATTERNS[slot?.pipingTip];
        const fruitRimBuilder = FRUIT_RIM_BUILDERS[slot?.pipingTip];

        const decorationKind = beadedTrimPattern
          ? 'beadedTrim'
          : (fruitRimBuilder ? slot.pipingTip : (isWhippedCreamEdge ? baseTip : (isDollop ? baseTip : (isShell ? baseTip : (isBead ? 'bead' : (isZigzag ? 'zigzag' : (isWavePiping ? 'wavePiping' : (isRopeTwist ? baseTip : 'piping'))))))));
        const edgeTrimY = computeEdgeTrimY(y, edgeRadius, decorationKind, exteriorFinishStyle, isBottom);
        const edgeTrimRadius = computeEdgeTrimRadius(edgeRadius, decorationKind, exteriorFinishStyle, isBottom);
        if (beadedTrimPattern) {
          const trim = buildBeadedTrimRing(edgeTrimRadius, slot?.decorationColor || lastFrostColor, rand, { pattern: beadedTrimPattern });
          trim.position.y = edgeTrimY;
          group.add(trim);
        } else if (fruitRimBuilder) {
          const trim = fruitRimBuilder(edgeTrimRadius, edgeTrimY, rand, { isBottom });
          group.add(trim);
        } else if (slot?.pipingTip) {
          const isAltTip = typeof slot.pipingTip === 'string' && slot.pipingTip.includes('Alt');
          const pipingMat = getFrostingMaterial(slot?.pipingColor || lastFrostColor, slot?.pipingColorId);
          const secondaryMat = isAltTip
            ? getFrostingMaterial(slot?.pipingSecondaryColor || '#D6293E', slot?.pipingSecondaryColorId)
            : null;
          const edgePiping = buildPipingRing(slot.pipingTip, pipingMat, {
            radius: edgeTrimRadius,
            y: edgeTrimY,
            rand,
            scale: 3,
            secondaryMaterial: secondaryMat,
          });
          if (edgePiping) {
            edgePiping.receiveShadow = true;
            group.add(edgePiping);
          }
        }
      }

      // Edge > Middle (Layer 1 shelf design ring for 2-layer cakes).
      const activeMiddleSlot = edgeMiddle?.pipingTip ? edgeMiddle : (edgeMode === 'both' ? edgeBoth : null);
      if (layerCount >= 2 && activeMiddleSlot?.pipingTip) {
        const middleTip = activeMiddleSlot.pipingTip;
        const middleFruitRimBuilder = FRUIT_RIM_BUILDERS[middleTip];
        const middleBeadedPattern = BEADED_TRIM_PATTERNS[middleTip];

        const baseMiddleTip = typeof middleTip === 'string'
          ? middleTip.replace(/Alt$/, '').replace(/Cherry$/, '').replace(/Strawberry$/, '')
          : '';
        const isMiddleDollop = baseMiddleTip.toLowerCase().includes('dollop');
        const isMiddleWhippedCream = baseMiddleTip.startsWith('whippedCreamRosette');
        const isMiddleShell = ['shell', 'reverseShell', 'elongatedShell'].includes(baseMiddleTip);
        const isMiddleBead = baseMiddleTip === 'bead';
        const isMiddleZigzag = baseMiddleTip === 'zigzag';
        const isMiddleWave = baseMiddleTip === 'wavePiping';
        const isMiddleRope = ['ropeTwist', 'ropeTwistClassic'].includes(baseMiddleTip);

        const middleDecoKind = middleBeadedPattern
          ? 'beadedTrim'
          : (middleFruitRimBuilder ? middleTip : (isMiddleWhippedCream ? baseMiddleTip : (isMiddleDollop ? baseMiddleTip : (isMiddleShell ? baseMiddleTip : (isMiddleBead ? 'bead' : (isMiddleZigzag ? 'zigzag' : (isMiddleWave ? 'wavePiping' : (isMiddleRope ? baseMiddleTip : 'piping'))))))));

        const middleRadius = computeEdgeTrimRadius(topRadius + lastGlazeMaxProtrusion, middleDecoKind, exteriorFinishStyle, true);

        const middleY = middleFruitRimBuilder
          ? (ledgeY + 0.04)
          : middleBeadedPattern
          ? (ledgeY + 0.02)
          : (ledgeY + 0.03);

        if (middleBeadedPattern) {
          const middleTrim = buildBeadedTrimRing(
            middleRadius,
            activeMiddleSlot.pipingColor || lastFrostColor,
            rand,
            { pattern: middleBeadedPattern },
          );
          middleTrim.position.y = middleY;
          middleTrim.receiveShadow = true;
          group.add(middleTrim);
        } else if (middleFruitRimBuilder) {
          group.add(middleFruitRimBuilder(middleRadius, middleY, rand, { isBottom: true }));
        } else {
          const middlePipingMat = getFrostingMaterial(
            activeMiddleSlot.pipingColor || lastFrostColor,
            activeMiddleSlot.pipingColorId,
          );
          const isAltTip = typeof middleTip === 'string' && middleTip.includes('Alt');
          const secondaryMat = isAltTip
            ? getFrostingMaterial(
                activeMiddleSlot.pipingSecondaryColor || '#D6293E',
                activeMiddleSlot.pipingSecondaryColorId,
              )
            : null;
          const middlePiping = buildPipingRing(middleTip, middlePipingMat, {
            radius: middleRadius,
            y: middleY,
            rand,
            scale: 3,
            secondaryMaterial: secondaryMat,
          });
          if (middlePiping) {
            middlePiping.receiveShadow = true;
            group.add(middlePiping);
          }
        }
      }

      // Slot-placed and manually placed items (filtered against Edge Edible Delicates if active)
      const itemsToRender = isDelicatesEdgeOnTop
        ? pruneItemsCollidingWithEdgeDelicates(
            placedItems,
            edgeConfig,
            topRadius,
            centerDecorScale,
            exteriorFinishStyle
          )
        : placedItems;

      for (const item of itemsToRender) {
        let px, pz, py;
        const slot = item.slotId ? getSlotById(item.slotId) : null;
        if (slot) {
          // + lastGlazeMaxProtrusion — Center Tab is outer to Glaze per
          // the Filling < Glaze < Side < Center < Edge ordering (see the
          // Surface Treatment > Glaze block's own comment), same
          // clearance treatment Side and Edge already get.
          const pos = computeSlotPosition(slot, topRadius + lastGlazeMaxProtrusion);
          px = pos.x;
          pz = pos.z;
        } else {
          const dist = Math.sqrt((item.x || 0) * (item.x || 0) + (item.z || 0) * (item.z || 0));
          const clampedR = Math.min(dist, topRadius * 0.88);
          const angle = Math.atan2(item.z || 0, item.x || 0);
          px = Math.cos(angle) * clampedR;
          pz = Math.sin(angle) * clampedR;
        }

        const isCenter = item.type && item.type.startsWith('center-');
        const centerToolParsed = isCenter ? parseCenterTool(item.type) : null;

        const itemGroup = new THREE.Group();
        itemGroup.userData.slotId = item.slotId || null;
        itemGroup.userData.placedItemId = item.id || null;
        itemGroup.userData.itemType = item.type || null;

        if (item.type === 'piping') {
          const pipeColor = (item.colorId && SUGAR_COLORS.find(c => c.id === item.colorId)?.hex) || PIPING_FLAVOR_COLORS[item.flavor] || '#FFAB00';
          py = getCakeTopSurfacePoint(px, pz, topMetricsRef.current).y - 0.015;
          addPipingPattern(itemGroup, px, py, pz, item.pattern || 'shell', pipeColor);
        } else if (item.type === 'cherry') {
          py = getCakeTopSurfacePoint(px, pz, topMetricsRef.current).y - 0.045;
          addCherry(itemGroup, px, py, pz, rand);
        } else if (item.type === 'strawberry') {
          py = getCakeTopSurfacePoint(px, pz, topMetricsRef.current).y - 0.045;
          addStrawberry(itemGroup, px, py, pz);
        } else if (item.type === 'candle') {
          py = getCakeTopSurfacePoint(px, pz, topMetricsRef.current).y - 0.02;
          addCandle(itemGroup, px, py, pz, rand);
        } else if (item.type === 'chocolateChip') {
          py = getCakeTopSurfacePoint(px, pz, topMetricsRef.current).y - 0.02;
          addChocolateChip(itemGroup, px, py, pz);
        } else if (item.type === 'rosette') {
          const roseColor = (item.colorId && SUGAR_COLORS.find(c => c.id === item.colorId)?.hex) || frostColor2;
          py = getCakeTopSurfacePoint(px, pz, topMetricsRef.current).y - 0.025;
          addRosette(itemGroup, px, py, pz, roseColor);
        } else if (item.type && item.type.startsWith('doodle-')) {
          const [_, shapeId, colorId] = item.type.split('-');
          addPremadeDoodle(itemGroup, px, topLayerBaseY, pz, topLayerDomeHeight, topRadius, shapeId, colorId, centerDecorationColor, item.rotation !== undefined ? item.rotation : 0);
        } else if (item.type && item.type.startsWith('center-')) {
          // Format: 'center-{designId}-{orientation}', e.g.
          // 'center-oreo-standing' or 'center-strawberry-default'.
          // designId itself never contains '-', so a plain split is safe.
          const { designId, orientation } = centerToolParsed;
          const tiltX = item.tiltX !== undefined ? item.tiltX : 0;
          const rotationY = item.rotation !== undefined ? item.rotation : 0;
          const tiltZ = item.tiltZ !== undefined ? item.tiltZ : 0;
          const itemColor = isButtercreamLetterDesign(designId)
            ? centerTextColor
            : centerDecorationColor;
          const itemColorId = isButtercreamLetterDesign(designId)
            ? (centerTextColorMode === 'individual' ? (item.colorId || item.sugarColor?.colorId) : centerTextColorId)
            : centerDecorationColorId;
          const resolvedItemColor = itemColorId
            ? (SUGAR_COLORS.find((color) => color.id === itemColorId)?.hex || itemColor)
            : itemColor;
          const rotatedGroup = buildRotatedDecoration(
            designId, orientation, tiltX, rotationY,
            centerDecorScale, resolvedItemColor, rand, tiltZ, itemColorId
          );
          py = getDecorationLandingY(rotatedGroup, px, pz, topMetricsRef.current);
          rotatedGroup.position.set(px, py, pz);
          itemGroup.add(rotatedGroup);
        }

        group.add(itemGroup);
      }
    }

    // Fixed baseline — bottom of the cake sits at y=0, cake rises upward.
    const baselineY = 0;
    if (baselineYRef.current === 0 || group.position.y !== baselineY) {
      group.position.y = baselineY;
      baselineYRef.current = baselineY;
    }

    // Update slot markers and ghost previews after build
    updateSlotVisuals();
    refreshSelectionOverlayRef.current?.();

    // Interior Preview's cutaway is now real geometric clipping, applied
    // directly to covering materials (currently just frostMat) at the point
    // they're created above — nothing left to do here.
  }, [cakeConfig, fontsReady]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#FFF5EE');
      scene.fog = new THREE.Fog('#FFF5EE', 40, 80);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 300);
      camera.position.set(0, 8, 22);
      camera.lookAt(0, 4, 0);
      cameraRef.current = camera;

      const thumbnailCamera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 300);
      thumbnailCamera.position.set(8, 6, 16);
      thumbnailCamera.lookAt(0, 4, 0);
      thumbnailCameraRef.current = thumbnailCamera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.localClippingEnabled = true;
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      // Make the canvas fill its container exactly — prevents CSS-stretch cropping
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const controls = new OrbitControls(camera, renderer.domElement);
      controlsRef.current = controls;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 8;
      controls.maxDistance = 45;
      controls.maxPolarAngle = Math.PI - 0.05;
      controls.target.set(0, 4, 0);
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      controls.update();

      scene.add(new THREE.AmbientLight('#FFFFFF', 0.35));
      const mainLight = new THREE.DirectionalLight('#FFFFFF', 1.2);
      mainLight.position.set(12, 20, 12);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      // Default orthographic shadow-camera frustum is only ±5 units —
      // too small for this cake (plate + decorations can span well beyond
      // that), which is what was clipping the shadow's silhouette before
      // it reached its full extent. Widened to comfortably cover the
      // largest cake + decorations this scene builds.
      mainLight.shadow.camera.left = -18;
      mainLight.shadow.camera.right = 18;
      mainLight.shadow.camera.top = 18;
      mainLight.shadow.camera.bottom = -18;
      mainLight.shadow.camera.near = 1;
      mainLight.shadow.camera.far = 60;
      mainLight.shadow.camera.updateProjectionMatrix();
      scene.add(mainLight);
      const fillLight = new THREE.DirectionalLight('#FFE4E1', 0.25);
      fillLight.position.set(-12, 8, -8);
      scene.add(fillLight);
      const rimLight = new THREE.DirectionalLight('#E8D4F0', 0.3);
      rimLight.position.set(0, 5, -15);
      scene.add(rimLight);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 60),
        new THREE.MeshStandardMaterial({ color: '#FFF0E6', roughness: 0.9 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.3;
      ground.receiveShadow = true;
      scene.add(ground);
      groundRef.current = ground;

      const cakeGroup = new THREE.Group();
      scene.add(cakeGroup);
      cakeGroupRef.current = cakeGroup;

      const slotsGroup = new THREE.Group();
      scene.add(slotsGroup);
      slotsGroupRef.current = slotsGroup;

      const ghostGroup = new THREE.Group();
      scene.add(ghostGroup);
      ghostGroupRef.current = ghostGroup;

      const selectionOverlayGroup = new THREE.Group();
      scene.add(selectionOverlayGroup);
      selectionOverlayGroupRef.current = selectionOverlayGroup;

      let isContextLost = false;
      const clock = new THREE.Clock();
      const animate = () => {
        if (isContextLost) return;
        animFrameRef.current = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        if (thumbnailMode) {
          camera.position.set(8, 6, 16);
          camera.lookAt(0, 4, 0);
          cakeGroup.rotation.set(0, 0, 0);
          cakeGroup.position.y = baselineYRef.current;
        } else {
          controls.update();
          cakeGroup.rotation.set(0, 0, 0);
          cakeGroup.position.y = baselineYRef.current;
        }

        try {
          renderer.render(scene, camera);
        } catch (err) {
          // Ignore render errors when WebGL context is lost
        }
      };
      animate();

      const handleResize = () => {
        if (!mount) return;
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (w === 0 || h === 0) return;
        const aspect = w / h;
        camera.aspect = aspect;

        // Auto-frame: Adjust camera FOV so the whole cake stays fully visible when viewport aspect narrows
        const baseFov = 40;
        const baseAspect = 1.6;
        if (aspect < baseAspect) {
          const fovRad = 2 * Math.atan(Math.tan((baseFov * Math.PI) / 360) * (baseAspect / aspect));
          camera.fov = Math.min(62, Math.max(35, (fovRad * 180) / Math.PI));
        } else {
          camera.fov = baseFov;
        }

        camera.updateProjectionMatrix();
        thumbnailCamera.aspect = aspect;
        thumbnailCamera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      handleResizeRef.current = handleResize;

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(mount);
      window.addEventListener('resize', handleResize);
      handleResize();

      const getMouseNDC = (clientX, clientY) => {
        const rect = mount.getBoundingClientRect();
        return {
          x: ((clientX - rect.left) / rect.width) * 2 - 1,
          y: -((clientY - rect.top) / rect.height) * 2 + 1,
        };
      };

      // Raw local (x,z) under the cursor, on the plane at top-surface
      // height -- shared by both the slot-snapping (Place tab) and
      // freeform (Center) placement paths below.
      const raycastLocalXZ = (clientX, clientY) => {
        if (!cameraRef.current || !cakeGroupRef.current) return null;
        const ndc = getMouseNDC(clientX, clientY);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, cameraRef.current);
        const { baseY = 0, domeHeight = 0, topY } = topMetricsRef.current;
        // Use realistic top surface height (accounting for dome bump) to align raycasts accurately
        const surfaceLevel = domeHeight > 0 ? baseY + domeHeight * 0.5 : (topY ?? baseY);
        const planeY = cakeGroupRef.current.position.y + surfaceLevel;
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
        const hit = new THREE.Vector3();
        const hitResult = raycaster.ray.intersectPlane(plane, hit);
        if (!hitResult) return null;
        const localHit = cakeGroupRef.current.worldToLocal(hit.clone());
        return { x: localHit.x, z: localHit.z };
      };

      const clearSelectionOverlay = () => {
        const overlay = selectionOverlayGroupRef.current;
        if (!overlay) return;
        while (overlay.children.length > 0) {
          const child = overlay.children[0];
          disposeSceneObject(child);
          overlay.remove(child);
        }
      };

      const findSelectableItemAt = (clientX, clientY) => {
        if (!cameraRef.current || !cakeGroupRef.current) return null;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(getMouseNDC(clientX, clientY), cameraRef.current);
        const hits = raycaster.intersectObjects(cakeGroupRef.current.children, true);
        for (const hit of hits) {
          let current = hit.object;
          while (current) {
            if (current.userData?.placedItemId && current.userData.itemType?.startsWith('center-')) {
              return { id: current.userData.placedItemId, group: current };
            }
            current = current.parent;
          }
        }
        return null;
      };

      const updateSelectionOverlay = (clientX = lastMousePosRef.current.x, clientY = lastMousePosRef.current.y) => {
        const overlay = selectionOverlayGroupRef.current;
        if (!overlay) return null;
        clearSelectionOverlay();
        if (activeToolRef.current || cakeConfigRef.current?.interiorPreview) {
          renderer.domElement.style.cursor = '';
          return null;
        }

        const hovered = findSelectableItemAt(clientX, clientY);
        const selected = selectedCenterItemIdRef.current
          ? findSelectableItemAtForId(selectedCenterItemIdRef.current)
          : null;
        if (hovered?.group) {
          const hoverHelper = new THREE.BoxHelper(hovered.group, '#F6A6C1');
          hoverHelper.material.depthTest = false;
          hoverHelper.material.depthWrite = false;
          hoverHelper.material.transparent = true;
          hoverHelper.material.opacity = 0.55;
          overlay.add(hoverHelper);
        }
        if (selected?.group && selected.id !== hovered?.id) {
          const selectedHelper = new THREE.BoxHelper(selected.group, '#F04F87');
          selectedHelper.material.depthTest = false;
          selectedHelper.material.depthWrite = false;
          selectedHelper.material.transparent = true;
          selectedHelper.material.opacity = 0.95;
          overlay.add(selectedHelper);
        }
        renderer.domElement.style.cursor = hovered ? 'pointer' : '';
        return hovered?.id || null;
      };

      const findSelectableItemAtForId = (itemId) => {
        if (!cakeGroupRef.current) return null;
        let match = null;
        cakeGroupRef.current.traverse((object) => {
          if (!match && object.userData?.placedItemId === itemId && object.userData?.itemType?.startsWith('center-')) {
            match = { id: itemId, group: object };
          }
        });
        return match;
      };
      refreshSelectionOverlayRef.current = () => updateSelectionOverlay();

      // A small fixed gap enforced between any two freeform items' edges --
      // Smart Collision Detector:
      // Reads the true physical geometric footprint of each item (circles for spherical
      // items, oriented bounding boxes for standing Oreos & letters).
      // Acknowledges all available free distance and allows tight placement in available
      // space without penetrating or clashing with neighboring items.
      const resolveCenterDrop = (designId, orientation, x, z, rotation = 0, tiltX = 0, tiltZ = 0) => {
        const placedItems = cakeConfigRef.current?.placedItems || [];
        const limit = getCenterItemLimit(designId);
        if (limit !== null && getCenterItemCount(placedItems, designId) >= limit) {
          return { x, z, valid: false, reason: 'limit' };
        }

        const centerDecorScale = topMetricsRef.current?.centerDecorScale ?? 1;
        const candidateToolType = `center-${designId}-${orientation || 'default'}`;
        const candidateFp = getItemFootprint({ type: candidateToolType, x, z, rotation, tiltX, tiltZ }, centerDecorScale);

        const { centerPlacementBoundaryRadius, radius, edgeObstacles = [], activeTextBounds = [] } = topMetricsRef.current || {};
        const boundaryR = centerPlacementBoundaryRadius ?? ((radius || 4) * 0.88);
        if (!isFootprintInBoundary(candidateFp, boundaryR, radius)) {
          return { x, z, valid: false, reason: 'boundary' };
        }

        for (const obs of edgeObstacles) {
          if (doFootprintsClash(candidateFp, obs, 0.02)) {
            return { x, z, valid: false, reason: 'edge-overlap' };
          }
        }

        if (isFootprintCollidingWithText(candidateFp, activeTextBounds)) {
          return { x, z, valid: false, reason: 'text-overlap' };
        }

        for (const item of placedItems) {
          if (!item?.type) continue;
          const otherFp = getItemFootprint(item, centerDecorScale);
          if (doFootprintsClash(candidateFp, otherFp, 0.01)) {
            return { x, z, valid: false, reason: 'overlap' };
          }
        }

        return { x, z, valid: true };
      };

      // Resolves a candidate Place-tab drop point (cherry, strawberry,
      // candle, chocolateChip, rosette, piping): checks boundary and overlap
      // against all items with true geometric footprints.
      const resolvePlaceItemDrop = (toolType, x, z) => {
        const centerDecorScale = topMetricsRef.current?.centerDecorScale ?? 1;
        const candidateFp = getItemFootprint({ type: toolType, x, z }, centerDecorScale);

        const { centerPlacementBoundaryRadius, radius, edgeObstacles = [], activeTextBounds = [] } = topMetricsRef.current || {};
        const boundaryR = centerPlacementBoundaryRadius ?? ((radius || 4) * 0.88);
        if (!isFootprintInBoundary(candidateFp, boundaryR, radius)) {
          return { x, z, valid: false, reason: 'boundary' };
        }

        for (const obs of edgeObstacles) {
          if (doFootprintsClash(candidateFp, obs, 0.02)) {
            return { x, z, valid: false, reason: 'edge-overlap' };
          }
        }

        if (isFootprintCollidingWithText(candidateFp, activeTextBounds)) {
          return { x, z, valid: false, reason: 'text-overlap' };
        }

        const placedItems = cakeConfigRef.current?.placedItems || [];
        for (const item of placedItems) {
          if (!item?.type) continue;
          const otherFp = getItemFootprint(item, centerDecorScale);
          if (doFootprintsClash(candidateFp, otherFp, 0.01)) {
            return { x, z, valid: false, reason: 'overlap' };
          }
        }

        return { x, z, valid: true };
      };

      const detectHoveredSlot = (clientX, clientY) => {
        if (!activeToolRef.current || !cameraRef.current || !cakeGroupRef.current) return null;
        const local = raycastLocalXZ(clientX, clientY);
        if (!local) return null;
        const { radius } = topMetricsRef.current;
        let closestSlot = null;
        let minDistSq = Infinity;
        for (const slot of TOP_SURFACE_SLOTS) {
          const pos = computeSlotPosition(slot, radius);
          const dx = local.x - pos.x;
          const dz = local.z - pos.z;
          const dSq = dx * dx + dz * dz;
          if (dSq < 0.60 && dSq < minDistSq) {
            minDistSq = dSq;
            closestSlot = slot;
          }
        }
        return closestSlot;
      };

      const tryPlace = (clientX, clientY) => {
        if (!activeToolRef.current || cakeConfigRef.current?.interiorPreview) return;
        const tool = activeToolRef.current;
        const toolType = typeof tool === 'object' ? tool.type : tool;

        if (isCenterTool(toolType)) {
          const { designId, orientation } = parseCenterTool(toolType);
          const rotationY = typeof tool === 'object' ? (tool.rotationY || 0) : 0;
          const rotationX = typeof tool === 'object' ? (tool.rotationX || 0) : 0;
          const rotationZ = typeof tool === 'object' ? (tool.rotationZ || 0) : 0;
          const rotationRad = THREE.MathUtils.degToRad(rotationY);
          const tiltXRad = THREE.MathUtils.degToRad(rotationX);
          const tiltZRad = THREE.MathUtils.degToRad(rotationZ);

          // If the user clicked where the ghost indicator was actively showing green,
          // prefer that exact valid position to prevent mouse-release micro-jitter
          // (especially at shallow camera angles where a 1px twitch shifts raycasts)
          let resolved = null;
          const cached = lastValidGhostDropRef.current;
          if (
            cached &&
            cached.toolType === toolType &&
            Math.hypot(cached.clientX - clientX, cached.clientY - clientY) < 35
          ) {
            resolved = resolveCenterDrop(designId, orientation, cached.x, cached.z, rotationRad, tiltXRad, tiltZRad);
          }

          if (!resolved || !resolved.valid) {
            const local = raycastLocalXZ(clientX, clientY);
            if (!local) return;
            resolved = resolveCenterDrop(designId, orientation, local.x, local.z, rotationRad, tiltXRad, tiltZRad);
          }

          if (!resolved.valid) {
            onPlacementBlockedRef.current?.(resolved.reason || 'overlap');
            return; // hard block (out of bounds or overlaps another item or at max limit) -- snap back, no-op
          }
          const placedItems = cakeConfigRef.current?.placedItems || [];
          const currentCount = getCenterItemCount(placedItems, designId);
          const limit = getCenterItemLimit(designId);
          const isLetter = isButtercreamLetterDesign(designId);
          const letterColorId = cakeConfigRef.current?.centerTextColorId || 'vanilla';
          const isFlavor = ['vanilla', 'chocolate', 'strawberry', 'cheese', 'ube', 'mocha'].includes(letterColorId);
          const letterSugarColor = {
            mode: isFlavor ? 'default' : 'colorOverride',
            colorId: letterColorId,
          };

          onPlaceRef.current?.({
            type: toolType,
            x: resolved.x,
            z: resolved.z,
            rotation: THREE.MathUtils.degToRad(rotationY),
            tiltX: THREE.MathUtils.degToRad(rotationX),
            tiltZ: THREE.MathUtils.degToRad(rotationZ),
            colorId: isLetter ? letterColorId : undefined,
            sugarColor: isLetter ? letterSugarColor : undefined,
          });

          lastValidGhostDropRef.current = null;

          if (limit !== null && currentCount + 1 >= limit) {
            onSelectToolRef.current?.(null);
          }
          return;
        }

        if (isPlaceItemTool(toolType)) {
          let resolved = null;
          const cached = lastValidGhostDropRef.current;
          if (
            cached &&
            cached.toolType === toolType &&
            Math.hypot(cached.clientX - clientX, cached.clientY - clientY) < 35
          ) {
            resolved = resolvePlaceItemDrop(toolType, cached.x, cached.z);
          }

          if (!resolved || !resolved.valid) {
            const local = raycastLocalXZ(clientX, clientY);
            if (!local) return;
            resolved = resolvePlaceItemDrop(toolType, local.x, local.z);
          }

          if (!resolved.valid) {
            onPlacementBlockedRef.current?.(resolved.reason || 'overlap');
            return; // hard block (out of bounds or overlaps another item) -- snap back, no-op
          }
          onPlaceRef.current?.({
            type: toolType,
            x: resolved.x,
            z: resolved.z,
            flavor: tool?.flavor || 'vanilla',
            pattern: tool?.pattern || 'shell',
            colorId: tool?.colorId || 'vanilla',
          });

          lastValidGhostDropRef.current = null;
          return;
        }

        const slot = detectHoveredSlot(clientX, clientY);
        if (slot) {
          const pos = computeSlotPosition(slot, topMetricsRef.current.radius);
          onPlaceRef.current?.({
            slotId: slot.id,
            type: toolType,
            x: pos.x,
            z: pos.z,
            flavor: tool?.flavor || 'vanilla',
            pattern: tool?.pattern || 'shell',
            colorId: tool?.colorId || 'vanilla',
          });
        }
      };

      const updateCenterGhost = (clientX, clientY) => {
        const ghostGroup = ghostGroupRef.current;
        if (!ghostGroup) return;
        clearGhostGroup(ghostGroup);
        if (cakeConfigRef.current?.interiorPreview) return;
        const tool = activeToolRef.current;
        if (!tool) return;
        const toolType = typeof tool === 'object' ? tool.type : tool;
        if (!isCenterTool(toolType)) return;
        const local = raycastLocalXZ(clientX, clientY);
        if (!local) return;
        const { designId, orientation } = parseCenterTool(toolType);
        const rotationDeg = typeof tool === 'object' ? (tool.rotationY || 0) : 0;
        const tiltDeg = typeof tool === 'object' ? (tool.rotationX || 0) : 0;
        const rollDeg = typeof tool === 'object' ? (tool.rotationZ || 0) : 0;
        const rotationRad = THREE.MathUtils.degToRad(rotationDeg);
        const tiltXRad = THREE.MathUtils.degToRad(tiltDeg);
        const tiltZRad = THREE.MathUtils.degToRad(rollDeg);
        // resolved.x/z always equal the raw cursor position (raycastLocalXZ
        // above) regardless of resolved.valid -- only the drop itself
        // (tryPlace) is blocked on invalid, not the hover preview. That's
        // what lets the ghost freely hover over a spot that's too close to
        // another item or past the edge, tinted red, rather than being
        // yanked back to the last valid spot.
        const resolved = resolveCenterDrop(designId, orientation, local.x, local.z, rotationRad, tiltXRad, tiltZRad);
        const { centerDecorScale } = topMetricsRef.current;
        const scale = centerDecorScale ?? 1;

        if (resolved.valid) {
          lastValidGhostDropRef.current = {
            toolType,
            x: resolved.x,
            z: resolved.z,
            clientX,
            clientY,
          };
        } else {
          lastValidGhostDropRef.current = null;
        }

        // Real mesh preview, not a placeholder shape -- same
        // buildRotatedDecoration used by the actual placed render below,
        // so what you see here is exactly what you get on drop, rotation
        // included.
        const rotatedGroup = buildRotatedDecoration(
          designId, orientation,
          THREE.MathUtils.degToRad(tiltDeg), THREE.MathUtils.degToRad(rotationDeg),
          scale,
          isButtercreamLetterDesign(designId)
            ? cakeConfigRef.current?.centerTextColor || '#F6DEAB'
            : cakeConfigRef.current?.centerDecorationColor || '#F6DEAB',
          Math.random,
          THREE.MathUtils.degToRad(rollDeg),
          isButtercreamLetterDesign(designId)
            ? cakeConfigRef.current?.centerTextColorId
            : cakeConfigRef.current?.centerDecorationColorId
        );
        const y = getDecorationLandingY(rotatedGroup, resolved.x, resolved.z, topMetricsRef.current);
        rotatedGroup.position.set(resolved.x, y, resolved.z);
        tintAsGhost(rotatedGroup, resolved.valid);
        ghostGroup.add(rotatedGroup);
      };

      const updatePlaceItemGhost = (clientX, clientY) => {
        const ghostGroup = ghostGroupRef.current;
        if (!ghostGroup) return;
        clearGhostGroup(ghostGroup);
        if (cakeConfigRef.current?.interiorPreview) return;
        const tool = activeToolRef.current;
        if (!tool) return;
        const toolType = typeof tool === 'object' ? tool.type : tool;
        if (!isPlaceItemTool(toolType)) return;
        const local = raycastLocalXZ(clientX, clientY);
        if (!local) return;
        // See updateCenterGhost's comment above -- resolved.x/z always
        // track the raw cursor, resolved.valid only affects the tint.
        const resolved = resolvePlaceItemDrop(toolType, local.x, local.z);
        if (resolved.valid) {
          lastValidGhostDropRef.current = {
            toolType,
            x: resolved.x,
            z: resolved.z,
            clientX,
            clientY,
          };
        } else {
          lastValidGhostDropRef.current = null;
        }

        const surfacePt = getCakeTopSurfacePoint(resolved.x, resolved.z, topMetricsRef.current);
        const surfaceY = surfacePt.y - 0.015;

        const ghostContainer = new THREE.Group();
        const ghostRand = makePRNG(12345);
        if (toolType === 'cherry') {
          addCherry(ghostContainer, resolved.x, surfaceY, resolved.z, ghostRand);
        } else if (toolType === 'strawberry') {
          addStrawberry(ghostContainer, resolved.x, surfaceY, resolved.z);
        } else if (toolType === 'candle') {
          addCandle(ghostContainer, resolved.x, surfaceY, resolved.z, ghostRand);
        } else if (toolType === 'chocolateChip') {
          addChocolateChip(ghostContainer, resolved.x, surfaceY, resolved.z);
        } else if (toolType === 'rosette') {
          const roseColor = tool?.colorId ? (SUGAR_COLORS.find(c => c.id === tool.colorId)?.hex || '#FF8BA7') : '#FF8BA7';
          addRosette(ghostContainer, resolved.x, surfaceY, resolved.z, roseColor);
        } else if (toolType === 'piping') {
          const pipeColor = tool?.colorId ? (SUGAR_COLORS.find(c => c.id === tool.colorId)?.hex || '#FFAB00') : '#FFAB00';
          addPipingPattern(ghostContainer, resolved.x, surfaceY, resolved.z, tool?.pattern || 'shell', pipeColor);
        }

        tintAsGhost(ghostContainer, resolved.valid);
        ghostGroup.add(ghostContainer);
      };

      refreshGhostRef.current = () => {
        if (cakeConfigRef.current?.interiorPreview) {
          if (ghostGroupRef.current) clearGhostGroup(ghostGroupRef.current);
          return;
        }
        const tool = activeToolRef.current;
        if (!tool) return; // typeof null === 'object' in JS -- must check this first, or the ternary below reads .type off null
        const toolType = typeof tool === 'object' ? tool.type : tool;
        if (isCenterTool(toolType)) {
          updateCenterGhost(lastMousePosRef.current.x, lastMousePosRef.current.y);
        } else if (isPlaceItemTool(toolType)) {
          updatePlaceItemGhost(lastMousePosRef.current.x, lastMousePosRef.current.y);
        }
      };

      const handleMouseDown = (e) => {
        if (disabledRef.current || e.button !== THREE.MOUSE.LEFT) return;
        mouseRef.current.isDown = true;
        mouseRef.current.moved = false;
        mouseRef.current.prevX = e.clientX;
        mouseRef.current.prevY = e.clientY;
      };

      const handleMouseMove = (e) => {
        if (disabledRef.current || readOnlyRef.current) return;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        if (mouseRef.current.isDown) {
          const dx = e.clientX - mouseRef.current.prevX;
          const dy = e.clientY - mouseRef.current.prevY;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) mouseRef.current.moved = true;
          mouseRef.current.prevX = e.clientX;
          mouseRef.current.prevY = e.clientY;
        }

        if (cakeConfigRef.current?.interiorPreview) {
          if (ghostGroupRef.current) clearGhostGroup(ghostGroupRef.current);
          clearSelectionOverlay();
          renderer.domElement.style.cursor = '';
          return;
        }

        // Armed tools get their placement ghost; with nothing armed, hover
        // outlines selectable placed Text items instead.
        if (activeToolRef.current) {
          const tool = activeToolRef.current;
          const toolType = typeof tool === 'object' ? tool.type : tool;
          if (isCenterTool(toolType)) {
            updateCenterGhost(e.clientX, e.clientY);
          } else if (isPlaceItemTool(toolType)) {
            updatePlaceItemGhost(e.clientX, e.clientY);
          } else {
            const hovered = detectHoveredSlot(e.clientX, e.clientY);
            if (hovered?.id !== hoveredSlotRef.current?.id) {
              hoveredSlotRef.current = hovered;
              updateSlotVisuals();
            }
          }
        } else {
          updateSelectionOverlay(e.clientX, e.clientY);
        }
      };

      const handleMouseUp = (e) => {
        if (disabledRef.current || readOnlyRef.current || cakeConfigRef.current?.interiorPreview) return;
        const wasDown = mouseRef.current.isDown;
        const wasDrag = mouseRef.current.moved;
        mouseRef.current.isDown = false;
        if (wasDown && !wasDrag && e.button === THREE.MOUSE.LEFT) {
          const selectable = findSelectableItemAt(e.clientX, e.clientY);
          if (selectable) {
            onCenterItemSelectRef.current?.(selectable.id);
            onSelectToolRef.current?.(null);
            updateSelectionOverlay(e.clientX, e.clientY);
            return;
          }
          if (!activeToolRef.current) {
            onCenterItemSelectRef.current?.(null);
            updateSelectionOverlay(e.clientX, e.clientY);
            return;
          }
          tryPlace(e.clientX, e.clientY);
        }
      };

      const handleMouseLeave = () => {
        if (hoveredSlotRef.current) {
          hoveredSlotRef.current = null;
          updateSlotVisuals();
        }
        if (ghostGroupRef.current) {
          clearGhostGroup(ghostGroupRef.current);
        }
        lastValidGhostDropRef.current = null;
        clearSelectionOverlay();
        renderer.domElement.style.cursor = '';
      };

      const el = renderer.domElement;

      const handleContextLost = (e) => {
        e.preventDefault();
        isContextLost = true;
        console.warn('WebGL context lost. Pausing animation frame.');
        cancelAnimationFrame(animFrameRef.current);
      };

      const handleContextRestored = () => {
        console.info('WebGL context restored. Rebuilding scene and restarting animation.');
        isContextLost = false;
        buildCake();
        animate();
      };

      const handleKeyDown = (e) => {
        if (disabledRef.current || readOnlyRef.current) return;
        if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable) return;

        if (e.key === 'Escape') {
          e.preventDefault();
          if (activeToolRef.current) {
            onSelectToolRef.current?.(null);
            activeToolRef.current = null;
          } else {
            onCenterItemSelectRef.current?.(null);
          }
          refreshGhostRef.current?.();
          refreshSelectionOverlayRef.current?.();
          return;
        }

        if ((e.key === 'Delete' || e.key === 'Backspace') && !activeToolRef.current && selectedCenterItemIdRef.current) {
          e.preventDefault();
          onDeleteCenterItemRef.current?.();
          return;
        }

        // Key map (while a Center design is armed OR a placed Center item is selected on the cake):
        //   W / S  = tilt up / down      (pitch, rotationX)
        //   A / D  = tilt left / right   (roll,  rotationZ)
        //   Q / E  = rotate left / right (spin,  rotationY)
        // Arrow keys mirror the tilt keys: ↑ ↓ ← →.
        const isPitchUp = e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp';
        const isPitchDown = e.key === 's' || e.key === 'S' || e.key === 'ArrowDown';
        const isRollLeft = e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft';
        const isRollRight = e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight';
        const isYawLeft = e.key === 'q' || e.key === 'Q';
        const isYawRight = e.key === 'e' || e.key === 'E';
        if (!isYawLeft && !isYawRight && !isPitchUp && !isPitchDown && !isRollLeft && !isRollRight) return;

        const yawStep = isYawLeft ? -15 : isYawRight ? 15 : 0;
        const pitchStep = isPitchUp ? 15 : isPitchDown ? -15 : 0;
        const rollStep = isRollRight ? 15 : isRollLeft ? -15 : 0;

        // Case A: A Center design is armed for placement
        if (activeToolRef.current && onSelectToolRef.current) {
          const tool = activeToolRef.current;
          const toolType = typeof tool === 'object' ? tool.type : tool;
          if (!isCenterTool(toolType)) return;
          e.preventDefault(); // don't also scroll the page while rotating
          const currentYaw = typeof tool === 'object' ? (tool.rotationY || 0) : 0;
          const currentPitch = typeof tool === 'object' ? (tool.rotationX || 0) : 0;
          const currentRoll = typeof tool === 'object' ? (tool.rotationZ || 0) : 0;
          const rotatedTool = {
            type: toolType,
            rotationY: ((currentYaw + yawStep) % 360 + 360) % 360,
            rotationX: ((currentPitch + pitchStep) % 360 + 360) % 360,
            rotationZ: ((currentRoll + rollStep) % 360 + 360) % 360,
          };
          onSelectToolRef.current(rotatedTool);
          activeToolRef.current = rotatedTool;
          refreshGhostRef.current?.();
          return;
        }

        // Case B: A placed Center decoration or text item is selected on the cake
        if (!activeToolRef.current && selectedCenterItemIdRef.current) {
          const placedItems = cakeConfigRef.current?.placedItems || [];
          const selectedItem = placedItems.find((it) => it.id === selectedCenterItemIdRef.current);
          if (!selectedItem || !selectedItem.type?.startsWith('center-')) return;

          e.preventDefault();
          const currentYaw = ((selectedItem.rotation || 0) * 180) / Math.PI;
          const currentPitch = ((selectedItem.tiltX || 0) * 180) / Math.PI;
          const currentRoll = ((selectedItem.tiltZ || 0) * 180) / Math.PI;

          const nextYaw = ((currentYaw + yawStep) % 360 + 360) % 360;
          const nextPitch = ((currentPitch + pitchStep) % 360 + 360) % 360;
          const nextRoll = ((currentRoll + rollStep) % 360 + 360) % 360;

          const nextRotation = (nextYaw * Math.PI) / 180;
          const nextTiltX = (nextPitch * Math.PI) / 180;
          const nextTiltZ = (nextRoll * Math.PI) / 180;

          if (cakeConfigRef.current?.placedItems) {
            cakeConfigRef.current = {
              ...cakeConfigRef.current,
              placedItems: cakeConfigRef.current.placedItems.map((it) =>
                it.id === selectedItem.id
                  ? { ...it, rotation: nextRotation, tiltX: nextTiltX, tiltZ: nextTiltZ }
                  : it
              ),
            };
          }

          onPlacedItemsChangeRef.current?.((currentItems) =>
            (currentItems || []).map((it) =>
              it.id === selectedItem.id
                ? { ...it, rotation: nextRotation, tiltX: nextTiltX, tiltZ: nextTiltZ }
                : it
            )
          );
        }
      };

      el.addEventListener('webglcontextlost', handleContextLost, false);
      el.addEventListener('webglcontextrestored', handleContextRestored, false);

      if (!thumbnailMode) {
        el.addEventListener('mousedown', handleMouseDown);
        el.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('keydown', handleKeyDown);
      }

      setIsLoaded(true);

      return () => {
        isContextLost = true;
        cancelAnimationFrame(animFrameRef.current);
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
        handleResizeRef.current = null;
        el.removeEventListener('webglcontextlost', handleContextLost);
        el.removeEventListener('webglcontextrestored', handleContextRestored);
        if (!thumbnailMode) {
          el.removeEventListener('mousedown', handleMouseDown);
          el.removeEventListener('mouseleave', handleMouseLeave);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('keydown', handleKeyDown);
        }
        controls.dispose();
        controlsRef.current = null;
        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
        renderer.dispose();
        renderer.forceContextLoss?.();
      };
    } catch (err) {
      console.error('Three.js initialization error:', err);
      setError(err.message || 'Failed to initialize 3D scene');
    }
  }, []);

  useEffect(() => {
    buildCake();
    handleResizeRef.current?.();
  }, [buildCake]);

  const isInteriorPreview = Boolean(cakeConfig?.interiorPreview);
  const armedToolType = typeof activeTool === 'object' ? activeTool?.type : activeTool;
  const isFreeformArmed = !readOnly && !isInteriorPreview && (isCenterTool(armedToolType) || isPlaceItemTool(armedToolType));
  const isToolActive = !readOnly && !isInteriorPreview && Boolean(activeTool);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden relative">
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 p-6">
          <div className="text-center">
            <p className="text-red-600 font-semibold mb-2">3D Scene Error</p>
            <p className="text-red-500 text-sm">{error}</p>
            <p className="text-red-400 text-xs mt-2">Check browser console for details</p>
          </div>
        </div>
      ) : !isLoaded ? (
        <div role="status" aria-label="Loading cake preview" className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-gradient-to-b from-pink-50 to-orange-50">
          <div className="animate-pulse">
            <div className="mx-auto h-14 w-14 rounded-t-3xl border border-white bg-pink-200/80" />
            <div className="h-20 w-40 rounded-xl border border-white bg-rose-200/80" />
            <div className="mx-auto h-5 w-48 rounded-b-full bg-orange-100" />
          </div>
        </div>
      ) : null}
      <div
        ref={mountRef}
        className={`w-full h-full ${
          disabled
            ? 'pointer-events-none'
            : isFreeformArmed
              ? 'cursor-none'
              : isToolActive
                ? 'cursor-crosshair'
                : 'cursor-grab active:cursor-grabbing'
        }`}
      />
    </div>
  );
});

export default CakeScene;