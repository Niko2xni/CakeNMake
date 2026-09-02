import * as THREE from 'three';

// ─── Piping Tip Geometry Engine ──────────────────────────────────────────
// Real, physically-motivated geometry for piped icing — not the metal
// nozzles. Every tip's look comes from the SAME idea real cake decorating
// uses: a 2D cross-section (the "aperture" shape) swept through 3D space
// along a path, usually with the cross-section shrinking (tapering) as
// pressure is released. Star/Shell/Rope all share one star cross-section
// and differ only in path shape — Petal/Leaf get their own cross-sections.
// Round and Drop Flower aren't swept tubes in real life (a dot/pearl is a
// squeezed dome, a drop flower is a stamped floret) so they get dedicated
// builders instead of being forced through the sweep system.
//
// Performance: every repeated element (rosettes, shells, pearls, leaves,
// drop flowers) is drawn as ONE THREE.InstancedMesh — one geometry, one
// material, one draw call, no matter how many copies go around the ring.
// The two continuous forms (Rope, Petal ruffle) are a single unbroken mesh
// each, sized to the actual ring circumference, also one draw call.

// ─── Shared cross-section profiles (arrays of {x, y} in local 2D space) ──

function starProfilePoints(points = 6, outerR = 0.095, innerR = 0.048) {
  const pts = [];
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = i * step - Math.PI / 2;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}

export function roundProfilePoints(radius = 0.09, segments = 14) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
  }
  return pts;
}

/** Teardrop — fat rounded back (the wide end of a petal tip's opening),
 *  pinching to a sharp point at the front. */
function petalProfilePoints(width = 0.14, length = 0.22, segments = 20) {
  const pts = [];
  const r = width / 2;
  const backSegs = Math.max(4, Math.round(segments * 0.4));
  const sideSegs = Math.max(4, Math.round(segments * 0.3));

  // Rounded back — half circle
  for (let i = 0; i <= backSegs; i++) {
    const a = Math.PI / 2 + (i / backSegs) * Math.PI;
    pts.push({ x: -r * 0.15 + Math.cos(a) * r, y: Math.sin(a) * r });
  }
  // Top edge tapering forward to the point
  for (let i = 1; i <= sideSegs; i++) {
    const t = i / sideSegs;
    pts.push({ x: THREE.MathUtils.lerp(-r * 0.15, length, t * t), y: THREE.MathUtils.lerp(r, 0, t) });
  }
  // Bottom edge tapering back from the point to close the loop
  for (let i = 1; i < sideSegs; i++) {
    const t = 1 - i / sideSegs;
    pts.push({ x: THREE.MathUtils.lerp(-r * 0.15, length, t * t), y: THREE.MathUtils.lerp(-r, 0, t) });
  }
  return pts;
}

/** Pointed-oval "eye" shape — the diamond/leaf-tip opening. */
function leafProfilePoints(width = 0.1, length = 0.24, segments = 20) {
  const pts = [];
  const w = width / 2;
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const y = Math.cos(t) * (length / 2);
    const taper = Math.pow(Math.abs(Math.sin(t)), 0.6); // sharpens the two tips
    const x = Math.sin(t) * w * taper;
    pts.push({ x, y });
  }
  return pts;
}

// ─── Path curves ──────────────────────────────────────────────────────────

/** Star rosette: spirals upward while spiraling inward, like a soft-serve
 *  swirl — this is the actual hand motion used to pipe a star-tip rosette. */
class SwirlCurve extends THREE.Curve {
  constructor(radius = 0.15, height = 0.22, turns = 1.35, innerFactor = 0.12) {
    super();
    this.radius = radius;
    this.height = height;
    this.turns = turns;
    this.innerFactor = innerFactor;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const angle = t * Math.PI * 2 * this.turns;
    const r = this.radius * (1 - t * (1 - this.innerFactor));
    return target.set(Math.cos(angle) * r, t * this.height, Math.sin(angle) * r);
  }
}

/** Shell: pushes forward and slightly up, curving back down — the
 *  push-drag-taper "comma" motion that makes a scalloped shell border. */
class ShellCurve extends THREE.Curve {
  constructor(length = 0.32, height = 0.15, curveAmount = 0.5) {
    super();
    this.length = length;
    this.height = height;
    this.curveAmount = curveAmount;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const x = t * this.length;
    const y = Math.sin(t * Math.PI) * this.height;
    const z = Math.sin(t * Math.PI * 0.5) * this.curveAmount * this.length * 0.15;
    return target.set(x, y, z);
  }
}

/** A short, nearly-straight pull with a slight lift — the motion that forms
 *  a single pulled leaf point. */
class LeafPullCurve extends THREE.Curve {
  constructor(length = 0.18, lift = 0.03) {
    super();
    this.length = length;
    this.lift = lift;
  }
  getPoint(t, target = new THREE.Vector3()) {
    return target.set(t * this.length, Math.sin(t * Math.PI) * this.lift, 0);
  }
}

/** Continuous wave along a flat local strip of a given length — used for
 *  both Rope (narrow, tight wave) and the Petal ruffle (wide, soft wave),
 *  then wrapped around the cake's actual ring in wrapStripAroundRing(). */
class WaveStripCurve extends THREE.Curve {
  constructor(length, amplitude, waves) {
    super();
    this.length = length;
    this.amplitude = amplitude;
    this.waves = waves;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const x = t * this.length;
    const y = Math.sin(t * Math.PI * 2 * this.waves) * this.amplitude;
    return target.set(x, y, 0);
  }
}

// ─── Core sweep — the shared engine behind Star / Shell / Rope / Petal / Leaf ──

/**
 * Sweeps a closed 2D profile along a 3D curve using a frame derived from a
 * FIXED world-up reference at every ring, rather than THREE.Curve's built-in
 * Frenet frames. Frenet frames are propagated from the curve's own changing
 * curvature — which is exactly what makes them unreliable on short, gently
 * curved, low-segment paths like these piping curves: a small wobble in
 * curvature (or a near-straight stretch) can flip or twist the whole frame,
 * distorting the swept cross-section in a way that's baked into the shared
 * cached unit geometry and so repeats identically on every instance around
 * the ring — visually reading as a whole detached, mis-shaped ring rather
 * than a subtle per-instance glitch.
 * Deriving normal/binormal straight from world-up instead keeps every
 * ring's orientation predictable and anchored to the curve's actual
 * position, which is safe here because these piping paths are always
 * near-horizontal by design (icing piped along a roughly flat surface).
 * taper(t) scales the profile at each ring, 1 = full size. A taper that
 * approaches 0 at an end naturally pinches the sweep to a point there — no
 * separate end-cap geometry needed, which is also physically correct: real
 * piped icing comes to a soft point where pressure was released, not a flat
 * cut face.
 */
export function sweepProfileAlongCurve(profilePoints, curve, { segments = 20, taper = () => 1 } = {}) {
  const positions = [];
  const indices = [];
  const profileCount = profilePoints.length;
  const worldUp = new THREE.Vector3(0, 1, 0);
  const fallbackRef = new THREE.Vector3(1, 0, 0); // used only if tangent ~= world up

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const center = curve.getPointAt(Math.min(t, 1));
    const tangent = curve.getTangentAt(Math.min(t, 1)).normalize();

    // If the tangent is nearly parallel to world-up, cross(worldUp, tangent)
    // degenerates toward zero — fall back to a different reference axis so
    // the frame never collapses.
    const ref = Math.abs(tangent.dot(worldUp)) > 0.98 ? fallbackRef : worldUp;
    const normal = new THREE.Vector3().crossVectors(ref, tangent).normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

    const scale = Math.max(taper(t), 0.001); // never fully zero — avoids a degenerate zero-area ring

    for (let j = 0; j < profileCount; j++) {
      const p = profilePoints[j];
      const x = (normal.x * p.x + binormal.x * p.y) * scale;
      const y = (normal.y * p.x + binormal.y * p.y) * scale;
      const z = (normal.z * p.x + binormal.z * p.y) * scale;
      positions.push(center.x + x, center.y + y, center.z + z);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < profileCount; j++) {
      const jNext = (j + 1) % profileCount;
      const a = i * profileCount + j;
      const b = i * profileCount + jNext;
      const c = (i + 1) * profileCount + j;
      const d = (i + 1) * profileCount + jNext;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ─── Discrete unit geometries (one per repeated piece, instanced by the caller) ──

function buildStarUnitGeometry() {
  return sweepProfileAlongCurve(
    starProfilePoints(),
    new SwirlCurve(0.15, 0.22, 1.35, 0.12),
    { segments: 26, taper: (t) => THREE.MathUtils.lerp(1, 0.14, Math.pow(t, 0.8)) }
  );
}

/** Tall, ridged star-tip dollop based on a continuous buttercream squeeze:
 * a rounded shoulder narrows into a pointed release at the top. */
function buildStarDollopUnitGeometry({ radius = 0.28, height = 0.5, points = 12 } = {}) {
  const radialSegments = points * 4;
  const heightSegments = 32;
  const positions = [];
  const indices = [];

  const bodyTaper = (t) => {
    const peakT = 0.38;
    const bodyEndT = 0.6;
    if (t < peakT) {
      const u = 1 - t / peakT;
      return 0.2 + 0.8 * Math.sqrt(Math.max(0, 1 - u * u));
    }

    const taperAt = (value) => {
      const k = (value - peakT) / (1 - peakT);
      return Math.cos(Math.pow(Math.max(k, 0), 1.4) * Math.PI / 2);
    };

    if (t < bodyEndT) return taperAt(t);

    const epsilon = 0.001;
    const valueAtEnd = taperAt(bodyEndT);
    const slopeAtEnd = (valueAtEnd - taperAt(bodyEndT - epsilon)) / epsilon;
    const s = (t - bodyEndT) / (1 - bodyEndT);
    const h00 = 2 * s * s * s - 3 * s * s + 1;
    const h10 = s * s * s - 2 * s * s + s;
    const h11 = s * s * s - s * s;
    return h00 * valueAtEnd + h10 * slopeAtEnd * (1 - bodyEndT) + h11 * (-1) * (1 - bodyEndT);
  };

  for (let y = 0; y <= heightSegments; y++) {
    const t = y / heightSegments;
    const taper = bodyTaper(t);
    const ridgeStrength = 0.16 - t * 0.035;
    for (let i = 0; i < radialSegments; i++) {
      const angle = (i / radialSegments) * Math.PI * 2;
      const radialVariation = 1 + Math.cos(points * angle) * ridgeStrength;
      const r = radius * taper * radialVariation;
      positions.push(Math.cos(angle) * r, t * height, Math.sin(angle) * r);
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let i = 0; i < radialSegments; i++) {
      const next = (i + 1) % radialSegments;
      const current = y * radialSegments + i;
      const currentNext = y * radialSegments + next;
      const nextRow = (y + 1) * radialSegments + i;
      const nextRowNext = (y + 1) * radialSegments + next;
      indices.push(current, nextRow, currentNext, currentNext, nextRow, nextRowNext);
    }
  }

  const bottomCenter = positions.length / 3;
  positions.push(0, 0, 0);
  const topStart = heightSegments * radialSegments;
  const topCenter = positions.length / 3;
  positions.push(0, height, 0);
  for (let i = 0; i < radialSegments; i++) {
    const next = (i + 1) % radialSegments;
    indices.push(bottomCenter, next, i, topCenter, topStart + i, topStart + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Solid Continuous Star-Scallop Rim Geometry Generator
 * - Single continuous tube/bead along a pure circle of radius R (in XZ plane).
 * - Sharpened cusp modulation: sign(cos(N*θ)) * |cos(N*θ)|^p with p ~ 0.5 for crisp lobe transitions.
 * - Star-point cross-section morphing: The circular cross-section morphs into a crisp 5-6 pointed
 *   star/burst shape at each peak (proud of the tube surface), and returns to a smooth round tube between peaks.
 * - Single continuous watertight mesh seated directly on the cake surface with zero gap.
 */
function buildSolidScallopRimGeometry({
  R = 4.0,
  N = 10,
  tubeRadius = 0.13,
  bulgeAmount = 0.12, // max ±12% variation from base T
  starSharpness = 0.28, // must stay < 1.0 — at peakFactor=1 the valley radius is tubeRadius*(1 - starSharpness), which hits zero/inverts at starSharpness=1
  starPoints = 6,
  cuspPower = 1.6, // >1 sharpens the corner of the (now genuinely cornered) triangle-wave lobe transition
  peakSharpness = 1.0, // higher = narrower star window around each peak apex; this is now multiplied against a second windowing function (the phi-based outwardMask below), so keep this on the wider end (~1) — a narrow peakFactor compounding with a narrow phi mask is what made stars vanish in an earlier round
  segments = 360,
  radialSegments = 64, // 36 gave a 6-point star only ~6 segments per point — too coarse to resolve a sharp tip, smoothed away by computeVertexNormals
} = {}) {
  const positions = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = t * Math.PI * 2;

    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    // Center on single circle
    const cx = cosTheta * R;
    const cz = sinTheta * R;

    // Normal = radial XZ direction
    const nx = cosTheta;
    const nz = sinTheta;

    // Cusp modulation: rawCos in [-1, 1] maps to a triangle wave first (linear
    // ramp between peak and valley, true corners at both ends) via acos, then
    // cuspPower reshapes that ramp. cuspPower > 1 now sharpens the corner
    // (previous code's cuspPower < 1 direction was backwards — a fractional
    // power on a smooth cosine cannot introduce a corner that isn't there;
    // acos is what turns the smooth wave into a piecewise-linear one with
    // real corners for the exponent to sharpen further).
    const rawCos = Math.cos(N * theta);
    const triangle = 1 - (2 / Math.PI) * Math.acos(rawCos); // true triangle wave, corners at ±1
    const cusp = Math.sign(triangle) * Math.pow(Math.abs(triangle), cuspPower);

    // Peak localization for star morphing (1 at peak apex, dropping to 0
    // toward the valley). Previous version used max(0, cos)^peakSharpness,
    // which is within 10% of its peak value for only a couple degrees of
    // theta at typical N — the star practically never renders, showing up
    // as an all-but-invisible pinprick at the very apex (this is the bug:
    // the tiny nubs with no visible star shape in the last render). Basing
    // this on the same triangle wave instead gives a window whose *angular
    // width* is controlled directly by peakSharpness, independent of N —
    // predictable and visible at any lobe count.
    const peakFactor = Math.pow(Math.max(0, triangle), peakSharpness);

    // Controlled tube radius
    const currentR = tubeRadius * (1 + bulgeAmount * cusp);

    for (let j = 0; j <= radialSegments; j++) {
      const phi = (j / radialSegments) * Math.PI * 2;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      // Star-burst morphing at peak, plain smooth circular tube between peaks.
      // lx = cosPhi*r is outward, ly = sinPhi*r is vertical: phi=0 is pure
      // outward, phi=90° is straight up.
      // Centering on phi=50° (a fixed lean toward outward-and-up) was a
      // bug: that direction is defined in the tube's LOCAL cross-section
      // frame, which is identical at every point around the ring — but
      // "outward" flips relative to camera position as you go around a
      // closed loop. On the near side of the ring (facing camera) it lined
      // up and looked right; on the far side, that same local-outward
      // direction faces away into the back of the tube, invisible to the
      // camera, which is why stars vanished on the far arc while the near
      // arc looked correct. phi=90° (true straight-up) has no such issue:
      // "up" is the same direction in world space regardless of where you
      // are on the ring or which way the camera is angled, so it reads
      // consistently around the full 360° for any elevated/overhead camera.
      // Centering on a single direction (whether phi=0 "outward" or phi=90°
      // "up") doesn't work for a full ring under perspective: the near arc
      // and far arc of a circle are seen from genuinely different local
      // viewing angles relative to the tube's cross-section, so any one
      // fixed bias foreshortens away on one side while reading clearly on
      // the other — that's why previous versions had a strong side and a
      // weak side that flipped depending on which phi was chosen, never
      // both at once. Fix: use a much shallower falloff (exponent 0.15,
      // not 0.6) so the mask covers the whole upper hemisphere of the
      // cross-section (phi from roughly 0° to 180°, i.e. outward through
      // up through inward-and-up) rather than a narrow band around one
      // direction. This is visible from any camera elevation on both the
      // near and far arc of the ring — the cost is the star technically
      // extends a bit further around the tube than a literal directly-
      // overhead burst would, which is the right trade since a technically
      // purer but half-invisible star is worse than a slightly generous
      // but consistently visible one.
      // Align star burst so a proud ridge (+1.0) points straight up at phi = 90° (top of tube).
      // Radiates symmetrically across the exposed upper hemisphere (sinPhi > 0)
      // so star facets are visible uniformly across front, back, left, and right.
      const starPhase = starPoints * (phi - Math.PI / 2);
      const upperMask = sinPhi > 0 ? Math.pow(sinPhi, 0.25) : 0;
      const starWave = Math.cos(starPhase) * upperMask;
      const r = currentR * (1 + peakFactor * starSharpness * starWave);

      const lx = cosPhi * r;
      const ly = sinPhi * r;

      positions.push(cx + nx * lx, ly, cz + nz * lx);
    }
  }

  const ringStride = radialSegments + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const curr = i * ringStride + j;
      const next = (i + 1) * ringStride + j;

      indices.push(curr, curr + 1, next);
      indices.push(curr + 1, next + 1, next);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildScallopedPiping(material, radius, y, options = {}) {
  const surfaceLift = options.surfaceLift ?? 0.04;
  const mesh = new THREE.Mesh(buildSolidScallopRimGeometry({ R: radius, ...options }), material);
  mesh.position.y = y + surfaceLift;
  mesh.castShadow = true;
  return mesh;
}

function buildScallopedDollopPiping(material, radius, y, options = {}, rand) {
  const surfaceLift = options.surfaceLift ?? 0.04;
  const group = new THREE.Group();
  group.add(buildScallopedPiping(material, radius, y, { ...options, surfaceLift }));

  if (options.layered) {
    const lowerMesh = new THREE.Mesh(buildSolidScallopRimGeometry({
      R: radius * 0.97,
      N: options.N || Math.max(8, Math.round((radius * Math.PI * 2) / 2.0)),
      tubeRadius: (options.tubeRadius || 0.13) * 0.8,
      bulgeAmount: (options.bulgeAmount || 0.12) * 0.8,
      starSharpness: (options.starSharpness || 0.28) * 0.7,
      starPoints: 5,
      cuspPower: options.cuspPower || 1.6,
    }), material);
    lowerMesh.position.y = y + surfaceLift - 0.04;
    lowerMesh.castShadow = true;
    group.add(lowerMesh);
  }

  if (options.withDollops) {
    const N = options.N || Math.max(8, Math.round((radius * Math.PI * 2) / 2.0));
    const dollopScale = options.dollopScale || 0.46;
    group.add(instanceAroundRing(getUnitGeometry('starDollop'), material, {
      ringRadius: radius,
      y: y + surfaceLift + (options.tubeRadius || 0.13) * 0.9,
      count: N,
      angleOffset: 0,
      rand,
      scale: dollopScale,
    }));
  }

  return group;
}

function buildShellUnitGeometry() {
  return sweepProfileAlongCurve(
    starProfilePoints(),
    new ShellCurve(0.32, 0.15, 0.5),
    { segments: 18, taper: (t) => THREE.MathUtils.lerp(1, 0.06, t * t) }
  );
}

function buildLeafUnitGeometry() {
  return sweepProfileAlongCurve(
    leafProfilePoints(),
    new LeafPullCurve(0.18, 0.03),
    { segments: 10, taper: (t) => THREE.MathUtils.lerp(1, 0.22, t) }
  );
}

/** Round tip doesn't sweep a path in real life — it's a squeezed dome. A
 *  flattened sphere (a "pearl") captures that directly and more accurately
 *  than forcing it through the sweep system. */
function buildRoundUnitGeometry(radius = 0.1) {
  const geo = new THREE.SphereGeometry(radius, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62);
  geo.rotateX(Math.PI); // dome pointing up, flat-ish base resting on the ring
  geo.scale(1, 0.85, 1); // slightly squashed, like real piped icing under its own weight
  return geo;
}

/** Drop flower — a stamped floret, not a tube: a scalloped disc (the
 *  petals, via a sine-modulated radius) extruded with a bevel for a soft
 *  3D edge, plus a small domed center bump. Built as one combined geometry
 *  per unit so it still instances as a single draw call. */
function buildDropFlowerUnitGeometry({ petals = 5, outerR = 0.16, innerR = 0.1, thickness = 0.05 } = {}) {
  const shape = new THREE.Shape();
  const segments = petals * 12;
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const r = innerR + (outerR - innerR) * (0.5 + 0.5 * Math.cos(t * petals));
    const x = Math.cos(t) * r;
    const y = Math.sin(t) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const petalGeo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.5,
    bevelSize: outerR * 0.06,
    bevelSegments: 3,
  });
  petalGeo.rotateX(-Math.PI / 2); // lay flat, extrusion depth becomes "up"

  const centerGeo = new THREE.SphereGeometry(innerR * 0.6, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
  centerGeo.translate(0, thickness * 0.9, 0);

  return mergeGeometries([petalGeo, centerGeo]);
}

/** Minimal, dependency-free position-only geometry merge (avoids requiring
 *  three/examples/jsm/utils/BufferGeometryUtils just for this one case). */
function mergeGeometries(geometries) {
  const positions = [];
  const normals = [];
  const indices = [];
  let vertexOffset = 0;

  for (const geo of geometries) {
    const posAttr = geo.getAttribute('position');
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    const normAttr = geo.getAttribute('normal');
    for (let i = 0; i < posAttr.count; i++) {
      positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
    }
    const index = geo.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i++) indices.push(index.getX(i) + vertexOffset);
    } else {
      for (let i = 0; i < posAttr.count; i++) indices.push(i + vertexOffset);
    }
    vertexOffset += posAttr.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setIndex(indices);
  return merged;
}

// ─── Continuous ring builders (Rope, Petal ruffle) — one mesh, full circumference ──

/**
 * Builds a swept strip whose local length exactly matches the ring's
 * circumference, then wraps every vertex around that ring (angle = arc
 * length / radius) so the strip becomes a single seamless loop with no
 * gap and no per-unit repetition artifacts.
 */
function wrapStripAroundRing(stripGeometry, ringRadius) {
  const pos = stripGeometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i); // arc-length position around the ring
    const y = pos.getY(i); // height (up the cake)
    const z = pos.getZ(i); // radial offset (in/out from the ring)
    const angle = x / ringRadius;
    const r = ringRadius + z;
    pos.setXYZ(i, Math.sin(angle) * r, y, Math.cos(angle) * r);
  }
  pos.needsUpdate = true;
  stripGeometry.computeVertexNormals();
  return stripGeometry;
}

function buildRopeRingGeometry(ringRadius) {
  const circumference = ringRadius * Math.PI * 2;
  const wavesAroundRing = Math.max(24, Math.round(circumference / 0.18));
  const curve = new WaveStripCurve(circumference, 0.045, wavesAroundRing);
  const geo = sweepProfileAlongCurve(starProfilePoints(6, 0.07, 0.035), curve, {
    segments: Math.max(64, wavesAroundRing * 6),
    taper: () => 1,
  });
  return wrapStripAroundRing(geo, ringRadius);
}

function buildPetalRuffleRingGeometry(ringRadius) {
  const circumference = ringRadius * Math.PI * 2;
  const wavesAroundRing = Math.max(16, Math.round(circumference / 0.4));
  const curve = new WaveStripCurve(circumference, 0.03, wavesAroundRing);
  const geo = sweepProfileAlongCurve(petalProfilePoints(0.16, 0.05, 14), curve, {
    segments: Math.max(48, wavesAroundRing * 5),
    // Slight organic width variation — real ruffles aren't perfectly even
    taper: (t) => 1 + 0.08 * Math.sin(t * Math.PI * 2 * wavesAroundRing * 0.5),
  });
  return wrapStripAroundRing(geo, ringRadius);
}

/**
 * Lambeth Method piping — classic draped swags with vertical drop elements,
 * rosettes, coffee beans, and shell border. Creates a three-dimensional,
 * fabric-like appearance with multiple decorative elements arranged around
 * the ring.
 */
function buildLambethRingGeometry(ringRadius) {
  const circumference = ringRadius * Math.PI * 2;
  const swagCount = Math.max(12, Math.round(circumference / 0.5));
  const geometries = [];

  // 1. Draped swags — curved fabric-like elements using Bezier curves
  for (let i = 0; i < swagCount; i++) {
    const startAngle = (i / swagCount) * Math.PI * 2;
    const endAngle = ((i + 1) / swagCount) * Math.PI * 2;
    const midAngle = (startAngle + endAngle) / 2;

    // Create a swag curve that dips down between anchor points
    const swagDepth = ringRadius * 0.12;
    const swagHeight = 0.15;

    const swagPoints = [
      new THREE.Vector3(Math.sin(startAngle) * ringRadius, 0, Math.cos(startAngle) * ringRadius),
      new THREE.Vector3(Math.sin(midAngle) * (ringRadius + swagDepth * 0.3), -swagHeight, Math.cos(midAngle) * (ringRadius + swagDepth * 0.3)),
      new THREE.Vector3(Math.sin(endAngle) * ringRadius, 0, Math.cos(endAngle) * ringRadius),
    ];

    const swagCurve = new THREE.QuadraticBezierCurve3(swagPoints[0], swagPoints[1], swagPoints[2]);
    const swagGeo = new THREE.TubeGeometry(swagCurve, 20, swagDepth * 0.15, 8, false);
    geometries.push(swagGeo);

    // 2. Vertical drop elements at the bottom of each swag
    const dropGeo = new THREE.CapsuleGeometry(swagDepth * 0.08, swagHeight * 0.4, 4, 8);
    dropGeo.translate(Math.sin(midAngle) * (ringRadius + swagDepth * 0.3), -swagHeight * 1.3, Math.cos(midAngle) * (ringRadius + swagDepth * 0.3));
    dropGeo.rotateX(Math.PI / 2);
    geometries.push(dropGeo);

    // 3. Coffee beans — small oval elements at swag junctions
    const beanGeo = new THREE.SphereGeometry(swagDepth * 0.12, 8, 6);
    beanGeo.scale(1, 0.6, 1);
    beanGeo.translate(Math.sin(endAngle) * ringRadius, -swagHeight * 0.2, Math.cos(endAngle) * ringRadius);
    geometries.push(beanGeo);

    // 4. Rosettes at the top of each swag
    const rosetteGeo = new THREE.TorusGeometry(swagDepth * 0.2, swagDepth * 0.06, 8, 12);
    rosetteGeo.translate(Math.sin(startAngle) * ringRadius, swagHeight * 0.15, Math.cos(startAngle) * ringRadius);
    rosetteGeo.rotateY(Math.PI / 2);
    geometries.push(rosetteGeo);
  }

  // 5. Shell border — continuous shell-like piping around the ring
  const shellWaves = Math.max(24, Math.round(circumference / 0.15));
  const shellCurve = new WaveStripCurve(circumference, 0.04, shellWaves);
  const shellGeo = sweepProfileAlongCurve(starProfilePoints(6, 0.05, 0.025), shellCurve, {
    segments: Math.max(64, shellWaves * 4),
    taper: (t) => 0.8 + 0.2 * Math.sin(t * Math.PI * 2 * shellWaves),
  });
  const wrappedShell = wrapStripAroundRing(shellGeo, ringRadius);
  wrappedShell.translate(0, 0.08, 0); // Position slightly above
  geometries.push(wrappedShell);

  // Merge all geometries into one
  return mergeGeometries(geometries);
}

// ─── Instancing helper ────────────────────────────────────────────────────

function instanceAroundRing(geometry, material, {
  ringRadius,
  y,
  count,
  faceOutward = true,
  randomYaw = 0,
  rand = Math.random,
  scale = 1,
  angleOffset = 0,
}) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const angle = angleOffset + (i / count) * Math.PI * 2;
    dummy.position.set(Math.sin(angle) * ringRadius, y, Math.cos(angle) * ringRadius);
    dummy.rotation.y = faceOutward ? angle + (randomYaw ? (rand() - 0.5) * randomYaw : 0) : 0;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

// ─── Public API ───────────────────────────────────────────────────────────

// Cached unit geometries — built once total, reused across every flavor
// (color lives on the material, not the geometry) and every time the ring
// is rebuilt, matching the material caching pattern already used elsewhere.
const unitGeometryCache = {};
function getUnitGeometry(tip) {
  if (!unitGeometryCache[tip]) {
    switch (tip) {
      case 'star': unitGeometryCache[tip] = buildStarUnitGeometry(); break;
      case 'shell': unitGeometryCache[tip] = buildShellUnitGeometry(); break;
      case 'round': unitGeometryCache[tip] = buildRoundUnitGeometry(); break;
      case 'leaf': unitGeometryCache[tip] = buildLeafUnitGeometry(); break;
      case 'dropFlower': unitGeometryCache[tip] = buildDropFlowerUnitGeometry(); break;
      case 'starDollop': unitGeometryCache[tip] = buildStarDollopUnitGeometry(); break;
      default: return null;
    }
    // Reused across every ring built from now on — CakeScene's disposal
    // pass (run on every rebuild) must skip this, or the next cake that
    // uses this tip would get a disposed/invalid geometry.
    unitGeometryCache[tip].userData.sharedCache = true;
  }
  return unitGeometryCache[tip];
}

/**
 * Builds the full piped border for one of the 7 tips around a horizontal
 * ring (e.g. the exposed edge of a filling layer). Returns a THREE.Object3D
 * ready to add to the cake group, or null for tip 'none'/unrecognized.
 *
 * @param {string} tip - registered id from PIPING_TIPS, or null. (Filling's
 *   own FILLING_PIPING_DESIGNS ids, like 'mashedCircles', are NOT passed
 *   here — those replace the filling body's own geometry directly in
 *   CakeScene.jsx instead of adding a trim mesh via this function.)
 * @param {THREE.Material} material - already flavor-tinted (see createFillingMaterial in CakeScene.jsx)
 * @param {object} opts - { radius, y, rand, scale }
 *   scale: uniform size multiplier for the instanced (non-continuous) tips
 *   — star, shell, round, leaf, dropFlower. Default 1 matches the original
 *   small Filling-trim scale; callers wanting a bigger, more prominent
 *   border (e.g. Edge Piping) can pass a larger value. Spacing scales down
 *   proportionally so bigger units don't overcrowd/overlap the ring.
 */
export function buildPipingRing(tip, material, { radius, y, rand = Math.random, scale = 1 } = {}) {
  if (!tip) return null;

  switch (tip) {
    case 'star': {
      const count = Math.max(10, Math.round((radius * Math.PI * 2) / (0.34 * scale)));
      return instanceAroundRing(getUnitGeometry('star'), material, { ringRadius: radius, y, count, rand, scale });
    }
    case 'shell': {
      const count = Math.max(12, Math.round((radius * Math.PI * 2) / (0.24 * scale)));
      return instanceAroundRing(getUnitGeometry('shell'), material, { ringRadius: radius, y, count, rand, scale });
    }
    case 'round': {
      const count = Math.max(16, Math.round((radius * Math.PI * 2) / (0.2 * scale)));
      return instanceAroundRing(getUnitGeometry('round'), material, { ringRadius: radius, y, count, rand, scale });
    }
    case 'leaf': {
      const count = Math.max(10, Math.round((radius * Math.PI * 2) / (0.3 * scale)));
      return instanceAroundRing(getUnitGeometry('leaf'), material, {
        ringRadius: radius, y, count, randomYaw: 0.35, rand, scale,
      });
    }
    case 'dropFlower': {
      const count = Math.max(8, Math.round((radius * Math.PI * 2) / (0.5 * scale))); // spaced apart, not overlapping
      return instanceAroundRing(getUnitGeometry('dropFlower'), material, { ringRadius: radius, y, count, rand, scale });
    }
    case 'starDollop': {
      const count = Math.max(8, Math.round((radius * Math.PI * 2) / (0.62 * scale)));
      return instanceAroundRing(getUnitGeometry('starDollop'), material, { ringRadius: radius, y, count, rand, scale: scale * 0.55 });
    }
    case 'starDollopSparse': {
      const count = Math.max(8, Math.round((radius * Math.PI * 2) / (1.35 * scale)));
      return instanceAroundRing(getUnitGeometry('starDollop'), material, { ringRadius: radius, y, count, rand, scale: scale * 0.55 });
    }
    case 'starScallop': {
      const N = Math.max(8, Math.round((radius * Math.PI * 2) / 2.0));
      return buildScallopedPiping(material, radius, y, { N, tubeRadius: 0.13, bulgeAmount: 0.12, starSharpness: 0.75, starPoints: 6, cuspPower: 1.6, peakSharpness: 1.0, surfaceLift: 0.04 });
    }
    case 'starScallopSoft': {
      const N = Math.max(8, Math.round((radius * Math.PI * 2) / 2.2));
      return buildScallopedPiping(material, radius, y, { N, tubeRadius: 0.13, bulgeAmount: 0.09, starSharpness: 0.6, starPoints: 5, cuspPower: 1.4, peakSharpness: 1.0, surfaceLift: 0.04 });
    }
    case 'starScallopDollops': {
      const N = Math.max(8, Math.round((radius * Math.PI * 2) / 2.0));
      return buildScallopedDollopPiping(material, radius, y, { N, tubeRadius: 0.13, bulgeAmount: 0.12, starSharpness: 0.7, starPoints: 6, cuspPower: 1.6, peakSharpness: 1.0, withDollops: true, dollopScale: 0.46, surfaceLift: 0.04 }, rand);
    }
    case 'starScallopLayered': {
      const N = Math.max(8, Math.round((radius * Math.PI * 2) / 2.0));
      return buildScallopedDollopPiping(material, radius, y, { N, tubeRadius: 0.13, bulgeAmount: 0.12, starSharpness: 0.7, starPoints: 6, cuspPower: 1.6, peakSharpness: 1.0, withDollops: true, dollopScale: 0.42, layered: true, surfaceLift: 0.04 }, rand);
    }
    case 'rope': {
      const geo = buildRopeRingGeometry(radius);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.y = y;
      mesh.castShadow = true;
      return mesh;
    }
    case 'petal': {
      const geo = buildPetalRuffleRingGeometry(radius);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.y = y;
      mesh.castShadow = true;
      return mesh;
    }
    case 'lambeth': {
      const geo = buildLambethRingGeometry(radius);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.y = y;
      mesh.castShadow = true;
      return mesh;
    }
    default:
      return null;
  }
}