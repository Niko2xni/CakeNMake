import * as THREE from 'three';
let _sharedSoccerBumpTexture = null;
export function getSharedSoccerBumpTexture() {
  if (_sharedSoccerBumpTexture) return _sharedSoccerBumpTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const s1 = Math.sin(x * 0.04 + y * 0.03) * Math.cos(y * 0.04 - x * 0.02);
      const s2 = Math.sin(x * 0.08) * Math.cos(y * 0.08);
      const g1 = Math.sin(x * 0.4) * Math.cos(y * 0.4);
      const g2 = Math.sin(x * 0.8 + y * 0.6) * 0.5;

      const frostingHeight = (s1 * 0.65 + s2 * 0.35) * 0.75 + (g1 * 0.6 + g2 * 0.4) * 0.25;
      const val = Math.round(128 + frostingHeight * 32);

      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.userData.sharedCache = true;

  _sharedSoccerBumpTexture = texture;
  return texture;
}

let _sharedSoccerPentagonMat = null;
export function getSharedSoccerPentagonMat() {
  if (_sharedSoccerPentagonMat) return _sharedSoccerPentagonMat;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x140d0a,
    roughness: 0.26,
    metalness: 0.0,
    bumpMap: getSharedSoccerBumpTexture(),
    bumpScale: 0.012,
  });
  mat.userData.sharedCache = true;
  _sharedSoccerPentagonMat = mat;
  return mat;
}

let _sharedSoccerHexagonMat = null;
export function getSharedSoccerHexagonMat() {
  if (_sharedSoccerHexagonMat) return _sharedSoccerHexagonMat;
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfffdf6,
    roughness: 0.35,
    metalness: 0.0,
    bumpMap: getSharedSoccerBumpTexture(),
    bumpScale: 0.012,
  });
  mat.userData.sharedCache = true;
  _sharedSoccerHexagonMat = mat;
  return mat;
}

let _sharedSoccerSeamMat = null;
export function getSharedSoccerSeamMat() {
  if (_sharedSoccerSeamMat) return _sharedSoccerSeamMat;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0c0705,
    roughness: 0.55,
    metalness: 0.0,
  });
  mat.userData.sharedCache = true;
  _sharedSoccerSeamMat = mat;
  return mat;
}

let _sharedSoccerInnerSphereGeo = null;
export function getSharedSoccerInnerSphereGeo() {
  if (_sharedSoccerInnerSphereGeo) return _sharedSoccerInnerSphereGeo;
  const geo = new THREE.SphereGeometry(2.75 * 0.995, 32, 24);
  geo.userData.sharedCache = true;
  _sharedSoccerInnerSphereGeo = geo;
  return geo;
}

let _sharedSoccerPanelGeos = null;
export function getOrBuildSoccerPanelGeos() {
  if (_sharedSoccerPanelGeos) return _sharedSoccerPanelGeos;

  const R = 2.75;
  const phi = (1.0 + Math.sqrt(5.0)) / 2.0;
  const icoVerts = [
    new THREE.Vector3(0, 1, phi).normalize(),
    new THREE.Vector3(0, -1, phi).normalize(),
    new THREE.Vector3(0, 1, -phi).normalize(),
    new THREE.Vector3(0, -1, -phi).normalize(),
    new THREE.Vector3(1, phi, 0).normalize(),
    new THREE.Vector3(-1, phi, 0).normalize(),
    new THREE.Vector3(1, -phi, 0).normalize(),
    new THREE.Vector3(-1, -phi, 0).normalize(),
    new THREE.Vector3(phi, 0, 1).normalize(),
    new THREE.Vector3(-phi, 0, 1).normalize(),
    new THREE.Vector3(phi, 0, -1).normalize(),
    new THREE.Vector3(-phi, 0, -1).normalize(),
  ];

  const neighbors = Array.from({ length: 12 }, () => []);
  for (let i = 0; i < 12; i++) {
    for (let j = i + 1; j < 12; j++) {
      if (icoVerts[i].distanceTo(icoVerts[j]) < 1.1) {
        neighbors[i].push(j);
        neighbors[j].push(i);
      }
    }
  }

  const icoFaces = [];
  for (let i = 0; i < 12; i++) {
    const nList = neighbors[i];
    for (let j = 0; j < nList.length; j++) {
      const u = nList[j];
      if (u > i) {
        for (let k = j + 1; k < nList.length; k++) {
          const v = nList[k];
          if (v > u && neighbors[u].includes(v)) {
            const vA = icoVerts[i], vB = icoVerts[u], vC = icoVerts[v];
            const normal = new THREE.Vector3().crossVectors(
              new THREE.Vector3().subVectors(vB, vA),
              new THREE.Vector3().subVectors(vC, vA)
            );
            if (normal.dot(vA) > 0) {
              icoFaces.push([i, u, v]);
            } else {
              icoFaces.push([i, v, u]);
            }
          }
        }
      }
    }
  }

  function buildPillowedPanelGeometry(boundaryVerts, centerVec) {
    const numSides = boundaryVerts.length;
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const radialRings = 10;
    const segmentsPerSide = 5;
    const totalPerimeterVerts = numSides * segmentsPerSide;

    const bulgeFactor = 0.034;
    const bevelFactor = 0.018;

    function calcRadius(t) {
      const dome = Math.pow(Math.cos(t * Math.PI * 0.5), 1.8) * bulgeFactor;
      const bevel = Math.pow(Math.max(0, (t - 0.78) / 0.22), 2.0) * bevelFactor;
      return R * (1.0 + dome - bevel);
    }

    const centerPos = centerVec.clone().normalize().multiplyScalar(calcRadius(0.0));
    positions.push(centerPos.x, centerPos.y, centerPos.z);
    normals.push(centerVec.x, centerVec.y, centerVec.z);
    uvs.push(0.5, 0.5);

    for (let r = 1; r <= radialRings; r++) {
      const t = r / radialRings;
      const curRadius = calcRadius(t);

      for (let s = 0; s < numSides; s++) {
        const vCurrent = boundaryVerts[s];
        const vNext = boundaryVerts[(s + 1) % numSides];

        for (let k = 0; k < segmentsPerSide; k++) {
          const u = k / segmentsPerSide;
          const edgePoint = new THREE.Vector3().lerpVectors(vCurrent, vNext, u).normalize();
          const ringDir = new THREE.Vector3().lerpVectors(centerVec, edgePoint, t).normalize();
          const pos = ringDir.clone().multiplyScalar(curRadius);

          positions.push(pos.x, pos.y, pos.z);
          normals.push(ringDir.x, ringDir.y, ringDir.z);

          const uvAngle = ((s * segmentsPerSide + k) / totalPerimeterVerts) * Math.PI * 2;
          uvs.push(0.5 + 0.45 * t * Math.cos(uvAngle), 0.5 + 0.45 * t * Math.sin(uvAngle));
        }
      }
    }

    for (let i = 0; i < totalPerimeterVerts; i++) {
      const nextI = (i + 1) % totalPerimeterVerts;
      indices.push(0, 1 + i, 1 + nextI);
    }

    for (let r = 1; r < radialRings; r++) {
      const baseInner = 1 + (r - 1) * totalPerimeterVerts;
      const baseOuter = 1 + r * totalPerimeterVerts;
      for (let i = 0; i < totalPerimeterVerts; i++) {
        const nextI = (i + 1) % totalPerimeterVerts;
        const i0 = baseInner + i;
        const i1 = baseOuter + i;
        const i2 = baseOuter + nextI;
        const i3 = baseInner + nextI;

        indices.push(i0, i1, i3);
        indices.push(i1, i2, i3);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.userData.sharedCache = true;
    return geo;
  }

  // 12 Pentagons
  const pentagonGeos = [];
  for (let i = 0; i < 12; i++) {
    const center = icoVerts[i];
    const nList = [...neighbors[i]];

    const ref = icoVerts[nList[0]];
    const tangentU = new THREE.Vector3().subVectors(ref, center.clone().multiplyScalar(center.dot(ref))).normalize();
    const tangentV = new THREE.Vector3().crossVectors(center, tangentU).normalize();

    nList.sort((a, b) => {
      const vA = icoVerts[a], vB = icoVerts[b];
      const angleA = Math.atan2(vA.dot(tangentV), vA.dot(tangentU));
      const angleB = Math.atan2(vB.dot(tangentV), vB.dot(tangentU));
      return angleA - angleB;
    });

    const boundaryVerts = nList.map((nIdx) => {
      return new THREE.Vector3().addVectors(
        center.clone().multiplyScalar(2.0),
        icoVerts[nIdx]
      ).normalize();
    });

    pentagonGeos.push(buildPillowedPanelGeometry(boundaryVerts, center));
  }

  // 20 Hexagons
  const hexagonGeos = [];
  for (let f = 0; f < icoFaces.length; f++) {
    const [iA, iB, iC] = icoFaces[f];
    const vA = icoVerts[iA], vB = icoVerts[iB], vC = icoVerts[iC];
    const center = new THREE.Vector3().addVectors(vA, vB).add(vC).normalize();

    const boundaryVerts = [
      new THREE.Vector3().addVectors(vA.clone().multiplyScalar(2.0), vB).normalize(),
      new THREE.Vector3().addVectors(vA, vB.clone().multiplyScalar(2.0)).normalize(),
      new THREE.Vector3().addVectors(vB.clone().multiplyScalar(2.0), vC).normalize(),
      new THREE.Vector3().addVectors(vB, vC.clone().multiplyScalar(2.0)).normalize(),
      new THREE.Vector3().addVectors(vC.clone().multiplyScalar(2.0), vA).normalize(),
      new THREE.Vector3().addVectors(vC, vA.clone().multiplyScalar(2.0)).normalize(),
    ];

    hexagonGeos.push(buildPillowedPanelGeometry(boundaryVerts, center));
  }

  _sharedSoccerPanelGeos = { pentagonGeos, hexagonGeos };
  return _sharedSoccerPanelGeos;
}

export function buildSoccerBallMesh(x, y, z, scale = 0.22) {
  const topperGroup = new THREE.Group();
  const radius = 2.75;

  const { pentagonGeos, hexagonGeos } = getOrBuildSoccerPanelGeos();
  const pentagonMat = getSharedSoccerPentagonMat();
  const hexagonMat = getSharedSoccerHexagonMat();
  const seamMat = getSharedSoccerSeamMat();
  const innerSphereGeo = getSharedSoccerInnerSphereGeo();

  const ballSphereGroup = new THREE.Group();

  const pentagonGroup = new THREE.Group();
  for (let i = 0; i < pentagonGeos.length; i++) {
    const mesh = new THREE.Mesh(pentagonGeos[i], pentagonMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pentagonGroup.add(mesh);
  }
  ballSphereGroup.add(pentagonGroup);

  const hexagonGroup = new THREE.Group();
  for (let i = 0; i < hexagonGeos.length; i++) {
    const mesh = new THREE.Mesh(hexagonGeos[i], hexagonMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    hexagonGroup.add(mesh);
  }
  ballSphereGroup.add(hexagonGroup);

  const innerSphereMesh = new THREE.Mesh(innerSphereGeo, seamMat);
  ballSphereGroup.add(innerSphereMesh);

  ballSphereGroup.position.set(0, radius * 0.82, 0);
  ballSphereGroup.rotation.set(0.25, 0.55, -0.12);
  topperGroup.add(ballSphereGroup);

  topperGroup.scale.set(scale, scale, scale);
  topperGroup.position.set(x, y, z);
  return topperGroup;
}
