import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EdgeSection from './sections/EdgeSection';
import SideSection from './sections/SideSection';
import { computeEdgeTrimRadius, computeEdgeTrimY } from './DecorationSets';
import {
  BEADED_TRIM_VARIATIONS_DELUXE,
  BORDER_PIPING_VARIATIONS_DELUXE,
  CHECKERED_PATTERN_SETS,
  DOLLOPS_VARIATIONS_DELUXE,
  FRUIT_CONFECTION_RIM_OPTIONS,
  SUGAR_COLORS,
  WHIPPED_CREAM_VARIATIONS,
} from '@/lib/cakeConfig';
import { adaptConfigToLegacy } from '@/lib/configAdapter';

function makeLayeredConfig(layerDesign) {
  return {
    structure: { size: 'big', layers: 2, layerDesign },
    sponge: { flavor: 'vanilla' },
    filling: { enabled: true, layers: 1, flavor: 'vanilla' },
    exteriorFinish: { style: 'fullyFrosted', flavor: 'vanilla' },
    sugarColorOverrides: {
      filling: { mode: 'colorOverride', colorId: 'chocolate' },
      'filling-0': { mode: 'colorOverride', colorId: 'strawberry' },
      'filling-1': { mode: 'colorOverride', colorId: 'mocha' },
      exterior: { mode: 'colorOverride', colorId: 'chocolate' },
      'exterior-0': { mode: 'colorOverride', colorId: 'strawberry' },
      'exterior-1': { mode: 'colorOverride', colorId: 'mocha' },
    },
  };
}

describe('Uniform and Individual tier state', () => {
  const colorHex = (colorId) => SUGAR_COLORS.find((color) => color.id === colorId)?.hex;

  it('uses shared colors for every tier in Uniform mode', () => {
    const legacy = adaptConfigToLegacy(makeLayeredConfig('uniform'));

    expect(legacy.layerFillingSugarColors).toEqual(Array(2).fill(colorHex('chocolate')));
    expect(legacy.layerSurfaceFrostingColors).toEqual(Array(2).fill(colorHex('chocolate')));
  });

  it('preserves per-tier colors in Individual mode', () => {
    const legacy = adaptConfigToLegacy(makeLayeredConfig('individual'));

    expect(legacy.layerFillingSugarColors).toEqual([colorHex('strawberry'), colorHex('mocha')]);
    expect(legacy.layerSurfaceFrostingColors).toEqual([colorHex('strawberry'), colorHex('mocha')]);
  });

  it('stores Side choices on the active tier without changing other tiers', () => {
    const side = { mode: null, checkeredPattern: { setId: null } };
    const onChange = vi.fn();
    const variant = CHECKERED_PATTERN_SETS[0];

    render(React.createElement(SideSection, {
      side,
      structure: { layers: 2, layerDesign: 'individual' },
      activeLayer: 0,
      onChange,
      sugarColor: {},
      onSugarColorChange: () => {},
    }));

    fireEvent.click(screen.getAllByTitle(variant.label)[0]);

    const nextSide = onChange.mock.calls[0][0];
    expect(nextSide.mode).toBeNull();
    expect(nextSide.layerTreatments[0].mode).toBe('checkeredPattern');
    expect(nextSide.layerTreatments[0].checkeredPattern.setId).toBe(variant.id);
    expect(nextSide.layerTreatments[1]).toEqual(side);
  });
});

describe('edge decoration placement', () => {
  it('embeds trim below the top face and keeps the inside-the-rim hug for frosting finishes', () => {
    expect(computeEdgeTrimY(1.25, 1.0, 'beadedTrim', 'fullyFrosted')).toBeCloseTo(1.09, 3);
    expect(computeEdgeTrimY(1.25, 1.0, 'piping', 'fullyFrosted')).toBeCloseTo(1.07, 3);
    expect(computeEdgeTrimY(1.25, 1.0, 'piping', 'texturedButtercream')).toBeCloseTo(1.07, 3);
    expect(computeEdgeTrimRadius(1.0, 'beadedTrim', 'fullyFrosted')).toBeCloseTo(0.84, 3);
    expect(computeEdgeTrimRadius(1.0, 'piping', 'texturedButtercream')).toBeCloseTo(0.82, 3);
    expect(computeEdgeTrimRadius(1.0, 'piping', 'naked')).toBeCloseTo(0.72, 3);
    expect(computeEdgeTrimRadius(1.0, 'dollops', 'fullyFrosted')).toBeCloseTo(0.30, 3);
    expect(computeEdgeTrimY(0, 4.0, 'dollops', 'fullyFrosted', true)).toBeCloseTo(-0.02, 2);
    expect(computeEdgeTrimRadius(4.0, 'dollops', 'fullyFrosted', true)).toBeCloseTo(4.604, 2);
    expect(computeEdgeTrimRadius(4.0, 'shell', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'shell', 'fullyFrosted', true)).toBeCloseTo(4.28, 2);
    expect(computeEdgeTrimRadius(4.0, 'reverseShell', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'reverseShell', 'fullyFrosted', true)).toBeCloseTo(4.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'bead', 'fullyFrosted')).toBeCloseTo(3.68, 2);
    expect(computeEdgeTrimRadius(4.0, 'bead', 'fullyFrosted', true)).toBeCloseTo(4.40, 2);
    expect(computeEdgeTrimRadius(4.0, 'zigzag', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'zigzag', 'fullyFrosted', true)).toBeCloseTo(4.27, 2);
    expect(computeEdgeTrimRadius(4.0, 'wavePiping', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'wavePiping', 'fullyFrosted', true)).toBeCloseTo(4.27, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwist', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwist', 'fullyFrosted', true)).toBeCloseTo(4.27, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistClassic', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistClassic', 'fullyFrosted', true)).toBeCloseTo(4.27, 2);
  });

  it('does not render the generic None option in the edge picker and uses dedicated design rows', () => {
    render(
      React.createElement(EdgeSection, {
        edge: {
          mode: 'both',
          both: {
            decorations: { setId: null, colorId: 'vanilla' },
            piping: { tip: null, colorId: 'vanilla' },
          },
          top: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          middle: { piping: { tip: null, colorId: 'vanilla' } },
        },
        onChange: () => {},
        sugarColor: {},
        onSugarColorChange: () => {},
      })
    );

    expect(screen.getByRole('button', { name: 'Top', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bottom', exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Both', exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'None' })).not.toBeInTheDocument();
    expect(screen.getByTitle('Shell Border')).toBeInTheDocument();
    expect(screen.getByTitle('Reverse Shell')).toBeInTheDocument();
    expect(screen.getByTitle('Bead Piping')).toBeInTheDocument();
    expect(screen.queryByText('Zigzag Piping')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Zigzag Piping')).not.toBeInTheDocument();
    expect(screen.queryByText('Wave Piping')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Wave Piping')).not.toBeInTheDocument();
    expect(screen.queryByText('Scallops')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Star Scallop')).not.toBeInTheDocument();
    expect(screen.getByTitle('Rope Twist')).toBeInTheDocument();
    expect(screen.getByTitle('Rope Twist (Classic)')).toBeInTheDocument();
    expect(screen.getByTitle('Beaded Trim')).toBeInTheDocument();
    expect(screen.queryByTitle('Trio Beaded Trim')).not.toBeInTheDocument();
    expect(screen.getByTitle('Petite Beaded Trim')).toBeInTheDocument();
    expect(screen.getByText('Dollops')).toBeInTheDocument();
    expect(screen.getByTitle('Star Dollop (12 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Sparse Star Dollop (8 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Continuous Star Dollop (20 pc)')).toBeInTheDocument();
  });

  it('offers Top, Middle, and Bottom without an All toggle on multi-tier cakes', () => {
    render(
      React.createElement(EdgeSection, {
        edge: { mode: 'topBottomSeparate', activeSlot: 'top' },
        structure: { layers: 2, layerDesign: 'uniform' },
        onChange: () => {},
      })
    );

    expect(screen.getByRole('button', { name: 'Top', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Middle', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bottom', exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All', exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Both', exact: true })).not.toBeInTheDocument();
  });

  it('offers every Edge design group when the Middle toggle is active', () => {
    render(
      React.createElement(EdgeSection, {
        edge: {
          mode: 'topBottomSeparate',
          activeSlot: 'middle',
          middle: { piping: { tip: null, colorId: 'vanilla' } },
        },
        structure: { layers: 2, layerDesign: 'uniform' },
        onChange: () => {},
        sugarColor: {},
        onSugarColorChange: () => {},
      })
    );

    expect(screen.getByText('Border Piping')).toBeInTheDocument();
    expect(screen.queryByText('Middle Seam Designs')).not.toBeInTheDocument();
    const whippedCreamLabel = screen.getByText('Whipped Cream Rosettes');
    expect(whippedCreamLabel.classList).toContain('font-semibold');
    expect(whippedCreamLabel.classList).toContain('text-foreground');

    const allVariants = [
      ...BORDER_PIPING_VARIATIONS_DELUXE,
      ...BEADED_TRIM_VARIATIONS_DELUXE,
      ...DOLLOPS_VARIATIONS_DELUXE,
      ...WHIPPED_CREAM_VARIATIONS,
      ...FRUIT_CONFECTION_RIM_OPTIONS,
    ];
    expect(allVariants.every(({ label }) => screen.getByTitle(label))).toBe(true);
  });

  it('generates dense accordion-pleated zigzag geometry with zero overhang', async () => {
    const { buildZigzagRingGeometry, ZigzagStripCurve } = await import('./pipingTips');

    // Test ZigzagStripCurve parameters
    const circumference = 3.66 * Math.PI * 2;
    const waves = Math.round(circumference / 0.28);
    const curve = new ZigzagStripCurve(circumference, 0.185, waves);

    expect(curve.L).toBeLessThanOrEqual(0.30);
    expect(curve.amplitude).toBeCloseTo(0.185, 2);

    // Verify continuity of height profile
    const ptStart = curve.getPoint(0);
    const ptEnd = curve.getPoint(1);
    expect(ptStart.y).toBeCloseTo(ptEnd.y, 3);
    expect(ptStart.y).toBeCloseTo(0.072, 3);

    // Test built geometry on 8-inch cake top rim (radius 3.66)
    const geo = buildZigzagRingGeometry(3.66);
    expect(geo.getAttribute('position').count).toBeGreaterThan(1000);

    // Compute maximum radial distance of all vertices from origin
    geo.computeBoundingBox();
    const pos = geo.getAttribute('position');
    let maxR = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      if (r > maxR) maxR = r;
    }

    // Top surface radius is 4.06 — maximum vertex radius must strictly not exceed this (zero overhang!)
    expect(maxR).toBeLessThanOrEqual(4.06);
    expect(maxR).toBeGreaterThan(3.66); // Proud enough to form a visible outer border
  });

  it('generates flat-lying wave piping geometry with zero overhang', async () => {
    const { buildWavePipingRingGeometry, FlatSineStripCurve } = await import('./pipingTips');

    // Test FlatSineStripCurve parameters
    const circumference = 3.66 * Math.PI * 2;
    const waves = Math.round(circumference / 0.375);
    const curve = new FlatSineStripCurve(circumference, 0.175, waves);

    expect(curve.amplitude).toBeCloseTo(0.175, 2);
    expect(curve.waves).toBe(waves);

    // Verify curve is flat-lying: y is low (between 0.055 and 0.075)
    const ptStart = curve.getPoint(0);
    const ptMid = curve.getPoint(0.5);
    const ptEnd = curve.getPoint(1);
    expect(ptStart.y).toBeCloseTo(ptEnd.y, 3);
    expect(ptStart.y).toBeCloseTo(0.055, 3);
    expect(ptMid.y).toBeLessThan(0.08);

    // Test built geometry on 8-inch cake top rim (radius 3.66)
    const geo = buildWavePipingRingGeometry(3.66);
    expect(geo.getAttribute('position').count).toBeGreaterThan(1000);

    // Compute maximum radial distance of all vertices from origin
    geo.computeBoundingBox();
    const pos = geo.getAttribute('position');
    let maxR = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      if (r > maxR) maxR = r;
    }

    // Top surface radius is 4.06 — maximum vertex radius must strictly not exceed this (zero overhang!)
    expect(maxR).toBeLessThanOrEqual(4.06);
    expect(maxR).toBeGreaterThan(3.66); // Proud enough to form a visible outer border
  });

  it('generates interlocking rope twist geometry with zero overhang', async () => {
    const { buildRopeTwistRingGeometry } = await import('./pipingTips');

    // Test built geometry on 8-inch cake top rim (radius 3.66)
    const geo = buildRopeTwistRingGeometry(3.66);
    expect(geo.getAttribute('position').count).toBeGreaterThan(2000);

    // Compute maximum radial distance of all vertices from origin
    geo.computeBoundingBox();
    const pos = geo.getAttribute('position');
    let maxR = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      if (r > maxR) maxR = r;
    }

    // Top surface radius is 4.06 — maximum vertex radius must strictly not exceed this (zero overhang!)
    expect(maxR).toBeLessThanOrEqual(4.06);
    expect(maxR).toBeGreaterThan(3.66); // Proud enough to form a visible outer border
  });

  it('generates classic rope twist geometry variation with zero overhang', async () => {
    const { buildRopeTwistClassicRingGeometry } = await import('./pipingTips');

    // Test built geometry on 8-inch cake top rim (radius 3.66)
    const geo = buildRopeTwistClassicRingGeometry(3.66);
    expect(geo.getAttribute('position').count).toBeGreaterThan(2000);

    // Compute maximum radial distance of all vertices from origin
    geo.computeBoundingBox();
    const pos = geo.getAttribute('position');
    let maxR = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      if (r > maxR) maxR = r;
    }

    // Top surface radius is 4.06 — maximum vertex radius must strictly not exceed this (zero overhang!)
    expect(maxR).toBeLessThanOrEqual(4.06);
    expect(maxR).toBeGreaterThan(3.66);
  });

  it('generates reverse shell geometry variation with zero overhang', async () => {
    const { buildReverseShellRingGeometry } = await import('./pipingTips');

    // Test built geometry on 8-inch cake top rim (radius 3.66)
    const geo = buildReverseShellRingGeometry(3.66);
    expect(geo.getAttribute('position').count).toBeGreaterThan(2000);

    // Compute maximum radial distance of all vertices from origin
    geo.computeBoundingBox();
    const pos = geo.getAttribute('position');
    let maxR = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      if (r > maxR) maxR = r;
    }

    // Top surface radius is 4.06 — maximum vertex radius must strictly not exceed this (zero overhang!)
    expect(maxR).toBeLessThanOrEqual(4.06);
    expect(maxR).toBeGreaterThan(3.66);
  });
});
