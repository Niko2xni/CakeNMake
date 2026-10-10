import * as THREE from 'three';

let _sharedBlueberryBodyGeo = null;
let _sharedBlueberryBodyMat = null;
let _sharedBlueberryPitGeo = null;
let _sharedBlueberryPitMat = null;

export function getSharedBlueberryBodyGeometry() {
  if (_sharedBlueberryBodyGeo) return _sharedBlueberryBodyGeo;

  const baseRadius = 0.26;
  const widthSegments = 40;
  const heightSegments = 32;

  const geo = new THREE.SphereGeometry(baseRadius, widthSegments, heightSegments);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);

    const r = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1.0;
    const nx = vx / r;
    const ny = vy / r;
    const nz = vz / r;

    // Angle around vertical axis
    const theta = Math.atan2(nz, nx);

    // 1. Natural oblate profile: blueberries are slightly flattened at the poles
    // and plumper around the waist/equator
    const equatorialWaist = 1.0 + 0.05 * (1.0 - ny * ny);
    const verticalFlatten = 0.88;

    // 2. Apical Calyx Cavity (Top depression where sepals sit, ny > 0.35)
    let topDepression = 0;
    if (ny > 0.35) {
      const topT = (ny - 0.35) / 0.65;
      topDepression = Math.pow(topT, 2.2) * 0.095;
    }

    // 3. Pentagonal 5-pointed Calyx Sepal Rim / Crown
    // In real blueberries, the top depression is rimmed with 5 subtle triangular sepal teeth
    let crownTooth = 0;
    if (ny > 0.55 && ny < 0.96) {
      const sepalWave = Math.max(0, Math.cos(5 * theta));
      const sepalBand = Math.sin(Math.PI * Math.max(0, Math.min(1, (ny - 0.55) / 0.41)));
      crownTooth = Math.pow(sepalWave, 1.8) * 0.024 * sepalBand;
    }

    // 4. Subtle basal stem indentation at the bottom pole (ny < -0.75)
    let bottomDimple = 0;
    if (ny < -0.75) {
      const bT = (-ny - 0.75) / 0.25;
      bottomDimple = Math.pow(bT, 2.0) * 0.022;
    }

    const modifiedR = (r - topDepression + crownTooth - bottomDimple) * equatorialWaist;

    pos.setXYZ(
      i,
      nx * modifiedR,
      ny * modifiedR * verticalFlatten,
      nz * modifiedR
    );
  }

  // Grounding adjustment: embed base subtly into frosting
  geo.computeBoundingBox();
  const minY = geo.boundingBox.min.y;
  geo.translate(0, -minY - 0.02, 0);

  geo.computeVertexNormals();
  geo.userData.sharedCache = true;
  _sharedBlueberryBodyGeo = geo;
  return geo;
}

export function getSharedBlueberryPitGeometry() {
  if (_sharedBlueberryPitGeo) return _sharedBlueberryPitGeo;

  // Tiny recessed dark pistil scar at the base of the apical crater
  const geo = new THREE.CylinderGeometry(0.04, 0.025, 0.02, 10);
  geo.userData.sharedCache = true;
  _sharedBlueberryPitGeo = geo;
  return geo;
}

export function getSharedBlueberryBodyMaterial() {
  if (_sharedBlueberryBodyMat) return _sharedBlueberryBodyMat;

  const mat = new THREE.MeshPhysicalMaterial({
    color: '#1e253d',           // Deep rich indigo/navy blue
    roughness: 0.38,             // Smooth natural fruit skin
    metalness: 0.02,
    clearcoat: 0.32,             // Delicate translucent protective fruit wax
    clearcoatRoughness: 0.28,
    sheen: 0.85,                 // Dusty powdery fruit bloom reflection
    sheenColor: new THREE.Color('#718abf'), // Frosted chalky-blue epicuticular wax bloom
    sheenRoughness: 0.40,
  });

  mat.userData.sharedCache = true;
  _sharedBlueberryBodyMat = mat;
  return mat;
}

export function getSharedBlueberryPitMaterial() {
  if (_sharedBlueberryPitMat) return _sharedBlueberryPitMat;

  const mat = new THREE.MeshStandardMaterial({
    color: '#101420',           // Deep dark shadowed calyx center
    roughness: 0.85,
    metalness: 0.0,
  });

  mat.userData.sharedCache = true;
  _sharedBlueberryPitMat = mat;
  return mat;
}

/**
 * Builds a single high-fidelity Blueberry mesh group.
 * Features:
 * - Anatomical oblate spheroid berry body with waist plumpness
 * - Apical crater depression with 5-pointed calyx sepal crown
 * - Recessed dark central calyx scar / pistil pit
 * - Soft epicuticular wax sheen (bloom) on deep indigo skin
 * - Grounded base resting flush nestled in cake frosting
 */
export function buildBlueberryMesh(x = 0, y = 0, z = 0, scale = 1.0, _rand = Math.random) {
  const root = new THREE.Group();
  root.userData.designId = 'blueberry';

  const bodyGeo = getSharedBlueberryBodyGeometry();
  const bodyMat = getSharedBlueberryBodyMaterial();
  const pitGeo = getSharedBlueberryPitGeometry();
  const pitMat = getSharedBlueberryPitMaterial();

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyMesh.userData.isBlueberryBody = true;
  root.add(bodyMesh);

  // Recessed calyx cavity pit node
  const pitMesh = new THREE.Mesh(pitGeo, pitMat);
  const pitY = bodyGeo.boundingBox ? (bodyGeo.boundingBox.max.y - 0.035) : 0.35;
  pitMesh.position.set(0, pitY, 0);
  pitMesh.castShadow = true;
  pitMesh.userData.isBlueberryBody = true;
  root.add(pitMesh);

  root.scale.set(scale, scale, scale);
  root.position.set(x, y, z);
  return root;
}

/**
 * Drop-in backwards-compatible replacement for addBlueberry
 */
export function addBlueberry(group, x, y, z, _rand = Math.random) {
  const blueberry = buildBlueberryMesh(x, y, z, 0.85, _rand);
  group.add(blueberry);
  return blueberry;
}
