import * as THREE from 'three';
import { getFrostingMaterial, applyVerticalGradientUV } from '../frostingMaterial';

// ─── Sunshine Play ──────────────────────────────────────────────────────────
// Replaces the old Fondant Swag / Stripes / Tuxedo trio. Unlike every other
// Side treatment (which wraps the whole wall or tiles repeatedly around the
// circumference — see buildPipingScrolls, buildChevronSideStripes, etc.),
// Sunshine Play designs are accent pieces stuck to the side wall,
// the way a baker would actually press decorations onto a frosted cake.
//
// Three designs today:
// - 'rainbowArc': a set of concentric half-torus bands (the classic rainbow-
//   arch shape) with a cloud puff pressed in at each foot. Has its own fixed
//   rainbow palette and intentionally ignores colorHex/Color Override, same
//   as Chevron Pattern's 'multiColor' set — see SideSection.jsx's
//   colorOverrideDisabled, which is keyed off this exact setId for that
//   reason.
// - 'starBurst': thin buttercream stars of different sizes scattered around
//   the cake side, hugging the wall. This variant respects colorHex/
//   Color Override since it's a single-color treatment.
// - 'cloudyChump': randomized wide cloud shapes scattered around the cake side,
//   no stars. Uses default white cloud color but respects colorHex/
//   Color Override for buttercream coloring.

const RAINBOW_BAND_COLORS = [
  '#9BE89B', // innermost band (closest to the cake wall)
  '#ffe57b', // yellow
  '#fcab71', // orange
  '#f16d86', // red
];

const CLOUD_COLOR = '#FFFDF7'; // soft off-white, matches a piped buttercream puff rather than flat white

// ─── Star Burst (buttercream stars) ───────────────────────────────────────
// Thin buttercream stars of different sizes scattered around the cake side,
// hugging the wall. Uses the same deterministic low-discrepancy sequence
// approach as scatterPearlPositions so the layout is reproducible and looks
// organically scattered without clustering.

function scatterStarPositions(count) {
  // Use a simple seeded random approach for more organic-looking scatter
  // while remaining deterministic (same pattern every time)
  const seed = 54321; // changed seed for different random pattern
  const points = [];

  // Simple linear congruential generator for deterministic randomness
  let current = seed;
  const seededRandom = () => {
    current = (current * 1103515245 + 12345) & 0x7fffffff;
    return current / 0x7fffffff;
  };

  for (let i = 0; i < count; i++) {
    points.push({
      angle: seededRandom() * Math.PI * 2,
      heightFrac: seededRandom(),
      sizeFrac: seededRandom(),
    });
  }
  return points;
}

// Build a single buttercream star — thin, hand-piped look using a proper
// star shape with slight wobble for that "not machine-perfect" buttercream texture
function buildStarGeo(scale = 1) {
  // Create a star shape using ExtrudeGeometry
  const starShape = new THREE.Shape();
  const outerRadius = 0.15 * scale;
  const innerRadius = 0.07 * scale;
  const points = 5;

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (i === 0) {
      starShape.moveTo(x, y);
    } else {
      starShape.lineTo(x, y);
    }
  }
  starShape.closePath();

  const extrudeSettings = {
    depth: 0.08 * scale, // thickness of the star
    bevelEnabled: true,
    bevelThickness: 0.02 * scale,
    bevelSize: 0.02 * scale,
    bevelSegments: 2
  };

  const geo = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
  // No rotation needed - ExtrudeGeometry creates shape in XY plane, extruded along Z
  addHandmadeWobble(geo, 0, 0.003); // subtle wobble for hand-piped look
  return geo;
}

const ASSORTED_STAR_COLORS = [
  '#FF6B9D', // strawberry pink
  '#FFD93D', // golden sunny yellow
  '#6BCB77', // mint green
  '#4D96FF', // sky pastel blue
  '#FF8B3D', // tangerine orange
  '#C77DFF', // lavender purple
];

function buildStarBurst(radius, height, colorHex, isAssorted = false, colorId = null) {
  const group = new THREE.Group();

  let materials;
  if (isAssorted) {
    materials = ASSORTED_STAR_COLORS.map(
      (c) =>
        new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.7,
          metalness: 0,
        })
    );
  } else {
    // Same fix as buildFlatCloud (see its comment): a plain
    // MeshStandardMaterial only understands a flat hex color, so the six
    // gradient/metallic Pick Color patterns (Marble, Ombré, Rainbow
    // Swirl, Gold Shimmer, Watercolor Pastel Mix, Red-White Gradient)
    // silently fell back to a solid swatch here. getFrostingMaterial
    // needs colorId to know which pattern to build.
    materials = [getFrostingMaterial(colorHex || '#FFFDF7', colorId)];
  }

  // Create reusable star geometry. Shared across every star mesh (only
  // position/rotation/scale differ per instance), so the gradient UV
  // wash only needs to be applied once here rather than per-star.
  const starGeo = buildStarGeo(1);
  applyVerticalGradientUV(starGeo);

  // Calculate star count based on cake surface area
  const areaPerStar = 1.2; // reduced density - fewer stars
  const starCount = Math.max(40, Math.round((2 * Math.PI * radius * height) / areaPerStar));

  const points = scatterStarPositions(starCount);

  for (let i = 0; i < starCount; i++) {
    const { angle, heightFrac, sizeFrac } = points[i];

    // Position star on the cake side with slight standoff
    const y = -height / 2 + height * 0.05 + heightFrac * height * 0.9;

    // Distinct, dynamic size tiers ranging from delicate small accent stars (~0.45–0.67)
    // to medium classic stars (~0.85–1.15) to bold statement stars (~1.35–1.75)
    let scale;
    if (sizeFrac < 0.36) {
      scale = 0.45 + (sizeFrac / 0.36) * 0.22; // small delicate star (0.45–0.67)
    } else if (sizeFrac < 0.72) {
      scale = 0.85 + ((sizeFrac - 0.36) / 0.36) * 0.30; // medium classic star (0.85–1.15)
    } else {
      scale = 1.35 + ((sizeFrac - 0.72) / 0.28) * 0.40; // large statement star (1.35–1.75)
    }

    const standoffRadius = radius + 0.02; // thin stars hug the wall closely

    const mat = materials[i % materials.length];
    const star = new THREE.Mesh(starGeo, mat);
    star.position.set(
      Math.sin(angle) * standoffRadius,
      y,
      Math.cos(angle) * standoffRadius
    );
    star.scale.setScalar(scale);

    // Rotate star to face sideways (outward from cake center)
    // Calculate the outward normal from the cylinder center at this position
    const normal = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();
    // Create a quaternion that rotates from (0,0,1) to the outward normal
    const up = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    star.setRotationFromQuaternion(quaternion);

    star.castShadow = true;
    star.receiveShadow = true;
    group.add(star);
  }

  return group;
}




// Wraps geometry vertices onto the cylinder while preserving sharp 90-degree
// edges and flat faces (rotates analytical normals around the cylinder axis
// instead of computeVertexNormals(), which blurs across sharp edges and creates creases).
function wrapGeometryPreservingNormals(geo, wallRadius) {
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(norm, i);

    const theta = v.x / wallRadius;
    const effR = wallRadius + v.z;

    pos.setXYZ(i, effR * Math.sin(theta), v.y, effR * Math.cos(theta));

    const nx = n.x * Math.cos(theta) + n.z * Math.sin(theta);
    const ny = n.y;
    const nz = -n.x * Math.sin(theta) + n.z * Math.cos(theta);
    norm.setXYZ(i, nx, ny, nz);
  }
  norm.needsUpdate = true;
}

// ─── Cloudy Chump (fluffy 3D clouds with flat look) ──────────────────────────
// Fluffy 3D clouds scattered around the cake side wall.
// Curvature wraps flush onto the cake cylinder with zero gaps or sticking-out planks.
// Staggered 2-row placement guarantees zero collisions/overlapping.
// Flat front face with crisp 90-degree perpendicular side walls (no bevel bulges).
// Respects colorHex for buttercream coloring.

function createFluffyCloudShapeA(scale = 1, mirrored = false) {
  const shape = new THREE.Shape();
  if (!mirrored) {
    shape.moveTo(-0.85 * scale, -0.20 * scale);
    // Left lobe
    shape.bezierCurveTo(
      -1.15 * scale, -0.10 * scale,
      -1.15 * scale, 0.30 * scale,
      -0.75 * scale, 0.32 * scale
    );
    // Mid-left lobe
    shape.bezierCurveTo(
      -0.70 * scale, 0.55 * scale,
      -0.35 * scale, 0.60 * scale,
      -0.15 * scale, 0.48 * scale
    );
    // Center-top main lobe
    shape.bezierCurveTo(
      -0.05 * scale, 0.68 * scale,
      0.35 * scale, 0.68 * scale,
      0.48 * scale, 0.42 * scale
    );
    // Right lobe
    shape.bezierCurveTo(
      0.80 * scale, 0.45 * scale,
      1.05 * scale, 0.15 * scale,
      0.85 * scale, -0.15 * scale
    );
    // Bottom undulating curve connecting smoothly back to start
    shape.bezierCurveTo(
      0.60 * scale, -0.32 * scale,
      0.25 * scale, -0.32 * scale,
      0.05 * scale, -0.22 * scale
    );
    shape.bezierCurveTo(
      -0.15 * scale, -0.30 * scale,
      -0.55 * scale, -0.32 * scale,
      -0.85 * scale, -0.20 * scale
    );
  } else {
    // Horizontally mirrored (x -> -x, reversing point traversal to maintain CW winding)
    shape.moveTo(0.85 * scale, -0.20 * scale);
    shape.bezierCurveTo(
      0.55 * scale, -0.32 * scale,
      0.15 * scale, -0.30 * scale,
      -0.05 * scale, -0.22 * scale
    );
    shape.bezierCurveTo(
      -0.25 * scale, -0.32 * scale,
      -0.60 * scale, -0.32 * scale,
      -0.85 * scale, -0.15 * scale
    );
    shape.bezierCurveTo(
      -1.05 * scale, 0.15 * scale,
      -0.80 * scale, 0.45 * scale,
      -0.48 * scale, 0.42 * scale
    );
    shape.bezierCurveTo(
      -0.35 * scale, 0.68 * scale,
      0.05 * scale, 0.68 * scale,
      0.15 * scale, 0.48 * scale
    );
    shape.bezierCurveTo(
      0.35 * scale, 0.60 * scale,
      0.70 * scale, 0.55 * scale,
      0.75 * scale, 0.32 * scale
    );
    shape.bezierCurveTo(
      1.15 * scale, 0.30 * scale,
      1.15 * scale, -0.10 * scale,
      0.85 * scale, -0.20 * scale
    );
  }
  return shape;
}

function createFluffyCloudShapeB(scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.75 * scale, -0.18 * scale);
  // Left lobe
  shape.bezierCurveTo(
    -1.05 * scale, -0.05 * scale,
    -1.00 * scale, 0.38 * scale,
    -0.60 * scale, 0.42 * scale
  );
  // Center tall lobe
  shape.bezierCurveTo(
    -0.45 * scale, 0.72 * scale,
    0.15 * scale, 0.72 * scale,
    0.35 * scale, 0.45 * scale
  );
  // Right lobe
  shape.bezierCurveTo(
    0.70 * scale, 0.45 * scale,
    0.95 * scale, 0.10 * scale,
    0.75 * scale, -0.15 * scale
  );
  // Bottom undulating curve
  shape.bezierCurveTo(
    0.50 * scale, -0.28 * scale,
    0.15 * scale, -0.28 * scale,
    -0.05 * scale, -0.20 * scale
  );
  shape.bezierCurveTo(
    -0.25 * scale, -0.28 * scale,
    -0.55 * scale, -0.28 * scale,
    -0.75 * scale, -0.18 * scale
  );
  return shape;
}

// Curated 7-piece asymmetrical layout around the cake cylinder:
// [angleDeg, yFrac, sizeMul, variant]
// Distributed organically across heights and angles without forming a grid or rows.
const CLOUDY_CHUMP_SPECS = [
  { angleDeg: 12, yFrac: 0.22, sizeMul: 1.08, variant: 'A' }, // front-right, high
  { angleDeg: 68, yFrac: -0.24, sizeMul: 0.95, variant: 'B' }, // right, low
  { angleDeg: 122, yFrac: 0.15, sizeMul: 1.12, variant: 'A' }, // back-right, mid-high
  { angleDeg: 175, yFrac: -0.18, sizeMul: 0.90, variant: 'B' }, // back, mid-low
  { angleDeg: 226, yFrac: 0.25, sizeMul: 1.05, variant: 'A' }, // back-left, high
  { angleDeg: 278, yFrac: -0.08, sizeMul: 1.15, variant: 'B' }, // left, mid
  { angleDeg: 326, yFrac: -0.26, sizeMul: 0.92, variant: 'A' }, // front-left, low
];

function buildCloudyChump(radius, height, colorHex, colorId = null, cloudStandoffOverride = null) {
  const group = new THREE.Group();

  // Same fix as buildFlatCloud (see its comment): a plain
  // MeshStandardMaterial only understands a flat hex color, so the six
  // gradient/metallic Pick Color patterns (Marble, Ombré, Rainbow Swirl,
  // Gold Shimmer, Watercolor Pastel Mix, Red-White Gradient) silently
  // fell back to a solid swatch here.
  const cloudMat = getFrostingMaterial(colorHex || CLOUD_COLOR, colorId);

  // Generous cloud scale for bold, cute, visible fondant cloud cutouts
  const baseScale = Math.min(0.85, height * 0.40);
  const cloudDepth = 0.09; // 3D fondant thickness with flat look
  // Flush against the cake cylinder wall by default (0.002) — correct
  // for Naked/Fully Frosted, where the wall really is flat. Under
  // Textured Buttercream the wall isn't flat: Ridge Comb/Ribbon Wrap/
  // Vertical Piping's own ridges reach past this decoration's own
  // placement radius (ridgedTextureRadius) by a thin margin (0.014-0.026,
  // depending on texture — verified against each texture's real peak
  // geometry), and clouds sit here with almost no clearance ON TOP of
  // that (+0.002), so a ridge crest can visibly poke past/through a
  // cloud's flat face or graze its silhouette edge — same family of bug
  // as Checkered/Triangle/Chevron's own embed-into-the-ridge problem,
  // just a standoff that's too thin rather than one that embeds
  // backward. Stars and the rainbow arc don't show this (their own
  // standoffs already clear it — stars via their own +0.02 minimum,
  // the rainbow arc via its tube radius offset), so only clouds get the
  // override; CakeScene.jsx passes a bigger value under Textured
  // Buttercream (see buildSunshinePlay's own cloudStandoff param).
  const standoff = cloudStandoffOverride ?? 0.002;

  for (let i = 0; i < CLOUDY_CHUMP_SPECS.length; i++) {
    const spec = CLOUDY_CHUMP_SPECS[i];
    const angle = (spec.angleDeg * Math.PI) / 180;
    const y = spec.yFrac * height;
    const scale = baseScale * spec.sizeMul;
    const isB = spec.variant === 'B';

    const tangentialX = angle * radius;
    const shape = isB ? createFluffyCloudShapeB(scale) : createFluffyCloudShapeA(scale);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: cloudDepth,
      bevelEnabled: false,
    });
    geo.translate(tangentialX, y, standoff);
    wrapGeometryPreservingNormals(geo, radius);
    // Each cloud's own gradient wash — same reasoning as buildFlatCloud's
    // applyVerticalGradientUV call.
    applyVerticalGradientUV(geo);

    const mesh = new THREE.Mesh(geo, cloudMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}

// Small cluster of overlapping spheres standing in for a piped/hand-shaped
// cloud puff — cheap and reads fine at cake scale, same trick real bakers
// use with a few piped stars smoothed together. Takes the cluster's
// intended flat-frame center (before curving) plus the wall radius, and
// wraps each individual sphere's center onto the cylinder itself — see
// wrapPointToCylinder's comment for why a pre-baked flat offset isn't
// enough once the rest of the piece is doing the same.
// A continuous C1-smooth inverted U-shaped arch curve in the local XY plane:
// - Left straight vertical leg: going UP from (-R, -L) to (-R, 0)
// - Semicircular top arc: from (-R, 0) over the apex (0, R) to (+R, 0)
// - Right straight vertical leg: going DOWN from (+R, 0) to (+R, -L)
class UArchCurve extends THREE.Curve {
  constructor(radius, legLength) {
    super();
    this.radius = radius;
    this.legLength = legLength;
    this.arcLength = Math.PI * radius;
    this.totalLength = 2 * legLength + this.arcLength;
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    const s = t * this.totalLength;
    const R = this.radius;
    const L = this.legLength;

    if (s <= L) {
      return optionalTarget.set(-R, -L + s, 0);
    } else if (s <= L + this.arcLength) {
      const theta = Math.PI - (s - L) / R;
      return optionalTarget.set(R * Math.cos(theta), R * Math.sin(theta), 0);
    } else {
      const u = s - (L + this.arcLength);
      return optionalTarget.set(R, -u, 0);
    }
  }
}

// 3D extruded fondant cloud puff with flat front face and crisp perpendicular side walls (no bevel, no bulges).
// Sits over the cut ends of the rainbow bands like a 3D cut fondant piece.
// Uses the same cute, fluffy cloud shape as Cloudy Chump.
function buildFlatCloud(centerX, bottomY, wallRadius, scale, depth, zBack, isLeft = false, colorHex = CLOUD_COLOR, colorId = null) {
  // Left foot has wider lobes facing outward (unmirrored); right foot is mirrored so wider lobes face outward
  const isMirrored = !isLeft;
  const shape = createFluffyCloudShapeA(scale, isMirrored);
  const xOffset = (isMirrored ? 0.071 : -0.071) * scale;

  // Real 3D extrusion with NO bevel for clean, flat front and crisp perpendicular side walls
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false,
  });
  geo.translate(centerX - xOffset, bottomY, zBack);
  wrapGeometryPreservingNormals(geo, wallRadius);
  // ExtrudeGeometry's own default UVs are built from the flat shape's
  // bounding box, before wrapGeometryPreservingNormals bends it onto the
  // cylinder — not guaranteed to give a clean vertical wash for gradient
  // Sugar Colors (Marble/Ombré/Rainbow Swirl/Watercolor Pastel Mix/
  // Red-White Gradient) the way a purpose-built vertical ramp does. Same
  // fix as Triangle/Chevron/Piping Scrolls.
  applyVerticalGradientUV(geo);

  // Was a plain THREE.MeshStandardMaterial({ color }), no colorId — same
  // fix as Checkered/Triangle/Chevron/Piping Scrolls/Scatter Pearls, so
  // the six special colors render correctly here instead of falling back
  // to a flat swatch.
  const mat = getFrostingMaterial(colorHex || CLOUD_COLOR, colorId);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}


// ─── Cylinder wrap ─────────────────────────────────────────────────────────
// The rainbow bands/backers/clouds are all authored flat, in a "tangential
// x, vertical y, standoff-from-wall z" frame (z = 0 sits right at the wall
// surface, positive z sticks outward) — the natural space to build a torus
// arc or a scattered puff in. But the cake wall is a cylinder: it curves
// AWAY from the camera as x moves away from center, while a flat piece
// doesn't. Just pushing the whole flat piece out to `radius` (the old
// approach) only actually touches the wall at x = 0 — everywhere else it
// increasingly floats off the surface, worst right at the arch's feet,
// which is exactly where the gap showed up. These two helpers convert a
// point (or every vertex in a geometry) from that flat frame into its real
// position on the cylinder: treat x as an arc-length offset (theta = x /
// wallRadius, matching how every OTHER tiled Side treatment already places
// itself with sin/cos of an angle), keep y untouched (height doesn't need
// curving), and use z as how far outward from the wall that point sits at
// its own angle, not a single shared depth for the whole piece.
function wrapPointToCylinder(x, y, z, wallRadius) {
  const theta = x / wallRadius;
  const effR = wallRadius + z;
  return new THREE.Vector3(effR * Math.sin(theta), y, effR * Math.cos(theta));
}

function wrapGeometryToCylinder(geo, wallRadius) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const wrapped = wrapPointToCylinder(v.x, v.y, v.z, wallRadius);
    pos.setXYZ(i, wrapped.x, wrapped.y, wrapped.z);
  }
  geo.computeVertexNormals();
}

// Light, low-frequency vertex wobble — the same "hand-applied, not
// machine-perfect" trick buildOrganicFrostingGeometry uses in
// frostingGeometry.js — so the hardened rainbow doesn't read as a perfectly
// smooth CAD torus.
function addHandmadeWobble(geo, seedOffset, amount = 0.006) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const wobble = Math.sin(v.x * 9 + seedOffset) * amount + Math.cos(v.y * 7 - seedOffset) * amount * 0.7;
    v.x += wobble;
    v.y += wobble * 0.6;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
}

// Builds a single complete rainbow arc with its 4 color bands and 2 fondant cloud feet,
// wrapped flush to the cake cylinder at the specified radius.
function buildSingleRainbowArc(radius, height, scale = 1, colorHex = CLOUD_COLOR, colorId = null, whiteClouds = false) {
  const arcGroup = new THREE.Group();
  const effectiveHeight = height * scale;

  const bandCount = RAINBOW_BAND_COLORS.length;

  // Wide, authentic rainbow proportions:
  // A generous outer radius and wide archway give it the classic rainbow curve,
  // with short straight vertical leg extensions so the ends plunge cleanly into the clouds.
  const outerRadius = effectiveHeight * 0.29; // generous outer radius for a wide, expansive arch
  const bandWidth = effectiveHeight * 0.050; // center-to-center band spacing
  const tube = bandWidth * 0.52; // tube radius (ensures seamless touching between neighboring bands)
  const legLength = effectiveHeight * 0.050; // subtle vertical leg extension into the clouds

  const bandRadii = [];
  for (let i = 0; i < bandCount; i++) {
    bandRadii.push(outerRadius - (bandCount - 1 - i) * bandWidth);
  }

  const innerRadius = bandRadii[0];
  const legMidX = (innerRadius + outerRadius) / 2;
  const legSpan = (outerRadius + tube) - (innerRadius - tube);

  // Vertical centering within tier height budget:
  // Top apex: y = outerRadius + tube
  // Bottom of legs: y = -legLength
  // Cloud bottom padding: ~0.05 * height
  const topY = outerRadius + tube;
  const bottomY = -legLength - 0.05 * effectiveHeight;
  const centerYOffset = -(topY + bottomY) / 2;

  const rainbowGroup = new THREE.Group();

  for (let i = 0; i < bandCount; i++) {
    const bRadius = bandRadii[i];
    const curve = new UArchCurve(bRadius, legLength);
    const geo = new THREE.TubeGeometry(curve, 64, tube, 12, false);
    addHandmadeWobble(geo, i * 1.7, tube * 0.015);
    geo.translate(0, centerYOffset, tube);
    wrapGeometryToCylinder(geo, radius);
    const mat = new THREE.MeshStandardMaterial({
      color: RAINBOW_BAND_COLORS[i],
      roughness: 0.55,
      metalness: 0.02,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rainbowGroup.add(mesh);
  }

  arcGroup.add(rainbowGroup);

  // 3D extruded fluffy fondant cloud puffs (matching Cloudy Chump's shape)
  // centered over the leg midpoints (±legMidX) to cleanly cover all 4 band cut ends.
  const cloudScale = (legSpan * 1.68) / 1.985;
  const cloudDepth = 0.24 * scale; // sleek 3D plaque thickness (~10-12% of width)
  const zBack = tube * 2 + 0.048 - cloudDepth;
  const cloudFootY = -legLength + centerYOffset + 0.015 * effectiveHeight;
  const cloudColor = whiteClouds ? '#FFFFFF' : colorHex;
  const cloudColorId = whiteClouds ? null : colorId;
  const leftCloud = buildFlatCloud(-legMidX, cloudFootY, radius, cloudScale, cloudDepth, zBack, true, cloudColor, cloudColorId);
  arcGroup.add(leftCloud);

  const rightCloud = buildFlatCloud(legMidX, cloudFootY, radius, cloudScale, cloudDepth, zBack, false, cloudColor, cloudColorId);
  arcGroup.add(rightCloud);

  return arcGroup;
}

// ─── Rainbow Champ (combination of Rainbow Arc and Cloudy Champ) ─────────────
// Features rainbow arcs and scattered 3D fluffy clouds around the cake cylinder.

const RAINBOW_CHAMP_ARCS = [
  { angleDeg: 0,   yFrac:  0.00, scale: 1.00 }, // Front center
  { angleDeg: 165, yFrac:  0.06, scale: 0.90 }, // Back-right, slightly higher
];

const RAINBOW_CHAMP_CLOUDS = [
  { angleDeg: 50,  yFrac:  0.22, sizeMul: 1.05, variant: 'A' }, // Front-right, high
  { angleDeg: 105, yFrac: -0.22, sizeMul: 0.95, variant: 'B' }, // Right side, low
  { angleDeg: 220, yFrac: -0.18, sizeMul: 0.92, variant: 'A' }, // Back-left, mid-low
  { angleDeg: 265, yFrac:  0.20, sizeMul: 1.10, variant: 'B' }, // Left side, high
  { angleDeg: 315, yFrac: -0.12, sizeMul: 0.96, variant: 'A' }, // Front-left, mid-low
];

function buildRainbowChamp(radius, height, colorHex) {
  const group = new THREE.Group();

  // 1. Add the Rainbow Arcs
  for (const spec of RAINBOW_CHAMP_ARCS) {
    const arc = buildSingleRainbowArc(radius, height, spec.scale, colorHex);
    arc.rotation.y = (spec.angleDeg * Math.PI) / 180;
    arc.position.y = spec.yFrac * height;
    group.add(arc);
  }

  // 2. Add the scattered Cloudy Champ clouds
  const cloudMat = new THREE.MeshStandardMaterial({
    color: colorHex || CLOUD_COLOR,
    roughness: 0.55,
    metalness: 0.02,
  });

  const baseScale = Math.min(0.85, height * 0.38);
  const cloudDepth = 0.09;
  const standoff = 0.002;

  for (let i = 0; i < RAINBOW_CHAMP_CLOUDS.length; i++) {
    const spec = RAINBOW_CHAMP_CLOUDS[i];
    const angle = (spec.angleDeg * Math.PI) / 180;
    const y = spec.yFrac * height;
    const scale = baseScale * spec.sizeMul;
    const isB = spec.variant === 'B';

    const tangentialX = angle * radius;
    const shape = isB ? createFluffyCloudShapeB(scale) : createFluffyCloudShapeA(scale);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: cloudDepth,
      bevelEnabled: false,
    });
    geo.translate(tangentialX, y, standoff);
    wrapGeometryPreservingNormals(geo, radius);

    const mesh = new THREE.Mesh(geo, cloudMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}

// ─── Starry Rainbow (Rainbow Arc + Cloudy Champ + Star Burst) ───────────────
// A dreamscape combining rainbow arcs, 3D fluffy clouds, and twinkling stars.

// Deterministic star layout for Starry Rainbow / Assorted Starry Rainbow:
// stars scattered in the open sky between the arcs and clouds. Extracted
// verbatim from buildStarryRainbow's own scatter loop (same seed, same
// obstacle boxes, same rejection rules, same size tiers) so the mesh and
// getSunshinePlayCoverageFn's glaze windows can never disagree about
// where a star is. Returns [{ angle, y, scale }] in placement order.
function computeStarryRainbowStars(radius, height) {
  const baseScale = Math.min(0.85, height * 0.38);
  // Build obstacle bounding boxes (rainbows and clouds) so stars don't collide with them
  const obstacles = [];
  for (const a of RAINBOW_CHAMP_ARCS) {
    obstacles.push({
      angle: (a.angleDeg * Math.PI) / 180,
      y: a.yFrac * height,
      halfW: (1.25 * a.scale) / 2 + 0.16,
      halfH: (0.70 * a.scale) / 2 + 0.12,
    });
  }
  for (const c of RAINBOW_CHAMP_CLOUDS) {
    const scale = baseScale * c.sizeMul;
    obstacles.push({
      angle: (c.angleDeg * Math.PI) / 180,
      y: c.yFrac * height,
      halfW: ((c.variant === 'B' ? 1.35 : 1.50) * scale) / 2 + 0.14,
      halfH: (0.70 * scale) / 2 + 0.10,
    });
  }

  // Seeded deterministic scattering
  let seed = 839201;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const stars = [];
  const targetStars = Math.max(18, Math.round(24 * (radius / 2.5) * (height / 1.7)));

  for (let attempt = 0; attempt < 600 && stars.length < targetStars; attempt++) {
    const angle = rand() * Math.PI * 2;
    const y = (-0.38 + rand() * 0.76) * height;

    let collides = false;
    for (const obs of obstacles) {
      let dTheta = Math.abs(angle - obs.angle);
      if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
      const arcDist = dTheta * radius;
      const dy = Math.abs(y - obs.y);
      if (arcDist < obs.halfW && dy < obs.halfH) {
        collides = true;
        break;
      }
    }

    if (!collides) {
      for (const s of stars) {
        let dTheta = Math.abs(angle - s.angle);
        if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
        const arcDist = dTheta * radius;
        const dy = Math.abs(y - s.y);
        if (Math.hypot(arcDist, dy) < 0.38) {
          collides = true;
          break;
        }
      }
    }

    if (!collides) {
      // Distinct, dynamic size tiers matching Star Burst
      let starScale;
      const sizeFrac = rand();
      if (sizeFrac < 0.36) {
        starScale = 0.45 + (sizeFrac / 0.36) * 0.22; // small delicate star (0.45–0.67)
      } else if (sizeFrac < 0.72) {
        starScale = 0.85 + ((sizeFrac - 0.36) / 0.36) * 0.30; // medium classic star (0.85–1.15)
      } else {
        starScale = 1.35 + ((sizeFrac - 0.72) / 0.28) * 0.40; // large statement star (1.35–1.75)
      }
      stars.push({ angle, y, scale: starScale });
    }
  }

  return stars;
}

function buildStarryRainbow(radius, height, colorHex, isAssortedStars = false, colorId = null, cloudStandoffOverride = null) {
  const group = new THREE.Group();

  // 1. Rainbow Arcs
  for (const spec of RAINBOW_CHAMP_ARCS) {
    const arc = buildSingleRainbowArc(
      radius,
      height,
      spec.scale,
      isAssortedStars ? '#FFFFFF' : colorHex,
      isAssortedStars ? null : colorId,
      isAssortedStars,
    );
    arc.rotation.y = (spec.angleDeg * Math.PI) / 180;
    arc.position.y = spec.yFrac * height;
    group.add(arc);
  }

  // 2. Cloudy Champ Clouds — same fix as buildCloudyChump/buildFlatCloud:
  // getFrostingMaterial (not a plain MeshStandardMaterial) is what
  // actually understands the six gradient/metallic Pick Color patterns.
  const cloudMat = isAssortedStars
    ? new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.7, metalness: 0 })
    : getFrostingMaterial(colorHex || CLOUD_COLOR, colorId);

  const baseScale = Math.min(0.85, height * 0.38);
  const cloudDepth = 0.09;
  // Same override as buildCloudyChump — see its own comment.
  const cloudStandoff = cloudStandoffOverride ?? 0.002;

  for (let i = 0; i < RAINBOW_CHAMP_CLOUDS.length; i++) {
    const spec = RAINBOW_CHAMP_CLOUDS[i];
    const angle = (spec.angleDeg * Math.PI) / 180;
    const y = spec.yFrac * height;
    const scale = baseScale * spec.sizeMul;
    const isB = spec.variant === 'B';

    const tangentialX = angle * radius;
    const shape = isB ? createFluffyCloudShapeB(scale) : createFluffyCloudShapeA(scale);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: cloudDepth,
      bevelEnabled: false,
    });
    geo.translate(tangentialX, y, cloudStandoff);
    wrapGeometryPreservingNormals(geo, radius);
    applyVerticalGradientUV(geo);

    const mesh = new THREE.Mesh(geo, cloudMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // 3. Twinkling Star Burst Stars scattered in the open sky areas
  let starMats;
  if (isAssortedStars) {
    starMats = ASSORTED_STAR_COLORS.map(
      (c) =>
        new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.7,
          metalness: 0,
        })
    );
  } else {
    starMats = [getFrostingMaterial(colorHex || CLOUD_COLOR, colorId)];
  }

  const starGeo = buildStarGeo(1);
  applyVerticalGradientUV(starGeo);
  const standoffRadius = radius + 0.02;

  // Star placement lives in computeStarryRainbowStars (shared with
  // getSunshinePlayCoverageFn so glaze windows use the identical layout).
  const placedStars = computeStarryRainbowStars(radius, height);
  placedStars.forEach(({ angle, y, scale: starScale }, idx) => {
    const mat = starMats[(idx + 1) % starMats.length];
    const star = new THREE.Mesh(starGeo, mat);
    star.position.set(
      Math.sin(angle) * standoffRadius,
      y,
      Math.cos(angle) * standoffRadius
    );
    star.scale.setScalar(starScale);

    const normal = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();
    const up = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    star.setRotationFromQuaternion(quaternion);

    star.castShadow = true;
    star.receiveShadow = true;
    group.add(star);
  });

  return group;
}

/**
 * Reproduces buildSingleRainbowArc's own U-arch geometry math, but
 * collapses the 4 individually-touching color bands (see that function's
 * own comment: tube radius is chosen so neighboring bands touch with no
 * gap) into ONE thick curve at their shared midpoint radius, with a
 * half-thickness covering the full 4-band span — a reasonable
 * approximation for a coverage query, not worth sampling each band
 * separately. Returns points in the arc's own LOCAL flat frame (before
 * the cylinder wrap / group rotation.y / position.y a real copy applies)
 * — getSunshinePlayCoverageFn's addRainbowArc converts these into real
 * (angle, y) itself, once per placed copy.
 */
function sampleUArchSpine(effectiveHeight) {
  const bandCount = RAINBOW_BAND_COLORS.length;
  const outerRadius = effectiveHeight * 0.29;
  const bandWidth = effectiveHeight * 0.050;
  const tube = bandWidth * 0.52;
  const legLength = effectiveHeight * 0.050;
  const innerRadius = outerRadius - (bandCount - 1) * bandWidth;
  const midRadius = (innerRadius + outerRadius) / 2;
  const halfThickness = (outerRadius - innerRadius) / 2 + tube;

  const topY = outerRadius + tube;
  const bottomY = -legLength - 0.05 * effectiveHeight;
  const centerYOffset = -(topY + bottomY) / 2;

  const arcLen = Math.PI * midRadius;
  const totalLen = 2 * legLength + arcLen;
  const steps = 40;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s = t * totalLen;
    let x, y;
    if (s <= legLength) {
      x = -midRadius; y = -legLength + s;
    } else if (s <= legLength + arcLen) {
      const theta = Math.PI - (s - legLength) / midRadius;
      x = midRadius * Math.cos(theta); y = midRadius * Math.sin(theta);
    } else {
      const u = s - (legLength + arcLen);
      x = midRadius; y = -u;
    }
    points.push([x, y + centerYOffset]);
  }

  const legMidX = (innerRadius + outerRadius) / 2;
  const cloudFootY = -legLength + centerYOffset + 0.015 * effectiveHeight;
  const cloudScale = ((outerRadius + tube - (innerRadius - tube)) * 1.68) / 1.985;

  return { points, halfThickness, legMidX, cloudFootY, cloudScale };
}

/**
 * Answers "how much is this point on the tier's side wall covered by an
 * active Sunshine Play element (a star, a cloud, or a rainbow arc)?" as a
 * 0..1 weight, for Filling's own Piping Design to shave against — same
 * purpose/smoothstep-edge reasoning as the other coverage functions (see
 * getCheckerCoverageFn's own comment in DecorationSets.jsx).
 *
 * Sunshine Play's shapes are accent pieces stuck onto the wall (not tiled
 * or gridded), so each one is approximated by the simplest shape that
 * reasonably matches its real footprint: a star as a small circle (its
 * points are thin, so a circle a bit smaller than its own outer radius),
 * a cloud as an ellipse (matching createFluffyCloudShapeA/B's own rough
 * bounding proportions), and a rainbow arc as a thick curve
 * (sampleUArchSpine above) plus its own two cloud feet. Star/cloud
 * positions for the scattered variants (Star Burst, Cloudy Champ) come
 * straight from the same deterministic placement functions/specs the
 * real build functions use (scatterStarPositions, CLOUDY_CHUMP_SPECS),
 * so they can't drift out of sync with the real layout.
 *
 * Starry Rainbow/Assorted Starry Rainbow's own scattered stars (on top of
 * its arcs and clouds) are left out here — reproducing
 * buildStarryRainbow's own obstacle-avoidance scatter loop exactly would
 * mean duplicating that whole algorithm for a relatively minor addition
 * on top of the arcs/clouds, which already dominate the covered area.
 * That's a real gap in this approximation (small floating stars in the
 * open sky areas won't get any shaving), not in the arcs/clouds
 * themselves.
 */
export function getSunshinePlayCoverageFn(radius, height, opts = {}) {
  const variant = opts.variant || 'rainbowArc';
  const elements = []; // { type: 'circle'|'ellipse', angle, y, ... } | { type: 'curve', points: [[angle,y],...], r }

  // forGlaze: Glaze's own use of this function (see CakeScene.jsx's
  // glazeSunshinePlayCoverageFn). Filling keeps the original 0.11*scale
  // footprint. For Glaze that footprint is too small: a star's real outer
  // reach is 0.15*scale + 0.02*scale bevel = 0.17*scale, and its front
  // face only stands 0.08*scale (+bevel) proud of the wall — for the
  // smallest tier (scale ~0.45-0.67) that is barely more than the glaze
  // coat itself, so with a window smaller than the star (and a ramp
  // eating a quarter of it) the star stayed mostly buried. Glaze windows
  // therefore open the star's FULL footprint plus a 25% margin, with a
  // tighter edge ramp so even tiny stars get a genuinely open space.
  const forGlaze = !!opts.forGlaze;
  const addStar = (angle, y, scale) => {
    elements.push(forGlaze
      ? { type: 'circle', angle, y, r: 0.17 * scale * 1.25, tight: true }
      : { type: 'circle', angle, y, r: 0.11 * scale });
  };
  const addCloud = (angle, y, scale) => {
    // The cloud shape's own local vertical center sits noticeably above
    // its nominal placement point (see createFluffyCloudShapeA/B's own
    // vertex range, roughly y ∈ [-0.2, 0.68] * scale) — its half-extents
    // come from that same bounding range.
    elements.push({ type: 'ellipse', angle, y: y + 0.24 * scale, halfW: 0.85 * scale, halfH: 0.44 * scale });
  };
  const addRainbowArc = (angleDeg, yFrac, scale) => {
    const effectiveHeight = height * scale;
    const spine = sampleUArchSpine(effectiveHeight);
    const groupAngle = (angleDeg * Math.PI) / 180;
    const groupY = yFrac * height;
    const curvePoints = spine.points.map(([lx, ly]) => [groupAngle + lx / radius, groupY + ly]);
    elements.push({ type: 'curve', points: curvePoints, r: spine.halfThickness });
    const leftAngle = groupAngle + (-spine.legMidX) / radius;
    const rightAngle = groupAngle + spine.legMidX / radius;
    const footY = groupY + spine.cloudFootY;
    addCloud(leftAngle, footY, spine.cloudScale);
    addCloud(rightAngle, footY, spine.cloudScale);
  };

  const starScaleFor = (sizeFrac) => {
    if (sizeFrac < 0.36) return 0.45 + (sizeFrac / 0.36) * 0.22;
    if (sizeFrac < 0.72) return 0.85 + ((sizeFrac - 0.36) / 0.36) * 0.30;
    return 1.35 + ((sizeFrac - 0.72) / 0.28) * 0.40;
  };

  if (variant === 'rainbowArc') {
    const RAINBOW_COPIES = [
      { angleDeg: 0, yFrac: 0.00, scale: 1.00 },
      { angleDeg: 118, yFrac: 0.10, scale: 0.88 },
      { angleDeg: 238, yFrac: -0.08, scale: 0.94 },
    ];
    for (const spec of RAINBOW_COPIES) addRainbowArc(spec.angleDeg, spec.yFrac, spec.scale);
  } else if (variant === 'cloudyChump') {
    const baseScale = Math.min(0.85, height * 0.40);
    for (const spec of CLOUDY_CHUMP_SPECS) {
      addCloud((spec.angleDeg * Math.PI) / 180, spec.yFrac * height, baseScale * spec.sizeMul);
    }
  } else if (variant === 'starBurst' || variant === 'assortedStarBurst') {
    const areaPerStar = 1.2;
    const starCount = Math.max(40, Math.round((2 * Math.PI * radius * height) / areaPerStar));
    const points = scatterStarPositions(starCount);
    for (let i = 0; i < starCount; i++) {
      const { angle, heightFrac, sizeFrac } = points[i];
      const y = -height / 2 + height * 0.05 + heightFrac * height * 0.9;
      addStar(angle, y, starScaleFor(sizeFrac));
    }
  } else if (variant === 'starryRainbow' || variant === 'assortedStarryRainbow') {
    const RAINBOW_CHAMP_ARCS_LOCAL = [
      { angleDeg: 0, yFrac: 0.00, scale: 1.00 },
      { angleDeg: 165, yFrac: 0.06, scale: 0.90 },
    ];
    for (const spec of RAINBOW_CHAMP_ARCS_LOCAL) addRainbowArc(spec.angleDeg, spec.yFrac, spec.scale);
    const baseScale = Math.min(0.85, height * 0.38);
    const RAINBOW_CHAMP_CLOUDS_LOCAL = [
      { angleDeg: 50, yFrac: 0.22, sizeMul: 1.05 },
      { angleDeg: 105, yFrac: -0.22, sizeMul: 0.95 },
      { angleDeg: 220, yFrac: -0.18, sizeMul: 0.92 },
      { angleDeg: 265, yFrac: 0.20, sizeMul: 1.10 },
      { angleDeg: 315, yFrac: -0.12, sizeMul: 0.96 },
    ];
    for (const spec of RAINBOW_CHAMP_CLOUDS_LOCAL) {
      addCloud((spec.angleDeg * Math.PI) / 180, spec.yFrac * height, baseScale * spec.sizeMul);
    }
    // The scattered sky stars used to be left out entirely (see the doc
    // comment above). Glaze needs them — a star with no window is buried
    // under the coat — so for Glaze only, add them from the SAME shared
    // layout the mesh uses. Filling is unchanged.
    if (forGlaze) {
      for (const st of computeStarryRainbowStars(radius, height)) addStar(st.angle, st.y, st.scale);
    }
  }

  const smoothstep = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };
  const angleDelta = (a, b) => {
    let d = Math.abs(a - b) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  };

  return (angle, localY) => {
    let coverage = 0;
    for (const el of elements) {
      if (el.type === 'curve') {
        for (const [px, py] of el.points) {
          const arcDist = radius * angleDelta(angle, px);
          const dY = localY - py;
          const dist = Math.sqrt(arcDist * arcDist + dY * dY);
          const distInsideEdge = el.r - dist;
          if (distInsideEdge <= 0) continue;
          const smoothWidth = Math.max(0.02, el.r * 0.25);
          coverage = Math.max(coverage, smoothstep(distInsideEdge / smoothWidth));
          if (coverage >= 1) break;
        }
      } else {
        const arcDist = radius * angleDelta(angle, el.angle);
        const dY = localY - el.y;
        let distInsideEdge;
        let smoothWidth;
        if (el.type === 'circle') {
          distInsideEdge = el.r - Math.sqrt(arcDist * arcDist + dY * dY);
          smoothWidth = el.tight ? Math.max(0.012, el.r * 0.2) : Math.max(0.02, el.r * 0.25);
        } else {
          const ellipseDist = Math.sqrt((arcDist / el.halfW) ** 2 + (dY / el.halfH) ** 2);
          distInsideEdge = (1 - ellipseDist) * Math.min(el.halfW, el.halfH);
          smoothWidth = Math.max(0.03, Math.min(el.halfW, el.halfH) * 0.2);
        }
        if (distInsideEdge > 0) coverage = Math.max(coverage, smoothstep(distInsideEdge / smoothWidth));
      }
      if (coverage >= 1) return 1;
    }
    return coverage;
  };
}

/**
 * Builds the Sunshine Play side decoration as a single Group, sized to fit
 * within `height` and stuck flush against the cake wall at `radius` — one
 * accent piece, not tiled around the circumference like the other Side
 * treatments.
 */
export function buildSunshinePlay(radius, height, colorHex, colorId, variant = 'rainbowArc', _flavorId = 'vanilla', opts = {}) {
  const group = new THREE.Group();
  // cloudStandoff: only meaningful for 'cloudyChump'/'starryRainbow'/
  // 'assortedStarryRainbow' (the three variants with clouds) — passed
  // through unchanged (null) for every other variant, so Rainbow Arc,
  // Star Burst and Assorted Star Burst are untouched. See
  // buildCloudyChump's own comment for why clouds specifically need
  // this override under Textured Buttercream.
  const { cloudStandoff = null } = opts;

  if (variant === 'rainbowArc') {
    // Variation 1: Rainbow Arc (3 copies in varying locations around cylinder)
    const RAINBOW_COPIES = [
      { angleDeg: 0,   yFrac:  0.00, scale: 1.00 }, // Front center
      { angleDeg: 118, yFrac:  0.10, scale: 0.88 }, // Right/back-right, slightly higher
      { angleDeg: 238, yFrac: -0.08, scale: 0.94 }, // Left/back-left, slightly lower
    ];

    for (const spec of RAINBOW_COPIES) {
      const arc = buildSingleRainbowArc(radius, height, spec.scale, colorHex, colorId);
      arc.rotation.y = (spec.angleDeg * Math.PI) / 180;
      arc.position.y = spec.yFrac * height;
      group.add(arc);
    }
  } else if (variant === 'cloudyChump') {
    // Variation 2: Cloudy Champ (randomized clouds only, respects colorHex/colorId)
    const cloudyChump = buildCloudyChump(radius, height, colorHex, colorId, cloudStandoff);
    group.add(cloudyChump);
  } else if (variant === 'starBurst') {
    // Variation 3: Star Burst (scattered buttercream stars, respects colorHex/colorId)
    const starBurst = buildStarBurst(radius, height, colorHex, false, colorId);
    group.add(starBurst);
  } else if (variant === 'assortedStarBurst') {
    // Variation 4: Assorted Star Burst (scattered buttercream stars in assorted colors)
    const assortedStarBurst = buildStarBurst(radius, height, colorHex, true);
    group.add(assortedStarBurst);
  } else if (variant === 'starryRainbow') {
    // Variation 5: Starry Rainbow (Rainbow Arc + Cloudy Champ + Star Burst)
    const starryRainbow = buildStarryRainbow(radius, height, colorHex, false, colorId, cloudStandoff);
    group.add(starryRainbow);
  } else if (variant === 'assortedStarryRainbow') {
    // Variation 6: Same as Starry Rainbow but with assorted star colors
    const assortedStarryRainbow = buildStarryRainbow(radius, height, colorHex, true, colorId, cloudStandoff);
    group.add(assortedStarryRainbow);
  } else if (variant === 'rainbowChamp') {
    // Legacy support: combination of Rainbow Arc and Cloudy Champ
    const rainbowChamp = buildRainbowChamp(radius, height, colorHex);
    group.add(rainbowChamp);
  }

  return group;
}