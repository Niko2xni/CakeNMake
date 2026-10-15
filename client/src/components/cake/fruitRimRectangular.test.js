import { beforeAll, describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  buildCherryRimRing,
  buildCherryRimRingSparse,
  buildStrawberryRimRing,
  buildHersheysKissRimRing,
  buildFerreroRocherRimRing,
  buildOreoRimRing,
  buildBasketballRimRing,
  buildSoccerBallRimRing,
} from './DecorationSets';
import { getSharedCherryBodyGeometry } from './toppings/cherry';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4096) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
  }));
});

describe('Fruit and Topping Rim rings on rectangular and boxy cakes', () => {
  it('correctly constructs cherry rim ring on rectangular cake without distortion', () => {
    const radius = 4;
    const y = 2.0;
    const ring = buildCherryRimRing(radius, y, () => 0.5, {
      shape: 'rectangle',
      baseRadius: radius,
    });

    expect(ring).toBeDefined();
    expect(ring.userData.morphedToBoxy).toBe(true);
    expect(ring.children.length).toBeGreaterThanOrEqual(10);

    const positions = [];
    const expectedHalfW = radius * 1.25; // 5.0
    const expectedHalfD = radius * 0.85; // 3.4

    const sharedCherryGeo = getSharedCherryBodyGeometry();
    sharedCherryGeo.computeBoundingBox();
    const refExtentX = sharedCherryGeo.boundingBox.max.x - sharedCherryGeo.boundingBox.min.x;
    const refExtentZ = sharedCherryGeo.boundingBox.max.z - sharedCherryGeo.boundingBox.min.z;

    for (const cherry of ring.children) {
      expect(cherry.userData.isRigidDecor).toBe(true);
      expect(cherry.userData.morphedToBoxy).toBe(true);

      // Verify uniform scale (no non-uniform elongation)
      expect(cherry.scale.x).toBeCloseTo(0.85, 4);
      expect(cherry.scale.y).toBeCloseTo(0.85, 4);
      expect(cherry.scale.z).toBeCloseTo(0.85, 4);

      // Verify cherry position along rim
      expect(cherry.position.y).toBeCloseTo(y, 4);
      expect(Math.abs(cherry.position.x)).toBeLessThanOrEqual(expectedHalfW + 0.05);
      expect(Math.abs(cherry.position.z)).toBeLessThanOrEqual(expectedHalfD + 0.05);

      positions.push(cherry.position.clone());

      // Verify internal body mesh geometry vertices are identical to reference (not stretched)
      const bodyMesh = cherry.children.find((c) => c.userData?.isCherryBody);
      expect(bodyMesh).toBeDefined();

      bodyMesh.geometry.computeBoundingBox();
      const bbox = bodyMesh.geometry.boundingBox;
      const extentX = bbox.max.x - bbox.min.x;
      const extentZ = bbox.max.z - bbox.min.z;
      expect(extentX).toBeCloseTo(refExtentX, 5);
      expect(extentZ).toBeCloseTo(refExtentZ, 5);
    }

    // Verify consecutive distances along perimeter
    for (let i = 0; i < positions.length; i++) {
      const nextPos = positions[(i + 1) % positions.length];
      const dist = positions[i].distanceTo(nextPos);
      expect(dist).toBeGreaterThan(0.5);
      expect(dist).toBeLessThan(3.0);
    }
  });

  it('correctly constructs sparse cherry and kiss rim on rectangular cake', () => {
    const ring = buildCherryRimRingSparse(3.0, 1.5, () => 0.5, {
      shape: 'rectangle',
      baseRadius: 3.0,
    });

    expect(ring).toBeDefined();
    expect(ring.userData.morphedToBoxy).toBe(true);
    expect(ring.children.length).toBeGreaterThanOrEqual(6);

    for (const item of ring.children) {
      expect(item.userData.isRigidDecor).toBe(true);
      expect(item.userData.morphedToBoxy).toBe(true);
    }
  });

  it('correctly constructs strawberry rim on rectangular cake', () => {
    const ring = buildStrawberryRimRing(3.0, 1.5, () => 0.5, {
      shape: 'rectangle',
      baseRadius: 3.0,
    });

    expect(ring).toBeDefined();
    expect(ring.userData.morphedToBoxy).toBe(true);
    for (const strawberry of ring.children) {
      expect(strawberry.userData.isRigidDecor).toBe(true);
      expect(strawberry.userData.morphedToBoxy).toBe(true);
      expect(strawberry.scale.x).toBeCloseTo(0.82, 4);
      expect(strawberry.scale.y).toBeCloseTo(0.82, 4);
      expect(strawberry.scale.z).toBeCloseTo(0.82, 4);
    }
  });

  it('correctly constructs hersheys kiss rim on rectangular cake', () => {
    const ring = buildHersheysKissRimRing(3.0, 1.5, () => 0.5, {
      shape: 'rectangle',
      baseRadius: 3.0,
    });

    expect(ring).toBeDefined();
    expect(ring.userData.morphedToBoxy).toBe(true);
    for (const kiss of ring.children) {
      expect(kiss.userData.isRigidDecor).toBe(true);
      expect(kiss.userData.morphedToBoxy).toBe(true);
    }
  });

  it('correctly constructs ferrero rocher rim on square cake', () => {
    const ring = buildFerreroRocherRimRing(3.0, 1.5, () => 0.5, {
      shape: 'square',
      baseRadius: 3.0,
    });

    expect(ring).toBeDefined();
    expect(ring.userData.morphedToBoxy).toBe(true);
    for (const truffle of ring.children) {
      expect(truffle.userData.isRigidDecor).toBe(true);
      expect(truffle.userData.morphedToBoxy).toBe(true);
    }
  });

  it('correctly constructs oreo rim on rectangular cake', () => {
    const ring = buildOreoRimRing(3.0, 1.5, () => 0.5, {
      shape: 'rectangle',
      baseRadius: 3.0,
    });

    expect(ring).toBeDefined();
    expect(ring.userData.morphedToBoxy).toBe(true);
    for (const oreo of ring.children) {
      expect(oreo.userData.isRigidDecor).toBe(true);
      expect(oreo.userData.morphedToBoxy).toBe(true);
    }
  });

  it('correctly constructs basketball and soccer rim rings on rectangular cake', () => {
    const bbRing = buildBasketballRimRing(3.0, 1.5, () => 0.5, {
      shape: 'rectangle',
      baseRadius: 3.0,
    });
    expect(bbRing.userData.morphedToBoxy).toBe(true);
    for (const b of bbRing.children) {
      expect(b.userData.isRigidDecor).toBe(true);
      expect(b.userData.morphedToBoxy).toBe(true);
    }

    const sbRing = buildSoccerBallRimRing(3.0, 1.5, () => 0.5, {
      shape: 'rectangle',
      baseRadius: 3.0,
    });
    expect(sbRing.userData.morphedToBoxy).toBe(true);
    for (const s of sbRing.children) {
      expect(s.userData.isRigidDecor).toBe(true);
      expect(s.userData.morphedToBoxy).toBe(true);
    }
  });

  it('preserves circular layout when shape is round or not specified', () => {
    const ring = buildCherryRimRing(2.6, 1.0, () => 0.5, {});
    expect(ring.userData.morphedToBoxy).toBeUndefined();
    expect(ring.children.length).toBe(10);

    for (const cherry of ring.children) {
      const r = Math.hypot(cherry.position.x, cherry.position.z);
      expect(r).toBeCloseTo(2.6, 2);
    }
  });
});
