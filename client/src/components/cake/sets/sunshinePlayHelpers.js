import * as THREE from 'three';

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

function buildStarBurst(radius, height, colorHex) {
  const group = new THREE.Group();

  // Buttercream material for stars — slightly rough, soft buttercream look
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex || '#FFFDF7',
    roughness: 0.7,
    metalness: 0,
  });

  // Create reusable star geometry
  const starGeo = buildStarGeo(1);

  // Calculate star count based on cake surface area
  const areaPerStar = 1.2; // reduced density - fewer stars
  const starCount = Math.max(40, Math.round((2 * Math.PI * radius * height) / areaPerStar));

  const points = scatterStarPositions(starCount);

  for (let i = 0; i < starCount; i++) {
    const { angle, heightFrac, sizeFrac } = points[i];

    // Position star on the cake side with slight standoff
    const y = -height / 2 + height * 0.05 + heightFrac * height * 0.9;
    const scale = 0.8 + sizeFrac * 0.6; // varied sizes: 0.8–1.4
    const standoffRadius = radius + 0.02; // thin stars hug the wall closely

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


// Build a single cloud (no stars). Outline is hand-placed to match a
// specific reference sketch, not procedurally generated like the rest of
// this file's scatters — the whole point of this shape is the asymmetry:
// four TOP bumps that each start and end at different points and are
// different widths/heights (not a repeating scallop) — smallest bump
// nearest the left cusp, tallest just right of center, a second tall bump
// close behind it, then a small one tucked against the right cusp —
// separated by notches of different depths (deep after bump 1, barely
// there between bumps 2–3, shallow after bump 3). The BOTTOM has its own
// waviness, but it's wide, shallow, and blends together far more than the
// top does — a couple of very broad, barely-differentiated undulations
// rather than separate lobes. Both side "tips" are small cusp notches,
// not points sticking straight out.
//
// Built by fitting a spline through hand-placed anchor points (Shape's
// built-in splineThru — a Catmull-Rom curve) rather than hand-tuned
// bezier handles: it's a much more reliable way to guarantee the curve
// actually passes through each intended peak/notch at the intended
// height, instead of fighting control-point math to get there. Verified
// by rendering this exact point set to a flat SVG preview and comparing
// it against the reference sketch before wiring it in here.
// Samples a smoothly CLOSED Catmull-Rom loop through `rawPoints`.
// THREE.SplineCurve (the 2D spline) has no built-in "closed" option, and
// Shape's convenience method (moveTo + splineThru + closePath) doesn't
// fake one either — closePath() draws a flat, straight LineCurve from the
// last spline point back to the start instead of curving into it. For a
// widely-spaced pair of points (like the last bottom anchor back to the
// left cusp here) that straight segment is long enough to read as an
// actual flat facet cutting across the shape — that's what the sharp
// edge was. Fixed by padding the point list with the last/first points
// (so the curve has correct tangent info right at the seam) and sampling
// only the real range plus the one wrap-around segment back to the start,
// so every part of the outline — including the seam — is genuine curve,
// not a straight line pretending to be one.
function buildClosedSplineOutline(rawPoints, scale, samplesPerSegment = 16) {
  const n = rawPoints.length;
  const pts = rawPoints.map(([x, y]) => new THREE.Vector2(x * scale, y * scale));
  const padded = [pts[n - 1], ...pts, pts[0]];
  const curve = new THREE.SplineCurve(padded);
  const knotSpacing = 1 / (padded.length - 1);
  const startT = knotSpacing;   // first real point
  const endT = 1;               // wraps exactly back to the first real point
  const totalSamples = n * samplesPerSegment;
  const outline = [];
  for (let i = 0; i <= totalSamples; i++) {
    outline.push(curve.getPoint(startT + (endT - startT) * (i / totalSamples)));
  }
  return outline;
}

// Build a single cloud (no stars). Outline is hand-placed to match a
// specific reference sketch, not procedurally generated like the rest of
// this file's scatters — the whole point of this shape is the asymmetry:
// four TOP bumps that each start and end at different points and are
// different widths/heights (not a repeating scallop) — smallest bump
// nearest the left cusp, tallest just right of center, a second tall bump
// close behind it, then a small one tucked against the right cusp —
// separated by notches of different depths (deep after bump 1, barely
// there between bumps 2–3, shallow after bump 3). The BOTTOM has its own
// waviness, but it's wide, shallow, and blends together far more than the
// top does — a couple of very broad, barely-differentiated undulations
// rather than separate lobes. Both side "tips" are small, gently rounded
// cusps, not sharp points or flat facets.
//
// EDITING THIS SHAPE: every peak, notch, and cusp is one [x, y] pair in
// `anchors` below — move a point to reshape that part of the outline,
// add one for a new bump/notch, or delete one to merge two features.
// Coordinates are roughly -1..1 in both axes before `scale` is applied.
const CLOUD_ANCHORS = [
  // --- TOP OUTLINE (4 Distinct Circular Spheres Clumped Together) ---

  // Base transition from bottom-left curve
  [-1.25, -0.10],
  [-1.22, 0.08],

  // CIRCLE 1 (Far Left - Small Circular Sphere)
  [-1.18, 0.22],   // Vertical left side
  [-1.08, 0.36],   // Round apex top
  [-0.98, 0.36],   // Round apex top (flattens peak into a circle)
  [-0.88, 0.20],   // Vertical right side
  [-0.82, 0.18],   // Notch between Circle 1 & 2

  // CIRCLE 2 (Mid Left - Medium Circular Sphere)
  [-0.78, 0.42],   // Vertical left side
  [-0.64, 0.68],   // Round apex top
  [-0.50, 0.68],   // Round apex top
  [-0.36, 0.42],   // Vertical right side
  [-0.28, 0.38],   // Notch between Circle 2 & 3

  // CIRCLE 3 (Center - Large Dominant Circular Sphere)
  [-0.18, 0.62],   // Vertical left side
  [0.08, 0.92],    // Round apex top
  [0.38, 0.92],    // Round apex top
  [0.64, 0.62],    // Vertical right side
  [0.72, 0.50],    // Notch between Circle 3 & 4

  // CIRCLE 4 (Far Right - Medium-Right Circular Sphere)
  [0.82, 0.60],    // Vertical left side
  [0.98, 0.72],    // Round apex top
  [1.12, 0.72],    // Round apex top
  [1.26, 0.44],    // Vertical right side

  // Far Right Edge Transition
  [1.36, 0.12],
  [1.32, -0.18],

  // --- BOTTOM OUTLINE (Smooth Deep Baseline) ---
  [1.05, -0.38],
  [0.65, -0.48],
  [0.10, -0.56],
  [-0.20, -0.56],
  [-0.65, -0.46],
  [-1.02, -0.36],
  [-1.18, -0.24],
];

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

function createFluffyCloudShapeA(scale = 1) {
  const shape = new THREE.Shape();
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

function buildCloudyChump(radius, height, colorHex) {
  const group = new THREE.Group();

  const cloudMat = new THREE.MeshStandardMaterial({
    color: colorHex || CLOUD_COLOR,
    roughness: 0.55,
    metalness: 0.02,
  });

  // Generous cloud scale for bold, cute, visible fondant cloud cutouts
  const baseScale = Math.min(0.85, height * 0.40);
  const cloudDepth = 0.09; // 3D fondant thickness with flat look
  const standoff = 0.002; // flush against the cake cylinder wall

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

// 3D extruded fondant cloud with flat front face and crisp perpendicular side walls (no bevel, no bulges).
// Sits over the cut ends of the rainbow bands like a 3D cut fondant piece.
function buildFlatCloud(centerX, bottomY, wallRadius, scale, depth, zBack, isLeft = false, colorHex = CLOUD_COLOR) {
  const outline = buildClosedSplineOutline(CLOUD_ANCHORS, scale, 3);
  const xOffset = 0.057 * scale;
  const yOffset = 0.193 * scale;

  const shape = new THREE.Shape();
  if (isLeft) {
    const last = outline.length - 1;
    shape.moveTo((outline[last].x - xOffset) * -1, outline[last].y - yOffset);
    for (let i = last - 1; i >= 0; i--) {
      shape.lineTo((outline[i].x - xOffset) * -1, outline[i].y - yOffset);
    }
  } else {
    shape.moveTo(outline[0].x - xOffset, outline[0].y - yOffset);
    for (let i = 1; i < outline.length; i++) {
      shape.lineTo(outline[i].x - xOffset, outline[i].y - yOffset);
    }
  }
  shape.closePath();

  // Real 3D extrusion with NO bevel for clean, flat front and crisp perpendicular side walls
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false,
  });
  geo.translate(centerX, bottomY, zBack);
  wrapGeometryPreservingNormals(geo, wallRadius);

  const mat = new THREE.MeshStandardMaterial({
    color: colorHex || CLOUD_COLOR,
    roughness: 0.55,
    metalness: 0.02,
  });

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

/**
 * Builds the Sunshine Play side decoration as a single Group, sized to fit
 * within `height` and stuck flush against the cake wall at `radius` — one
 * accent piece, not tiled around the circumference like the other Side
 * treatments.
 */
export function buildSunshinePlay(radius, height, colorHex, variant = 'rainbowArc', _flavorId = 'vanilla') {
  const group = new THREE.Group();

  if (variant === 'rainbowArc') {
    // Rainbow Arc: concentric U-shaped arch bands with straight vertical legs
    // and puffy buttercream cloud clusters covering the ends. Fixed palette,
    // ignores colorHex/flavorId on purpose — see the doc comment at the top
    // of this file and SideSection.jsx's colorOverrideDisabled.
    const bandCount = RAINBOW_BAND_COLORS.length;

    // Wide, authentic rainbow proportions:
    // A generous outer radius and wide archway give it the classic rainbow curve,
    // with short straight vertical leg extensions so the ends plunge cleanly into the clouds.
    const outerRadius = height * 0.29; // generous outer radius for a wide, expansive arch
    const bandWidth = height * 0.050; // center-to-center band spacing
    const tube = bandWidth * 0.52; // tube radius (ensures seamless touching between neighboring bands)
    const legLength = height * 0.065; // subtle vertical leg extension into the clouds

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
    const bottomY = -legLength - 0.05 * height;
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

    group.add(rainbowGroup);

    // 3D extruded fondant cloud puffs (clean flat front face and crisp perpendicular side walls, like cut fondant)
    // centered over the leg midpoints (±legMidX) to cleanly cover all 4 band cut ends.
    const cloudScale = (legSpan * 1.35) / 2.62;
    const cloudDepth = 0.22; // sleek 3D plaque thickness (~10-12% of width)
    const zBack = tube * 2 + 0.015 - cloudDepth;
    const cloudFootY = -legLength + centerYOffset;
    const leftCloud = buildFlatCloud(-legMidX, cloudFootY, radius, cloudScale, cloudDepth, zBack, true);
    group.add(leftCloud);

    const rightCloud = buildFlatCloud(legMidX, cloudFootY, radius, cloudScale, cloudDepth, zBack, false);
    group.add(rightCloud);
  } else if (variant === 'starBurst') {
    // Star Burst: scattered buttercream stars hugging the cake side, respects colorHex
    const starBurst = buildStarBurst(radius, height, colorHex);
    group.add(starBurst);
  } else if (variant === 'cloudyChump') {
    // Cloudy Chump: randomized clouds only, respects colorHex
    const cloudyChump = buildCloudyChump(radius, height, colorHex);
    group.add(cloudyChump);
  }

  return group;
}