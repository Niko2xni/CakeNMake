import * as THREE from 'three';

let _sharedFloralRosetteGeo = null;
const _rosetteMaterialCache = new Map();

/**
 * Generates the procedural geometry for an artisanal piped Wilton 1M star-tip floral rosette.
 * Features:
 * - 8-fluted star piping profile with sharp glossy ridges and deep shaded crevices
 * - Organic spiral swirl coil path (1.3 full turns from ruffled base to rosebud peak)
 * - Sculpted buttercream petal layers with realistic coil-step overlap
 * - Hand-piped twisted rosebud peak apex
 * - Scalloped ruffled outer petal skirt
 * - Watertight bottom base with outward-facing normals
 */
export function getSharedFloralRosetteGeometry() {
  if (_sharedFloralRosetteGeo) return _sharedFloralRosetteGeo;

  const rings = 80;      // Resolution along radial profile from peak (0) to base (1)
  const segments = 72;   // Angular resolution around the rosette
  const numFlutes = 8;   // Wilton 1M 8-point open star piping tip

  const positions = [];
  const uvs = [];
  const indices = [];

  // 1. Generate the fluted swirl dome surface
  for (let r = 0; r <= rings; r++) {
    const u = r / rings; // 0 at peak, 1 at base

    // Lush rounded dome profile curves
    const baseHeight = 0.44 * Math.pow(Math.cos(u * Math.PI * 0.5), 0.85) + 0.015;
    const baseRadius = 0.54 * Math.pow(Math.sin(u * Math.PI * 0.5), 0.75) + 0.015;

    // Organic spiral twist angle (twists more tightly towards the peak)
    const twistAngle = Math.pow(1.0 - u, 0.90) * 4.2;

    // Fluting amplitude envelope (deep in middle, delicate at peak, fanning at base)
    const fluteAmpR = 0.075 * Math.pow(Math.sin(u * Math.PI), 0.70);
    const fluteAmpY = 0.045 * Math.pow(1.0 - u, 0.80);

    // Buttercream coil step effect (overlapping ribbon layers)
    const coilStep = 0.028 * Math.sin(twistAngle + u * Math.PI) * Math.sin(u * Math.PI);

    // Center rosebud flick apex offset (delicate hand-piped curl)
    const peakCurlAmp = u < 0.14 ? 0.035 * Math.pow(1.0 - u / 0.14, 1.3) : 0;

    for (let s = 0; s <= segments; s++) {
      const v = s / segments;
      const theta = v * Math.PI * 2;

      // Swirled star fluting coordinate
      const flutedTheta = theta + twistAngle;

      // Star flute profile (sharp raised ridges + deep rounded troughs)
      const starWave = Math.cos(numFlutes * flutedTheta) - 0.35 * Math.cos(2 * numFlutes * flutedTheta);

      // Scalloped outer petal ruffles on base rim
      let petalRuffle = 0;
      if (u > 0.80) {
        const petalT = (u - 0.80) / 0.20;
        petalRuffle = 0.038 * petalT * Math.sin(6 * theta);
      }

      // Compute 3D position
      const finalR = Math.max(0.008, baseRadius + starWave * fluteAmpR + petalRuffle);
      const finalY = Math.max(0.010, baseHeight + starWave * fluteAmpY + coilStep);

      const curlX = peakCurlAmp * Math.cos(twistAngle * 2.0);
      const curlZ = peakCurlAmp * Math.sin(twistAngle * 2.0);

      const x = finalR * Math.cos(theta) + curlX;
      const z = finalR * Math.sin(theta) + curlZ;
      const y = finalY;

      positions.push(x, y, z);
      uvs.push(v, u);
    }
  }

  // 2. Generate surface indices (quads -> triangles) with outward-facing normals (CCW winding)
  const ringStride = segments + 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const curr = r * ringStride + s;
      const next = (r + 1) * ringStride + s;

      // Outward CCW winding order
      indices.push(curr, curr + 1, next);
      indices.push(curr + 1, next + 1, next);
    }
  }

  // 3. Add bottom cap to make the mesh fully watertight and solid
  const bottomCenterIndex = positions.length / 3;
  positions.push(0, 0.010, 0);
  uvs.push(0.5, 0.5);

  const baseRingStart = rings * ringStride;
  for (let s = 0; s < segments; s++) {
    const p1 = baseRingStart + s;
    const p2 = baseRingStart + s + 1;
    // Bottom facing normal
    indices.push(bottomCenterIndex, p1, p2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Shift bottom to y = 0
  geo.computeBoundingBox();
  const minY = geo.boundingBox.min.y;
  geo.translate(0, -minY, 0);

  geo.userData.sharedCache = true;
  _sharedFloralRosetteGeo = geo;
  return geo;
}

/**
 * Creates or retrieves a cached MeshPhysicalMaterial for the requested frosting/sugar color.
 * Features:
 * - Velvety whipped buttercream texture with soft gloss clearcoat
 * - Subsurface-like sheen highlighting
 * - Dynamic color tinting
 */
export function getSharedFloralRosetteMaterial(colorHex = '#FF8BA7') {
  const normHex = (colorHex || '#FF8BA7').toLowerCase();
  if (_rosetteMaterialCache.has(normHex)) {
    return _rosetteMaterialCache.get(normHex);
  }

  const baseCol = new THREE.Color(colorHex || '#FF8BA7');

  const mat = new THREE.MeshPhysicalMaterial({
    color: baseCol,
    roughness: 0.35,
    metalness: 0.0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
    sheen: 0.65,
    sheenRoughness: 0.30,
    sheenColor: baseCol.clone().offsetHSL(0, 0.08, 0.15),
  });

  mat.userData.sharedCache = true;
  _rosetteMaterialCache.set(normHex, mat);
  return mat;
}

/**
 * Builds an artisanal piped Wilton 1M star-tip Floral Rosette mesh.
 * Features:
 * - 8-fluted star piping extrusion swirl
 * - Hand-piped twisted rosebud peak
 * - Velvety whipped buttercream material with dynamic color tinting
 */
export function buildFloralRosetteMesh(x = 0, y = 0, z = 0, scale = 1.0, colorHex = '#FF8BA7') {
  const geo = getSharedFloralRosetteGeometry();
  const mat = getSharedFloralRosetteMaterial(colorHex);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.scale.set(scale, scale, scale);
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * Drop-in backwards-compatible replacement for addRosette
 */
export function addRosette(group, x, y, z, frostColor = '#FF8BA7') {
  const rosette = buildFloralRosetteMesh(x, y, z, 0.95, frostColor);
  group.add(rosette);
  return rosette;
}
