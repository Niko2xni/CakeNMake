import * as THREE from 'three';
import { getFrostingMaterial, applyVerticalGradientUV } from '../frostingMaterial';
import { getBoxyRadius } from '../cakeMath';

// ─── Bezier path definitions (tile space: u ∈ [0,1], v ∈ [-1,1]) ─────────────
// Each sub-array is one cubic Bezier segment: [p0, cp1, cp2, p3].

// Option B — Continuous Wave Rope
const WAVE_ROPE_BEZIERS = [
  [[0.00,  0.00], [0.125,  0.45], [0.375,  0.45], [0.50,  0.00]],
  [[0.50,  0.00], [0.625, -0.45], [0.875, -0.45], [1.00,  0.00]],
];

// Option A — Paired Opposing Scrolls
const PAIRED_LEFT_C_SCROLL_BEZIERS = [
  [[0.32, -0.40], [0.32, -0.60], [0.08, -0.60], [0.08, -0.38]],
  [[0.08, -0.38], [0.08, -0.06], [0.08,  0.28], [0.18,  0.52]],
  [[0.18,  0.52], [0.28,  0.72], [0.42,  0.60], [0.38,  0.38]],
];
const PAIRED_RIGHT_C_SCROLL_BEZIERS = [
  [[0.68, -0.40], [0.68, -0.60], [0.92, -0.60], [0.92, -0.38]],
  [[0.92, -0.38], [0.92, -0.06], [0.92,  0.28], [0.82,  0.52]],
  [[0.82,  0.52], [0.72,  0.72], [0.58,  0.60], [0.62,  0.38]],
];

// Option D — Vine and Tendrils
const VINE_SPINE_BEZIERS = [
  [[0.00, -0.35], [0.30, -0.45], [0.70,  0.45], [1.00,  0.35]],
];
const VINE_TENDRIL_LEFT = [
  [[0.32, -0.15], [0.22,  0.05], [0.38,  0.20], [0.32,  0.08]],
];
const VINE_TENDRIL_RIGHT = [
  [[0.68,  0.15], [0.78, -0.05], [0.62, -0.20], [0.68, -0.08]],
];

// Option E — Interlocking Loop Chain
const LOOP_CHAIN_BEZIERS = [
  [[0.15,  0.00], [0.15,  0.55], [0.85,  0.55], [0.85,  0.00]],
  [[0.85,  0.00], [0.85, -0.55], [0.15, -0.55], [0.15,  0.00]],
];

// Teardrops: [startU, startV, ctrlU, ctrlV, endU, endV] (start = wide end, end = tip)
const FLEUR_DE_LIS_TEARDROPS = [
  [0.50,  0.40, 0.50, 0.00, 0.50, -0.40], // center upright
  [0.25,  0.25, 0.35, 0.05, 0.50, -0.20], // left flare
  [0.75,  0.25, 0.65, 0.05, 0.50, -0.20], // right flare
];

// Option C — Shell Border Row (Fan of teardrops converging down to a base point)
const SHELL_BORDER_TEARDROPS = [
  [0.50,  0.45, 0.50,  0.05, 0.50, -0.35], // center shell rib
  [0.38,  0.36, 0.42, -0.02, 0.50, -0.35], // inner left
  [0.62,  0.36, 0.58, -0.02, 0.50, -0.35], // inner right
  [0.26,  0.20, 0.34, -0.08, 0.50, -0.35], // outer left
  [0.74,  0.20, 0.66, -0.08, 0.50, -0.35], // outer right
];

// ─── Layer priority offsets (radial standoff per depth layer, R5) ─────────────
const LAYER_MAIN   = 0.000;
const LAYER_BRANCH = 0.003;
const LAYER_DROP   = 0.006;
const LAYER_DOT    = 0.009;

// ─── Physical size calibration (R3) ──────────────────────────────────────────
// Bumped ~40% from the original 0.039 / 0.098 for a bolder piped line. The
// coverage window (getPipingScrollsCoverageFn) reads these same values via
// SCROLL_TUBE / TEARDROP_TUBE, so the empty space scales with the piping.
const MIN_R = 0.055;
const MAX_R = 0.138;
export const DOT_R = 0.110;  // hemisphere dot radius

// Tube profile parameters — MUST match the VariableRadiusTubeGeometry calls
// in buildPipingScrolls (addScroll / addTeardrop). getPipingScrollsCoverageFn
// reads these to size the empty space to the real piping width.
const SCROLL_TUBE = {
  minR: MIN_R, maxR: MAX_R,
  taperPower: 0.7, taperZone: 0.10,
  curvatureSensitivity: 0.8, kRef: 0.05,
};
const TEARDROP_TUBE = {
  minR: MIN_R * 0.4, maxR: MAX_R * 0.85,
  taperPower: 2.5, taperZone: 0.22,
  curvatureSensitivity: 0.15, kRef: 0.05,
};

function taperEnvelope(t, power = 0.7, fadeZone = 0.10) {
  const fadeIn  = t < fadeZone     ? (1 - Math.cos(Math.PI * t            / fadeZone)) * 0.5 : 1;
  const fadeOut = t > 1 - fadeZone ? (1 - Math.cos(Math.PI * (1 - t)     / fadeZone)) * 0.5 : 1;
  return Math.max(0.001, Math.pow(Math.min(fadeIn, fadeOut), power));
}

class MappedCurvePathCylinder extends THREE.Curve {
  constructor(cylinderRadius, baseY, arcWidth, beziers, heightScale) {
    super();
    this.cR        = cylinderRadius;
    this.baseY     = baseY;
    this.arcWidth  = arcWidth;
    this.path      = new THREE.CurvePath();
    for (const b of beziers) {
      this.path.add(new THREE.CubicBezierCurve3(
        new THREE.Vector3(b[0][0], b[0][1] * heightScale, 0),
        new THREE.Vector3(b[1][0], b[1][1] * heightScale, 0),
        new THREE.Vector3(b[2][0], b[2][1] * heightScale, 0),
        new THREE.Vector3(b[3][0], b[3][1] * heightScale, 0),
      ));
    }
  }
  getPoint(t, target = new THREE.Vector3()) {
    const pt    = this.path.getPoint(t);
    const theta = pt.x * this.arcWidth;
    return target.set(
      this.cR * Math.sin(theta),
      this.baseY + pt.y,
      this.cR * Math.cos(theta),
    );
  }
}

class TeardropCurve extends THREE.Curve {
  constructor(cylinderRadius, baseY, arcWidth, start2D, ctrl2D, end2D, heightScale) {
    super();
    this.cR       = cylinderRadius;
    this.baseY    = baseY;
    this.arcWidth = arcWidth;
    this.p0 = new THREE.Vector3(start2D[0], start2D[1] * heightScale, 0);
    this.p1 = new THREE.Vector3( ctrl2D[0],  ctrl2D[1] * heightScale, 0);
    this.p2 = new THREE.Vector3(  end2D[0],   end2D[1] * heightScale, 0);
  }
  getPoint(t, target = new THREE.Vector3()) {
    const s  = 1 - t;
    const pt = new THREE.Vector3()
      .addScaledVector(this.p0, s * s)
      .addScaledVector(this.p1, 2 * s * t)
      .addScaledVector(this.p2, t * t);
    const theta = pt.x * this.arcWidth;
    return target.set(
      this.cR * Math.sin(theta),
      this.baseY + pt.y,
      this.cR * Math.cos(theta),
    );
  }
}

class VariableRadiusTubeGeometry extends THREE.BufferGeometry {
  constructor(curve, {
    segments              = 80,
    profileSegments       = 12,
    minR                  = MIN_R,
    maxR                  = MAX_R,
    taperPower            = 0.7,
    taperZone             = 0.10,
    curvatureSensitivity  = 0.8,
    kRef                  = 0.05,
  } = {}) {
    super();

    const positions = [];
    const indices   = [];
    const P         = profileSegments;
    const eps       = 1 / (segments * 8);

    // ── Pass 1: sample centers/tangents/radii along the curve ──────────────
    // (Tangent/curvature are sampled from the curve's own centerline, before
    // the surface-hugging push below, so the finite-difference curvature
    // estimate stays numerically stable — the push only ever moves a point
    // by its own local `radius`, i.e. a couple hundredths of a unit, which
    // would otherwise feed back into kappa noisily.)
    const centers  = [];
    const tangents = [];
    const radii    = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const center = curve.getPoint(t);
      const tA  = Math.max(0, t - eps);
      const tB  = Math.min(1, t + eps);
      const pA  = curve.getPoint(tA);
      const pB  = curve.getPoint(tB);
      const tangent = new THREE.Vector3().subVectors(pB, pA).normalize();

      const tAA = Math.max(0, t - 2 * eps);
      const tBB = Math.min(1, t + 2 * eps);
      const tgA = new THREE.Vector3().subVectors(center, curve.getPoint(tAA)).normalize();
      const tgB = new THREE.Vector3().subVectors(curve.getPoint(tBB), center).normalize();
      const kappa    = tgA.distanceTo(tgB) / (2 * eps);
      const kNorm    = Math.min(1, kappa / kRef);

      const taper  = taperEnvelope(t, taperPower, taperZone);
      const radius = taper * THREE.MathUtils.lerp(maxR, minR, kNorm * curvatureSensitivity);

      // Hug the cake surface. `curve` places its centerline exactly ON the
      // cylinder radius (MappedCurvePathCylinder/TeardropCurve's `cR` — the
      // LAYER_* constants passed in as layerOffset only separate overlapping
      // scroll elements from each other, they're not a surface standoff).
      // Left uncorrected, every tube would sit half-buried in the cake, and
      // because `radius` tapers down at tight curves (a scroll's peaks),
      // the visible outer half shrinks fastest exactly where the peaks are
      // — which is also where the dots sit. The dots (buildFlushHemisphereDot)
      // are already built flush (their equator rests exactly at the surface,
      // zero embed), so that mismatch is what reads as the piping dipping
      // into the cake right at each dot. Pushing the centerline outward by
      // its own local radius keeps the tube's inner wall flush with the
      // surface everywhere, taper and all, so it always reads as sitting on
      // top of the cake instead of intersecting it.
      let normalDir;
      if (curve.getNormal) {
        normalDir = curve.getNormal(t);
      } else {
        const radialX = center.x, radialZ = center.z;
        const radialLen = Math.sqrt(radialX * radialX + radialZ * radialZ);
        normalDir = radialLen > 1e-6
          ? new THREE.Vector3(radialX / radialLen, 0, radialZ / radialLen)
          : new THREE.Vector3(1, 0, 0);
      }
      center.addScaledVector(normalDir, radius);
      centers.push(center);
      tangents.push(tangent);
      radii.push(radius);
    }

    // ── Pass 2: build an exact surface-aligned cross-section frame ───────────
    const normals   = new Array(centers.length);
    const binormals = new Array(centers.length);

    for (let i = 0; i < centers.length; i++) {
      const t = i / segments;
      let normalDir;
      if (curve.getNormal) {
        normalDir = curve.getNormal(t);
      } else {
        const c = centers[i];
        const radialLen = Math.sqrt(c.x * c.x + c.z * c.z);
        normalDir = radialLen > 1e-6
          ? new THREE.Vector3(c.x / radialLen, 0, c.z / radialLen)
          : new THREE.Vector3(1, 0, 0);
      }

      normals[i]   = normalDir;
      binormals[i] = new THREE.Vector3().crossVectors(tangents[i], normalDir).normalize();
    }

    // ── Pass 3: emit the ring vertices ──────────────────────────────────────
    // No post-hoc clamp needed — flush contact is guaranteed by the frame
    // itself (see pass 2), not patched in after the fact.
    for (let i = 0; i < centers.length; i++) {
      const center   = centers[i];
      const normal   = normals[i];
      const binormal = binormals[i];
      const radius   = radii[i];

      for (let j = 0; j < P; j++) {
        const a  = (j / P) * Math.PI * 2;
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius;
        positions.push(
          center.x + normal.x * px + binormal.x * py,
          center.y + normal.y * px + binormal.y * py,
          center.z + normal.z * px + binormal.z * py,
        );
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < P; j++) {
        const jN = (j + 1) % P;
        const a  = i       * P + j;
        const b  = i       * P + jN;
        const c  = (i + 1) * P + j;
        const d  = (i + 1) * P + jN;
        indices.push(a, b, c, b, d, c);
      }
    }

    this.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.setIndex(indices);
    this.computeVertexNormals();
  }
}

export function buildFlushHemisphereDot(theta, y, cylinderRadius, dotRadius = DOT_R) {
  const geo = new THREE.SphereGeometry(dotRadius, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const outward = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    outward,
  );
  geo.applyQuaternion(q);
  geo.translate(
    cylinderRadius * Math.sin(theta),
    y,
    cylinderRadius * Math.cos(theta),
  );
  return geo;
}

/**
 * Builds a pearl dot for Piping Scrolls. When at the Drip, the pearl is lifted
 * to 75/25 vision (75% visible, 25% buried in the Drip) using a full spherical geometry,
 * matching how Pearls are positioned on the Frosted / Textured finish.
 */
export function buildPearlDot(theta, y, surfaceRadius, dotRadius = DOT_R, opts = {}) {
  const isDrip = Boolean(typeof opts === 'boolean' ? opts : (opts.atDrip || opts.hasDrip));
  if (isDrip) {
    // 75/25 vision on Drip: 75% visible, 25% buried in the Drip.
    // Center is lifted to surfaceRadius + 0.5 * dotRadius so that:
    // Outer tip = surfaceRadius + 1.5 * dotRadius (protruding 1.5 * R / (2 * R) = 75%)
    // Inner tip = surfaceRadius - 0.5 * dotRadius (buried 0.5 * R / (2 * R) = 25%)
    const geo = new THREE.SphereGeometry(dotRadius, 16, 16);
    const centerRadius = surfaceRadius + dotRadius * 0.5;
    geo.translate(
      centerRadius * Math.sin(theta),
      y,
      centerRadius * Math.cos(theta),
    );
    return geo;
  }
  return buildFlushHemisphereDot(theta, y, surfaceRadius, dotRadius);
}

function localMerge(geos) {
  const pos  = [];
  const norm = [];
  const idx  = [];
  let   off  = 0;
  for (const g of geos) {
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const pa = g.getAttribute('position');
    const na = g.getAttribute('normal');
    for (let i = 0; i < pa.count; i++) {
      pos.push(pa.getX(i), pa.getY(i), pa.getZ(i));
      norm.push(na.getX(i), na.getY(i), na.getZ(i));
    }
    const ix = g.getIndex();
    if (ix) {
      for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off);
    } else {
      for (let i = 0; i < pa.count; i++) idx.push(i + off);
    }
    off += pa.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos,  3));
  merged.setAttribute('normal',   new THREE.Float32BufferAttribute(norm, 3));
  merged.setIndex(idx);
  return merged;
}

/**
 * Answers "how much is this point on the tier's side wall covered by an
 * active Piping Scrolls element (a scroll curve, a teardrop, or a dot)?"
 * as a 0..1 weight, for Filling's own Piping Design to shave against —
 * same purpose/smoothstep-edge reasoning as the coverage functions in
 * DecorationSets.jsx (a hard 0/1 cutoff creases the continuous filling
 * mesh — see getCheckerCoverageFn's own comment there for the full
 * explanation).
 *
 * Piping Scrolls has no cell grid or point list to look up the way
 * Checkered/Chevron/Scatter Pearls do — its shapes are cubic-Bezier
 * scroll curves and quadratic-Bezier teardrops (see the *_BEZIERS/
 * *_TEARDROPS constants above), repeated once per tile around the
 * circumference. This samples each active variant's own real curve
 * definitions (the exact same arrays buildPipingScrolls itself reads)
 * into a short polyline of (u, v) tile-space points, converts each
 * sampled point to real arc-length/Y units the same way
 * MappedCurvePathCylinder/TeardropCurve do, and finds the closest one to
 * the query point — an approximation of true point-to-curve distance,
 * accurate enough at 16-24 samples per curve given how gentle these
 * particular curves are (no sharp corners) and cheap enough to run per
 * Filling vertex.
 * Every element's own real radius (MIN_R..MAX_R taper for scrolls, the
 * teardrops' own smaller taper, DOT_R for dots) is used as a flat radius
 * rather than reproducing the taper exactly.
 */
export function getPipingScrollsCoverageFn(radius, height, opts = {}) {
  const isBoxy = opts.shape === 'rectangle' || opts.shape === 'square' || opts.cakeShape === 'rectangle' || opts.cakeShape === 'square';
  if (isBoxy) {
    return getBoxyPipingScrollsCoverageFn(radius, height, opts);
  }

  const variant = opts.variant || 'waveRope';
  const forGlaze = !!opts.forGlaze;
  // For Glaze / Drip empty spaces: ensure carve depth isn't so deep that the Drip from that
  // emptied area is gone — preserve a visible Drip layer (default max carve depth 0.50).
  const maxDepth = forGlaze ? (opts.maxCarveDepth ?? 0.50) : (opts.maxCarveDepth ?? 1.0);

  const targetHeightScale = height / 1.6;
  const idealTileCount = (3.826 * radius) / targetHeightScale;
  const tileCount = Math.max(3, Math.ceil(idealTileCount));
  const heightScale = (3.826 * radius) / tileCount;
  const arcWidth = (Math.PI * 2) / tileCount;

  // Each element: { points: [{ arc, y, r }, ...] } in the tile's own
  // arc-length / Y units. `r` is the tube's REAL local radius at that
  // point — the exact taper + curvature formula VariableRadiusTubeGeometry
  // uses — instead of the flat MAX_R/teardrop approximation this used to
  // use. Scrolls pinch to ~0 at each end of their path and shrink at
  // tight curves; teardrops taper hard toward their tip. A flat MAX_R
  // window kept the empty space at full width through all of that, which
  // is why the carved gap "kept going" past where any piping was visible.
  const elements = [];

  const addTubeElement = (curve, tube, steps) => {
    const eps = 1 / (tube.segments * 8);
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const center = curve.getPoint(t);
      const tgA = new THREE.Vector3().subVectors(center, curve.getPoint(Math.max(0, t - 2 * eps))).normalize();
      const tgB = new THREE.Vector3().subVectors(curve.getPoint(Math.min(1, t + 2 * eps)), center).normalize();
      const kappa = tgA.distanceTo(tgB) / (2 * eps);
      const kNorm = Math.min(1, kappa / tube.kRef);
      const r = taperEnvelope(t, tube.taperPower, tube.taperZone)
        * THREE.MathUtils.lerp(tube.maxR, tube.minR, kNorm * tube.curvatureSensitivity);
      pts.push({ arc: radius * Math.atan2(center.x, center.z), y: center.y, r });
    }
    elements.push({ points: pts });
  };
  // A scroll's beziers form ONE tube in the mesh (taper runs over the whole
  // path, not per segment), so they are sampled together as one curve.
  const addWholeScrollElement = (beziers, segments = 90) => {
    addTubeElement(
      new MappedCurvePathCylinder(radius, 0, arcWidth, beziers, heightScale),
      { ...SCROLL_TUBE, segments },
      96,
    );
  };
  const addTeardropElement = (td) => {
    addTubeElement(
      new TeardropCurve(radius, 0, arcWidth, [td[0], td[1]], [td[2], td[3]], [td[4], td[5]], heightScale),
      { ...TEARDROP_TUBE, segments: 24 },
      28,
    );
  };
  const addDotElement = (u, v) => {
    elements.push({ points: [{ arc: radius * u * arcWidth, y: v * heightScale, r: DOT_R }] });
  };

  // Each tube is built from the same geometry the mesh uses (see
  // buildPipingScrolls), so the window follows the real piping.
  if (variant === 'pairedScrolls') {
    addWholeScrollElement(PAIRED_LEFT_C_SCROLL_BEZIERS);
    addWholeScrollElement(PAIRED_RIGHT_C_SCROLL_BEZIERS);
    addDotElement(0.32, -0.40);
    addDotElement(0.38, 0.38);
    addDotElement(0.68, -0.40);
    addDotElement(0.62, 0.38);
  } else if (variant === 'fleurDeLisRow') {
    for (const td of FLEUR_DE_LIS_TEARDROPS) addTeardropElement(td);
    addDotElement(0.50, -0.42);
  } else if (variant === 'shellBorderRow') {
    for (const td of SHELL_BORDER_TEARDROPS) addTeardropElement(td);
    addDotElement(0.50, -0.38);
  } else if (variant === 'vineAndTendrils') {
    addWholeScrollElement(VINE_SPINE_BEZIERS, 90);
    addWholeScrollElement(VINE_TENDRIL_LEFT, 50);
    addWholeScrollElement(VINE_TENDRIL_RIGHT, 50);
    addDotElement(0.32, 0.08);
    addDotElement(0.68, -0.08);
  } else if (variant === 'loopChain') {
    addWholeScrollElement(LOOP_CHAIN_BEZIERS, 100);
    addDotElement(0.50, 0.00);
  } else {
    // Default: 'waveRope'
    addWholeScrollElement(WAVE_ROPE_BEZIERS, 90);
    addDotElement(0.25, 0.45);
    addDotElement(0.75, -0.45);
  }

  const smoothstep = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };

  // Window = the tube's real radius + a small margin. Glaze only: the
  // middle of the window (under the tube itself, where the piping hides
  // whatever is carved) is cut deeper than the edge, so the remaining glaze
  // under/around a thin part of the tube can't sit higher than the piping
  // and bury it. The edge keeps the shallower maxDepth so the drip is
  // still visible right around the piping.
  const margin = 0.02;
  const coreDepth = forGlaze ? (opts.coreCarveDepth ?? maxDepth) : maxDepth;

  return (angle, localY) => {
    const wrappedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const tileIndex = Math.floor(wrappedAngle / arcWidth);

    let depth = 0;
    // Also check the tile immediately before/after — a shape sitting near
    // u≈0 or u≈1 in one tile can be nearer to the ADJACENT tile's own
    // copy of that same shape (tiles repeat seamlessly around the whole
    // circumference) than to its own tile's copy.
    for (const dTile of [0, -1, 1]) {
      const tileStartAngle = (tileIndex + dTile) * arcWidth;
      const localArc = radius * (wrappedAngle - tileStartAngle);
      for (const el of elements) {
        for (const p of el.points) {
          const reach = p.r + margin;
          const dArc = localArc - p.arc;
          if (dArc > reach || dArc < -reach) continue;
          const dY = localY - p.y;
          if (dY > reach || dY < -reach) continue;
          const dist = Math.sqrt(dArc * dArc + dY * dY);
          const distInsideEdge = reach - dist;
          if (distInsideEdge <= 0) continue;
          const smoothWidth = Math.max(0.015, reach * 0.3);
          const edgeWeight = smoothstep(distInsideEdge / smoothWidth);
          let d = edgeWeight * maxDepth;
          if (coreDepth > maxDepth) {
            const coreR = p.r * 0.7;
            const coreWeight = smoothstep((coreR - dist) / Math.max(0.015, coreR * 0.5));
            d = edgeWeight * (maxDepth + (coreDepth - maxDepth) * coreWeight);
          }
          if (d > depth) depth = d;
          if (depth >= coreDepth) return coreDepth;
        }
      }
    }
    return depth;
  };
}

export function createBoxyPerimeter(W, D, rc = 0.35) {
  const safeRc = Math.min(rc, Math.min(W, D) * 0.45);
  const xc = Math.max(0.1, W - safeRc);
  const zc = Math.max(0.1, D - safeRc);

  // Each face is a distinct panel:
  // Face 0 (Front, +Z): X goes from -xc to +xc, Z = D, normal = (0, 0, 1)
  // Face 1 (Right, +X): Z goes from +zc to -zc, X = W, normal = (1, 0, 0)
  // Face 2 (Back, -Z):  X goes from +xc to -xc, Z = -D, normal = (0, 0, -1)
  // Face 3 (Left, -X):  Z goes from -zc to +zc, X = -W, normal = (-1, 0, 0)
  const faceLengths = [
    2 * xc,
    2 * zc,
    2 * xc,
    2 * zc,
  ];

  function getFacePoint(faceIdx, u) {
    const safeU = Math.max(0, Math.min(1, u));
    if (faceIdx === 0) {
      return {
        x: -xc + safeU * (2 * xc),
        z: D,
        nx: 0,
        nz: 1,
      };
    } else if (faceIdx === 1) {
      return {
        x: W,
        z: zc - safeU * (2 * zc),
        nx: 1,
        nz: 0,
      };
    } else if (faceIdx === 2) {
      return {
        x: xc - safeU * (2 * xc),
        z: -D,
        nx: 0,
        nz: -1,
      };
    } else {
      return {
        x: -W,
        z: -zc + safeU * (2 * zc),
        nx: -1,
        nz: 0,
      };
    }
  }

  return {
    faceLengths,
    getFacePoint,
    W, D, safeRc, xc, zc,
  };
}

export function buildBoxyDot(x, y, z, normal, dotRadius = DOT_R, opts = {}) {
  const isDrip = Boolean(typeof opts === 'boolean' ? opts : (opts.atDrip || opts.hasDrip));
  const norm = (normal instanceof THREE.Vector3 ? normal.clone() : new THREE.Vector3(normal.nx ?? normal.x, 0, normal.nz ?? normal.z)).normalize();
  if (isDrip) {
    const geo = new THREE.SphereGeometry(dotRadius, 16, 16);
    // Lift so 75% is visible and 25% is embedded in the drip
    const center = new THREE.Vector3(x, y, z).addScaledVector(norm, dotRadius * 0.5);
    geo.translate(center.x, center.y, center.z);
    return geo;
  }
  const geo = new THREE.SphereGeometry(dotRadius, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
  geo.applyQuaternion(q);
  geo.translate(x, y, z);
  return geo;
}

class MappedCurvePathBoxy extends THREE.Curve {
  constructor(perim, faceIdx, uStart, uSpan, baseY, beziers, heightScale, layerOffset = 0) {
    super();
    this.perim = perim;
    this.faceIdx = faceIdx;
    this.uStart = uStart;
    this.uSpan = uSpan;
    this.baseY = baseY;
    this.layerOffset = layerOffset;
    this.path = new THREE.CurvePath();
    for (const b of beziers) {
      this.path.add(new THREE.CubicBezierCurve3(
        new THREE.Vector3(b[0][0], b[0][1] * heightScale, 0),
        new THREE.Vector3(b[1][0], b[1][1] * heightScale, 0),
        new THREE.Vector3(b[2][0], b[2][1] * heightScale, 0),
        new THREE.Vector3(b[3][0], b[3][1] * heightScale, 0),
      ));
    }
  }

  getPoint(t, target = new THREE.Vector3()) {
    const pt2d = this.path.getPoint(t);
    const uFace = this.uStart + pt2d.x * this.uSpan;
    const pt = this.perim.getFacePoint(this.faceIdx, uFace);
    return target.set(
      pt.x + pt.nx * this.layerOffset,
      this.baseY + pt2d.y,
      pt.z + pt.nz * this.layerOffset,
    );
  }

  getNormal(t, target = new THREE.Vector3()) {
    const pt2d = this.path.getPoint(t);
    const uFace = this.uStart + pt2d.x * this.uSpan;
    const pt = this.perim.getFacePoint(this.faceIdx, uFace);
    return target.set(pt.nx, 0, pt.nz).normalize();
  }
}

class TeardropCurveBoxy extends THREE.Curve {
  constructor(perim, faceIdx, uStart, uSpan, baseY, start2D, ctrl2D, end2D, heightScale, layerOffset = 0) {
    super();
    this.perim = perim;
    this.faceIdx = faceIdx;
    this.uStart = uStart;
    this.uSpan = uSpan;
    this.baseY = baseY;
    this.layerOffset = layerOffset;
    this.p0 = new THREE.Vector3(start2D[0], start2D[1] * heightScale, 0);
    this.p1 = new THREE.Vector3( ctrl2D[0],  ctrl2D[1] * heightScale, 0);
    this.p2 = new THREE.Vector3(  end2D[0],   end2D[1] * heightScale, 0);
  }

  getPoint(t, target = new THREE.Vector3()) {
    const s = 1 - t;
    const pt2d = new THREE.Vector3()
      .addScaledVector(this.p0, s * s)
      .addScaledVector(this.p1, 2 * s * t)
      .addScaledVector(this.p2, t * t);
    const uFace = this.uStart + pt2d.x * this.uSpan;
    const pt = this.perim.getFacePoint(this.faceIdx, uFace);
    return target.set(
      pt.x + pt.nx * this.layerOffset,
      this.baseY + pt2d.y,
      pt.z + pt.nz * this.layerOffset,
    );
  }

  getNormal(t, target = new THREE.Vector3()) {
    const s = 1 - t;
    const pt2d = new THREE.Vector3()
      .addScaledVector(this.p0, s * s)
      .addScaledVector(this.p1, 2 * s * t)
      .addScaledVector(this.p2, t * t);
    const uFace = this.uStart + pt2d.x * this.uSpan;
    const pt = this.perim.getFacePoint(this.faceIdx, uFace);
    return target.set(pt.nx, 0, pt.nz).normalize();
  }
}

export function getBoxyPipingScrollsCoverageFn(radius, height, opts = {}) {
  const variant = opts.variant || 'waveRope';
  const forGlaze = !!opts.forGlaze;
  const maxDepth = forGlaze ? (opts.maxCarveDepth ?? 0.50) : (opts.maxCarveDepth ?? 1.0);

  const isSquare = opts.shape === 'square' || opts.cakeShape === 'square';
  const W = opts.customW !== undefined && opts.customW !== null ? opts.customW : (isSquare ? radius : radius * 1.25);
  const D = opts.customD !== undefined && opts.customD !== null ? opts.customD : (isSquare ? radius : radius * 0.85);
  const rc = opts.rc ?? 0.35;
  const perim = createBoxyPerimeter(W, D, rc);

  const targetHeightScale = height / 1.6;
  const heightScale = targetHeightScale;
  const baseY = 0;

  const targetTileWidth = Math.max(1.8, Math.min(2.8, targetHeightScale * 1.4));
  const frontTileCount = Math.max(1, Math.round(perim.faceLengths[0] / targetTileWidth));
  const sideTileCount = isSquare
    ? frontTileCount
    : Math.max(1, Math.round(perim.faceLengths[1] / targetTileWidth));
  const secTileCounts = [frontTileCount, sideTileCount, frontTileCount, sideTileCount];

  // Pre-sample 3D points per face
  const faceElements = [[], [], [], []];

  for (let faceIdx = 0; faceIdx < 4; faceIdx++) {
    const tileCount = secTileCounts[faceIdx];
    const tileSpan = 1 / tileCount;

    for (let tIdx = 0; tIdx < tileCount; tIdx++) {
      const uStart = tIdx * tileSpan;

      const addTubeElement = (beziers, tube, steps = 24) => {
        const curve = new MappedCurvePathBoxy(
          perim, faceIdx, uStart, tileSpan, baseY, beziers, heightScale, 0
        );
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const p = curve.getPoint(t);
          const r = taperEnvelope(t, tube.taperPower, tube.taperZone) * tube.maxR;
          faceElements[faceIdx].push({ x: p.x, y: p.y, z: p.z, r });
        }
      };

      const addTeardropElement = (td, steps = 16) => {
        const curve = new TeardropCurveBoxy(
          perim, faceIdx, uStart, tileSpan, baseY,
          [td[0], td[1]], [td[2], td[3]], [td[4], td[5]], heightScale, 0
        );
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const p = curve.getPoint(t);
          const r = taperEnvelope(t, TEARDROP_TUBE.taperPower, TEARDROP_TUBE.taperZone) * TEARDROP_TUBE.maxR;
          faceElements[faceIdx].push({ x: p.x, y: p.y, z: p.z, r });
        }
      };

      const addDotElement = (u, v) => {
        const uFace = uStart + u * tileSpan;
        const pt = perim.getFacePoint(faceIdx, uFace);
        faceElements[faceIdx].push({
          x: pt.x,
          y: baseY + v * heightScale,
          z: pt.z,
          r: DOT_R,
        });
      };

      if (variant === 'pairedScrolls') {
        addTubeElement(PAIRED_LEFT_C_SCROLL_BEZIERS, SCROLL_TUBE, 24);
        addTubeElement(PAIRED_RIGHT_C_SCROLL_BEZIERS, SCROLL_TUBE, 24);
        addDotElement(0.32, -0.40);
        addDotElement(0.38, 0.38);
        addDotElement(0.68, -0.40);
        addDotElement(0.62, 0.38);
      } else if (variant === 'fleurDeLisRow') {
        for (const td of FLEUR_DE_LIS_TEARDROPS) addTeardropElement(td, 16);
        addDotElement(0.50, -0.42);
      } else if (variant === 'shellBorderRow') {
        for (const td of SHELL_BORDER_TEARDROPS) addTeardropElement(td, 16);
        addDotElement(0.50, -0.38);
      } else if (variant === 'vineAndTendrils') {
        addTubeElement(VINE_SPINE_BEZIERS, SCROLL_TUBE, 24);
        addTubeElement(VINE_TENDRIL_LEFT, SCROLL_TUBE, 16);
        addTubeElement(VINE_TENDRIL_RIGHT, SCROLL_TUBE, 16);
        addDotElement(0.32, 0.08);
        addDotElement(0.68, -0.08);
      } else if (variant === 'loopChain') {
        addTubeElement(LOOP_CHAIN_BEZIERS, SCROLL_TUBE, 24);
        addDotElement(0.50, 0.00);
      } else {
        // Default: 'waveRope'
        addTubeElement(WAVE_ROPE_BEZIERS, SCROLL_TUBE, 28);
        addDotElement(0.25, 0.45);
        addDotElement(0.75, -0.45);
      }
    }
  }

  const margin = 0.035;
  const smoothstep = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };

  return (glazeArg, localY) => {
    // Project cylindrical glaze query angle into boxy coordinates
    const thetaMesh = Math.atan2(Math.cos(glazeArg), Math.sin(glazeArg));
    const boxR = getBoxyRadius(thetaMesh, W, D, rc);
    const qx = boxR * Math.sin(glazeArg);
    const qz = boxR * Math.cos(glazeArg);
    const qy = localY;

    let depth = 0;
    for (let f = 0; f < 4; f++) {
      if (f === 0 && qz < -0.2) continue;
      if (f === 1 && qx < -0.2) continue;
      if (f === 2 && qz > 0.2) continue;
      if (f === 3 && qx > 0.2) continue;

      const pts = faceElements[f];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const reach = p.r + margin;
        const dy = qy - p.y;
        if (dy > reach || dy < -reach) continue;
        const dx = qx - p.x;
        if (dx > reach || dx < -reach) continue;
        const dz = qz - p.z;
        if (dz > reach || dz < -reach) continue;

        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const distInside = reach - dist;
        if (distInside <= 0) continue;

        const smoothWidth = Math.max(0.02, reach * 0.4);
        const edgeWeight = smoothstep(distInside / smoothWidth);
        const d = edgeWeight * maxDepth;
        if (d > depth) depth = d;
        if (depth >= maxDepth) return maxDepth;
      }
    }
    return depth;
  };
}

export function buildBoxyPipingScrolls(radius, height, colorHex, colorId, variant = 'waveRope', opts = {}) {
  const options = typeof opts === 'boolean' ? { hasDrip: opts } : (opts || {});
  const hasDrip = Boolean(options.hasDrip || options.atDrip);
  const coatThickness = options.coatThickness ?? options.dripThickness ?? 0.06;
  const maxGlazeCarveDepth = options.maxCarveDepth ?? 0.50;
  // In the carved drip empty space, the remaining drip surface sits at
  // coatThickness * (1 - maxGlazeCarveDepth). The piping scroll sits slightly
  // proud of that surface (+0.015) so it is fully visible without clipping.
  const surfaceOffset = hasDrip ? (coatThickness * (1 - maxGlazeCarveDepth) + 0.015) : 0;

  const isSquare = options.shape === 'square' || options.cakeShape === 'square';
  const W = options.customW !== undefined && options.customW !== null ? options.customW : (isSquare ? radius : radius * 1.25);
  const D = options.customD !== undefined && options.customD !== null ? options.customD : (isSquare ? radius : radius * 0.85);
  const rc = options.rc ?? 0.35;
  const perim = createBoxyPerimeter(W, D, rc);

  const material = getFrostingMaterial(colorHex, colorId);
  const targetHeightScale = height / 1.6;
  const heightScale = targetHeightScale;
  const baseY = 0;

  // Align complete wave tiles evenly across each face as distinct panels.
  // The wave starts and ends cleanly at the corners of each face.
  const targetTileWidth = Math.max(1.8, Math.min(2.8, targetHeightScale * 1.4));
  const frontTileCount = Math.max(1, Math.round(perim.faceLengths[0] / targetTileWidth));
  const sideTileCount = isSquare
    ? frontTileCount
    : Math.max(1, Math.round(perim.faceLengths[1] / targetTileWidth));
  const secTileCounts = [frontTileCount, sideTileCount, frontTileCount, sideTileCount];

  const allGeos = [];

  for (let faceIdx = 0; faceIdx < 4; faceIdx++) {
    const tileCount = secTileCounts[faceIdx];
    const tileSpan = 1 / tileCount;

    for (let tIdx = 0; tIdx < tileCount; tIdx++) {
      const uStart = tIdx * tileSpan;

      const addScroll = (beziers, layerOffset = LAYER_MAIN, segments = 90) => {
        const curve = new MappedCurvePathBoxy(
          perim, faceIdx, uStart, tileSpan, baseY, beziers, heightScale, surfaceOffset + layerOffset
        );
        allGeos.push(new VariableRadiusTubeGeometry(curve, {
          segments,
          profileSegments: 12,
          minR: MIN_R,
          maxR: MAX_R,
          taperPower: 0.7,
          taperZone: 0.10,
          curvatureSensitivity: 0.8,
          kRef: 0.05,
        }));
      };

      const addTeardrop = (td, layerOffset = LAYER_DROP) => {
        const curve = new TeardropCurveBoxy(
          perim, faceIdx, uStart, tileSpan, baseY,
          [td[0], td[1]], [td[2], td[3]], [td[4], td[5]], heightScale, surfaceOffset + layerOffset
        );
        allGeos.push(new VariableRadiusTubeGeometry(curve, {
          segments: 24,
          profileSegments: 10,
          minR: MIN_R * 0.4,
          maxR: MAX_R * 0.85,
          taperPower: 2.5,
          taperZone: 0.22,
          curvatureSensitivity: 0.15,
          kRef: 0.05,
        }));
      };

      const addDot = (u, v, layerOffset = LAYER_DOT) => {
        const uFace = uStart + u * tileSpan;
        const pt = perim.getFacePoint(faceIdx, uFace);
        const norm = new THREE.Vector3(pt.nx, 0, pt.nz).normalize();
        const y = baseY + v * heightScale;
        const x = pt.x + norm.x * (surfaceOffset + layerOffset);
        const z = pt.z + norm.z * (surfaceOffset + layerOffset);
        allGeos.push(buildBoxyDot(x, y, z, norm, DOT_R, { atDrip: hasDrip }));
      };

      if (variant === 'pairedScrolls') {
        addScroll(PAIRED_LEFT_C_SCROLL_BEZIERS, LAYER_MAIN, 90);
        addScroll(PAIRED_RIGHT_C_SCROLL_BEZIERS, LAYER_MAIN, 90);
        addDot(0.32, -0.40);
        addDot(0.38, 0.38);
        addDot(0.68, -0.40);
        addDot(0.62, 0.38);
      } else if (variant === 'fleurDeLisRow') {
        for (const td of FLEUR_DE_LIS_TEARDROPS) addTeardrop(td, LAYER_DROP);
        addDot(0.50, -0.42);
      } else if (variant === 'shellBorderRow') {
        for (const td of SHELL_BORDER_TEARDROPS) addTeardrop(td, LAYER_DROP);
        addDot(0.50, -0.38);
      } else if (variant === 'vineAndTendrils') {
        addScroll(VINE_SPINE_BEZIERS, LAYER_MAIN, 90);
        addScroll(VINE_TENDRIL_LEFT, LAYER_BRANCH, 50);
        addScroll(VINE_TENDRIL_RIGHT, LAYER_BRANCH, 50);
        addDot(0.32, 0.08);
        addDot(0.68, -0.08);
      } else if (variant === 'loopChain') {
        addScroll(LOOP_CHAIN_BEZIERS, LAYER_MAIN, 100);
        addDot(0.50, 0.00);
      } else {
        // Default: 'waveRope' (Option B — Continuous Wave Rope)
        // Retains the exact original design: 1 wave with peak dot and valley dot per tile
        addScroll(WAVE_ROPE_BEZIERS, LAYER_MAIN, 90);
        addDot(0.25, 0.45);
        addDot(0.75, -0.45);
      }
    }
  }

  const merged = localMerge(allGeos);
  applyVerticalGradientUV(merged);
  const mesh = new THREE.Mesh(merged, material);
  mesh.userData.isBoxyPipingScrolls = true;
  mesh.userData.morphedToBoxy = true;
  return mesh;
}

/**
 * Builds piping-scroll side decoration as a SINGLE Mesh for the requested cake radius / height / color.
 */
export function buildPipingScrolls(radius, height, colorHex, colorId, variant = 'waveRope', opts = {}) {
  const options = typeof opts === 'boolean' ? { hasDrip: opts } : (opts || {});
  const shape = options.shape || options.cakeShape || 'cylinder';
  if (shape === 'rectangle' || shape === 'square') {
    return buildBoxyPipingScrolls(radius, height, colorHex, colorId, variant, options);
  }

  const hasDrip = Boolean(options.hasDrip || options.atDrip);
  const coatThickness = options.coatThickness ?? options.dripThickness ?? 0.06;
  const maxGlazeCarveDepth = options.maxCarveDepth ?? 0.50;
  const dripCarvedThickness = coatThickness * (1 - maxGlazeCarveDepth);
  const dripOffset = options.dripOffset ?? dripCarvedThickness;

  const material = getFrostingMaterial(colorHex, colorId);

  const targetHeightScale = height / 1.6;
  const idealTileCount = (3.826 * radius) / targetHeightScale;
  const tileCount = Math.max(3, Math.ceil(idealTileCount));

  const heightScale = (3.826 * radius) / tileCount;
  const arcWidth    = (Math.PI * 2) / tileCount;
  const baseY       = 0;

  const tileGeos = [];

  function addScroll(beziers, layerOffset, segments = 90) {
    const curve = new MappedCurvePathCylinder(
      radius + layerOffset, baseY, arcWidth, beziers, heightScale,
    );
    tileGeos.push(new VariableRadiusTubeGeometry(curve, {
      segments,
      profileSegments:      12,
      minR:                 MIN_R,
      maxR:                 MAX_R,
      taperPower:           0.7,
      taperZone:            0.10,
      curvatureSensitivity: 0.8,
      kRef:                 0.05,
    }));
  }

  function addTeardrop(td, layerOffset) {
    const curve = new TeardropCurve(
      radius + layerOffset, baseY, arcWidth,
      [td[0], td[1]], [td[2], td[3]], [td[4], td[5]], heightScale,
    );
    tileGeos.push(new VariableRadiusTubeGeometry(curve, {
      segments:             24,
      profileSegments:      10,
      minR:                 MIN_R * 0.4,
      maxR:                 MAX_R * 0.85,
      taperPower:           2.5,
      taperZone:            0.22,
      curvatureSensitivity: 0.15,
      kRef:                 0.05,
    }));
  }

  function addDot(u, v, layerOffset = LAYER_DOT) {
    const theta = u * arcWidth;
    const y     = baseY + v * heightScale;
    if (hasDrip) {
      // 75/25 vision on Drip: lifted so 75% is visible and 25% is buried in the Drip.
      // Drip surface sits at radius + dripOffset in the carved area.
      const surfaceRadius = radius + dripOffset;
      tileGeos.push(buildPearlDot(theta, y, surfaceRadius, DOT_R, { atDrip: true }));
    } else {
      tileGeos.push(buildFlushHemisphereDot(theta, y, radius + layerOffset));
    }
  }

  if (variant === 'pairedScrolls') {
    // Option A — Paired Opposing Scrolls
    addScroll(PAIRED_LEFT_C_SCROLL_BEZIERS, LAYER_MAIN, 90);
    addScroll(PAIRED_RIGHT_C_SCROLL_BEZIERS, LAYER_MAIN, 90);
    addDot(0.32, -0.40);
    addDot(0.38, 0.38);
    addDot(0.68, -0.40);
    addDot(0.62, 0.38);

  } else if (variant === 'fleurDeLisRow') {
    // Option 3 — Fleur-de-lis Row
    for (const td of FLEUR_DE_LIS_TEARDROPS) addTeardrop(td, LAYER_DROP);
    addDot(0.50, -0.42);

  } else if (variant === 'shellBorderRow') {
    // Option C — Shell Border Row
    for (const td of SHELL_BORDER_TEARDROPS) addTeardrop(td, LAYER_DROP);
    addDot(0.50, -0.38);

  } else if (variant === 'vineAndTendrils') {
    // Option D — Vine and Tendrils
    addScroll(VINE_SPINE_BEZIERS, LAYER_MAIN, 90);
    addScroll(VINE_TENDRIL_LEFT, LAYER_BRANCH, 50);
    addScroll(VINE_TENDRIL_RIGHT, LAYER_BRANCH, 50);
    addDot(0.32, 0.08);
    addDot(0.68, -0.08);

  } else if (variant === 'loopChain') {
    // Option E — Interlocking Loop Chain
    addScroll(LOOP_CHAIN_BEZIERS, LAYER_MAIN, 100);
    addDot(0.50, 0.00);

  } else {
    // Default: 'waveRope' (Option B — Continuous Wave Rope)
    addScroll(WAVE_ROPE_BEZIERS, LAYER_MAIN, 90);
    addDot(0.25, 0.45);
    addDot(0.75, -0.45);
  }

  const allGeos  = [];
  const rotMat   = new THREE.Matrix4();

  for (let i = 0; i < tileCount; i++) {
    rotMat.makeRotationY(i * arcWidth);
    for (const g of tileGeos) {
      const clone = new THREE.BufferGeometry();
      clone.setAttribute('position', g.getAttribute('position').clone());
      if (g.getAttribute('normal')) clone.setAttribute('normal', g.getAttribute('normal').clone());
      if (g.getIndex()) clone.setIndex(g.getIndex().clone());
      clone.applyMatrix4(rotMat);
      allGeos.push(clone);
    }
  }

  const merged = localMerge(allGeos);
  // No uv attribute existed on this geometry at all before — harmless for
  // the flat colorHex-only material this used to always get, but
  // getFrostingMaterial's gradient colors (everything except Gold
  // Shimmer, which is metalness/roughness only and doesn't sample a
  // texture) sample a texture via UV, and with nothing to sample against
  // they rendered as a flat, wrong single color. Same fix as the Mashed
  // Circles/Mashed Swirls filling-piping geometry and DecorationSets.jsx's
  // Triangle/Chevron geometries.
  applyVerticalGradientUV(merged);
  return new THREE.Mesh(merged, material);
}