import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createRoundedRectanglePath } from './cakeMath';
import {
  computeSymmetricBoxyDollopPoints,
  buildPipingRing,
} from './pipingTipsDeluxe';

describe('Symmetric Dollops on rectangular and square cakes', () => {
  const dummyMaterial = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });

  describe('computeSymmetricBoxyDollopPoints helper', () => {
    it('creates 4 corner apex anchors and mirrored parallel edges on rectangular cake', () => {
      const W = 5.0;
      const D = 3.4;
      const cornerRadius = 0.35;
      const path = createRoundedRectanglePath(W, D, cornerRadius);
      const nominalSpacing = 0.5760;

      const points = computeSymmetricBoxyDollopPoints(path, nominalSpacing, {
        isSquare: false,
      });

      expect(points.length).toBeGreaterThan(10);
      expect(points.length % 2).toBe(0); // Strictly even count

      // Geometric apex formula: (W - rc) + rc * sqrt(2)/2
      const xApexExpected = (W - cornerRadius) + cornerRadius * (Math.SQRT2 / 2);
      const zApexExpected = (D - cornerRadius) + cornerRadius * (Math.SQRT2 / 2);

      // Corner 0: Top-Left apex
      expect(points[0].x).toBeCloseTo(-xApexExpected, 3);
      expect(points[0].z).toBeCloseTo(zApexExpected, 3);

      // Find the other 3 corner apexes
      const trCorner = points.find(p => p.x > 0 && Math.abs(p.x - xApexExpected) < 0.05 && Math.abs(p.z - zApexExpected) < 0.05);
      const brCorner = points.find(p => p.x > 0 && Math.abs(p.x - xApexExpected) < 0.05 && Math.abs(p.z - (-zApexExpected)) < 0.05);
      const blCorner = points.find(p => p.x < 0 && Math.abs(p.x - (-xApexExpected)) < 0.05 && Math.abs(p.z - (-zApexExpected)) < 0.05);

      expect(trCorner).toBeDefined();
      expect(brCorner).toBeDefined();
      expect(blCorner).toBeDefined();

      // Top edge points (between TL and TR) vs Bottom edge points (between BR and BL)
      const topEdge = points.filter(p => p.z > zApexExpected - 0.01 && p.z >= D - 0.01);
      const bottomEdge = points.filter(p => p.z < -zApexExpected + 0.01 && p.z <= -D + 0.01);

      expect(topEdge.length).toBe(bottomEdge.length);
      expect(topEdge.length).toBeGreaterThan(0);

      // Sort both edges by x coordinate to test bilateral reflection
      const topX = topEdge.map(p => p.x).sort((a, b) => a - b);
      const bottomX = bottomEdge.map(p => p.x).sort((a, b) => a - b);

      for (let i = 0; i < topX.length; i++) {
        expect(topX[i]).toBeCloseTo(bottomX[i], 3);
        // Also check self-symmetry across X = 0
        expect(topX[i]).toBeCloseTo(-topX[topX.length - 1 - i], 3);
      }

      // Right edge points vs Left edge points
      const rightEdge = points.filter(p => p.x >= W - 0.01);
      const leftEdge = points.filter(p => p.x <= -W + 0.01);

      expect(rightEdge.length).toBe(leftEdge.length);
      expect(rightEdge.length).toBeGreaterThan(0);

      const rightZ = rightEdge.map(p => p.z).sort((a, b) => a - b);
      const leftZ = leftEdge.map(p => p.z).sort((a, b) => a - b);

      for (let i = 0; i < rightZ.length; i++) {
        expect(rightZ[i]).toBeCloseTo(leftZ[i], 3);
        expect(rightZ[i]).toBeCloseTo(-rightZ[rightZ.length - 1 - i], 3);
      }
    });

    it('creates exact 4-fold rotational symmetry on square cakes', () => {
      const W = 3.5;
      const D = 3.5;
      const cornerRadius = 0.35;
      const path = createRoundedRectanglePath(W, D, cornerRadius);
      const nominalSpacing = 0.5760;

      const points = computeSymmetricBoxyDollopPoints(path, nominalSpacing, {
        isSquare: true,
      });

      expect(points.length % 4).toBe(0); // Square with 4 corners + 4*N side dollops = 4(N + 1)

      const topEdge = points.filter(p => p.z >= D - 0.01);
      const rightEdge = points.filter(p => p.x >= W - 0.01);
      const bottomEdge = points.filter(p => p.z <= -D + 0.01);
      const leftEdge = points.filter(p => p.x <= -W + 0.01);

      // All 4 sides must have identical counts
      expect(topEdge.length).toBe(rightEdge.length);
      expect(rightEdge.length).toBe(bottomEdge.length);
      expect(bottomEdge.length).toBe(leftEdge.length);
    });

    it('assigns even indices to all 4 corners when isAlt or step: 2 is active', () => {
      const W = 5.0;
      const D = 3.4;
      const cornerRadius = 0.35;
      const path = createRoundedRectanglePath(W, D, cornerRadius);
      const nominalSpacing = 0.3644; // kissDollop spacing (step = 2)

      const points = computeSymmetricBoxyDollopPoints(path, nominalSpacing, {
        isSquare: false,
        step: 2,
        withCherry: true,
      });

      const xApexExpected = (W - cornerRadius) + cornerRadius * (Math.SQRT2 / 2);
      const zApexExpected = (D - cornerRadius) + cornerRadius * (Math.SQRT2 / 2);

      // Identify the indices of the 4 corner apexes
      const cornerIndices = [];
      points.forEach((p, idx) => {
        if (Math.abs(Math.abs(p.x) - xApexExpected) < 0.05 && Math.abs(Math.abs(p.z) - zApexExpected) < 0.05) {
          cornerIndices.push(idx);
        }
      });

      expect(cornerIndices.length).toBe(4);
      // Every corner apex must have an even index so every corner receives a cherry with step: 2
      cornerIndices.forEach(idx => {
        expect(idx % 2).toBe(0);
      });
    });
  });

  describe('buildPipingRing with dollop tips', () => {
    it('constructs roundDollopMedium on rectangle cake with 4 corner dollops and symmetric placement', () => {
      const radius = 4.0;
      const ring = buildPipingRing('roundDollopMedium', dummyMaterial, {
        radius,
        shape: 'rectangle',
        baseRadius: radius,
        y: 1.5,
      });

      expect(ring).toBeDefined();
      expect(ring.isInstancedMesh).toBe(true);
      expect(ring.userData.morphedToBoxy).toBe(true);
      expect(ring.count % 2).toBe(0);

      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scaleVec = new THREE.Vector3();

      const positions = [];
      for (let i = 0; i < ring.count; i++) {
        ring.getMatrixAt(i, matrix);
        matrix.decompose(pos, quat, scaleVec);
        positions.push(pos.clone());
        expect(pos.y).toBeCloseTo(1.5, 4);
      }

      const expectedHalfW = radius * 1.25; // 5.0
      const expectedHalfD = radius * 0.85; // 3.4
      const cornerRadius = 0.35;
      const xApex = (expectedHalfW - cornerRadius) + cornerRadius * (Math.SQRT2 / 2);
      const zApex = (expectedHalfD - cornerRadius) + cornerRadius * (Math.SQRT2 / 2);

      // Verify all 4 corner positions exist in the instanced mesh
      const hasTL = positions.some(p => Math.hypot(p.x - (-xApex), p.z - zApex) < 0.05);
      const hasTR = positions.some(p => Math.hypot(p.x - xApex, p.z - zApex) < 0.05);
      const hasBR = positions.some(p => Math.hypot(p.x - xApex, p.z - (-zApex)) < 0.05);
      const hasBL = positions.some(p => Math.hypot(p.x - (-xApex), p.z - (-zApex)) < 0.05);

      expect(hasTL).toBe(true);
      expect(hasTR).toBe(true);
      expect(hasBR).toBe(true);
      expect(hasBL).toBe(true);
    });

    it('positions cherries precisely on top of symmetric dollops for starDollopCherry', () => {
      const radius = 3.5;
      const group = buildPipingRing('starDollopCherry', dummyMaterial, {
        radius,
        shape: 'rectangle',
        baseRadius: radius,
        y: 1.0,
      });

      expect(group).toBeDefined();
      expect(group.isGroup).toBe(true);
      expect(group.userData.morphedToBoxy).toBe(true);

      const dollopMesh = group.children.find(c => c.isInstancedMesh);
      expect(dollopMesh).toBeDefined();

      const cherryMeshes = group.children.filter(c => c.isGroup || (c.isMesh && c !== dollopMesh));
      expect(cherryMeshes.length).toBeGreaterThan(0);

      // For every cherry, its (x, z) coordinate must match a dollop position
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scaleVec = new THREE.Vector3();

      const dollopPositions = [];
      for (let i = 0; i < dollopMesh.count; i++) {
        dollopMesh.getMatrixAt(i, matrix);
        matrix.decompose(pos, quat, scaleVec);
        dollopPositions.push(pos.clone());
      }

      cherryMeshes.forEach(cherry => {
        const matchesDollop = dollopPositions.some(dp =>
          Math.hypot(cherry.position.x - dp.x, cherry.position.z - dp.z) < 0.01
        );
        expect(matchesDollop).toBe(true);
      });
    });

    it('preserves circular instancing on round cakes', () => {
      const radius = 3.0;
      const ring = buildPipingRing('roundDollopMedium', dummyMaterial, {
        radius,
        shape: 'round',
        y: 0.5,
      });

      expect(ring).toBeDefined();
      expect(ring.isInstancedMesh).toBe(true);
      expect(ring.userData.morphedToBoxy).toBeUndefined();

      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scaleVec = new THREE.Vector3();

      for (let i = 0; i < ring.count; i++) {
        ring.getMatrixAt(i, matrix);
        matrix.decompose(pos, quat, scaleVec);
        const distFromCenter = Math.hypot(pos.x, pos.z);
        expect(distFromCenter).toBeCloseTo(radius, 4);
      }
    });
  });
});
