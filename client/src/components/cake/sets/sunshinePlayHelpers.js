import * as THREE from 'three';
import { getFrostingMaterial, applyVerticalGradientUV } from '../frostingMaterial';
import { getBoxyRadius } from '../cakeMath';
import { createBoxyPerimeter } from './pipingScrollsHelpers';

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

function scatterStarPositions(count, radius = 2.0, height = 2.0) {
  // Deterministic seeded random scattering with collision avoidance
  // so stars never overlap one another.
  const seed = 54321;
  const points = [];

  let current = seed;
  const seededRandom = () => {
    current = (current * 1103515245 + 12345) & 0x7fffffff;
    return current / 0x7fffffff;
  };

  const getStarScale = (sizeFrac) => {
    if (sizeFrac < 0.36) return 0.45 + (sizeFrac / 0.36) * 0.22;
    if (sizeFrac < 0.72) return 0.85 + ((sizeFrac - 0.36) / 0.36) * 0.30;
    return 1.35 + ((sizeFrac - 0.72) / 0.28) * 0.40;
  };

  const clearance = 0.05;
  const maxAttempts = count * 40;

  for (let attempt = 0; attempt < maxAttempts && points.length < count; attempt++) {
    const angle = seededRandom() * Math.PI * 2;
    const heightFrac = seededRandom();
    const sizeFrac = seededRandom();
    const scale = getStarScale(sizeFrac);
    const starRadius = 0.17 * scale;

    const y = -height / 2 + height * 0.05 + heightFrac * height * 0.9;

    let collides = false;
    for (const p of points) {
      let dTheta = Math.abs(angle - p.angle);
      if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
      const arcDist = dTheta * radius;
      const py = -height / 2 + height * 0.05 + p.heightFrac * height * 0.9;
      const dy = Math.abs(y - py);
      const dist = Math.hypot(arcDist, dy);

      const pScale = getStarScale(p.sizeFrac);
      const minDist = starRadius + 0.17 * pScale + clearance;
      if (dist < minDist) {
        collides = true;
        break;
      }
    }

    if (!collides) {
      points.push({ angle, heightFrac, sizeFrac });
    }
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

function buildStarBurst(radius, height, colorHex, isAssorted = false, colorId = null, opts = {}) {
  const options = typeof opts === 'boolean' ? { hasDrip: opts } : (opts || {});
  const hasDrip = Boolean(options.hasDrip || options.atDrip);
  const coatThickness = options.coatThickness ?? options.dripThickness ?? 0.06;
  const dripOffset = options.dripOffset ?? coatThickness;
  const surfaceRadius = radius + (hasDrip ? dripOffset : 0);

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

  const points = scatterStarPositions(starCount, radius, height);

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

    // 75/25 vision: 75% visible, 25% buried in the glaze/wall (matching Scatter Pearls).
    // buildStarGeo(1) bounds: minZ = -0.02 * scale, maxZ = +0.10 * scale (T = 0.12 * scale).
    // standoffRadius = surfaceRadius - 0.01 * scale gives 75% protrusion (0.09 * scale) and 25% burial (0.03 * scale).
    const standoffRadius = surfaceRadius - 0.01 * scale;

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
//
// ExtrudeGeometry triangulates its flat front/back faces using ONLY the
// outline points, so those faces are made of a few long triangles spanning
// the whole cloud. Wrapping just the vertices onto the cylinder leaves those
// long triangles as straight chords, which cut through the cylinder: on a
// 4"-radius cake a ~2"-wide cloud sags ~0.15 at its middle, more than the
// cloud's whole 0.09 thickness, so the middle of the cloud's front face ended
// up buried inside the cake wall and only the cloud's rim showed.
// subdivideFlatFacesForWrap() first splits those flat faces into small
// triangles (all by the same level, so there are no T-junction cracks), so
// the wrapped face follows the curve of the wall.
function subdivideFlatFacesForWrap(geo, maxEdge = 0.3, maxLevel = 4) {
  const src = geo.index ? geo.toNonIndexed() : geo;
  const pos = src.attributes.position;
  const nrm = src.attributes.normal;
  const uv = src.attributes.uv;
  const triCount = pos.count / 3;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const fn = new THREE.Vector3();

  // A triangle is a flat cap face when its geometric normal is along Z.
  const isCap = new Array(triCount);
  let longestCapEdge = 0;
  for (let t = 0; t < triCount; t++) {
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    fn.crossVectors(e1, e2).normalize();
    isCap[t] = Math.abs(fn.z) > 0.99;
    if (isCap[t]) {
      longestCapEdge = Math.max(longestCapEdge, e1.length(), e2.length(), c.distanceTo(b));
    }
  }

  let level = 0;
  while (level < maxLevel && longestCapEdge / 2 ** level > maxEdge) level++;
  if (level === 0) return;

  const outPos = [];
  const outNrm = [];
  const outUv = [];

  const emit = (p, n, u) => {
    outPos.push(p[0], p[1], p[2]);
    outNrm.push(n[0], n[1], n[2]);
    if (uv) outUv.push(u[0], u[1]);
  };
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
  const mid2 = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];

  const split = (P, N, U, depth) => {
    if (depth === 0) {
      for (let k = 0; k < 3; k++) emit(P[k], N[k], U[k]);
      return;
    }
    const pm = [mid(P[0], P[1]), mid(P[1], P[2]), mid(P[2], P[0])];
    const nm = [mid(N[0], N[1]), mid(N[1], N[2]), mid(N[2], N[0])];
    const um = uv ? [mid2(U[0], U[1]), mid2(U[1], U[2]), mid2(U[2], U[0])] : [null, null, null];
    split([P[0], pm[0], pm[2]], [N[0], nm[0], nm[2]], [U[0], um[0], um[2]], depth - 1);
    split([pm[0], P[1], pm[1]], [nm[0], N[1], nm[1]], [um[0], U[1], um[1]], depth - 1);
    split([pm[2], pm[1], P[2]], [nm[2], nm[1], N[2]], [um[2], um[1], U[2]], depth - 1);
    split([pm[0], pm[1], pm[2]], [nm[0], nm[1], nm[2]], [um[0], um[1], um[2]], depth - 1);
  };

  for (let t = 0; t < triCount; t++) {
    const P = [], N = [], U = [];
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      P.push([pos.getX(i), pos.getY(i), pos.getZ(i)]);
      N.push([nrm.getX(i), nrm.getY(i), nrm.getZ(i)]);
      U.push(uv ? [uv.getX(i), uv.getY(i)] : null);
    }
    split(P, N, U, isCap[t] ? level : 0);
  }

  geo.setIndex(null);
  geo.clearGroups(); // every caller uses a single material
  geo.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(outNrm, 3));
  if (uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(outUv, 2));
}

function wrapGeometryPreservingNormals(geo, wallRadius) {
  // Must run in the flat (pre-wrap) frame, where triangle edges still have
  // their true lengths and the cap faces are exactly planar.
  subdivideFlatFacesForWrap(geo);

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

function signedAngleDelta(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  else if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function computeBoundingBox(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

const CLOUD_A_PTS = createFluffyCloudShapeA(1, false).getPoints(8);
const CLOUD_A_MIRRORED_PTS = createFluffyCloudShapeA(1, true).getPoints(8);
const CLOUD_B_PTS = createFluffyCloudShapeB(1).getPoints(8);

const CLOUD_A_BBOX = computeBoundingBox(CLOUD_A_PTS);
const CLOUD_A_MIRRORED_BBOX = computeBoundingBox(CLOUD_A_MIRRORED_PTS);
const CLOUD_B_BBOX = computeBoundingBox(CLOUD_B_PTS);

function signedDistToPolygon(px, py, pts, bbox) {
  const marginNorm = 0.15;
  if (px < bbox.minX - marginNorm || px > bbox.maxX + marginNorm ||
      py < bbox.minY - marginNorm || py > bbox.maxY + marginNorm) {
    return -999;
  }

  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y;
    const xj = pts[j].x, yj = pts[j].y;
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  let minD2 = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const x1 = pts[j].x, y1 = pts[j].y;
    const x2 = pts[i].x, y2 = pts[i].y;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const qx = x1 + t * dx;
    const qy = y1 + t * dy;
    const d2 = (px - qx) * (px - qx) + (py - qy) * (py - qy);
    if (d2 < minD2) minD2 = d2;
  }

  const d = Math.sqrt(minD2);
  return inside ? d : -d;
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

function buildCloudyChump(radius, height, colorHex, colorId = null, cloudStandoffOverride = null, opts = {}) {
  const options = typeof opts === 'boolean' ? { hasDrip: opts } : (opts || {});
  const hasDrip = Boolean(options.hasDrip || options.atDrip);
  const coatThickness = options.coatThickness ?? options.dripThickness ?? 0.06;
  const maxGlazeCarveDepth = options.maxCarveDepth ?? 0.50;
  const dripCarvedThickness = coatThickness * (1 - maxGlazeCarveDepth);
  const dripOffset = options.dripOffset ?? dripCarvedThickness;

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
  // When at Drip, standoff sits on the reduced Drip layer so the Drip remains visible underneath.
  const baseStandoff = cloudStandoffOverride ?? 0.002;
  const standoff = baseStandoff + (hasDrip ? dripOffset : 0);

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
function buildSingleRainbowArc(radius, height, scale = 1, colorHex = CLOUD_COLOR, colorId = null, whiteClouds = false, opts = {}) {
  const options = typeof opts === 'boolean' ? { hasDrip: opts } : (opts || {});
  const hasDrip = Boolean(options.hasDrip || options.atDrip);
  const coatThickness = options.coatThickness ?? options.dripThickness ?? 0.06;
  const maxGlazeCarveDepth = options.maxCarveDepth ?? 0.50;
  const dripCarvedThickness = coatThickness * (1 - maxGlazeCarveDepth);
  const dripOffset = options.dripOffset ?? dripCarvedThickness;
  const surfaceRadius = radius + (hasDrip ? dripOffset : 0);

  const arcGroup = new THREE.Group();
  const effectiveHeight = height * scale;

  const bandCount = RAINBOW_BAND_COLORS.length;

  // Wide, authentic rainbow proportions:
  // A generous outer radius and wide archway give it the classic rainbow curve,
  // with short straight vertical leg extensions so the ends plunge cleanly into the clouds.
  const outerRadius = effectiveHeight * 0.29; // generous outer radius for a wide, expansive arch
  const bandWidth = effectiveHeight * 0.050; // center-to-center band spacing
  const tube = bandWidth * 0.52; // tube radius (ensures seamless touching between neighboring bands)
  const legLength = effectiveHeight * 0.035; // vertical leg extension safely terminates inside cloud body

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
    wrapGeometryToCylinder(geo, surfaceRadius);
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
  // centered over the leg midpoints (±legMidX) to cleanly and fully cover all 4 band cut ends.
  // Generous scale, depth, and vertical centering ensure zero clipping or poke-through of the rainbow.
  const cloudScale = Math.max((legSpan * 2.15) / 1.985, effectiveHeight * 0.21);
  const cloudDepth = Math.max(0.28 * scale, tube * 3.0); // generous 3D plaque thickness fully encasing tubes
  const zBack = 0.005; // sits flush to wall so cloud front face sits well in front of tube apex
  const cloudFootY = -legLength + centerYOffset + 0.12 * cloudScale;
  const cloudColor = whiteClouds ? '#FFFFFF' : colorHex;
  const cloudColorId = whiteClouds ? null : colorId;
  const leftCloud = buildFlatCloud(-legMidX, cloudFootY, surfaceRadius, cloudScale, cloudDepth, zBack, true, cloudColor, cloudColorId);
  arcGroup.add(leftCloud);

  const rightCloud = buildFlatCloud(legMidX, cloudFootY, surfaceRadius, cloudScale, cloudDepth, zBack, false, cloudColor, cloudColorId);
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

  // Rainbow obstacle definitions matching buildSingleRainbowArc exactly
  const rainbowObstacles = RAINBOW_CHAMP_ARCS.map((a) => {
    const effectiveHeight = height * a.scale;
    const outerRadius = effectiveHeight * 0.29;
    const bandWidth = effectiveHeight * 0.050;
    const tube = bandWidth * 0.52;
    const legLength = effectiveHeight * 0.035;
    const innerRadius = outerRadius - 3 * bandWidth;
    const topY = outerRadius + tube;
    const bottomY = -legLength - 0.05 * effectiveHeight;
    const centerYOffset = -(topY + bottomY) / 2;
    const legMidX = (innerRadius + outerRadius) / 2;
    const legSpan = (outerRadius + tube) - (innerRadius - tube);
    const cloudScale = Math.max((legSpan * 2.15) / 1.985, effectiveHeight * 0.21);
    const cloudFootY = -legLength + centerYOffset + 0.12 * cloudScale;

    // Full bounding envelope of the rainbow arc + connected cloud feet:
    // Cloud feet reach horizontally to ±(legMidX + 1.18 * cloudScale)
    const halfW = legMidX + 1.18 * cloudScale;
    const yMin = cloudFootY - 0.35 * cloudScale;
    const yMax = topY + centerYOffset;

    return {
      angle: (a.angleDeg * Math.PI) / 180,
      y: a.yFrac * height,
      halfW,
      yMin,
      yMax,
    };
  });

  // Cloud obstacle definitions matching createFluffyCloudShapeA/B
  const cloudObstacles = RAINBOW_CHAMP_CLOUDS.map((c) => {
    const scale = baseScale * c.sizeMul;
    return {
      angle: (c.angleDeg * Math.PI) / 180,
      yCenter: c.yFrac * height + 0.19 * scale,
      halfW: 1.18 * scale,
      halfH: 0.52 * scale,
    };
  });

  // Seeded deterministic scattering
  let seed = 839201;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const stars = [];
  const targetStars = Math.max(16, Math.round(20 * (radius / 2.5) * (height / 1.7)));

  for (let attempt = 0; attempt < 1200 && stars.length < targetStars; attempt++) {
    const angle = rand() * Math.PI * 2;
    const y = (-0.40 + rand() * 0.80) * height;

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
    const starRadius = 0.17 * starScale;
    const clearance = 0.06;

    let collides = false;

    // 1. Collision check against Rainbow Arcs and their connected clouds
    for (const rObs of rainbowObstacles) {
      let dTheta = Math.abs(angle - rObs.angle);
      if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
      const arcDist = dTheta * radius;
      const yRel = y - rObs.y;

      const testHalfW = rObs.halfW + starRadius + clearance;
      const testYMin = rObs.yMin - starRadius - clearance;
      const testYMax = rObs.yMax + starRadius + clearance;

      if (arcDist < testHalfW && yRel >= testYMin && yRel <= testYMax) {
        collides = true;
        break;
      }
    }

    // 2. Collision check against Cloudy Champ clouds
    if (!collides) {
      for (const cObs of cloudObstacles) {
        let dTheta = Math.abs(angle - cObs.angle);
        if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
        const arcDist = dTheta * radius;
        const dy = Math.abs(y - cObs.yCenter);

        const testW = cObs.halfW + starRadius + clearance;
        const testH = cObs.halfH + starRadius + clearance;

        if ((arcDist / testW) ** 2 + (dy / testH) ** 2 < 1.0) {
          collides = true;
          break;
        }
      }
    }

    // 3. Collision check against already-placed Stars
    if (!collides) {
      for (const s of stars) {
        let dTheta = Math.abs(angle - s.angle);
        if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
        const arcDist = dTheta * radius;
        const dy = Math.abs(y - s.y);
        const dist = Math.hypot(arcDist, dy);

        const minDist = starRadius + (0.17 * s.scale) + clearance;
        if (dist < minDist) {
          collides = true;
          break;
        }
      }
    }

    if (!collides) {
      stars.push({ angle, y, scale: starScale });
    }
  }

  return stars;
}

function buildStarryRainbow(radius, height, colorHex, isAssortedStars = false, colorId = null, cloudStandoffOverride = null, opts = {}) {
  const options = typeof opts === 'boolean' ? { hasDrip: opts } : (opts || {});
  const hasDrip = Boolean(options.hasDrip || options.atDrip);
  const coatThickness = options.coatThickness ?? options.dripThickness ?? 0.06;
  const maxGlazeCarveDepth = options.maxCarveDepth ?? 0.50;
  const dripCarvedThickness = coatThickness * (1 - maxGlazeCarveDepth);
  const dripOffset = options.dripOffset ?? coatThickness;
  const surfaceRadius = radius + (hasDrip ? dripOffset : 0);

  const group = new THREE.Group();

  // 1. Rainbow Arcs
  for (const spec of RAINBOW_CHAMP_ARCS) {
    const arc = buildSingleRainbowArc(
      radius,
      height,
      spec.scale,
      colorHex,
      colorId,
      false,
      opts,
    );
    arc.rotation.y = (spec.angleDeg * Math.PI) / 180;
    arc.position.y = spec.yFrac * height;
    group.add(arc);
  }

  // 2. Cloudy Champ Clouds — uses getFrostingMaterial so normal default sugar
  // color and gradient/metallic Sugar Colors apply cleanly.
  const cloudMat = getFrostingMaterial(colorHex || CLOUD_COLOR, colorId);

  const baseScale = Math.min(0.85, height * 0.38);
  const cloudDepth = 0.09;
  // Sits on the reduced drip layer when hasDrip is true so the Drip remains visible underneath.
  const baseCloudStandoff = cloudStandoffOverride ?? 0.002;
  const cloudStandoff = baseCloudStandoff + (hasDrip ? dripCarvedThickness : 0);

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

  // Star placement lives in computeStarryRainbowStars (shared with
  // getSunshinePlayCoverageFn so glaze windows use the identical layout).
  const placedStars = computeStarryRainbowStars(radius, height);
  placedStars.forEach(({ angle, y, scale: starScale }, idx) => {
    const mat = starMats[(idx + 1) % starMats.length];
    const star = new THREE.Mesh(starGeo, mat);

    // 75/25 vision: 75% visible, 25% buried in the glaze/drip (matching Scatter Pearls).
    // buildStarGeo(1) bounds: minZ = -0.02 * scale, maxZ = +0.10 * scale (T = 0.12 * scale).
    // standoffRadius = surfaceRadius - 0.01 * starScale gives 75% protrusion (0.09 * starScale) and 25% burial (0.03 * starScale).
    const standoffRadius = surfaceRadius - 0.01 * starScale;
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

// ─── Sky Chumps (Stars and Clouds only) ───────────────────────────────────────
// Whimsical pairing of fluffy 3D fondant clouds and scattered buttercream stars.

function computeSkyChumpsStars(radius, height) {
  const baseScale = Math.min(0.85, height * 0.40);
  const cloudObstacles = CLOUDY_CHUMP_SPECS.map((c) => {
    const scale = baseScale * c.sizeMul;
    return {
      angle: (c.angleDeg * Math.PI) / 180,
      yCenter: c.yFrac * height + 0.19 * scale,
      halfW: 1.18 * scale,
      halfH: 0.52 * scale,
    };
  });

  let seed = 712349;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const stars = [];
  const targetStars = Math.max(18, Math.round(24 * (radius / 2.5) * (height / 1.7)));

  for (let attempt = 0; attempt < 1200 && stars.length < targetStars; attempt++) {
    const angle = rand() * Math.PI * 2;
    const y = (-0.40 + rand() * 0.80) * height;

    let starScale;
    const sizeFrac = rand();
    if (sizeFrac < 0.36) {
      starScale = 0.45 + (sizeFrac / 0.36) * 0.22;
    } else if (sizeFrac < 0.72) {
      starScale = 0.85 + ((sizeFrac - 0.36) / 0.36) * 0.30;
    } else {
      starScale = 1.35 + ((sizeFrac - 0.72) / 0.28) * 0.40;
    }
    const starRadius = 0.17 * starScale;
    const clearance = 0.06;

    let collides = false;

    // 1. Collision check against Cloudy Champ clouds
    for (const cObs of cloudObstacles) {
      let dTheta = Math.abs(angle - cObs.angle);
      if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
      const arcDist = dTheta * radius;
      const dy = Math.abs(y - cObs.yCenter);

      const testW = cObs.halfW + starRadius + clearance;
      const testH = cObs.halfH + starRadius + clearance;

      if ((arcDist / testW) ** 2 + (dy / testH) ** 2 < 1.0) {
        collides = true;
        break;
      }
    }

    // 2. Collision check against already-placed stars
    if (!collides) {
      for (const s of stars) {
        let dTheta = Math.abs(angle - s.angle);
        if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
        const arcDist = dTheta * radius;
        const dy = Math.abs(y - s.y);
        const dist = Math.hypot(arcDist, dy);

        const minDist = starRadius + (0.17 * s.scale) + clearance;
        if (dist < minDist) {
          collides = true;
          break;
        }
      }
    }

    if (!collides) {
      stars.push({ angle, y, scale: starScale });
    }
  }

  return stars;
}

function buildSkyChumps(radius, height, colorHex, colorId = null, cloudStandoffOverride = null, opts = {}) {
  const options = typeof opts === 'boolean' ? { hasDrip: opts } : (opts || {});
  const hasDrip = Boolean(options.hasDrip || options.atDrip);
  const coatThickness = options.coatThickness ?? options.dripThickness ?? 0.06;
  const dripOffset = options.dripOffset ?? coatThickness;
  const surfaceRadius = radius + (hasDrip ? dripOffset : 0);

  const group = new THREE.Group();

  // 1. Clouds from Cloudy Champ
  const clouds = buildCloudyChump(radius, height, colorHex, colorId, cloudStandoffOverride, opts);
  group.add(clouds);

  // 2. Stars scattered around the clouds
  const starMat = getFrostingMaterial(colorHex || '#FFFDF7', colorId);
  const starGeo = buildStarGeo(1);
  applyVerticalGradientUV(starGeo);

  const placedStars = computeSkyChumpsStars(radius, height);
  placedStars.forEach(({ angle, y, scale: starScale }) => {
    const star = new THREE.Mesh(starGeo, starMat);
    const standoffRadius = surfaceRadius - 0.01 * starScale;
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

// ─── Sunshine Stars (Rainbow and Stars only) ──────────────────────────────────
// Cheerful pairing of vibrant rainbow arcs and scattered buttercream stars.

function computeSunshineStars(radius, height) {
  const rainbowObstacles = RAINBOW_CHAMP_ARCS.map((a) => {
    const effectiveHeight = height * a.scale;
    const outerRadius = effectiveHeight * 0.29;
    const bandWidth = effectiveHeight * 0.050;
    const tube = bandWidth * 0.52;
    const legLength = effectiveHeight * 0.035;
    const innerRadius = outerRadius - 3 * bandWidth;
    const topY = outerRadius + tube;
    const bottomY = -legLength - 0.05 * effectiveHeight;
    const centerYOffset = -(topY + bottomY) / 2;
    const legMidX = (innerRadius + outerRadius) / 2;
    const legSpan = (outerRadius + tube) - (innerRadius - tube);
    const cloudScale = Math.max((legSpan * 2.15) / 1.985, effectiveHeight * 0.21);
    const cloudFootY = -legLength + centerYOffset + 0.12 * cloudScale;

    const halfW = legMidX + 1.18 * cloudScale;
    const yMin = cloudFootY - 0.35 * cloudScale;
    const yMax = topY + centerYOffset;

    return {
      angle: (a.angleDeg * Math.PI) / 180,
      y: a.yFrac * height,
      halfW,
      yMin,
      yMax,
    };
  });

  let seed = 582913;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const stars = [];
  const targetStars = Math.max(20, Math.round(26 * (radius / 2.5) * (height / 1.7)));

  for (let attempt = 0; attempt < 1200 && stars.length < targetStars; attempt++) {
    const angle = rand() * Math.PI * 2;
    const y = (-0.40 + rand() * 0.80) * height;

    let starScale;
    const sizeFrac = rand();
    if (sizeFrac < 0.36) {
      starScale = 0.45 + (sizeFrac / 0.36) * 0.22;
    } else if (sizeFrac < 0.72) {
      starScale = 0.85 + ((sizeFrac - 0.36) / 0.36) * 0.30;
    } else {
      starScale = 1.35 + ((sizeFrac - 0.72) / 0.28) * 0.40;
    }
    const starRadius = 0.17 * starScale;
    const clearance = 0.06;

    let collides = false;

    // 1. Collision check against Rainbow Arcs and their connected clouds
    for (const rObs of rainbowObstacles) {
      let dTheta = Math.abs(angle - rObs.angle);
      if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
      const arcDist = dTheta * radius;
      const yRel = y - rObs.y;

      const testHalfW = rObs.halfW + starRadius + clearance;
      const testYMin = rObs.yMin - starRadius - clearance;
      const testYMax = rObs.yMax + starRadius + clearance;

      if (arcDist < testHalfW && yRel >= testYMin && yRel <= testYMax) {
        collides = true;
        break;
      }
    }

    // 2. Collision check against already-placed stars
    if (!collides) {
      for (const s of stars) {
        let dTheta = Math.abs(angle - s.angle);
        if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
        const arcDist = dTheta * radius;
        const dy = Math.abs(y - s.y);
        const dist = Math.hypot(arcDist, dy);

        const minDist = starRadius + (0.17 * s.scale) + clearance;
        if (dist < minDist) {
          collides = true;
          break;
        }
      }
    }

    if (!collides) {
      stars.push({ angle, y, scale: starScale });
    }
  }

  return stars;
}

function buildSunshineStars(radius, height, colorHex, colorId = null, opts = {}) {
  const options = typeof opts === 'boolean' ? { hasDrip: opts } : (opts || {});
  const hasDrip = Boolean(options.hasDrip || options.atDrip);
  const coatThickness = options.coatThickness ?? options.dripThickness ?? 0.06;
  const dripOffset = options.dripOffset ?? coatThickness;
  const surfaceRadius = radius + (hasDrip ? dripOffset : 0);

  const group = new THREE.Group();

  // 1. Rainbow Arcs (with their connected cloud feet)
  for (const spec of RAINBOW_CHAMP_ARCS) {
    const arc = buildSingleRainbowArc(
      radius,
      height,
      spec.scale,
      colorHex,
      colorId,
      false,
      opts,
    );
    arc.rotation.y = (spec.angleDeg * Math.PI) / 180;
    arc.position.y = spec.yFrac * height;
    group.add(arc);
  }

  // 2. Stars scattered around the rainbows
  const starMat = getFrostingMaterial(colorHex || '#FFFDF7', colorId);
  const starGeo = buildStarGeo(1);
  applyVerticalGradientUV(starGeo);

  const placedStars = computeSunshineStars(radius, height);
  placedStars.forEach(({ angle, y, scale: starScale }) => {
    const star = new THREE.Mesh(starGeo, starMat);
    const standoffRadius = surfaceRadius - 0.01 * starScale;
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
  const legLength = effectiveHeight * 0.035;
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
  const legSpan = (outerRadius + tube) - (innerRadius - tube);
  const cloudScale = Math.max((legSpan * 2.15) / 1.985, effectiveHeight * 0.21);
  const cloudFootY = -legLength + centerYOffset + 0.12 * cloudScale;

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
  const isBoxy = opts.shape === 'rectangle' || opts.shape === 'square' || opts.cakeShape === 'rectangle' || opts.cakeShape === 'square';
  if (isBoxy) {
    return getBoxySunshinePlayCoverageFn(radius, height, opts);
  }

  const variant = opts.variant || 'rainbowArc';
  const elements = [];

  // forGlaze: Glaze's own use of this function (see CakeScene.jsx's
  // glazeSunshinePlayCoverageFn). Filling keeps the original 0.11*scale
  // footprint. For Glaze / Drip empty spaces: ensure carve depth isn't so deep that the Drip from that
  // emptied area is gone — preserve a visible Drip layer (default max carve depth 0.50).
  const forGlaze = !!opts.forGlaze;
  const maxDepth = forGlaze ? (opts.maxCarveDepth ?? 0.50) : (opts.maxCarveDepth ?? 1.0);
  const addStar = (angle, y, scale) => {
    if (forGlaze) return; // Stars sit in 75/25 vision on the Glaze/Drip; no empty spaces carved (matching Scatter Pearls)
    elements.push({ type: 'circle', angle, y, r: 0.11 * scale });
  };
  const addCloud = (angle, y, scale, variant = 'A') => {
    const isB = variant === 'B';
    const pts = isB ? CLOUD_B_PTS : CLOUD_A_PTS;
    const bbox = isB ? CLOUD_B_BBOX : CLOUD_A_BBOX;
    elements.push({
      type: 'cloud',
      angle,
      y,
      scale,
      pts,
      bbox,
    });
  };
  const addRainbowArc = (angleDeg, yFrac, scale) => {
    const effectiveHeight = height * scale;
    const bandCount = RAINBOW_BAND_COLORS.length;
    const outerRadius = effectiveHeight * 0.29;
    const bandWidth = effectiveHeight * 0.050;
    const tube = bandWidth * 0.52;
    const legLength = effectiveHeight * 0.035;

    const topY = outerRadius + tube;
    const bottomY = -legLength - 0.05 * effectiveHeight;
    const centerYOffset = -(topY + bottomY) / 2;

    const innerRadius = outerRadius - (bandCount - 1) * bandWidth;
    const legMidX = (innerRadius + outerRadius) / 2;
    const legSpan = (outerRadius + tube) - (innerRadius - tube);

    const groupAngle = (angleDeg * Math.PI) / 180;
    const groupY = yFrac * height;

    const cloudScale = Math.max((legSpan * 2.15) / 1.985, effectiveHeight * 0.21);
    const cloudFootY = -legLength + centerYOffset + 0.12 * cloudScale;
    const legBottomY = -legLength + centerYOffset;

    // Solid archway envelope: outer arch curve + vertical legs down to where they enter the cloud feet.
    // Carves the full silhouette so drips part cleanly around the rainbow and do not penetrate into the arch interior.
    // The bottom edge stops at the leg ends inside the cloud feet, so the cloud feet's exact polygon SDFs
    // sculpt the organic scalloped bottom contour without any flat horizontal cutoff.
    elements.push({
      type: 'rainbowArch',
      angle: groupAngle,
      y: groupY,
      outerRadius: outerRadius + tube,
      centerYOffset,
      legLength,
      legBottomY,
      cloudFootY,
      scale,
    });

    // Left cloud foot (createFluffyCloudShapeA unmirrored)
    // buildFlatCloud: centerX - xOffset where xOffset = -0.071 * cloudScale
    const leftCenterX = -legMidX + 0.071 * cloudScale;
    elements.push({
      type: 'cloud',
      angle: groupAngle + leftCenterX / radius,
      y: groupY + cloudFootY,
      scale: cloudScale,
      pts: CLOUD_A_PTS,
      bbox: CLOUD_A_BBOX,
    });

    // Right cloud foot (createFluffyCloudShapeA mirrored)
    // buildFlatCloud: centerX - xOffset where xOffset = +0.071 * cloudScale
    const rightCenterX = legMidX - 0.071 * cloudScale;
    elements.push({
      type: 'cloud',
      angle: groupAngle + rightCenterX / radius,
      y: groupY + cloudFootY,
      scale: cloudScale,
      pts: CLOUD_A_MIRRORED_PTS,
      bbox: CLOUD_A_MIRRORED_BBOX,
    });
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
      addCloud((spec.angleDeg * Math.PI) / 180, spec.yFrac * height, baseScale * spec.sizeMul, spec.variant);
    }
  } else if (variant === 'starBurst' || variant === 'assortedStarBurst') {
    const areaPerStar = 1.2;
    const starCount = Math.max(40, Math.round((2 * Math.PI * radius * height) / areaPerStar));
    const points = scatterStarPositions(starCount, radius, height);
    for (let i = 0; i < starCount; i++) {
      const { angle, heightFrac, sizeFrac } = points[i];
      const y = -height / 2 + height * 0.05 + heightFrac * height * 0.9;
      addStar(angle, y, starScaleFor(sizeFrac));
    }
  } else if (variant === 'skyChumps') {
    const baseScale = Math.min(0.85, height * 0.40);
    for (const spec of CLOUDY_CHUMP_SPECS) {
      addCloud((spec.angleDeg * Math.PI) / 180, spec.yFrac * height, baseScale * spec.sizeMul, spec.variant);
    }
    for (const st of computeSkyChumpsStars(radius, height)) {
      addStar(st.angle, st.y, st.scale);
    }
  } else if (variant === 'sunshineStars') {
    const RAINBOW_CHAMP_ARCS_LOCAL = [
      { angleDeg: 0, yFrac: 0.00, scale: 1.00 },
      { angleDeg: 165, yFrac: 0.06, scale: 0.90 },
    ];
    for (const spec of RAINBOW_CHAMP_ARCS_LOCAL) addRainbowArc(spec.angleDeg, spec.yFrac, spec.scale);
    for (const st of computeSunshineStars(radius, height)) {
      addStar(st.angle, st.y, st.scale);
    }
  } else if (variant === 'starrySunshinePlay' || variant === 'starryRainbow' || variant === 'assortedStarryRainbow') {
    const RAINBOW_CHAMP_ARCS_LOCAL = [
      { angleDeg: 0, yFrac: 0.00, scale: 1.00 },
      { angleDeg: 165, yFrac: 0.06, scale: 0.90 },
    ];
    for (const spec of RAINBOW_CHAMP_ARCS_LOCAL) addRainbowArc(spec.angleDeg, spec.yFrac, spec.scale);
    const baseScale = Math.min(0.85, height * 0.38);
    const RAINBOW_CHAMP_CLOUDS_LOCAL = [
      { angleDeg: 50, yFrac: 0.22, sizeMul: 1.05, variant: 'A' },
      { angleDeg: 105, yFrac: -0.22, sizeMul: 0.95, variant: 'B' },
      { angleDeg: 220, yFrac: -0.18, sizeMul: 0.92, variant: 'A' },
      { angleDeg: 265, yFrac: 0.20, sizeMul: 1.10, variant: 'B' },
      { angleDeg: 315, yFrac: -0.12, sizeMul: 0.96, variant: 'A' },
    ];
    for (const spec of RAINBOW_CHAMP_CLOUDS_LOCAL) {
      addCloud((spec.angleDeg * Math.PI) / 180, spec.yFrac * height, baseScale * spec.sizeMul, spec.variant);
    }
    for (const st of computeStarryRainbowStars(radius, height)) {
      addStar(st.angle, st.y, st.scale);
    }
  }

  const smoothstep = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };

  return (angle, localY) => {
    let coverage = 0;
    for (const el of elements) {
      if (el.type === 'cloud') {
        const dAngle = signedAngleDelta(angle, el.angle);
        const lx = dAngle * radius;
        const ly = localY - el.y;
        const px = lx / el.scale;
        const py = ly / el.scale;
        const signedDistNorm = signedDistToPolygon(px, py, el.pts, el.bbox);
        if (signedDistNorm >= -0.15) {
          const signedDist = signedDistNorm * el.scale;
          const margin = 0.04 * el.scale;
          const smoothW = 0.025 * el.scale;
          const distInside = signedDist + margin;
          if (distInside > 0) {
            const edgeWeight = smoothstep(distInside / smoothW);
            coverage = Math.max(coverage, edgeWeight * maxDepth);
          }
        }
      } else if (el.type === 'rainbowArch') {
        const dAngle = signedAngleDelta(angle, el.angle);
        const lx = dAngle * radius;
        const ly = localY - el.y;
        const R = el.outerRadius;
        const margin = 0.04 * el.scale;
        const smoothW = 0.025 * el.scale;
        const legBottomY = el.legBottomY ?? (el.centerYOffset - el.legLength);
        const yMax = el.centerYOffset + R + margin + smoothW;
        const yMin = legBottomY - margin - smoothW;

        if (ly >= yMin && ly <= yMax && Math.abs(lx) <= R + margin + smoothW) {
          let distInsideEdge;
          if (ly >= el.centerYOffset) {
            const distFromCenter = Math.hypot(lx, ly - el.centerYOffset);
            distInsideEdge = R - distFromCenter + margin;
          } else {
            const dx = Math.abs(lx) - R;
            const dy = legBottomY - ly;
            if (dx <= 0 && dy <= 0) {
              distInsideEdge = Math.min(-dx, -dy) + margin;
            } else if (dx > 0 && dy <= 0) {
              distInsideEdge = -dx + margin;
            } else if (dx <= 0 && dy > 0) {
              distInsideEdge = -dy + margin;
            } else {
              distInsideEdge = -Math.hypot(dx, dy) + margin;
            }
          }
          if (distInsideEdge > 0) {
            const edgeWeight = smoothstep(distInsideEdge / smoothW);
            coverage = Math.max(coverage, edgeWeight * maxDepth);
          }
        }
      } else if (el.type === 'circle') {
        const dAngle = signedAngleDelta(angle, el.angle);
        const arcDist = radius * dAngle;
        const dY = localY - el.y;
        const distInsideEdge = el.r - Math.hypot(arcDist, dY);
        const smoothWidth = Math.max(0.02, el.r * 0.25);
        if (distInsideEdge > 0) {
          const edgeWeight = smoothstep(distInsideEdge / smoothWidth);
          coverage = Math.max(coverage, edgeWeight * maxDepth);
        }
      }
      if (coverage >= maxDepth) return maxDepth;
    }
    return coverage;
  };
}

// ─── Boxy Cake Placement Helpers (Rectangle & Square) ───────────────────────

export function buildSingleRainbowArcFlat(
  height,
  scale = 1,
  colorHex = CLOUD_COLOR,
  colorId = null,
  whiteClouds = false,
  opts = {}
) {
  const options = typeof opts === 'boolean' ? { hasDrip: opts } : (opts || {});
  const hasDrip = Boolean(options.hasDrip || options.atDrip);
  const coatThickness = options.coatThickness ?? options.dripThickness ?? 0.06;
  const maxGlazeCarveDepth = options.maxCarveDepth ?? 0.50;
  const dripCarvedThickness = coatThickness * (1 - maxGlazeCarveDepth);
  const dripOffset = options.dripOffset ?? dripCarvedThickness;

  const arcGroup = new THREE.Group();
  const effectiveHeight = height * scale;

  const bandCount = RAINBOW_BAND_COLORS.length;
  const outerRadius = effectiveHeight * 0.29;
  const bandWidth = effectiveHeight * 0.050;
  const tube = bandWidth * 0.52;
  const legLength = effectiveHeight * 0.035;

  const bandRadii = [];
  for (let i = 0; i < bandCount; i++) {
    bandRadii.push(outerRadius - (bandCount - 1 - i) * bandWidth);
  }

  const innerRadius = bandRadii[0];
  const legMidX = (innerRadius + outerRadius) / 2;
  const legSpan = (outerRadius + tube) - (innerRadius - tube);

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
    const mat = new THREE.MeshStandardMaterial({
      color: RAINBOW_BAND_COLORS[i],
      roughness: 0.55,
      metalness: 0.02,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isBoxySunshinePlay = true;
    mesh.userData.morphedToBoxy = true;
    rainbowGroup.add(mesh);
  }

  arcGroup.add(rainbowGroup);

  const cloudScale = Math.max((legSpan * 2.15) / 1.985, effectiveHeight * 0.21);
  const cloudDepth = Math.max(0.28 * scale, tube * 3.0);
  const zBack = 0.005;
  const cloudFootY = -legLength + centerYOffset + 0.12 * cloudScale;
  const cloudColor = whiteClouds ? '#FFFFFF' : colorHex;
  const cloudColorId = whiteClouds ? null : colorId;

  // Left cloud (mirrored = false)
  const leftShape = createFluffyCloudShapeA(cloudScale, false);
  const leftGeo = new THREE.ExtrudeGeometry(leftShape, { depth: cloudDepth, bevelEnabled: false });
  leftGeo.translate(-legMidX + 0.071 * cloudScale, cloudFootY, zBack);
  applyVerticalGradientUV(leftGeo);
  const leftMat = getFrostingMaterial(cloudColor || CLOUD_COLOR, cloudColorId);
  const leftCloud = new THREE.Mesh(leftGeo, leftMat);
  leftCloud.castShadow = true;
  leftCloud.receiveShadow = true;
  leftCloud.userData.isBoxySunshinePlay = true;
  leftCloud.userData.morphedToBoxy = true;
  arcGroup.add(leftCloud);

  // Right cloud (mirrored = true)
  const rightShape = createFluffyCloudShapeA(cloudScale, true);
  const rightGeo = new THREE.ExtrudeGeometry(rightShape, { depth: cloudDepth, bevelEnabled: false });
  rightGeo.translate(legMidX - 0.071 * cloudScale, cloudFootY, zBack);
  applyVerticalGradientUV(rightGeo);
  const rightMat = getFrostingMaterial(cloudColor || CLOUD_COLOR, cloudColorId);
  const rightCloud = new THREE.Mesh(rightGeo, rightMat);
  rightCloud.castShadow = true;
  rightCloud.receiveShadow = true;
  rightCloud.userData.isBoxySunshinePlay = true;
  rightCloud.userData.morphedToBoxy = true;
  arcGroup.add(rightCloud);

  arcGroup.userData.isBoxySunshinePlay = true;
  arcGroup.userData.morphedToBoxy = true;
  return arcGroup;
}

// Clouds on Rectangle/Square + Drip must sit ON TOP of the drip coat. The
// glaze window around a cloud is carved only to half the coat (so the arcs and
// feet hug it), and the glaze mesh's angular resolution is fixed, so on large
// faces the sloped window edge swallows the cloud rim. Lift clouds to the full
// coat thickness so the whole cloud stays in front of the drip at any size.
function boxyCloudOffset(surfaceOffset, opts = {}) {
  if (!(opts.hasDrip || opts.atDrip)) return surfaceOffset;
  const coat = opts.coatThickness ?? opts.dripThickness ?? 0.06;
  return Math.max(surfaceOffset, coat * 0.95);
}

function positionOnBoxyFace(meshOrGroup, faceIdx, uCenter, y, surfaceOffset, perim) {
  const rotY = [0, Math.PI / 2, Math.PI, -Math.PI / 2][faceIdx];
  meshOrGroup.rotation.y = rotY;

  let posX = 0;
  let posZ = 0;
  if (faceIdx === 0) {
    posX = uCenter;
    posZ = perim.D + surfaceOffset;
  } else if (faceIdx === 1) {
    posX = perim.W + surfaceOffset;
    posZ = -uCenter;
  } else if (faceIdx === 2) {
    posX = -uCenter;
    posZ = -(perim.D + surfaceOffset);
  } else {
    posX = -(perim.W + surfaceOffset);
    posZ = uCenter;
  }
  meshOrGroup.position.set(posX, y, posZ);
}

// ─── Doubled Quantity Designs (Rectangle & Square only) ─────────────────────
// Sky Chumps, Sunshine Stars and Starry Sunshine Play render with twice the
// decorations on boxy cakes: every cloud, rainbow arc and star count is
// doubled. Round cakes keep their original layouts untouched.
const DOUBLED_QUANTITY_VARIANTS = new Set([
  'skyChumps',
  'sunshineStars',
  'starrySunshinePlay',
  'assortedStarryRainbow', // legacy id, shown as "Starry Sunshine Play"
]);

export function shouldDoubleDesignQuantities(variant, opts = {}) {
  if (!DOUBLED_QUANTITY_VARIANTS.has(variant)) return false;
  const shape = opts.shape ?? opts.cakeShape;
  return shape === 'rectangle' || shape === 'square';
}

// Keep each design's hand-placed layout and add one companion cloud per
// original (variant swapped, slightly smaller).
//
// The companion is aimed at the point-mirrored spot (-u, -y), but it is only
// accepted where it actually has room. The hand-placed layouts are themselves
// point-symmetric on several faces (every cloud pair on the narrow faces of
// Sky Chumps, and every pair in Starry Sunshine Play), so a plain mirror
// dropped each companion straight on top of its partner: two flat clouds in
// the same plane, which z-fight and merge into one lumpy blob. Instead the
// face is scanned for the free spot nearest the mirrored target that keeps a
// gap to every existing cloud and to the rainbow arcs. The scan is
// deterministic, and the mesh, the star scatter and the glaze coverage all
// call this with identical inputs, so they always agree on the layout.
// A companion with no room is skipped rather than overlapped.
const CLOUD_BOX_HALF_W = 1.2;   // cloud half-width / scale (shape spans ~-1.15..1.05)
const CLOUD_BOX_Y_MIN = -0.34;  // cloud bottom / scale
const CLOUD_BOX_Y_MAX = 0.72;   // cloud top / scale

function doubleCloudSpecs(specs, perim, height, obstacles = []) {
  const baseScale = Math.min(0.85, height * 0.38);
  const gap = 0.12;
  const boxOf = (faceIdx, u, y, scale) => ({
    faceIdx,
    uMin: u - CLOUD_BOX_HALF_W * scale,
    uMax: u + CLOUD_BOX_HALF_W * scale,
    yMin: y + CLOUD_BOX_Y_MIN * scale,
    yMax: y + CLOUD_BOX_Y_MAX * scale,
  });
  // Positive = clear space between the boxes, negative = overlap.
  const clearanceBetween = (a, b) => Math.max(
    Math.max(a.uMin - b.uMax, b.uMin - a.uMax),
    Math.max(a.yMin - b.yMax, b.yMin - a.yMax),
  );

  // Everything already occupying a face: the rainbow arcs first, then each
  // cloud as it is accepted.
  const placed = obstacles.map((o) => ({
    faceIdx: o.faceIdx, uMin: o.u - o.hw, uMax: o.u + o.hw, yMin: o.y - o.hh, yMax: o.y + o.hh,
  }));

  // Nearest free spot to (targetU, targetY) for a cloud of `scale` on a face,
  // or null when the face has no room.
  const findFreeSpot = (faceIdx, scale, targetU, targetY) => {
    const halfSpan = (faceIdx % 2 === 0 ? perim.xc : perim.zc) - CLOUD_BOX_HALF_W * scale - 0.05;
    const yLo = -0.5 * height + 0.05 - CLOUD_BOX_Y_MIN * scale;
    const yHi = 0.5 * height - 0.05 - CLOUD_BOX_Y_MAX * scale;
    if (halfSpan <= 0 || yHi < yLo) return null;
    const tu = Math.max(-halfSpan, Math.min(halfSpan, targetU));
    const ty = Math.max(yLo, Math.min(yHi, targetY));
    const faceBoxes = placed.filter((b) => b.faceIdx === faceIdx);
    const step = 0.15;
    let best = null;
    for (let u = -halfSpan; u <= halfSpan + 1e-6; u += step) {
      for (let y = yLo; y <= yHi + 1e-6; y += step) {
        const box = boxOf(faceIdx, u, y, scale);
        let clearance = Infinity;
        for (const other of faceBoxes) clearance = Math.min(clearance, clearanceBetween(box, other));
        if (clearance < gap) continue;
        const score = -Math.hypot(u - tu, y - ty);
        if (!best || score > best.score) best = { u, y, score, box };
      }
    }
    return best;
  };

  // 1. Originals keep their hand-placed spot unless a rainbow arc (the doubled
  //    layouts add arcs to the narrow faces, where clouds already sit) or an
  //    earlier cloud occupies it, in which case they move to the nearest free
  //    spot at the same size.
  const kept = [];
  for (const s of specs) {
    const scale = baseScale * s.sizeMul;
    const own = boxOf(s.faceIdx, s.u, s.y, scale);
    const blocked = placed.some(
      (b) => b.faceIdx === s.faceIdx && clearanceBetween(own, b) < gap,
    );
    if (!blocked) {
      kept.push(s);
      placed.push(own);
      continue;
    }
    const spot = findFreeSpot(s.faceIdx, scale, s.u, s.y);
    if (!spot) continue;
    kept.push({ ...s, u: spot.u, y: spot.y });
    placed.push(spot.box);
  }

  // 2. One companion per original, aimed at the mirrored spot.
  const extras = [];
  for (const s of kept) {
    const sizeMul = s.sizeMul * 0.82;
    const spot = findFreeSpot(s.faceIdx, baseScale * sizeMul, -s.u, -s.y);
    if (!spot) continue;
    extras.push({
      faceIdx: s.faceIdx,
      u: spot.u,
      y: spot.y,
      sizeMul,
      variant: s.variant === 'A' ? 'B' : 'A',
    });
    placed.push(spot.box);
  }
  return [...kept, ...extras];
}

// Rainbow arcs as obstacle boxes for doubleCloudSpecs (arc + its two cloud
// feet: about 0.98 * effectiveHeight wide and 0.4 * effectiveHeight tall).
function rainbowObstacleBoxes(rainbowSpecs, height) {
  return rainbowSpecs.map((r) => {
    const effH = height * r.scale;
    return { faceIdx: r.faceIdx, u: r.u, y: r.yFrac * height, hw: effH * 0.49, hh: effH * 0.24 };
  });
}

// The 2-arc layouts (front + back faces) gain mirrored arcs on the right and
// left faces, matching the four-face placement of the Rainbow Arc design.
function doubleRainbowSpecs(rainbowSpecs, isSquare) {
  if (rainbowSpecs.length !== 2) return [...rainbowSpecs];
  const arcScale = isSquare ? 0.90 : 0.82;
  return [
    ...rainbowSpecs,
    { faceIdx: 1, u: 0, yFrac:  0.05, scale: arcScale },
    { faceIdx: 3, u: 0, yFrac:  0.04, scale: arcScale },
  ];
}

function doubleStarsPerFace(starsPerFace) {
  return starsPerFace.map((n) => n * 2);
}

function getBoxyCloudSpecs(perim, height) {
  return [
    // Face 0 (Front, width 2*xc)
    { faceIdx: 0, u: -0.55 * perim.xc, y:  0.20 * height, sizeMul: 1.05, variant: 'A' },
    { faceIdx: 0, u:  0.00 * perim.xc, y: -0.22 * height, sizeMul: 0.95, variant: 'B' },
    { faceIdx: 0, u:  0.55 * perim.xc, y:  0.18 * height, sizeMul: 1.00, variant: 'A' },
    // Face 1 (Right, width 2*zc)
    { faceIdx: 1, u: -0.38 * perim.zc, y: -0.16 * height, sizeMul: 0.92, variant: 'B' },
    { faceIdx: 1, u:  0.38 * perim.zc, y:  0.22 * height, sizeMul: 1.02, variant: 'A' },
    // Face 2 (Back, width 2*xc)
    { faceIdx: 2, u: -0.55 * perim.xc, y: -0.20 * height, sizeMul: 0.95, variant: 'B' },
    { faceIdx: 2, u:  0.00 * perim.xc, y:  0.22 * height, sizeMul: 1.05, variant: 'A' },
    { faceIdx: 2, u:  0.55 * perim.xc, y: -0.18 * height, sizeMul: 0.98, variant: 'B' },
    // Face 3 (Left, width 2*zc)
    { faceIdx: 3, u: -0.38 * perim.zc, y:  0.20 * height, sizeMul: 0.95, variant: 'A' },
    { faceIdx: 3, u:  0.38 * perim.zc, y: -0.18 * height, sizeMul: 0.92, variant: 'B' },
  ];
}

function getBoxyStarryClouds(perim, height) {
  return [
    // Face 0 (Front): 2 clouds flanking rainbow
    { faceIdx: 0, u: -0.68 * perim.xc, y:  0.22 * height, sizeMul: 0.88, variant: 'A' },
    { faceIdx: 0, u:  0.68 * perim.xc, y: -0.20 * height, sizeMul: 0.84, variant: 'B' },
    // Face 1 (Right): 2 clouds
    { faceIdx: 1, u: -0.38 * perim.zc, y:  0.20 * height, sizeMul: 0.92, variant: 'A' },
    { faceIdx: 1, u:  0.38 * perim.zc, y: -0.18 * height, sizeMul: 0.88, variant: 'B' },
    // Face 2 (Back): 2 clouds flanking rainbow
    { faceIdx: 2, u: -0.68 * perim.xc, y: -0.20 * height, sizeMul: 0.84, variant: 'B' },
    { faceIdx: 2, u:  0.68 * perim.xc, y:  0.22 * height, sizeMul: 0.88, variant: 'A' },
    // Face 3 (Left): 2 clouds
    { faceIdx: 3, u: -0.38 * perim.zc, y: -0.18 * height, sizeMul: 0.88, variant: 'B' },
    { faceIdx: 3, u:  0.38 * perim.zc, y:  0.20 * height, sizeMul: 0.92, variant: 'A' },
  ];
}

function buildCloudyChumpBoxy(height, colorHex, colorId, cloudStandoffOverride, perim, surfaceOffset, opts = {}, doubleQuantities = false) {
  const group = new THREE.Group();
  const cloudMat = getFrostingMaterial(colorHex || CLOUD_COLOR, colorId);
  const baseScale = Math.min(0.85, height * 0.38);
  const cloudDepth = 0.09;
  const standoff = (cloudStandoffOverride ?? 0.002);

  const specs = getBoxyCloudSpecs(perim, height);
  const allSpecs = doubleQuantities ? doubleCloudSpecs(specs, perim, height) : specs;

  for (const s of allSpecs) {
    const scale = baseScale * s.sizeMul;
    const isB = s.variant === 'B';
    const shape = isB ? createFluffyCloudShapeB(scale) : createFluffyCloudShapeA(scale);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: cloudDepth, bevelEnabled: false });
    geo.translate(0, 0, standoff);
    applyVerticalGradientUV(geo);
    const mesh = new THREE.Mesh(geo, cloudMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isBoxySunshinePlay = true;
    mesh.userData.morphedToBoxy = true;

    positionOnBoxyFace(mesh, s.faceIdx, s.u, s.y, boxyCloudOffset(surfaceOffset, opts), perim);
    group.add(mesh);
  }

  group.userData.isBoxySunshinePlay = true;
  group.userData.morphedToBoxy = true;
  return group;
}

function buildStarBurstBoxy(height, colorHex, isAssorted = false, colorId = null, perim, surfaceOffset, opts = {}) {
  const group = new THREE.Group();
  let materials;
  if (isAssorted) {
    materials = ASSORTED_STAR_COLORS.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0 })
    );
  } else {
    materials = [getFrostingMaterial(colorHex || '#FFFDF7', colorId)];
  }

  const starGeo = buildStarGeo(1);
  applyVerticalGradientUV(starGeo);

  const totalPerim = 4 * perim.xc + 4 * perim.zc;
  const totalStars = Math.max(36, Math.round((totalPerim * height) / 1.1));
  const starsPerFace = [
    Math.round(totalStars * (2 * perim.xc / totalPerim)),
    Math.round(totalStars * (2 * perim.zc / totalPerim)),
    Math.round(totalStars * (2 * perim.xc / totalPerim)),
    Math.round(totalStars * (2 * perim.zc / totalPerim)),
  ];

  let seed = 54321;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const starScaleFor = (sizeFrac) => {
    if (sizeFrac < 0.36) return 0.45 + (sizeFrac / 0.36) * 0.22;
    if (sizeFrac < 0.72) return 0.85 + ((sizeFrac - 0.36) / 0.36) * 0.30;
    return 1.35 + ((sizeFrac - 0.72) / 0.28) * 0.40;
  };

  for (let faceIdx = 0; faceIdx < 4; faceIdx++) {
    const count = starsPerFace[faceIdx];
    const halfSpan = (faceIdx % 2 === 0 ? perim.xc : perim.zc) * 0.85;
    const placed = [];

    for (let attempt = 0; attempt < count * 30 && placed.length < count; attempt++) {
      const u = (-1 + rand() * 2) * halfSpan;
      const yFrac = rand();
      const y = -height / 2 + height * 0.08 + yFrac * height * 0.84;
      const sizeFrac = rand();
      const scale = starScaleFor(sizeFrac);
      const starRadius = 0.17 * scale;

      let collides = false;
      for (const p of placed) {
        if (Math.hypot(u - p.u, y - p.y) < starRadius + p.r + 0.06) {
          collides = true;
          break;
        }
      }
      if (!collides) {
        placed.push({ u, y, scale, r: starRadius });
        const mat = materials[(faceIdx * 10 + placed.length) % materials.length];
        const star = new THREE.Mesh(starGeo, mat);
        star.scale.setScalar(scale);

        // 75/25 standoff vision
        const standoff = surfaceOffset - 0.01 * scale;
        positionOnBoxyFace(star, faceIdx, u, y, standoff, perim);

        star.castShadow = true;
        star.receiveShadow = true;
        star.userData.isBoxySunshinePlay = true;
        star.userData.morphedToBoxy = true;
        group.add(star);
      }
    }
  }

  group.userData.isBoxySunshinePlay = true;
  group.userData.morphedToBoxy = true;
  return group;
}

function buildSkyChumpsBoxy(height, colorHex, colorId, cloudStandoffOverride, perim, surfaceOffset, opts = {}, doubleQuantities = false) {
  const group = new THREE.Group();
  const clouds = buildCloudyChumpBoxy(height, colorHex, colorId, cloudStandoffOverride, perim, surfaceOffset, opts, doubleQuantities);
  group.add(clouds);

  const starMat = getFrostingMaterial(colorHex || '#FFFDF7', colorId);
  const starGeo = buildStarGeo(1);
  applyVerticalGradientUV(starGeo);

  const baseScale = Math.min(0.85, height * 0.38);
  // Match the cloud layout actually built above so stars avoid every cloud,
  // including the doubled companions.
  const specs = doubleQuantities ? doubleCloudSpecs(getBoxyCloudSpecs(perim, height), perim, height) : getBoxyCloudSpecs(perim, height);

  let seed = 712349;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const starScaleFor = (sizeFrac) => {
    if (sizeFrac < 0.36) return 0.45 + (sizeFrac / 0.36) * 0.22;
    if (sizeFrac < 0.72) return 0.85 + ((sizeFrac - 0.36) / 0.36) * 0.30;
    return 1.35 + ((sizeFrac - 0.72) / 0.28) * 0.40;
  };

  const baseStars = [10, 7, 10, 7];
  const starsPerFace = doubleQuantities ? doubleStarsPerFace(baseStars) : baseStars;

  for (let faceIdx = 0; faceIdx < 4; faceIdx++) {
    const halfSpan = (faceIdx % 2 === 0 ? perim.xc : perim.zc) * 0.88;
    const faceClouds = specs.filter((s) => s.faceIdx === faceIdx);
    const placed = [];
    const count = starsPerFace[faceIdx];

    for (let attempt = 0; attempt < count * 40 && placed.length < count; attempt++) {
      const u = (-1 + rand() * 2) * halfSpan;
      const y = (-0.40 + rand() * 0.80) * height;
      const scale = starScaleFor(rand());
      const starRadius = 0.17 * scale;

      let collides = false;
      for (const c of faceClouds) {
        const cScale = baseScale * c.sizeMul;
        const testW = 1.05 * cScale + starRadius + 0.04;
        const testH = 0.48 * cScale + starRadius + 0.04;
        if (((u - c.u) / testW) ** 2 + ((y - c.y) / testH) ** 2 < 1.0) {
          collides = true;
          break;
        }
      }
      if (!collides) {
        for (const p of placed) {
          if (Math.hypot(u - p.u, y - p.y) < starRadius + p.r + 0.05) {
            collides = true;
            break;
          }
        }
      }
      if (!collides) {
        placed.push({ u, y, r: starRadius });
        const star = new THREE.Mesh(starGeo, starMat);
        star.scale.setScalar(scale);
        const standoff = surfaceOffset - 0.01 * scale;
        positionOnBoxyFace(star, faceIdx, u, y, standoff, perim);
        star.castShadow = true;
        star.receiveShadow = true;
        star.userData.isBoxySunshinePlay = true;
        star.userData.morphedToBoxy = true;
        group.add(star);
      }
    }
  }

  group.userData.isBoxySunshinePlay = true;
  group.userData.morphedToBoxy = true;
  return group;
}

function buildSunshineStarsBoxy(height, colorHex, colorId, perim, surfaceOffset, isSquare, opts = {}, doubleQuantities = false) {
  const group = new THREE.Group();
  // 2 Rainbow Arcs: Front Face 0 and Back Face 2
  let rainbowSpecs = [
    { faceIdx: 0, u: 0, yFrac:  0.00, scale: 1.00 },
    { faceIdx: 2, u: 0, yFrac: -0.03, scale: 0.94 },
  ];
  if (doubleQuantities) {
    // Doubled design: arcs also on the Right (1) and Left (3) faces
    rainbowSpecs = doubleRainbowSpecs(rainbowSpecs, isSquare);
  }

  for (const s of rainbowSpecs) {
    const arc = buildSingleRainbowArcFlat(height, s.scale, colorHex, colorId, false, opts);
    positionOnBoxyFace(arc, s.faceIdx, s.u, s.yFrac * height, surfaceOffset, perim);
    group.add(arc);
  }

  const starMat = getFrostingMaterial(colorHex || '#FFFDF7', colorId);
  const starGeo = buildStarGeo(1);
  applyVerticalGradientUV(starGeo);

  let seed = 582913;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const starScaleFor = (sizeFrac) => {
    if (sizeFrac < 0.36) return 0.45 + (sizeFrac / 0.36) * 0.22;
    if (sizeFrac < 0.72) return 0.85 + ((sizeFrac - 0.36) / 0.36) * 0.30;
    return 1.35 + ((sizeFrac - 0.72) / 0.28) * 0.40;
  };

  const baseStars = [8, 11, 8, 11];
  const starsPerFace = doubleQuantities ? doubleStarsPerFace(baseStars) : baseStars;

  for (let faceIdx = 0; faceIdx < 4; faceIdx++) {
    const rSpec = rainbowSpecs.find((s) => s.faceIdx === faceIdx);
    const halfSpan = (faceIdx % 2 === 0 ? perim.xc : perim.zc) * 0.88;
    const placed = [];
    const count = starsPerFace[faceIdx];

    for (let attempt = 0; attempt < count * 40 && placed.length < count; attempt++) {
      const u = (-1 + rand() * 2) * halfSpan;
      const y = (-0.40 + rand() * 0.80) * height;
      const scale = starScaleFor(rand());
      const starRadius = 0.17 * scale;

      // Obstacle check against Rainbow Arc if present on this face
      if (rSpec) {
        const effH = height * rSpec.scale;
        const halfW = effH * 0.49;
        if (Math.abs(u) < halfW + starRadius + 0.06 && Math.abs(y - (rSpec.yFrac * height)) < effH * 0.38) {
          continue;
        }
      }

      let collides = false;
      for (const p of placed) {
        if (Math.hypot(u - p.u, y - p.y) < starRadius + p.r + 0.05) {
          collides = true;
          break;
        }
      }
      if (!collides) {
        placed.push({ u, y, r: starRadius });
        const star = new THREE.Mesh(starGeo, starMat);
        star.scale.setScalar(scale);
        const standoff = surfaceOffset - 0.01 * scale;
        positionOnBoxyFace(star, faceIdx, u, y, standoff, perim);
        star.castShadow = true;
        star.receiveShadow = true;
        star.userData.isBoxySunshinePlay = true;
        star.userData.morphedToBoxy = true;
        group.add(star);
      }
    }
  }

  group.userData.isBoxySunshinePlay = true;
  group.userData.morphedToBoxy = true;
  return group;
}

function buildStarrySunshinePlayBoxy(height, colorHex, isAssortedStars = false, colorId = null, cloudStandoffOverride = null, perim, surfaceOffset, isSquare, opts = {}, doubleQuantities = false) {
  const group = new THREE.Group();

  // 2 Rainbow Arcs: Front Face 0 and Back Face 2
  let rainbowSpecs = [
    { faceIdx: 0, u: 0, yFrac:  0.00, scale: 1.00 },
    { faceIdx: 2, u: 0, yFrac: -0.03, scale: 0.94 },
  ];
  if (doubleQuantities) {
    // Doubled design: arcs also on the Right (1) and Left (3) faces
    rainbowSpecs = doubleRainbowSpecs(rainbowSpecs, isSquare);
  }

  for (const s of rainbowSpecs) {
    const arc = buildSingleRainbowArcFlat(height, s.scale, colorHex, colorId, false, opts);
    positionOnBoxyFace(arc, s.faceIdx, s.u, s.yFrac * height, surfaceOffset, perim);
    group.add(arc);
  }

  const cloudMat = getFrostingMaterial(colorHex || CLOUD_COLOR, colorId);
  const baseScale = Math.min(0.85, height * 0.38);
  const cloudDepth = 0.09;
  const standoff = (cloudStandoffOverride ?? 0.002);

  const cloudSpecsBase = getBoxyStarryClouds(perim, height);
  const cloudSpecs = doubleQuantities
    ? doubleCloudSpecs(cloudSpecsBase, perim, height, rainbowObstacleBoxes(rainbowSpecs, height))
    : cloudSpecsBase;

  for (const c of cloudSpecs) {
    const scale = baseScale * c.sizeMul;
    const isB = c.variant === 'B';
    const shape = isB ? createFluffyCloudShapeB(scale) : createFluffyCloudShapeA(scale);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: cloudDepth, bevelEnabled: false });
    geo.translate(0, 0, standoff);
    applyVerticalGradientUV(geo);
    const mesh = new THREE.Mesh(geo, cloudMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isBoxySunshinePlay = true;
    mesh.userData.morphedToBoxy = true;
    mesh.userData.isCloud = true;
    positionOnBoxyFace(mesh, c.faceIdx, c.u, c.y, boxyCloudOffset(surfaceOffset, opts), perim);
    group.add(mesh);
  }

  let starMats;
  if (isAssortedStars) {
    starMats = ASSORTED_STAR_COLORS.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0 })
    );
  } else {
    starMats = [getFrostingMaterial(colorHex || CLOUD_COLOR, colorId)];
  }

  const starGeo = buildStarGeo(1);
  applyVerticalGradientUV(starGeo);

  let seed = 839201;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const starScaleFor = (sizeFrac) => {
    if (sizeFrac < 0.36) return 0.45 + (sizeFrac / 0.36) * 0.22;
    if (sizeFrac < 0.72) return 0.85 + ((sizeFrac - 0.36) / 0.36) * 0.30;
    return 1.35 + ((sizeFrac - 0.72) / 0.28) * 0.40;
  };

  const baseStars = [8, 10, 8, 10];
  const starsPerFace = doubleQuantities ? doubleStarsPerFace(baseStars) : baseStars;

  for (let faceIdx = 0; faceIdx < 4; faceIdx++) {
    const rSpec = rainbowSpecs.find((s) => s.faceIdx === faceIdx);
    const halfSpan = (faceIdx % 2 === 0 ? perim.xc : perim.zc) * 0.88;
    const faceClouds = cloudSpecs.filter((c) => c.faceIdx === faceIdx);
    const placed = [];
    const count = starsPerFace[faceIdx];

    for (let attempt = 0; attempt < count * 40 && placed.length < count; attempt++) {
      const u = (-1 + rand() * 2) * halfSpan;
      const y = (-0.40 + rand() * 0.80) * height;
      const scale = starScaleFor(rand());
      const starRadius = 0.17 * scale;

      if (rSpec) {
        const effH = height * rSpec.scale;
        const halfW = effH * 0.49;
        if (Math.abs(u) < halfW + starRadius + 0.06 && Math.abs(y - (rSpec.yFrac * height)) < effH * 0.38) {
          continue;
        }
      }
      let collidesCloud = false;
      for (const c of faceClouds) {
        const cScale = baseScale * c.sizeMul;
        const testW = 1.05 * cScale + starRadius + 0.04;
        const testH = 0.48 * cScale + starRadius + 0.04;
        if (((u - c.u) / testW) ** 2 + ((y - c.y) / testH) ** 2 < 1.0) {
          collidesCloud = true;
          break;
        }
      }
      if (collidesCloud) continue;

      let collides = false;
      for (const p of placed) {
        if (Math.hypot(u - p.u, y - p.y) < starRadius + p.r + 0.05) {
          collides = true;
          break;
        }
      }
      if (!collides) {
        placed.push({ u, y, r: starRadius });
        const mat = starMats[(faceIdx * 10 + placed.length) % starMats.length];
        const star = new THREE.Mesh(starGeo, mat);
        star.scale.setScalar(scale);
        const standoff = surfaceOffset - 0.01 * scale;
        positionOnBoxyFace(star, faceIdx, u, y, standoff, perim);
        star.castShadow = true;
        star.receiveShadow = true;
        star.userData.isBoxySunshinePlay = true;
        star.userData.morphedToBoxy = true;
        star.userData.isStar = true;
        group.add(star);
      }
    }
  }

  group.userData.isBoxySunshinePlay = true;
  group.userData.morphedToBoxy = true;
  return group;
}

export function buildBoxySunshinePlay(radius, height, colorHex, colorId, variant = 'rainbowArc', _flavorId = 'vanilla', opts = {}) {
  const isSquare = opts.shape === 'square' || opts.cakeShape === 'square';
  const W = opts.customW !== undefined && opts.customW !== null ? opts.customW : (isSquare ? radius : radius * 1.25);
  const D = opts.customD !== undefined && opts.customD !== null ? opts.customD : (isSquare ? radius : radius * 0.85);
  const rc = opts.rc ?? 0.35;
  const perim = createBoxyPerimeter(W, D, rc);

  const hasDrip = Boolean(opts.hasDrip || opts.atDrip);
  const coatThickness = opts.coatThickness ?? opts.dripThickness ?? 0.06;
  const maxGlazeCarveDepth = opts.maxCarveDepth ?? 0.50;
  const dripCarvedThickness = coatThickness * (1 - maxGlazeCarveDepth);
  const dripOffset = opts.dripOffset ?? dripCarvedThickness;
  const surfaceOffset = hasDrip ? dripOffset : 0;
  const { cloudStandoff = null } = opts;

  // Sky Chumps / Sunshine Stars / Starry Sunshine Play render twice the
  // decorations on Rectangle & Square cakes (see shouldDoubleDesignQuantities)
  const doubleQuantities = shouldDoubleDesignQuantities(variant, opts);

  if (variant === 'rainbowArc') {
    const group = new THREE.Group();
    const specs = [
      { faceIdx: 0, u: 0, yFrac:  0.00, scale: 1.00 },
      { faceIdx: 1, u: 0, yFrac:  0.05, scale: isSquare ? 0.90 : 0.82 },
      { faceIdx: 2, u: 0, yFrac: -0.03, scale: 0.94 },
      { faceIdx: 3, u: 0, yFrac:  0.04, scale: isSquare ? 0.90 : 0.82 },
    ];
    for (const s of specs) {
      const arc = buildSingleRainbowArcFlat(height, s.scale, colorHex, colorId, false, opts);
      positionOnBoxyFace(arc, s.faceIdx, s.u, s.yFrac * height, surfaceOffset, perim);
      group.add(arc);
    }
    group.userData.isBoxySunshinePlay = true;
    group.userData.morphedToBoxy = true;
    return group;
  } else if (variant === 'cloudyChump') {
    return buildCloudyChumpBoxy(height, colorHex, colorId, cloudStandoff, perim, surfaceOffset, opts);
  } else if (variant === 'starBurst') {
    return buildStarBurstBoxy(height, colorHex, false, colorId, perim, surfaceOffset, opts);
  } else if (variant === 'skyChumps') {
    return buildSkyChumpsBoxy(height, colorHex, colorId, cloudStandoff, perim, surfaceOffset, opts, doubleQuantities);
  } else if (variant === 'sunshineStars') {
    return buildSunshineStarsBoxy(height, colorHex, colorId, perim, surfaceOffset, isSquare, opts, doubleQuantities);
  } else if (variant === 'starrySunshinePlay' || variant === 'assortedStarryRainbow') {
    // Stars follow Sugar Color (no assorted star palette).
    return buildStarrySunshinePlayBoxy(height, colorHex, false, colorId, cloudStandoff, perim, surfaceOffset, isSquare, opts, doubleQuantities);
  } else if (variant === 'starryRainbow') {
    return buildStarrySunshinePlayBoxy(height, colorHex, false, colorId, cloudStandoff, perim, surfaceOffset, isSquare, opts);
  } else if (variant === 'assortedStarBurst') {
    return buildStarBurstBoxy(height, colorHex, true, null, perim, surfaceOffset, opts);
  } else if (variant === 'rainbowChamp') {
    return buildSunshineStarsBoxy(height, colorHex, colorId, perim, surfaceOffset, isSquare, opts);
  }

  return buildBoxySunshinePlay(radius, height, colorHex, colorId, 'rainbowArc', _flavorId, opts);
}

export function getBoxySunshinePlayCoverageFn(radius, height, opts = {}) {
  const variant = opts.variant || 'rainbowArc';
  const forGlaze = !!opts.forGlaze;
  const maxDepth = forGlaze ? (opts.maxCarveDepth ?? 0.50) : (opts.maxCarveDepth ?? 1.0);

  const isSquare = opts.shape === 'square' || opts.cakeShape === 'square';
  const W = opts.customW !== undefined && opts.customW !== null ? opts.customW : (isSquare ? radius : radius * 1.25);
  const D = opts.customD !== undefined && opts.customD !== null ? opts.customD : (isSquare ? radius : radius * 0.85);
  const rc = opts.rc ?? 0.35;
  const perim = createBoxyPerimeter(W, D, rc);

  // Glaze mesh resolution is fixed, so windows need to widen with cake size
  const sizePad = forGlaze ? 0.012 * radius : 0;

  // Doubled-quantity designs carve twice as many empty spaces on boxy shapes
  const doubled = shouldDoubleDesignQuantities(variant, opts);

  const faceElements = [[], [], [], []];

  const addRainbowArc = (faceIdx, uCenter, yFrac, scale) => {
    const effectiveHeight = height * scale;
    const bandCount = RAINBOW_BAND_COLORS.length;
    const outerRadius = effectiveHeight * 0.29;
    const bandWidth = effectiveHeight * 0.050;
    const tube = bandWidth * 0.52;
    const legLength = effectiveHeight * 0.035;

    const topY = outerRadius + tube;
    const bottomY = -legLength - 0.05 * effectiveHeight;
    const centerYOffset = -(topY + bottomY) / 2;

    const innerRadius = outerRadius - (bandCount - 1) * bandWidth;
    const legMidX = (innerRadius + outerRadius) / 2;
    const legSpan = (outerRadius + tube) - (innerRadius - tube);

    const groupY = yFrac * height;
    const cloudScale = Math.max((legSpan * 2.15) / 1.985, effectiveHeight * 0.21);
    const cloudFootY = -legLength + centerYOffset + 0.12 * cloudScale;
    const legBottomY = -legLength + centerYOffset;

    faceElements[faceIdx].push({
      type: 'rainbowArch',
      centerU: uCenter,
      yCenter: groupY,
      outerRadius: outerRadius + tube,
      centerYOffset,
      legLength,
      legBottomY,
      cloudFootY,
      scale,
    });

    // Left cloud foot (unmirrored)
    const leftCenterX = uCenter - legMidX + 0.071 * cloudScale;
    faceElements[faceIdx].push({
      type: 'cloud',
      centerU: leftCenterX,
      yCenter: groupY + cloudFootY,
      scale: cloudScale,
      pts: CLOUD_A_PTS,
      bbox: CLOUD_A_BBOX,
    });

    // Right cloud foot (mirrored)
    const rightCenterX = uCenter + legMidX - 0.071 * cloudScale;
    faceElements[faceIdx].push({
      type: 'cloud',
      centerU: rightCenterX,
      yCenter: groupY + cloudFootY,
      scale: cloudScale,
      pts: CLOUD_A_MIRRORED_PTS,
      bbox: CLOUD_A_MIRRORED_BBOX,
    });
  };

  const addCloud = (faceIdx, uCenter, yCenter, scale, cloudVariant = 'A') => {
    const isB = cloudVariant === 'B';
    const pts = isB ? CLOUD_B_PTS : CLOUD_A_PTS;
    const bbox = isB ? CLOUD_B_BBOX : CLOUD_A_BBOX;
    faceElements[faceIdx].push({
      type: 'cloud',
      centerU: uCenter,
      yCenter,
      scale,
      pts,
      bbox,
    });
  };

  if (variant === 'rainbowArc') {
    const specs = [
      { faceIdx: 0, u: 0, yFrac:  0.00, scale: 1.00 },
      { faceIdx: 1, u: 0, yFrac:  0.05, scale: isSquare ? 0.90 : 0.82 },
      { faceIdx: 2, u: 0, yFrac: -0.03, scale: 0.94 },
      { faceIdx: 3, u: 0, yFrac:  0.04, scale: isSquare ? 0.90 : 0.82 },
    ];
    for (const s of specs) addRainbowArc(s.faceIdx, s.u, s.yFrac, s.scale);
  } else if (variant === 'cloudyChump') {
    const baseScale = Math.min(0.85, height * 0.38);
    const specs = getBoxyCloudSpecs(perim, height);
    for (const s of specs) addCloud(s.faceIdx, s.u, s.y, baseScale * s.sizeMul, s.variant);
  } else if (variant === 'skyChumps') {
    const baseScale = Math.min(0.85, height * 0.38);
    const cloudSpecs = getBoxyCloudSpecs(perim, height);
    const specs = doubled ? doubleCloudSpecs(cloudSpecs, perim, height) : cloudSpecs;
    for (const s of specs) addCloud(s.faceIdx, s.u, s.y, baseScale * s.sizeMul, s.variant);
  } else if (variant === 'sunshineStars') {
    let specs = [
      { faceIdx: 0, u: 0, yFrac:  0.00, scale: 1.00 },
      { faceIdx: 2, u: 0, yFrac: -0.03, scale: 0.94 },
    ];
    if (doubled) specs = doubleRainbowSpecs(specs, isSquare);
    for (const s of specs) addRainbowArc(s.faceIdx, s.u, s.yFrac, s.scale);
  } else if (variant === 'starrySunshinePlay' || variant === 'starryRainbow' || variant === 'assortedStarryRainbow') {
    let specs = [
      { faceIdx: 0, u: 0, yFrac:  0.00, scale: 1.00 },
      { faceIdx: 2, u: 0, yFrac: -0.03, scale: 0.94 },
    ];
    if (doubled) specs = doubleRainbowSpecs(specs, isSquare);
    for (const s of specs) addRainbowArc(s.faceIdx, s.u, s.yFrac, s.scale);
    const baseScale = Math.min(0.85, height * 0.38);
    const starryCloudSpecs = getBoxyStarryClouds(perim, height);
    const cloudSpecs = doubled
      ? doubleCloudSpecs(starryCloudSpecs, perim, height, rainbowObstacleBoxes(specs, height))
      : starryCloudSpecs;
    for (const c of cloudSpecs) addCloud(c.faceIdx, c.u, c.y, baseScale * c.sizeMul, c.variant);
  }

  const smoothstep = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };

  return (glazeArg, localY) => {
    const thetaMesh = Math.atan2(Math.cos(glazeArg), Math.sin(glazeArg));
    const boxR = getBoxyRadius(thetaMesh, W, D, rc);
    const qx = boxR * Math.sin(glazeArg);
    const qz = boxR * Math.cos(glazeArg);
    const qy = localY;

    let maxCoverage = 0;

    for (let f = 0; f < 4; f++) {
      if (f === 0 && qz < -0.1) continue;
      if (f === 1 && qx < -0.1) continue;
      if (f === 2 && qz > 0.1) continue;
      if (f === 3 && qx > 0.1) continue;

      const elements = faceElements[f];
      if (!elements || elements.length === 0) continue;

      let uCoord = 0;
      if (f === 0) uCoord = qx;
      else if (f === 1) uCoord = -qz;
      else if (f === 2) uCoord = -qx;
      else uCoord = qz;

      for (const el of elements) {
        const lx = uCoord - el.centerU;
        const ly = qy - el.yCenter;

        if (el.type === 'cloud') {
          const px = lx / el.scale;
          const py = ly / el.scale;
          const signedDistNorm = signedDistToPolygon(px, py, el.pts, el.bbox);
          if (signedDistNorm >= -0.15) {
            const signedDist = signedDistNorm * el.scale;
            const margin = 0.04 * el.scale + sizePad;
            const smoothW = 0.025 * el.scale;
            const distInside = signedDist + margin;
            if (distInside > 0) {
              const edgeWeight = smoothstep(distInside / smoothW);
              maxCoverage = Math.max(maxCoverage, edgeWeight * maxDepth);
            }
          }
        } else if (el.type === 'rainbowArch') {
          const R = el.outerRadius;
          const margin = 0.04 * el.scale + sizePad;
          const smoothW = 0.025 * el.scale;
          const legBottomY = el.legBottomY ?? (el.centerYOffset - el.legLength);
          const yMax = el.centerYOffset + R + margin + smoothW;
          const yMin = legBottomY - margin - smoothW;

          if (ly >= yMin && ly <= yMax && Math.abs(lx) <= R + margin + smoothW) {
            let distInsideEdge;
            if (ly >= el.centerYOffset) {
              const distFromCenter = Math.hypot(lx, ly - el.centerYOffset);
              distInsideEdge = R - distFromCenter + margin;
            } else {
              const dx = Math.abs(lx) - R;
              const dy = legBottomY - ly;
              if (dx <= 0 && dy <= 0) {
                distInsideEdge = Math.min(-dx, -dy) + margin;
              } else if (dx > 0 && dy <= 0) {
                distInsideEdge = -dx + margin;
              } else if (dx <= 0 && dy > 0) {
                distInsideEdge = -dy + margin;
              } else {
                distInsideEdge = -Math.hypot(dx, dy) + margin;
              }
            }
            if (distInsideEdge > 0) {
              const edgeWeight = smoothstep(distInsideEdge / smoothW);
              maxCoverage = Math.max(maxCoverage, edgeWeight * maxDepth);
            }
          }
        } else if (el.type === 'circle') {
          const distInsideEdge = el.r - Math.hypot(lx, ly);
          const smoothWidth = Math.max(0.02, el.r * 0.25);
          if (distInsideEdge > 0) {
            const edgeWeight = smoothstep(distInsideEdge / smoothWidth);
            maxCoverage = Math.max(maxCoverage, edgeWeight * maxDepth);
          }
        }
        if (maxCoverage >= maxDepth) return maxDepth;
      }
    }
    return maxCoverage;
  };
}

/**
 * Builds the Sunshine Play side decoration as a single Group, sized to fit
 * within `height` and stuck flush against the cake wall at `radius` — one
 * accent piece, not tiled around the circumference like the other Side
 * treatments.
 */
export function buildSunshinePlay(radius, height, colorHex, colorId, variant = 'rainbowArc', _flavorId = 'vanilla', opts = {}) {
  const isBoxy = opts.shape === 'rectangle' || opts.shape === 'square' || opts.cakeShape === 'rectangle' || opts.cakeShape === 'square';
  if (isBoxy) {
    return buildBoxySunshinePlay(radius, height, colorHex, colorId, variant, _flavorId, opts);
  }

  const group = new THREE.Group();
  const { cloudStandoff = null } = opts;

  if (variant === 'rainbowArc') {
    // Variation 1: Rainbow Arc (3 copies in varying locations around cylinder)
    const RAINBOW_COPIES = [
      { angleDeg: 0,   yFrac:  0.00, scale: 1.00 }, // Front center
      { angleDeg: 118, yFrac:  0.10, scale: 0.88 }, // Right/back-right, slightly higher
      { angleDeg: 238, yFrac: -0.08, scale: 0.94 }, // Left/back-left, slightly lower
    ];

    for (const spec of RAINBOW_COPIES) {
      const arc = buildSingleRainbowArc(radius, height, spec.scale, colorHex, colorId, false, opts);
      arc.rotation.y = (spec.angleDeg * Math.PI) / 180;
      arc.position.y = spec.yFrac * height;
      group.add(arc);
    }
  } else if (variant === 'cloudyChump') {
    // Variation 2: Cloudy Champ (randomized clouds only, respects colorHex/colorId)
    const cloudyChump = buildCloudyChump(radius, height, colorHex, colorId, cloudStandoff, opts);
    group.add(cloudyChump);
  } else if (variant === 'starBurst') {
    // Variation 3: Star Burst (scattered buttercream stars, respects colorHex/colorId)
    const starBurst = buildStarBurst(radius, height, colorHex, false, colorId, opts);
    group.add(starBurst);
  } else if (variant === 'skyChumps') {
    // Variation 4: Sky Chumps (combination of Stars and Clouds only)
    const skyChumps = buildSkyChumps(radius, height, colorHex, colorId, cloudStandoff, opts);
    group.add(skyChumps);
  } else if (variant === 'sunshineStars') {
    // Variation 5: Sunshine Stars (combination of Rainbow and Stars only)
    const sunshineStars = buildSunshineStars(radius, height, colorHex, colorId, opts);
    group.add(sunshineStars);
  } else if (variant === 'starrySunshinePlay' || variant === 'assortedStarryRainbow') {
    // Variation 6: Starry Sunshine Play (Starry Rainbow; stars, like the
    // clouds, follow Sugar Color rather than an assorted star palette)
    const starrySunshinePlay = buildStarryRainbow(radius, height, colorHex, false, colorId, cloudStandoff, opts);
    group.add(starrySunshinePlay);
  } else if (variant === 'starryRainbow') {
    // Legacy support
    const starryRainbow = buildStarryRainbow(radius, height, colorHex, false, colorId, cloudStandoff, opts);
    group.add(starryRainbow);
  } else if (variant === 'assortedStarBurst') {
    // Legacy support
    const assortedStarBurst = buildStarBurst(radius, height, colorHex, true, null, opts);
    group.add(assortedStarBurst);
  } else if (variant === 'rainbowChamp') {
    // Legacy support: combination of Rainbow Arc and Cloudy Champ
    const rainbowChamp = buildRainbowChamp(radius, height, colorHex);
    group.add(rainbowChamp);
  }

  return group;
}