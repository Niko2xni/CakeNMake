import { describe, it, expect, vi } from 'vitest';

vi.mock('./cakeFonts', () => ({
  getPacificoFont: () => null,
  getHandwrittenFont: () => null,
  areFontsReady: () => false,
  onFontsReady: () => () => { },
}));

import {
  getGlazeCheckerCoverageFn,
  getGlazeTriangleCoverageFn,
} from './DecorationSets';
import { buildGlazeGeometry } from './frostingGeometry';
import { getCakeGlazeCarve } from './CakeScene';

describe('Glaze empty spaces for Side designs', () => {
  it('Checkered glaze coverage returns 1.0 inside squares and clears them cleanly', () => {
    const radius = 3;
    const height = 4;
    const coverageFn = getGlazeCheckerCoverageFn(radius, height, { pattern: 'full' });

    const cellAngle = (Math.PI * 2) / 16;
    const cellHeight = height / Math.max(2, Math.round(height / 1.22));
    const angleCenter = cellAngle * 0.5;
    const localYCenter = -height / 2 + cellHeight * 0.5;

    // Center of the square must be 1.0
    expect(coverageFn(angleCenter, localYCenter)).toBe(1);

    // Near the edge inside the square
    const angleNearEdgeInside = angleCenter + cellAngle * 0.40;
    const localYNearEdgeInside = localYCenter + cellHeight * 0.40;
    expect(coverageFn(angleNearEdgeInside, localYNearEdgeInside)).toBe(1);

    // Far in the gap / adjacent uncovered cell
    const angleOutside = angleCenter + cellAngle * 0.60;
    expect(coverageFn(angleOutside, localYCenter)).toBe(0);
  });

  it('Triangle glaze coverage returns 1.0 inside triangle shapes', () => {
    const radius = 3;
    const height = 4;
    const coverageFn = getGlazeTriangleCoverageFn(radius, height, { pattern: 'full' });

    const cellAngle = (Math.PI * 2) / 16;
    const cellHeight = height / Math.max(2, Math.round(height / 1.22));
    const angleCenter = cellAngle * 0.5;
    const localYBase = -height / 2 + cellHeight * 0.15;

    expect(coverageFn(angleCenter, localYBase)).toBe(1);
  });

  it('buildGlazeGeometry with drip carve and coverageFn collapses glaze over side design without V-shape distortion', () => {
    const radius = 3;
    const height = 4;
    const carve = getCakeGlazeCarve('longWave');

    // Create a mock rectangular side design window at angle [0.25, 0.45] and Y [1.6, 2.4]
    const coverageFn = (angle, y) => {
      const wrapped = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (wrapped >= 0.25 && wrapped <= 0.45 && y >= 1.6 && y <= 2.4) {
        return 1.0;
      }
      return 0.0;
    };

    const geo = buildGlazeGeometry(radius, height, 0, () => 0.5, {
      carve,
      coatThickness: 0.16,
      wallThickness: 0.16,
      coverageFn,
    });

    const pos = geo.getAttribute('position');
    expect(pos.count).toBeGreaterThan(0);

    let foundInsideCount = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      const angle = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);

      if (angle >= 0.28 && angle <= 0.42 && y >= 1.8 && y <= 2.2) {
        foundInsideCount++;
        // The vertex radius must be collapsed to cake surface / hideTarget (radius - 0.004 = 2.996)
        expect(r).toBeLessThanOrEqual(radius + 0.001);
      }
    }
    expect(foundInsideCount).toBeGreaterThan(10);
  });

  it('empty spaces and gaps between checkered squares return 0 coverage so glaze remains smooth and clean', () => {
    const radius = 3;
    const height = 4;
    const coverageFn = getGlazeCheckerCoverageFn(radius, height, { pattern: 'full' });

    const cellAngle = (Math.PI * 2) / 16;
    const cellHeight = height / Math.max(2, Math.round(height / 1.22));
    const angleCenter = cellAngle * 0.5;
    const localYCenter = -height / 2 + cellHeight * 0.5;

    // At the square outer edge (half = 0.45), coverage must be 0 (tucked inside the square)
    const angleAtSquareEdge = angleCenter + cellAngle * 0.45;
    expect(coverageFn(angleAtSquareEdge, localYCenter)).toBe(0);

    // In the grout gap between squares (fx = 0.48)
    const angleInGrout = angleCenter + cellAngle * 0.48;
    expect(coverageFn(angleInGrout, localYCenter)).toBe(0);

    // In the vertical grout gap (fy = 0.48)
    const localYInGrout = localYCenter + cellHeight * 0.48;
    expect(coverageFn(angleCenter, localYInGrout)).toBe(0);
  });

  it('buildGlazeGeometry with ridge hugging and side coverage collapses glaze onto the wall at side decoration positions', () => {
    const radius = 3;
    const height = 4;
    const carve = getCakeGlazeCarve('longGaps');

    // Mock ridge profile function (e.g. Ridge Comb)
    const ridgeProfileFn = (y) => 0.07 * Math.sin((y / 0.42) * Math.PI * 2);

    // Mock side coverage window
    const coverageFn = (angle, y) => {
      const wrapped = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (wrapped >= 0.5 && wrapped <= 1.0 && y >= 1.5 && y <= 2.5) {
        return 1.0;
      }
      return 0.0;
    };

    const geo = buildGlazeGeometry(radius, height, 0, () => 0.5, {
      carve,
      coatThickness: 0.15,
      ridgeProfileFn,
      ridgeHugStrength: 1,
      coverageFn,
    });

    const pos = geo.getAttribute('position');
    let insideCollapsedCount = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      const angle = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);

      if (angle >= 0.6 && angle <= 0.9 && y >= 1.8 && y <= 2.2) {
        insideCollapsedCount++;
        // The vertex radius must collapse to base cake radius despite ridge hugging
        expect(r).toBeLessThanOrEqual(radius + 0.001);
      }
    }
    expect(insideCollapsedCount).toBeGreaterThan(0);
  });
});


