import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildVictorianLambeth, getVictorianLambethCoverageFn, getVictorianLambethGlazeCoverageFn } from './sets/victorianLambethHelpers';
import { getBoxyRadius } from './cakeMath';

function isRigidDecorNode(obj) {
  let curr = obj;
  while (curr) {
    if (curr.userData?.isRigidDecor) {
      return curr;
    }
    curr = curr.parent;
  }
  return null;
}

function morphGroupToBoxyRectangle(cakeGroup, baseRadius, customW = null, customD = null) {
  if (!cakeGroup) return;
  const W = customW !== null ? customW : baseRadius * 1.25;
  const D = customD !== null ? customD : baseRadius * 0.85;
  const rc = 0.35;

  const transformedGeometries = new Set();

  cakeGroup.traverse((child) => {
    const decorRoot = isRigidDecorNode(child);
    if (decorRoot) {
      if (child !== decorRoot) {
        return;
      }

      const rx = child.position.x;
      const rz = child.position.z;
      const r = Math.sqrt(rx * rx + rz * rz);
      if (r > 0.001) {
        const phi = Math.atan2(rx, rz);
        const theta = Math.atan2(rz, rx);
        const targetR = getBoxyRadius(theta, W, D, rc);
        const scale = targetR / baseRadius;
        child.position.x *= scale;
        child.position.z *= scale;

        const dPhi = 0.002;
        const phi1 = phi - dPhi;
        const theta1 = Math.atan2(Math.cos(phi1), Math.sin(phi1));
        const R1 = getBoxyRadius(theta1, W, D, rc);
        const p1x = R1 * Math.sin(phi1);
        const p1z = R1 * Math.cos(phi1);

        const phi2 = phi + dPhi;
        const theta2 = Math.atan2(Math.cos(phi2), Math.sin(phi2));
        const R2 = getBoxyRadius(theta2, W, D, rc);
        const p2x = R2 * Math.sin(phi2);
        const p2z = R2 * Math.cos(phi2);

        const tx = p2x - p1x;
        const tz = p2z - p1z;
        const nx = -tz;
        const nz = tx;
        if (Math.abs(nx) > 1e-6 || Math.abs(nz) > 1e-6) {
          child.rotation.y = Math.atan2(nx, nz);
        }
      }
      return;
    }

    if (child.isMesh && child.geometry && !transformedGeometries.has(child.geometry)) {
      const isCentered = Math.abs(child.position.x) < 0.001 && Math.abs(child.position.z) < 0.001;

      if (isCentered) {
        transformedGeometries.add(child.geometry);
        child.geometry = child.geometry.clone();
        const pos = child.geometry.attributes.position;
        if (pos) {
          for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);
            const r = Math.sqrt(vx * vx + vz * vz);
            if (r > 0.001) {
              const theta = Math.atan2(vz, vx);
              const targetR = getBoxyRadius(theta, W, D, rc);
              const scale = targetR / baseRadius;
              pos.setX(i, vx * scale);
              pos.setZ(i, vz * scale);
            }
          }
          pos.needsUpdate = true;
          child.geometry.computeVertexNormals();
        }
      }
    }
  });
}

describe('Victorian Lambeth on square and rectangle cakes', () => {
  const variants = ['classic', 'noRosette', 'ropesOnly', 'noRopes', 'doubleBand', 'tripleBand'];

  variants.forEach((variant) => {
    it(`morphs cleanly on rectangular cakes for ${variant}`, () => {
      const groupRect = new THREE.Group();
      const lambethRect = buildVictorianLambeth(4.0, 3.5, '#FFFFFF', '#FFFFFF', variant);
      groupRect.add(lambethRect);
      morphGroupToBoxyRectangle(groupRect, 4.0);

      let meshCount = 0;
      let hasNaN = false;

      groupRect.traverse((c) => {
        if (c.isMesh) {
          meshCount++;
          const pos = c.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            if (isNaN(pos.getX(i)) || isNaN(pos.getY(i)) || isNaN(pos.getZ(i))) {
              hasNaN = true;
            }
          }
        }
        if (isNaN(c.position.x) || isNaN(c.position.y) || isNaN(c.position.z) || isNaN(c.rotation.y)) {
          hasNaN = true;
        }
      });

      expect(meshCount).toBeGreaterThan(0);
      expect(hasNaN).toBe(false);
    });

    it(`morphs cleanly on square cakes for ${variant}`, () => {
      const groupSquare = new THREE.Group();
      const lambethSquare = buildVictorianLambeth(4.0, 3.5, '#FFFFFF', '#FFFFFF', variant);
      groupSquare.add(lambethSquare);
      morphGroupToBoxyRectangle(groupSquare, 4.0, 4.0, 4.0);

      let meshCount = 0;
      let hasNaN = false;

      groupSquare.traverse((c) => {
        if (c.isMesh) {
          meshCount++;
          const pos = c.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            if (isNaN(pos.getX(i)) || isNaN(pos.getY(i)) || isNaN(pos.getZ(i))) {
              hasNaN = true;
            }
          }
        }
        if (isNaN(c.position.x) || isNaN(c.position.y) || isNaN(c.position.z) || isNaN(c.rotation.y)) {
          hasNaN = true;
        }
      });

      expect(meshCount).toBeGreaterThan(0);
      expect(hasNaN).toBe(false);
    });
  });

  it('aligns anchors and rosettes to face the normal of the boxy walls', () => {
    const groupRect = new THREE.Group();
    const lambeth = buildVictorianLambeth(4.0, 3.5, '#FFFFFF', '#FFFFFF', 'classic');
    groupRect.add(lambeth);
    morphGroupToBoxyRectangle(groupRect, 4.0);

    const rigidNodes = [];
    groupRect.traverse((child) => {
      if (child.userData?.isRigidDecor) {
        rigidNodes.push(child);
      }
    });

    expect(rigidNodes.length).toBeGreaterThan(0);
    for (const node of rigidNodes) {
      // Normal angle must be a valid number
      expect(Number.isFinite(node.rotation.y)).toBe(true);
      // Nodes on the front face (z > 3.0, small x) must face ~0 radians (+Z)
      if (node.position.z > 3.0 && Math.abs(node.position.x) < 2.0) {
        expect(Math.abs(node.rotation.y)).toBeLessThan(0.05);
      }
    }
  });

  describe('Victorian Lambeth Glaze / Drip empty spaces and rosette/leaf shaping', () => {
    it('caps Victorian Lambeth Drip carve depth to 0.50 so drip is reduced but never completely removed', () => {
      const radius = 2.0;
      const height = 2.5;
      const glazeCovFn = getVictorianLambethGlazeCoverageFn(radius, height, {
        variant: 'classic',
        forGlaze: true,
      });

      let maxCoverage = 0;
      for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
        for (let y = -height / 2; y <= height / 2; y += 0.05) {
          const c = glazeCovFn(angle, y);
          if (c > maxCoverage) maxCoverage = c;
        }
      }

      // Coverage must not exceed 0.50 (reduces drip to 50% thickness, never removes it completely)
      expect(maxCoverage).toBeGreaterThan(0.35);
      expect(maxCoverage).toBeLessThanOrEqual(0.5001);
    });

    it('accurately shapes empty space around the top swirl rosette and side leaves', () => {
      const radius = 2.0;
      const height = 2.5;
      const H = height;
      const glazeCovFn = getVictorianLambethGlazeCoverageFn(radius, height, {
        variant: 'classic',
        forGlaze: true,
      });

      // Anchor 0 is at angle = 0, y = 0.42 * H - 0.05 * H = 0.37 * H
      const anchorY = 0.37 * H;

      // Center of swirl rosette: covered at 50%
      const centerCov = glazeCovFn(0, anchorY);
      expect(centerCov).toBeCloseTo(0.50, 2);

      // Top of swirl rosette: smooth curve around the swirl (R ~ 0.37), falls to 0 past ~0.42
      expect(glazeCovFn(0, anchorY + 0.35)).toBeGreaterThan(0.35);
      expect(glazeCovFn(0, anchorY + 0.45)).toBe(0);

      // Side leaf: at lx = +0.50 (angle = 0.50 / radius = 0.25 rad), leaf wing is covered
      const leafAngle = 0.50 / radius;
      expect(glazeCovFn(leafAngle, anchorY)).toBeGreaterThan(0.35);

      // Beyond the leaf tip (lx = +0.75, angle = 0.75 / radius = 0.375 rad), coverage falls to 0
      const outsideAngle = 0.75 / radius;
      expect(glazeCovFn(outsideAngle, anchorY)).toBe(0);
    });

    it('offsets Victorian Lambeth decoration when Drip is present to sit flush on the reduced drip surface', () => {
      const radius = 2.0;
      const height = 2.5;
      const lambethNoDrip = buildVictorianLambeth(radius, height, '#FFFFFF', '#FFFFFF', 'classic');
      const lambethWithDrip = buildVictorianLambeth(radius, height, '#FFFFFF', '#FFFFFF', 'classic', null, {
        hasDrip: true,
        coatThickness: 0.06,
        maxCarveDepth: 0.50,
      });

      // Check anchor mesh or curtain mesh distance from origin
      let anchorNoDripZ = 0;
      let anchorWithDripZ = 0;

      lambethNoDrip.traverse((child) => {
        if (child.userData?.isRigidDecor && anchorNoDripZ === 0) {
          anchorNoDripZ = Math.hypot(child.position.x, child.position.z);
        }
      });

      lambethWithDrip.traverse((child) => {
        if (child.userData?.isRigidDecor && anchorWithDripZ === 0) {
          anchorWithDripZ = Math.hypot(child.position.x, child.position.z);
        }
      });

      expect(anchorNoDripZ).toBeGreaterThan(0);
      expect(anchorWithDripZ).toBeGreaterThan(0);
      // With drip at 50% carve depth, surface is offset by 0.06 * (1 - 0.5) = 0.03
      expect(anchorWithDripZ - anchorNoDripZ).toBeCloseTo(0.03, 3);
    });
  });
});
