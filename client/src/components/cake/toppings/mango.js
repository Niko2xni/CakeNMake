import * as THREE from 'three';

let _sharedMangoCubeGeo = null;
let _sharedMangoCubeMat = null;

/**
 * Builds a rounded, organic fruit cube representing fresh diced mango.
 * The cube has rounded edges and soft corners with subtle organic pulp
 * variations so it reads as real hand-cut fruit rather than an artificial block.
 */
export function getSharedMangoCubeGeometry() {
  if (_sharedMangoCubeGeo) return _sharedMangoCubeGeo;

  const halfSize = 0.18; // total width ~0.36
  const core = 0.135;
  const bevel = 0.045;
  const segments = 12;

  const geo = new THREE.BoxGeometry(halfSize * 2, halfSize * 2, halfSize * 2, segments, segments, segments);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);

    // Clamp to core box
    const cx = Math.max(-core, Math.min(core, vx));
    const cy = Math.max(-core, Math.min(core, vy));
    const cz = Math.max(-core, Math.min(core, vz));

    const dx = vx - cx;
    const dy = vy - cy;
    const dz = vz - cz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    let nx = vx;
    let ny = vy;
    let nz = vz;

    if (dist > 0.0001) {
      nx = cx + (dx / dist) * bevel;
      ny = cy + (dy / dist) * bevel;
      nz = cz + (dz / dist) * bevel;
    }

    // Subtle organic pulp micro-surface modulation for fresh-cut fruit texture
    const bump = Math.sin(vx * 24.0) * Math.cos(vz * 24.0) * 0.004;
    pos.setXYZ(i, nx + bump, ny + bump, nz + bump);
  }

  // Grounding adjustment: align base flush on surface with subtle frosting nestle
  geo.computeBoundingBox();
  const minY = geo.boundingBox.min.y;
  geo.translate(0, -minY - 0.015, 0);

  geo.computeVertexNormals();
  geo.userData.sharedCache = true;
  _sharedMangoCubeGeo = geo;
  return geo;
}

export function getSharedMangoCubeMaterial() {
  if (_sharedMangoCubeMat) return _sharedMangoCubeMat;

  const mat = new THREE.MeshPhysicalMaterial({
    color: '#ffa000',           // Rich golden Philippine mango pulp
    roughness: 0.22,             // Wet juicy cut fruit texture
    metalness: 0.02,
    clearcoat: 0.80,             // Glossy fruit nectar glaze
    clearcoatRoughness: 0.12,
    sheen: 0.50,                 // Subsurface pulp light scattering
    sheenColor: new THREE.Color('#ffe26a'), // Warm sun-drenched mango highlight
    sheenRoughness: 0.32,
  });

  mat.userData.sharedCache = true;
  _sharedMangoCubeMat = mat;
  return mat;
}

/**
 * Builds a single high-fidelity cube-shaped mango mesh group.
 * Features:
 * - Natural beveled/rounded diced mango cube geometry
 * - Juicy pulp micro-texture
 * - Rich ripe mango nectar gloss and sheen
 * - Grounded base resting flush nestled in cake frosting
 */
export function buildMangoCubeMesh(x = 0, y = 0, z = 0, scale = 1.0, _rand = Math.random) {
  const root = new THREE.Group();
  root.userData.designId = 'mangoCube';

  const geo = getSharedMangoCubeGeometry();
  const mat = getSharedMangoCubeMaterial();

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isMangoBody = true;
  root.add(mesh);

  root.scale.set(scale, scale, scale);
  root.position.set(x, y, z);
  return root;
}

/**
 * Drop-in helper to add a mango cube to a group
 */
export function addMangoCube(group, x, y, z, _rand = Math.random) {
  const mango = buildMangoCubeMesh(x, y, z, 0.95, _rand);
  group.add(mango);
  return mango;
}

export const addMango = addMangoCube;
