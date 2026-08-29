import * as THREE from 'three';

let _sharedBearBodyMaterial = null;
export function getSharedBearBodyMaterial() {
  if (_sharedBearBodyMaterial) return _sharedBearBodyMaterial;
  const mat = new THREE.MeshStandardMaterial({
    color: 0xbaa084,
    roughness: 0.65,
    metalness: 0.0,
  });
  mat.userData.sharedCache = true;
  _sharedBearBodyMaterial = mat;
  return mat;
}

let _sharedBearCreamMaterial = null;
export function getSharedBearCreamMaterial() {
  if (_sharedBearCreamMaterial) return _sharedBearCreamMaterial;
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf6f0e6,
    roughness: 0.58,
    metalness: 0.0,
  });
  mat.userData.sharedCache = true;
  _sharedBearCreamMaterial = mat;
  return mat;
}

let _sharedBearPinkMaterial = null;
export function getSharedBearPinkMaterial() {
  if (_sharedBearPinkMaterial) return _sharedBearPinkMaterial;
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf7c6ce,
    roughness: 0.50,
    metalness: 0.0,
  });
  mat.userData.sharedCache = true;
  _sharedBearPinkMaterial = mat;
  return mat;
}

let _sharedBearDarkChocMaterial = null;
export function getSharedBearDarkChocMaterial() {
  if (_sharedBearDarkChocMaterial) return _sharedBearDarkChocMaterial;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x30180d,
    roughness: 0.20,
    metalness: 0.02,
  });
  mat.userData.sharedCache = true;
  _sharedBearDarkChocMaterial = mat;
  return mat;
}

let _sharedBearMouthMaterial = null;
export function getSharedBearMouthMaterial() {
  if (_sharedBearMouthMaterial) return _sharedBearMouthMaterial;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x30180d,
    roughness: 0.35,
    metalness: 0.0,
  });
  mat.userData.sharedCache = true;
  _sharedBearMouthMaterial = mat;
  return mat;
}

let _sharedBearHeartGeo = null;
export function getSharedBearHeartGeometry() {
  if (_sharedBearHeartGeo) return _sharedBearHeartGeo;
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.65);
  heartShape.bezierCurveTo(-0.62, -0.22, -0.88, 0.15, -0.88, 0.42);
  heartShape.bezierCurveTo(-0.88, 0.72, -0.46, 0.76, -0.02, 0.36);
  heartShape.lineTo(0, 0.32);
  heartShape.lineTo(0.02, 0.36);
  heartShape.bezierCurveTo(0.46, 0.76, 0.88, 0.72, 0.88, 0.42);
  heartShape.bezierCurveTo(0.88, 0.15, 0.62, -0.22, 0, -0.65);

  const extrudeSettings = {
    depth: 0.36,
    bevelEnabled: true,
    bevelSegments: 6,
    steps: 2,
    bevelSize: 0.16,
    bevelThickness: 0.16,
  };

  const geo = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
  geo.center();
  geo.scale(1.28, 1.28, 1.28);
  geo.computeVertexNormals();
  geo.userData.sharedCache = true;
  _sharedBearHeartGeo = geo;
  return geo;
}

let _sharedChocolateBearGroup = null;
export function getOrBuildChocolateBearGroup() {
  if (_sharedChocolateBearGroup) return _sharedChocolateBearGroup;

  const bearBodyMat = getSharedBearBodyMaterial();
  const creamMat = getSharedBearCreamMaterial();
  const pinkMat = getSharedBearPinkMaterial();
  const darkChocMat = getSharedBearDarkChocMaterial();
  const mouthMat = getSharedBearMouthMaterial();

  const bearRoot = new THREE.Group();

  // 1. Seated Body, Arms & Legs
  const bodyGroup = new THREE.Group();

  // Torso
  const torsoGeo = new THREE.SphereGeometry(1.50, 32, 24);
  torsoGeo.scale(1.10, 1.12, 1.02);
  torsoGeo.userData.sharedCache = true;
  const torsoMesh = new THREE.Mesh(torsoGeo, bearBodyMat);
  torsoMesh.position.set(0, 1.45, 0);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  bodyGroup.add(torsoMesh);

  // Arms & Paws
  const armGeo = new THREE.SphereGeometry(0.42, 20, 16);
  armGeo.scale(1.50, 0.85, 0.85);
  armGeo.userData.sharedCache = true;

  const pawGeo = new THREE.SphereGeometry(0.32, 16, 12);
  pawGeo.scale(1.0, 0.95, 0.90);
  pawGeo.userData.sharedCache = true;

  // Right Arm
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(-0.85, 1.78, 1.05);
  rightArmGroup.rotation.set(0.18, 0.58, -0.32);

  const rightArm = new THREE.Mesh(armGeo, bearBodyMat);
  rightArm.castShadow = true;
  rightArmGroup.add(rightArm);

  const rightPaw = new THREE.Mesh(pawGeo, bearBodyMat);
  rightPaw.position.set(0.52, 0.02, 0.38);
  rightPaw.castShadow = true;
  rightArmGroup.add(rightPaw);
  bodyGroup.add(rightArmGroup);

  // Left Arm
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(0.85, 1.78, 1.05);
  leftArmGroup.rotation.set(0.18, -0.58, 0.32);

  const leftArm = new THREE.Mesh(armGeo, bearBodyMat);
  leftArm.castShadow = true;
  leftArmGroup.add(leftArm);

  const leftPaw = new THREE.Mesh(pawGeo, bearBodyMat);
  leftPaw.position.set(-0.52, 0.02, 0.38);
  leftPaw.castShadow = true;
  leftArmGroup.add(leftPaw);
  bodyGroup.add(leftArmGroup);

  // Legs & Footpads
  const legGeo = new THREE.SphereGeometry(0.72, 20, 16);
  legGeo.scale(0.92, 1.05, 1.02);
  legGeo.userData.sharedCache = true;

  const padGeo = new THREE.SphereGeometry(0.52, 18, 14);
  padGeo.scale(0.82, 1.10, 0.22);
  padGeo.userData.sharedCache = true;

  // Right Leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(-0.95, 0.65, 0.68);
  rightLegGroup.rotation.set(0.08, 0.12, -0.05);

  const rightLegMesh = new THREE.Mesh(legGeo, bearBodyMat);
  rightLegMesh.castShadow = true;
  rightLegMesh.receiveShadow = true;
  rightLegGroup.add(rightLegMesh);

  const rightPadMesh = new THREE.Mesh(padGeo, creamMat);
  rightPadMesh.position.set(0, 0.02, 0.68);
  rightPadMesh.rotation.x = -0.08;
  rightPadMesh.castShadow = true;
  rightLegGroup.add(rightPadMesh);
  bodyGroup.add(rightLegGroup);

  // Left Leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(0.95, 0.65, 0.68);
  leftLegGroup.rotation.set(0.08, -0.12, 0.05);

  const leftLegMesh = new THREE.Mesh(legGeo, bearBodyMat);
  leftLegMesh.castShadow = true;
  leftLegMesh.receiveShadow = true;
  leftLegGroup.add(leftLegMesh);

  const leftPadMesh = new THREE.Mesh(padGeo, creamMat);
  leftPadMesh.position.set(0, 0.02, 0.68);
  leftPadMesh.rotation.x = -0.08;
  leftPadMesh.castShadow = true;
  leftLegGroup.add(leftPadMesh);
  bodyGroup.add(leftLegGroup);

  bearRoot.add(bodyGroup);

  // 2. Head with Ears, Bow, Muzzle & Facial Features
  const headGroup = new THREE.Group();

  const headGeo = new THREE.SphereGeometry(1.45, 32, 24);
  headGeo.scale(1.10, 0.98, 1.05);
  headGeo.userData.sharedCache = true;
  const headMesh = new THREE.Mesh(headGeo, bearBodyMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.52, 24, 18);
  earGeo.scale(0.95, 1.05, 0.55);
  earGeo.userData.sharedCache = true;

  const rightEar = new THREE.Mesh(earGeo, bearBodyMat);
  rightEar.position.set(-1.12, 1.10, -0.05);
  rightEar.rotation.set(0, 0.22, 0.35);
  rightEar.castShadow = true;
  headGroup.add(rightEar);

  const leftEar = new THREE.Mesh(earGeo, bearBodyMat);
  leftEar.position.set(1.12, 1.10, -0.05);
  leftEar.rotation.set(0, -0.22, -0.35);
  leftEar.castShadow = true;
  headGroup.add(leftEar);

  // Pink Ribbon Bow
  const bowGroup = new THREE.Group();
  const knotGeo = new THREE.SphereGeometry(0.20, 18, 14);
  knotGeo.scale(0.85, 1.15, 0.95);
  knotGeo.userData.sharedCache = true;
  const knotMesh = new THREE.Mesh(knotGeo, pinkMat);
  knotMesh.castShadow = true;
  bowGroup.add(knotMesh);

  const loopGeo = new THREE.SphereGeometry(0.36, 18, 14);
  loopGeo.scale(1.22, 0.92, 0.65);
  loopGeo.userData.sharedCache = true;

  const leftLoop = new THREE.Mesh(loopGeo, pinkMat);
  leftLoop.position.set(-0.40, 0.05, -0.02);
  leftLoop.rotation.set(0, 0.20, -0.22);
  leftLoop.castShadow = true;
  bowGroup.add(leftLoop);

  const rightLoop = new THREE.Mesh(loopGeo, pinkMat);
  rightLoop.position.set(0.40, 0.05, -0.02);
  rightLoop.rotation.set(0, -0.20, 0.22);
  rightLoop.castShadow = true;
  bowGroup.add(rightLoop);

  bowGroup.position.set(-0.90, 1.35, 0.50);
  bowGroup.rotation.set(-0.15, 0.25, -0.30);
  headGroup.add(bowGroup);

  // Muzzle
  const muzzleGeo = new THREE.SphereGeometry(0.70, 24, 18);
  muzzleGeo.scale(1.18, 0.92, 0.65);
  muzzleGeo.userData.sharedCache = true;
  const muzzleMesh = new THREE.Mesh(muzzleGeo, creamMat);
  muzzleMesh.position.set(0, -0.32, 1.15);
  muzzleMesh.rotation.x = -0.06;
  muzzleMesh.castShadow = true;
  muzzleMesh.receiveShadow = true;
  headGroup.add(muzzleMesh);

  // Nose
  const noseGeo = new THREE.SphereGeometry(0.18, 16, 12);
  noseGeo.scale(1.22, 0.85, 0.65);
  noseGeo.userData.sharedCache = true;
  const noseMesh = new THREE.Mesh(noseGeo, darkChocMat);
  noseMesh.position.set(0, -0.14, 1.58);
  noseMesh.castShadow = true;
  headGroup.add(noseMesh);

  // Mouth Stem & Smile
  const mouthStemGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8);
  mouthStemGeo.userData.sharedCache = true;
  const mouthStem = new THREE.Mesh(mouthStemGeo, mouthMat);
  mouthStem.position.set(0, -0.28, 1.58);
  headGroup.add(mouthStem);

  const smileCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.01, -0.36, 1.57),
    new THREE.Vector3(0.08, -0.42, 1.56),
    new THREE.Vector3(0.18, -0.33, 1.54)
  );
  const smileGeo = new THREE.TubeGeometry(smileCurve, 8, 0.025, 6, false);
  smileGeo.userData.sharedCache = true;
  const smileMesh = new THREE.Mesh(smileGeo, mouthMat);
  headGroup.add(smileMesh);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.16, 16, 12);
  eyeGeo.scale(0.95, 1.15, 0.70);
  eyeGeo.userData.sharedCache = true;

  const rightEye = new THREE.Mesh(eyeGeo, darkChocMat);
  rightEye.position.set(-0.70, -0.08, 1.30);
  rightEye.rotation.set(-0.05, -0.32, 0);
  rightEye.castShadow = true;
  headGroup.add(rightEye);

  const leftEye = new THREE.Mesh(eyeGeo, darkChocMat);
  leftEye.position.set(0.70, -0.08, 1.30);
  leftEye.rotation.set(-0.05, 0.32, 0);
  leftEye.castShadow = true;
  headGroup.add(leftEye);

  headGroup.position.set(0, 3.65, 0.10);
  headGroup.rotation.x = -0.04;
  bearRoot.add(headGroup);

  // 3. Held Pink Heart
  const heartGeo = getSharedBearHeartGeometry();
  const heartMesh = new THREE.Mesh(heartGeo, pinkMat);
  heartMesh.position.set(-0.02, 1.85, 1.55);
  heartMesh.rotation.set(-0.06, 0.04, -0.12);
  heartMesh.castShadow = true;
  heartMesh.receiveShadow = true;
  bearRoot.add(heartMesh);

  bearRoot.userData.sharedCache = true;
  _sharedChocolateBearGroup = bearRoot;
  return bearRoot;
}

export function buildChocolateBearMesh(x, y, z, scale = 0.22, rotY = 0) {
  const bear = getOrBuildChocolateBearGroup().clone();
  bear.scale.set(scale, scale, scale);
  bear.rotation.y = rotY;
  bear.position.set(x, y - 0.35 * scale, z);
  return bear;
}
