import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildBeadedTrimRing } from './DecorationSets';

describe('Beaded Trim on rectangular and boxy cakes', () => {
  const dummyColor = '#FFFFFF';

  it('correctly constructs classic beaded trim on rectangular cake along perimeter', () => {
    const radius = 4.0;
    const trim = buildBeadedTrimRing(radius, dummyColor, () => 0.5, {
      pattern: 'classic',
      shape: 'rectangle',
      baseRadius: radius,
    });

    expect(trim).toBeDefined();
    expect(trim.isInstancedMesh).toBe(true);
    expect(trim.userData.morphedToBoxy).toBe(true);
    expect(trim.userData.isRigidDecor).toBe(true);
    expect(trim.count).toBeGreaterThan(30);

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    const expectedHalfW = radius * 1.25; // 5.0
    const expectedHalfD = radius * 0.85; // 3.4
    const positions = [];

    for (let i = 0; i < trim.count; i++) {
      trim.getMatrixAt(i, matrix);
      matrix.decompose(pos, quat, scale);

      expect(pos.y).toBeCloseTo(0, 4);
      expect(Math.abs(pos.x)).toBeLessThanOrEqual(expectedHalfW + 0.05);
      expect(Math.abs(pos.z)).toBeLessThanOrEqual(expectedHalfD + 0.05);

      positions.push(pos.clone());
    }

    // Check consecutive distance along the perimeter
    for (let i = 0; i < trim.count; i++) {
      const nextPos = positions[(i + 1) % trim.count];
      const dist = positions[i].distanceTo(nextPos);
      // Average step is around 0.28, verify no gaps or collapsed overlapping beads
      expect(dist).toBeGreaterThan(0.15);
      expect(dist).toBeLessThan(0.45);
    }
  });

  it('correctly constructs trio beaded trim on rectangular cake with multiple of 3', () => {
    const radius = 3.5;
    const trim = buildBeadedTrimRing(radius, dummyColor, () => 0.5, {
      pattern: 'trio',
      shape: 'rectangle',
      baseRadius: radius,
    });

    expect(trim).toBeDefined();
    expect(trim.isInstancedMesh).toBe(true);
    expect(trim.userData.morphedToBoxy).toBe(true);
    expect(trim.count % 3).toBe(0);
  });

  it('correctly constructs graduated beaded trim on square cake with multiple of 6', () => {
    const radius = 3.0;
    const trim = buildBeadedTrimRing(radius, dummyColor, () => 0.5, {
      pattern: 'graduated',
      shape: 'square',
      baseRadius: radius,
    });

    expect(trim).toBeDefined();
    expect(trim.isInstancedMesh).toBe(true);
    expect(trim.userData.morphedToBoxy).toBe(true);
    expect(trim.count % 6).toBe(0);

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    // Square cake: half-width and half-depth are both radius (3.0)
    for (let i = 0; i < trim.count; i++) {
      trim.getMatrixAt(i, matrix);
      matrix.decompose(pos, quat, scale);
      expect(Math.abs(pos.x)).toBeLessThanOrEqual(3.05);
      expect(Math.abs(pos.z)).toBeLessThanOrEqual(3.05);
    }
  });

  it('correctly constructs morse pattern beaded trim on rectangular cake', () => {
    const radius = 4.0;
    const group = buildBeadedTrimRing(radius, dummyColor, () => 0.5, {
      pattern: 'morseDotDashDot',
      shape: 'rectangle',
      baseRadius: radius,
    });

    expect(group).toBeDefined();
    expect(group.isGroup).toBe(true);
    expect(group.userData.morphedToBoxy).toBe(true);
    expect(group.children.length).toBe(2); // dotMesh and dashMesh

    const [dotMesh, dashMesh] = group.children;
    expect(dotMesh.isInstancedMesh).toBe(true);
    expect(dashMesh.isInstancedMesh).toBe(true);
    expect(dotMesh.userData.morphedToBoxy).toBe(true);
    expect(dashMesh.userData.morphedToBoxy).toBe(true);

    const expectedHalfW = radius * 1.25; // 5.0
    const expectedHalfD = radius * 0.85; // 3.4

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < dotMesh.count; i++) {
      dotMesh.getMatrixAt(i, matrix);
      matrix.decompose(pos, quat, scale);
      expect(Math.abs(pos.x)).toBeLessThanOrEqual(expectedHalfW + 0.05);
      expect(Math.abs(pos.z)).toBeLessThanOrEqual(expectedHalfD + 0.05);
    }

    for (let i = 0; i < dashMesh.count; i++) {
      dashMesh.getMatrixAt(i, matrix);
      matrix.decompose(pos, quat, scale);
      expect(Math.abs(pos.x)).toBeLessThanOrEqual(expectedHalfW + 0.05);
      expect(Math.abs(pos.z)).toBeLessThanOrEqual(expectedHalfD + 0.05);
    }
  });

  it('preserves circular layout when shape is round or not specified', () => {
    const radius = 2.6;
    const trim = buildBeadedTrimRing(radius, dummyColor, () => 0.5, {
      pattern: 'classic',
    });

    expect(trim.userData.morphedToBoxy).toBeUndefined();

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < trim.count; i++) {
      trim.getMatrixAt(i, matrix);
      matrix.decompose(pos, quat, scale);
      const r = Math.hypot(pos.x, pos.z);
      expect(r).toBeCloseTo(radius, 2);
    }
  });
});
