import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildScatterPearlsRing, spreadScatterPearls } from './DecorationSets';
import { getBoxyRadius } from './cakeMath';

describe('Scatter Pearls spreading on Rectangle and Square cakes', () => {
  const variants = [
    'randomScatter',
    'smallPearlsScatter',
    'bigPearlsScatter',
    'diamondGrid',
    'diamondGridBorder',
    'horizontalRows',
  ];

  const baseRadius = 4.0;
  const height = 3.5;
  const W_rect = baseRadius * 1.25;
  const D_rect = baseRadius * 0.85;
  const rc = 0.35;

  variants.forEach((variant) => {
    it(`spreads cleanly on rectangular cakes for ${variant}`, () => {
      const mesh = buildScatterPearlsRing(baseRadius, height, '#FFFFFF', null, () => 0.5, {
        variant,
      });

      expect(mesh.isInstancedMesh).toBe(true);
      expect(mesh.count).toBeGreaterThan(0);

      // Verify pearls start on circular cylinder before spreading
      const mOrig = new THREE.Matrix4();
      const posOrig = new THREE.Vector3();
      const quatOrig = new THREE.Quaternion();
      const scaleOrig = new THREE.Vector3();
      mesh.getMatrixAt(0, mOrig);
      mOrig.decompose(posOrig, quatOrig, scaleOrig);
      const rOrig = Math.sqrt(posOrig.x * posOrig.x + posOrig.z * posOrig.z);
      // Original radius is close to baseRadius + standoff
      expect(rOrig).toBeGreaterThan(baseRadius * 0.95);

      // Spread to rectangle
      spreadScatterPearls(mesh, baseRadius, 'rectangle');

      expect(mesh.userData.morphedToBoxy).toBe(true);

      const m = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scale = new THREE.Vector3();

      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m);
        m.decompose(pos, quat, scale);

        // No NaNs
        expect(isNaN(pos.x)).toBe(false);
        expect(isNaN(pos.y)).toBe(false);
        expect(isNaN(pos.z)).toBe(false);

        // Spherical shape preservation: scale.x === scale.y === scale.z
        expect(scale.x).toBeCloseTo(scale.y, 4);
        expect(scale.y).toBeCloseTo(scale.z, 4);

        // Distance conforms to boxy perimeter
        const theta = Math.atan2(pos.z, pos.x);
        const expectedBoxyR = getBoxyRadius(theta, W_rect, D_rect, rc);
        const actualR = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

        // Actual distance should be within standoff distance of expectedBoxyR
        expect(actualR).toBeGreaterThanOrEqual(expectedBoxyR * 0.95);
        expect(actualR).toBeLessThanOrEqual(expectedBoxyR * 1.15);
      }
    });

    it(`spreads cleanly on square cakes for ${variant}`, () => {
      const mesh = buildScatterPearlsRing(baseRadius, height, '#FFFFFF', null, () => 0.5, {
        variant,
      });

      // Spread to square
      spreadScatterPearls(mesh, baseRadius, 'square');

      expect(mesh.userData.morphedToBoxy).toBe(true);

      const m = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scale = new THREE.Vector3();

      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m);
        m.decompose(pos, quat, scale);

        expect(isNaN(pos.x)).toBe(false);
        expect(isNaN(pos.y)).toBe(false);
        expect(isNaN(pos.z)).toBe(false);

        // Spherical shape preservation
        expect(scale.x).toBeCloseTo(scale.y, 4);
        expect(scale.y).toBeCloseTo(scale.z, 4);

        const theta = Math.atan2(pos.z, pos.x);
        const expectedBoxyR = getBoxyRadius(theta, baseRadius, baseRadius, rc);
        const actualR = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

        expect(actualR).toBeGreaterThanOrEqual(expectedBoxyR * 0.95);
        expect(actualR).toBeLessThanOrEqual(expectedBoxyR * 1.15);
      }
    });

    it(`spreads automatically when shape is passed directly in options for ${variant}`, () => {
      const meshRect = buildScatterPearlsRing(baseRadius, height, '#FFFFFF', null, () => 0.5, {
        variant,
        shape: 'rectangle',
      });

      expect(meshRect.userData.morphedToBoxy).toBe(true);

      const m = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scale = new THREE.Vector3();

      meshRect.getMatrixAt(0, m);
      m.decompose(pos, quat, scale);

      expect(isNaN(pos.x)).toBe(false);
      expect(isNaN(pos.z)).toBe(false);
      expect(scale.x).toBeCloseTo(scale.y, 4);
      expect(scale.y).toBeCloseTo(scale.z, 4);
    });
  });

  it('is idempotent and does not double-morph if called twice', () => {
    const mesh = buildScatterPearlsRing(baseRadius, height, '#FFFFFF', null, () => 0.5, {
      variant: 'diamondGrid',
      shape: 'rectangle',
    });

    const m1 = new THREE.Matrix4();
    const pos1 = new THREE.Vector3();
    mesh.getMatrixAt(0, m1);
    pos1.setFromMatrixPosition(m1);

    // Call again with same or different shape
    spreadScatterPearls(mesh, baseRadius, 'rectangle');

    const m2 = new THREE.Matrix4();
    const pos2 = new THREE.Vector3();
    mesh.getMatrixAt(0, m2);
    pos2.setFromMatrixPosition(m2);

    expect(pos1.x).toBeCloseTo(pos2.x, 5);
    expect(pos1.z).toBeCloseTo(pos2.z, 5);
  });

  it('spreads a group containing pearls when passed a THREE.Group', () => {
    const group = new THREE.Group();
    const pearls = buildScatterPearlsRing(baseRadius, height, '#FFFFFF', null, () => 0.5, {
      variant: 'randomScatter',
    });
    group.add(pearls);

    spreadScatterPearls(group, baseRadius, 'rectangle');
    expect(pearls.userData.morphedToBoxy).toBe(true);

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    pearls.getMatrixAt(0, m);
    pos.setFromMatrixPosition(m);

    const theta = Math.atan2(pos.z, pos.x);
    const expectedBoxyR = getBoxyRadius(theta, W_rect, D_rect, rc);
    const actualR = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    expect(actualR).toBeGreaterThanOrEqual(expectedBoxyR * 0.95);
  });
});
