import * as THREE from 'three';

let _sharedStrawberryTextures = null;
export function getSharedStrawberryTextures() {
  if (_sharedStrawberryTextures) return _sharedStrawberryTextures;

  const size = 512;
  const cData = new Uint8ClampedArray(size * size * 4);
  const bData = new Uint8ClampedArray(size * size * 4);

  // 1. Fill base strawberry color gradient and skin pores
  for (let py = 0; py < size; py++) {
    const v = 1.0 - py / (size - 1); // 0 at tip, 1 at top crown
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;

      // Base ripe strawberry red gradient - rich ruby and deep crimson (no peach/pink tones)
      let r, g, b;
      if (v > 0.85) {
        // Deep berry crimson under the calyx crown with natural slight darkening
        const crownT = (v - 0.85) / 0.15;
        r = Math.round(230 * (1 - crownT) + 195 * crownT);
        g = Math.round(18 * (1 - crownT) + 10 * crownT);
        b = Math.round(32 * (1 - crownT) + 22 * crownT);
      } else if (v < 0.15) {
        // Slightly deeper crimson at the apex tip
        const tipT = v / 0.15;
        r = Math.round(175 * (1 - tipT) + 225 * tipT);
        g = Math.round(8 * (1 - tipT) + 16 * tipT);
        b = Math.round(20 * (1 - tipT) + 28 * tipT);
      } else {
        // Main juicy strawberry body - vibrant, saturated ruby red
        const bodyT = (v - 0.15) / 0.70;
        r = Math.round(225 + 15 * Math.sin(bodyT * Math.PI));
        g = Math.round(16 + 4 * Math.sin(bodyT * Math.PI));
        b = Math.round(28 + 6 * Math.sin(bodyT * Math.PI));
      }

      // Subtle organic skin pore variation
      const poreNoise = (Math.sin(px * 0.45) * Math.cos(py * 0.45) + Math.sin(px * 0.9 + py * 0.7)) * 4.0;
      r = Math.min(255, Math.max(0, r + poreNoise));
      g = Math.min(255, Math.max(0, g + poreNoise * 0.15));
      b = Math.min(255, Math.max(0, b + poreNoise * 0.2));

      cData[idx] = Math.floor(r);
      cData[idx + 1] = Math.floor(g);
      cData[idx + 2] = Math.floor(b);
      cData[idx + 3] = 255;

      // Neutral bump base
      bData[idx] = 128;
      bData[idx + 1] = 128;
      bData[idx + 2] = 128;
      bData[idx + 3] = 255;
    }
  }

  // 2. Draw phyllotactic seed pits (achenes) with golden seeds
  const numRows = 16;
  for (let row = 1; row < numRows; row++) {
    const rowFrac = row / numRows;
    const v = 0.08 + rowFrac * 0.82; // vertical position on berry
    const py = Math.floor((1.0 - v) * (size - 1));

    // Seeds per row varies with berry circumference
    const circumferenceFactor = Math.sin(rowFrac * Math.PI * 0.88 + 0.12);
    const seedsInRow = Math.max(8, Math.round(circumferenceFactor * 24));
    const rowOffset = (row % 2) * 0.5;

    for (let s = 0; s < seedsInRow; s++) {
      const u = ((s + rowOffset) / seedsInRow) % 1.0;
      const px = Math.floor(u * (size - 1));

      // Draw pit depression + seed
      const pitRadiusX = Math.max(4, Math.round(circumferenceFactor * 7));
      const pitRadiusY = Math.max(6, Math.round(circumferenceFactor * 10));

      for (let dy = -pitRadiusY; dy <= pitRadiusY; dy++) {
        for (let dx = -pitRadiusX; dx <= pitRadiusX; dx++) {
          const targetX = (px + dx + size) % size;
          const targetY = py + dy;
          if (targetY < 0 || targetY >= size) continue;

          const normX = dx / pitRadiusX;
          const normY = dy / pitRadiusY;
          const distSq = normX * normX + normY * normY;

          if (distSq <= 1.0) {
            const t = 1.0 - distSq;
            const pIdx = (targetY * size + targetX) * 4;

            // Seed pit cavity shadow
            const shadowFactor = 0.45 + 0.55 * (1.0 - t * 0.85);

            if (distSq < 0.35) {
              // Golden seed grain in the pit center
              const seedHighlight = (normY < -0.1 && normX < 0.1) ? 1.25 : 1.0;
              const seedR = Math.min(255, Math.floor(235 * seedHighlight));
              const seedG = Math.min(255, Math.floor(190 * seedHighlight));
              const seedB = Math.floor(65 * seedHighlight);

              cData[pIdx] = seedR;
              cData[pIdx + 1] = seedG;
              cData[pIdx + 2] = seedB;

              // Protruding seed inside the pit
              bData[pIdx] = Math.min(255, Math.floor(128 + 45 * (1.0 - distSq / 0.35)));
            } else {
              // Pit perimeter shadow and rim highlight
              const isUpperRim = normY < -0.6;
              if (isUpperRim) {
                // Soft specular highlight crescent on upper lip
                cData[pIdx] = Math.min(255, cData[pIdx] + 35);
                cData[pIdx + 1] = Math.min(255, cData[pIdx + 1] + 15);
                cData[pIdx + 2] = Math.min(255, cData[pIdx + 2] + 20);
                bData[pIdx] = 155;
              } else {
                cData[pIdx] = Math.floor(cData[pIdx] * shadowFactor);
                cData[pIdx + 1] = Math.floor(cData[pIdx + 1] * shadowFactor);
                cData[pIdx + 2] = Math.floor(cData[pIdx + 2] * shadowFactor);
                bData[pIdx] = Math.max(30, Math.floor(128 - 75 * t));
              }
            }
          }
        }
      }
    }
  }

  const colorTexture = new THREE.DataTexture(cData, size, size, THREE.RGBAFormat);
  colorTexture.needsUpdate = true;
  colorTexture.generateMipmaps = true;
  colorTexture.minFilter = THREE.LinearMipmapLinearFilter;
  colorTexture.magFilter = THREE.LinearFilter;
  colorTexture.wrapS = THREE.RepeatWrapping;
  colorTexture.wrapT = THREE.ClampToEdgeWrapping;
  colorTexture.userData.sharedCache = true;

  const bumpTexture = new THREE.DataTexture(bData, size, size, THREE.RGBAFormat);
  bumpTexture.needsUpdate = true;
  bumpTexture.generateMipmaps = true;
  bumpTexture.minFilter = THREE.LinearMipmapLinearFilter;
  bumpTexture.magFilter = THREE.LinearFilter;
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.ClampToEdgeWrapping;
  bumpTexture.userData.sharedCache = true;

  _sharedStrawberryTextures = { colorTexture, bumpTexture };
  return _sharedStrawberryTextures;
}

let _sharedStrawberryBodyGeo = null;
export function getSharedStrawberryBodyGeometry() {
  if (_sharedStrawberryBodyGeo) return _sharedStrawberryBodyGeo;

  // Revolved profile curve: conical-ovoid berry silhouette
  const points = [
    new THREE.Vector2(0.00, 0.00),   // Bottom apex tip
    new THREE.Vector2(0.08, 0.05),
    new THREE.Vector2(0.18, 0.15),
    new THREE.Vector2(0.28, 0.30),
    new THREE.Vector2(0.36, 0.48),
    new THREE.Vector2(0.41, 0.68),   // Widest rounded shoulder
    new THREE.Vector2(0.39, 0.85),
    new THREE.Vector2(0.32, 0.96),
    new THREE.Vector2(0.20, 1.02),
    new THREE.Vector2(0.00, 1.04),   // Top crown attachment
  ];

  const geo = new THREE.LatheGeometry(points, 48);
  // Shift geometry so the bottom tip is embedded into the frosting
  geo.translate(0, -0.22, 0);
  geo.computeVertexNormals();
  geo.userData.sharedCache = true;
  _sharedStrawberryBodyGeo = geo;
  return geo;
}

let _sharedStrawberryBodyMat = null;
export function getSharedStrawberryBodyMaterial() {
  if (_sharedStrawberryBodyMat) return _sharedStrawberryBodyMat;

  const { colorTexture, bumpTexture } = getSharedStrawberryTextures();

  const mat = new THREE.MeshPhysicalMaterial({
    map: colorTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.032,
    roughness: 0.28,
    metalness: 0.02,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    sheen: 0.40,
    sheenColor: new THREE.Color('#990011'),
  });

  mat.userData.sharedCache = true;
  _sharedStrawberryBodyMat = mat;
  return mat;
}

let _sharedCalyxLeafGeo = null;
export function getSharedCalyxLeafGeometry() {
  if (_sharedCalyxLeafGeo) return _sharedCalyxLeafGeo;

  // Modeled curved leaf sepal with central vein curvature
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(-0.06, 0.08, -0.09, 0.20, -0.01, 0.34);
  leafShape.lineTo(0, 0.38); // Pointed tip
  leafShape.lineTo(0.01, 0.34);
  leafShape.bezierCurveTo(0.09, 0.20, 0.06, 0.08, 0, 0);

  const extrudeSettings = {
    depth: 0.012,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.005,
    bevelThickness: 0.005,
  };

  const geo = new THREE.ExtrudeGeometry(leafShape, extrudeSettings);
  // Curve leaf downward so it hugs the berry shoulder
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const curl = Math.pow(Math.max(0, y) / 0.38, 1.8) * 0.12;
    pos.setZ(i, pos.getZ(i) - curl);
  }
  geo.computeVertexNormals();
  geo.userData.sharedCache = true;
  _sharedCalyxLeafGeo = geo;
  return geo;
}

let _sharedCalyxMat = null;
export function getSharedCalyxMaterial() {
  if (_sharedCalyxMat) return _sharedCalyxMat;

  const mat = new THREE.MeshStandardMaterial({
    color: '#2e7a27',
    roughness: 0.55,
    metalness: 0.0,
  });

  mat.userData.sharedCache = true;
  _sharedCalyxMat = mat;
  return mat;
}

let _sharedPedicelGeo = null;
let _sharedPedicelMat = null;
export function getSharedPedicelGeometry() {
  if (_sharedPedicelGeo) return _sharedPedicelGeo;
  const geo = new THREE.CylinderGeometry(0.032, 0.040, 0.14, 8);
  geo.userData.sharedCache = true;
  _sharedPedicelGeo = geo;
  return geo;
}

export function getSharedPedicelMaterial() {
  if (_sharedPedicelMat) return _sharedPedicelMat;
  const mat = new THREE.MeshStandardMaterial({
    color: '#3d5c1e',
    roughness: 0.70,
    metalness: 0.0,
  });
  mat.userData.sharedCache = true;
  _sharedPedicelMat = mat;
  return mat;
}

/**
 * Builds a high-fidelity Strawberry mesh/group.
 * Features:
 * - Conical-ovoid berry silhouette
 * - High-res procedural texture with phyllotactic seed pits (achenes) and golden seeds
 * - 3D tactile normal/bump depth
 * - Lush 6-leaf calyx crown curling naturally over the shoulders
 * - Trimmed center pedicel stem stub
 * - Embedded base sitting naturally nestled in cake frosting
 */
export function buildStrawberryMesh(x = 0, y = 0, z = 0, scale = 1.0, rand = Math.random) {
  const root = new THREE.Group();

  const bodyGeo = getSharedStrawberryBodyGeometry();
  const bodyMat = getSharedStrawberryBodyMaterial();
  const calyxLeafGeo = getSharedCalyxLeafGeometry();
  const calyxMat = getSharedCalyxMaterial();
  const pedicelGeo = getSharedPedicelGeometry();
  const pedicelMat = getSharedPedicelMaterial();

  // Strawberry Fruit Body
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  root.add(bodyMesh);

  // Calyx Crown (6 organic curling sepals) sitting on top of embedded berry
  const calyxGroup = new THREE.Group();
  calyxGroup.position.set(0, 0.80, 0);

  const numLeaves = 6;
  const baseRotationOffset = rand() * Math.PI * 2;
  for (let i = 0; i < numLeaves; i++) {
    const angle = baseRotationOffset + (i / numLeaves) * Math.PI * 2;
    const leafMesh = new THREE.Mesh(calyxLeafGeo, calyxMat);

    // Rotate and lay outward/downward along shoulder
    leafMesh.rotation.y = -angle + Math.PI / 2;
    leafMesh.rotation.x = Math.PI / 2 + 0.35 + (rand() * 0.1 - 0.05);
    leafMesh.rotation.z = (rand() * 0.15 - 0.075);

    leafMesh.position.set(
      Math.cos(angle) * 0.04,
      0.01,
      Math.sin(angle) * 0.04
    );

    leafMesh.castShadow = true;
    calyxGroup.add(leafMesh);
  }

  // Center Pedicel Stub
  const pedicelMesh = new THREE.Mesh(pedicelGeo, pedicelMat);
  pedicelMesh.position.set(0, 0.07, 0);
  pedicelMesh.rotation.z = (rand() * 0.2 - 0.1);
  pedicelMesh.rotation.x = (rand() * 0.2 - 0.1);
  pedicelMesh.castShadow = true;
  calyxGroup.add(pedicelMesh);

  root.add(calyxGroup);

  root.scale.set(scale, scale, scale);
  root.position.set(x, y, z);
  return root;
}

/**
 * Drop-in backwards-compatible replacement for addStrawberry
 */
export function addStrawberry(group, x, y, z, rand = Math.random) {
  const strawberry = buildStrawberryMesh(x, y, z, 0.85, rand);
  group.add(strawberry);
  return strawberry;
}
