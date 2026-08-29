// ---------------------------------------------------------------------------
// Shared material utilities — extracted here to avoid circular imports
// between CakeScene.jsx and frostingMaterial.js (both need these).
// ---------------------------------------------------------------------------

import * as THREE from 'three';

// ── Shared cache tag ───────────────────────────────────────────────────────
/** Tags a material (or array of materials) as belonging to a cache that
 *  persists across rebuilds — the disposal pass in buildCake must skip
 *  anything tagged this way, or the next rebuild reusing this cached
 *  entry would get a material whose compiled shader/GPU resources were
 *  already freed. */
export function markShared(matOrArray) {
  if (Array.isArray(matOrArray)) {
    matOrArray.forEach((m) => { if (m) m.userData.sharedCache = true; });
  } else if (matOrArray) {
    matOrArray.userData.sharedCache = true;
  }
  return matOrArray;
}

// ── Dummy 1×1 texture ──────────────────────────────────────────────────────
// Purely to activate Three's USE_UV / vUv machinery so we can read vUv in
// fragment shaders — its actual pixel content is never used since our
// injected code fully overwrites diffuseColor.
let _spongeDummyMap = null;
export function getSpongeDummyMap() {
  if (_spongeDummyMap) return _spongeDummyMap;
  _spongeDummyMap = new THREE.DataTexture(
    new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat
  );
  _spongeDummyMap.needsUpdate = true;
  _spongeDummyMap.userData.sharedCache = true;
  return _spongeDummyMap;
}
