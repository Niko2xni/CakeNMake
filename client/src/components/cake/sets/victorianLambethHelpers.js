import * as THREE from 'three';
import { getFrostingMaterial } from '../frostingMaterial';

/**
 * Custom THREE.Curve subclass for 3D polar rope curves around a cylinder.
 * Calculates exact cylindrical coordinates with subtle outward parabolic bow
 * so the rope rests flush against the cake surface without floating or excessive standoff.
 */
class PolarRopeCurve extends THREE.Curve {
  constructor(radius, startAngle, endAngle, startY, endY, sagDepth, forwardBow = 0.015) {
    super();
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.startY = startY;
    this.endY = endY;
    this.sagDepth = sagDepth;
    this.forwardBow = forwardBow;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const theta = THREE.MathUtils.lerp(this.startAngle, this.endAngle, t);
    const parabola = 4 * t * (1 - t); // 0 at t=0, t=1; 1 at t=0.5

    const y = THREE.MathUtils.lerp(this.startY, this.endY, t) - this.sagDepth * parabola;
    const r = this.radius + this.forwardBow * parabola;

    const x = r * Math.sin(theta);
    const z = r * Math.cos(theta);

    return target.set(x, y, z);
  }
}

/**
 * Helper to build an 8-point star-tip fluted tube mesh for authentic piped icing ropes.
 */
function buildStarTipRopeMesh(curve, tubularSegments, radius, radialSegments, material) {
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  const pos = geo.attributes.position;
  const normal = geo.attributes.normal;

  // Modulate position along local tube radius to form 8-point star tip fluting
  for (let i = 0; i < pos.count; i++) {
    const u = (i % (radialSegments + 1)) / radialSegments;
    const angle = u * Math.PI * 2;
    const starMod = 1.0 + 0.18 * Math.sin(8 * angle);

    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const nz = normal.getZ(i);

    // Displace outward along normal by star profile
    pos.setXYZ(
      i,
      pos.getX(i) + nx * radius * (starMod - 1.0),
      pos.getY(i) + ny * radius * (starMod - 1.0),
      pos.getZ(i) + nz * radius * (starMod - 1.0)
    );
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

/**
 * Helper to create authentic hand-piped buttercream teardrop geometry:
 * TOP has the fat, bulbous rounded base,
 * BOTTOM tapers down to a sharp pointed tail tip.
 */
function createTeardropGeometry(radius = 0.045, heightScale = 1.8, thicknessScale = 0.7) {
  const geometry = new THREE.SphereGeometry(1, 16, 16);
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i); // ranges from -1 (bottom tip) to +1 (top fat base)
    let z = pos.getZ(i);

    // Normalize t: t = 0 at top (fat base), t = 1 at bottom (sharp point)
    const t = (1.0 - y) * 0.5;

    // Teardrop profile taper: fat at top (t = 0), sharp point at bottom tip (t = 1)
    const teardropTaper = Math.sin((1.0 - t) * Math.PI * 0.5) * (0.2 + 0.8 * (1.0 - Math.pow(t, 1.2)));

    x *= teardropTaper * radius * 1.1;
    z *= teardropTaper * radius * 1.6 * thicknessScale;
    y *= radius * heightScale;

    pos.setXYZ(i, x, y, z);
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Answers "how much is this point on the tier's side wall covered by an
 * active Victorian Lambeth element?" as a 0..1 weight, for Filling's own
 * Piping Design to shave against — same purpose/smoothstep-edge reasoning
 * as the other coverage functions in this codebase (see
 * getCheckerCoverageFn's own comment in DecorationSets.jsx).
 *
 * Unlike Checkered/Chevron/Scatter Pearls/Piping Scrolls/Sunshine Play,
 * this is a COARSER approximation, not a shape-for-shape match — Victorian
 * Lambeth has by far the most going on (rope tiers with their own sag
 * curves, an anchor rosette with petals and leaves, a volumetric draped
 * curtain, fleur-de-lis teardrop clusters, low pearls, an offset rope
 * tier, and up to 3 vertically-stacked bands depending on variant),
 * enough that tracing every individual element precisely would mean
 * duplicating most of this file's own geometry logic a second time as
 * distance queries. Instead, each segment gets 3 representative regions:
 * an anchor/rosette circle at its own currentAngle, one sagging band
 * covering the curtain + rope network's combined vertical reach across
 * the segment, and a low-pearl circle at midAngle — reusing this file's
 * own segment/band loop structure (currentAngle/midAngle/anglePerSegment/
 * bands) so the real periodic layout and per-variant visibility flags are
 * respected, even though the shapes within each segment are simplified.
 */
export function getVictorianLambethCoverageFn(radius, height, opts = {}) {
  // Glaze needs the windows to follow the REAL piping (see
  // getVictorianLambethGlazeCoverageFn below); Filling keeps the coarser
  // approximation this function was written with, unchanged.
  if (opts.forGlaze) return getVictorianLambethGlazeCoverageFn(radius, height, opts);
  const variant = opts.variant || 'classic';
  const H = height;

  const isDoubleBand = variant === 'doubleBand';
  const isTripleBand = variant === 'tripleBand';
  const isNoRosette = variant === 'noRosette';

  const circumference = 2 * Math.PI * radius;
  const targetSegmentWidth = isTripleBand ? 3.4 : 2.3;
  const segmentCount = Math.max(6, Math.round(circumference / targetSegmentWidth));
  const anglePerSegment = (Math.PI * 2) / segmentCount;

  const VARIANT_FLAGS = {
    classic:    { rosette: true,  topRopes: true,  lowerRope: true,  offsetRope: true,  lowPearl: true,  anchorPearl: true },
    noRosette:  { rosette: false, topRopes: true,  lowerRope: true,  offsetRope: true,  lowPearl: true,  anchorPearl: true },
    ropesOnly:  { rosette: false, topRopes: true,  lowerRope: true,  offsetRope: true,  lowPearl: true,  anchorPearl: true },
    noRopes:    { rosette: true,  topRopes: false, lowerRope: false, offsetRope: false, lowPearl: false, anchorPearl: true },
    doubleBand: { rosette: true,  topRopes: false, lowerRope: false, offsetRope: false, lowPearl: false, anchorPearl: true },
    tripleBand: { rosette: true,  topRopes: false, lowerRope: false, offsetRope: false, lowPearl: false, anchorPearl: true },
  };
  const flags = VARIANT_FLAGS[variant] || VARIANT_FLAGS.classic;
  const hasAnchor = flags.rosette || flags.anchorPearl;
  const hasCurtainOrRopes = flags.topRopes || flags.lowerRope || flags.offsetRope || variant === 'noRopes' || isDoubleBand || isTripleBand;
  const hasLowPearl = flags.lowPearl;

  const BAND_SPACING = 0.36;
  const NOROSETTE_BAND_SPACING = 0.20;
  const bands = isTripleBand
    ? [{ yOffset: 0 }, { yOffset: -H * BAND_SPACING }]
    : isDoubleBand
    ? [{ yOffset: 0 }, { yOffset: -H * BAND_SPACING }]
    : isNoRosette
    ? [{ yOffset: 0 }, { yOffset: -H * NOROSETTE_BAND_SPACING }]
    : [{ yOffset: 0 }];
  const applyTopLift = isNoRosette || variant === 'ropesOnly';
  const TOP_LIFT = 0.05;

  // elements: { type:'circle', angle, y, r } | { type:'curve', points:[[angle,y],...], r }
  const elements = [];

  for (let bandIdx = 0; bandIdx < bands.length; bandIdx++) {
    const bandYOffset = bands[bandIdx].yOffset + (applyTopLift ? TOP_LIFT * H : 0);
    const angleOffset = (bandIdx % 2 === 1) ? anglePerSegment / 2 : 0;

    for (let i = 0; i < segmentCount; i++) {
      const currentAngle = i * anglePerSegment + angleOffset;
      const nextAngle = (i + 1) * anglePerSegment + angleOffset;
      const midAngle = currentAngle + anglePerSegment / 2;

      if (hasAnchor) {
        // Rosette petals (scale 1.6x) plus the anchor pearl (radius
        // 0.16) together reach roughly this far from currentAngle — a
        // generous single circle standing in for the whole anchor node.
        const anchorY = 0.42 * H + bandYOffset + (flags.topRopes ? -0.05 * H : 0);
        elements.push({ type: 'circle', angle: currentAngle, y: anchorY, r: 0.38 });
      }

      if (hasCurtainOrRopes) {
        // One sagging band standing in for the curtain drape AND/OR the
        // rope tiers together (whichever are actually active for this
        // variant) — real sag curve (PolarRopeCurve's own parabola
        // formula), spanning the segment's real vertical extent from
        // roughly the low pearl/rope3's own reach up to the top ropes'.
        const topY = (flags.topRopes ? 0.40 : 0.34) * H + bandYOffset;
        const bottomY = (flags.lowerRope || flags.offsetRope ? -0.16 : 0.16) * H + bandYOffset;
        const sag = 0.20 * H;
        const steps = 10;
        const points = [];
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const a = currentAngle + (nextAngle - currentAngle) * t;
          const parabola = 4 * t * (1 - t);
          const y = topY - sag * parabola;
          points.push([a, y]);
        }
        elements.push({ type: 'curve', points, r: 0.18 + (topY - bottomY) * 0.15 });
      }

      if (hasLowPearl) {
        const lowPearlY = -0.16 * H + bandYOffset;
        elements.push({ type: 'circle', angle: midAngle, y: lowPearlY, r: 0.16 });
      }
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
          const distInsideEdge = el.r - Math.sqrt(arcDist * arcDist + dY * dY);
          if (distInsideEdge <= 0) continue;
          coverage = Math.max(coverage, smoothstep(distInsideEdge / Math.max(0.03, el.r * 0.25)));
          if (coverage >= 1) break;
        }
      } else {
        const arcDist = radius * angleDelta(angle, el.angle);
        const dY = localY - el.y;
        const distInsideEdge = el.r - Math.sqrt(arcDist * arcDist + dY * dY);
        if (distInsideEdge > 0) coverage = Math.max(coverage, smoothstep(distInsideEdge / Math.max(0.03, el.r * 0.25)));
      }
      if (coverage >= 1) return 1;
    }
    return coverage;
  };
}

/**
 * Glaze's shape-for-shape counterpart of getVictorianLambethCoverageFn.
 *
 * Filling only needs a rough "something is here" cue, which is why the
 * function above stands in a whole segment with three simplified regions.
 * Glaze is different: its windows are what the viewer SEES around each
 * piece of piping, so they have to follow the real elements — otherwise
 * the glaze is cut into shapes that don't match the design and the piping
 * is left half-buried (Classic: a swag-shaped hole that doesn't match the
 * curtain, ropes that run across un-shaved coat).
 *
 * This walks the exact same layout buildVictorianLambeth uses (same
 * VARIANT_FLAGS values, segmentCount, bands, angleOffset, bandYOffset and
 * per-element Y formulas) and emits one region per real element:
 *   - rope tiers      -> capsule along the actual PolarRopeCurve path
 *   - curtain drape   -> the actual sagging band (height + sag per variant)
 *   - rosette         -> center disc + the two side leaves (ellipses)
 *   - pearls          -> circles at their real size
 *   - fleur-de-lis    -> its three real teardrops (tilted ellipses),
 *                        hanging (bottom) or flipped upward (top), per band
 * Angles are in the mesh's own sin/cos convention, `localY` is relative to
 * the Lambeth group's origin (CakeScene.jsx adds the build call's +0.2).
 * Each region's fully-open core is at least the element's real size, with a
 * small margin and edge ramp outside it (same idea as the small-star fix in
 * Sunshine Play): a hard 0/1 edge would tear the continuous glaze mesh.
 *
 * Elements are bucketed by angle so a query only tests the handful of
 * regions near it — this runs once per glaze vertex.
 */
export function getVictorianLambethGlazeCoverageFn(radius, height, opts = {}) {
  const variant = opts.variant || 'classic';
  const H = height;
  const verticalScale = H / 5.0;

  const isDoubleBand = variant === 'doubleBand';
  const isTripleBand = variant === 'tripleBand';
  const isNoRosette = variant === 'noRosette';

  const circumference = 2 * Math.PI * radius;
  const targetSegmentWidth = isTripleBand ? 3.4 : 2.3;
  const segmentCount = Math.max(6, Math.round(circumference / targetSegmentWidth));
  const anglePerSegment = (Math.PI * 2) / segmentCount;

  // Mirrors buildVictorianLambeth's VARIANT_FLAGS (keep in sync).
  const VARIANT_FLAGS = {
    classic:    { rosette: true,  topRopes: true,  lowerRope: true,  offsetRope: true,  lowPearl: true,  fleur: true,  curtain: true,  anchorPearl: true, topFleur: false },
    noRosette:  { rosette: false, topRopes: true,  lowerRope: true,  offsetRope: true,  lowPearl: true,  fleur: false, curtain: false, anchorPearl: true, topFleur: false },
    ropesOnly:  { rosette: false, topRopes: true,  lowerRope: true,  offsetRope: true,  lowPearl: true,  fleur: false, curtain: false, anchorPearl: true, topFleur: false },
    noRopes:    { rosette: true,  topRopes: false, lowerRope: false, offsetRope: false, lowPearl: false, fleur: true,  curtain: true,  anchorPearl: true, topFleur: false },
    doubleBand: { rosette: true,  topRopes: false, lowerRope: false, offsetRope: false, lowPearl: false, fleur: false, curtain: true,  anchorPearl: true, topFleur: false },
    tripleBand: { rosette: true,  topRopes: false, lowerRope: false, offsetRope: false, lowPearl: false, fleur: false, curtain: true,  anchorPearl: true, topFleur: false },
  };
  const flags = VARIANT_FLAGS[variant] || VARIANT_FLAGS.classic;

  const ANCHOR_PEARL_RADIUS = 0.16;
  const ROPES_ONLY_EXTRA_DROP = 0.05;
  const BAND_SPACING = 0.36;
  const NOROSETTE_BAND_SPACING = 0.20;
  const bands = isTripleBand
    ? [
        { yOffset: 0, angleOffset: 0, topFleur: true, bottomFleur: false },
        { yOffset: -H * BAND_SPACING, angleOffset: anglePerSegment / 2, topFleur: true, bottomFleur: false },
      ]
    : isDoubleBand
    ? [
        { yOffset: 0, angleOffset: 0, topFleur: false, bottomFleur: false },
        { yOffset: -H * BAND_SPACING, angleOffset: anglePerSegment / 2, topFleur: false, bottomFleur: false },
      ]
    : isNoRosette
    ? [
        { yOffset: 0, angleOffset: 0, topFleur: false, bottomFleur: false },
        { yOffset: -H * NOROSETTE_BAND_SPACING, angleOffset: anglePerSegment / 2, topFleur: false, bottomFleur: false },
      ]
    : [{ yOffset: 0, angleOffset: 0, topFleur: flags.topFleur, bottomFleur: flags.fleur }];
  const applyTopLift = isNoRosette || variant === 'ropesOnly';
  const TOP_LIFT = 0.05;

  // ── Region list ─────────────────────────────────────────────────────
  // 'ellipse': { angle, y, rx, ry, rot }   (rx/ry = fully-open half-axes)
  // 'capsule': { pts: [[angle, y], ...], r }
  // 'curtain': { mid, halfArc, cy, ch, sag }
  const regions = [];
  const OPEN_MARGIN = 1.25;

  const addCircle = (angle, y, trueR) =>
    regions.push({ type: 'ellipse', angle, y, rx: trueR, ry: trueR, rot: 0, margin: OPEN_MARGIN });
  const addEllipse = (angle, y, rx, ry, rot = 0) =>
    regions.push({ type: 'ellipse', angle, y, rx, ry, rot, margin: OPEN_MARGIN });

  const addRope = (startAngle, endAngle, startY, endY, sag) => {
    const pts = [];
    const steps = 24;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const parabola = 4 * t * (1 - t);
      pts.push([startAngle + (endAngle - startAngle) * t, startY + (endY - startY) * t - sag * parabola]);
    }
    // Tube radius 0.035, star fluting up to +18% -> 0.041 real reach.
    regions.push({ type: 'capsule', pts, r: 0.041 });
  };

  // Teardrop: center (0,-0.02), left (-0.06,-0.12) tilted +PI/10, right
  // (0.06,-0.12) tilted -PI/10, inside a group scaled (2, 2*vs, 2). Each
  // teardrop's own half-extents: x ~ 0.0495, y ~ 0.081, scaled likewise.
  const addFleur = (angle, baseY, flipped) => {
    const sx = 2.0, sy = 2.0 * verticalScale;
    const sign = flipped ? -1 : 1;
    const tear = (lx, ly, tilt) => {
      const yOff = sign * ly * sy;
      const xOff = sign * lx * sx;
      addEllipse(
        angle + xOff / radius,
        baseY + yOff,
        0.0495 * sx,
        0.081 * sy,
        // Tilt in the arc/height plane. A flip about Z by PI keeps the
        // ellipse's tilt sign (rotation by PI is its own mirror).
        tilt
      );
    };
    tear(0, -0.02, 0);
    tear(-0.06, -0.12, Math.PI / 10);
    tear(0.06, -0.12, -Math.PI / 10);
  };

  for (const band of bands) {
    const bandY = band.yOffset + (applyTopLift ? TOP_LIFT * H : 0);
    for (let i = 0; i < segmentCount; i++) {
      const currentAngle = i * anglePerSegment + band.angleOffset;
      const nextAngle = (i + 1) * anglePerSegment + band.angleOffset;
      const midAngle = currentAngle + anglePerSegment / 2;

      if (flags.rosette || flags.anchorPearl) {
        const anchorY = 0.42 * H + bandY + (flags.topRopes ? -ROPES_ONLY_EXTRA_DROP * H : 0);
        if (flags.rosette) {
          // Swirl disc (petals, scaled 1.6) + two side leaves reaching
          // ~0.78 either side of the anchor, lens-shaped, ~0.38 half-tall.
          addCircle(currentAngle, anchorY, 0.42);
          for (const side of [-1, 1]) {
            addEllipse(currentAngle + (side * 0.43) / radius, anchorY, 0.36, 0.30, 0);
          }
        }
        if (flags.anchorPearl) {
          addCircle(currentAngle, anchorY - 0.08 * H, ANCHOR_PEARL_RADIUS);
        }
      }

      if (band.bottomFleur) addFleur(currentAngle, -0.12 * H + bandY, false);
      if (band.topFleur) addFleur(midAngle, 0.32 * H + bandY, true);

      if (flags.curtain) {
        regions.push({
          type: 'curtain',
          mid: midAngle,
          halfArc: anglePerSegment / 2,
          cy: 0.28 * H + bandY,
          ch: isTripleBand ? 0.14 * H : 0.12 * H,
          sag: isTripleBand ? 0.32 * H : 0.22 * H,
        });
      }

      if (flags.topRopes) {
        const ROPE_GAP = ANCHOR_PEARL_RADIUS * 0.4;
        const ballCenterY = 0.34 * H - ROPES_ONLY_EXTRA_DROP * H;
        addRope(currentAngle, nextAngle, ballCenterY + ROPE_GAP + bandY, ballCenterY + ROPE_GAP + bandY, 0.15 * H);
        addRope(currentAngle, nextAngle, ballCenterY + bandY, ballCenterY + bandY, 0.22 * H);
      }

      const lowPearlY = -0.16 * H + bandY;
      if (flags.lowerRope) {
        const rope3Y = (flags.curtain ? 0.38 * H : 0.28 * H) + bandY;
        addRope(currentAngle, nextAngle, rope3Y, rope3Y, rope3Y - lowPearlY);
      }
      if (flags.lowPearl) addCircle(midAngle, lowPearlY, 0.10);
      if (flags.offsetRope) addRope(midAngle, midAngle + anglePerSegment, lowPearlY, lowPearlY, 0.22 * H);
    }
  }

  // ── Bounds + angular buckets ────────────────────────────────────────
  const TWO_PI = Math.PI * 2;
  const wrapSigned = (a) => {
    let d = a % TWO_PI;
    if (d > Math.PI) d -= TWO_PI;
    if (d < -Math.PI) d += TWO_PI;
    return d;
  };
  const BIN_COUNT = Math.max(24, segmentCount * 6);
  const binWidth = TWO_PI / BIN_COUNT;
  const bins = Array.from({ length: BIN_COUNT }, () => []);

  for (const el of regions) {
    let aMin, aMax, yMin, yMax;
    if (el.type === 'ellipse') {
      const reach = Math.max(el.rx, el.ry) * el.margin + 0.06;
      aMin = el.angle - reach / radius;
      aMax = el.angle + reach / radius;
      yMin = el.y - reach;
      yMax = el.y + reach;
    } else if (el.type === 'capsule') {
      const reach = el.r * 1.6 + 0.05;
      aMin = Infinity; aMax = -Infinity; yMin = Infinity; yMax = -Infinity;
      for (const [a, y] of el.pts) {
        aMin = Math.min(aMin, a); aMax = Math.max(aMax, a);
        yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
      }
      aMin -= reach / radius; aMax += reach / radius; yMin -= reach; yMax += reach;
    } else {
      aMin = el.mid - el.halfArc; aMax = el.mid + el.halfArc;
      yMin = el.cy - el.sag - el.ch / 2 - 0.12;
      yMax = el.cy + el.ch / 2 + 0.12;
    }
    el.yMin = yMin;
    el.yMax = yMax;
    const first = Math.floor(aMin / binWidth);
    const last = Math.floor(aMax / binWidth);
    const span = Math.min(BIN_COUNT, last - first + 1);
    for (let b = 0; b < span; b++) {
      const idx = (((first + b) % BIN_COUNT) + BIN_COUNT) % BIN_COUNT;
      bins[idx].push(el);
    }
  }

  const smoothstep = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };

  const ellipseCoverage = (el, angle, localY) => {
    const dx = radius * wrapSigned(angle - el.angle);
    const dy = localY - el.y;
    const cos = Math.cos(-el.rot);
    const sin = Math.sin(-el.rot);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    const wx = el.rx * el.margin;
    const wy = el.ry * el.margin;
    const q = Math.sqrt((rx / wx) * (rx / wx) + (ry / wy) * (ry / wy));
    if (q >= 1) return 0;
    const minAxis = Math.min(wx, wy);
    const inside = (1 - q) * minAxis;
    // Full strength once we are inside the element's own true size.
    const ramp = Math.max(0.012, minAxis - Math.min(el.rx, el.ry));
    return smoothstep(inside / ramp);
  };

  const capsuleCoverage = (el, angle, localY) => {
    const windowR = el.r * 1.5;
    const ramp = Math.max(0.012, windowR - el.r);
    let best = Infinity;
    const pts = el.pts;
    for (let k = 0; k < pts.length - 1; k++) {
      const [a0, y0] = pts[k];
      const [a1, y1] = pts[k + 1];
      const am = (a0 + a1) / 2;
      const s0 = radius * (a0 - am);
      const s1 = radius * (a1 - am);
      const px = radius * wrapSigned(angle - am);
      const vx = s1 - s0;
      const vy = y1 - y0;
      const len2 = vx * vx + vy * vy;
      let t = len2 > 0 ? ((px - s0) * vx + (localY - y0) * vy) / len2 : 0;
      t = Math.min(1, Math.max(0, t));
      const cx = s0 + vx * t;
      const cy = y0 + vy * t;
      const d = Math.hypot(px - cx, localY - cy);
      if (d < best) best = d;
    }
    if (best >= windowR) return 0;
    return smoothstep((windowR - best) / ramp);
  };

  const curtainCoverage = (el, angle, localY) => {
    const delta = wrapSigned(angle - el.mid);
    if (Math.abs(delta) > el.halfArc) return 0;
    const nx = delta / el.halfArc;
    const centerY = el.cy - el.sag * (1 - nx * nx);
    const dy = Math.abs(localY - centerY);
    const RAMP = 0.06;
    const windowHalf = el.ch / 2 + RAMP;
    if (dy >= windowHalf) return 0;
    return smoothstep((windowHalf - dy) / RAMP);
  };

  return (angle, localY) => {
    const wrapped = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
    const bucket = bins[Math.min(BIN_COUNT - 1, Math.floor(wrapped / binWidth))];
    let coverage = 0;
    for (const el of bucket) {
      if (localY < el.yMin || localY > el.yMax) continue;
      const c = el.type === 'ellipse'
        ? ellipseCoverage(el, wrapped, localY)
        : el.type === 'capsule'
        ? capsuleCoverage(el, wrapped, localY)
        : curtainCoverage(el, wrapped, localY);
      if (c > coverage) {
        coverage = c;
        if (coverage >= 1) return 1;
      }
    }
    return coverage;
  };
}

/**
 * Builds the complete Victorian Lambeth Piping side decoration as a THREE.Group,
 * wrapped around a cylinder of given radius and height.
 *
 * Features ONE clean, volumetric 3D extruded curtain swag per segment.
 *
 * @param {number} radius - Radius of the cake tier side wall.
 * @param {number} height - Height allocated for the tier decoration.
 * @param {string} icingColorHex - Main icing color.
 * @param {string} pearlColorHex - Pearl accent color.
 * @param {string} variant - see VARIANT_FLAGS inside this function for
 *   the authoritative per-element breakdown. Summary:
 *   'classic' (default) — everything.
 *   'noRosette' — removes the rosette (petals + side leaves) and its
 *   two top ropes (rope1, rope2); keeps the anchor pearl, curtain,
 *   fleur-de-lis, rope3, the offset archwork tier, and the low pearl.
 *   'ropesOnly' — keeps every rope tier (rope1, rope2, rope3, the
 *   offset archwork tier) plus every pearl that reads as attached to
 *   them (the anchor pearl, which sits right where the top ropes run,
 *   and the low pearl, which sits exactly at the offset rope's own
 *   start point); removes the rosette, fleur-de-lis, and curtain.
 *   'noRopes' — the exact complement of 'ropesOnly': removes every
 *   rope tier and the low pearl, keeps the rosette, anchor pearl,
 *   fleur-de-lis, and curtain.
 *   'doubleBand' — 'noRopes'-style elements minus the fleur-de-lis
 *   (whose teardrops reach lower than anything else in a band),
 *   rendered twice at two vertical offsets within this one group (a
 *   top band and a bottom band, the bottom also phase-shifted by half a
 *   segment so its rosettes land at the top band's swag centers) — see
 *   `bands` inside this function.
 *   'tripleBand' — despite the name, now renders 2 bands (the original
 *   3rd/bottommost band was removed): a top band and a middle band,
 *   phase-shifted by half a segment so the middle band's rosettes land at
 *   the top band's swag centers. Both bands get an upward-pointing
 *   fleur-de-lis filling the gap at their own curtain rim — the top band
 *   previously had none there.
 *   See VICTORIAN_LAMBETH_SETS in cakeConfig.js.
 * @returns {THREE.Group} Group containing the complete Victorian Lambeth piping.
 */
export function buildVictorianLambeth(radius, height, icingColorHex, pearlColorHex = '#ffffff', variant = 'classic') {
  const masterGroup = new THREE.Group();

  // 1. Procedural GPU Buttercream Material
  const icingMat = getFrostingMaterial(icingColorHex);

  // 2. Glossy Sugar Pearl Material (Dragées)
  const pearlMat = new THREE.MeshPhysicalMaterial({
    color: pearlColorHex,
    roughness: 0.10,
    metalness: 0.10,
    clearcoat: 1.0,
    clearcoatRoughness: 0.10,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xffffff)
  });

  // 3. Flush Standoff Hierarchy
  const R_cake = radius;
  const R_curtain = R_cake + 0.020;
  const R_rope1 = R_cake + 0.015; // Top border rope
  const R_rope2 = R_cake + 0.015; // Middle border rope riding on front curtain surface
  const R_rope3 = R_cake + 0.025; // Lower deep loop
  const R_fleur = R_cake + 0.015;
  const R_pearl = R_cake + 0.020;
  const R_anchor = R_cake + 0.025; // Standoff so rosette & leaves sit in front of cake wall

  // 3.5 Variant shorthand flags — computed early because segment spacing
  // below is now variant-conditional (tripleBand), not global.
  const isDoubleBand = variant === 'doubleBand';
  const isTripleBand = variant === 'tripleBand';
  const isNoRosette = variant === 'noRosette';

  // Anchor pearl's own radius (see buildAnchorNode below, which now
  // references this same constant instead of a separate hardcoded 0.16) —
  // pulled up here so the 'ropesOnly' top-rope alignment formula further
  // down can compute the pearl's exact top surface Y algebraically,
  // rather than guessing a Y offset that would drift out of sync if the
  // pearl's own size or position is ever retuned.
  const ANCHOR_PEARL_RADIUS = 0.16;

  // How far below their default position rope1/rope2 (and the ball they
  // meet) are nudged, for variants with showTopRopes true — currently
  // 'classic' and 'ropesOnly'. Kept as one shared constant so both stay
  // in sync automatically, rather than drifting apart if tuned separately.
  const ROPES_ONLY_EXTRA_DROP = 0.05; // × H — tune here for more/less than the current nudge

  // 4. Compact Segment & Angular Math
  const circumference = 2 * Math.PI * radius;
  // Wider spacing (tripleBand only) — classic no longer uses a density
  // target at all (see segmentCount below), so this ternary only branches
  // for tripleBand now; every other design keeps the original 2.3.
  const targetSegmentWidth = isTripleBand ? 3.4 : 2.3;
  // classic no longer overrides segment count — it uses the same
  // circumference-based count as every other non-tripleBand design,
  // since it's now noRosette's design with the rosette added, not its
  // own separately-tuned layout.
  const segmentCount = Math.max(6, Math.round(circumference / targetSegmentWidth));
  const anglePerSegment = (Math.PI * 2) / segmentCount;

  const H = height;
  const verticalScale = H / 5.0;

  // ── Per-variant visibility ──────────────────────────────────────────────
  // An explicit table, one row per variant, rather than a handful of
  // negated boolean expressions — with 5 variants now, "showX = !isY &&
  // !isZ" style conditions are exactly how showTopRopes quietly narrowed
  // to "classic only" during the noRopes refactor and silently dropped
  // rope1/rope2 from ropesOnly too (they were never supposed to leave).
  // A table makes every variant's full set of visible elements readable
  // in one place and auditable at a glance instead of re-derived from
  // several negations scattered across lines.
  const VARIANT_FLAGS = {
    // rosette=the swirl disc (petals+leaves). topRopes=rope1+rope2.
    // lowerRope=rope3 (deep loop). offsetRope=the out-of-phase archwork
    // tier. lowPearl=the pearl at the offset rope's own start point ("a
    // circle connected to the ropes"). anchorPearl=the anchor's own
    // accent pearl (NOT positioned at any rope's endpoint, unlike lowPearl).
    // topFleur=an extra, upward-pointing fleur-de-lis at the angular
    // stagger between anchors, up near the top gap above the curtain.
    // Currently unused by every variant (VARIANT_FLAGS all set it
    // false) — noRosette was the last one using it, until it became an
    // exact copy of ropesOnly below. Left in place, not deleted, in
    // case a future variant wants that top-gap treatment again. See
    // "2b. Top Fleur-de-lis" below.
    // classic is ropesOnly's design with the rosette added, plus two
    // more additions on top: curtain (the wide sag connected to the
    // rosettes) and fleur (hanging in the gaps between the lower ropes,
    // i.e. at currentAngle — the angular midpoint between two consecutive
    // low pearls, since midAngle/nextMidAngle straddle it symmetrically).
    // ropesOnly itself is untouched by either addition.
    classic:    { rosette: true,  topRopes: true,  lowerRope: true,  offsetRope: true,  lowPearl: true,  fleur: true,  curtain: true,  anchorPearl: true, topFleur: false },
    // noRosette is now an exact copy of ropesOnly — every flag matches
    // (rosette was already false on both, so this makes the two
    // structurally identical designs). curtain/fleur/topFleur, which
    // noRosette previously had, are now off to match.
    noRosette:  { rosette: false, topRopes: true,  lowerRope: true,  offsetRope: true,  lowPearl: true,  fleur: false, curtain: false, anchorPearl: true, topFleur: false },
    ropesOnly:  { rosette: false, topRopes: true,  lowerRope: true,  offsetRope: true,  lowPearl: true,  fleur: false, curtain: false, anchorPearl: true, topFleur: false },
    noRopes:    { rosette: true,  topRopes: false, lowerRope: false, offsetRope: false, lowPearl: false, fleur: true,  curtain: true,  anchorPearl: true, topFleur: false },
    doubleBand: { rosette: true,  topRopes: false, lowerRope: false, offsetRope: false, lowPearl: false, fleur: false, curtain: true,  anchorPearl: true, topFleur: false },
    // tripleBand's fleur/topFleur values here are unused placeholders — it
    // sets fleur placement per-band instead (see `bands` below), since
    // each of its 3 bands needs different treatment, not one flag applied
    // uniformly to all of them the way every other variant works.
    tripleBand: { rosette: true,  topRopes: false, lowerRope: false, offsetRope: false, lowPearl: false, fleur: false, curtain: true,  anchorPearl: true, topFleur: false },
  };
  const flags = VARIANT_FLAGS[variant] || VARIANT_FLAGS.classic;
  const showRosette = flags.rosette;
  const showTopRopes = flags.topRopes;
  const showLowerRope = flags.lowerRope;
  const showOffsetRope = flags.offsetRope;
  const showLowPearl = flags.lowPearl;
  const showFleur = flags.fleur;
  const showCurtain = flags.curtain;
  const showTopFleur = flags.topFleur;
  const showAnchorPearl = flags.anchorPearl;

  // 'doubleBand' and 'tripleBand' repeat 'noRopes'-style visible elements
  // (see the table above) at several vertical offsets within this same
  // group — 2 bands for doubleBand, 3 for tripleBand — each also carrying
  // its own topFleur/bottomFleur (see below) rather than sharing one
  // flag from VARIANT_FLAGS the way every other variant does, since a
  // multi-band stack needs different fleur treatment per band, not the
  // same treatment applied uniformly to all of them.
  //
  // Every band except the first also carries an angular phase shift of
  // half a segment (anglePerSegment / 2) relative to the one above it —
  // without it, a lower row's rosettes stack directly beneath the row
  // above instead of landing at its swag centers. tripleBand alternates
  // the shift back to 0 for its third band, continuing the same zigzag a
  // real swag chain would (0, +half, +0, ...) rather than drifting further
  // sideways with each row, matching the reference sketch's third row
  // realigning with the first. midAngle/nextAngle are both derived from
  // currentAngle inside the per-segment loop below, so each band's own
  // angleOffset automatically carries through to its curtain's rotation
  // too, not just its anchors.
  //
  // topFleur (new, per band) is the same upward-pointing fleur-de-lis used
  // for 'noRosette' (see "2b. Top Fleur-de-lis" below) — it fills the gap
  // between a band and the one above it, so it's skipped for each stack's
  // own top band (nothing above that needs filling) and set for every
  // band below the first. bottomFleur is the standard hanging fleur (see
  // "2. Fleur-de-lis" below) — set only for the LAST band in a stack, to
  // match the reference sketch's small drips hanging below its bottom row
  // only, not every row.
  //
  // 'noRosette' now uses this same 2-band mechanism too (see the ternary
  // below) — its own visible elements (rope1/rope2, the pulled-in ball,
  // rope3, the offset rope, the low pearl) all repeat automatically for
  // each band, since the whole per-segment loop already runs once per
  // band regardless of which variant it is. Neither band carries
  // topFleur/bottomFleur, since noRosette's own fleur/topFleur flags are
  // both false anyway.
  //
  // BAND_SPACING controls how far down each subsequent band sits. The
  // fleur's teardrops reach lower than anything else in a band, so
  // removing fleur shrinks a single band's own vertical footprint a lot —
  // 1.05×H (sized for a band that still had fleur) pushed a second band
  // off the cake body; 0.62×H still left it further below the swag above
  // it than the reference showed. 0.36×H brought doubleBand's second band
  // in close enough to sit near the swag's own lowest dip point, and
  // tripleBand reuses the same spacing for its third band — untested
  // beyond two bands, so worth checking it still lands on the cake body
  // once rendered.
  const BAND_SPACING = 0.36; // × H — how far down each subsequent band sits; tune here if bands land too close/far apart or run off the cake body
  // noRosette's own band reaches much lower than doubleBand/tripleBand's
  // noRopes-style bands do — rope3 and the offset rope both stretch all
  // the way down to the low pearl (see their sections further below), not
  // just a compact rosette+curtain. Stacking a second full band that deep
  // at the same 0.36×H spacing pushed its lowest points past the tier and
  // onto the plate. A smaller, dedicated spacing keeps the second band's
  // reach within the tier instead.
  const NOROSETTE_BAND_SPACING = 0.20; // × H — tune here if the second band still overflows, or sits too close to the first
  // tripleBand now renders only 2 bands (its 3rd/bottommost band was
  // removed) — top band and middle band, same half-segment phase stagger
  // between them as before. The top band previously had neither topFleur
  // nor bottomFleur, so its own curtain rim had no fleur-de-lis at all;
  // it now gets topFleur too, matching the middle band, instead of being
  // the one band left bare.
  const bands = isTripleBand
    ? [
        { yOffset: 0,                      angleOffset: 0,                     topFleur: true,  bottomFleur: false },
        { yOffset: -H * BAND_SPACING,       angleOffset: anglePerSegment / 2,   topFleur: true,  bottomFleur: false },
      ]
    : isDoubleBand
    ? [
        { yOffset: 0, angleOffset: 0, topFleur: false, bottomFleur: false },
        { yOffset: -H * BAND_SPACING, angleOffset: anglePerSegment / 2, topFleur: false, bottomFleur: false },
      ]
    : isNoRosette
    ? [
        { yOffset: 0, angleOffset: 0, topFleur: false, bottomFleur: false },
        { yOffset: -H * NOROSETTE_BAND_SPACING, angleOffset: anglePerSegment / 2, topFleur: false, bottomFleur: false },
      ]
    : [{ yOffset: 0, angleOffset: 0, topFleur: showTopFleur, bottomFleur: showFleur }];

  // ------------------------------------------------------
  // GEOMETRY GENERATORS
  // ------------------------------------------------------

  // A. Compact Swirl Disc / Rosette with Prominent Side Leaves
  function createSwirlDisc({
    thickness = 0.12,
    petalCount = 10,
    spiralTwistDeg = 35,
    startAngleDeg = 45,
    petalLength = 0.14,
    petalWidth = 0.30,
    petalCurl = 0.85,
    centerOverlap = 0.03,
    sideLeafLength = 0.45,
    sideLeafWidth = 0.48,
    sideLeafCurl = 0.12,
    sideLeafThickness = 0.12,  // Volumetric body depth — gives the leaf real 3D mass
    sideLeafOffsetZ = 0.00, // Positive: leaves sit in FRONT of cake wall
    widthSegments = 14,
    heightSegments = 10
  } = {}) {
    const group = new THREE.Group();
    const startAngle = THREE.MathUtils.degToRad(startAngleDeg);

    function createPetalGeometry(l, w, c) {
      const geometry = new THREE.SphereGeometry(1, widthSegments, heightSegments);
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);
        const t = (y + 1) * 0.5;
        const taper = Math.min(2, t / 1.2);
        x *= taper; y *= taper;
        x *= w; y *= l; z *= thickness;
        const curlAmount = c * t * t;
        x += curlAmount * l * 0.1;
        pos.setX(i, x); pos.setY(i, y); pos.setZ(i, z);
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
      return geometry;
    }

    const petalGeometry = createPetalGeometry(petalLength, petalWidth, petalCurl);
    for (let i = 0; i < petalCount; i++) {
      const angle = startAngle + (i / petalCount) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeometry, icingMat);
      petal.position.set(
        Math.cos(angle) * centerOverlap,
        Math.sin(angle) * centerOverlap,
        thickness * 0.5 + 0.02
      );
      petal.rotation.z = angle - Math.PI / 2 + THREE.MathUtils.degToRad(spiralTwistDeg);
      group.add(petal);
    }

    function createLeafGeometry({
      l = sideLeafLength,
      maxW = sideLeafWidth,
      c = sideLeafCurl,
      leafThickness = sideLeafThickness,
      veinH = 0.022,
      lSegs = 28,
      wSegs = 14
    } = {}) {
      // Builds a fully volumetric 3D leaf with:
      //  • Front face: convex lens cross-section (bulges outward) + central midrib ridge
      //  • Back face:  slightly concave (–30 % of lens offset) for a realistic thinning edge
      //  Both faces share the same XY silhouette; computeVertexNormals produces smooth shading.
      const positions = [];
      const indices = [];

      // ── Front surface ────────────────────────────────────────────
      for (let i = 0; i <= lSegs; i++) {
        const u = i / lSegs;
        // Silhouette: tapers to zero at base (u=0) and tip (u=1),
        // broadest around u≈0.4 for a natural leaf shape
        const widthProfile = Math.sin(Math.PI * Math.pow(u, 0.55));
        const halfW = maxW * 0.5 * widthProfile;
        // Tip curl: the leaf edge lifts gently forward
        const curlZ = c * u * u;
        const yPos = u * l;
        // Thickness follows the width so the leaf tapers to zero at base and tip
        const halfThick = leafThickness * 0.5 * widthProfile;

        for (let j = 0; j <= wSegs; j++) {
          const v = j / wSegs;
          const xNorm = (v - 0.5) * 2; // –1 (left edge) → +1 (right edge)
          const xPos = xNorm * halfW;
          // Convex lens: maximum Z at centerline, tapers to zero at edges
          const lensZ = Math.sqrt(Math.max(0, 1 - xNorm * xNorm)) * halfThick;
          // Midrib vein: narrow raised ridge along the centre axis
          const midrib = veinH * Math.max(0, 1 - xNorm * xNorm * 5) * widthProfile;
          positions.push(xPos, yPos, curlZ + lensZ + midrib);
        }
      }

      // Front face triangles (CCW winding → normals +Z)
      for (let i = 0; i < lSegs; i++) {
        for (let j = 0; j < wSegs; j++) {
          const a = i * (wSegs + 1) + j;
          const b = a + 1;
          const cc = a + (wSegs + 1);
          const d = cc + 1;
          indices.push(a, b, cc);
          indices.push(b, d, cc);
        }
      }

      // ── Back surface ─────────────────────────────────────────────
      const frontCount = (lSegs + 1) * (wSegs + 1);
      for (let i = 0; i <= lSegs; i++) {
        const u = i / lSegs;
        const widthProfile = Math.sin(Math.PI * Math.pow(u, 0.55));
        const halfW = maxW * 0.5 * widthProfile;
        const curlZ = c * u * u;
        const yPos = u * l;
        const halfThick = leafThickness * 0.5 * widthProfile;

        for (let j = 0; j <= wSegs; j++) {
          const v = j / wSegs;
          const xNorm = (v - 0.5) * 2;
          const xPos = xNorm * halfW;
          const lensZ = Math.sqrt(Math.max(0, 1 - xNorm * xNorm)) * halfThick;
          // Back face is gently concave (inset by 30 % of front lens depth)
          positions.push(xPos, yPos, curlZ - lensZ * 0.3);
        }
      }

      // Back face triangles (reversed winding → normals –Z, facing inward)
      for (let i = 0; i < lSegs; i++) {
        for (let j = 0; j < wSegs; j++) {
          const a = frontCount + i * (wSegs + 1) + j;
          const b = a + 1;
          const cc = a + (wSegs + 1);
          const d = cc + 1;
          indices.push(a, cc, b);
          indices.push(b, cc, d);
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    }

    const sideLeafGeometry = createLeafGeometry({});
    const sideAngles = [Math.PI, 0];
    const leafAttachOverlap = 0.04;

    for (const leafAngle of sideAngles) {
      const leaf = new THREE.Mesh(sideLeafGeometry, icingMat);
      leaf.position.set(
        -Math.cos(leafAngle) * leafAttachOverlap,
        -Math.sin(leafAngle) * leafAttachOverlap,
        sideLeafOffsetZ
      );
      leaf.rotation.z = leafAngle - Math.PI / 2;
      group.add(leaf);
    }
    return group;
  }

  // B. Anchor Node Assembly
  function buildAnchorNode() {
    const group = new THREE.Group();
    // Rosette & Leaves (R_anchor already provides 0.025 standoff from cake
    // surface). This whole swirl disc (the spiral petals plus its two side
    // leaves) is "the petals" — skipped for both 'noRosette' and 'ropesOnly'.
    if (showRosette) {
      const swirl = createSwirlDisc();
      swirl.scale.set(1.6, 1.6, 1.6);
      swirl.position.z = 0; // Sits flush at the anchor standoff position
      group.add(swirl);
    }

    // Main Pearl — a standalone decorative accent, not positioned at any
    // rope's own endpoint (unlike the low pearl further down), so it's
    // removed for 'ropesOnly' along with the rest of the anchor assembly.
    if (showAnchorPearl) {
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(ANCHOR_PEARL_RADIUS, 16, 16), pearlMat);
      pearl.position.set(0, -0.08 * H, 0.10);
      group.add(pearl);
    }

    return group;
  }

  // C. Compact Fleur-de-lis Motif with Inverted Piped Teardrops (Fat Base Top, Sharp Tip Bottom)
  function buildFleurDeLis() {
    const group = new THREE.Group();
    group.scale.set(2.0, 2.0 * verticalScale, 2.0);

    const teardropGeo = createTeardropGeometry(0.045, 1.8, 0.7);

    // Center Teardrop (fat top, pointing down to a sharp tip)
    const center = new THREE.Mesh(teardropGeo, icingMat);
    center.position.set(0, -0.02, 0);
    group.add(center);

    // Left Teardrop (fat top, flared out)
    const left = new THREE.Mesh(teardropGeo, icingMat);
    left.position.set(-0.06, -0.12, 0);
    left.rotation.z = Math.PI / 10;
    group.add(left);

    // Right Teardrop (fat top, flared out)
    const right = new THREE.Mesh(teardropGeo, icingMat);
    right.position.set(0.06, -0.12, 0);
    right.rotation.z = -Math.PI / 10;
    group.add(right);

    return group;
  }

  // D. ONE Clean Single-Piece Volumetric 3D Curtain Geometry
  function createSinglePieceVolumetricCurtainGeometry(arcAngle, curtainHeight = 0.18 * H, sag = 0.22 * H, wallThickness = 0.09) {
    const segmentsX = 64;
    const segmentsY = 24;
    const geometry = new THREE.BoxGeometry(1, 1, wallThickness, segmentsX, segmentsY, 4);
    const pos = geometry.attributes.position;
    const halfW = 0.5;

    for (let i = 0; i < pos.count; i++) {
      let xLocal = pos.getX(i);
      let yLocal = pos.getY(i);
      let zLocal = pos.getZ(i);

      // u from 0 (left) to 1 (right)
      const u = (xLocal + halfW);
      // v from 0 (top) to 1 (bottom)
      const v = 0.5 - yLocal;

      const theta = (u - 0.5) * arcAngle;
      const nx = (u - 0.5) * 2;

      // Sag curve
      const drop = -sag * (1 - nx * nx);

      // Y position
      let newY = (0.5 - v) * curtainHeight + drop;

      // 3D Volumetric Profile:
      const topTaper = Math.sin(v * Math.PI * 0.5);
      const bellyVolume = Math.sin(v * Math.PI) * 0.07;
      const rolledHemBulb = Math.pow(v, 3.0) * 0.05;

      const depthScale = (0.3 + 0.7 * topTaper);
      let rOffset = (bellyVolume + rolledHemBulb);

      // Soft vertical fold pleating along U
      const pleatFold = 0.012 * Math.sin(u * Math.PI * 6.0) * Math.sin(v * Math.PI);
      rOffset += pleatFold;

      const currRadius = R_curtain + rOffset + (zLocal * depthScale);
      const x = currRadius * Math.sin(theta);
      const z = currRadius * Math.cos(theta);

      pos.setXYZ(i, x, newY, z);
    }

    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }

  // ------------------------------------------------------
  // ASSEMBLY PIPELINE
  // ------------------------------------------------------

  // Single Clean Volumetric 3D Curtain Drape Geometry — only built at all
  // when at least one segment will actually use it. Shared across bands
  // (its own Y is applied per-mesh via curtainMesh.position.y below, not
  // baked into the geometry), so it's still built only once even for
  // 'doubleBand'.
  const curtainGeoSingle = showCurtain
    ? createSinglePieceVolumetricCurtainGeometry(
        anglePerSegment,
        isTripleBand ? 0.14 * H : 0.12 * H,
        isTripleBand ? 0.32 * H : 0.22 * H,
        0.09
      )
    : null;

  // Outer loop over vertical bands — a single {yOffset:0, angleOffset:0}
  // entry for every existing variant (so their output is identical to
  // before this existed), two entries only for 'doubleBand' (see `bands`
  // above).
  //
  // TOP_LIFT nudges a design up a little as a whole — applied here, at
  // bandYOffset, because every Y position throughout this file (anchor,
  // curtain, every rope tier, every pearl, every fleur) is built as some
  // fraction of H plus bandYOffset, so this one hook raises all of them
  // together. Scoped to 'noRosette' and 'ropesOnly' only — those are the
  // two that needed it; 'classic', 'noRopes', 'doubleBand', and
  // 'tripleBand' are back to their original, unlifted positions.
  const applyTopLift = isNoRosette || variant === 'ropesOnly';
  const TOP_LIFT = 0.05; // × H — "a little"; raise/lower this if it needs more or less
  for (const band of bands) {
  const bandYOffset = band.yOffset + (applyTopLift ? TOP_LIFT * H : 0);
  const angleOffset = band.angleOffset;
  const bandTopFleur = band.topFleur;
  const bandBottomFleur = band.bottomFleur;
  for (let i = 0; i < segmentCount; i++) {
    const currentAngle = i * anglePerSegment + angleOffset;
    const nextAngle = (i + 1) * anglePerSegment + angleOffset;
    const midAngle = currentAngle + anglePerSegment / 2;

    // 1. Anchor Node at currentAngle (rosette and/or anchor pearl,
    // depending on flags — buildAnchorNode gates each internally).
    if (showRosette || showAnchorPearl) {
      const anchor = buildAnchorNode();
      // Variants with top ropes (classic, ropesOnly — the only two with
      // showTopRopes true) pull the ball in toward the cake wall (reduced
      // standoff) instead of the default R_anchor, and drop it by
      // ROPES_ONLY_EXTRA_DROP so it stays vertically centered on
      // rope1/rope2's endpoints below instead of sitting at its default
      // height while the ropes sit lower. Gated on showTopRopes rather
      // than a variant name so classic and ropesOnly — copies of each
      // other structurally — automatically get the identical treatment.
      // Every other variant keeps the original R_anchor and Y untouched.
      const anchorR = showTopRopes ? R_anchor - 0.08 : R_anchor;
      const anchorYOffset = showTopRopes ? -ROPES_ONLY_EXTRA_DROP * H : 0;
      anchor.position.set(anchorR * Math.sin(currentAngle), 0.42 * H + bandYOffset + anchorYOffset, anchorR * Math.cos(currentAngle));
      anchor.rotation.y = currentAngle;
      masterGroup.add(anchor);
    }

    // 2. Fleur-de-lis & Vertical Drops at currentAngle
    if (bandBottomFleur) {
      const motifY = -0.12 * H + bandYOffset;
      const fleur = buildFleurDeLis();
      fleur.position.set(R_fleur * Math.sin(currentAngle), motifY, R_fleur * Math.cos(currentAngle));
      fleur.rotation.y = currentAngle;
      masterGroup.add(fleur);
    }

    // 2b. Top Fleur-de-lis at midAngle — fills the gap that's otherwise
    // empty above this band (used for 'noRosette', and for the lower
    // bands of 'tripleBand' — see `bands` above for which bands get it):
    // same motif as step 2, duplicated, moved up near the anchor pearls,
    // and placed at the angular stagger (midAngle, the same offset the
    // low pearl and offset rope already use elsewhere in this file)
    // instead of currentAngle, so it sits centered in the gap between two
    // anchors rather than overlapping one of them.
    //
    // buildFleurDeLis()'s teardrops point down (fat top, sharp tip down)
    // by construction — right for hanging below the curtain, wrong for
    // sitting up in this top gap, so it needs to point up instead. A
    // single rotation.z=PI on the fleur itself won't do that correctly at
    // every angle: combining rotation.y and rotation.z on ONE object composes
    // the flip around world Z, not the motif's own local depth axis, which
    // only looks right at one or two angles around the cake and faces the
    // wrong way (into the cake) everywhere else. Flipping the fleur INSIDE
    // its own wrapper group first, then rotating that wrapper around Y for
    // radial placement — exactly like every other element here — keeps the
    // flip in the motif's own local frame regardless of angle, so it
    // faces outward correctly all the way around.
    if (bandTopFleur) {
      const topFleurY = 0.32 * H + bandYOffset;
      const topFleur = buildFleurDeLis();
      topFleur.rotation.z = Math.PI; // flip pointing-down to pointing-up, in its own local frame
      const topFleurWrapper = new THREE.Group();
      topFleurWrapper.add(topFleur);
      topFleurWrapper.position.set(R_fleur * Math.sin(midAngle), topFleurY, R_fleur * Math.cos(midAngle));
      topFleurWrapper.rotation.y = midAngle;
      masterGroup.add(topFleurWrapper);
    }

    // const archPearl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), pearlMat);
    // archPearl.position.set(R_pearl * Math.sin(currentAngle), -0.33 * H, R_pearl * Math.cos(currentAngle));
    // masterGroup.add(archPearl);

    // const bottomDrop = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), icingMat);
    // bottomDrop.position.set(R_pearl * Math.sin(currentAngle), -0.39 * H, R_pearl * Math.cos(currentAngle));
    // masterGroup.add(bottomDrop);

    // 3. ONE Clean Solid 3D Volumetric Curtain Mesh
    if (showCurtain && curtainGeoSingle) {
      const curtainMesh = new THREE.Mesh(curtainGeoSingle, icingMat);
      curtainMesh.rotation.y = midAngle;
      curtainMesh.position.y = 0.28 * H + bandYOffset;
      masterGroup.add(curtainMesh);
    }

    // 4. Secondary Piped Ropes (Exposed on top of and across the single curtain drape)
    const ropeRadius = 0.035;

    // Top Rope Tier and Middle Rope Tier are skipped for 'noRosette',
    // 'noRopes', and 'doubleBand' — rope1 starts at this same currentAngle
    // the rosette sits at (i.e. it's "the rope connected to" the petals),
    // and rope2 sits directly below rope1. They're kept for 'ropesOnly'
    // (see VARIANT_FLAGS above) since that variant is specifically the
    // ropes plus whatever's connected to them, including the anchor pearl.
    //
    // Both tiers sit low enough that rope2 (the closer one) lands exactly
    // at the anchor pearl's own world Y — the pearl is built at
    // (0.42*H anchor base) + (-0.08*H local offset) = 0.34*H, but rope2 was
    // sitting at 0.40*H and rope1 at 0.46*H: both well above the pearl,
    // reading as floating on top of it rather than connected to it
    // (most visible in 'ropesOnly', where the pearl has no rosette above
    // it to visually bridge that gap).
    if (showTopRopes) {
      // This block runs for whichever variants have showTopRopes true —
      // currently 'classic' and 'ropesOnly', which are now the same
      // design structurally (classic = ropesOnly + rosette; see
      // VARIANT_FLAGS above), so both get identical rope treatment here.
      // Root cause of the "adjust up, adjust down, one rope always pokes
      // out" problem: the gap between rope1 and rope2 was 0.06*H — scaled
      // with tier height — while the ball's own radius (ANCHOR_PEARL_RADIUS,
      // 0.16) is a FIXED real-world size that never scales with H. Once
      // 0.06*H exceeds what fits inside a 0.16-radius ball, no vertical
      // shift of the pair as a whole can contain both ropes at once —
      // moving them up always eventually pushes rope1 out the top, moving
      // them down always eventually pushes rope1 (or rope2) out the
      // bottom, exactly as described. The actual fix has to shrink the
      // gap itself, not reposition it: ROPE_GAP is now a fraction of the
      // ball's own fixed radius, so both ropes stay inside the ball by
      // construction regardless of what H turns out to be.
      const ROPE_GAP = ANCHOR_PEARL_RADIUS * 0.4; // fixed units, not × H — tune the 0.4 fraction here if still too tight/loose
      const ropesOnlyBallCenterY = 0.34 * H - ROPES_ONLY_EXTRA_DROP * H;
      const rope2Y = ropesOnlyBallCenterY + bandYOffset;
      const rope1Y = ropesOnlyBallCenterY + ROPE_GAP + bandYOffset;
      const rope1Sag = 0.15 * H;
      const rope2Sag = 0.22 * H;

      // Top Rope Tier (rope1 - Top Border Piping Line framing top curtain rim)
      const rope1 = new PolarRopeCurve(R_rope1, currentAngle, nextAngle, rope1Y, rope1Y, rope1Sag, 0.018);
      const ropeMesh1 = buildStarTipRopeMesh(rope1, 64, ropeRadius, 12, icingMat);
      masterGroup.add(ropeMesh1);

      // Middle Rope Tier (rope2 - Middle Border Piping Line riding on front curtain belly)
      const rope2 = new PolarRopeCurve(R_rope2, currentAngle, nextAngle, rope2Y, rope2Y, rope2Sag, 0.022);
      const ropeMesh2 = buildStarTipRopeMesh(rope2, 64, ropeRadius, 12, icingMat);
      masterGroup.add(ropeMesh2);
    }

    // lowPearlY is needed by both rope3 (below) and the offset rope
    // (step 6), so it's computed once here regardless of whether the
    // pearl mesh itself gets built.
    const lowPearlY = -0.16 * H + bandYOffset;
    const lowPearlR = R_pearl + 0.04;

    // Lower Rope Tier (rope3 - Deep loop below curtain) — removed for
    // 'noRopes' and 'doubleBand' along with every other rope tier and the
    // low pearl.
    if (showLowerRope) {
      // classic/noRosette (the only two variants where lowerRope AND
      // curtain are both active — ropesOnly has curtain:false) sat rope3
      // at the same Y as the curtain's own base, which buried it inside
      // the curtain's volume instead of reading as a visible piped rope.
      // Raised closer to the anchor pearl's height so it clears the
      // curtain and is actually visible. Scoped to showCurtain (the
      // actual cause), not a variant name — 'classic' is the only
      // variant this still applies to now that noRosette's curtain is
      // off (see VARIANT_FLAGS above).
      const rope3Y = (showCurtain ? 0.38 * H : 0.28 * H) + bandYOffset;
      // Stretched to reach the low pearl below, the same "touching, not
      // just overlapping" treatment used for ropesOnly's top ropes and
      // the ball. Derived directly from the actual gap to lowPearlY
      // rather than a fixed guessed sag, so it stays correct regardless
      // of H, bandYOffset, or whether the curtain raise applies. The
      // earlier noRosette-only 60% dial-back is gone — that exception
      // existed only because noRosette had a curtain for the rope to
      // over-extend past; now that noRosette is an exact copy of
      // ropesOnly (no curtain), it gets the same full reach ropesOnly
      // always used.
      const rope3Sag = rope3Y - lowPearlY;
      const rope3 = new PolarRopeCurve(R_rope3, currentAngle, nextAngle, rope3Y, rope3Y, rope3Sag, 0.015);
      const ropeMesh3 = buildStarTipRopeMesh(rope3, 64, ropeRadius, 12, icingMat);
      masterGroup.add(ropeMesh3);
    }

    // 5. Lowest Swag Intersection Pearl — it sits exactly at the offset
    // rope's own start point (see step 6) and right where rope3 sags to
    // its lowest point, so it reads as "a circle connected to the ropes"
    // rather than a standalone decorative accent like the anchor's pearl
    // above. Kept for 'ropesOnly', removed for 'noRopes'/'doubleBand'.
    if (showLowPearl) {
      const lowPearl = new THREE.Mesh(new THREE.SphereGeometry(0.10, 16, 16), pearlMat);
      lowPearl.position.set(lowPearlR * Math.sin(midAngle), lowPearlY, lowPearlR * Math.cos(midAngle));
      masterGroup.add(lowPearl);
    }

    // 6. Out-of-Phase Offset Archwork Rope Tier — removed for
    // 'noRopes'/'doubleBand'.
    if (showOffsetRope) {
      const nextMidAngle = midAngle + anglePerSegment;
      const offsetRope = new PolarRopeCurve(R_rope3, midAngle, nextMidAngle, lowPearlY, lowPearlY, 0.22 * H, 0.015);
      const offsetRopeMesh = buildStarTipRopeMesh(offsetRope, 64, ropeRadius, 12, icingMat);
      masterGroup.add(offsetRopeMesh);
    }
  }
  }

  return masterGroup;
}