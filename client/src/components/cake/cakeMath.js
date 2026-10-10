// ---------------------------------------------------------------------------
// Seeded deterministic PRNG (mulberry32) — keeps the cake visuals stable
// across re-renders triggered by unrelated config changes.
// ---------------------------------------------------------------------------
export function makePRNG(seed) {
  let s = seed >>> 0;
  return function rand() {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0xFFFFFFFF;
  };
}

export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Cheap 3D hash → pseudo-random value in [0,1) */
export function hash31(x, y, z) {
  const n = Math.sin(x * 113.5 + y * 271.9 + z * 124.6) * 43758.5453123;
  return n - Math.floor(n);
}

/** Trilinear-interpolated value noise over a 3D lattice, smoothstepped. */
export function valueNoise3D(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf), sz = zf * zf * (3 - 2 * zf);
  const h = (dx, dy, dz) => hash31(xi + dx, yi + dy, zi + dz);
  const x00 = h(0, 0, 0) + (h(1, 0, 0) - h(0, 0, 0)) * sx;
  const x10 = h(0, 1, 0) + (h(1, 1, 0) - h(0, 1, 0)) * sx;
  const x01 = h(0, 0, 1) + (h(1, 0, 1) - h(0, 0, 1)) * sx;
  const x11 = h(0, 1, 1) + (h(1, 1, 1) - h(0, 1, 1)) * sx;
  const y0 = x00 + (x10 - x00) * sy, y1 = x01 + (x11 - x01) * sy;
  return y0 + (y1 - y0) * sz;
}

/**
 * Stochastic, non-directional surface noise sampled around a cos/sin
 * cylindrical embedding — no seam at the 0/2π wrap, no preferred direction.
 * Fresh seed per build so no two cakes share the same pattern.
 */
export function fbmSurfaceNoise(angle, y, seed) {
  const octaves = [
    { ringR: 1.4, kz: 0.6, amp: 0.55 },
    { ringR: 3.0, kz: 1.3, amp: 0.30 },
    { ringR: 6.5, kz: 2.2, amp: 0.15 },
  ];
  let total = 0, maxAmp = 0;
  for (const o of octaves) {
    const cx = Math.cos(angle) * o.ringR + seed;
    const cy = Math.sin(angle) * o.ringR + seed * 1.7;
    const cz = y * o.kz + seed * 0.6;
    total += (valueNoise3D(cx, cy, cz) * 2 - 1) * o.amp;
    maxAmp += o.amp;
  }
  return total / maxAmp;
}

export function applySurfaceIrregularity(geo, baseRadius, amount = 0.014) {
  const pos = geo.attributes.position;
  const seed = 173.4;
  const seed2 = 861.2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.sqrt(x * x + z * z);
    if (r < 0.0001) continue;
    const angle = Math.atan2(z, x);

    // Multi-scale noise for more organic variation
    const n1 = fbmSurfaceNoise(angle, y, seed);
    const n2 = fbmSurfaceNoise(angle * 2.3, y * 1.7, seed2);

    // Height-based variation - more irregularity near top and bottom
    const normalizedY = y / (baseRadius * 0.4); // approximate height normalization
    const heightFactor = 1 + Math.abs(normalizedY) * 0.3;

    // Rim variation - more irregularity near the edges
    const rimFactor = Math.min(1, r / (baseRadius * 0.85));

    const taper = Math.min(1, r / (baseRadius * 0.2));
    const scale = 1 + amount * (n1 * 0.7 + n2 * 0.3) * taper * heightFactor * rimFactor;

    pos.setX(i, x * scale);
    pos.setZ(i, z * scale);

    // Add subtle vertical settling near top center
    if (Math.abs(y) > baseRadius * 0.35) {
      const settleAmount = 0.003 * (1 - rimFactor) * (y > 0 ? 1 : 0.5);
      pos.setY(i, y - settleAmount);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

export function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Darken an RGB triple by a factor in 0–1 */
export function dim(rgb, f) {
  return `${Math.round(rgb[0] * f)},${Math.round(rgb[1] * f)},${Math.round(rgb[2] * f)}`;
}

/** Blend two hex colors by t (0 = hexA, 1 = hexB), returns a hex string */
export function blendHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `#${[r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Calculates radial distance at angle theta to the perimeter of a rounded box
 * with half-width W, half-depth D, and corner radius rc.
 */
export function getBoxyRadius(theta, W, D, rc = 0.35) {
  let angle = theta % (Math.PI * 2);
  if (angle < 0) angle += Math.PI * 2;

  const cosT = Math.cos(angle);
  const sinT = Math.sin(angle);
  const ux = Math.abs(cosT);
  const uz = Math.abs(sinT);

  if (ux < 1e-6) return D;
  if (uz < 1e-6) return W;

  const safeRc = Math.min(rc, Math.min(W, D) * 0.45);
  const xc = Math.max(0, W - safeRc);
  const zc = Math.max(0, D - safeRc);

  const thetaEdgeX = Math.atan2(zc, W);
  const thetaEdgeZ = Math.atan2(D, xc);
  const thetaQuad = Math.atan2(uz, ux);

  if (thetaQuad <= thetaEdgeX) {
    return W / ux;
  } else if (thetaQuad >= thetaEdgeZ) {
    return D / uz;
  } else {
    const B = ux * xc + uz * zc;
    const C = xc * xc + zc * zc - safeRc * safeRc;
    const disc = B * B - C;
    if (disc >= 0) {
      return B + Math.sqrt(disc);
    }
    return Math.max(W, D);
  }
}
