import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  DOT_R,
  buildFlushHemisphereDot,
  buildPearlDot,
  getPipingScrollsCoverageFn,
  buildPipingScrolls,
} from './pipingScrollsHelpers';
import { PIPING_SCROLLS_SETS } from '../../../lib/cakeConfig';

describe('Piping Scrolls on Drip designs (visible drip + 75/25 pearl vision)', () => {
  const variants = PIPING_SCROLLS_SETS.map((s) => s.id);

  it.each(variants)(
    'ensures empty spaces for variant "%s" with forGlaze: true do not exceed maxCarveDepth so Drip remains visible',
    (variant) => {
      const radius = 2;
      const height = 3;
      const coverageFnGlaze = getPipingScrollsCoverageFn(radius, height, {
        variant,
        forGlaze: true,
      });

      // Sample a grid across angle and height
      let maxCoverage = 0;
      for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
        for (let y = -height / 2; y <= height / 2; y += 0.1) {
          const cov = coverageFnGlaze(angle, y);
          if (cov > maxCoverage) maxCoverage = cov;
        }
      }

      // Coverage must be active (greater than 0 where scroll/pearl is located)
      expect(maxCoverage).toBeGreaterThan(0);
      // But coverage must NOT exceed 0.50, so (1 - coverage) >= 0.50 and drip is not gone
      expect(maxCoverage).toBeLessThanOrEqual(0.5001);
    }
  );

  it('allows full coverage (1.0) when not for glaze (e.g. for filling bump shaving)', () => {
    const radius = 2;
    const height = 3;
    const coverageFnFilling = getPipingScrollsCoverageFn(radius, height, {
      variant: 'waveRope',
      forGlaze: false,
    });

    let maxCoverage = 0;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
      for (let y = -height / 2; y <= height / 2; y += 0.1) {
        const cov = coverageFnFilling(angle, y);
        if (cov > maxCoverage) maxCoverage = cov;
      }
    }

    expect(maxCoverage).toBeCloseTo(1.0, 2);
  });

  it('positions Pearl Dot with 75/25 vision when placed at the Drip', () => {
    const surfaceRadius = 2.03; // radius + dripOffset in carved area
    const dotRadius = DOT_R;
    const theta = Math.PI / 3;
    const y = 0.5;

    const geo = buildPearlDot(theta, y, surfaceRadius, dotRadius, { atDrip: true });
    expect(geo).toBeInstanceOf(THREE.BufferGeometry);

    const pos = geo.attributes.position;
    let minR = Infinity;
    let maxR = -Infinity;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
    }

    const diameter = 2 * dotRadius;
    const centerR = (minR + maxR) / 2;

    // Center of pearl sphere must be at surfaceRadius + 0.5 * dotRadius
    expect(centerR).toBeCloseTo(surfaceRadius + 0.5 * dotRadius, 3);

    // Outer protrusion beyond the Drip surface
    const protruding = maxR - surfaceRadius;
    // Buried depth beneath the Drip surface
    const buried = surfaceRadius - minR;

    expect(protruding / diameter).toBeCloseTo(0.75, 2);
    expect(buried / diameter).toBeCloseTo(0.25, 2);

    geo.dispose();
  });

  it.each(variants)(
    'builds Piping Scrolls mesh for variant "%s" with hasDrip: true and 75/25 lifted pearls',
    (variant) => {
      const radius = 2.0;
      const height = 2.5;
      const mesh = buildPipingScrolls(radius, height, '#F5ECE5', null, variant, {
        hasDrip: true,
        coatThickness: 0.06,
      });

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.geometry.attributes.position.count).toBeGreaterThan(0);

      // Verify that geometry outer bounds reach beyond radius + dripCarvedThickness + 0.5 * DOT_R
      const pos = mesh.geometry.attributes.position;
      let maxRadius = 0;
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getZ(i));
        if (r > maxRadius) maxRadius = r;
      }

      // Lifted pearls reach out to surfaceRadius + 1.5 * DOT_R = 2.03 + 0.165 = 2.195
      expect(maxRadius).toBeGreaterThan(radius + DOT_R);

      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  );
});

describe('Boxy Piping Scrolls on Rectangle and Square cakes', () => {
  const variants = PIPING_SCROLLS_SETS.map((s) => s.id);

  it.each(variants)(
    'builds Boxy Piping Scrolls mesh for variant "%s" on rectangular cake without distortion',
    (variant) => {
      const radius = 2.0;
      const height = 2.5;
      const mesh = buildPipingScrolls(radius, height, '#5B2C1D', null, variant, {
        shape: 'rectangle',
        hasDrip: true,
        coatThickness: 0.06,
      });

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.userData.isBoxyPipingScrolls).toBe(true);
      expect(mesh.userData.morphedToBoxy).toBe(true);

      const pos = mesh.geometry.attributes.position;
      expect(pos.count).toBeGreaterThan(0);

      // Verify no NaN or infinite coordinates
      let hasNaN = false;
      for (let i = 0; i < pos.count; i++) {
        if (isNaN(pos.getX(i)) || isNaN(pos.getY(i)) || isNaN(pos.getZ(i))) {
          hasNaN = true;
        }
      }
      expect(hasNaN).toBe(false);

      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  );

  it.each(variants)(
    'builds Boxy Piping Scrolls mesh for variant "%s" on square cake',
    (variant) => {
      const radius = 2.0;
      const height = 2.5;
      const mesh = buildPipingScrolls(radius, height, '#5B2C1D', null, variant, {
        shape: 'square',
        hasDrip: false,
      });

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.userData.isBoxyPipingScrolls).toBe(true);
      expect(mesh.userData.morphedToBoxy).toBe(true);

      const pos = mesh.geometry.attributes.position;
      expect(pos.count).toBeGreaterThan(0);

      let hasNaN = false;
      for (let i = 0; i < pos.count; i++) {
        if (isNaN(pos.getX(i)) || isNaN(pos.getY(i)) || isNaN(pos.getZ(i))) {
          hasNaN = true;
        }
      }
      expect(hasNaN).toBe(false);

      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  );

  it('renders authentic waveRope tiles across the front face on rectangle', () => {
    const radius = 4.0;
    const height = 3.0;
    const mesh = buildPipingScrolls(radius, height, '#5B2C1D', null, 'waveRope', {
      shape: 'rectangle',
      hasDrip: true,
      coatThickness: 0.06,
    });

    const pos = mesh.geometry.attributes.position;
    const D = radius * 0.85; // ~3.4
    const frontVertices = [];

    // Filter vertices on front face (z close to D, within 0.2)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (z > D - 0.2) {
        frontVertices.push({ x, y, z });
      }
    }

    expect(frontVertices.length).toBeGreaterThan(100);

    // Verify crests (y > 0.45) across the front face tiles:
    const leftPeakVerts = frontVertices.filter((v) => v.x < -2.0 && v.y > 0.45);
    const rightPeakVerts = frontVertices.filter((v) => v.x > 0.0 && v.y > 0.45);

    expect(leftPeakVerts.length).toBeGreaterThan(0);
    expect(rightPeakVerts.length).toBeGreaterThan(0);

    // Verify troughs (y < -0.45) across the front face tiles:
    const leftValleyVerts = frontVertices.filter((v) => v.x < 0.0 && v.y < -0.45);
    const rightValleyVerts = frontVertices.filter((v) => v.x > 2.0 && v.y < -0.45);

    expect(leftValleyVerts.length).toBeGreaterThan(0);
    expect(rightValleyVerts.length).toBeGreaterThan(0);

    // Verify no bottom corner dots are placed outside the wave profile:
    const bottomCornerVerts = frontVertices.filter((v) => v.y < -1.0);
    expect(bottomCornerVerts.length).toBe(0);

    mesh.geometry.dispose();
    mesh.material.dispose();
  });

  it('carves smooth empty spaces in the drip for boxy shapes with 50% max depth (preserving visible drip)', () => {
    const radius = 4.0;
    const height = 3.0;
    const covFn = getPipingScrollsCoverageFn(radius, height, {
      variant: 'waveRope',
      forGlaze: true,
      shape: 'rectangle',
      cakeShape: 'rectangle',
      maxCarveDepth: 0.50,
    });

    // Query at theta = 0 (glazeArg = 0, which corresponds to Front face center where wave crosses y=0)
    const midCoverage = covFn(0, 0);
    expect(midCoverage).toBeGreaterThan(0);
    expect(midCoverage).toBeLessThanOrEqual(0.50);

    // Far above the decorative band (y = 2.0), coverage should be 0
    const farAboveCoverage = covFn(0, 2.0);
    expect(farAboveCoverage).toBe(0);

    // Far below the decorative band (y = -2.0), coverage should be 0
    const farBelowCoverage = covFn(0, -2.0);
    expect(farBelowCoverage).toBe(0);
  });

  it('offsets boxy piping scrolls outward when Drip is present to rest flush on the reduced drip surface', () => {
    const radius = 4.0;
    const height = 3.0;
    const meshNoDrip = buildPipingScrolls(radius, height, '#5B2C1D', null, 'waveRope', {
      shape: 'square',
      hasDrip: false,
    });
    const meshWithDrip = buildPipingScrolls(radius, height, '#5B2C1D', null, 'waveRope', {
      shape: 'square',
      hasDrip: true,
      coatThickness: 0.06,
      maxCarveDepth: 0.50,
    });

    const posNoDrip = meshNoDrip.geometry.attributes.position;
    const posWithDrip = meshWithDrip.geometry.attributes.position;

    // Compare max Z on front face (z close to radius)
    let maxZNoDrip = 0;
    for (let i = 0; i < posNoDrip.count; i++) {
      const z = posNoDrip.getZ(i);
      if (z > maxZNoDrip) maxZNoDrip = z;
    }

    let maxZWithDrip = 0;
    for (let i = 0; i < posWithDrip.count; i++) {
      const z = posWithDrip.getZ(i);
      if (z > maxZWithDrip) maxZWithDrip = z;
    }

    // With drip offset (0.06 * 0.50 + 0.015 = 0.045), maxZ should be shifted outward
    expect(maxZWithDrip).toBeGreaterThan(maxZNoDrip);
    expect(maxZWithDrip - maxZNoDrip).toBeGreaterThanOrEqual(0.03);

    meshNoDrip.geometry.dispose();
    meshNoDrip.material.dispose();
    meshWithDrip.geometry.dispose();
    meshWithDrip.material.dispose();
  });
});

