import * as THREE from 'three';

let _sharedCherryBodyGeo = null;
let _sharedCherryBodyMat = null;
let _sharedCherryBasalCollarGeo = null;
let _sharedCherryStemMat = null;
let _sharedCherryTipMat = null;

export function getSharedCherryBodyGeometry() {
  if (_sharedCherryBodyGeo) return _sharedCherryBodyGeo;

  const baseRadius = 0.38;
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

    // 1. Apical stem depression at the top pole (ny > 0)
    let topIndent = 0;
    if (ny > 0.15) {
      const topFactor = Math.max(0, (ny - 0.15) / 0.85);
      topIndent = Math.pow(topFactor, 2.2) * 0.15;
    }

    // 2. Subtle bottom dimple
    let bottomIndent = 0;
    if (ny < -0.75) {
      const bFactor = Math.max(0, (-ny - 0.75) / 0.25);
      bottomIndent = Math.pow(bFactor, 2.0) * 0.035;
    }

    // 3. Heart-shaped taper (plumper upper waist, softly tapered lower half)
    const waistBulge = 1.0 + 0.10 * (1.0 - ny * ny) + 0.05 * ny;

    // 4. Longitudinal suture cleft / groove along one side (theta ~ 0)
    let cleft = 0;
    const seamDist = Math.abs(theta);
    if (seamDist < 0.8) {
      const seamCurve = Math.cos((seamDist / 0.8) * Math.PI * 0.5);
      const verticalInfluence = Math.max(0, 1.0 - Math.pow(Math.abs(ny), 1.8));
      cleft = Math.pow(seamCurve, 1.8) * 0.032 * verticalInfluence;
    }

    const finalR = (r - topIndent - bottomIndent - cleft) * waistBulge;

    pos.setXYZ(
      i,
      nx * finalR,
      ny * finalR,
      nz * finalR
    );
  }

  // Shift geometry so the bottom of the cherry is embedded into the frosting
  geo.computeBoundingBox();
  const minY = geo.boundingBox.min.y;
  geo.translate(0, -minY - 0.10, 0);

  geo.computeVertexNormals();
  geo.userData.sharedCache = true;
  _sharedCherryBodyGeo = geo;
  return geo;
}

export function getSharedCherryBodyMaterial() {
  if (_sharedCherryBodyMat) return _sharedCherryBodyMat;

  const mat = new THREE.MeshPhysicalMaterial({
    color: '#9e0b1f',
    roughness: 0.14,
    metalness: 0.02,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    sheen: 0.35,
    sheenColor: new THREE.Color('#ff4d6d'),
  });

  mat.userData.sharedCache = true;
  _sharedCherryBodyMat = mat;
  return mat;
}

export function getSharedCherryStemMaterial() {
  if (_sharedCherryStemMat) return _sharedCherryStemMat;

  const mat = new THREE.MeshStandardMaterial({
    color: '#3d5c1e',
    roughness: 0.65,
    metalness: 0.0,
  });

  mat.userData.sharedCache = true;
  _sharedCherryStemMat = mat;
  return mat;
}

export function getSharedCherryTipMaterial() {
  if (_sharedCherryTipMat) return _sharedCherryTipMat;

  const mat = new THREE.MeshStandardMaterial({
    color: '#5a4625',
    roughness: 0.75,
    metalness: 0.0,
  });

  mat.userData.sharedCache = true;
  _sharedCherryTipMat = mat;
  return mat;
}

export function getSharedCherryBasalCollarGeometry() {
  if (_sharedCherryBasalCollarGeo) return _sharedCherryBasalCollarGeo;

  const geo = new THREE.CylinderGeometry(0.042, 0.055, 0.045, 12);
  geo.userData.sharedCache = true;
  _sharedCherryBasalCollarGeo = geo;
  return geo;
}

/**
 * Builds a single high-fidelity Cherry mesh/group.
 * Features:
 * - Anatomical heart/oblate cherry body with apical dimple & suture cleft
 * - Naturally curved organic stem with randomized bend & orientation
 * - Basal collar node and woody tip bud
 * - High-gloss maraschino / fresh dark cherry glaze
 * - Embedded base sitting naturally nestled in cake frosting
 */
export function buildCherryMesh(x = 0, y = 0, z = 0, scale = 1.0, rand = Math.random, opts = {}) {
  const hasStem = opts.stem ?? true;
  const root = new THREE.Group();

  const bodyGeo = getSharedCherryBodyGeometry();
  const bodyMat = getSharedCherryBodyMaterial();
  const stemMat = getSharedCherryStemMaterial();
  const tipMat = getSharedCherryTipMaterial();

  // Cherry Fruit Body (heart/oblate shape with apical depression & suture cleft)
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  root.add(bodyMesh);

  if (hasStem) {
    // Basal Collar inside the top depression (approx y = 0.52 above embedded baseline)
    const collarGeo = getSharedCherryBasalCollarGeometry();
    const collarMesh = new THREE.Mesh(collarGeo, stemMat);
    collarMesh.position.set(0, 0.52, 0);
    collarMesh.castShadow = true;
    root.add(collarMesh);

    // Curved Stem — gracefully arching organic stem curve
    const tiltAngle = opts.stemAngle ?? (rand() * Math.PI * 2);
    const bendAmount = opts.bendAmount ?? (0.28 + rand() * 0.08);
    const curvePoints = [
      new THREE.Vector3(0, 0.52, 0),
      new THREE.Vector3(Math.cos(tiltAngle) * 0.04, 0.68, Math.sin(tiltAngle) * 0.04),
      new THREE.Vector3(Math.cos(tiltAngle) * (bendAmount * 0.45), 0.88, Math.sin(tiltAngle) * (bendAmount * 0.45)),
      new THREE.Vector3(Math.cos(tiltAngle) * (bendAmount * 0.85), 1.05, Math.sin(tiltAngle) * (bendAmount * 0.85)),
      new THREE.Vector3(Math.cos(tiltAngle) * bendAmount, 1.12, Math.sin(tiltAngle) * bendAmount),
    ];

    const stemCurve = new THREE.CatmullRomCurve3(curvePoints);
    const stemGeo = new THREE.TubeGeometry(stemCurve, 16, 0.022, 8, false);
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.castShadow = true;
    root.add(stemMesh);

    // Stem Tip Cut Node / Bud — seamlessly aligned with tangent vector of the stem apex
    const tipGeo = new THREE.CylinderGeometry(0.032, 0.024, 0.04, 8);
    const tipMesh = new THREE.Mesh(tipGeo, tipMat);
    const lastPt = curvePoints[curvePoints.length - 1];
    const prevPt = curvePoints[curvePoints.length - 2];
    const tipDir = new THREE.Vector3().subVectors(lastPt, prevPt).normalize();
    tipMesh.position.copy(lastPt);
    tipMesh.position.addScaledVector(tipDir, 0.015);
    tipMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipDir);
    tipMesh.castShadow = true;
    root.add(tipMesh);
  }

  root.scale.set(scale, scale, scale);
  root.position.set(x, y, z);
  root.userData.hasStem = hasStem;
  return root;
}

/**
 * Drop-in backwards-compatible replacement for addCherry
 */
export function addCherry(group, x, y, z, rand = Math.random) {
  const cherry = buildCherryMesh(x, y, z, 0.85, rand);
  group.add(cherry);
  return cherry;
}
