import * as THREE from 'three';
import { buildCherryMesh } from './toppings/cherry';
import { buildSlicedStrawberryMesh } from './toppings/strawberry';

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

/** Flattened 6-point star profile for wave piping:
 *  Wider in X/Z (0.100 outer, 0.052 inner) than Y (0.065 outer, 0.038 inner).
 *  This creates the realistic squashed buttercream shape pressed against the cake surface,
 *  with crisp star fluting on top. */
export function flatStarProfilePoints(points = 6, outerRx = 0.100, outerRy = 0.065, innerRx = 0.052, innerRy = 0.038) {
  const pts = [];
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const isOuter = i % 2 === 0;
    const rx = isOuter ? outerRx : innerRx;
    const ry = isOuter ? outerRy : innerRy;
    const a = i * step - Math.PI / 2;
    pts.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry });
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

/** Continuous zigzag wave along a flat strip — used for Zigzag Piping.
 *  Models the authentic Wilton Tip 16 buttercream zigzag border with
 *  diagonal fluted sweeps, rounded C-shaped loop crests, and lush 3D body. */
export class ZigzagStripCurve extends THREE.Curve {
  constructor(length, amplitude, waves) {
    super();
    this.length = length;
    this.amplitude = amplitude; // half-width of the zigzag sweep
    this.waves = waves;
    this.L = length / waves;
    this.B = this.L * 0.28; // forward loop bias for voluptuous rounded C-lobes
  }

  getPoint(t, target = new THREE.Vector3()) {
    const totalT = Math.max(0, Math.min(1, t));
    const phase = totalT * this.waves * Math.PI * 2;

    // Continuous diagonal sweep with rounded loop expansion at crests
    const x = totalT * this.length - this.B * Math.cos(phase);
    const sinP = Math.sin(phase);
    const z = this.amplitude * sinP;

    // Arched 3D buttercream body with plump elevation at crests
    const y = 0.072 + 0.024 * Math.abs(sinP) + 0.010 * Math.sin(phase * 2);

    return target.set(x, y, z);
  }
}

/** Continuous flat sine wave along a strip — used for Wave Piping.
 *  Models the authentic Wilton Tip 16 / Boquilla 16 flat-lying S-wave buttercream piping
 *  with fat, flattened lobes oscillating radially in the XZ plane rather than vertically. */
export class FlatSineStripCurve extends THREE.Curve {
  constructor(length, amplitude, waves) {
    super();
    this.length = length;
    this.amplitude = amplitude; // radial sweep width (in Z)
    this.waves = waves;
    this.L = length / waves;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const totalT = Math.max(0, Math.min(1, t));
    const phase = totalT * this.waves * Math.PI * 2;

    // Longitudinal advance along the strip
    const x = totalT * this.length;
    // Radial oscillation in XZ plane creates flat-lying serpentine lobes
    const sinP = Math.sin(phase);
    const z = this.amplitude * sinP;

    // Low, flat profile with subtle organic lift over crests
    const y = 0.055 + 0.018 * Math.abs(sinP);

    return target.set(x, y, z);
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

/**
 * Whipped cream rosette — models a single swirl piped with a large open-star
 * tip (Wilton 1M / equivalent), the classic whipped cream border shape.
 *
 * Key characteristics vs. a plain starDollop:
 *   • Wider base (radius 0.40 vs 0.28) — more generous, airy footprint.
 *   • Fewer, deeper points (8 vs 12) — fat open petals, not tight flutes.
 *   • Spiraling ridges — `ridgeAngle = angle + swirlAngle(t)` rotates the
 *     radial-variation phase as height increases, so the peaks/valleys
 *     describe a continuous spiral from base to tip.
 *   • Plumper belly — holds full width from 18 % to 55 % of height. Above
 *     that, a broad single-start fold wraps around a rounded tapered core,
 *     recreating the layered upper silhouette of freshly piped cream.
 */
export function buildWhippedCreamRosetteUnitGeometry({ radius = 0.40, height = 0.60, points = 8 } = {}) {
  const radialSegments = points * 6; // 48 — smooth enough to read the open petal curves
  const heightSegments = 44;
  const positions = [];
  const indices = [];

  const bodyTaper = (t) => {
    // 0–18 %: base flares from 82 % to full width (seated, grounded look)
    if (t < 0.18) {
      const u = t / 0.18;
      return 0.82 + 0.18 * Math.sin(u * Math.PI / 2);
    }
    // 18–55 %: plump open belly — nearly constant, only very gentle narrowing
    if (t < 0.55) {
      const u = (t - 0.18) / 0.37;
      return 1.0 - 0.04 * u;
    }
    // 55–100 %: a fuller core leaves room for the upper spiral fold before
    // resolving into a clean release point. The previous 1.55 exponent
    // collapsed too quickly and made this section read as a smooth cone.
    const u = (t - 0.55) / 0.45;
    return 0.96 * Math.pow(1 - u, 0.92);
  };

  // Keep the accepted lower-half relief unchanged. The upper star flutes
  // soften gradually but remain present around the wrapped cream fold.
  const ridgeAmpAt = (t) => {
    if (t <= 0.55) return 0.23 * Math.max(0, 1 - t / 0.85);
    const u = (t - 0.55) / 0.45;
    const joinAmplitude = 0.23 * (1 - 0.55 / 0.85);
    return joinAmplitude * Math.pow(1 - u, 1.4);
  };

  const lowerSwirlRate = Math.PI * 0.9;
  const upperSwirl = Math.PI * 0.85;

  const baseYOffset = -0.06 * height; // embed base slightly below y=0

  for (let yi = 0; yi <= heightSegments; yi++) {
    const t = yi / heightSegments;
    const taper = bodyTaper(t);
    const currentY = t * height + baseYOffset;
    const peakT = THREE.MathUtils.clamp((t - 0.80) / 0.20, 0, 1);
    const peakLift = height * 0.08 * (peakT * peakT * (3 - 2 * peakT));
    const ridgeAmp = ridgeAmpAt(t);
    // Preserve the original ridge phase below the join, then continue the
    // twist through the upper body so the surface remains visually connected.
    const upperT = t > 0.55 ? (t - 0.55) / 0.45 : 0;
    const swirlAngle = t <= 0.55
      ? t * lowerSwirlRate
      : 0.55 * lowerSwirlRate + upperT * upperSwirl;
    const tipT = THREE.MathUtils.clamp((t - 0.68) / 0.32, 0, 1);
    const tipEase = tipT * tipT * (3 - 2 * tipT);
    const tipDirection = -Math.PI * 0.65 + tipEase * Math.PI * 0.45;
    const tipOffset = radius * 0.10 * tipEase;
    const centerX = Math.cos(tipDirection) * tipOffset;
    const centerZ = Math.sin(tipDirection) * tipOffset;

    for (let i = 0; i < radialSegments; i++) {
      const angle = (i / radialSegments) * Math.PI * 2;
      const ridgeAngle = angle + swirlAngle; // phase-shifted ridge gives the spiral
      const radialVariation = 1 + Math.cos(points * ridgeAngle) * ridgeAmp;

      // One broad raised fold winds 1.65 turns around the upper core. Because
      // its envelope is zero at both ends, the accepted lower body and pointed
      // finish stay seamless. This is a single continuous surface, avoiding
      // the detached tubes and stacked-ring look of separate meshes.
      let spiralFold = 0;
      let spiralLift = 0;
      if (t > 0.55) {
        const foldEnvelope = Math.pow(Math.sin(upperT * Math.PI), 0.72);
        const tierPhase = angle - upperT * Math.PI * 3.0 + Math.PI * 0.35;
        const tierHalfWave = Math.pow(0.5 + 0.5 * Math.cos(tierPhase), 0.7);
        const stackedFold = radius * 0.16 * foldEnvelope * tierHalfWave;
        const foldPhase = angle - upperT * Math.PI * 3.3 - Math.PI * 0.18;
        const raisedHalfWave = Math.pow(0.5 + 0.5 * Math.cos(foldPhase), 1.1);
        const helicalBias = radius * 0.02 * (1 - 0.30 * upperT) * foldEnvelope * raisedHalfWave;
        spiralFold = stackedFold + helicalBias;
        spiralLift = height * 0.016 * foldEnvelope * Math.sin(tierPhase);
      }

      const r = radius * taper * radialVariation + spiralFold;
      positions.push(
        centerX + Math.cos(angle) * r,
        currentY + peakLift + spiralLift,
        centerZ + Math.sin(angle) * r
      );
    }
  }

  // Lateral face indices
  for (let yi = 0; yi < heightSegments; yi++) {
    for (let i = 0; i < radialSegments; i++) {
      const next = (i + 1) % radialSegments;
      const current = yi * radialSegments + i;
      const currentNext = yi * radialSegments + next;
      const nextRow = (yi + 1) * radialSegments + i;
      const nextRowNext = (yi + 1) * radialSegments + next;
      indices.push(current, nextRow, currentNext, currentNext, nextRow, nextRowNext);
    }
  }

  // Bottom and top cap centres
  const bottomCenter = positions.length / 3;
  positions.push(0, baseYOffset, 0);
  const topStart = heightSegments * radialSegments;
  const topCenter = positions.length / 3;
  const tipEndDirection = -Math.PI * 0.20;
  positions.push(
    Math.cos(tipEndDirection) * radius * 0.10,
    height * 1.08 + baseYOffset,
    Math.sin(tipEndDirection) * radius * 0.10
  );
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

/** Tall, ridged star-tip dollop based on a continuous buttercream squeeze:
 * broad, grounded base that flares smoothly into the belly and narrows into a pointed release at the top. */
export function buildStarDollopUnitGeometry({ radius = 0.28, height = 0.5, points = 12 } = {}) {
  const radialSegments = points * 4;
  const heightSegments = 32;
  const positions = [];
  const indices = [];

  const bodyTaper = (t) => {
    const peakT = 0.22;
    const bodyEndT = 0.6;
    if (t < peakT) {
      // Broad, grounded base (88% of peak width) that flares gently to full width
      const u = t / peakT;
      return 0.88 + 0.12 * Math.sin(u * Math.PI / 2);
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

  const baseYOffset = -0.06 * height; // Embed slightly into surface so dollop sits grounded on cake/plate

  for (let y = 0; y <= heightSegments; y++) {
    const t = y / heightSegments;
    const taper = bodyTaper(t);
    const ridgeStrength = 0.16 - t * 0.035;
    const currentY = t * height + baseYOffset;
    for (let i = 0; i < radialSegments; i++) {
      const angle = (i / radialSegments) * Math.PI * 2;
      const radialVariation = 1 + Math.cos(points * angle) * ridgeStrength;
      const r = radius * taper * radialVariation;
      positions.push(Math.cos(angle) * r, currentY, Math.sin(angle) * r);
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
  positions.push(0, baseYOffset, 0);
  const topStart = heightSegments * radialSegments;
  const topCenter = positions.length / 3;
  positions.push(0, height + baseYOffset, 0);
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
 * Smooth, plump plain round-tip dollop based on a large round nozzle squeeze:
 * broad seated base embedded slightly into surface, generous spherical belly that flares to full width,
 * and narrows smoothly into an organic pointed kiss peak at the top.
 */
export function buildRoundDollopUnitGeometry({ radius = 0.322, height = 0.53 } = {}) {
  const radialSegments = 36;
  const heightSegments = 36;
  const positions = [];
  const indices = [];

  const bodyTaper = (t) => {
    // Plump spherical belly from base up to shoulder (t = 0.74),
    // then graceful pinch into an organic kiss tip at the top (t = 1.0).
    const shoulderT = 0.74;
    const centerY = 0.35;
    const semiY = 0.46;
    if (t < shoulderT) {
      const dy = (t - centerY) / semiY;
      return Math.sqrt(Math.max(0.05, 1 - dy * dy));
    }
    const u = (t - shoulderT) / (1 - shoulderT);
    const shoulderR = Math.sqrt(Math.max(0.05, 1 - Math.pow((shoulderT - centerY) / semiY, 2)));
    return shoulderR * Math.pow(1 - u, 1.6);
  };

  const baseYOffset = -0.06 * height;

  for (let y = 0; y <= heightSegments; y++) {
    const t = y / heightSegments;
    const taper = bodyTaper(t);
    const currentY = t * height + baseYOffset;
    const r = radius * taper;
    for (let i = 0; i < radialSegments; i++) {
      const angle = (i / radialSegments) * Math.PI * 2;
      positions.push(Math.cos(angle) * r, currentY, Math.sin(angle) * r);
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
  positions.push(0, baseYOffset, 0);
  const topStart = heightSegments * radialSegments;
  const topCenter = positions.length / 3;
  positions.push(0, height + baseYOffset, 0);
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
 * Piped buttercream / meringue kiss dollop (matching bakery reference):
 * - Seated circular footprint on cake surface
 * - Plump, rounded spherical belly ballooning out around lower 28% of height (t = 0.28)
 * - Voluminous, full-bodied curves tapering smoothly up into a perky, crisp conical peak (t = 1.0)
 * - Proud bakery dollop proportions (height = 0.86, radius = 0.38)
 */
export function buildKissDollopUnitGeometry({ radius = 0.38, height = 0.86 } = {}) {
  const radialSegments = 36;
  const heightSegments = 36;
  const positions = [];
  const indices = [];

  const bodyTaper = (t) => {
    // Lower 28%: bulbous round belly ballooning out from seated base (0.82) to full plumpness (1.0)
    if (t < 0.28) {
      const s = t / 0.28;
      return 0.82 + 0.18 * Math.sin(s * Math.PI * 0.5);
    }
    // Upper 72%: smooth convex-to-conical sweep tapering up to a crisp perky peak
    const u = (t - 0.28) / 0.72;
    return Math.pow(Math.cos(u * Math.PI * 0.5), 1.08);
  };

  const baseYOffset = -0.05 * height;

  for (let y = 0; y <= heightSegments; y++) {
    const t = y / heightSegments;
    const taper = bodyTaper(t);
    const currentY = t * height + baseYOffset;
    const r = radius * taper;
    for (let i = 0; i < radialSegments; i++) {
      const angle = (i / radialSegments) * Math.PI * 2;
      positions.push(Math.cos(angle) * r, currentY, Math.sin(angle) * r);
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
  positions.push(0, baseYOffset, 0);
  const topStart = heightSegments * radialSegments;
  const topCenter = positions.length / 3;
  positions.push(0, height + baseYOffset, 0);
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
  starSharpness = 0.28, // must stay < 1.0 — at starFactor=1 the valley radius is tubeRadius*(1 - starSharpness), which hits zero/inverts at starSharpness=1
  starFloor = 0.4, // minimum star factor in valleys (0 = plain round valleys, 1 = same as peaks). 0.4 means valleys still show 40% of peak star amplitude — no plain-round gaps around the ring
  starPoints = 6,
  cuspPower = 1.6, // >1 sharpens the corner of the (now genuinely cornered) triangle-wave lobe transition
  peakSharpness = 1.0, // controls how steeply peakFactor ramps from starFloor at valleys to 1.0 at peaks
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
    // peakFactor ramps from 0 at valley to 1 at peak apex.
    // starFactor raises the floor to starFloor so valleys always show star character
    // (peakFactor=0 previously meant zero star morphing in valleys => plain round tube).
    const peakFactor = Math.pow(Math.max(0, triangle), peakSharpness);
    const starFactor = starFloor + (1.0 - starFloor) * peakFactor;

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
      // exposedMask covers the entire hemisphere visible from a normal elevated camera:
      // phi=0 (pure outward) = 1.0, phi=90 (straight up) = 1.0, inner+downward side = 0.
      // No phase shift: cos(6*phi) places proud ridges at phi=0 (outward face, visible from
      // camera side-view), phi=60 (upper-outer), phi=120 (upper-inner) — ridges are visible
      // from both side-elevated and top-down camera positions simultaneously.
      const exposedMask = Math.pow(Math.max(0, (sinPhi + cosPhi + 1) / 2), 0.25);
      const starWave = Math.cos(starPoints * phi) * exposedMask;
      const r = currentR * (1 + starFactor * starSharpness * starWave);

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

/**
 * Realistic Wilton-style Shell Border Unit Geometry:
 * - Convex, dome-like rounded swell head rising to peak at u ~ 0.20
 * - Deep 8-star fluting radiating across upper/exposed crest
 * - Smooth exponential taper to flattened tail (overlapping adjacent shell)
 * - Flat base at y = 0 for clean seating on cake/plate surface
 * - Watertight with smooth vertex normals
 */
/**
 * Realistic Wilton-style Shell Border Unit Geometry:
 * - 100% solid, closed watertight geometry with flat solid base at y = 0 (no hollow underneath)
 * - Convex, dome-like rounded swell head rising to peak at u ~ 0.25
 * - Deep 7-point radiating star fluting across the upper crest
 * - Smooth exponential taper down to a flattened tail (overlapping adjacent shell)
 * - Solid base quad strip connecting left and right base rails with -Y normals
 * - Watertight head and tail end caps with smooth vertex normals
 */
function buildShellUnitGeometry({
  length = 0.35,
  maxWidth = 0.22,
  maxHeight = 0.13,
  fluteCount = 26,
  fluteDepth = 0.22,
  uSegments = 28,
  thetaSegments = 56,
} = {}) {
  const positions = [];
  const indices = [];

  function getProfile(u) {
    let wScale, hScale;
    if (u < 0.25) {
      const t = u / 0.25;
      const bulb = Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
      wScale = 0.35 + 0.65 * bulb;
      hScale = 0.25 + 0.75 * bulb;
    } else {
      const t = (u - 0.25) / 0.75;
      wScale = 1.0 - 0.75 * Math.pow(t, 0.8);
      hScale = 1.0 - 0.85 * Math.pow(t, 0.85);
    }
    return { width: maxWidth * wScale, height: maxHeight * hScale };
  }

  for (let i = 0; i <= uSegments; i++) {
    const u = i / uSegments;
    const x = u * length;
    const { width, height } = getProfile(u);
    const halfW = width * 0.5;
    const ridgeTwist = (1 - u) * 0.22;

    for (let j = 0; j <= thetaSegments; j++) {
      const theta = (j / thetaSegments) * Math.PI;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      // Fine multi-ridge star flute modulation (12-14 crisp pleated ridges)
      const fluteAngle = theta * fluteCount + ridgeTwist;
      const cosF = Math.cos(fluteAngle);
      const fluteShape = Math.sign(cosF) * Math.pow(Math.abs(cosF), 0.82);
      const fluteMod = fluteShape * fluteDepth * Math.pow(sinTheta, 0.4);

      const z = -halfW * cosTheta * (1 + fluteMod * 0.4);
      const y = Math.max(0, height * sinTheta * (1 + fluteMod));

      positions.push(x, y, z);
    }
  }

  const numCols = thetaSegments + 1;

  // Dome (outward counter-clockwise winding)
  for (let i = 0; i < uSegments; i++) {
    for (let j = 0; j < thetaSegments; j++) {
      const current = i * numCols + j;
      const currentNext = current + 1;
      const nextRow = (i + 1) * numCols + j;
      const nextRowNext = nextRow + 1;

      indices.push(current, currentNext, nextRow);
      indices.push(currentNext, nextRowNext, nextRow);
    }
  }

  // Solid flat base (facing -Y)
  for (let i = 0; i < uSegments; i++) {
    const leftCurrent = i * numCols;
    const leftNext = (i + 1) * numCols;
    const rightCurrent = i * numCols + thetaSegments;
    const rightNext = (i + 1) * numCols + thetaSegments;

    indices.push(leftCurrent, leftNext, rightCurrent);
    indices.push(leftNext, rightNext, rightCurrent);
  }

  // Head cap (facing -X)
  const headCenterIdx = positions.length / 3;
  positions.push(0, 0, 0);

  for (let j = 0; j < thetaSegments; j++) {
    const v0 = j;
    const v1 = j + 1;
    indices.push(headCenterIdx, v1, v0);
  }

  // Tail cap (facing +X)
  const tailCenterIdx = positions.length / 3;
  positions.push(length, 0, 0);

  const lastRowOffset = uSegments * numCols;
  for (let j = 0; j < thetaSegments; j++) {
    const v0 = lastRowOffset + j;
    const v1 = lastRowOffset + j + 1;
    indices.push(tailCenterIdx, v0, v1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

/**
 * Organic Wilton-style Round Tip Bead Piping Unit Geometry:
 * - Piped with a smooth round tip (e.g., Wilton #10/#12)
 * - Continuous, unbroken C-infinity droplet profile with zero piecewise kinks or creases
 * - 360-degree smooth revolving cross-section curving under with horizontal tangents
 * - Buttery smooth vertex normals with zero faceted cuts or sharp lateral seams
 * - Closed, watertight droplet resting grounded against the cake surface
 */
function buildBeadUnitGeometry({
  length = 0.25,
  maxWidth = 0.22,
  maxHeight = 0.15,
  uSegments = 28,
  phiSegments = 24,
} = {}) {
  const positions = [];
  const indices = [];

  // Smooth, organic droplet radius function r(u) for u in [0, 1]
  // Peak dome around u ~ 0.30, smoothly tapering to rounded tail
  function getDropletRadius(u) {
    const s = Math.sin(Math.PI * Math.pow(u, 0.60));
    return Math.max(0, s * (1.0 - 0.25 * u));
  }

  for (let i = 0; i <= uSegments; i++) {
    const u = i / uSegments;
    const x = u * length;
    const r = getDropletRadius(u);

    const halfW = maxWidth * 0.5 * r;
    const halfH = maxHeight * 0.5 * r;
    const cy = halfH;

    for (let j = 0; j < phiSegments; j++) {
      const phi = (j / phiSegments) * Math.PI * 2;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      const z = halfW * sinPhi;
      const y = Math.max(0, cy + halfH * cosPhi);

      positions.push(x, y, z);
    }
  }

  // Quads between rows (outward counter-clockwise winding for clean lighting)
  for (let i = 0; i < uSegments; i++) {
    for (let j = 0; j < phiSegments; j++) {
      const nextJ = (j + 1) % phiSegments;
      const current = i * phiSegments + j;
      const currentNext = i * phiSegments + nextJ;
      const nextRow = (i + 1) * phiSegments + j;
      const nextRowNext = (i + 1) * phiSegments + nextJ;

      indices.push(current, currentNext, nextRow);
      indices.push(currentNext, nextRowNext, nextRow);
    }
  }

  // Head tip cap at (0, 0, 0)
  const headIdx = positions.length / 3;
  positions.push(0, 0, 0);
  for (let j = 0; j < phiSegments; j++) {
    const nextJ = (j + 1) % phiSegments;
    indices.push(headIdx, j, nextJ);
  }

  // Tail tip cap at (length, 0, 0)
  const tailIdx = positions.length / 3;
  positions.push(length, 0, 0);
  const lastRow = uSegments * phiSegments;
  for (let j = 0; j < phiSegments; j++) {
    const nextJ = (j + 1) % phiSegments;
    indices.push(tailIdx, lastRow + nextJ, lastRow + j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
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

export function buildZigzagRingGeometry(ringRadius) {
  const circumference = ringRadius * Math.PI * 2;
  const wavesAroundRing = Math.max(28, Math.round(circumference / 0.28));
  const curve = new ZigzagStripCurve(circumference, 0.185, wavesAroundRing);
  const geo = sweepProfileAlongCurve(starProfilePoints(6, 0.086, 0.046), curve, {
    segments: Math.max(128, wavesAroundRing * 14),
    taper: () => 1,
  });
  return wrapStripAroundRing(geo, ringRadius);
}

export function buildWavePipingRingGeometry(ringRadius) {
  const circumference = ringRadius * Math.PI * 2;
  const wavesAroundRing = Math.max(36, Math.round(circumference / 0.22));
  const curve = new FlatSineStripCurve(circumference, 0.190, wavesAroundRing);
  const geo = sweepProfileAlongCurve(flatStarProfilePoints(6, 0.092, 0.060, 0.046, 0.034), curve, {
    segments: Math.max(128, wavesAroundRing * 12),
    taper: () => 1,
  });
  return wrapStripAroundRing(geo, ringRadius);
}

/**
 * Rope Twist Piping — authentic interlocking open-star buttercream rope border.
 * Each twist forms an arched S-curve that starts nestled inside, crests outward
 * in a bold rounded loop, and sweeps down into the next twist with ~40% overlap.
 * Fluted with an 8-point star profile and axial twist rotation.
 */
export function buildRopeTwistUnitGeometries(ringRadius) {
  const circumference = ringRadius * Math.PI * 2;
  const rawN = Math.round(circumference / 1.15);
  const N = Math.max(14, rawN % 2 === 0 ? rawN : rawN + 1);
  const deltaTheta = (Math.PI * 2) / N;
  const overlapFactor = 1.40;
  const twistAngleSpan = deltaTheta * overlapFactor;

  const tubularSegments = 28;
  const starPoints = 8;
  const numProfilePts = 64; // 8 samples per star flute ensures sharp, non-blurred ridges
  const rMid = 0.180;
  const fluteDepth = 0.36; // Deep Wilton 1M French star fluting
  const rHead = ringRadius + 0.075; // Outer rim stroke region
  const rTail = ringRadius - 0.095; // Sweeps inward and tucks under next shell
  const twistRotation = 0.92; // radians of axial twist along the rope

  // Build crisp 8-point fluted star profile in local 2D space
  const baseProfile = [];
  for (let i = 0; i < numProfilePts; i++) {
    const phi = (i / numProfilePts) * Math.PI * 2;
    const cosF = Math.cos(starPoints * phi);
    const fluteShape = Math.sign(cosF) * Math.pow(Math.abs(cosF), 0.70);
    const r = rMid * (1.0 + fluteDepth * fluteShape);
    baseProfile.push({ x: Math.cos(phi) * r, y: Math.sin(phi) * r });
  }

  function getCurvePoint(thetaStart, t) {
    const clampedT = Math.max(0, Math.min(1, t));
    // Extended stroke progression along cake rim
    const sTheta = clampedT + 0.10 * Math.sin(Math.PI * clampedT);
    const theta = (thetaStart - 0.06) + sTheta * (twistAngleSpan + 0.06);

    // Stroke sweeps from outer rim to inner rim, hugging the rim at the root
    const smoothT = clampedT * clampedT * (3 - 2 * clampedT);
    const rBase = THREE.MathUtils.lerp(rHead, rTail, smoothT);
    const rootInset = (1.0 - Math.min(1.0, clampedT / 0.20)) * 0.025;
    const r = rBase - rootInset;

    // Continuous arch reaching the cake surface at both ends:
    // t=0 (outer end extended down to surface at -0.015) -> t=0.36 (crests at 0.235) -> t=1.0 (inner end grounded at -0.015)
    const y = -0.015 + 0.250 * Math.pow(Math.sin(Math.PI * Math.pow(clampedT, 0.68)), 0.88);
    return new THREE.Vector3(Math.sin(theta) * r, y, Math.cos(theta) * r);
  }

  const geometries = [];

  for (let k = 0; k < N; k++) {
    const thetaStart = k * deltaTheta;
    const positions = [];
    const indices = [];

    // Ring positions
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const center = getCurvePoint(thetaStart, t);

      // Tangent vector
      const dt = 0.002;
      const pNext = getCurvePoint(thetaStart, Math.min(1, t + dt));
      const pPrev = getCurvePoint(thetaStart, Math.max(0, t - dt));
      const tangent = new THREE.Vector3().subVectors(pNext, pPrev).normalize();

      // Normal and binormal using world-up reference
      const worldUp = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(worldUp, tangent).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      // Asymmetric piped shell taper: firmly grounded root (0.72x) -> bulbous head (1.18x) -> slender tucked tail (0.16x)
      let taperScale;
      if (t < 0.20) {
        taperScale = THREE.MathUtils.lerp(0.72, 1.18, t / 0.20);
      } else if (t < 0.50) {
        taperScale = THREE.MathUtils.lerp(1.18, 1.02, (t - 0.20) / 0.30);
      } else if (t < 0.80) {
        taperScale = THREE.MathUtils.lerp(1.02, 0.55, (t - 0.50) / 0.30);
      } else {
        taperScale = THREE.MathUtils.lerp(0.55, 0.16, (t - 0.80) / 0.20);
      }

      // Axial twist angle
      const axialAngle = t * twistRotation;
      const cosAx = Math.cos(axialAngle);
      const sinAx = Math.sin(axialAngle);

      for (let j = 0; j < numProfilePts; j++) {
        const bp = baseProfile[j];
        // Rotate profile by axialAngle
        const px = bp.x * cosAx - bp.y * sinAx;
        const py = bp.x * sinAx + bp.y * cosAx;

        const vx = (normal.x * px + binormal.x * py) * taperScale;
        const vy = (normal.y * px + binormal.y * py) * taperScale;
        const vz = (normal.z * px + binormal.z * py) * taperScale;

        positions.push(center.x + vx, center.y + vy, center.z + vz);
      }
    }

    // Build tube indices
    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < numProfilePts; j++) {
        const jNext = (j + 1) % numProfilePts;
        const a = i * numProfilePts + j;
        const b = i * numProfilePts + jNext;
        const c = (i + 1) * numProfilePts + j;
        const d = (i + 1) * numProfilePts + jNext;
        indices.push(a, b, c, b, d, c);
      }
    }

    // 3D Soft Rounded Headcap at t = 0 (submerged beneath cake surface)
    const startCenter = getCurvePoint(thetaStart, 0);
    const dt = 0.002;
    const tangent0 = new THREE.Vector3().subVectors(
      getCurvePoint(thetaStart, dt),
      getCurvePoint(thetaStart, 0)
    ).normalize();
    const headDomeCenter = startCenter.clone().addScaledVector(tangent0, -0.04);
    const startCapIdx = positions.length / 3;
    positions.push(headDomeCenter.x, headDomeCenter.y, headDomeCenter.z);
    for (let j = 0; j < numProfilePts; j++) {
      const jNext = (j + 1) % numProfilePts;
      indices.push(startCapIdx, jNext, j);
    }

    // Slender Tucked Tail Tip at t = 1 (submerged beneath cake surface)
    const endCenter = getCurvePoint(thetaStart, 1);
    const tangent1 = new THREE.Vector3().subVectors(
      getCurvePoint(thetaStart, 1),
      getCurvePoint(thetaStart, 1 - dt)
    ).normalize();
    const tailTipCenter = endCenter.clone().addScaledVector(tangent1, 0.02);
    const endCapIdx = positions.length / 3;
    positions.push(tailTipCenter.x, tailTipCenter.y, tailTipCenter.z);
    const lastRowOffset = tubularSegments * numProfilePts;
    for (let j = 0; j < numProfilePts; j++) {
      const jNext = (j + 1) % numProfilePts;
      indices.push(endCapIdx, lastRowOffset + j, lastRowOffset + jNext);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geometries.push(geo);
  }

  return geometries;
}

export function buildRopeTwistRingGeometry(ringRadius) {
  return mergeGeometries(buildRopeTwistUnitGeometries(ringRadius));
}

/**
 * Rope Twist Piping (Classic Variation) — the original overlapping diagonal
 * rope twist geometry from commit 9fd07cf, featuring compact diagonal strokes
 * across the cake rim with crisp 8-point star fluting.
 */
export function buildRopeTwistClassicUnitGeometries(ringRadius) {
  const circumference = ringRadius * Math.PI * 2;
  const rawN = Math.round(circumference / 1.10);
  const N = Math.max(14, rawN % 2 === 0 ? rawN : rawN + 1);
  const deltaTheta = (Math.PI * 2) / N;
  const overlapFactor = 1.38;
  const twistAngleSpan = deltaTheta * overlapFactor;

  const tubularSegments = 24;
  const starPoints = 8;
  const numProfilePts = 64; // 8 samples per star flute ensures sharp, non-blurred ridges
  const rMid = 0.175;
  const fluteDepth = 0.32;
  const rHalf = 0.100; // half-width of diagonal radial travel
  const yBase = 0.055;
  const yLift = 0.19;
  const twistRotation = 0.85; // radians of axial twist along the rope

  // Build crisp 8-point fluted star profile in local 2D space
  const baseProfile = [];
  for (let i = 0; i < numProfilePts; i++) {
    const phi = (i / numProfilePts) * Math.PI * 2;
    const cosF = Math.cos(starPoints * phi);
    const fluteShape = Math.sign(cosF) * Math.pow(Math.abs(cosF), 0.75);
    const r = rMid * (1.0 + fluteDepth * fluteShape);
    baseProfile.push({ x: Math.cos(phi) * r, y: Math.sin(phi) * r });
  }

  function getCurvePoint(thetaStart, t) {
    const clampedT = Math.max(0, Math.min(1, t));
    // S-curve angle inflection: gentle forward push in first half, curling in second half
    const sTheta = clampedT + 0.09 * Math.sin(Math.PI * 2 * clampedT);
    const theta = thetaStart + sTheta * twistAngleSpan;

    // Diagonal stroke from inner rim (t=0) to outer rim (t=1)
    const smoothT = clampedT * clampedT * (3 - 2 * clampedT);
    const rDisp = rHalf * (2 * smoothT - 1);
    const r = ringRadius + rDisp;

    // Arched height profile
    const y = yBase + yLift * Math.pow(Math.sin(Math.PI * clampedT), 0.75);
    return new THREE.Vector3(Math.sin(theta) * r, y, Math.cos(theta) * r);
  }

  const geometries = [];

  for (let k = 0; k < N; k++) {
    const thetaStart = k * deltaTheta;
    const positions = [];
    const indices = [];

    // Ring positions
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const center = getCurvePoint(thetaStart, t);

      // Tangent vector
      const dt = 0.002;
      const pNext = getCurvePoint(thetaStart, Math.min(1, t + dt));
      const pPrev = getCurvePoint(thetaStart, Math.max(0, t - dt));
      const tangent = new THREE.Vector3().subVectors(pNext, pPrev).normalize();

      // Normal and binormal using world-up reference
      const worldUp = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(worldUp, tangent).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      // Plump body taper: maintains full body through middle, soft rounded ends
      let taperScale;
      if (t < 0.20) {
        taperScale = THREE.MathUtils.lerp(0.78, 1.0, t / 0.20);
      } else if (t < 0.70) {
        taperScale = 1.0;
      } else {
        taperScale = THREE.MathUtils.lerp(1.0, 0.72, (t - 0.70) / 0.30);
      }

      // Axial twist angle
      const axialAngle = t * twistRotation;
      const cosAx = Math.cos(axialAngle);
      const sinAx = Math.sin(axialAngle);

      for (let j = 0; j < numProfilePts; j++) {
        const bp = baseProfile[j];
        // Rotate profile by axialAngle
        const px = bp.x * cosAx - bp.y * sinAx;
        const py = bp.x * sinAx + bp.y * cosAx;

        const vx = (normal.x * px + binormal.x * py) * taperScale;
        const vy = (normal.y * px + binormal.y * py) * taperScale;
        const vz = (normal.z * px + binormal.z * py) * taperScale;

        positions.push(center.x + vx, center.y + vy, center.z + vz);
      }
    }

    // Build tube indices
    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < numProfilePts; j++) {
        const jNext = (j + 1) % numProfilePts;
        const a = i * numProfilePts + j;
        const b = i * numProfilePts + jNext;
        const c = (i + 1) * numProfilePts + j;
        const d = (i + 1) * numProfilePts + jNext;
        indices.push(a, b, c, b, d, c);
      }
    }

    // Watertight endcaps
    const startCenter = getCurvePoint(thetaStart, 0);
    const startCapIdx = positions.length / 3;
    positions.push(startCenter.x, startCenter.y, startCenter.z);
    for (let j = 0; j < numProfilePts; j++) {
      const jNext = (j + 1) % numProfilePts;
      indices.push(startCapIdx, jNext, j);
    }

    const endCenter = getCurvePoint(thetaStart, 1);
    const endCapIdx = positions.length / 3;
    positions.push(endCenter.x, endCenter.y, endCenter.z);
    const lastRowOffset = tubularSegments * numProfilePts;
    for (let j = 0; j < numProfilePts; j++) {
      const jNext = (j + 1) % numProfilePts;
      indices.push(endCapIdx, lastRowOffset + j, lastRowOffset + jNext);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geometries.push(geo);
  }

  return geometries;
}

export function buildRopeTwistClassicRingGeometry(ringRadius) {
  return mergeGeometries(buildRopeTwistClassicUnitGeometries(ringRadius));
}

/**
 * Reverse Shell Piping — classic bakery border piping technique.
 * Alternates left-curving and right-curving crescent star shells in a seamless,
 * interlocking braided chain around the cake rim.
 * Each shell squeezed with a star tip:
 * - Starts at the centerline radius R
 * - Swells into a rounded, star-fluted bulb while arcing laterally (+side or -side)
 * - Tapers and sweeps back to the centerline R
 * - The next shell's bulbous head overlaps the preceding tail, with zero seam closure glitch.
 */
export function buildReverseShellUnitGeometries(ringRadius) {
  const circumference = ringRadius * Math.PI * 2;
  // Enforce an even count so the left/right alternation closes seamlessly around the 360-degree loop.
  // Divisor 0.96 yields ~24 shells on an 8" cake (12 left, 12 right), matching authentic Wilton #21/#32 piping.
  const rawN = Math.round(circumference / 0.96);
  const N = Math.max(12, rawN % 2 === 0 ? rawN : rawN + 1);
  const deltaTheta = (Math.PI * 2) / N;
  const overlapFactor = 1.38;
  const shellAngleSpan = deltaTheta * overlapFactor;

  const tubularSegments = 24;
  const starPoints = 8;
  const numProfilePts = 64; // 8 samples per star flute ensures sharp, non-blurred ridges
  const rMid = 0.205; // ~0.62" peak bulb width, scaling up from previous micro 0.130"
  const fluteDepth = 0.32; // Wilton open-star fluting
  const camber = 0.110; // lateral crescent arch displacement

  // Build crisp 8-point fluted star profile in local 2D space
  const baseProfile = [];
  for (let i = 0; i < numProfilePts; i++) {
    const phi = (i / numProfilePts) * Math.PI * 2;
    const cosF = Math.cos(starPoints * phi);
    const fluteShape = Math.sign(cosF) * Math.pow(Math.abs(cosF), 0.72);
    const r = rMid * (1.0 + fluteDepth * fluteShape);
    baseProfile.push({ x: Math.cos(phi) * r, y: Math.sin(phi) * r });
  }

  function getCurvePoint(k, t) {
    const clampedT = Math.max(0, Math.min(1, t));
    const side = (k % 2 === 0) ? 1 : -1;
    const thetaStart = k * deltaTheta;

    // Progression along the ring
    const theta = thetaStart + clampedT * shellAngleSpan;

    // Crescent C-curve lateral excursion:
    // Starts at 0 (r = ringRadius), arches outward/inward by camber, returns to 0 (r = ringRadius) at tail
    const rOffset = side * camber * Math.sin(Math.PI * Math.pow(clampedT, 0.85));
    const r = ringRadius + rOffset;

    // Height profile: firmly grounded head (-0.015) -> bulb peak (0.285) at t=0.22 -> grounded tail (-0.015)
    const y = -0.015 + 0.285 * Math.pow(Math.sin(Math.PI * Math.pow(clampedT, 0.65)), 0.90);

    return new THREE.Vector3(Math.sin(theta) * r, y, Math.cos(theta) * r);
  }

  const geometries = [];

  for (let k = 0; k < N; k++) {
    const side = (k % 2 === 0) ? 1 : -1;
    const positions = [];
    const indices = [];

    // Ring positions
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const center = getCurvePoint(k, t);

      // Tangent vector
      const dt = 0.002;
      const pNext = getCurvePoint(k, Math.min(1, t + dt));
      const pPrev = getCurvePoint(k, Math.max(0, t - dt));
      const tangent = new THREE.Vector3().subVectors(pNext, pPrev).normalize();

      // Normal and binormal using world-up reference
      const worldUp = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(worldUp, tangent).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      // Wilton shell taper: firm base (0.75x) -> bulbous head (1.15x) -> full body (0.90x) -> thin tail (0.18x)
      let taperScale;
      if (t < 0.22) {
        taperScale = THREE.MathUtils.lerp(0.75, 1.15, t / 0.22);
      } else if (t < 0.55) {
        taperScale = THREE.MathUtils.lerp(1.15, 0.90, (t - 0.22) / 0.33);
      } else {
        taperScale = THREE.MathUtils.lerp(0.90, 0.18, (t - 0.55) / 0.45);
      }

      // Axial roll: subtle wrist roll fanning out along the crescent curve
      const axialAngle = side * 0.32 * Math.sin(Math.PI * t);
      const cosAx = Math.cos(axialAngle);
      const sinAx = Math.sin(axialAngle);

      for (let j = 0; j < numProfilePts; j++) {
        const bp = baseProfile[j];
        const px = bp.x * cosAx - bp.y * sinAx;
        const py = bp.x * sinAx + bp.y * cosAx;

        const vx = (normal.x * px + binormal.x * py) * taperScale;
        const vy = (normal.y * px + binormal.y * py) * taperScale;
        const vz = (normal.z * px + binormal.z * py) * taperScale;

        positions.push(center.x + vx, center.y + vy, center.z + vz);
      }
    }

    // Build tube indices
    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < numProfilePts; j++) {
        const jNext = (j + 1) % numProfilePts;
        const a = i * numProfilePts + j;
        const b = i * numProfilePts + jNext;
        const c = (i + 1) * numProfilePts + j;
        const d = (i + 1) * numProfilePts + jNext;
        indices.push(a, b, c, b, d, c);
      }
    }

    // Rounded Head Dome at t = 0
    const startCenter = getCurvePoint(k, 0);
    const dt = 0.002;
    const tangent0 = new THREE.Vector3().subVectors(
      getCurvePoint(k, dt),
      getCurvePoint(k, 0)
    ).normalize();
    const headDomeCenter = startCenter.clone().addScaledVector(tangent0, -0.045);
    const startCapIdx = positions.length / 3;
    positions.push(headDomeCenter.x, headDomeCenter.y, headDomeCenter.z);
    for (let j = 0; j < numProfilePts; j++) {
      const jNext = (j + 1) % numProfilePts;
      indices.push(startCapIdx, jNext, j);
    }

    // Tapered Tail Tip at t = 1
    const endCenter = getCurvePoint(k, 1);
    const tangent1 = new THREE.Vector3().subVectors(
      getCurvePoint(k, 1),
      getCurvePoint(k, 1 - dt)
    ).normalize();
    const tailTipCenter = endCenter.clone().addScaledVector(tangent1, 0.035);
    const endCapIdx = positions.length / 3;
    positions.push(tailTipCenter.x, tailTipCenter.y, tailTipCenter.z);
    const lastRowOffset = tubularSegments * numProfilePts;
    for (let j = 0; j < numProfilePts; j++) {
      const jNext = (j + 1) % numProfilePts;
      indices.push(endCapIdx, lastRowOffset + j, lastRowOffset + jNext);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geometries.push(geo);
  }

  return geometries;
}

export function buildReverseShellRingGeometry(ringRadius) {
  return mergeGeometries(buildReverseShellUnitGeometries(ringRadius));
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
  scaleY = null,
  angleOffset = 0,
  secondaryMaterial = null,
}) {
  if (secondaryMaterial && secondaryMaterial !== material) {
    const group = new THREE.Group();
    const count1 = Math.ceil(count / 2);
    const count2 = Math.floor(count / 2);
    const mesh1 = new THREE.InstancedMesh(geometry, material, count1);
    const mesh2 = new THREE.InstancedMesh(geometry, secondaryMaterial, count2);
    mesh1.castShadow = true;
    mesh1.receiveShadow = true;
    mesh2.castShadow = true;
    mesh2.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let idx1 = 0;
    let idx2 = 0;

    for (let i = 0; i < count; i++) {
      const angle = angleOffset + (i / count) * Math.PI * 2;
      dummy.position.set(Math.sin(angle) * ringRadius, y, Math.cos(angle) * ringRadius);
      dummy.rotation.y = faceOutward ? angle + (randomYaw ? (rand() - 0.5) * randomYaw : 0) : 0;
      if (scaleY !== null) {
        dummy.scale.set(scale, scaleY, scale);
      } else {
        dummy.scale.setScalar(scale);
      }
      dummy.updateMatrix();

      if (i % 2 === 0) {
        mesh1.setMatrixAt(idx1++, dummy.matrix);
      } else {
        mesh2.setMatrixAt(idx2++, dummy.matrix);
      }
    }

    mesh1.instanceMatrix.needsUpdate = true;
    mesh2.instanceMatrix.needsUpdate = true;
    group.add(mesh1);
    group.add(mesh2);
    return group;
  }

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const angle = angleOffset + (i / count) * Math.PI * 2;
    dummy.position.set(Math.sin(angle) * ringRadius, y, Math.cos(angle) * ringRadius);
    dummy.rotation.y = faceOutward ? angle + (randomYaw ? (rand() - 0.5) * randomYaw : 0) : 0;
    if (scaleY !== null) {
      dummy.scale.set(scale, scaleY, scale);
    } else {
      dummy.scale.setScalar(scale);
    }
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

// ─── Cherry Placement Helper ──────────────────────────────────────────────

/**
 * Places one cherry per dollop around the ring, nestling each cherry naturally
 * into the dollop peak rather than perching it on the very tip.
 *
 * sinkAmount: how far (in world units) to embed the cherry base below the
 *   dollop peak — makes it look seated/nestled instead of floating.
 * maxLeanRad: maximum random tilt angle (radians) applied on X and Z
 *   independently, simulating imperfect hand-placement.
 */
function wrapWithCherries(dollopMesh, { count, radius, y, rand, cherryScale, cherryScaleY, peakYOffset, sinkAmount = 0, maxLeanRad = 0.21, step = 1 }) {
  const group = new THREE.Group();
  group.add(dollopMesh);
  for (let i = 0; i < count; i += step) {
    const angle = (i / count) * Math.PI * 2;
    const cx = Math.sin(angle) * radius;
    const cz = Math.cos(angle) * radius;
    // Seat the cherry: place its base at the dollop peak, then sink it slightly
    // into the buttercream so it looks nestled rather than balanced on the tip.
    const cy = y + peakYOffset - sinkAmount;
    const cherry = buildCherryMesh(cx, cy, cz, cherryScale, rand);
    // Apply non-uniform Y scale to simulate cherry settling into soft cream.
    if (cherryScaleY !== undefined && cherryScaleY !== cherryScale) {
      cherry.scale.set(cherryScale, cherryScaleY, cherryScale);
    }
    // Add a gentle random lean on each axis independently to simulate
    // hand-placed placement — cherries never sit perfectly upright in real life.
    cherry.rotation.x += (rand() - 0.5) * 2 * maxLeanRad;
    cherry.rotation.z += (rand() - 0.5) * 2 * maxLeanRad;
    group.add(cherry);
  }
  return group;
}

/**
 * Places one halved/sliced strawberry per dollop around the ring, nestling each fresh
 * berry slice into the dollop peak with the cut face facing outward and tilted gently
 * back into the cream fold.
 */
function wrapWithStrawberries(dollopMesh, { count, radius, y, rand, strawberryScale, peakYOffset, sinkAmount = 0, maxLeanRad = 0.12, step = 1 }) {
  const group = new THREE.Group();
  group.add(dollopMesh);
  for (let i = 0; i < count; i += step) {
    const angle = (i / count) * Math.PI * 2;
    const cx = Math.sin(angle) * radius;
    const cz = Math.cos(angle) * radius;
    const cy = y + peakYOffset - sinkAmount;
    const strawberry = buildSlicedStrawberryMesh(cx, cy, cz, strawberryScale, rand);
    strawberry.rotation.y = angle + (rand() - 0.5) * 0.15;
    strawberry.rotation.x = -0.32 + (rand() - 0.5) * 2 * maxLeanRad;
    strawberry.rotation.z += (rand() - 0.5) * 2 * maxLeanRad;
    group.add(strawberry);
  }
  return group;
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
      case 'bead': unitGeometryCache[tip] = buildBeadUnitGeometry(); break;
      case 'round': unitGeometryCache[tip] = buildRoundUnitGeometry(); break;
      case 'leaf': unitGeometryCache[tip] = buildLeafUnitGeometry(); break;
      case 'dropFlower': unitGeometryCache[tip] = buildDropFlowerUnitGeometry(); break;
      case 'starDollop': unitGeometryCache[tip] = buildStarDollopUnitGeometry(); break;
      case 'roundDollop': unitGeometryCache[tip] = buildRoundDollopUnitGeometry(); break;
      case 'kissDollop': unitGeometryCache[tip] = buildKissDollopUnitGeometry(); break;
      case 'whippedCreamRosette': unitGeometryCache[tip] = buildWhippedCreamRosetteUnitGeometry(); break;
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
export function buildPipingRing(tip, material, { radius, y, rand = Math.random, scale = 1, secondaryMaterial = null } = {}) {
  if (!tip) return null;

  const isAlt = typeof tip === 'string' && tip.includes('Alt');
  const withCherry = typeof tip === 'string' && tip.includes('Cherry');
  const withStrawberry = typeof tip === 'string' && tip.includes('Strawberry');
  const cleanTip = typeof tip === 'string' ? tip.replace('Cherry', '').replace('Strawberry', '') : tip;
  const secMat = secondaryMaterial || (isAlt ? new THREE.MeshStandardMaterial({ color: '#D6293E', roughness: 0.38, metalness: 0 }) : null);

  const UNIFORM_CHERRY_SCALE = 0.85;
  const UNIFORM_STRAWBERRY_SCALE = 0.80;
  const maybeAddCherries = (mesh, count, dollopScale, scaleY, _baseCherryScale, peakRatio, opts = {}) => {
    if (withCherry) {
      const dollopScaleY = scaleY !== null && scaleY !== undefined ? scaleY : dollopScale;
      const peakYOffset = peakRatio * dollopScaleY;
      const cherryScale = UNIFORM_CHERRY_SCALE * (scale / 3);
      const sinkAmount = cherryScale * 0.38 * 0.45;
      const cherryScaleY = cherryScale * 0.92;
      return wrapWithCherries(mesh, { count, radius, y, rand, cherryScale, cherryScaleY, peakYOffset, sinkAmount, maxLeanRad: 0.14, ...opts });
    }
    if (withStrawberry) {
      const dollopScaleY = scaleY !== null && scaleY !== undefined ? scaleY : dollopScale;
      const peakYOffset = peakRatio * dollopScaleY;
      const strawberryScale = UNIFORM_STRAWBERRY_SCALE * (scale / 3);
      const sinkAmount = strawberryScale * 0.12;
      return wrapWithStrawberries(mesh, { count, radius, y, rand, strawberryScale, peakYOffset, sinkAmount, maxLeanRad: 0.12, ...opts });
    }
    return mesh;
  };

  switch (cleanTip) {
    case 'star': {
      const count = Math.max(10, Math.round((radius * Math.PI * 2) / (0.34 * scale)));
      return instanceAroundRing(getUnitGeometry('star'), material, { ringRadius: radius, y, count, rand, scale });
    }
    case 'shell': {
      const rawCount = Math.round((radius * Math.PI * 2) / (0.22 * scale));
      const count = Math.max(12, rawCount % 2 === 0 ? rawCount : rawCount + 1);
      return instanceAroundRing(getUnitGeometry('shell'), material, { ringRadius: radius, y, count, rand, scale });
    }
    case 'shellAlt': {
      const rawCount = Math.round((radius * Math.PI * 2) / (0.22 * scale));
      const count = Math.max(12, rawCount % 2 === 0 ? rawCount : rawCount + 1);
      return instanceAroundRing(getUnitGeometry('shell'), material, { ringRadius: radius, y, count, rand, scale, secondaryMaterial: secMat });
    }
    case 'reverseShell': {
      const geo = buildReverseShellRingGeometry(radius);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.y = y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }
    case 'reverseShellAlt': {
      const geos = buildReverseShellUnitGeometries(radius);
      const geoA = mergeGeometries(geos.filter((_, i) => i % 2 === 0));
      const geoB = mergeGeometries(geos.filter((_, i) => i % 2 === 1));
      const group = new THREE.Group();
      const meshA = new THREE.Mesh(geoA, material);
      const meshB = new THREE.Mesh(geoB, secMat);
      meshA.castShadow = true;
      meshA.receiveShadow = true;
      meshB.castShadow = true;
      meshB.receiveShadow = true;
      group.add(meshA);
      group.add(meshB);
      group.position.y = y;
      return group;
    }
    case 'bead': {
      const rawCount = Math.round((radius * Math.PI * 2) / (0.15 * scale));
      const count = Math.max(16, rawCount % 2 === 0 ? rawCount : rawCount + 1);
      return instanceAroundRing(getUnitGeometry('bead'), material, { ringRadius: radius, y, count, rand, scale });
    }
    case 'beadAlt': {
      const rawCount = Math.round((radius * Math.PI * 2) / (0.15 * scale));
      const count = Math.max(16, rawCount % 2 === 0 ? rawCount : rawCount + 1);
      return instanceAroundRing(getUnitGeometry('bead'), material, { ringRadius: radius, y, count, rand, scale, secondaryMaterial: secMat });
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
      const count = Math.max(8, Math.round((radius * Math.PI * 2) / (0.5760 * scale)));
      const dScale = scale * 0.7490;
      const mesh = instanceAroundRing(getUnitGeometry('starDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale });
      return maybeAddCherries(mesh, count, dScale, null, 0.52, 0.47);
    }
    case 'starDollopAlt': {
      const count = Math.max(8, Math.round((radius * Math.PI * 2) / (0.5760 * scale)));
      const dScale = scale * 0.7490;
      const mesh = instanceAroundRing(getUnitGeometry('starDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale, secondaryMaterial: secMat });
      return maybeAddCherries(mesh, count, dScale, null, 0.52, 0.47);
    }
    case 'starDollopSparse': {
      const count = Math.max(6, Math.round((radius * Math.PI * 2) / (0.8482 * scale)));
      const dScale = scale * 0.8136;
      const dScaleY = scale * 0.912;
      const mesh = instanceAroundRing(getUnitGeometry('starDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale, scaleY: dScaleY });
      return maybeAddCherries(mesh, count, dScale, dScaleY, 0.58, 0.47);
    }
    case 'starDollopSparseAlt': {
      const count = Math.max(6, Math.round((radius * Math.PI * 2) / (0.8482 * scale)));
      const dScale = scale * 0.8136;
      const dScaleY = scale * 0.912;
      const mesh = instanceAroundRing(getUnitGeometry('starDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale, scaleY: dScaleY, secondaryMaterial: secMat });
      return maybeAddCherries(mesh, count, dScale, dScaleY, 0.58, 0.47);
    }
    case 'starDollopContinuous': {
      const rawCount = Math.round((radius * Math.PI * 2) / (0.3560 * scale));
      const count = Math.max(12, (withCherry || withStrawberry) ? (rawCount % 2 === 0 ? rawCount : rawCount + 1) : rawCount);
      const dScale = scale * 0.6457;
      const mesh = instanceAroundRing(getUnitGeometry('starDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale });
      return maybeAddCherries(mesh, count, dScale, null, 0.45, 0.47, { step: 2 });
    }
    case 'starDollopContinuousAlt': {
      const rawCount = Math.round((radius * Math.PI * 2) / (0.3560 * scale));
      const count = Math.max(12, (withCherry || withStrawberry) ? (rawCount % 2 === 0 ? rawCount : rawCount + 1) : rawCount);
      const dScale = scale * 0.6457;
      const mesh = instanceAroundRing(getUnitGeometry('starDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale, secondaryMaterial: secMat });
      return maybeAddCherries(mesh, count, dScale, null, 0.45, 0.47, { step: 2 });
    }
    case 'roundDollop': {
      const rawCount = Math.round((radius * Math.PI * 2) / (0.3645 * scale));
      const count = Math.max(12, (withCherry || withStrawberry) ? (rawCount % 2 === 0 ? rawCount : rawCount + 1) : rawCount);
      const dScale = scale * 0.5637;
      const mesh = instanceAroundRing(getUnitGeometry('roundDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale });
      return maybeAddCherries(mesh, count, dScale, null, 0.42, 0.50, { step: 2 });
    }
    case 'roundDollopAlt': {
      const rawCount = Math.round((radius * Math.PI * 2) / (0.3645 * scale));
      const count = Math.max(12, (withCherry || withStrawberry) ? (rawCount % 2 === 0 ? rawCount : rawCount + 1) : rawCount);
      const dScale = scale * 0.5637;
      const mesh = instanceAroundRing(getUnitGeometry('roundDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale, secondaryMaterial: secMat });
      return maybeAddCherries(mesh, count, dScale, null, 0.42, 0.50, { step: 2 });
    }
    case 'roundDollopMedium': {
      const count = Math.max(6, Math.round((radius * Math.PI * 2) / (0.5760 * scale)));
      const dScale = scale * 0.7505;
      const mesh = instanceAroundRing(getUnitGeometry('roundDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale });
      return maybeAddCherries(mesh, count, dScale, null, 0.50, 0.50);
    }
    case 'roundDollopMediumAlt': {
      const count = Math.max(6, Math.round((radius * Math.PI * 2) / (0.5760 * scale)));
      const dScale = scale * 0.7505;
      const mesh = instanceAroundRing(getUnitGeometry('roundDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale, secondaryMaterial: secMat });
      return maybeAddCherries(mesh, count, dScale, null, 0.50, 0.50);
    }
    case 'roundDollopSparse': {
      const count = Math.max(4, Math.round((radius * Math.PI * 2) / (0.8482 * scale)));
      const dScale = scale * 0.8152;
      const dScaleY = scale * 0.912;
      const mesh = instanceAroundRing(getUnitGeometry('roundDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale, scaleY: dScaleY });
      return maybeAddCherries(mesh, count, dScale, dScaleY, 0.56, 0.50);
    }
    case 'roundDollopSparseAlt': {
      const count = Math.max(4, Math.round((radius * Math.PI * 2) / (0.8482 * scale)));
      const dScale = scale * 0.8152;
      const dScaleY = scale * 0.912;
      const mesh = instanceAroundRing(getUnitGeometry('roundDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale, scaleY: dScaleY, secondaryMaterial: secMat });
      return maybeAddCherries(mesh, count, dScale, dScaleY, 0.56, 0.50);
    }
    case 'kissDollop': {
      const rawCount = Math.round((radius * Math.PI * 2) / (0.3644 * scale));
      const count = Math.max(12, (withCherry || withStrawberry) ? (rawCount % 2 === 0 ? rawCount : rawCount + 1) : rawCount);
      const dScale = scale * 0.4775;
      const mesh = instanceAroundRing(getUnitGeometry('kissDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale });
      return maybeAddCherries(mesh, count, dScale, null, 0.38, 0.66, { step: 2 });
    }
    case 'kissDollopAlt': {
      const rawCount = Math.round((radius * Math.PI * 2) / (0.3644 * scale));
      const count = Math.max(12, (withCherry || withStrawberry) ? (rawCount % 2 === 0 ? rawCount : rawCount + 1) : rawCount);
      const dScale = scale * 0.4775;
      const mesh = instanceAroundRing(getUnitGeometry('kissDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale, secondaryMaterial: secMat });
      return maybeAddCherries(mesh, count, dScale, null, 0.38, 0.66, { step: 2 });
    }
    case 'kissDollopMedium': {
      const count = Math.max(6, Math.round((radius * Math.PI * 2) / (0.5760 * scale)));
      const dScale = scale * 0.60;
      const mesh = instanceAroundRing(getUnitGeometry('kissDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale });
      return maybeAddCherries(mesh, count, dScale, null, 0.46, 0.66);
    }
    case 'kissDollopMediumAlt': {
      const count = Math.max(6, Math.round((radius * Math.PI * 2) / (0.5760 * scale)));
      const dScale = scale * 0.60;
      const mesh = instanceAroundRing(getUnitGeometry('kissDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale, secondaryMaterial: secMat });
      return maybeAddCherries(mesh, count, dScale, null, 0.46, 0.66);
    }
    case 'kissDollopSparse': {
      const count = Math.max(4, Math.round((radius * Math.PI * 2) / (0.8482 * scale)));
      const dScale = scale * 0.64;
      const dScaleY = scale * 0.60;
      const mesh = instanceAroundRing(getUnitGeometry('kissDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale, scaleY: dScaleY });
      return maybeAddCherries(mesh, count, dScale, dScaleY, 0.52, 0.66);
    }
    case 'kissDollopSparseAlt': {
      const count = Math.max(4, Math.round((radius * Math.PI * 2) / (0.8482 * scale)));
      const dScale = scale * 0.64;
      const dScaleY = scale * 0.60;
      const mesh = instanceAroundRing(getUnitGeometry('kissDollop'), material, { ringRadius: radius, y, count, rand, scale: dScale, scaleY: dScaleY, secondaryMaterial: secMat });
      return maybeAddCherries(mesh, count, dScale, dScaleY, 0.52, 0.66);
    }
    case 'starScallop': {
      const N = Math.max(8, Math.round((radius * Math.PI * 2) / 2.0));
      return buildScallopedPiping(material, radius, y, { N, tubeRadius: 0.20, bulgeAmount: 0.14, starSharpness: 0.75, starFloor: 0.25, starPoints: 6, cuspPower: 1.6, peakSharpness: 1.0, surfaceLift: 0.05 });
    }
    case 'starScallopSoft': {
      const N = Math.max(8, Math.round((radius * Math.PI * 2) / 2.2));
      return buildScallopedPiping(material, radius, y, { N, tubeRadius: 0.19, bulgeAmount: 0.10, starSharpness: 0.55, starFloor: 0.3, starPoints: 5, cuspPower: 1.4, peakSharpness: 1.0, surfaceLift: 0.05 });
    }
    case 'starScallopDollops': {
      const N = Math.max(8, Math.round((radius * Math.PI * 2) / 2.0));
      return buildScallopedDollopPiping(material, radius, y, { N, tubeRadius: 0.20, bulgeAmount: 0.14, starSharpness: 0.7, starFloor: 0.25, starPoints: 6, cuspPower: 1.6, peakSharpness: 1.0, withDollops: true, dollopScale: 0.46, surfaceLift: 0.05 }, rand);
    }
    case 'starScallopLayered': {
      const N = Math.max(8, Math.round((radius * Math.PI * 2) / 2.0));
      return buildScallopedDollopPiping(material, radius, y, { N, tubeRadius: 0.13, bulgeAmount: 0.12, starSharpness: 0.7, starPoints: 6, cuspPower: 1.6, peakSharpness: 1.0, withDollops: true, dollopScale: 0.42, layered: true, surfaceLift: 0.04 }, rand);
    }
    case 'zigzag': {
      const geo = buildZigzagRingGeometry(radius);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.y = y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }
    case 'wavePiping': {
      const geo = buildWavePipingRingGeometry(radius);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.y = y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }
    case 'rope': {
      const geo = buildRopeRingGeometry(radius);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.y = y;
      mesh.castShadow = true;
      return mesh;
    }
    case 'ropeTwist': {
      const geo = buildRopeTwistRingGeometry(radius);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.y = y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }
    case 'ropeTwistAlt': {
      const geos = buildRopeTwistUnitGeometries(radius);
      const geoA = mergeGeometries(geos.filter((_, i) => i % 2 === 0));
      const geoB = mergeGeometries(geos.filter((_, i) => i % 2 === 1));
      const group = new THREE.Group();
      const meshA = new THREE.Mesh(geoA, material);
      const meshB = new THREE.Mesh(geoB, secMat);
      meshA.castShadow = true;
      meshA.receiveShadow = true;
      meshB.castShadow = true;
      meshB.receiveShadow = true;
      group.add(meshA);
      group.add(meshB);
      group.position.y = y;
      return group;
    }
    case 'ropeTwistClassic': {
      const geo = buildRopeTwistClassicRingGeometry(radius);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.y = y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }
    case 'ropeTwistClassicAlt': {
      const geos = buildRopeTwistClassicUnitGeometries(radius);
      const geoA = mergeGeometries(geos.filter((_, i) => i % 2 === 0));
      const geoB = mergeGeometries(geos.filter((_, i) => i % 2 === 1));
      const group = new THREE.Group();
      const meshA = new THREE.Mesh(geoA, material);
      const meshB = new THREE.Mesh(geoB, secMat);
      meshA.castShadow = true;
      meshA.receiveShadow = true;
      meshB.castShadow = true;
      meshB.receiveShadow = true;
      group.add(meshA);
      group.add(meshB);
      group.position.y = y;
      return group;
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
    // ─── Whipped Cream Rosettes ───────────────────────────────────────────
    case 'whippedCreamRosetteContinuous': {
      // Tight ring — rosettes just kiss each other (≈20 pc on standard cake)
      // dScale=0.48*scale => each rosette outer approx stays inside cake rim.
      // Divisor 0.345*scale => ~20 pieces at ring radius ~3.34.
      const rawCount = Math.round((radius * Math.PI * 2) / (0.345 * scale));
      const count = Math.max(12, (withCherry || withStrawberry) ? (rawCount % 2 === 0 ? rawCount : rawCount + 1) : rawCount);
      const dScale = scale * 0.48;
      const mesh = instanceAroundRing(getUnitGeometry('whippedCreamRosette'), material, { ringRadius: radius, y, count, rand, scale: dScale });
      return maybeAddCherries(mesh, count, dScale, null, 0.40, 0.58, { step: 2 });
    }
    case 'whippedCreamRosette': {
      // Standard spaced ring (≈12 pc on standard cake)
      // dScale=0.56*scale => each rosette outer approx 0.779; ring radius ~3.24.
      const count = Math.max(8, Math.round((radius * Math.PI * 2) / (0.570 * scale)));
      const dScale = scale * 0.56;
      const mesh = instanceAroundRing(getUnitGeometry('whippedCreamRosette'), material, { ringRadius: radius, y, count, rand, scale: dScale });
      return maybeAddCherries(mesh, count, dScale, null, 0.46, 0.58);
    }
    case 'whippedCreamRosetteSparse': {
      // Generous gaps between each rosette (≈8 pc on standard cake)
      // dScale=0.64*scale => each rosette outer approx 0.891; ring radius ~3.12.
      const count = Math.max(6, Math.round((radius * Math.PI * 2) / (0.820 * scale)));
      const dScale = scale * 0.64;
      const mesh = instanceAroundRing(getUnitGeometry('whippedCreamRosette'), material, { ringRadius: radius, y, count, rand, scale: dScale });
      return maybeAddCherries(mesh, count, dScale, null, 0.52, 0.58);
    }
    default:
      return null;
  }
}
