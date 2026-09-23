import * as THREE from 'three';
import { getFrostingMaterial, applyVerticalGradientUV } from '../frostingMaterial';

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
const MIN_R = 0.039;  // ≈ 2 mm effective diameter
const MAX_R = 0.098;  // ≈ 5 mm effective diameter
const DOT_R = 0.110;  // hemisphere dot radius

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
      const radialX = center.x, radialZ = center.z;
      const radialLen = Math.sqrt(radialX * radialX + radialZ * radialZ);
      if (radialLen > 1e-6) {
        const pushScale = (radialLen + radius) / radialLen;
        center.x = radialX * pushScale;
        center.z = radialZ * pushScale;
      }
      centers.push(center);
      tangents.push(tangent);
      radii.push(radius);
    }

    // ── Pass 2: build an exact cylindrical cross-section frame ─────────────
    // These curves (MappedCurvePathCylinder / TeardropCurve) never move
    // radially — every point they produce sits via sin(theta)/cos(theta)
    // at a purely circumferential + vertical offset. That means the
    // tangent is ALWAYS perpendicular to the true horizontal radial
    // direction, with no exceptions and nothing that can go near-parallel.
    // So instead of a generic 3D frame (Frenet, or the rotation-minimizing
    // frame this used before) that has no notion of "the cylinder" and can
    // tilt away from flush as the curve climbs, use `radialDir` itself as
    // one cross-section axis:
    //   • it's still a true perpendicular tube cross-section, since
    //     tangent × radialDir is automatically ⊥ to both, and
    //   • the ring's innermost point (cos(a) = -1) lands at EXACTLY
    //     surfaceR — algebraically, not just "usually" — because the
    //     radialDir contribution is the only thing that can move a vertex
    //     closer to the axis, and radialDir is exactly the direction the
    //     centerline was already pushed out along in pass 1.
    // This is what a rotation-minimizing frame can't guarantee (RMF avoids
    // unnecessary twist, not tilt-away-from-the-cylinder), and why the
    // steep "going up" flank kept dipping in no matter how the frame was
    // patched — the frame itself needed to know it was on a cylinder.
    const normals   = new Array(centers.length);
    const binormals = new Array(centers.length);

    for (let i = 0; i < centers.length; i++) {
      const c = centers[i];
      const radialLen = Math.sqrt(c.x * c.x + c.z * c.z);
      const radialDir = radialLen > 1e-6
        ? new THREE.Vector3(c.x / radialLen, 0, c.z / radialLen)
        : new THREE.Vector3(1, 0, 0);

      normals[i]   = radialDir;
      binormals[i] = new THREE.Vector3().crossVectors(tangents[i], radialDir).normalize();
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

function buildFlushHemisphereDot(theta, y, cylinderRadius, dotRadius = DOT_R) {
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
 *
 * Every element's own real radius (MIN_R..MAX_R taper for scrolls, the
 * teardrops' own smaller taper, DOT_R for dots) is used as a flat radius
 * rather than reproducing the taper exactly — MAX_R (or the teardrop
 * equivalent) is a reasonable, mildly generous approximation, same
 * flat-footprint tradeoff Scatter Pearls' own coverage function makes.
 */
export function getPipingScrollsCoverageFn(radius, height, opts = {}) {
  const variant = opts.variant || 'waveRope';

  const targetHeightScale = height / 1.6;
  const idealTileCount = (3.826 * radius) / targetHeightScale;
  const tileCount = Math.max(3, Math.ceil(idealTileCount));
  const heightScale = (3.826 * radius) / tileCount;
  const arcWidth = (Math.PI * 2) / tileCount;

  const sampleCubic = (bezier, steps = 24) => {
    const [p0, p1, p2, p3] = bezier;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const u = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0];
      const v = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
      pts.push([u, v]);
    }
    return pts;
  };

  const sampleTeardrop = (td, steps = 16) => {
    const [p0u, p0v, p1u, p1v, p2u, p2v] = td;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const s = 1 - t;
      const u = s * s * p0u + 2 * s * t * p1u + t * t * p2u;
      const v = s * s * p0v + 2 * s * t * p1v + t * t * p2v;
      pts.push([u, v]);
    }
    return pts;
  };

  // Each element: { points: [[u,v], ...], radius }.
  const elements = [];
  const addScrollElement = (beziers, radiusApprox = MAX_R) => {
    for (const bez of beziers) elements.push({ points: sampleCubic(bez), radius: radiusApprox });
  };
  const addTeardropElement = (td, radiusApprox = MAX_R * 0.85) => {
    elements.push({ points: sampleTeardrop(td), radius: radiusApprox });
  };
  const addDotElement = (u, v) => {
    elements.push({ points: [[u, v]], radius: DOT_R });
  };

  if (variant === 'pairedScrolls') {
    addScrollElement(PAIRED_LEFT_C_SCROLL_BEZIERS);
    addScrollElement(PAIRED_RIGHT_C_SCROLL_BEZIERS);
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
    addScrollElement(VINE_SPINE_BEZIERS);
    addScrollElement(VINE_TENDRIL_LEFT);
    addScrollElement(VINE_TENDRIL_RIGHT);
    addDotElement(0.32, 0.08);
    addDotElement(0.68, -0.08);
  } else if (variant === 'loopChain') {
    addScrollElement(LOOP_CHAIN_BEZIERS);
    addDotElement(0.50, 0.00);
  } else {
    // Default: 'waveRope'
    addScrollElement(WAVE_ROPE_BEZIERS);
    addDotElement(0.25, 0.45);
    addDotElement(0.75, -0.45);
  }

  const smoothstep = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };

  return (angle, localY) => {
    const wrappedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const tileIndex = Math.floor(wrappedAngle / arcWidth);

    let coverage = 0;
    // Also check the tile immediately before/after — a shape sitting near
    // u≈0 or u≈1 in one tile can be nearer to the ADJACENT tile's own
    // copy of that same shape (tiles repeat seamlessly around the whole
    // circumference) than to its own tile's copy.
    for (const dTile of [0, -1, 1]) {
      const tileStartAngle = (tileIndex + dTile) * arcWidth;
      const localArc = radius * (wrappedAngle - tileStartAngle);
      for (const el of elements) {
        for (const [u, v] of el.points) {
          const dArc = localArc - radius * u * arcWidth;
          const dY = localY - v * heightScale;
          const dist = Math.sqrt(dArc * dArc + dY * dY);
          const distInsideEdge = el.radius - dist;
          if (distInsideEdge <= 0) continue;
          const smoothWidth = Math.max(0.015, el.radius * 0.3);
          coverage = Math.max(coverage, smoothstep(distInsideEdge / smoothWidth));
          if (coverage >= 1) return 1;
        }
      }
    }
    return coverage;
  };
}

/**
 * Builds piping-scroll side decoration as a SINGLE Mesh for the requested cake radius / height / color.
 */
export function buildPipingScrolls(radius, height, colorHex, colorId, variant = 'waveRope') {
  // Same fix as Checkered/Triangle/Chevron in DecorationSets.jsx — was a
  // plain THREE.MeshStandardMaterial({ color }), no colorId, so all six
  // pattern colors (Marble/Ombré/Rainbow Swirl/Gold Shimmer/Watercolor
  // Pastel Mix/Red-White Gradient) rendered as a flat swatch. Piped
  // scrolls are meant to look like actual piped buttercream anyway, so
  // getFrostingMaterial is the right fit here, same as those three.
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
    tileGeos.push(buildFlushHemisphereDot(theta, y, radius + layerOffset));
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
