import { describe, expect, it } from 'vitest';
import {
  getInteriorPreviewClippingConfig,
  getPieceInteriorPreviewClippingConfig,
} from './sceneUtils';

describe('Petit Fours Interior Preview clipping', () => {
  it('centers the same cut through each piece without mutating shared planes', () => {
    const positions = [
      { x: -1.35, z: -1.35 },
      { x: 1.35, z: -1.35 },
      { x: -1.35, z: 1.35 },
      { x: 1.35, z: 1.35 },
    ];
    const sharedConfig = getInteriorPreviewClippingConfig({
      hasFrosting: true,
      hasDrip: false,
      hasSide: false,
      interiorPreview: true,
    });
    const originalConstants = sharedConfig.frosting.planes.map((plane) => plane.constant);

    for (const position of positions) {
      const pieceConfig = getPieceInteriorPreviewClippingConfig({
        hasFrosting: true,
        hasDrip: false,
        hasSide: false,
        interiorPreview: true,
        position,
      });

      expect(pieceConfig.frosting.planes).not.toBe(sharedConfig.frosting.planes);
      for (const plane of pieceConfig.frosting.planes) {
        const distanceAtPieceOrigin = (
          plane.normal.x * position.x +
          plane.normal.y * (position.y || 0) +
          plane.normal.z * position.z +
          plane.constant
        );
        expect(distanceAtPieceOrigin).toBeCloseTo(0);
      }
    }

    expect(sharedConfig.frosting.planes.map((plane) => plane.constant)).toEqual(originalConstants);
  });

  it('preserves the standard sector selection for Frosting, Glaze, and Side Drip combinations', () => {
    const config = getPieceInteriorPreviewClippingConfig({
      hasFrosting: true,
      hasDrip: true,
      hasSide: false,
      interiorPreview: true,
      position: { x: 1.35, z: -1.35 },
    });

    expect(config.frosting.planes).toHaveLength(2);
    expect(config.drip.planes).toHaveLength(2);
    expect(config.frosting.clipIntersection).toBe(true);
    expect(config.drip.clipIntersection).toBe(false);
    for (const plane of [...config.frosting.planes, ...config.drip.planes]) {
      expect(
        plane.normal.x * 1.35 + plane.normal.z * -1.35 + plane.constant,
      ).toBeCloseTo(0);
    }
  });

  it('keeps all coverings unclipped when Interior Preview is off', () => {
    const config = getPieceInteriorPreviewClippingConfig({
      hasFrosting: true,
      hasDrip: true,
      hasSide: false,
      interiorPreview: false,
      position: { x: 1.35, z: -1.35 },
    });

    expect(config.frosting.planes).toEqual([]);
    expect(config.drip.planes).toEqual([]);
    expect(config.side.planes).toEqual([]);
  });
});
