import * as THREE from 'three';

export function ferreroPseudoNoise3D(x, y, z) {
  const s1 = Math.sin(x * 3.4 + y * 2.8 + z * 3.1);
  const s2 = Math.cos(x * 6.7 - y * 5.9 + z * 6.2);
  const s3 = Math.sin(x * 12.2 + y * 11.6 - z * 10.9);
  const s4 = Math.cos(x * 21.3 + y * 19.1 + z * 23.4);
  return s1 * 0.45 + s2 * 0.30 + s3 * 0.15 + s4 * 0.10;
}

let _sharedFerreroNormalTexture = null;
export function getSharedFerreroNormalTexture() {
  if (_sharedFerreroNormalTexture) return _sharedFerreroNormalTexture;
  const size = 512;
  const heightMap = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const wave1 = Math.sin(x * 0.16 + y * 0.12) * 0.08;
      const wave2 = Math.cos(y * 0.20 - x * 0.15) * 0.06;
      const grain = (Math.random() - 0.5) * 0.22;
      heightMap[y * size + x] = 0.5 + wave1 + wave2 + grain;
    }
  }

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext('2d');
  const nImgData = nCtx.createImageData(size, size);
  const nData = nImgData.data;

  const strength = 3.0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const xL = (x - 1 + size) % size;
      const xR = (x + 1) % size;
      const yU = (y - 1 + size) % size;
      const yD = (y + 1) % size;

      const dX = (heightMap[y * size + xR] - heightMap[y * size + xL]) * strength;
      const dY = (heightMap[yD * size + x] - heightMap[yU * size + x]) * strength;

      const len = Math.sqrt(dX * dX + dY * dY + 1.0);
      const nx = (-dX / len) * 0.5 + 0.5;
      const ny = (-dY / len) * 0.5 + 0.5;
      const nz = (1.0 / len) * 0.5 + 0.5;

      nData[idx] = Math.floor(nx * 255);
      nData[idx + 1] = Math.floor(ny * 255);
      nData[idx + 2] = Math.floor(nz * 255);
      nData[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImgData, 0, 0);

  const normalTexture = new THREE.CanvasTexture(normalCanvas);
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.RepeatWrapping;
  normalTexture.repeat.set(4, 4);
  normalTexture.userData.sharedCache = true;
  _sharedFerreroNormalTexture = normalTexture;
  return normalTexture;
}

let _sharedFerreroGeometry = null;
export function getSharedFerreroGeometry() {
  if (_sharedFerreroGeometry) return _sharedFerreroGeometry;

  const baseRadius = 1.34;
  const nutCount = 100;
  const widthSegments = 64;
  const heightSegments = 48;

  const nutPoints = [];
  let seed = 42;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  for (let i = 0; i < nutCount; i++) {
    const u = rand();
    const v = rand();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);

    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.sin(phi) * Math.sin(theta);
    const nz = Math.cos(phi);
    const dir = new THREE.Vector3(nx, ny, nz).normalize();

    const nutSize = 0.09 + Math.pow(rand(), 1.5) * 0.20;
    const nutHeight = 0.08 + Math.pow(rand(), 1.2) * 0.15;
    const isExposed = rand() > 0.42;

    nutPoints.push({
      dir,
      radius: nutSize,
      height: nutHeight,
      isExposed,
      facetNoiseFreq: 4.5 + rand() * 5.5,
      facetSeed: rand() * 100,
    });
  }

  const geometry = new THREE.SphereGeometry(baseRadius, widthSegments, heightSegments);
  const pos = geometry.attributes.position;
  const colors = [];

  const colChocolateDeep = new THREE.Color(0x522c15);
  const colChocolateGlaze = new THREE.Color(0x754320);
  const colChocolateHighlight = new THREE.Color(0x995c2e);
  const colNutSkin = new THREE.Color(0x7a4924);
  const colNutToastedMid = new THREE.Color(0xb58043);
  const colNutFleshLight = new THREE.Color(0xdfba7c);
  const colNutCoreCream = new THREE.Color(0xf5e3be);

  const _finalCol = new THREE.Color();
  const _nutFlesh = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1.0;
    const dirX = vx / len;
    const dirY = vy / len;
    const dirZ = vz / len;

    const baseNoise = ferreroPseudoNoise3D(dirX * 2.5, dirY * 2.5, dirZ * 2.5) * 0.035;
    const seamDist = Math.abs(dirY);
    const seamBump = Math.exp(-seamDist * seamDist * 35) * 0.02;

    let d1 = Infinity;
    let d2 = Infinity;
    let closestNut = null;

    for (let k = 0; k < nutPoints.length; k++) {
      const nut = nutPoints[k];
      const dot = dirX * nut.dir.x + dirY * nut.dir.y + dirZ * nut.dir.z;
      if (dot < 0.65) continue;

      const clampedDot = Math.max(-1.0, Math.min(1.0, dot));
      const dist = Math.acos(clampedDot);

      if (dist < d1) {
        d2 = d1;
        d1 = dist;
        closestNut = nut;
      } else if (dist < d2) {
        d2 = dist;
      }
    }

    let nutDisplacement = 0;
    let nutProtrusion = 0;
    let facetDetail = 0;

    if (closestNut) {
      const influenceAngle = (closestNut.radius * 1.55) / baseRadius;

      if (d1 < influenceAngle) {
        const t = d1 / influenceAngle;
        const bell = Math.pow(Math.max(0, 1.0 - t * t), 1.1);
        const edgeValley = Math.min(1.0, (d2 - d1) / 0.08);

        facetDetail = Math.sin(dirX * closestNut.facetNoiseFreq * 6 + dirY * closestNut.facetNoiseFreq * 5 + closestNut.facetSeed) * 0.018 * bell;

        nutDisplacement = (bell * 0.82 + edgeValley * 0.18) * closestNut.height + facetDetail;
        nutProtrusion = bell * (0.35 + edgeValley * 0.65);
      }
    }

    const glazeMicro = ferreroPseudoNoise3D(dirX * 14.0, dirY * 14.0, dirZ * 14.0) * 0.012;
    const finalRadius = baseRadius + baseNoise + seamBump + nutDisplacement + glazeMicro;

    pos.setXYZ(i, dirX * finalRadius, dirY * finalRadius, dirZ * finalRadius);

    if (nutProtrusion < 0.38) {
      const t = nutProtrusion / 0.38;
      _finalCol.copy(colChocolateDeep).lerp(colChocolateGlaze, t);
    } else if (nutProtrusion < 0.78 || (closestNut && !closestNut.isExposed)) {
      const t = (nutProtrusion - 0.38) / 0.40;
      _finalCol.copy(colChocolateGlaze).lerp(colChocolateHighlight, t);
    } else {
      const t = (nutProtrusion - 0.78) / 0.22;
      _nutFlesh.copy(colNutToastedMid).lerp(colNutFleshLight, t);
      if (t > 0.60) {
        _nutFlesh.lerp(colNutCoreCream, (t - 0.60) * (1.0 / 0.40) * 0.45);
      }
      _finalCol.copy(_nutFlesh);
    }

    colors.push(_finalCol.r, _finalCol.g, _finalCol.b);
  }

  pos.needsUpdate = true;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.userData.sharedCache = true;

  _sharedFerreroGeometry = geometry;
  return geometry;
}

let _sharedFerreroMaterial = null;
export function getSharedFerreroMaterial() {
  if (_sharedFerreroMaterial) return _sharedFerreroMaterial;
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    normalMap: getSharedFerreroNormalTexture(),
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.38,
    metalness: 0.04,
  });
  mat.userData.sharedCache = true;
  _sharedFerreroMaterial = mat;
  return mat;
}

export function buildFerreroRocherMesh(x, y, z, scale = 0.28) {
  const geo = getSharedFerreroGeometry();
  const mat = getSharedFerreroMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(scale, scale, scale);
  mesh.position.set(x, y + 0.90 * scale, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
