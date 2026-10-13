import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import {
  buildCheckerSideSquares,
  buildTriangleSideShapes,
  getCheckerCoverageFn,
  getCheckerSideLayoutRadius,
  getGlazeTriangleCoverageFn,
  getTriangleSideLayoutRadius,
  getTriangleCoverageFn,
} from './DecorationSets';
import { getBoxyRadius } from './cakeMath';

const patterns = [
  ['full', 1],
  ['leftDiagonal', 1],
  ['leftDiagonal', 2],
  ['rightDiagonal', 1],
  ['parallelOuter', 1],
  ['parallelInner', 1],
];

describe('Checkered Pattern placement on boxy cakes', () => {
  it.each(['rectangle', 'square'])('spaces all patterns around the %s perimeter', (shape) => {
    const radius = 2;
    const embed = -0.06;
    const standoffRadius = radius + 0.12 / 2 + embed;
    const width = shape === 'square' ? standoffRadius : standoffRadius * 1.25;
    const depth = shape === 'square' ? standoffRadius : standoffRadius * 0.85;
    const cornerRadius = 0.35 * standoffRadius / radius;

    for (const [pattern, gapDashPeriod] of patterns) {
      const mesh = buildCheckerSideSquares(radius, 3, {
        shape,
        baseRadius: radius,
        pattern,
        gapDashPeriod,
      });
      const coverageFn = getCheckerCoverageFn(radius, 3, {
        pattern,
        gapDashPeriod,
        shape,
        baseRadius: radius,
      });
      const glazeCoverageFn = getCheckerCoverageFn(radius, 3, {
        pattern,
        gapDashPeriod,
        shape,
        baseRadius: radius,
        forGlaze: true,
      });
      expect(mesh.geometry.parameters.width).toBeCloseTo(1.22 * 0.9, 5);
      expect(mesh.userData.isRigidDecor).toBe(true);
      expect(mesh.count).toBeGreaterThan(0);

      const horizontalScales = new Set();
      for (let index = 0; index < mesh.count; index++) {
        const matrix = new THREE.Matrix4();
        mesh.getMatrixAt(index, matrix);
        const position = new THREE.Vector3().setFromMatrixPosition(matrix);
        const scale = new THREE.Vector3();
        matrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
        horizontalScales.add(scale.x.toFixed(4));
        const expectedRadius = getBoxyRadius(
          Math.atan2(position.z, position.x),
          width,
          depth,
          cornerRadius
        );
        expect(Math.hypot(position.x, position.z)).toBeCloseTo(expectedRadius, 4);
        expect(coverageFn(Math.atan2(position.x, position.z), position.y)).toBeGreaterThan(0.9);
        expect(glazeCoverageFn(Math.atan2(position.x, position.z), position.y)).toBe(1);
      }
      expect(horizontalScales.size).toBe(shape === 'rectangle' ? 2 : 1);

      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  });

  it.each(['rectangle', 'square'])('aligns Triangle Pattern to the %s frosting footprint', (shape) => {
    const radius = 2;
    const width = shape === 'square' ? radius : radius * 1.25;
    const depth = shape === 'square' ? radius : radius * 0.85;
    const cornerRadius = 0.35;

    for (const [pattern, gapDashPeriod] of patterns) {
      const mesh = buildTriangleSideShapes(radius, 3, {
        shape,
        baseRadius: radius,
        pattern,
        gapDashPeriod,
      });
      const coverageFn = getTriangleCoverageFn(radius, 3, {
        shape,
        baseRadius: radius,
        pattern,
        gapDashPeriod,
      });
      const glazeCoverageFn = getGlazeTriangleCoverageFn(radius, 3, {
        shape,
        baseRadius: radius,
        pattern,
        gapDashPeriod,
      });
      expect(mesh.userData.isRigidDecor).toBe(true);
      expect(mesh.count).toBeGreaterThan(0);

      for (let index = 0; index < mesh.count; index++) {
        const matrix = new THREE.Matrix4();
        mesh.getMatrixAt(index, matrix);
        const position = new THREE.Vector3().setFromMatrixPosition(matrix);
        const expectedRadius = getBoxyRadius(
          Math.atan2(position.z, position.x),
          width,
          depth,
          cornerRadius
        );
        expect(Math.hypot(position.x, position.z)).toBeCloseTo(expectedRadius, 4);
        expect(coverageFn(Math.atan2(position.x, position.z), position.y)).toBe(1);
        expect(glazeCoverageFn(Math.atan2(position.x, position.z), position.y)).toBeGreaterThan(0.9);
      }

      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  });

  it.each(['rectangle', 'square'])('aligns textured side patterns and glaze coverage on the %s perimeter', (shape) => {
    const radius = 2;
    const sideRadius = radius + 0.08;
    const embedOverride = 0.02;
    const checkerLayoutRadius = getCheckerSideLayoutRadius(sideRadius, embedOverride);
    const triangleLayoutRadius = getTriangleSideLayoutRadius(sideRadius, embedOverride);
    const width = shape === 'square' ? checkerLayoutRadius : checkerLayoutRadius * 1.25;
    const depth = shape === 'square' ? checkerLayoutRadius : checkerLayoutRadius * 0.85;
    const cornerRadius = 0.35 * checkerLayoutRadius / radius;

    const checker = buildCheckerSideSquares(sideRadius, 3, {
      shape,
      baseRadius: radius,
      embedOverride,
    });
    const triangle = buildTriangleSideShapes(sideRadius, 3, {
      shape,
      baseRadius: radius,
      embedOverride,
    });
    const checkerCoverage = getCheckerCoverageFn(checkerLayoutRadius, 3, {
      shape,
      baseRadius: radius,
      forGlaze: true,
    });
    const triangleCoverage = getGlazeTriangleCoverageFn(triangleLayoutRadius, 3, {
      shape,
      baseRadius: radius,
    });

    for (const mesh of [checker, triangle]) {
      for (let index = 0; index < mesh.count; index++) {
        const matrix = new THREE.Matrix4();
        mesh.getMatrixAt(index, matrix);
        const position = new THREE.Vector3().setFromMatrixPosition(matrix);
        const angle = Math.atan2(position.x, position.z);
        const coverage = mesh === checker ? checkerCoverage : triangleCoverage;
        expect(coverage(angle, position.y)).toBeGreaterThan(0.9);
        const perimeterAngle = Math.atan2(position.z, position.x);
        const expectedRadius = getBoxyRadius(perimeterAngle, width, depth, cornerRadius);
        expect(Math.hypot(position.x, position.z)).toBeCloseTo(expectedRadius, 4);
      }
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  });
});
