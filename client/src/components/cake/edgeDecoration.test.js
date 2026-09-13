import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EdgeSection from './sections/EdgeSection';
import { computeEdgeTrimRadius, computeEdgeTrimY } from './DecorationSets';

describe('edge decoration placement', () => {
  it('embeds trim below the top face and keeps the inside-the-rim hug for frosting finishes', () => {
    expect(computeEdgeTrimY(1.25, 1.0, 'beadedTrim', 'fullyFrosted')).toBeCloseTo(1.09, 3);
    expect(computeEdgeTrimY(1.25, 1.0, 'piping', 'fullyFrosted')).toBeCloseTo(1.07, 3);
    expect(computeEdgeTrimY(1.25, 1.0, 'piping', 'texturedButtercream')).toBeCloseTo(1.07, 3);
    expect(computeEdgeTrimRadius(1.0, 'beadedTrim', 'fullyFrosted')).toBeCloseTo(0.84, 3);
    expect(computeEdgeTrimRadius(1.0, 'piping', 'texturedButtercream')).toBeCloseTo(0.82, 3);
    expect(computeEdgeTrimRadius(1.0, 'piping', 'naked')).toBeCloseTo(0.72, 3);
    expect(computeEdgeTrimRadius(1.0, 'dollops', 'fullyFrosted')).toBeCloseTo(0.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'dollops', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollopContinuous', 'fullyFrosted')).toBeCloseTo(3.40, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollop', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollopSparse', 'fullyFrosted')).toBeCloseTo(3.24, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollop', 'fullyFrosted')).toBeCloseTo(3.48, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopMedium', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopSparse', 'fullyFrosted')).toBeCloseTo(3.24, 2);
    expect(computeEdgeTrimRadius(4.0, 'kissDollop', 'fullyFrosted')).toBeCloseTo(3.48, 2);
    expect(computeEdgeTrimRadius(4.0, 'kissDollopMedium', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'kissDollopSparse', 'fullyFrosted')).toBeCloseTo(3.24, 2);
    expect(computeEdgeTrimY(0, 4.0, 'dollops', 'fullyFrosted', true)).toBeCloseTo(-0.02, 2);
    expect(computeEdgeTrimRadius(4.0, 'dollops', 'fullyFrosted', true)).toBeCloseTo(4.60, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollopContinuous', 'fullyFrosted', true)).toBeCloseTo(4.52, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollop', 'fullyFrosted', true)).toBeCloseTo(4.60, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollopSparse', 'fullyFrosted', true)).toBeCloseTo(4.65, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollop', 'fullyFrosted', true)).toBeCloseTo(4.46, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopMedium', 'fullyFrosted', true)).toBeCloseTo(4.60, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopSparse', 'fullyFrosted', true)).toBeCloseTo(4.65, 2);
    expect(computeEdgeTrimRadius(4.0, 'kissDollop', 'fullyFrosted', true)).toBeCloseTo(4.46, 2);
    expect(computeEdgeTrimRadius(4.0, 'kissDollopMedium', 'fullyFrosted', true)).toBeCloseTo(4.60, 2);
    expect(computeEdgeTrimRadius(4.0, 'kissDollopSparse', 'fullyFrosted', true)).toBeCloseTo(4.65, 2);
    expect(computeEdgeTrimRadius(4.0, 'shell', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'shell', 'fullyFrosted', true)).toBeCloseTo(4.28, 2);
    expect(computeEdgeTrimRadius(4.0, 'shellAlt', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'shellAlt', 'fullyFrosted', true)).toBeCloseTo(4.28, 2);
    expect(computeEdgeTrimRadius(4.0, 'reverseShell', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'reverseShell', 'fullyFrosted', true)).toBeCloseTo(4.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'reverseShellAlt', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'reverseShellAlt', 'fullyFrosted', true)).toBeCloseTo(4.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'bead', 'fullyFrosted')).toBeCloseTo(3.68, 2);
    expect(computeEdgeTrimRadius(4.0, 'bead', 'fullyFrosted', true)).toBeCloseTo(4.40, 2);
    expect(computeEdgeTrimRadius(4.0, 'beadAlt', 'fullyFrosted')).toBeCloseTo(3.68, 2);
    expect(computeEdgeTrimRadius(4.0, 'beadAlt', 'fullyFrosted', true)).toBeCloseTo(4.40, 2);
    expect(computeEdgeTrimRadius(4.0, 'zigzag', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'zigzag', 'fullyFrosted', true)).toBeCloseTo(4.27, 2);
    expect(computeEdgeTrimRadius(4.0, 'wavePiping', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'wavePiping', 'fullyFrosted', true)).toBeCloseTo(4.27, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwist', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwist', 'fullyFrosted', true)).toBeCloseTo(4.27, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistAlt', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistAlt', 'fullyFrosted', true)).toBeCloseTo(4.27, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistClassic', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistClassic', 'fullyFrosted', true)).toBeCloseTo(4.27, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistClassicAlt', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistClassicAlt', 'fullyFrosted', true)).toBeCloseTo(4.27, 2);
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
        onChange: () => { },
        sugarColor: {},
        onSugarColorChange: () => { },
      })
    );

    expect(screen.queryByRole('button', { name: 'None' })).not.toBeInTheDocument();
    expect(screen.getByText('Border Piping')).toBeInTheDocument();
    expect(screen.getByTitle('Shell Border')).toBeInTheDocument();
    expect(screen.getByTitle('Reverse Shell')).toBeInTheDocument();
    expect(screen.getByTitle('Bead Piping')).toBeInTheDocument();
    expect(screen.getByTitle('Rope Twist')).toBeInTheDocument();
    expect(screen.getByTitle('Rope Twist (Classic)')).toBeInTheDocument();
    expect(screen.queryByTitle('Shell Border - Alternating')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Reverse Shell - Alternating')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Bead Piping - Alternating')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Rope Twist - Alternating')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Rope Twist (Classic) - Alternating')).not.toBeInTheDocument();
    expect(screen.queryByText('Zigzag Piping')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Zigzag Piping')).not.toBeInTheDocument();
    expect(screen.queryByText('Wave Piping')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Wave Piping')).not.toBeInTheDocument();
    expect(screen.queryByText('Scallops')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Star Scallop')).not.toBeInTheDocument();
    expect(screen.queryByText('Rope')).not.toBeInTheDocument();
    expect(screen.queryByText('Petal')).not.toBeInTheDocument();
    expect(screen.queryByText('Drop Flower')).not.toBeInTheDocument();
    expect(screen.getByText('Bracelet Beads')).toBeInTheDocument();
    expect(screen.getByTitle('Beaded Trim')).toBeInTheDocument();
    expect(screen.getByTitle('Trio Beaded Trim')).toBeInTheDocument();
    expect(screen.getByTitle('Petite Beaded Trim')).toBeInTheDocument();
    expect(screen.getByText('Star Dollop')).toBeInTheDocument();
    expect(screen.getByText('Round Tip Dollop')).toBeInTheDocument();
    expect(screen.getByText('Kiss-shaped Dollop')).toBeInTheDocument();
    expect(screen.getByTitle('Continuous Star Dollop (20 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Star Dollop (12 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Sparse Star Dollop (8 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Continuous Round Tip Dollop (20 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Round Tip Dollop (12 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Sparse Round Tip Dollop (8 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Continuous Kisses Dollop (20 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Kisses Dollop (12 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Sparse Kisses Dollop (8 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Continuous Kisses Dollop (20 pc) with Cherry')).toBeInTheDocument();
    expect(screen.getByTitle('Kisses Dollop (12 pc) with Cherry')).toBeInTheDocument();
    expect(screen.getByTitle('Sparse Kisses Dollop (8 pc) with Cherry')).toBeInTheDocument();
    expect(screen.queryByTitle('Continuous Star Dollop (20 pc) - Alternating')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Continuous Round Tip Dollop (20 pc) - Alternating')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Continuous Kisses Dollop (20 pc) - Alternating')).not.toBeInTheDocument();
  });

  it('allows selecting Top Edge, Bottom Edge, and Both via unified placement bar with design preservation', () => {
    function StatefulEdgeSection() {
      const [edge, setEdge] = React.useState({
        mode: 'both',
        top: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
        bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
        both: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
        middle: { piping: { tip: null, colorId: 'vanilla' } },
      });
      return React.createElement(EdgeSection, {
        edge,
        onChange: setEdge,
        sugarColor: {},
        onSugarColorChange: () => {},
      });
    }

    render(React.createElement(StatefulEdgeSection));
    expect(screen.getByText('Placement')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Top Edge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bottom Edge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Both' })).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Shell Border'));
    expect(screen.getByTitle('Shell Border')).toHaveClass('bg-primary');

    fireEvent.click(screen.getByRole('button', { name: 'Top Edge' }));
    expect(screen.getByTitle('Shell Border')).toHaveClass('bg-primary');

    fireEvent.click(screen.getByRole('button', { name: 'Bottom Edge' }));
    expect(screen.getByTitle('Shell Border')).toHaveClass('bg-primary');

    fireEvent.click(screen.getByRole('button', { name: 'Both' }));
    expect(screen.getByTitle('Shell Border')).toHaveClass('bg-primary');
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

  it('generates smooth round tip dollop geometry and piping ring', async () => {
    const { buildRoundDollopUnitGeometry, buildPipingRing } = await import('./pipingTips');
    const THREE = await import('three');

    const unitGeo = buildRoundDollopUnitGeometry();
    expect(unitGeo.getAttribute('position').count).toBeGreaterThan(1000);
    expect(unitGeo.getAttribute('normal')).toBeDefined();

    const mat = new THREE.MeshBasicMaterial();
    // 4th variation: Continuous round dollops touching side-by-side (20 count on 8" rim, R=3.48)
    const ringMesh = buildPipingRing('roundDollop', mat, { radius: 3.48, y: 1.0, scale: 3 });
    expect(ringMesh).toBeDefined();
    expect(ringMesh.isInstancedMesh).toBe(true);
    expect(ringMesh.count).toBe(20);

    // 5th variation: Slicing guide round dollops (12 count on 8" rim, R=3.30)
    const ringMeshMedium = buildPipingRing('roundDollopMedium', mat, { radius: 3.30, y: 1.0, scale: 3 });
    expect(ringMeshMedium).toBeDefined();
    expect(ringMeshMedium.isInstancedMesh).toBe(true);
    expect(ringMeshMedium.count).toBe(12);

    // 6th variation: Sparse round dollops (8 count on 8" rim, R=3.24)
    const ringMeshSparse = buildPipingRing('roundDollopSparse', mat, { radius: 3.24, y: 1.0, scale: 3 });
    expect(ringMeshSparse).toBeDefined();
    expect(ringMeshSparse.isInstancedMesh).toBe(true);
    expect(ringMeshSparse.count).toBe(8);
  });

  it('generates tall kisses-shaped dollop geometry and inverse-scaled piping ring variations (20 pc, 12 pc, 8 pc)', async () => {
    const { buildKissDollopUnitGeometry, buildPipingRing } = await import('./pipingTips');
    const THREE = await import('three');

    const unitGeo = buildKissDollopUnitGeometry();
    expect(unitGeo.getAttribute('position').count).toBeGreaterThan(1000);
    expect(unitGeo.getAttribute('normal')).toBeDefined();

    const mat = new THREE.MeshBasicMaterial();
    // 7th variation: Continuous kisses dollops (touching side-by-side, 20 count on 8" rim, R=3.48)
    const ringMeshContinuous = buildPipingRing('kissDollop', mat, { radius: 3.48, y: 1.0, scale: 3 });
    expect(ringMeshContinuous).toBeDefined();
    expect(ringMeshContinuous.isInstancedMesh).toBe(true);
    expect(ringMeshContinuous.count).toBe(20);

    // 8th variation: Slicing guide kisses dollops (12 count on 8" rim, R=3.30)
    const ringMeshMedium = buildPipingRing('kissDollopMedium', mat, { radius: 3.30, y: 1.0, scale: 3 });
    expect(ringMeshMedium).toBeDefined();
    expect(ringMeshMedium.isInstancedMesh).toBe(true);
    expect(ringMeshMedium.count).toBe(12);

    // 9th variation: Sparse kisses dollops (8 count on 8" rim, R=3.24)
    const ringMeshSparse = buildPipingRing('kissDollopSparse', mat, { radius: 3.24, y: 1.0, scale: 3 });
    expect(ringMeshSparse).toBeDefined();
    expect(ringMeshSparse.isInstancedMesh).toBe(true);
    expect(ringMeshSparse.count).toBe(8);
  });

  it('generates star dollop geometry and inverse-scaled piping ring variations (20 pc, 12 pc, 8 pc)', async () => {
    const { buildStarDollopUnitGeometry, buildPipingRing } = await import('./pipingTips');
    const THREE = await import('three');

    const unitGeo = buildStarDollopUnitGeometry();
    expect(unitGeo.getAttribute('position').count).toBeGreaterThan(500);
    expect(unitGeo.getAttribute('normal')).toBeDefined();

    // Unit geometry base dimensions (pre-scale):
    unitGeo.computeBoundingBox();
    const bb = unitGeo.boundingBox;
    const baseDiameter = bb.max.x - bb.min.x;
    const baseHeight = bb.max.y - bb.min.y;
    expect(baseDiameter).toBeCloseTo(0.6453, 3);
    expect(baseHeight).toBeCloseTo(0.46, 2);

    const mat = new THREE.MeshBasicMaterial();
    // 8x5 cake top rim: placement radii tailored so outer edges sit right by the edge (4.025"–4.028") without exceeding 4.06"
    // 1st variation: 20-Piece Seamless Border (Base D = 1.25", radius = 3.40", outer edge = 4.025")
    const ringMesh20 = buildPipingRing('starDollopContinuous', mat, { radius: 3.40, y: 1.0, scale: 3 });
    expect(ringMesh20).toBeDefined();
    expect(ringMesh20.isInstancedMesh).toBe(true);
    expect(ringMesh20.count).toBe(20);

    // 2nd variation: 12-Piece Slicing Guide (Base D = 1.45", radius = 3.30", outer edge = 4.025")
    const ringMesh12 = buildPipingRing('starDollop', mat, { radius: 3.30, y: 1.0, scale: 3 });
    expect(ringMesh12).toBeDefined();
    expect(ringMesh12.isInstancedMesh).toBe(true);
    expect(ringMesh12.count).toBe(12);

    // 3rd variation: 8-Piece Statement Mound (Base D = 1.575" [10% reduction], H = 1.37", radius = 3.24", outer edge = 4.028")
    const ringMesh8 = buildPipingRing('starDollopSparse', mat, { radius: 3.24, y: 1.0, scale: 3 });
    expect(ringMesh8).toBeDefined();
    expect(ringMesh8.isInstancedMesh).toBe(true);
    expect(ringMesh8.count).toBe(8);
  });

  it('generates star dollop fruit rings with sunken cherries at peakRatio 0.39', async () => {
    const { buildPipingRing } = await import('./pipingTips');
    const THREE = await import('three');
    const mat = new THREE.MeshBasicMaterial();

    // 1. Continuous Star Dollop with Cherry (20 dollops, 10 alternating cherries)
    const ring20 = buildPipingRing('starDollopContinuousCherry', mat, { radius: 3.40, y: 1.0, scale: 3 });
    expect(ring20).toBeDefined();
    expect(ring20.isGroup).toBe(true);
    expect(ring20.children[0].isInstancedMesh).toBe(true);
    expect(ring20.children[0].count).toBe(20);
    const cherries20 = ring20.children.slice(1);
    expect(cherries20.length).toBe(10);
    cherries20.forEach((c) => {
      expect(c.isGroup).toBe(true);
      expect(c.position.y).toBeGreaterThan(1.0);
    });

    // 2. Medium Star Dollop with Cherry (12 dollops, 12 cherries)
    const ring12 = buildPipingRing('starDollopCherry', mat, { radius: 3.30, y: 1.0, scale: 3 });
    expect(ring12).toBeDefined();
    expect(ring12.isGroup).toBe(true);
    expect(ring12.children[0].isInstancedMesh).toBe(true);
    expect(ring12.children[0].count).toBe(12);
    expect(ring12.children.slice(1).length).toBe(12);

    // 3. Sparse Star Dollop with Cherry (8 dollops, 8 cherries)
    const ring8 = buildPipingRing('starDollopSparseCherry', mat, { radius: 3.24, y: 1.0, scale: 3 });
    expect(ring8).toBeDefined();
    expect(ring8.isGroup).toBe(true);
    expect(ring8.children[0].isInstancedMesh).toBe(true);
    expect(ring8.children[0].count).toBe(8);
    expect(ring8.children.slice(1).length).toBe(8);
  });

  it('preserves the whipped-cream base while defining a continuous upper spiral fold', async () => {
    const { buildWhippedCreamRosetteUnitGeometry } = await import('./pipingTips');

    const geometry = buildWhippedCreamRosetteUnitGeometry();
    const positions = geometry.getAttribute('position');
    const radialSegments = 48;
    expect(positions.count).toBeGreaterThan(2000);
    expect(geometry.getAttribute('normal')).toBeDefined();
    geometry.computeBoundingBox();
    expect(geometry.boundingBox.max.y - geometry.boundingBox.min.y).toBeCloseTo(0.648, 3);

    const radialRangeAtRow = (row) => {
      const radii = [];
      for (let i = 0; i < radialSegments; i++) {
        const index = row * radialSegments + i;
        radii.push(Math.hypot(positions.getX(index), positions.getZ(index)));
      }
      return Math.max(...radii) - Math.min(...radii);
    };

    // The accepted lower-half open-star relief remains unchanged.
    expect(radialRangeAtRow(22)).toBeCloseTo(0.0715, 3);
    // The upper fold must be directional rather than concentric, and the
    // release point must lean away from the center like a real piping finish.
    expect(radialRangeAtRow(33)).toBeGreaterThan(0.05);
    const topRowStart = 44 * radialSegments;
    let topCenterX = 0;
    let topCenterZ = 0;
    for (let i = 0; i < radialSegments; i++) {
      topCenterX += positions.getX(topRowStart + i);
      topCenterZ += positions.getZ(topRowStart + i);
    }
    topCenterX /= radialSegments;
    topCenterZ /= radialSegments;
    expect(Math.hypot(topCenterX, topCenterZ)).toBeGreaterThan(0.035);
  });

  it('computes correct edge trim radii and Y positions for whipped cream rosette variations', () => {
    // Top edge: ring centers must keep outer rosette envelope inside cake surface.
    // surfaceRadius for edgeRadius=4.0, fullyFrosted = 4.0 + 0.06 = 4.06.
    // Continuous: topDollopInset=0.72 → ring R = 4.06 - 0.72 = 3.34
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteContinuous', 'fullyFrosted')).toBeCloseTo(3.34, 2);
    // Medium (12 pc): topDollopInset=0.82 → ring R = 4.06 - 0.82 = 3.24
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosette', 'fullyFrosted')).toBeCloseTo(3.24, 2);
    // Sparse (8 pc): topDollopInset=0.94 → ring R = 4.06 - 0.94 = 3.12
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteSparse', 'fullyFrosted')).toBeCloseTo(3.12, 2);

    // Bottom edge: rosettes sit proud outside the cake cylinder flush against the frosting wall
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteContinuous', 'fullyFrosted', true)).toBeCloseTo(4.69, 2);
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosette', 'fullyFrosted', true)).toBeCloseTo(4.80, 2);
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteSparse', 'fullyFrosted', true)).toBeCloseTo(4.91, 2);

    // Bottom edge Y: whipped cream is dollop-type, so sits at y=-0.02 (on cake board)
    expect(computeEdgeTrimY(0, 4.0, 'whippedCreamRosetteContinuous', 'fullyFrosted', true)).toBeCloseTo(-0.02, 2);
    expect(computeEdgeTrimY(0, 4.0, 'whippedCreamRosette', 'fullyFrosted', true)).toBeCloseTo(-0.02, 2);
    expect(computeEdgeTrimY(0, 4.0, 'whippedCreamRosetteSparse', 'fullyFrosted', true)).toBeCloseTo(-0.02, 2);

    // Cherry whipped cream variations automatically inherit same insets
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteContinuousCherry', 'fullyFrosted')).toBeCloseTo(3.34, 2);
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteCherry', 'fullyFrosted')).toBeCloseTo(3.24, 2);
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteSparseCherry', 'fullyFrosted')).toBeCloseTo(3.12, 2);
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteContinuousCherry', 'fullyFrosted', true)).toBeCloseTo(4.69, 2);
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteCherry', 'fullyFrosted', true)).toBeCloseTo(4.80, 2);
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteSparseCherry', 'fullyFrosted', true)).toBeCloseTo(4.91, 2);
    expect(computeEdgeTrimY(0, 4.0, 'whippedCreamRosetteContinuousCherry', 'fullyFrosted', true)).toBeCloseTo(-0.02, 2);
    expect(computeEdgeTrimY(0, 4.0, 'whippedCreamRosetteCherry', 'fullyFrosted', true)).toBeCloseTo(-0.02, 2);
    expect(computeEdgeTrimY(0, 4.0, 'whippedCreamRosetteSparseCherry', 'fullyFrosted', true)).toBeCloseTo(-0.02, 2);
  });

  it('generates correct instance counts for whipped cream rosette variations', async () => {
    const { buildPipingRing } = await import('./pipingTips');
    const THREE = await import('three');
    const mat = new THREE.MeshBasicMaterial({ color: '#FFF' });

    // Continuous (~20 pc): ring R=3.34, divisor=0.345*3=1.035 → count=round(2π*3.34/1.035)≈20
    const ring20 = buildPipingRing('whippedCreamRosetteContinuous', mat, { radius: 3.34, y: 1.0, scale: 3 });
    expect(ring20).toBeDefined();
    expect(ring20.isInstancedMesh).toBe(true);
    expect(ring20.count).toBeGreaterThanOrEqual(18);
    expect(ring20.count).toBeLessThanOrEqual(22);

    // Medium (12 pc): ring R=3.24, divisor=0.570*3=1.71 → count=round(2π*3.24/1.71)≈12
    const ring12 = buildPipingRing('whippedCreamRosette', mat, { radius: 3.24, y: 1.0, scale: 3 });
    expect(ring12).toBeDefined();
    expect(ring12.isInstancedMesh).toBe(true);
    expect(ring12.count).toBe(12);

    // Sparse (8 pc): ring R=3.12, divisor=0.820*3=2.46 → count=round(2π*3.12/2.46)≈8
    const ring8 = buildPipingRing('whippedCreamRosetteSparse', mat, { radius: 3.12, y: 1.0, scale: 3 });
    expect(ring8).toBeDefined();
    expect(ring8.isInstancedMesh).toBe(true);
    expect(ring8.count).toBe(8);
  });

  it('generates alternating dollop variations with dual-material groups, correct counts, and zero overhang', async () => {
    const { buildPipingRing } = await import('./pipingTips');
    const THREE = await import('three');

    const matA = new THREE.MeshBasicMaterial({ color: '#FFF' });
    const matB = new THREE.MeshBasicMaterial({ color: '#D6293E' });

    // 1. Continuous Star Dollop Alternating (20 count: 10 + 10)
    const starRing20Alt = buildPipingRing('starDollopContinuousAlt', matA, {
      radius: 3.40,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(starRing20Alt).toBeDefined();
    expect(starRing20Alt.isGroup).toBe(true);
    expect(starRing20Alt.children.length).toBe(2);
    expect(starRing20Alt.children[0].count).toBe(10);
    expect(starRing20Alt.children[1].count).toBe(10);
    expect(starRing20Alt.children[0].material).toBe(matA);
    expect(starRing20Alt.children[1].material).toBe(matB);

    // 2. Round Tip Dollop Alternating (12 count: 6 + 6)
    const roundRing12Alt = buildPipingRing('roundDollopMediumAlt', matA, {
      radius: 3.30,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(roundRing12Alt).toBeDefined();
    expect(roundRing12Alt.isGroup).toBe(true);
    expect(roundRing12Alt.children.length).toBe(2);
    expect(roundRing12Alt.children[0].count).toBe(6);
    expect(roundRing12Alt.children[1].count).toBe(6);

    // 3. Kisses Dollop Alternating (8 count: 4 + 4)
    const kissRing8Alt = buildPipingRing('kissDollopSparseAlt', matA, {
      radius: 3.24,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(kissRing8Alt).toBeDefined();
    expect(kissRing8Alt.isGroup).toBe(true);
    expect(kissRing8Alt.children.length).toBe(2);
    expect(kissRing8Alt.children[0].count).toBe(4);
    expect(kissRing8Alt.children[1].count).toBe(4);
  });

  it('renders alternating color options that reflect the Color Override palette', () => {
    render(
      React.createElement(EdgeSection, {
        edge: {
          mode: 'both',
          both: {
            decorations: { setId: null, colorId: 'vanilla' },
            piping: { tip: 'starDollopContinuousAlt', colorId: 'vanilla', secondaryColorId: 'red' },
          },
          top: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          middle: { piping: { tip: null, colorId: 'vanilla' } },
        },
        onChange: () => { },
        sugarColor: {},
        onSugarColorChange: () => { },
      })
    );

    expect(screen.getByText('Alternating Color (Color 2)')).toBeInTheDocument();
    expect(screen.getByText('Primary Color (Color 1)')).toBeInTheDocument();

    const altSection = screen.getByText('Alternating Color (Color 2)').closest('div.pt-3');
    const altWithin = within(altSection);

    // Page 1 of Color Override has Red, Black, Pink, White, Ivory, Blush
    expect(altWithin.getByTitle('Red')).toBeInTheDocument();
    expect(altWithin.getByTitle('Black')).toBeInTheDocument();
    expect(altWithin.getByTitle('Pink')).toBeInTheDocument();
    expect(altWithin.getByTitle('White')).toBeInTheDocument();
    expect(altWithin.getByTitle('Ivory (+₱50)')).toBeInTheDocument();
    expect(altWithin.getByTitle('Blush (+₱50)')).toBeInTheDocument();

    // Flavor mirror colors must NOT be in Alternating Color (Color 2)
    expect(altWithin.queryByTitle('Chocolate')).not.toBeInTheDocument();
    expect(altWithin.queryByTitle('Vanilla')).not.toBeInTheDocument();
    expect(altWithin.queryByTitle('Ube')).not.toBeInTheDocument();
    expect(altWithin.queryByTitle('Mocha')).not.toBeInTheDocument();
  });

  it('generates alternating border piping variations with dual-material groups and zero overhang', async () => {
    const { buildPipingRing } = await import('./pipingTips');
    const THREE = await import('three');

    const matA = new THREE.MeshBasicMaterial({ color: '#FFF' });
    const matB = new THREE.MeshBasicMaterial({ color: '#D6293E' });

    // 1. Shell Border Alternating (instanced dual meshes)
    const shellRingAlt = buildPipingRing('shellAlt', matA, {
      radius: 3.66,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(shellRingAlt).toBeDefined();
    expect(shellRingAlt.isGroup).toBe(true);
    expect(shellRingAlt.children.length).toBe(2);
    expect(shellRingAlt.children[0].material).toBe(matA);
    expect(shellRingAlt.children[1].material).toBe(matB);
    expect(shellRingAlt.children[0].count).toBe(shellRingAlt.children[1].count);

    // 2. Bead Piping Alternating (instanced dual meshes)
    const beadRingAlt = buildPipingRing('beadAlt', matA, {
      radius: 3.68,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(beadRingAlt).toBeDefined();
    expect(beadRingAlt.isGroup).toBe(true);
    expect(beadRingAlt.children.length).toBe(2);
    expect(beadRingAlt.children[0].material).toBe(matA);
    expect(beadRingAlt.children[1].material).toBe(matB);
    expect(beadRingAlt.children[0].count).toBe(beadRingAlt.children[1].count);

    // 3. Reverse Shell Alternating (merged dual meshes)
    const revShellRingAlt = buildPipingRing('reverseShellAlt', matA, {
      radius: 3.66,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(revShellRingAlt).toBeDefined();
    expect(revShellRingAlt.isGroup).toBe(true);
    expect(revShellRingAlt.children.length).toBe(2);
    expect(revShellRingAlt.children[0].material).toBe(matA);
    expect(revShellRingAlt.children[1].material).toBe(matB);

    // 4. Rope Twist Alternating (merged dual meshes)
    const ropeTwistRingAlt = buildPipingRing('ropeTwistAlt', matA, {
      radius: 3.66,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(ropeTwistRingAlt).toBeDefined();
    expect(ropeTwistRingAlt.isGroup).toBe(true);
    expect(ropeTwistRingAlt.children.length).toBe(2);
    expect(ropeTwistRingAlt.children[0].material).toBe(matA);
    expect(ropeTwistRingAlt.children[1].material).toBe(matB);

    // 5. Rope Twist Classic Alternating (merged dual meshes)
    const ropeClassicRingAlt = buildPipingRing('ropeTwistClassicAlt', matA, {
      radius: 3.66,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(ropeClassicRingAlt).toBeDefined();
    expect(ropeClassicRingAlt.isGroup).toBe(true);
    expect(ropeClassicRingAlt.children.length).toBe(2);
    expect(ropeClassicRingAlt.children[0].material).toBe(matA);
    expect(ropeClassicRingAlt.children[1].material).toBe(matB);
  });

  it('renders alternating color options when a border piping alternating tip is selected', () => {
    render(
      React.createElement(EdgeSection, {
        edge: {
          mode: 'both',
          both: {
            decorations: { setId: null, colorId: 'vanilla' },
            piping: { tip: 'shellAlt', colorId: 'vanilla', secondaryColorId: 'navy' },
          },
          top: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          middle: { piping: { tip: null, colorId: 'vanilla' } },
        },
        onChange: () => { },
        sugarColor: {},
        onSugarColorChange: () => { },
      })
    );

    expect(screen.getByText('Alternating Color (Color 2)')).toBeInTheDocument();
    expect(screen.getByText('Primary Color (Color 1)')).toBeInTheDocument();
  });

  it('hides flavor color while color override is active and resolves the override in the adapter', async () => {
    const { default: SugarColorSection } = await import('./sections/SugarColorSection');
    const { adaptConfigToLegacy } = await import('@/lib/configAdapter');

    // 1. Render SugarColorSection in colorOverride mode with flavorColorId='chocolate' and overrideColorId='red'
    render(
      React.createElement(SugarColorSection, {
        sugarColor: {
          mode: 'colorOverride',
          flavorColorId: 'chocolate',
          overrideColorId: 'red',
          colorId: 'red',
        },
        onChange: () => { },
        showDefaultColorPicker: true,
      })
    );

    // Flavor Color belongs to Default mode and is hidden during Color Override.
    expect(screen.queryByText('Flavor Color')).not.toBeInTheDocument();
    expect(screen.getAllByText('Color Override').length).toBeGreaterThanOrEqual(1);

    // The saved flavor remains in state but its picker is not rendered.
    expect(screen.queryByTitle('Chocolate')).not.toBeInTheDocument();

    // Red in Color Override must be selected (has bg-primary class)
    const redBtn = screen.getByTitle('Red');
    expect(redBtn.className).toContain('bg-primary');

    expect(screen.queryByTitle('Vanilla')).not.toBeInTheDocument();

    // 2. Verify adaptConfigToLegacy applies the color override when mode='colorOverride'
    const legacyOverride = adaptConfigToLegacy({
      structure: { layers: 1, size: 'big' },
      edge: {
        mode: 'both',
        both: { piping: { tip: 'shell', colorId: 'vanilla' } },
      },
      sugarColorOverrides: {
        edgeBoth: {
          mode: 'colorOverride',
          flavorColorId: 'chocolate',
          overrideColorId: 'red',
          colorId: 'red',
        },
        exterior: {
          mode: 'colorOverride',
          overrideColorId: 'pink',
          colorId: 'pink',
        },
      },
      exteriorFinish: { flavor: 'chocolate', style: 'fullyFrosted' },
    });

    // Piping color must be Red hex (#D6293E), not Chocolate!
    expect(legacyOverride.edgeBoth.pipingColor).toBe('#D6293E');
    // Surface frosting color must be Pink hex (#F5A9C0)
    expect(legacyOverride.surfaceFrostingColorHex).toBe('#F5A9C0');
    // But chosen frosting flavor remains chocolate!
    expect(legacyOverride.frostingColor).toBe('chocolate');

    // 3. Verify adaptConfigToLegacy applies the flavor color when mode='default'
    const legacyDefault = adaptConfigToLegacy({
      structure: { layers: 1, size: 'big' },
      edge: {
        mode: 'both',
        both: { piping: { tip: 'shell', colorId: 'vanilla' } },
      },
      sugarColorOverrides: {
        edgeBoth: {
          mode: 'default',
          flavorColorId: 'chocolate',
          overrideColorId: 'red',
          colorId: 'chocolate',
        },
        exterior: {
          mode: 'default',
        },
      },
      exteriorFinish: { flavor: 'chocolate', style: 'fullyFrosted' },
    });

    // When default, piping color uses the chosen flavor color (Chocolate #7A4433)
    expect(legacyDefault.edgeBoth.pipingColor).toBe('#7A4433');
    // Exterior frosting has no override (null), letting exteriorFinish.flavor determine appearance
    expect(legacyDefault.surfaceFrostingColorHex).toBeNull();
    expect(legacyDefault.frostingColor).toBe('chocolate');
  });

  it('generates cherry dollop variations with correct cherry counts, heights, and zero overhang', async () => {
    const { buildPipingRing } = await import('./pipingTips');
    const THREE = await import('three');

    // Verify radial calculation maintains zero overhang for all cherry variations
    expect(computeEdgeTrimRadius(4.0, 'starDollopContinuousCherry', 'fullyFrosted')).toBeCloseTo(3.40, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollopCherry', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollopSparseCherry', 'fullyFrosted')).toBeCloseTo(3.24, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopCherry', 'fullyFrosted')).toBeCloseTo(3.48, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopMediumCherry', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopSparseCherry', 'fullyFrosted')).toBeCloseTo(3.24, 2);
    expect(computeEdgeTrimRadius(4.0, 'kissDollopCherry', 'fullyFrosted')).toBeCloseTo(3.48, 2);
    expect(computeEdgeTrimRadius(4.0, 'kissDollopMediumCherry', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'kissDollopSparseCherry', 'fullyFrosted')).toBeCloseTo(3.24, 2);

    expect(computeEdgeTrimRadius(4.0, 'starDollopContinuousAltCherry', 'fullyFrosted')).toBeCloseTo(3.40, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollopAltCherry', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollopSparseAltCherry', 'fullyFrosted')).toBeCloseTo(3.24, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopAltCherry', 'fullyFrosted')).toBeCloseTo(3.48, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopMediumAltCherry', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopSparseAltCherry', 'fullyFrosted')).toBeCloseTo(3.24, 2);

    const matA = new THREE.MeshBasicMaterial({ color: '#FFF' });
    const matB = new THREE.MeshBasicMaterial({ color: '#D6293E' });

    // 1. Continuous Star Dollop with Cherry (20 dollops + 10 cherries, alternating)
    const starCherry20 = buildPipingRing('starDollopContinuousCherry', matA, { radius: 3.40, y: 1.0, scale: 3 });
    expect(starCherry20).toBeDefined();
    expect(starCherry20.isGroup).toBe(true);
    // child 0: dollop instanced mesh (20 pc), children 1..10: 10 cherries
    expect(starCherry20.children[0].isInstancedMesh).toBe(true);
    expect(starCherry20.children[0].count).toBe(20);
    const cherries20 = starCherry20.children.slice(1);
    expect(cherries20.length).toBe(10);
    cherries20.forEach((c) => {
      expect(c.isGroup).toBe(true);
      expect(c.position.y).toBeGreaterThan(1.0); // Seated on top of dollop peak
    });

    // 2. Star Dollop with Cherry (12 dollops + 12 cherries)
    const starCherry12 = buildPipingRing('starDollopCherry', matA, { radius: 3.30, y: 1.0, scale: 3 });
    expect(starCherry12.children[0].count).toBe(12);
    expect(starCherry12.children.slice(1).length).toBe(12);

    // 3. Sparse Star Dollop with Cherry (8 dollops + 8 cherries)
    const starCherry8 = buildPipingRing('starDollopSparseCherry', matA, { radius: 3.24, y: 1.0, scale: 3 });
    expect(starCherry8.children[0].count).toBe(8);
    expect(starCherry8.children.slice(1).length).toBe(8);

    // 4. Alternating Continuous Star Dollop with Cherry (10+10 dual material + 10 cherries)
    const starCherry20Alt = buildPipingRing('starDollopContinuousAltCherry', matA, {
      radius: 3.40,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(starCherry20Alt.isGroup).toBe(true);
    const altDollopGroup = starCherry20Alt.children[0];
    expect(altDollopGroup.isGroup).toBe(true);
    expect(altDollopGroup.children.length).toBe(2);
    expect(altDollopGroup.children[0].count).toBe(10);
    expect(altDollopGroup.children[1].count).toBe(10);
    expect(starCherry20Alt.children.slice(1).length).toBe(10);

    // 5. Alternating Round Tip Dollop with Cherry (6+6 dual material + 12 cherries)
    const roundCherry12Alt = buildPipingRing('roundDollopMediumAltCherry', matA, {
      radius: 3.30,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(roundCherry12Alt.children[0].children[0].count).toBe(6);
    expect(roundCherry12Alt.children[0].children[1].count).toBe(6);
    expect(roundCherry12Alt.children.slice(1).length).toBe(12);

    // 6. Continuous Round Tip Dollop with Cherry (20 dollops + 10 cherries, alternating)
    const roundCherry20 = buildPipingRing('roundDollopCherry', matA, { radius: 3.48, y: 1.0, scale: 3 });
    expect(roundCherry20.children[0].count).toBe(20);
    expect(roundCherry20.children.slice(1).length).toBe(10);

    // 7-9. Kiss-shaped Dollops with Cherry (20/12/8 dollops)
    const kissCherry20 = buildPipingRing('kissDollopCherry', matA, { radius: 3.48, y: 1.0, scale: 3 });
    expect(kissCherry20.children[0].count).toBe(20);
    expect(kissCherry20.children.slice(1).length).toBe(10);

    const kissCherry12 = buildPipingRing('kissDollopMediumCherry', matA, { radius: 3.30, y: 1.0, scale: 3 });
    expect(kissCherry12.children[0].count).toBe(12);
    expect(kissCherry12.children.slice(1).length).toBe(12);

    const kissCherry8 = buildPipingRing('kissDollopSparseCherry', matA, { radius: 3.24, y: 1.0, scale: 3 });
    expect(kissCherry8.children[0].count).toBe(8);
    expect(kissCherry8.children.slice(1).length).toBe(8);
  });

  it('groups dollops by shape with solid options 1-3 and cherry options 4-6', () => {
    render(
      React.createElement(EdgeSection, {
        edge: {
          mode: 'both',
          both: {
            decorations: { setId: null, colorId: 'vanilla' },
            piping: { tip: 'starDollopContinuousCherry', colorId: 'vanilla', secondaryColorId: 'red' },
          },
          top: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          middle: { piping: { tip: null, colorId: 'vanilla' } },
        },
        onChange: () => { },
        sugarColor: {},
        onSugarColorChange: () => { },
      })
    );

    const expectedTitlesBySection = {
      'Star Dollop': [
        'Continuous Star Dollop (20 pc)',
        'Star Dollop (12 pc)',
        'Sparse Star Dollop (8 pc)',
        'Continuous Star Dollop (20 pc) with Cherry',
        'Star Dollop (12 pc) with Cherry',
        'Sparse Star Dollop (8 pc) with Cherry',
      ],
      'Round Tip Dollop': [
        'Continuous Round Tip Dollop (20 pc)',
        'Round Tip Dollop (12 pc)',
        'Sparse Round Tip Dollop (8 pc)',
        'Continuous Round Tip Dollop (20 pc) with Cherry',
        'Round Tip Dollop (12 pc) with Cherry',
        'Sparse Round Tip Dollop (8 pc) with Cherry',
      ],
      'Kiss-shaped Dollop': [
        'Continuous Kisses Dollop (20 pc)',
        'Kisses Dollop (12 pc)',
        'Sparse Kisses Dollop (8 pc)',
        'Continuous Kisses Dollop (20 pc) with Cherry',
        'Kisses Dollop (12 pc) with Cherry',
        'Sparse Kisses Dollop (8 pc) with Cherry',
      ],
    };

    Object.entries(expectedTitlesBySection).forEach(([sectionTitle, expectedTitles]) => {
      const section = within(screen.getByText(sectionTitle).closest('div'));
      const solidRow = within(section.getByText('Solid').closest('div'));
      expect(solidRow.getAllByRole('button').map((button) => button.title)).toEqual(expectedTitles);
      expect(solidRow.getAllByRole('button').map((button) => button.textContent.trim())).toEqual([
        '1', '2', '3', '4🍒', '5🍒', '6🍒',
      ]);
    });
  });

  it('generates cherry whipped cream rosette variations with correct counts, nested cherries, and zero overhang', async () => {
    const { buildPipingRing } = await import('./pipingTips');
    const THREE = await import('three');
    const mat = new THREE.MeshBasicMaterial({ color: '#FFF' });

    // 1. Continuous with Cherry (~20 rosettes + 10 alternating cherries)
    const ring20Cherry = buildPipingRing('whippedCreamRosetteContinuousCherry', mat, { radius: 3.34, y: 1.0, scale: 3 });
    expect(ring20Cherry).toBeDefined();
    expect(ring20Cherry.isGroup).toBe(true);
    expect(ring20Cherry.children[0].isInstancedMesh).toBe(true);
    const count20 = ring20Cherry.children[0].count;
    expect(count20).toBeGreaterThanOrEqual(18);
    expect(count20).toBeLessThanOrEqual(22);
    expect(count20 % 2).toBe(0);
    const cherries20 = ring20Cherry.children.slice(1);
    expect(cherries20.length).toBe(count20 / 2);
    cherries20.forEach((c) => {
      expect(c.isGroup).toBe(true);
      expect(c.position.y).toBeGreaterThan(1.0); // Seated on top of rosette peak
    });

    // 2. Standard with Cherry (12 rosettes + 12 cherries)
    const ring12Cherry = buildPipingRing('whippedCreamRosetteCherry', mat, { radius: 3.24, y: 1.0, scale: 3 });
    expect(ring12Cherry).toBeDefined();
    expect(ring12Cherry.isGroup).toBe(true);
    expect(ring12Cherry.children[0].isInstancedMesh).toBe(true);
    expect(ring12Cherry.children[0].count).toBe(12);
    expect(ring12Cherry.children.slice(1).length).toBe(12);

    // 3. Sparse with Cherry (8 rosettes + 8 cherries)
    const ring8Cherry = buildPipingRing('whippedCreamRosetteSparseCherry', mat, { radius: 3.12, y: 1.0, scale: 3 });
    expect(ring8Cherry).toBeDefined();
    expect(ring8Cherry.isGroup).toBe(true);
    expect(ring8Cherry.children[0].isInstancedMesh).toBe(true);
    expect(ring8Cherry.children[0].count).toBe(8);
    expect(ring8Cherry.children.slice(1).length).toBe(8);
  });

  it('merges solid and cherry whipped cream designs into one six-option row', () => {
    render(
      React.createElement(EdgeSection, {
        edge: {
          mode: 'both',
          both: {
            decorations: { setId: null, colorId: 'vanilla' },
            piping: { tip: 'whippedCreamRosetteContinuousCherry', colorId: 'vanilla', secondaryColorId: 'red' },
          },
          top: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          middle: { piping: { tip: null, colorId: 'vanilla' } },
        },
        onChange: () => { },
        sugarColor: {},
        onSugarColorChange: () => { },
      })
    );

    const wcHeader = screen.getByText('Whipped Cream');
    const wcContainer = wcHeader.closest('div');
    const wcWithin = within(wcContainer);

    expect(screen.queryByText('Whipped Cream 🍦')).not.toBeInTheDocument();
    expect(wcWithin.queryByText('Solid')).not.toBeInTheDocument();
    expect(wcWithin.queryByText('Solid with Cherries 🍒')).not.toBeInTheDocument();
    [
      'Whipped Cream Rosettes (Continuous ~20 pc)',
      'Whipped Cream Rosettes (12 pc)',
      'Sparse Whipped Cream Rosettes (8 pc)',
      'Whipped Cream Rosettes with Cherry (Continuous ~20 pc)',
      'Whipped Cream Rosettes with Cherry (12 pc)',
      'Sparse Whipped Cream Rosettes with Cherry (8 pc)',
    ].forEach((title, index) => {
      const button = wcWithin.getByTitle(title);
      expect(button).toHaveTextContent(String(index + 1));
      expect(button).toHaveClass('w-9', 'h-9', 'rounded-full');
      expect(button).not.toHaveTextContent('🍒');
    });
  });

  it('generates fruit & confection rims with zero overhang and valid 3D groups', async () => {
    const {
      buildStrawberryRimRing,
      buildHersheysKissRimRing,
      buildFerreroRocherRimRing,
      buildOreoRimRing,
      buildBasketballRimRing,
      buildSoccerBallRimRing,
    } = await import('./DecorationSets');
    const { getSharedStrawberryBodyGeometry } = await import('./toppings/strawberry');

    // 1. Placement verification for Strawberry Rim
    expect(computeEdgeTrimY(1.0, 4.0, 'strawberryRim', 'fullyFrosted', false)).toBeCloseTo(0.96, 2);
    expect(computeEdgeTrimY(0.0, 4.0, 'strawberryRim', 'fullyFrosted', true)).toBeCloseTo(0.0, 2);
    expect(computeEdgeTrimRadius(4.0, 'strawberryRim', 'fullyFrosted', false)).toBeCloseTo(3.64, 2);
    expect(computeEdgeTrimRadius(4.0, 'strawberryRim', 'fullyFrosted', true)).toBeCloseTo(4.37, 2);

    // 2. Placement verification for Hershey's Kisses Rim
    expect(computeEdgeTrimY(1.0, 4.0, 'hersheysKissRim', 'fullyFrosted', false)).toBeCloseTo(1.0, 2);
    expect(computeEdgeTrimY(0.0, 4.0, 'hersheysKissRim', 'fullyFrosted', true)).toBeCloseTo(0.0, 2);
    expect(computeEdgeTrimRadius(4.0, 'hersheysKissRim', 'fullyFrosted', false)).toBeCloseTo(3.58, 2);
    expect(computeEdgeTrimRadius(4.0, 'hersheysKissRim', 'fullyFrosted', true)).toBeCloseTo(4.47, 2);

    // 3. Placement verification for Ferrero Rocher Rim
    expect(computeEdgeTrimY(1.0, 4.0, 'ferreroRocherRim', 'fullyFrosted', false)).toBeCloseTo(1.0, 2);
    expect(computeEdgeTrimY(0.0, 4.0, 'ferreroRocherRim', 'fullyFrosted', true)).toBeCloseTo(0.0, 2);
    expect(computeEdgeTrimRadius(4.0, 'ferreroRocherRim', 'fullyFrosted', false)).toBeCloseTo(3.41, 2);
    expect(computeEdgeTrimRadius(4.0, 'ferreroRocherRim', 'fullyFrosted', true)).toBeCloseTo(4.67, 2);

    // 4. Placement verification for Oreo rim
    expect(computeEdgeTrimY(1.0, 4.0, 'oreoRim', 'fullyFrosted', false)).toBeCloseTo(1.0, 2);
    expect(computeEdgeTrimY(0.0, 4.0, 'oreoRim', 'fullyFrosted', true)).toBeCloseTo(0.0, 2);
    expect(computeEdgeTrimRadius(4.0, 'oreoRim', 'fullyFrosted', false)).toBeCloseTo(3.84, 2);
    expect(computeEdgeTrimRadius(4.0, 'oreoRim', 'fullyFrosted', true)).toBeCloseTo(4.26, 2);

    // 5. Placement verification for Basketball and Soccer Ball rims
    for (const rimId of ['basketballRim', 'soccerBallRim']) {
      expect(computeEdgeTrimY(1.0, 4.0, rimId, 'fullyFrosted', false)).toBeCloseTo(1.0, 2);
      expect(computeEdgeTrimY(0.0, 4.0, rimId, 'fullyFrosted', true)).toBeCloseTo(0.0, 2);
      expect(computeEdgeTrimRadius(4.0, rimId, 'fullyFrosted', false)).toBeCloseTo(3.56, 2);
      expect(computeEdgeTrimRadius(4.0, rimId, 'fullyFrosted', true)).toBeCloseTo(4.56, 2);
    }

    // 6. Geometry verification: Strawberry rim ring
    const strawberryRing = buildStrawberryRimRing(3.64, 0.96);
    expect(strawberryRing).toBeDefined();
    expect(strawberryRing.isGroup).toBe(true);
    expect(strawberryRing.children.length).toBeGreaterThanOrEqual(10);
    strawberryRing.children.forEach((berry) => {
      expect(berry.isGroup).toBe(true);
      const bodyMeshes = berry.children.filter((child) => child.isMesh);
      expect(bodyMeshes).toHaveLength(1);
      expect(bodyMeshes[0].geometry).toBe(getSharedStrawberryBodyGeometry());
      expect(berry.children.some((child) => child.isGroup)).toBe(true);
    });

    // 7. Geometry verification: Hershey's Kiss rim ring
    const kissRing = buildHersheysKissRimRing(3.58, 1.0);
    expect(kissRing).toBeDefined();
    expect(kissRing.isGroup).toBe(true);
    expect(kissRing.children.length).toBeGreaterThanOrEqual(12);
    kissRing.children.forEach((kiss) => {
      expect(kiss.isMesh).toBe(true);
    });

    // 8. Geometry verification: Ferrero Rocher rim ring
    const ferreroRing = buildFerreroRocherRimRing(3.41, 1.0);
    expect(ferreroRing).toBeDefined();
    expect(ferreroRing.isGroup).toBe(true);
    expect(ferreroRing.children.length).toBeGreaterThanOrEqual(8);
    ferreroRing.children.forEach((truffle) => {
      expect(truffle.isMesh).toBe(true);
    });

    // 9. Geometry verification: Oreo and ball rim rings
    const canvasContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'round',
      lineJoin: 'round',
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
      getImageData: vi.fn((_x, _y, width, height) => ({
        data: new Uint8ClampedArray(width * height * 4),
      })),
      createImageData: vi.fn((width, height) => ({
        data: new Uint8ClampedArray(width * height * 4),
      })),
      putImageData: vi.fn(),
    };
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(canvasContext);
    const oreoRing = buildOreoRimRing(3.84, 1.0, () => 0.5);
    const basketballRing = buildBasketballRimRing(3.56, 1.0, () => 0.5);
    const soccerBallRing = buildSoccerBallRimRing(3.56, 1.0, () => 0.5);
    getContextSpy.mockRestore();
    expect(oreoRing).toBeDefined();
    expect(oreoRing.isGroup).toBe(true);
    expect(oreoRing.children.length).toBeGreaterThanOrEqual(10);
    oreoRing.children.forEach((cookie) => {
      expect(cookie.isGroup).toBe(true);
      expect(cookie.children).toHaveLength(3);
      expect(cookie.children.every((part) => part.isMesh)).toBe(true);
    });
    expect(basketballRing.isGroup).toBe(true);
    expect(basketballRing.children.length).toBeGreaterThanOrEqual(10);
    basketballRing.children.forEach((ball) => {
      expect(ball.isGroup).toBe(true);
      expect(ball.children).toHaveLength(1);
      expect(ball.children[0].isMesh).toBe(true);
    });
    expect(soccerBallRing.isGroup).toBe(true);
    expect(soccerBallRing.children.length).toBeGreaterThanOrEqual(10);
    soccerBallRing.children.forEach((ball) => {
      expect(ball.isGroup).toBe(true);
      expect(ball.children).toHaveLength(1);
      expect(ball.children[0].isGroup).toBe(true);
    });
  });

  it('renders Fruit & Confections Rim section and buttons in EdgeSection', () => {
    render(
      React.createElement(EdgeSection, {
        edge: {
          mode: 'both',
          both: {
            decorations: { setId: null, colorId: 'vanilla' },
            piping: { tip: 'strawberryRim', colorId: 'vanilla' },
          },
          top: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          middle: { piping: { tip: null, colorId: 'vanilla' } },
        },
        onChange: () => { },
        sugarColor: {},
        onSugarColorChange: () => { },
      })
    );

    expect(screen.getByText('Fruit & Confections Rim')).toBeInTheDocument();
    expect(screen.getByText('Designs')).toBeInTheDocument();
    [
      'Fresh Strawberries Rim 🍓',
      "Hershey's Kisses Rim 🍫",
      'Ferrero Rocher Rim 🌰',
      'Oreo Rim 🍪',
      'Basketball Rim 🏀',
      'Soccer Ball Rim ⚽',
    ].forEach((title, index) => {
      const button = screen.getByTitle(title);
      expect(button).toHaveTextContent(String(index + 1));
      expect(button).toHaveClass('w-9', 'h-9', 'rounded-full');
    });
  });

  it('generates strawberry dollop variations with correct strawberry counts, heights, and zero overhang', async () => {
    const { buildPipingRing } = await import('./pipingTips');
    const THREE = await import('three');

    // Verify radial calculation maintains zero overhang for all strawberry variations
    expect(computeEdgeTrimRadius(4.0, 'starDollopContinuousStrawberry', 'fullyFrosted')).toBeCloseTo(3.40, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollopStrawberry', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollopSparseStrawberry', 'fullyFrosted')).toBeCloseTo(3.24, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopStrawberry', 'fullyFrosted')).toBeCloseTo(3.48, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopMediumStrawberry', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopSparseStrawberry', 'fullyFrosted')).toBeCloseTo(3.24, 2);

    expect(computeEdgeTrimRadius(4.0, 'starDollopContinuousAltStrawberry', 'fullyFrosted')).toBeCloseTo(3.40, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollopAltStrawberry', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'starDollopSparseAltStrawberry', 'fullyFrosted')).toBeCloseTo(3.24, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopAltStrawberry', 'fullyFrosted')).toBeCloseTo(3.48, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopMediumAltStrawberry', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'roundDollopSparseAltStrawberry', 'fullyFrosted')).toBeCloseTo(3.24, 2);

    const matA = new THREE.MeshBasicMaterial({ color: '#FFF' });
    const matB = new THREE.MeshBasicMaterial({ color: '#D6293E' });

    // 1. Continuous Star Dollop with Strawberry (20 dollops + 10 strawberries, alternating)
    const starStraw20 = buildPipingRing('starDollopContinuousStrawberry', matA, { radius: 3.40, y: 1.0, scale: 3 });
    expect(starStraw20).toBeDefined();
    expect(starStraw20.isGroup).toBe(true);
    expect(starStraw20.children[0].isInstancedMesh).toBe(true);
    expect(starStraw20.children[0].count).toBe(20);
    const straw20 = starStraw20.children.slice(1);
    expect(straw20.length).toBe(10);
    straw20.forEach((s) => {
      expect(s.isGroup).toBe(true);
      expect(s.position.y).toBeGreaterThan(1.0); // Seated on top of dollop peak
    });

    // 2. Star Dollop with Strawberry (12 dollops + 12 strawberries)
    const starStraw12 = buildPipingRing('starDollopStrawberry', matA, { radius: 3.30, y: 1.0, scale: 3 });
    expect(starStraw12.children[0].count).toBe(12);
    expect(starStraw12.children.slice(1).length).toBe(12);

    // 3. Sparse Star Dollop with Strawberry (8 dollops + 8 strawberries)
    const starStraw8 = buildPipingRing('starDollopSparseStrawberry', matA, { radius: 3.24, y: 1.0, scale: 3 });
    expect(starStraw8.children[0].count).toBe(8);
    expect(starStraw8.children.slice(1).length).toBe(8);

    // 4. Alternating Continuous Star Dollop with Strawberry (10+10 dual material + 10 strawberries)
    const starStraw20Alt = buildPipingRing('starDollopContinuousAltStrawberry', matA, {
      radius: 3.40,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(starStraw20Alt.isGroup).toBe(true);
    const altDollopGroup = starStraw20Alt.children[0];
    expect(altDollopGroup.isGroup).toBe(true);
    expect(altDollopGroup.children.length).toBe(2);
    expect(altDollopGroup.children[0].count).toBe(10);
    expect(altDollopGroup.children[1].count).toBe(10);
    expect(starStraw20Alt.children.slice(1).length).toBe(10);

    // 5. Alternating Round Tip Dollop with Strawberry (6+6 dual material + 12 strawberries)
    const roundStraw12Alt = buildPipingRing('roundDollopMediumAltStrawberry', matA, {
      radius: 3.30,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(roundStraw12Alt.children[0].children[0].count).toBe(6);
    expect(roundStraw12Alt.children[0].children[1].count).toBe(6);
    expect(roundStraw12Alt.children.slice(1).length).toBe(12);

    // 6. Continuous Round Tip Dollop with Strawberry (20 dollops + 10 strawberries, alternating)
    const roundStraw20 = buildPipingRing('roundDollopStrawberry', matA, { radius: 3.48, y: 1.0, scale: 3 });
    expect(roundStraw20.children[0].count).toBe(20);
    expect(roundStraw20.children.slice(1).length).toBe(10);
  });

  it('shows only the six solid and cherry controls in every dollop shape section', () => {
    render(
      React.createElement(EdgeSection, {
        edge: {
          mode: 'both',
          both: {
            decorations: { setId: null, colorId: 'vanilla' },
            piping: { tip: 'starDollopContinuousStrawberry', colorId: 'vanilla', secondaryColorId: 'red' },
          },
          top: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          middle: { piping: { tip: null, colorId: 'vanilla' } },
        },
        onChange: () => { },
        sugarColor: {},
        onSugarColorChange: () => { },
      })
    );

    ['Star Dollop', 'Round Tip Dollop', 'Kiss-shaped Dollop'].forEach((sectionTitle) => {
      const section = within(screen.getByText(sectionTitle).closest('div'));
      expect(section.getByText('Solid')).toBeInTheDocument();
      expect(section.getAllByRole('button')).toHaveLength(6);
      expect(section.queryByText('Solid with Strawberries 🍓')).not.toBeInTheDocument();
      expect(section.queryByText('Alternating (2 Colors)')).not.toBeInTheDocument();
      expect(section.queryByText('Alternating with Cherries 🍒')).not.toBeInTheDocument();
      expect(section.queryByText('Alternating with Strawberries 🍓')).not.toBeInTheDocument();
    });
  });

  it('generates strawberry whipped cream rosette variations with correct counts, nested strawberries, and zero overhang', async () => {
    const { buildPipingRing } = await import('./pipingTips');
    const THREE = await import('three');
    const mat = new THREE.MeshBasicMaterial({ color: '#FFF' });

    // Radial placement
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteContinuousStrawberry', 'fullyFrosted')).toBeCloseTo(3.34, 2);
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteStrawberry', 'fullyFrosted')).toBeCloseTo(3.24, 2);
    expect(computeEdgeTrimRadius(4.0, 'whippedCreamRosetteSparseStrawberry', 'fullyFrosted')).toBeCloseTo(3.12, 2);

    // 1. Continuous with Strawberry (~20 rosettes + 10 alternating strawberries)
    const ring20Straw = buildPipingRing('whippedCreamRosetteContinuousStrawberry', mat, { radius: 3.34, y: 1.0, scale: 3 });
    expect(ring20Straw).toBeDefined();
    expect(ring20Straw.isGroup).toBe(true);
    expect(ring20Straw.children[0].isInstancedMesh).toBe(true);
    const count20 = ring20Straw.children[0].count;
    expect(count20).toBeGreaterThanOrEqual(18);
    expect(count20).toBeLessThanOrEqual(22);
    expect(count20 % 2).toBe(0);
    const straw20 = ring20Straw.children.slice(1);
    expect(straw20.length).toBe(count20 / 2);
    straw20.forEach((s) => {
      expect(s.isGroup).toBe(true);
      expect(s.position.y).toBeGreaterThan(1.0); // Seated on top of rosette peak
    });

    // 2. Standard with Strawberry (12 rosettes + 12 strawberries)
    const ring12Straw = buildPipingRing('whippedCreamRosetteStrawberry', mat, { radius: 3.24, y: 1.0, scale: 3 });
    expect(ring12Straw).toBeDefined();
    expect(ring12Straw.isGroup).toBe(true);
    expect(ring12Straw.children[0].isInstancedMesh).toBe(true);
    expect(ring12Straw.children[0].count).toBe(12);
    expect(ring12Straw.children.slice(1).length).toBe(12);

    // 3. Sparse with Strawberry (8 rosettes + 8 strawberries)
    const ring8Straw = buildPipingRing('whippedCreamRosetteSparseStrawberry', mat, { radius: 3.12, y: 1.0, scale: 3 });
    expect(ring8Straw).toBeDefined();
    expect(ring8Straw.isGroup).toBe(true);
    expect(ring8Straw.children[0].isInstancedMesh).toBe(true);
    expect(ring8Straw.children[0].count).toBe(8);
    expect(ring8Straw.children.slice(1).length).toBe(8);
  });

  it('does not expose strawberry options in the Whipped Cream section', () => {
    render(
      React.createElement(EdgeSection, {
        edge: {
          mode: 'both',
          both: {
            decorations: { setId: null, colorId: 'vanilla' },
            piping: { tip: 'whippedCreamRosetteContinuousStrawberry', colorId: 'vanilla', secondaryColorId: 'red' },
          },
          top: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          middle: { piping: { tip: null, colorId: 'vanilla' } },
        },
        onChange: () => { },
        sugarColor: {},
        onSugarColorChange: () => { },
      })
    );

    const wcHeader = screen.getByText('Whipped Cream');
    const wcContainer = wcHeader.closest('div');
    const wcWithin = within(wcContainer);

    expect(wcWithin.queryByText('Solid')).not.toBeInTheDocument();
    expect(wcWithin.queryByText('Solid with Cherries 🍒')).not.toBeInTheDocument();
    expect(wcWithin.queryByText('Solid with Strawberries 🍓')).not.toBeInTheDocument();
    expect(wcWithin.queryByTitle('Whipped Cream Rosettes with Strawberry (Continuous ~20 pc)')).not.toBeInTheDocument();
    expect(wcWithin.queryByTitle('Whipped Cream Rosettes with Strawberry (12 pc)')).not.toBeInTheDocument();
    expect(wcWithin.queryByTitle('Sparse Whipped Cream Rosettes with Strawberry (8 pc)')).not.toBeInTheDocument();
  });
});



