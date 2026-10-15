import * as THREE from 'three';

let _sharedBasketballTextures = null;
export function getSharedBasketballTextures() {
  if (_sharedBasketballTextures) return _sharedBasketballTextures;

  const width = 512;
  const height = 256;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d');

  const colorImgData = ctx.createImageData(width, height);
  const bumpImgData = bCtx.createImageData(width, height);
  const cData = colorImgData.data;
  const bData = bumpImgData.data;

  const orangeBaseR = 245, orangeBaseG = 105, orangeBaseB = 18;
  const orangeSwirlR = 215, orangeSwirlG = 85, orangeSwirlB = 12;
  const pipedFudgeR = 15, pipedFudgeG = 10, pipedFudgeB = 8;

  const seamHalfWidth = 0.038;
  const alpha = 38.0 * (Math.PI / 180.0);
  const cosAlpha = Math.cos(alpha);
  const sinAlpha = Math.sin(alpha);

  for (let py = 0; py < height; py++) {
    const v = 1.0 - py / (height - 1);
    const phi = (1.0 - v) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const Y = cosPhi;

    for (let px = 0; px < width; px++) {
      const u = px / (width - 1);
      const theta = u * 2.0 * Math.PI;

      const X = sinPhi * Math.cos(theta);
      const Z = sinPhi * Math.sin(theta);

      const dEquator = Math.abs(Y);
      const dMeridian = Math.abs(X);
      const dCircle1 = Math.abs(Y * cosAlpha + Z * sinAlpha);
      const dCircle2 = Math.abs(Y * cosAlpha - Z * sinAlpha);
      const dMinSeam = Math.min(dEquator, dMeridian, dCircle1, dCircle2);

      const spat1 = Math.sin(X * 4.5 + Y * 3.8) * Math.cos(Z * 4.5 - X * 2.2);
      const spat2 = Math.sin(Y * 7.0 + Z * 5.5) * Math.sin(X * 6.2);
      const spatulaWave = spat1 * 0.65 + spat2 * 0.35;

      const microGrain = (Math.sin(X * 90.0) * Math.sin(Y * 90.0) + Math.cos(Y * 90.0) * Math.cos(Z * 90.0)) * 0.18;
      const frostingHeight = spatulaWave * 0.75 + microGrain;

      const pixelIndex = (py * width + px) * 4;
      let r, g, b, bumpVal;

      if (dMinSeam < seamHalfWidth) {
        const seamT = dMinSeam / seamHalfWidth;
        const bead = Math.cos(seamT * Math.PI * 0.5);
        const beadHeight = Math.pow(bead, 1.35);

        const edgeSoftness = Math.min(1.0, (1.0 - seamT) * 4.5);
        const fudgeGlaze = 1.0 + 0.18 * beadHeight;

        r = Math.round(pipedFudgeR * fudgeGlaze * edgeSoftness + orangeBaseR * (1.0 - edgeSoftness));
        g = Math.round(pipedFudgeG * fudgeGlaze * edgeSoftness + orangeBaseG * (1.0 - edgeSoftness));
        b = Math.round(pipedFudgeB * fudgeGlaze * edgeSoftness + orangeBaseB * (1.0 - edgeSoftness));

        bumpVal = Math.round(145 + 90 * beadHeight);
      } else {
        const distFromSeam = dMinSeam - seamHalfWidth;
        const seamShadow = Math.min(1.0, 0.76 + 0.24 * Math.min(1.0, distFromSeam / 0.035));

        const tone = (spatulaWave + 1.0) * 0.5;
        const baseToneR = orangeSwirlR + (orangeBaseR - orangeSwirlR) * tone;
        const baseToneG = orangeSwirlG + (orangeBaseG - orangeSwirlG) * tone;
        const baseToneB = orangeSwirlB + (orangeBaseB - orangeSwirlB) * tone;

        const butterSheen = 1.0 + 0.08 * frostingHeight;

        r = Math.min(255, Math.round(baseToneR * butterSheen * seamShadow));
        g = Math.min(255, Math.round(baseToneG * butterSheen * seamShadow));
        b = Math.min(255, Math.round(baseToneB * butterSheen * seamShadow));

        bumpVal = Math.round(128 + 22 * frostingHeight);
      }

      cData[pixelIndex] = r;
      cData[pixelIndex + 1] = g;
      cData[pixelIndex + 2] = b;
      cData[pixelIndex + 3] = 255;

      bData[pixelIndex] = bumpVal;
      bData[pixelIndex + 1] = bumpVal;
      bData[pixelIndex + 2] = bumpVal;
      bData[pixelIndex + 3] = 255;
    }
  }

  ctx.putImageData(colorImgData, 0, 0);
  bCtx.putImageData(bumpImgData, 0, 0);

  const colorTexture = new THREE.CanvasTexture(colorCanvas);
  colorTexture.wrapS = THREE.RepeatWrapping;
  colorTexture.wrapT = THREE.ClampToEdgeWrapping;
  colorTexture.userData.sharedCache = true;

  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.ClampToEdgeWrapping;
  bumpTexture.userData.sharedCache = true;

  _sharedBasketballTextures = { colorTexture, bumpTexture };
  return _sharedBasketballTextures;
}

let _sharedBasketballGeometry = null;
export function getSharedBasketballGeometry() {
  if (_sharedBasketballGeometry) return _sharedBasketballGeometry;
  const geo = new THREE.SphereGeometry(2.75, 64, 48);
  geo.userData.sharedCache = true;
  _sharedBasketballGeometry = geo;
  return geo;
}

let _sharedBasketballMaterial = null;
export function getSharedBasketballMaterial() {
  if (_sharedBasketballMaterial) return _sharedBasketballMaterial;
  const { colorTexture, bumpTexture } = getSharedBasketballTextures();
  const mat = new THREE.MeshStandardMaterial({
    map: colorTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.040,
    roughness: 0.36,
    metalness: 0.0,
  });
  mat.userData.sharedCache = true;
  _sharedBasketballMaterial = mat;
  return mat;
}

let _sharedBasketballCollarMaterial = null;
export function getSharedBasketballCollarMaterial() {
  if (_sharedBasketballCollarMaterial) return _sharedBasketballCollarMaterial;
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfffcf5,
    roughness: 0.28,
    metalness: 0.0,
  });
  mat.userData.sharedCache = true;
  _sharedBasketballCollarMaterial = mat;
  return mat;
}

let _sharedCollarLobeGeometry = null;
export function getSharedCollarLobeGeometry(radius = 0.58) {
  if (_sharedCollarLobeGeometry) return _sharedCollarLobeGeometry;
  const geo = new THREE.SphereGeometry(radius * 0.48, 12, 10);
  geo.scale(1.0, 0.85, 1.25);
  geo.userData.sharedCache = true;
  _sharedCollarLobeGeometry = geo;
  return geo;
}

let _sharedCollarTipGeometry = null;
export function getSharedCollarTipGeometry(radius = 0.58) {
  if (_sharedCollarTipGeometry) return _sharedCollarTipGeometry;
  const geo = new THREE.ConeGeometry(radius * 0.40, radius * 0.75, 6);
  geo.userData.sharedCache = true;
  _sharedCollarTipGeometry = geo;
  return geo;
}

export function buildBasketballWhippedCreamDollop(x, y, z, radius, rotationY = 0) {
  const group = new THREE.Group();
  const creamMat = getSharedBasketballCollarMaterial();
  const lobeGeo = getSharedCollarLobeGeometry(radius);
  const tipGeo = getSharedCollarTipGeometry(radius);

  const numFlutes = 6;
  for (let i = 0; i < numFlutes; i++) {
    const angle = (i / numFlutes) * Math.PI * 2;
    const rOffset = radius * 0.48;
    const lobe = new THREE.Mesh(lobeGeo, creamMat);
    lobe.position.set(Math.cos(angle) * rOffset, radius * 0.22, Math.sin(angle) * rOffset);
    lobe.rotation.set(0.32, -angle, 0);
    lobe.castShadow = true;
    lobe.receiveShadow = true;
    group.add(lobe);
  }

  const tip = new THREE.Mesh(tipGeo, creamMat);
  tip.position.y = radius * 0.42;
  tip.rotation.y = 0.35;
  tip.castShadow = true;
  tip.receiveShadow = true;
  group.add(tip);

  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  return group;
}

export function buildBasketballCollar(ballRadius) {
  const collarGroup = new THREE.Group();
  const numDollops = 10;
  const collarRadius = ballRadius * 0.94;

  for (let i = 0; i < numDollops; i++) {
    const angle = (i / numDollops) * Math.PI * 2;
    const dx = Math.cos(angle) * collarRadius;
    const dz = Math.sin(angle) * collarRadius;
    const dollop = buildBasketballWhippedCreamDollop(dx, 0.0, dz, 0.58, angle);
    collarGroup.add(dollop);
  }
  return collarGroup;
}

export function buildBasketballMesh(x, y, z, scale = 0.22) {
  const topperGroup = new THREE.Group();
  topperGroup.userData.isRigidDecor = true;
  const radius = 2.75;

  const geo = getSharedBasketballGeometry();
  const mat = getSharedBasketballMaterial();
  const ballMesh = new THREE.Mesh(geo, mat);
  ballMesh.position.set(0, radius * 0.82, 0);
  ballMesh.rotation.set(0.12, -0.55, -0.06);
  ballMesh.castShadow = true;
  ballMesh.receiveShadow = true;
  topperGroup.add(ballMesh);

  topperGroup.scale.set(scale, scale, scale);
  topperGroup.position.set(x, y, z);
  return topperGroup;
}
