import React from 'react';
import { render, screen, within } from '@testing-library/react';
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
    expect(computeEdgeTrimRadius(4.0, 'shellAlt', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'shellAlt', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'reverseShell', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'reverseShell', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'reverseShellAlt', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'reverseShellAlt', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'bead', 'fullyFrosted')).toBeCloseTo(3.68, 2);
    expect(computeEdgeTrimRadius(4.0, 'bead', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'beadAlt', 'fullyFrosted')).toBeCloseTo(3.68, 2);
    expect(computeEdgeTrimRadius(4.0, 'beadAlt', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'zigzag', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'zigzag', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'wavePiping', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'wavePiping', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwist', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwist', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistAlt', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistAlt', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistClassic', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistClassic', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistClassicAlt', 'fullyFrosted')).toBeCloseTo(3.66, 2);
    expect(computeEdgeTrimRadius(4.0, 'ropeTwistClassicAlt', 'fullyFrosted', true)).toBeCloseTo(4.10, 2);
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
    expect(screen.getByTitle('Shell Border - Alternating')).toBeInTheDocument();
    expect(screen.getByTitle('Reverse Shell - Alternating')).toBeInTheDocument();
    expect(screen.getByTitle('Bead Piping - Alternating')).toBeInTheDocument();
    expect(screen.getByTitle('Rope Twist - Alternating')).toBeInTheDocument();
    expect(screen.getByTitle('Rope Twist (Classic) - Alternating')).toBeInTheDocument();
    expect(screen.queryByText('Zigzag Piping')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Zigzag Piping')).not.toBeInTheDocument();
    expect(screen.queryByText('Wave Piping')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Wave Piping')).not.toBeInTheDocument();
    expect(screen.queryByText('Scallops')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Star Scallop')).not.toBeInTheDocument();
    expect(screen.getByText('Rope')).toBeInTheDocument();
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
    expect(screen.getByTitle('Continuous Star Dollop (20 pc) - Alternating')).toBeInTheDocument();
    expect(screen.getByTitle('Star Dollop (12 pc) - Alternating')).toBeInTheDocument();
    expect(screen.getByTitle('Sparse Star Dollop (8 pc) - Alternating')).toBeInTheDocument();
    expect(screen.getByTitle('Continuous Round Tip Dollop (20 pc) - Alternating')).toBeInTheDocument();
    expect(screen.getByTitle('Round Tip Dollop (12 pc) - Alternating')).toBeInTheDocument();
    expect(screen.getByTitle('Sparse Round Tip Dollop (8 pc) - Alternating')).toBeInTheDocument();
    expect(screen.getByTitle('Continuous Kisses Dollop (20 pc) - Alternating')).toBeInTheDocument();
    expect(screen.getByTitle('Kisses Dollop (12 pc) - Alternating')).toBeInTheDocument();
    expect(screen.getByTitle('Sparse Kisses Dollop (8 pc) - Alternating')).toBeInTheDocument();
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

  it('keeps flavor color selected when color override is active and resolves color override in adapter', async () => {
    const { default: SugarColorSection } = await import('./sections/SugarColorSection');
    const { adaptConfigToLegacy } = await import('@/lib/configAdapter');

    // 1. Render SugarColorSection in colorOverride mode with flavorColorId='chocolate' and overrideColorId='red'
    const { rerender } = render(
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

    // Both "Flavor Color" and "Color Override" are visible
    expect(screen.getByText('Flavor Color')).toBeInTheDocument();
    expect(screen.getAllByText('Color Override').length).toBeGreaterThanOrEqual(1);

    // Chocolate must remain selected (has bg-primary class)
    const chocBtn = screen.getByTitle('Chocolate');
    expect(chocBtn.className).toContain('bg-primary');

    // Red in Color Override must be selected (has bg-primary class)
    const redBtn = screen.getByTitle('Red');
    expect(redBtn.className).toContain('bg-primary');

    // Vanilla should NOT be selected
    const vanillaBtn = screen.getByTitle('Vanilla');
    expect(vanillaBtn.className).not.toContain('bg-primary');

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
    expect(computeEdgeTrimRadius(4.0, 'kissDollopAltCherry', 'fullyFrosted')).toBeCloseTo(3.48, 2);
    expect(computeEdgeTrimRadius(4.0, 'kissDollopMediumAltCherry', 'fullyFrosted')).toBeCloseTo(3.30, 2);
    expect(computeEdgeTrimRadius(4.0, 'kissDollopSparseAltCherry', 'fullyFrosted')).toBeCloseTo(3.24, 2);

    const matA = new THREE.MeshBasicMaterial({ color: '#FFF' });
    const matB = new THREE.MeshBasicMaterial({ color: '#D6293E' });

    // 1. Continuous Star Dollop with Cherry (20 dollops + 20 cherries)
    const starCherry20 = buildPipingRing('starDollopContinuousCherry', matA, { radius: 3.40, y: 1.0, scale: 3 });
    expect(starCherry20).toBeDefined();
    expect(starCherry20.isGroup).toBe(true);
    // child 0: dollop instanced mesh (20 pc), children 1..20: 20 cherries
    expect(starCherry20.children[0].isInstancedMesh).toBe(true);
    expect(starCherry20.children[0].count).toBe(20);
    const cherries20 = starCherry20.children.slice(1);
    expect(cherries20.length).toBe(20);
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

    // 4. Alternating Continuous Star Dollop with Cherry (10+10 dual material + 20 cherries)
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
    expect(starCherry20Alt.children.slice(1).length).toBe(20);

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

    // 6. Alternating Kiss Dollop with Cherry (4+4 dual material + 8 cherries)
    const kissCherry8Alt = buildPipingRing('kissDollopSparseAltCherry', matA, {
      radius: 3.24,
      y: 1.0,
      scale: 3,
      secondaryMaterial: matB,
    });
    expect(kissCherry8Alt.children[0].children[0].count).toBe(4);
    expect(kissCherry8Alt.children[0].children[1].count).toBe(4);
    expect(kissCherry8Alt.children.slice(1).length).toBe(8);
  });

  it('renders all 4 dollop sub-rows in EdgeSection including cherry options', () => {
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

    const dollopsHeader = screen.getByText('Dollops');
    const dollopsContainer = dollopsHeader.closest('div');
    const dollopsWithin = within(dollopsContainer);

    expect(dollopsWithin.getByText('Solid with Cherries 🍒')).toBeInTheDocument();
    expect(dollopsWithin.getByText('Alternating with Cherries 🍒')).toBeInTheDocument();
    expect(dollopsWithin.getByText('Solid')).toBeInTheDocument();
    expect(dollopsWithin.getByText('Alternating (2 Colors)')).toBeInTheDocument();
  });
});


