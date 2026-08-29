import * as THREE from 'three';

let _sharedOreoTextures = null;
export function getSharedOreoTextures() {
  if (_sharedOreoTextures) return _sharedOreoTextures;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const cx = size * 0.5;
  const cy = size * 0.5;
  const maxR = size * 0.475;

  // 1. Base dark cocoa biscuit height
  ctx.fillStyle = '#202020';
  ctx.fillRect(0, 0, size, size);

  // 2. Triangular Cross-hatch Background Pattern
  const innerFluteR = maxR * 0.81;
  const ovalR = 85;

  ctx.save();
  ctx.fillStyle = '#3a3a3a';
  const numTriRings = 6;
  for (let ring = 0; ring < numTriRings; ring++) {
    const ringR = ovalR + 10 + (ring / numTriRings) * (innerFluteR - ovalR - 18);
    const count = Math.floor(ringR * 0.08) * 2;
    for (let k = 0; k < count; k++) {
      const ang = (k / count) * Math.PI * 2;
      const tx = cx + Math.cos(ang) * ringR;
      const ty = cy + Math.sin(ang) * ringR;
      const triSize = 2.5;

      ctx.beginPath();
      if (k % 2 === 0) {
        ctx.moveTo(tx, ty - triSize);
        ctx.lineTo(tx - triSize * 0.86, ty + triSize * 0.5);
        ctx.lineTo(tx + triSize * 0.86, ty + triSize * 0.5);
      } else {
        ctx.moveTo(tx, ty + triSize);
        ctx.lineTo(tx - triSize * 0.86, ty - triSize * 0.5);
        ctx.lineTo(tx + triSize * 0.86, ty - triSize * 0.5);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  // 3. Outer Fluted / Serrated Rim (96 Radial Flutes)
  const numFlutes = 96;
  const outerFluteR = maxR;

  ctx.save();
  ctx.fillStyle = '#a0a0a0';
  for (let i = 0; i < numFlutes; i++) {
    const angle = (i / numFlutes) * Math.PI * 2;
    const halfToothAngle = (Math.PI * 2 / numFlutes) * 0.32;

    const a1 = angle - halfToothAngle;
    const a2 = angle + halfToothAngle;
    const a3 = angle + halfToothAngle * 0.65;
    const a4 = angle - halfToothAngle * 0.65;

    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a1) * innerFluteR, cy + Math.sin(a1) * innerFluteR);
    ctx.lineTo(cx + Math.cos(a4) * outerFluteR, cy + Math.sin(a4) * outerFluteR);
    ctx.lineTo(cx + Math.cos(a3) * outerFluteR, cy + Math.sin(a3) * outerFluteR);
    ctx.lineTo(cx + Math.cos(a2) * innerFluteR, cy + Math.sin(a2) * innerFluteR);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 4. Concentric Raised Separation Beads & Rings
  ctx.strokeStyle = '#b0b0b0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, innerFluteR - 2.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, innerFluteR - 9, 0, Math.PI * 2);
  ctx.stroke();

  // 5. 12-Fold Clover / Trefoil & Triangular Stud Pattern
  const numSectors = 12;
  const cloverRadius = maxR * 0.62;
  const studRadiusOuter = maxR * 0.70;
  const studRadiusInner = maxR * 0.52;

  ctx.fillStyle = '#b8b8b8';
  ctx.strokeStyle = '#b8b8b8';

  for (let s = 0; s < numSectors; s++) {
    const sAngle = (s / numSectors) * Math.PI * 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sAngle);

    // Four-petal clover blossom
    const clX = 0;
    const clY = -cloverRadius;
    const petalDist = 5;
    const petalR = 3.8;

    ctx.beginPath();
    ctx.arc(clX, clY - petalDist, petalR, 0, Math.PI * 2);
    ctx.arc(clX, clY + petalDist, petalR, 0, Math.PI * 2);
    ctx.arc(clX - petalDist, clY, petalR, 0, Math.PI * 2);
    ctx.arc(clX + petalDist, clY, petalR, 0, Math.PI * 2);
    ctx.arc(clX, clY, petalR * 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Connecting radial bar
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -studRadiusInner);
    ctx.lineTo(0, -cloverRadius + petalDist + 1.5);
    ctx.moveTo(0, -cloverRadius - petalDist - 1.5);
    ctx.lineTo(0, -studRadiusOuter);
    ctx.stroke();

    // Outer triangular stud
    ctx.beginPath();
    ctx.moveTo(0, -studRadiusOuter - 4);
    ctx.lineTo(-4, -studRadiusOuter + 1.5);
    ctx.lineTo(4, -studRadiusOuter + 1.5);
    ctx.closePath();
    ctx.fill();

    // Inner triangular stud
    ctx.beginPath();
    ctx.moveTo(0, -studRadiusInner + 4);
    ctx.lineTo(-3.5, -studRadiusInner - 1.5);
    ctx.lineTo(3.5, -studRadiusInner - 1.5);
    ctx.closePath();
    ctx.fill();

    // Intermediate diamond studs between sectors
    const interAngle = Math.PI / numSectors;
    ctx.rotate(interAngle);

    ctx.beginPath();
    ctx.moveTo(0, -cloverRadius - 4.5);
    ctx.lineTo(3.5, -cloverRadius);
    ctx.lineTo(0, -cloverRadius + 4.5);
    ctx.lineTo(-3.5, -cloverRadius);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // 6. Two-Bar Antenna (Cross of Lorraine)
  ctx.save();
  ctx.fillStyle = '#c8c8c8';
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(cx, cy - 45);
  ctx.lineTo(cx, cy - 110);
  ctx.stroke();

  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(cx - 31, cy - 74);
  ctx.lineTo(cx + 31, cy - 74);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 22.5, cy - 96);
  ctx.lineTo(cx + 22.5, cy - 96);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy - 115);
  ctx.lineTo(cx - 5, cy - 108);
  ctx.lineTo(cx + 5, cy - 108);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 32.5, cy - 74);
  ctx.lineTo(cx - 28, cy - 78);
  ctx.lineTo(cx - 28, cy - 70);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 32.5, cy - 74);
  ctx.lineTo(cx + 28, cy - 78);
  ctx.lineTo(cx + 28, cy - 70);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 7. Central Embossed Oval Cartouche
  ctx.save();
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 83.75, 52, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#141414';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 79.5, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 8. Bold Geometric Embossed "OREO" Typography
  ctx.save();
  ctx.fillStyle = '#d8d8d8';
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Letter 1: 'O' (Left)
  ctx.beginPath();
  ctx.ellipse(cx - 48.75, cy, 14.5, 22, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Letter 2: 'R' (Mid-Left)
  const rx = cx - 17;
  const ry = cy;
  const rH = 22;
  const rW = 11.5;

  ctx.beginPath();
  ctx.moveTo(rx - rW * 0.5, ry - rH);
  ctx.lineTo(rx - rW * 0.5, ry + rH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rx - rW * 0.5, ry - rH);
  ctx.lineTo(rx + rW * 0.2, ry - rH);
  ctx.arc(rx + rW * 0.2, ry - rH * 0.45, rH * 0.55, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.lineTo(rx - rW * 0.5, ry + rH * 0.10);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rx + rW * 0.1, ry + rH * 0.10);
  ctx.lineTo(rx + rW * 0.55, ry + rH);
  ctx.stroke();

  // Letter 3: 'E' (Mid-Right)
  const ex = cx + 17;
  const ey = cy;
  const eH = 22;
  const eW = 11.5;

  ctx.beginPath();
  ctx.moveTo(ex - eW * 0.5, ey - eH);
  ctx.lineTo(ex - eW * 0.5, ey + eH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ex - eW * 0.5, ey - eH);
  ctx.lineTo(ex + eW * 0.55, ey - eH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ex - eW * 0.5, ey);
  ctx.lineTo(ex + eW * 0.35, ey);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ex - eW * 0.5, ey + eH);
  ctx.lineTo(ex + eW * 0.55, ey + eH);
  ctx.stroke();

  // Letter 4: 'O' (Right)
  ctx.beginPath();
  ctx.ellipse(cx + 48.75, cy, 14.5, 22, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  // 9. Baked Biscuit Crumb Heightfield
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  const heightMap = new Float32Array(size * size);

  for (let i = 0; i < data.length; i += 4) {
    const pxIdx = i / 4;
    const x = pxIdx % size;
    const y = Math.floor(pxIdx / size);
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let h = data[i] / 255.0;

    if (dist > maxR) {
      const fade = Math.max(0, 1.0 - (dist - maxR) / 6);
      h *= fade;
    }

    const grain = (Math.random() - 0.5) * 0.09;
    const porousPit = Math.random() < 0.04 ? -0.16 * Math.random() : 0.0;

    heightMap[pxIdx] = Math.max(0, Math.min(1.0, h + grain + porousPit));
  }

  // 10. Generate Sobel Normal Map
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext('2d');
  const nImgData = nCtx.createImageData(size, size);
  const nData = nImgData.data;

  const strength = 8.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const xL = (x - 1 + size) % size;
      const xR = (x + 1) % size;
      const yU = (y - 1 + size) % size;
      const yD = (y + 1) % size;

      const dX = (heightMap[y * size + xR] - heightMap[y * size + xL]) * strength;
      const dY = (heightMap[yD * size + x] - heightMap[yU * size + x]) * strength;

      const len = Math.sqrt(dX * dX + dY * dY + 1.0);
      const nx = (-dX / len) * 0.5 + 0.5;
      const ny = (dY / len) * 0.5 + 0.5;
      const nz = (1.0 / len) * 0.5 + 0.5;

      const pIdx = idx * 4;
      nData[pIdx] = Math.floor(nx * 255);
      nData[pIdx + 1] = Math.floor(ny * 255);
      nData[pIdx + 2] = Math.floor(nz * 255);
      nData[pIdx + 3] = 255;
    }
  }
  nCtx.putImageData(nImgData, 0, 0);

  // 11. Generate Dark Cocoa Albedo Texture
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d');
  const aImgData = aCtx.createImageData(size, size);
  const aData = aImgData.data;

  for (let i = 0; i < heightMap.length; i++) {
    const h = heightMap[i];
    const pIdx = i * 4;
    const r = Math.floor(THREE.MathUtils.lerp(20, 46, h) + (Math.random() - 0.5) * 4);
    const g = Math.floor(THREE.MathUtils.lerp(15, 34, h) + (Math.random() - 0.5) * 3);
    const b = Math.floor(THREE.MathUtils.lerp(12, 26, h) + (Math.random() - 0.5) * 3);

    aData[pIdx] = Math.max(0, Math.min(255, r));
    aData[pIdx + 1] = Math.max(0, Math.min(255, g));
    aData[pIdx + 2] = Math.max(0, Math.min(255, b));
    aData[pIdx + 3] = 255;
  }
  aCtx.putImageData(aImgData, 0, 0);

  const normalTexture = new THREE.CanvasTexture(normalCanvas);
  normalTexture.userData.sharedCache = true;

  const albedoTexture = new THREE.CanvasTexture(albedoCanvas);
  albedoTexture.userData.sharedCache = true;

  _sharedOreoTextures = { normalTexture, albedoTexture };
  return _sharedOreoTextures;
}

let _sharedOreoWaferGeometry = null;
export function getSharedOreoWaferGeometry() {
  if (_sharedOreoWaferGeometry) return _sharedOreoWaferGeometry;
  const radius = 2.25;
  const thickness = 0.35;
  const radialSegments = 64;
  const heightSegments = 4;

  const geometry = new THREE.CylinderGeometry(radius * 0.985, radius, thickness, radialSegments, heightSegments, false);
  const pos = geometry.attributes.position;
  const uvs = geometry.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > thickness * 0.40) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const u = (x / radius) * 0.475 + 0.5;
      const v = (-z / radius) * 0.475 + 0.5;
      uvs.setXY(i, u, v);
    }
  }
  uvs.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.userData.sharedCache = true;

  _sharedOreoWaferGeometry = geometry;
  return geometry;
}

let _sharedOreoCremeGeometry = null;
export function getSharedOreoCremeGeometry() {
  if (_sharedOreoCremeGeometry) return _sharedOreoCremeGeometry;
  const radius = 2.16;
  const thickness = 0.35;
  const radialSegments = 64;
  const heightSegments = 4;

  const geometry = new THREE.CylinderGeometry(radius, radius, thickness, radialSegments, heightSegments, true);
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const theta = Math.atan2(z, x);

    const bulgeY = Math.cos((y / (thickness * 0.5)) * Math.PI * 0.5);
    const wave = Math.sin(theta * 14) * 0.02 + Math.cos(theta * 7 + 1.5) * 0.025;
    const squeezeRadius = radius + wave + bulgeY * 0.05;

    pos.setX(i, Math.cos(theta) * squeezeRadius);
    pos.setZ(i, Math.sin(theta) * squeezeRadius);
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.userData.sharedCache = true;

  _sharedOreoCremeGeometry = geometry;
  return geometry;
}

let _sharedOreoWaferMaterial = null;
export function getSharedOreoWaferMaterial() {
  if (_sharedOreoWaferMaterial) return _sharedOreoWaferMaterial;
  const textures = getSharedOreoTextures();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1b130e,
    map: textures.albedoTexture,
    normalMap: textures.normalTexture,
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughness: 0.80,
    metalness: 0.01,
  });
  mat.userData.sharedCache = true;
  _sharedOreoWaferMaterial = mat;
  return mat;
}

let _sharedOreoCremeMaterial = null;
export function getSharedOreoCremeMaterial() {
  if (_sharedOreoCremeMaterial) return _sharedOreoCremeMaterial;
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfdfbf5,
    roughness: 0.38,
    metalness: 0.0,
  });
  mat.userData.sharedCache = true;
  _sharedOreoCremeMaterial = mat;
  return mat;
}

export function buildOreoMesh(x, y, z, scale = 0.20, rotX = 1.38, rotY = -0.20, rotZ = 0.08) {
  const oreoGroup = new THREE.Group();
  const waferGeo = getSharedOreoWaferGeometry();
  const cremeGeo = getSharedOreoCremeGeometry();
  const waferMat = getSharedOreoWaferMaterial();
  const cremeMat = getSharedOreoCremeMaterial();

  const topWafer = new THREE.Mesh(waferGeo, waferMat);
  topWafer.position.set(0, 0.35, 0);
  topWafer.castShadow = true;
  topWafer.receiveShadow = true;
  oreoGroup.add(topWafer);

  const cremeMesh = new THREE.Mesh(cremeGeo, cremeMat);
  cremeMesh.position.set(0, 0, 0);
  cremeMesh.castShadow = true;
  cremeMesh.receiveShadow = true;
  oreoGroup.add(cremeMesh);

  const bottomWafer = new THREE.Mesh(waferGeo, waferMat);
  bottomWafer.position.set(0, -0.35, 0);
  bottomWafer.rotation.x = Math.PI;
  bottomWafer.castShadow = true;
  bottomWafer.receiveShadow = true;
  oreoGroup.add(bottomWafer);

  oreoGroup.scale.set(scale, scale, scale);
  oreoGroup.rotation.set(rotX, rotY, rotZ);
  oreoGroup.position.set(x, y + 1.55 * scale, z);
  return oreoGroup;
}
