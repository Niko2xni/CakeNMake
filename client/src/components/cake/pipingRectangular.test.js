import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildPipingRing } from './pipingTipsDeluxe';

describe('Border piping 1 (shell) and 3 (bead) on rectangular cakes', () => {
  const dummyMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dummySecMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  it('correctly constructs shell border piping (Border Piping 1) on rectangular cake', () => {
    const ring = buildPipingRing('shell', dummyMat, {
      radius: 4,
      y: 1.5,
      scale: 3,
      shape: 'rectangle',
      baseRadius: 4,
    });

    expect(ring).toBeDefined();
    expect(ring.isInstancedMesh).toBe(true);
    expect(ring.userData.morphedToBoxy).toBe(true);
    expect(ring.count).toBeGreaterThan(30);

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    const positions = [];
    const yaws = [];

    for (let i = 0; i < ring.count; i++) {
      ring.getMatrixAt(i, matrix);
      matrix.decompose(pos, quat, scale);

      expect(pos.y).toBeCloseTo(1.5, 4);
      // Half width is 4 * 1.25 = 5.0, half depth is 4 * 0.85 = 3.4
      expect(Math.abs(pos.x)).toBeLessThanOrEqual(5.01);
      expect(Math.abs(pos.z)).toBeLessThanOrEqual(3.41);

      positions.push(pos.clone());

      const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
      yaws.push(euler.y);
    }

    // Check uniform spacing between consecutive instances along perimeter
    for (let i = 0; i < ring.count; i++) {
      const nextPos = positions[(i + 1) % ring.count];
      const dist = positions[i].distanceTo(nextPos);
      // Spacing should be approximately perimeter / count (~0.65), never 0 or collapsed
      expect(dist).toBeGreaterThan(0.4);
      expect(dist).toBeLessThan(0.85);
    }
  });

  it('correctly constructs alternating shell border (shellAlt) on rectangular cake', () => {
    const ring = buildPipingRing('shellAlt', dummyMat, {
      radius: 4,
      y: 1.5,
      scale: 3,
      shape: 'rectangle',
      baseRadius: 4,
      secondaryMaterial: dummySecMat,
    });

    expect(ring).toBeDefined();
    expect(ring.isGroup).toBe(true);
    expect(ring.userData.morphedToBoxy).toBe(true);
    expect(ring.children.length).toBe(2);
    expect(ring.children[0].isInstancedMesh).toBe(true);
    expect(ring.children[1].isInstancedMesh).toBe(true);
    expect(ring.children[0].userData.morphedToBoxy).toBe(true);
    expect(ring.children[1].userData.morphedToBoxy).toBe(true);
  });

  it('correctly constructs bead border piping (Border Piping 3) on rectangular cake with continuous tangents', () => {
    const ring = buildPipingRing('bead', dummyMat, {
      radius: 4,
      y: 1.5,
      scale: 3,
      shape: 'rectangle',
      baseRadius: 4,
    });

    expect(ring).toBeDefined();
    expect(ring.isInstancedMesh).toBe(true);
    expect(ring.userData.morphedToBoxy).toBe(true);
    expect(ring.count).toBeGreaterThan(40);

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < ring.count; i++) {
      ring.getMatrixAt(i, matrix);
      matrix.decompose(pos, quat, scale);

      expect(pos.y).toBeCloseTo(1.5, 4);
      expect(Math.abs(pos.x)).toBeLessThanOrEqual(5.01);
      expect(Math.abs(pos.z)).toBeLessThanOrEqual(3.41);

      const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
      const yaw = euler.y;

      // Front edge (z ~ +3.4): tangent is +X -> yaw ~ 0
      if (pos.z > 3.0 && Math.abs(pos.x) < 3.5) {
        expect(Math.abs(yaw)).toBeLessThan(0.1);
      }
      // Right edge (x ~ +5.0): tangent is -Z -> yaw ~ +PI/2
      if (pos.x > 4.5 && Math.abs(pos.z) < 2.0) {
        expect(yaw).toBeCloseTo(Math.PI / 2, 1);
      }
      // Back edge (z ~ -3.4): tangent is -X -> |yaw| ~ PI
      if (pos.z < -3.0 && Math.abs(pos.x) < 3.5) {
        expect(Math.abs(Math.abs(yaw) - Math.PI)).toBeLessThan(0.1);
      }
      // Left edge (x ~ -5.0): tangent is +Z -> yaw ~ -PI/2
      if (pos.x < -4.5 && Math.abs(pos.z) < 2.0) {
        expect(yaw).toBeCloseTo(-Math.PI / 2, 1);
      }
    }
  });

  it('correctly constructs alternating bead border (beadAlt) on rectangular cake', () => {
    const ring = buildPipingRing('beadAlt', dummyMat, {
      radius: 4,
      y: 1.5,
      scale: 3,
      shape: 'rectangle',
      baseRadius: 4,
      secondaryMaterial: dummySecMat,
    });

    expect(ring).toBeDefined();
    expect(ring.isGroup).toBe(true);
    expect(ring.userData.morphedToBoxy).toBe(true);
    expect(ring.children.length).toBe(2);
    expect(ring.children[0].isInstancedMesh).toBe(true);
    expect(ring.children[1].isInstancedMesh).toBe(true);
    expect(ring.children[0].userData.morphedToBoxy).toBe(true);
    expect(ring.children[1].userData.morphedToBoxy).toBe(true);
  });

  it('preserves circular rendering when shape is round', () => {
    const ring = buildPipingRing('shell', dummyMat, {
      radius: 4,
      y: 1.5,
      scale: 3,
      shape: 'round',
    });

    expect(ring).toBeDefined();
    expect(ring.isInstancedMesh).toBe(true);
    // Round rings should NOT have morphedToBoxy flag so normal group transforms apply
    expect(ring.userData.morphedToBoxy).toBeFalsy();

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < ring.count; i++) {
      ring.getMatrixAt(i, matrix);
      matrix.decompose(pos, quat, scale);
      const dist = Math.hypot(pos.x, pos.z);
      expect(dist).toBeCloseTo(4.0, 3);
    }
  });

  it('supports square shape border piping', () => {
    const ring = buildPipingRing('shell', dummyMat, {
      radius: 4,
      y: 1.5,
      scale: 3,
      shape: 'square',
      baseRadius: 4,
    });

    expect(ring).toBeDefined();
    expect(ring.isInstancedMesh).toBe(true);
    expect(ring.userData.morphedToBoxy).toBe(true);

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < ring.count; i++) {
      ring.getMatrixAt(i, matrix);
      matrix.decompose(pos, quat, scale);
      // Square with radius 4 has W=4, D=4
      expect(Math.abs(pos.x)).toBeLessThanOrEqual(4.01);
      expect(Math.abs(pos.z)).toBeLessThanOrEqual(4.01);
    }
  });

  it('eliminates corner protrusion on rectangular shell border piping', () => {
    const ring = buildPipingRing('shell', dummyMat, {
      radius: 4,
      y: 1.5,
      scale: 3,
      shape: 'rectangle',
      baseRadius: 4,
    });

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    const W = 4 * 1.25; // 5.0
    const D = 4 * 0.85; // 3.4

    for (let i = 0; i < ring.count; i++) {
      ring.getMatrixAt(i, matrix);
      matrix.decompose(pos, quat, scale);

      const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
      const yaw = euler.y;
      const tailLen = 0.35 * scale.x;

      const tailX = pos.x + tailLen * Math.cos(yaw);
      const tailZ = pos.z - tailLen * Math.sin(yaw);

      // Tail should stay cleanly within the cake boundaries, never protruding into thin air
      expect(Math.abs(tailX)).toBeLessThanOrEqual(W + 0.02);
      expect(Math.abs(tailZ)).toBeLessThanOrEqual(D + 0.02);
    }
  });

  it('eliminates corner protrusion on rectangular bead border piping', () => {
    const ring = buildPipingRing('bead', dummyMat, {
      radius: 4,
      y: 1.5,
      scale: 3,
      shape: 'rectangle',
      baseRadius: 4,
    });

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    const W = 4 * 1.25; // 5.0
    const D = 4 * 0.85; // 3.4

    for (let i = 0; i < ring.count; i++) {
      ring.getMatrixAt(i, matrix);
      matrix.decompose(pos, quat, scale);

      const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
      const yaw = euler.y;
      const tailLen = 0.25 * scale.x;

      const tailX = pos.x + tailLen * Math.cos(yaw);
      const tailZ = pos.z - tailLen * Math.sin(yaw);

      // Bead tail should also stay cleanly within the cake boundaries
      expect(Math.abs(tailX)).toBeLessThanOrEqual(W + 0.02);
      expect(Math.abs(tailZ)).toBeLessThanOrEqual(D + 0.02);
    }
  });
});
