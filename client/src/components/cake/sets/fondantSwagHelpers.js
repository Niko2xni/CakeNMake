import * as THREE from 'three';

/**
 * Builds the complete Fondant Swag side decoration as a THREE.Group.
 * 
 * @param {number} radius - Radius of the cake tier side wall.
 * @param {number} height - Vertical height allocated for the decoration.
 * @param {string} colorHex - Hex color string for the fondant swag fabric.
 * @returns {THREE.Group} Group containing the swag mesh and joint knots.
 */
export function buildFondantSwag(radius, height, colorHex, variant = 'classic') {
  const group = new THREE.Group();

  let droopMultiplier = 0.52;
  let tileWidthMultiplier = 3.0;

  if (variant === 'deepScallop') {
    droopMultiplier = 0.73;
    tileWidthMultiplier = 3.6;
  } else if (variant === 'shallowRuffle') {
    droopMultiplier = 0.29;
    tileWidthMultiplier = 2.1;
  }

  // Dynamic swag count based on cake circumference to preserve natural drape proportions
  const circumference = 2 * Math.PI * radius;
  const targetTileWidth = tileWidthMultiplier;
  const swagCount = Math.max(4, Math.round(circumference / targetTileWidth));
  const anglePerSwag = (Math.PI * 2) / swagCount;

  // Scaling parameters relative to cake radius & height
  const droopDepth = height * droopMultiplier;
  const foldThickness = Math.min(0.25, radius * 0.06);
  const topYOffset = height * 0.42;

  // 1. Create Swag Geometry Template
  const segmentsX = 64;
  const segmentsY = 16;
  const swagGeoTemplate = new THREE.PlaneGeometry(1, 1, segmentsX, segmentsY);
  const pos = swagGeoTemplate.attributes.position;
  const uvs = swagGeoTemplate.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const u = uvs.getX(i);
    const v = 1.0 - uvs.getY(i); // 0 is top edge, 1 is bottom edge

    // Horizontal angle distribution centered at 0
    const theta = (u - 0.5) * anglePerSwag;

    // Pinch factor: 0 at connections (u=0, u=1), 1 at center (u=0.5)
    const pinch = Math.sin(u * Math.PI);

    // Y-Axis Calculation (Droop/Gravity)
    const topY = topYOffset - (0.04 * height * (1 - pinch));
    const bottomY = topYOffset - droopDepth * pinch;

    // Interpolate Y based on v, heavily skewed to pull the center down
    const y = THREE.MathUtils.lerp(topY, bottomY, Math.pow(v, 0.8));

    // Z/X-Axis Calculation (Volume & Folds)
    let foldProfile = Math.sin(v * Math.PI); // Base outward curve
    if (v > 0.5) {
      foldProfile += Math.sin((v - 0.5) * 2 * Math.PI) * 0.3;
    }

    // Extrude outward from base radius, tapering to 0 at the pinches
    const currentRadius = radius + (foldProfile * foldThickness * pinch);

    // Cylindrical Projection
    const x = currentRadius * Math.sin(theta);
    const z = currentRadius * Math.cos(theta);

    pos.setXYZ(i, x, y, z);
  }

  swagGeoTemplate.computeVertexNormals();

  // 2. Swag Material & Assembly
  const swagMaterial = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.6,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  const rotMat = new THREE.Matrix4();
  const swagGeos = [];

  for (let i = 0; i < swagCount; i++) {
    rotMat.makeRotationY(i * anglePerSwag);
    const clone = new THREE.BufferGeometry();
    clone.setAttribute('position', swagGeoTemplate.getAttribute('position').clone());
    if (swagGeoTemplate.getAttribute('normal')) {
      clone.setAttribute('normal', swagGeoTemplate.getAttribute('normal').clone());
    }
    if (swagGeoTemplate.getAttribute('uv')) {
      clone.setAttribute('uv', swagGeoTemplate.getAttribute('uv').clone());
    }
    if (swagGeoTemplate.getIndex()) {
      clone.setIndex(swagGeoTemplate.getIndex().clone());
    }
    clone.applyMatrix4(rotMat);
    swagGeos.push(clone);
  }

  const mergedSwagGeo = mergeBufferGeometries(swagGeos);
  if (mergedSwagGeo) {
    const swagMesh = new THREE.Mesh(mergedSwagGeo, swagMaterial);
    group.add(swagMesh);
  }

  // 3. Joint Decorations (White Fondant Buttons / Knots)
  const knotRadius = Math.min(0.18, radius * 0.045);
  const knotGeoTemplate = new THREE.SphereGeometry(knotRadius, 16, 16);
  knotGeoTemplate.scale(1, 1, 0.4);

  const knotMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.5,
    metalness: 0.05
  });

  const knotGeos = [];
  for (let i = 0; i < swagCount; i++) {
    const jointAngle = (i * anglePerSwag) - (anglePerSwag / 2);
    const jointX = (radius + knotRadius * 0.3) * Math.sin(jointAngle);
    const jointZ = (radius + knotRadius * 0.3) * Math.cos(jointAngle);
    const jointY = topYOffset - 0.02 * height;

    const knotMat = new THREE.Matrix4();
    const rotYMat = new THREE.Matrix4().makeRotationY(jointAngle);
    const posMat = new THREE.Matrix4().makeTranslation(jointX, jointY, jointZ);
    knotMat.multiplyMatrices(posMat, rotYMat);

    const knotClone = knotGeoTemplate.clone();
    knotClone.applyMatrix4(knotMat);
    knotGeos.push(knotClone);
  }

  const mergedKnotGeo = mergeBufferGeometries(knotGeos);
  if (mergedKnotGeo) {
    const knotMesh = new THREE.Mesh(mergedKnotGeo, knotMaterial);
    group.add(knotMesh);
  }

  swagGeoTemplate.dispose();
  knotGeoTemplate.dispose();

  return group;
}

/**
 * Utility function to merge array of BufferGeometries into a single BufferGeometry.
 */
function mergeBufferGeometries(geometries) {
  if (!geometries || geometries.length === 0) return null;
  if (geometries.length === 1) return geometries[0];

  let totalVertices = 0;
  let totalIndices = 0;

  for (const g of geometries) {
    totalVertices += g.getAttribute('position').count;
    if (g.getIndex()) {
      totalIndices += g.getIndex().count;
    }
  }

  const posAttr = new Float32Array(totalVertices * 3);
  const normAttr = new Float32Array(totalVertices * 3);
  const uvAttr = geometries[0].getAttribute('uv') ? new Float32Array(totalVertices * 2) : null;
  const indexAttr = totalIndices > 0 ? new Uint32Array(totalIndices) : null;

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const g of geometries) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    const idx = g.getIndex();

    posAttr.set(p.array, vertexOffset * 3);
    if (n) normAttr.set(n.array, vertexOffset * 3);
    if (uv && uvAttr) uvAttr.set(uv.array, vertexOffset * 2);

    if (idx && indexAttr) {
      for (let i = 0; i < idx.count; i++) {
        indexAttr[indexOffset + i] = idx.array[i] + vertexOffset;
      }
      indexOffset += idx.count;
    }

    vertexOffset += p.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(posAttr, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normAttr, 3));
  if (uvAttr) merged.setAttribute('uv', new THREE.BufferAttribute(uvAttr, 2));
  if (indexAttr) merged.setIndex(new THREE.BufferAttribute(indexAttr, 1));

  return merged;
}
