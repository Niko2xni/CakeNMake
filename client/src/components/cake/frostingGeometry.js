import * as THREE from 'three';
import { GLAZE_PATTERN_CARVES } from './cakeConstants';

/**
 * Builds a continuous frosting shell with soft, beveled edges at the top and
 * bottom, and applies a low-frequency noise displacement to the vertices to
 * create an organic, hand-frosted silhouette (breaking perfect symmetry).
 */
export function buildOrganicFrostingGeometry(radius, height, topDomeHeight = 0) {
  const bevelSize = 0.15; // Soft edge radius
  const path = new THREE.Path();

  // Start at bottom center
  path.moveTo(0, 0);

  // Bottom flat cap to start of bevel
  const rBottom = radius - bevelSize;
  if (rBottom > 0) {
    path.lineTo(rBottom, 0);
  }

  // Bottom bevel
  path.quadraticCurveTo(radius, 0, radius, bevelSize);

  // Straight side up to top bevel
  path.lineTo(radius, height - bevelSize);

  // Top bevel
  path.quadraticCurveTo(radius, height, radius - bevelSize, height);

  // Top cap to center, with optional dome
  if (topDomeHeight > 0) {
    path.quadraticCurveTo(
      (radius - bevelSize) / 2, height + topDomeHeight,
      0, height + topDomeHeight
    );
  } else {
    path.lineTo(0, height);
  }

  // Generate LatheGeometry (48 radial segments)
  const geo = new THREE.LatheGeometry(path.getPoints(8), 48);

  // Apply subtle organic wobble to the outer vertices
  const posAttribute = geo.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < posAttribute.count; i++) {
    vertex.fromBufferAttribute(posAttribute, i);

    // Only displace vertices near the outer radius
    const distSq = vertex.x * vertex.x + vertex.z * vertex.z;
    if (distSq > (radius * 0.5) * (radius * 0.5)) {
      const angle = Math.atan2(vertex.z, vertex.x);

      // Low-frequency sine/cosine wobble
      const wobble =
        Math.sin(angle * 3 + vertex.y * 2) * 0.02 +
        Math.cos(angle * 5 - vertex.y * 1.5) * 0.015;

      const dist = Math.sqrt(distSq);
      const newDist = dist + wobble;

      vertex.x = (vertex.x / dist) * newDist;
      vertex.z = (vertex.z / dist) * newDist;

      posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }

  geo.computeVertexNormals();
  return geo;
}

export function quadBezier2(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

export function makeRidgeProfileFn(height, ridgeAmplitude, ridgeSpacing, shapePow, minRidgeCount) {
  const bevelSize = 0.15;
  const sideStart = bevelSize;
  const sideEnd = height - bevelSize;
  const sideSpan = Math.max(sideEnd - sideStart, 0.001);
  const ridgeCount = Math.max(minRidgeCount, Math.round(sideSpan / ridgeSpacing));
  const smoothstep = (edge0, edge1, t) => {
    const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
  };
  return (y) => {
    const t = (y - sideStart) / sideSpan;
    if (t < 0 || t > 1) return 0;
    const edgeFade = smoothstep(0, 0.08, t) * (1 - smoothstep(0.92, 1, t));
    const base = Math.sin(t * Math.PI * 2 * ridgeCount) * 0.5 + 0.5;
    const shaped = shapePow > 1 ? Math.pow(base, shapePow) : base;
    return shaped * ridgeAmplitude * edgeFade;
  };
}

export function computeRidgeCount(height, ridgeSpacing, minRidgeCount) {
  const bevelSize = 0.15;
  const sideSpan = Math.max(height - bevelSize * 2, 0.001);
  return Math.max(minRidgeCount, Math.round(sideSpan / ridgeSpacing));
}

export function buildGlazeGeometry(radius, height, topDomeHeight, rand, opts = {}) {
  const {
    coatThickness = 0.06,
    ridgeProfileFn = null,
    capLift = 0.05,
    sideSamples = 48,
    ridgeHugStrength = 1,
    edgeFadeDist = 0.4,
  } = opts;

  const bevelSize = 0.15;
  const H = height + capLift;

  const capRadius = radius + coatThickness;
  const A = { x: capRadius, y: H - bevelSize };
  const bevelCtrl = { x: capRadius, y: H };
  const B = { x: capRadius - bevelSize, y: H };
  const topProfile = [];
  if (topDomeHeight > 0) {
    const domeCtrl = { x: (capRadius - bevelSize) / 2, y: H + topDomeHeight };
    const apex = { x: 0, y: H + topDomeHeight };
    const domeSamples = 20;
    for (let s = domeSamples; s >= 0; s--) {
      topProfile.push(quadBezier2(B, domeCtrl, apex, s / domeSamples));
    }
  } else {
    topProfile.push({ x: 0, y: H });
  }
  const bevelSamples = 10;
  for (let s = 1; s <= bevelSamples; s++) {
    topProfile.push(quadBezier2(B, bevelCtrl, A, s / bevelSamples));
  }
  const topProfileLen = topProfile.length;

  const carve = opts.carve || {};
  let carveYFracAt;
  let angularCycles;
  if (carve.wave) {
    const baseFrac = carve.baseFrac ?? 0.5;
    const ampFrac = carve.ampFrac ?? 0.05;
    const waveCount = carve.lobeCount ?? (10 + Math.floor(rand() * 3));
    const phase = rand() * Math.PI * 2;
    carveYFracAt = (angle) => baseFrac + ampFrac * Math.sin(angle * waveCount + phase);
    angularCycles = waveCount;
  } else {
    const deepFrac = carve.deepFrac ?? 0.85;
    const shortFrac = carve.shortFrac ?? 0.25;
    const cyclePattern = carve.cyclePattern || [deepFrac, shortFrac];
    const lobeSpacing = carve.lobeSpacing || 1.0;
    const approxLobeCount = (2 * Math.PI * radius) / lobeSpacing;
    const stepCount = cyclePattern.length;
    const fullCycles = Math.max(1, Math.round(approxLobeCount / stepCount));
    const totalLobes = fullCycles * stepCount;
    angularCycles = totalLobes;
    const smoothstep = (edge0, edge1, t) => {
      const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
      return x * x * (3 - 2 * x);
    };
    carveYFracAt = (angle) => {
      const u = (angle / (Math.PI * 2)) * totalLobes;
      const i0 = Math.floor(u);
      const frac = u - i0;
      const d0 = cyclePattern[((i0 % stepCount) + stepCount) % stepCount];
      const d1 = cyclePattern[(((i0 + 1) % stepCount) + stepCount) % stepCount];
      const blend = smoothstep(0, 1, frac);
      return d0 + (d1 - d0) * blend;
    };
  }

  const angularSamplesPerCycle = 16;
  const segments = Math.max(96, Math.min(256, angularCycles * angularSamplesPerCycle));

  const rowsPerColumn = topProfileLen + sideSamples;
  const positions = [];
  const uvs = [];
  const indices = [];

  const smoothstep = (edge0, edge1, t) => {
    const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
  };

  // Deepest point the carve reaches at ANY angle, sampled coarsely once up
  // front. Needed so every column can be walked down the same absolute
  // height ladder below (see the loop's comment) instead of each column
  // normalizing its own row index to its own depth.
  let maxCarveFrac = 0;
  const carveFracProbeSteps = 360;
  for (let i = 0; i <= carveFracProbeSteps; i++) {
    const probeAngle = (i / carveFracProbeSteps) * Math.PI * 2;
    maxCarveFrac = Math.max(maxCarveFrac, carveYFracAt(probeAngle));
  }
  const globalBottomY = A.y * (1 - maxCarveFrac);

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const uCoord = i / segments;

    for (let j = 0; j < topProfileLen; j++) {
      const p = topProfile[j];
      positions.push(p.x * cosA, p.y, p.x * sinA);
      uvs.push(uCoord, (H - p.y) / H);
    }

    const carveFrac = carveYFracAt(angle);
    const bottomY = A.y * (1 - carveFrac);

    for (let s = 1; s <= sideSamples; s++) {
      const t = s / sideSamples;
      const yGlobal = A.y - (A.y - globalBottomY) * t;
      const y = Math.max(yGlobal, bottomY);

      let r = capRadius;
      if (ridgeProfileFn && ridgeHugStrength > 0) {
        const edgeFade = smoothstep(0, edgeFadeDist, y - bottomY);
        r += ridgeProfileFn(y) * ridgeHugStrength * edgeFade;
      }

      positions.push(r * cosA, y, r * sinA);
      uvs.push(uCoord, (H - y) / H);
    }
  }

  for (let i = 0; i < segments; i++) {
    const col0 = i * rowsPerColumn;
    const col1 = (i + 1) * rowsPerColumn;
    for (let r = 0; r < rowsPerColumn - 1; r++) {
      const a = col0 + r;
      const b = col1 + r;
      const c = col0 + r + 1;
      const d = col1 + r + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function makeGlazeMaterial(colorHex) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    side: THREE.DoubleSide,
  });
}

/**
 * Textured Buttercream variant of buildOrganicFrostingGeometry (Ridged Comb).
 */
export function buildTexturedButtercreamGeometry(radius, height, topDomeHeight = 0) {
  const bevelSize = 0.15;
  const ridgeAmplitude = 0.07;
  const ridgeSpacing = 0.42;
  const path = new THREE.Path();

  path.moveTo(0, 0);

  const rBottom = radius - bevelSize;
  if (rBottom > 0) path.lineTo(rBottom, 0);

  path.quadraticCurveTo(radius, 0, radius, bevelSize);

  const sideStart = bevelSize;
  const sideEnd = height - bevelSize;
  const sideSpan = Math.max(sideEnd - sideStart, 0.001);
  const ridgeCount = Math.max(3, Math.round(sideSpan / ridgeSpacing));
  const sideSteps = Math.max(32, ridgeCount * 12);

  const smoothstep = (edge0, edge1, t) => {
    const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
  };

  for (let i = 1; i <= sideSteps; i++) {
    const t = i / sideSteps;
    const y = sideStart + sideSpan * t;
    const edgeFade = smoothstep(0, 0.08, t) * (1 - smoothstep(0.92, 1, t));
    const ridgeShape = Math.sin(t * Math.PI * 2 * ridgeCount) * 0.5 + 0.5;
    const ridge = ridgeShape * ridgeAmplitude * edgeFade;
    path.lineTo(radius + ridge, y);
  }

  path.quadraticCurveTo(radius, height, radius - bevelSize, height);

  if (topDomeHeight > 0) {
    path.quadraticCurveTo(
      (radius - bevelSize) / 2, height + topDomeHeight,
      0, height + topDomeHeight
    );
  } else {
    path.lineTo(0, height);
  }

  const geo = new THREE.LatheGeometry(path.getPoints(sideSteps + 8), 96);

  const posAttribute = geo.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < posAttribute.count; i++) {
    vertex.fromBufferAttribute(posAttribute, i);

    const distSq = vertex.x * vertex.x + vertex.z * vertex.z;
    if (distSq > (radius * 0.5) * (radius * 0.5)) {
      const angle = Math.atan2(vertex.z, vertex.x);

      const wobble =
        (Math.sin(angle * 4) * 0.5 + 0.5) * 0.01 +
        (Math.cos(angle * 6) * 0.5 + 0.5) * 0.006;

      const dist = Math.sqrt(distSq);
      const newDist = dist + wobble;

      vertex.x = (vertex.x / dist) * newDist;
      vertex.z = (vertex.z / dist) * newDist;

      posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Ribbon Wrap variant of Textured Buttercream.
 */
export function buildRibbonWrapButtercreamGeometry(radius, height, topDomeHeight = 0) {
  const bevelSize = 0.15;
  const ridgeAmplitude = 0.05;
  const ridgeSpacing = 0.26;
  const path = new THREE.Path();

  path.moveTo(0, 0);

  const rBottom = radius - bevelSize;
  if (rBottom > 0) path.lineTo(rBottom, 0);

  path.quadraticCurveTo(radius, 0, radius, bevelSize);

  const sideStart = bevelSize;
  const sideEnd = height - bevelSize;
  const sideSpan = Math.max(sideEnd - sideStart, 0.001);
  const ridgeCount = Math.max(4, Math.round(sideSpan / ridgeSpacing));
  const sideSteps = Math.max(40, ridgeCount * 14);

  const smoothstep = (edge0, edge1, t) => {
    const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
  };

  for (let i = 1; i <= sideSteps; i++) {
    const t = i / sideSteps;
    const y = sideStart + sideSpan * t;
    const edgeFade = smoothstep(0, 0.08, t) * (1 - smoothstep(0.92, 1, t));
    const bandShape = Math.pow(Math.sin(t * Math.PI * 2 * ridgeCount) * 0.5 + 0.5, 3.5);
    const ridge = bandShape * ridgeAmplitude * edgeFade;
    path.lineTo(radius + ridge, y);
  }

  path.quadraticCurveTo(radius, height, radius - bevelSize, height);

  if (topDomeHeight > 0) {
    path.quadraticCurveTo(
      (radius - bevelSize) / 2, height + topDomeHeight,
      0, height + topDomeHeight
    );
  } else {
    path.lineTo(0, height);
  }

  const geo = new THREE.LatheGeometry(path.getPoints(sideSteps + 8), 96);

  const posAttribute = geo.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < posAttribute.count; i++) {
    vertex.fromBufferAttribute(posAttribute, i);

    const distSq = vertex.x * vertex.x + vertex.z * vertex.z;
    if (distSq > (radius * 0.5) * (radius * 0.5)) {
      const angle = Math.atan2(vertex.z, vertex.x);

      const wobble =
        (Math.sin(angle * 4) * 0.5 + 0.5) * 0.008 +
        (Math.cos(angle * 6) * 0.5 + 0.5) * 0.005;

      const dist = Math.sqrt(distSq);
      const newDist = dist + wobble;

      vertex.x = (vertex.x / dist) * newDist;
      vertex.z = (vertex.z / dist) * newDist;

      posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Vertical Piping variant of Textured Buttercream.
 */
export function buildVerticalPipingButtercreamGeometry(radius, height, topDomeHeight = 0) {
  const bevelSize = 0.15;
  const path = new THREE.Path();

  path.moveTo(0, 0);

  const rBottom = radius - bevelSize;
  if (rBottom > 0) path.lineTo(rBottom, 0);

  path.quadraticCurveTo(radius, 0, radius, bevelSize);
  path.lineTo(radius, height - bevelSize);
  path.quadraticCurveTo(radius, height, radius - bevelSize, height);

  if (topDomeHeight > 0) {
    path.quadraticCurveTo(
      (radius - bevelSize) / 2, height + topDomeHeight,
      0, height + topDomeHeight
    );
  } else {
    path.lineTo(0, height);
  }

  const RADIAL_SEGMENTS = 224;
  const geo = new THREE.LatheGeometry(path.getPoints(24), RADIAL_SEGMENTS);

  const pipeCount = 32;
  const pipeAmplitude = 0.095;

  const posAttribute = geo.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < posAttribute.count; i++) {
    vertex.fromBufferAttribute(posAttribute, i);

    const distSq = vertex.x * vertex.x + vertex.z * vertex.z;
    const fullRadiusThreshold = (radius * 0.5) * (radius * 0.5);

    if (distSq > fullRadiusThreshold) {
      const angle = Math.atan2(vertex.z, vertex.x);
      const pipeShape = Math.pow(Math.sin(angle * pipeCount) * 0.5 + 0.5, 5);

      const dist = Math.sqrt(distSq);
      const fullRadius = Math.sqrt(fullRadiusThreshold);
      const radialFade = Math.min(1, Math.max(0, (dist - fullRadius) / (radius - fullRadius)));

      const ridge = pipeShape * pipeAmplitude * radialFade;
      const newDist = dist + ridge;

      vertex.x = (vertex.x / dist) * newDist;
      vertex.z = (vertex.z / dist) * newDist;

      posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }

  geo.computeVertexNormals();
  return geo;
}