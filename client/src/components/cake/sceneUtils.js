import { INTERIOR_PREVIEW_CLIP_PLANES } from './cakeConstants';

/**
 * Frees GPU resources (geometry buffers, compiled shader programs, and
 * textures) for everything under obj, EXCEPT anything tagged
 * userData.sharedCache — those are intentionally reused across rebuilds
 * (sponge/filling materials, piping unit geometries, the shared dummy
 * map) via markShared()/direct tagging and the caches in this file and
 * pipingTips.js.
 */
export function disposeSceneObject(obj) {
  obj.traverse((node) => {
    if (node.geometry && !node.geometry.userData?.sharedCache) {
      node.geometry.dispose();
    }
    const mats = Array.isArray(node.material) ? node.material : (node.material ? [node.material] : []);
    for (const mat of mats) {
      if (!mat) continue;
      // Dispose any per-instance textures (e.g. checker pattern canvases)
      // this material owns, unless they're tagged as a shared/cached
      // resource (the dummy map every sponge/filling material uses).
      for (const key of Object.keys(mat)) {
        const value = mat[key];
        if (value && value.isTexture && !value.userData?.sharedCache) {
          value.dispose();
        }
      }
      if (!mat.userData?.sharedCache) {
        mat.dispose();
      }
    }
  });
}

/**
 * Registers every material on children of `group` added since
 * `startIndex` into coveringMaterialsRef, so Interior Preview's wedge
 * clips through them. Used for addTuxedo/addWhippedCreamSkirt, whose
 * internals build their own materials that we can't tag directly at
 * creation time (we don't have those files) — this captures them
 * generically by diffing the group's children before/after the call,
 * instead of needing to modify skirtHelpers.jsx/tuxedoHelpers.jsx at all.
 */
export function registerNewChildrenForClipping(group, startIndex, coveringMaterialsRef, interiorPreview) {
  for (let i = startIndex; i < group.children.length; i++) {
    group.children[i].traverse((node) => {
      const mats = Array.isArray(node.material) ? node.material : (node.material ? [node.material] : []);
      for (const mat of mats) {
        if (!mat) continue;
        mat.clippingPlanes = interiorPreview ? INTERIOR_PREVIEW_CLIP_PLANES : [];
        mat.clipIntersection = true;
        mat.clipShadows = true;
        coveringMaterialsRef.current.push(mat);
      }
    });
  }
}
