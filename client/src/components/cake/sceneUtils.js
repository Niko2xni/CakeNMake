import {
  INTERIOR_PREVIEW_CLIP_PLANES,
  INTERIOR_PREVIEW_CLIP_PLANES_2WAY,
  INTERIOR_PREVIEW_FROSTING_3WAY_PLANES,
  INTERIOR_PREVIEW_SECTOR2_3WAY_PLANES,
  INTERIOR_PREVIEW_SECTOR3_3WAY_PLANES,
  INTERIOR_PREVIEW_SIDE_3WAY_PLANES,
  INTERIOR_PREVIEW_DRIP_3WAY_PLANES,
  INTERIOR_PREVIEW_4WAY_FROSTING_PLANES,
  INTERIOR_PREVIEW_4WAY_DRIP_PLANES,
  INTERIOR_PREVIEW_4WAY_SIDE_PLANES,
} from './cakeConstants';

/**
 * Computes the exact clipping planes and clipIntersection flags for Frosting,
 * Drip, and Side decorations under all Interior Preview configurations:
 * - 4-Way View (90° each): Frosting + Drip + Side
 * - 3-Way View (120° each): Frosting + Drip, Frosting + Side, or Naked + Drip + Side
 * - 2-Way View (180° each): Frosting only, Naked + Drip only, or Naked + Side only
 */
export function getInteriorPreviewClippingConfig({ hasFrosting, hasDrip, hasSide, interiorPreview }) {
  if (!interiorPreview) {
    return {
      frosting: { planes: [], clipIntersection: true },
      drip: { planes: [], clipIntersection: false },
      side: { planes: [], clipIntersection: false },
    };
  }

  // 1. 4-Way View (90° each): Frosting + Drip + Side
  if (hasFrosting && hasDrip && hasSide) {
    return {
      frosting: { planes: INTERIOR_PREVIEW_4WAY_FROSTING_PLANES, clipIntersection: true },
      drip: { planes: INTERIOR_PREVIEW_4WAY_DRIP_PLANES, clipIntersection: false },
      side: { planes: INTERIOR_PREVIEW_4WAY_SIDE_PLANES, clipIntersection: false },
    };
  }

  // 2. 3-Way View (120° each): Frosting + Drip (No Side)
  if (hasFrosting && hasDrip && !hasSide) {
    return {
      frosting: { planes: INTERIOR_PREVIEW_FROSTING_3WAY_PLANES, clipIntersection: true },
      drip: { planes: INTERIOR_PREVIEW_DRIP_3WAY_PLANES, clipIntersection: false },
      side: { planes: [], clipIntersection: false },
    };
  }

  // 3. 3-Way View (120° each): Frosting + Side (No Drip)
  if (hasFrosting && !hasDrip && hasSide) {
    return {
      frosting: { planes: INTERIOR_PREVIEW_FROSTING_3WAY_PLANES, clipIntersection: true },
      drip: { planes: [], clipIntersection: false },
      side: { planes: INTERIOR_PREVIEW_SIDE_3WAY_PLANES, clipIntersection: false },
    };
  }

  // 4. 3-Way View (120° each): Naked + Drip + Side (No Frosting)
  if (!hasFrosting && hasDrip && hasSide) {
    return {
      frosting: { planes: [], clipIntersection: true },
      drip: { planes: INTERIOR_PREVIEW_SECTOR2_3WAY_PLANES, clipIntersection: false },
      side: { planes: INTERIOR_PREVIEW_SIDE_3WAY_PLANES, clipIntersection: false },
    };
  }

  // 5. 2-Way View (180° each): Frosting only
  if (hasFrosting) {
    return {
      frosting: { planes: INTERIOR_PREVIEW_CLIP_PLANES_2WAY, clipIntersection: true },
      drip: { planes: [], clipIntersection: false },
      side: { planes: [], clipIntersection: false },
    };
  }

  // 6. 2-Way View (180° each): Naked + Drip only
  if (hasDrip) {
    return {
      frosting: { planes: [], clipIntersection: true },
      drip: { planes: INTERIOR_PREVIEW_CLIP_PLANES_2WAY, clipIntersection: false },
      side: { planes: [], clipIntersection: false },
    };
  }

  // 7. 2-Way View (180° each): Naked + Side only
  if (hasSide) {
    return {
      frosting: { planes: [], clipIntersection: true },
      drip: { planes: [], clipIntersection: false },
      side: { planes: INTERIOR_PREVIEW_CLIP_PLANES_2WAY, clipIntersection: false },
    };
  }

  // 8. Naked only (no coverings)
  return {
    frosting: { planes: [], clipIntersection: true },
    drip: { planes: [], clipIntersection: false },
    side: { planes: [], clipIntersection: false },
  };
}

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
export function registerNewChildrenForClipping(group, startIndex, coveringMaterialsRef, interiorPreview, customPlanes, clipIntersection = true) {
  const planes = customPlanes || INTERIOR_PREVIEW_CLIP_PLANES;
  for (let i = startIndex; i < group.children.length; i++) {
    group.children[i].traverse((node) => {
      const mats = Array.isArray(node.material) ? node.material : (node.material ? [node.material] : []);
      for (const mat of mats) {
        if (!mat) continue;
        mat.clippingPlanes = interiorPreview ? planes : [];
        mat.clipIntersection = clipIntersection;
        mat.clipShadows = true;
        coveringMaterialsRef.current.push(mat);
      }
    });
  }
}

/**
 * Checks if a given cylindrical angle is within the visible (unclipped)
 * region defined by a set of clipping planes and clipIntersection flag.
 */
export function isAngleUnclippedByPlanes(angle, planes, clipIntersection = false) {
  if (!planes || planes.length === 0) return true;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  if (clipIntersection) {
    return planes.some((p) => (p.normal.x * cosA + p.normal.z * sinA + p.constant) >= -1e-4);
  }
  return planes.every((p) => (p.normal.x * cosA + p.normal.z * sinA + p.constant) >= -1e-4);
}

