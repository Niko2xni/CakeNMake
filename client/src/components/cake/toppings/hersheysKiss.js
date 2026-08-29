import * as THREE from 'three';

let _sharedHersheysKissGeometry = null;
export function getSharedHersheysKissGeometry() {
  if (_sharedHersheysKissGeometry) return _sharedHersheysKissGeometry;

  const baseRadius = 1.25;
  const height = 2.20;
  const radialSegments = 64;
  const heightSegments = 64;
  const tipCurl = 1.0;
  const curlAngle = 0.40;

  const splinePoints = [
    new THREE.Vector2(0.00, 0.000),
    new THREE.Vector2(0.85, 0.004),
    new THREE.Vector2(0.98, 0.025),
    new THREE.Vector2(1.00, 0.150),
    new THREE.Vector2(0.88, 0.320),
    new THREE.Vector2(0.50, 0.540),
    new THREE.Vector2(0.20, 0.780),
    new THREE.Vector2(0.07, 0.940),
    new THREE.Vector2(0.00, 1.000),
  ];
  const profileSpline = new THREE.SplineCurve(splinePoints);

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= heightSegments; j++) {
    const v = j / heightSegments;
    const pt = profileSpline.getPoint(v);
    const r = pt.x * baseRadius;
    const y = pt.y * height;

    const curlFactor = Math.pow(Math.max(0, v - 0.45) / 0.55, 2.6) * 0.38 * tipCurl;
    const centerOffsetX = curlFactor * Math.cos(curlAngle);
    const centerOffsetZ = curlFactor * Math.sin(curlAngle);

    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const theta = u * Math.PI * 2;

      const px = centerOffsetX + r * Math.cos(theta);
      const pz = centerOffsetZ + r * Math.sin(theta);
      const py = y;

      positions.push(px, py, pz);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < heightSegments; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = j * (radialSegments + 1) + i;
      const b = (j + 1) * (radialSegments + 1) + i;
      const c = (j + 1) * (radialSegments + 1) + (i + 1);
      const d = j * (radialSegments + 1) + (i + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.userData.sharedCache = true;

  _sharedHersheysKissGeometry = geometry;
  return geometry;
}

let _sharedHersheysKissMaterial = null;
export function getSharedHersheysKissMaterial() {
  if (_sharedHersheysKissMaterial) return _sharedHersheysKissMaterial;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x7b3f18,
    roughness: 0.52,
    metalness: 0.0,
  });
  mat.userData.sharedCache = true;
  _sharedHersheysKissMaterial = mat;
  return mat;
}

export function buildHersheysKissMesh(x, y, z, scale = 0.22, rotY = 0) {
  const geo = getSharedHersheysKissGeometry();
  const mat = getSharedHersheysKissMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(scale, scale, scale);
  mesh.rotation.y = rotY;
  mesh.position.set(x, y - 0.18 * scale, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
