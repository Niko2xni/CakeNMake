import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
    expect(computeEdgeTrimRadius(4.0, 'dollops', 'fullyFrosted', true)).toBeCloseTo(4.12, 2);
    expect(computeEdgeTrimRadius(4.0, 'shell', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'shell', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'reverseShell', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'reverseShell', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'bead', 'fullyFrosted')).toBeCloseTo(3.68, 2);
    expect(computeEdgeTrimRadius(4.0, 'bead', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'zigzag', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'zigzag', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'wavePiping', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'wavePiping', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwist', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwist', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistClassic', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistClassic', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
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
    expect(screen.getByText('Shell Border')).toBeInTheDocument();
    expect(screen.getByTitle('Shell Border')).toBeInTheDocument();
    expect(screen.getByTitle('Reverse Shell')).toBeInTheDocument();
    expect(screen.getByText('Bead Piping')).toBeInTheDocument();
    expect(screen.getByTitle('Bead Piping')).toBeInTheDocument();
    expect(screen.queryByText('Zigzag Piping')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Zigzag Piping')).not.toBeInTheDocument();
    expect(screen.queryByText('Wave Piping')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Wave Piping')).not.toBeInTheDocument();
    expect(screen.queryByText('Scallops')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Star Scallop')).not.toBeInTheDocument();
    expect(screen.getByText('Rope')).toBeInTheDocument();
    expect(screen.getByText('Rope Twist')).toBeInTheDocument();
    expect(screen.getByTitle('Rope Twist')).toBeInTheDocument();
    expect(screen.getByTitle('Rope Twist (Classic)')).toBeInTheDocument();
    expect(screen.getByText('Petal')).toBeInTheDocument();
    expect(screen.getByText('Drop Flower')).toBeInTheDocument();
    expect(screen.getByText('Bracelet Beads')).toBeInTheDocument();
    expect(screen.getByTitle('Beaded Trim')).toBeInTheDocument();
    expect(screen.getByTitle('Trio Beaded Trim')).toBeInTheDocument();
    expect(screen.getByTitle('Petite Beaded Trim')).toBeInTheDocument();
    expect(screen.getByText('Dollops')).toBeInTheDocument();
    expect(screen.getByTitle('Continuous Star Dollop (20 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Star Dollop (12 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Sparse Star Dollop (8 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Continuous Round Tip Dollop (20 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Round Tip Dollop (12 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Sparse Round Tip Dollop (8 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Continuous Kisses Dollop (20 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Kisses Dollop (12 pc)')).toBeInTheDocument();
    expect(screen.getByTitle('Sparse Kisses Dollop (8 pc)')).toBeInTheDocument();
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
    expect(baseHeight).toBeCloseTo(0.50, 2);

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
});


