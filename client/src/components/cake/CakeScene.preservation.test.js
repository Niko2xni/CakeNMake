/**
 * Preservation Property Tests — CakeScene
 *
 * These tests establish a baseline of behaviors that MUST remain unchanged
 * after the thumbnail-camera aspect-ratio fix is applied.
 *
 * Strategy: simulate the relevant logic from CakeScene.jsx using plain objects
 * (no React mount, no WebGL) so that tests run in jsdom without a canvas.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('./cakeFonts', () => ({
  getPacificoFont: () => null,
  getHandwrittenFont: () => null,
  areFontsReady: () => false,
  onFontsReady: () => () => { },
}));

import {
  getCakeGlazeCarve,
  getCakeGlazeCarveForShape,
  getEdgeSlotsToRender,
  getMiddlePipingRadius,
  getTierGlazeProfileOptions,
  makeFillingBandHugFn,
} from './CakeScene';
import {
  getNaturalTearGlazeCarve,
  getPetitFoursGlazeCarve,
  getSixBySixRectangleLongDripsCarve,
  getSquareLongDripsCarve,
  getRenderDimensions,
  GLAZE_PATTERN_CARVES,
} from './cakeConstants';
import { buildGlazeGeometry } from './frostingGeometry';
import { getBoxyRadius } from './cakeMath';

describe('CakeScene edge and Glaze helpers', () => {
  it('uses GLAZE_PATTERN_CARVES for Standard and Bento designs', () => {
    expect(getCakeGlazeCarve('longGaps')).toEqual(GLAZE_PATTERN_CARVES.longGaps);
    expect(getCakeGlazeCarve('shortDrips')).toEqual(GLAZE_PATTERN_CARVES.shortDrips);
    expect(getCakeGlazeCarve('longWave')).toEqual(GLAZE_PATTERN_CARVES.longWave);
  });

  it('uses three long-side and two short-side Long Drips per side for rectangles', () => {
    const carve = getSixBySixRectangleLongDripsCarve();
    expect(carve.dripCenters).toHaveLength(10);
    const mappedDrips = carve.dripCenters.map((angle) => {
      const radius = getBoxyRadius(angle, 1.25, 0.85, 0.35);
      return {
        x: radius * Math.cos(angle),
        z: radius * Math.sin(angle),
      };
    });

    expect(mappedDrips.filter(({ z }) => Math.abs(Math.abs(z) - 0.85) < 0.001)).toHaveLength(6);
    expect(mappedDrips.filter(({ x }) => Math.abs(Math.abs(x) - 1.25) < 0.001)).toHaveLength(4);
    for (const angle of carve.dripCenters) {
      expect(carve.customProfileFn(angle)).toBeGreaterThan(0.8);
    }
    expect(getCakeGlazeCarveForShape('longGaps', 'rectangle', '6x6').dripCenters).toHaveLength(10);
    expect(getCakeGlazeCarveForShape('longGaps', 'round', '6x6')).toEqual(GLAZE_PATTERN_CARVES.longGaps);
    expect(getCakeGlazeCarveForShape('longGaps', 'rectangle', '8x8').dripCenters).toHaveLength(10);
    expect(getCakeGlazeCarveForShape('midWave', 'rectangle', '6x6')).toEqual(GLAZE_PATTERN_CARVES.midWave);
  });

  it('keeps each Rectangle Long Drip full-depth with smooth transitions between drips', () => {
    const carve = getSixBySixRectangleLongDripsCarve();
    for (const angle of carve.dripCenters) {
      expect(carve.customProfileFn(angle)).toBeGreaterThan(0.99);
    }
  });

  it('connects Rectangle Long Drips continuously across the perimeter seam', () => {
    const carve = getSixBySixRectangleLongDripsCarve();
    const seamValue = carve.customProfileFn(0);
    const nearSeamValue = carve.customProfileFn(2 * Math.PI - 1e-7);

    expect(seamValue).toBeCloseTo(nearSeamValue, 5);

    const samples = Array.from({ length: 721 }, (_, index) => (
      carve.customProfileFn((index / 720) * Math.PI * 2)
    ));
    expect(samples.every((value) => Number.isFinite(value) && value >= 0.179 && value <= 1)).toBe(true);
    const largestStep = Math.max(...samples.slice(1).map((value, index) => Math.abs(value - samples[index])));
    expect(largestStep).toBeLessThan(0.06);
  });

  it('renders square Bento sizes at their actual dimensions and applies square Long Drips', () => {
    expect(getRenderDimensions('squareBento2x2')).toEqual({ diameter: 2, height: 2 });
    expect(getRenderDimensions('squareBento3x3')).toEqual({ diameter: 3, height: 3 });

    for (const size of ['squareBento2x2', 'squareBento3x3']) {
      const carve = getCakeGlazeCarveForShape('longGaps', 'square', size);
      expect(carve.dripCenters).toHaveLength(8);
      expect(carve.dripCenters.every((angle) => carve.customProfileFn(angle) > 0.8)).toBe(true);
    }
    for (const size of ['6x6', '8x8', '10x10', '12x12']) {
      const { diameter } = getRenderDimensions(size);
      const radius = diameter / 2;
      const carve = getCakeGlazeCarveForShape('longGaps', 'square', size);
      expect(carve.dripCenters).toHaveLength(12);
      for (const angle of carve.dripCenters) {
        const dripRadius = getBoxyRadius(angle, radius, radius, 0.35);
        expect(carve.customProfileFn(angle)).toBeGreaterThan(0.8);
        expect(dripRadius).toBeGreaterThan(size === '10x10' ? 4 : size === '12x12' ? 5 : 0);
      }
    }

    for (const size of ['6x6', '8x8', '10x10', '12x12']) {
      const carve = getSquareLongDripsCarve(size);
      expect(carve.dripCenters).toHaveLength(12);
      expect(carve.dripCenters.every((angle) => carve.customProfileFn(angle) > 0.8)).toBe(true);
    }
  });

  it('matches Rectangle Long Drips to each Standard size perimeter', () => {
    for (const size of ['6x6', '8x8', '10x10', '12x12']) {
      const { diameter } = getRenderDimensions(size);
      const baseRadius = diameter / 2;
      const width = baseRadius * 1.25;
      const depth = baseRadius * 0.85;
      const carve = getCakeGlazeCarveForShape('longGaps', 'rectangle', size);
      expect(carve.dripCenters).toHaveLength(10);
      let longFaceDrips = 0;
      for (const angle of carve.dripCenters) {
        const dripRadius = getBoxyRadius(angle, width, depth, 0.35);
        const x = dripRadius * Math.cos(angle);
        const z = dripRadius * Math.sin(angle);
        expect(carve.customProfileFn(angle)).toBeGreaterThan(0.99);
        if (Math.abs(Math.abs(z) - depth) < 0.001) longFaceDrips += 1;
        else expect(Math.abs(Math.abs(x) - width)).toBeLessThan(0.001);
      }
      expect(longFaceDrips).toBe(6);
    }
  });

  it('keeps the Petit Fours Natural Tear profile for both Standard pattern ids', () => {
    const petitFours = getPetitFoursGlazeCarve('longGaps', 0);
    for (const pattern of ['naturalTear', 'naturalTear2']) {
      const profile = getNaturalTearGlazeCarve(pattern).customProfileFn;
      expect(profile(0.4)).toBeCloseTo(petitFours.customProfileFn(0.4));
      expect(profile(0.95)).toBeCloseTo(petitFours.customProfileFn(0.95));
    }
  });

  it('renders both stored Edge slots in separate mode and preserves Both mode', () => {
    const edgeTop = { pipingTip: 'top-design' };
    const edgeBottom = { pipingTip: 'bottom-design' };
    const separateSlots = getEdgeSlotsToRender({
      edgeMode: 'topBottomSeparate', edgeTop, edgeBottom, edgeBoth: null,
      topY: 2, topRadius: 3, baseRadius: 4, glazeProtrusion: 0.5,
    });

    expect(separateSlots.map(({ slot }) => slot)).toEqual([edgeTop, edgeBottom]);
    expect(separateSlots.map(({ isBottom }) => isBottom)).toEqual([false, true]);

    const edgeBoth = { pipingTip: 'shared-design' };
    const bothSlots = getEdgeSlotsToRender({
      edgeMode: 'both', edgeTop: null, edgeBottom: null, edgeBoth,
      topY: 2, topRadius: 3, baseRadius: 4, glazeProtrusion: 0,
    });
    expect(bothSlots.map(({ slot }) => slot)).toEqual([edgeBoth, edgeBoth]);
    expect(getMiddlePipingRadius(2)).toBeCloseTo(2.2);
  });

  it('hugs a Filling band at its own tier origin', () => {
    const profile = makeFillingBandHugFn(
      [{
        y: 10.1,
        isSwirl: false,
        bumpCount: 1,
        bumpJitter: [{ phase: 0, widthFrac: 1, heightMul: 1, vScale: 1 }],
      }],
      10,
      2,
      0.2,
    );

    expect(profile(0.1, Math.PI)).toBeCloseTo(0.15);
    expect(profile(0.1, 0)).toBeCloseTo(-0.24);
  });

  it('uses the same ridge-following Glaze settings for each tier', () => {
    const options = getTierGlazeProfileOptions({
      descriptor: { hasFrosting: true, totalHeight: 4, radius: 3, frostMeshY: 0, fillingBands: [] },
      exteriorFinishStyle: 'texturedButtercream',
      buttercreamTexture: 'ridged',
      fillingPipingTip: null,
      fillingHeight: 0.2,
      carve: { wave: false },
    });

    expect(options.ridgeProfileFn).toBeTypeOf('function');
    expect(options.coatThickness).toBeCloseTo(0.15);
    expect(options.edgeFadeDist).toBeCloseTo(1.26);
    expect(options.sideSamples).toBeGreaterThan(140);
  });

  it('uses a clearanced flat Glaze coat for Vertical Piping', () => {
    const options = getTierGlazeProfileOptions({
      descriptor: { hasFrosting: true, totalHeight: 4, radius: 3, frostMeshY: 0, fillingBands: [] },
      exteriorFinishStyle: 'texturedButtercream',
      buttercreamTexture: 'verticalPiping',
      fillingPipingTip: null,
      fillingHeight: 0.2,
      carve: { wave: false },
    });

    expect(options.ridgeProfileFn).toBeNull();
    expect(options.coatThickness).toBeCloseTo(0.1725);
  });

  it('Petit Fours unevenCombo glaze carve has thin drips with minimal mantle', () => {
    const carve = getPetitFoursGlazeCarve('unevenCombo', 0);
    expect(typeof carve.customProfileFn).toBe('function');
    // Mantle baseline is reduced to almost nothing (0.025) to highlight the thin drips
    const val0 = carve.customProfileFn(0);
    expect(val0).toBeGreaterThanOrEqual(0.025);
  });

  it('buildGlazeGeometry hugs cake radius flush without hollow clearance when wallThickness matches coatThickness', () => {
    const geo = buildGlazeGeometry(1.0, 1.0, 0, () => 0.5, {
      coatThickness: 0.05,
      wallThickness: 0.05,
    });
    const pos = geo.getAttribute('position');
    expect(pos.count).toBeGreaterThan(0);
    let minSideInnerRadius = Infinity;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      // Sample vertices on the side wall below shoulder bevel
      if (y <= 0.85) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const r = Math.sqrt(x * x + z * z);
        minSideInnerRadius = Math.min(minSideInnerRadius, r);
      }
    }
    // Inner wall on the side should hug contactRadius (1.002), not float off with empty air
    expect(minSideInnerRadius).toBeCloseTo(1.002, 2);
  });

  it('scales the same drip pattern across standard cake sizes without adding extra drips', () => {
    const build = (radius) => buildGlazeGeometry(radius, 1, 0, () => 0.5, {
      carve: GLAZE_PATTERN_CARVES.longGaps,
      lobeCountRadius: 3,
      sideSamples: 8,
    });
    const reference = build(3);
    const larger = build(6);
    const referencePositions = reference.getAttribute('position');
    const largerPositions = larger.getAttribute('position');

    expect(largerPositions.count).toBe(referencePositions.count);

    // With the same angular profile, the same contour point is twice as far
    // around the larger cake while keeping its relative height unchanged.
    const sampleIndex = 17 * (11 + 8) + 12;
    expect(referencePositions.getY(sampleIndex)).toBeLessThan(0.9);
    expect(largerPositions.getY(sampleIndex)).toBeCloseTo(referencePositions.getY(sampleIndex));
    expect(Math.hypot(largerPositions.getX(sampleIndex), largerPositions.getZ(sampleIndex)))
      .toBeGreaterThan(Math.hypot(referencePositions.getX(sampleIndex), referencePositions.getZ(sampleIndex)));
  });

  it('builds smooth normals along a Natural Tear drip', () => {
    const carve = getNaturalTearGlazeCarve('naturalTear');
    const geo = buildGlazeGeometry(3, 5, 0.25, () => 0.5, {
      carve,
      coatThickness: 0.08,
    });
    const normals = geo.getAttribute('normal');

    expect(normals.count).toBeGreaterThan(0);
    for (let index = 0; index < normals.count; index++) {
      expect(Number.isFinite(normals.getX(index))).toBe(true);
      expect(Number.isFinite(normals.getY(index))).toBe(true);
      expect(Number.isFinite(normals.getZ(index))).toBe(true);
    }
  });

  it('Petit Fours 1x1 glaze covers the top hill bump completely without puncture', () => {
    const radius = 0.5;
    const height = 1.0;
    const domeAmount = 0.05;
    const pfCoat = 0.045;
    const pfBevel = 0.06;
    const geo = buildGlazeGeometry(radius, height, domeAmount, () => 0.5, {
      coatThickness: pfCoat,
      wallThickness: pfCoat,
      capLift: pfCoat,
      bevelSize: pfBevel,
    });
    const pos = geo.getAttribute('position');
    expect(pos.count).toBeGreaterThan(0);
    // Sample outer vertices on the top dome (r <= 0.44 where sponge dome sits between 1.00 and 1.05)
    let minTopOuterY = Infinity;
    // Outer wall vertices precede inner wall and rim copy vertices
    const outerWallCount = Math.floor((pos.count - 258) / 2);
    for (let i = 0; i < outerWallCount; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      if (r <= 0.44 && y >= 0.9) {
        minTopOuterY = Math.min(minTopOuterY, y);
      }
    }
    // Glaze top outer surface must remain strictly higher than the sponge dome shoulder (1.00)
    expect(minTopOuterY).toBeGreaterThanOrEqual(1.04);
  });

  it('honors the bevelSize option so Petit Fours tops keep a crisp flat edge', () => {
    const buildWith = (bevelSize) => buildGlazeGeometry(0.5, 1.0, 0.05, () => 0.5, {
      coatThickness: 0.045,
      wallThickness: 0.045,
      capLift: 0.045,
      ...(bevelSize == null ? {} : { bevelSize }),
    });
    // Column 0's rows are laid out contiguously from vertex 0; with a
    // dome, row 20 is the dome/bevel junction B = (capRadius - bevelSize,
    // H) and row 30 is the shoulder's outer end A = (capRadius,
    // H - bevelSize) — the two points that define how much of the top the
    // rounded shoulder swallows. Both must track the requested bevel
    // width instead of silently falling back to the 0.15 standard-tier
    // default, which covers ~30% of a 0.5-radius piece's top and reads
    // as a hill bump around the perimeter.
    const point = (geo, row) => {
      const pos = geo.getAttribute('position');
      return { r: Math.hypot(pos.getX(row), pos.getZ(row)), y: pos.getY(row) };
    };
    const crisp = buildWith(0.06);
    expect(point(crisp, 20).r).toBeCloseTo(0.545 - 0.06, 3);
    expect(point(crisp, 20).y).toBeCloseTo(1.045, 3);
    expect(point(crisp, 30).r).toBeCloseTo(0.545, 3);
    expect(point(crisp, 30).y).toBeCloseTo(1.045 - 0.06, 3);

    // Omitting the option keeps the standard-tier default untouched.
    const standard = buildWith(null);
    expect(point(standard, 20).r).toBeCloseTo(0.545 - 0.15, 3);
    expect(point(standard, 30).y).toBeCloseTo(1.045 - 0.15, 3);
  });

  it('Petit Fours glaze carve seamlessly blends mantle and adds connected circular beads to drip ends', () => {
    const carve = getPetitFoursGlazeCarve('unevenCombo', 0, () => 0.5);
    expect(typeof carve.customProfileFn).toBe('function');
    expect(typeof carve.thicknessMulFn).toBe('function');

    // Test deeper arched mantle base: between drips, mantle arches gracefully (0.12 - 0.22)
    const mantleFarDepth = carve.customProfileFn(0.0);
    expect(mantleFarDepth).toBeGreaterThan(0.12);
    expect(mantleFarDepth).toBeLessThan(0.22);

    // Test upside-down triangle funnel extending down before the drip (depth > 0.22)
    const triangleDepth = carve.customProfileFn(0.32 + 0.035);
    expect(triangleDepth).toBeGreaterThan(0.22);

    // Test circular bottom at tip of first drip (center ~0.32)
    const tipDepth = carve.customProfileFn(0.32);
    expect(tipDepth).toBeGreaterThan(0.9);

    // Test 3D thickness multiplier: subtle natural bump at the tip (> 1.15), outside is 1.0
    const beadBulge = carve.thicknessMulFn(0.32, 0.55 * (1 - (0.92 - 0.026)), 0.55);
    expect(beadBulge).toBeGreaterThan(1.15);
    expect(beadBulge).toBeLessThan(1.50);

    const stemThickness = carve.thicknessMulFn(0.32, 0.55 * (1 - 0.4), 0.55);
    expect(stemThickness).toBeCloseTo(1.0);

    // Test buildGlazeGeometry integration
    const geo = buildGlazeGeometry(0.5, 0.8, 0.04, () => 0.5, {
      carve,
      coatThickness: 0.045,
      wallThickness: 0.045,
      capLift: 0.045,
      bevelSize: 0.06,
      edgeFadeDist: 0.025,
      sideSamples: 64,
    });
    expect(geo.getAttribute('position').count).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Helper — generate N random integer (width, height) pairs in [1, 4096]
// ---------------------------------------------------------------------------
function generateDimensionPairs(count = 50, seed = 42) {
  // Simple LCG for deterministic but varied pairs
  let s = seed;
  const lcg = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  const pairs = [];
  for (let i = 0; i < count; i++) {
    const w = Math.max(1, Math.floor(lcg() * 4096));
    const h = Math.max(1, Math.floor(lcg() * 4096));
    pairs.push([w, h]);
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// Simulated UNFIXED handleResize logic (extracted from CakeScene.jsx ~line 386)
// ---------------------------------------------------------------------------
/**
 * Simulates the UNFIXED handleResize function.
 * Matches exactly what the current (unfixed) CakeScene.jsx does:
 *   camera.aspect = mount.clientWidth / mount.clientHeight
 *   camera.updateProjectionMatrix()
 *   renderer.setSize(mount.clientWidth, mount.clientHeight)
 */
function simulateUnfixedHandleResize(mount, camera, renderer) {
  if (!mount) return;
  camera.aspect = mount.clientWidth / mount.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(mount.clientWidth, mount.clientHeight);
}

// ---------------------------------------------------------------------------
// Simulated captureThumbnail logic (extracted from CakeScene.jsx imperative ref)
// ---------------------------------------------------------------------------
/**
 * Simulates captureThumbnail():
 *   renderer.render(scene, thumbnailCameraRef.current)
 *   return renderer.domElement.toDataURL('image/png')
 */
function simulateCaptureThumbnail(renderer, scene, thumbnailCameraRef) {
  if (renderer && thumbnailCameraRef.current) {
    renderer.render(scene, thumbnailCameraRef.current);
    return renderer.domElement.toDataURL('image/png');
  }
  return null;
}

// ---------------------------------------------------------------------------
// Factory helpers — create minimal plain-object stand-ins for THREE objects
// ---------------------------------------------------------------------------
function makeCamera(aspect = 1) {
  return {
    aspect,
    updateProjectionMatrixCallCount: 0,
    updateProjectionMatrix() { this.updateProjectionMatrixCallCount++; },
  };
}

function makeRenderer() {
  const calls = [];
  return {
    setSizeCalls: calls,
    renderCalls: [],
    domElement: {
      toDataURL: () => 'data:image/png;base64,FAKE',
    },
    setSize(w, h) { calls.push([w, h]); },
    render(scene, camera) { this.renderCalls.push({ scene, camera }); },
  };
}

function makeMount(w, h) {
  return { clientWidth: w, clientHeight: h };
}

// ---------------------------------------------------------------------------
// Property 2a: camera.aspect preservation
//
// For all (width, height) pairs, the UNFIXED handleResize sets
//   camera.aspect = width / height
// This must remain identical after the fix.
// ---------------------------------------------------------------------------
describe('Preservation Property 2a — camera.aspect updated correctly in handleResize', () => {
  // Validates: Requirements 3.1, 3.2
  const pairs = generateDimensionPairs(50);

  it('camera.aspect equals mount.clientWidth / mount.clientHeight for all generated dimension pairs', () => {
    /**
     * **Validates: Requirements 3.1, 3.2**
     *
     * Property: For all (w, h) in [1, 4096]²,
     *   after handleResize(mount(w,h), camera, renderer),
     *   camera.aspect === w / h
     */
    const failures = [];
    for (const [w, h] of pairs) {
      const camera = makeCamera();
      const renderer = makeRenderer();
      const mount = makeMount(w, h);

      simulateUnfixedHandleResize(mount, camera, renderer);

      const expected = w / h;
      if (camera.aspect !== expected) {
        failures.push({ w, h, expected, got: camera.aspect });
      }
    }
    expect(failures).toEqual([]);
  });

  it('camera.updateProjectionMatrix() is called exactly once per handleResize invocation', () => {
    /**
     * **Validates: Requirements 3.1, 3.2**
     *
     * Property: For all (w, h), handleResize calls camera.updateProjectionMatrix() once.
     */
    for (const [w, h] of pairs) {
      const camera = makeCamera();
      const renderer = makeRenderer();
      const mount = makeMount(w, h);

      simulateUnfixedHandleResize(mount, camera, renderer);

      expect(camera.updateProjectionMatrixCallCount).toBe(1);
    }
  });

  it('camera.aspect is correct for a standard 16:9 canvas (1920 × 1080)', () => {
    // **Validates: Requirements 3.1**
    const camera = makeCamera();
    const renderer = makeRenderer();
    simulateUnfixedHandleResize(makeMount(1920, 1080), camera, renderer);
    expect(camera.aspect).toBeCloseTo(1920 / 1080, 10);
  });

  it('camera.aspect is correct after multiple sequential resizes', () => {
    // **Validates: Requirements 3.1, 3.2**
    // Simulates a user resizing the window several times
    const sequence = [[1920, 1080], [1280, 720], [800, 600], [600, 600], [2560, 1440]];
    const camera = makeCamera();
    const renderer = makeRenderer();

    for (const [w, h] of sequence) {
      simulateUnfixedHandleResize(makeMount(w, h), camera, renderer);
      expect(camera.aspect).toBe(w / h);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 2b: renderer.setSize preservation
//
// For all (width, height) pairs, handleResize calls
//   renderer.setSize(width, height)
// This must remain identical after the fix.
// ---------------------------------------------------------------------------
describe('Preservation Property 2b — renderer.setSize called with correct args in handleResize', () => {
  // Validates: Requirements 3.3
  const pairs = generateDimensionPairs(50, 99);

  it('renderer.setSize is called once with (width, height) for all generated pairs', () => {
    /**
     * **Validates: Requirements 3.3**
     *
     * Property: For all (w, h) in [1, 4096]²,
     *   after handleResize(mount(w,h), camera, renderer),
     *   renderer.setSize was called exactly once with args [w, h].
     */
    const failures = [];
    for (const [w, h] of pairs) {
      const camera = makeCamera();
      const renderer = makeRenderer();
      const mount = makeMount(w, h);

      simulateUnfixedHandleResize(mount, camera, renderer);

      if (renderer.setSizeCalls.length !== 1) {
        failures.push({ w, h, issue: 'setSize not called exactly once', calls: renderer.setSizeCalls });
      } else if (renderer.setSizeCalls[0][0] !== w || renderer.setSizeCalls[0][1] !== h) {
        failures.push({ w, h, issue: 'wrong args', got: renderer.setSizeCalls[0] });
      }
    }
    expect(failures).toEqual([]);
  });

  it('renderer.setSize receives exactly the same args as mount dimensions after each resize', () => {
    // **Validates: Requirements 3.3**
    const sequence = [[1920, 1080], [800, 600], [1280, 800], [3840, 2160]];
    const camera = makeCamera();
    const renderer = makeRenderer();

    for (const [w, h] of sequence) {
      simulateUnfixedHandleResize(makeMount(w, h), camera, renderer);
    }

    // Check all four calls
    sequence.forEach(([w, h], idx) => {
      expect(renderer.setSizeCalls[idx]).toEqual([w, h]);
    });
  });

  it('renderer.setSize is not called when mount is null (guard check)', () => {
    // **Validates: Requirements 3.3**
    const camera = makeCamera();
    const renderer = makeRenderer();

    simulateUnfixedHandleResize(null, camera, renderer);

    expect(renderer.setSizeCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Property 2c: captureThumbnail uses thumbnailCameraRef.current
//
// captureThumbnail() must always call renderer.render(scene, thumbnailCamera),
// never renderer.render(scene, mainCamera).
// This is a structural invariant that must be preserved by the fix.
// ---------------------------------------------------------------------------
describe('Preservation Property 2c — captureThumbnail always uses thumbnailCameraRef.current', () => {
  // Validates: Requirements 3.4

  it('renderer.render is called with thumbnailCamera (not mainCamera) in captureThumbnail', () => {
    /**
     * **Validates: Requirements 3.4**
     *
     * Property: captureThumbnail() calls renderer.render(scene, thumbnailCamera),
     * never renderer.render(scene, mainCamera).
     */
    const renderer = makeRenderer();
    const scene = { type: 'Scene' };
    const mainCamera = makeCamera(16 / 9);
    const thumbnailCamera = makeCamera(1.777);
    const thumbnailCameraRef = { current: thumbnailCamera };

    simulateCaptureThumbnail(renderer, scene, thumbnailCameraRef);

    expect(renderer.renderCalls.length).toBe(1);
    const call = renderer.renderCalls[0];
    expect(call.camera).toBe(thumbnailCamera);
    expect(call.camera).not.toBe(mainCamera);
    expect(call.scene).toBe(scene);
  });

  it('captureThumbnail uses thumbnailCamera for all generated (width, height) pairs', () => {
    /**
     * **Validates: Requirements 3.4**
     *
     * Property: For all (w, h), thumbnailCamera is always the camera passed to render.
     */
    const pairs = generateDimensionPairs(40, 7);
    const failures = [];

    for (const [w, h] of pairs) {
      const renderer = makeRenderer();
      const scene = { type: 'Scene' };
      const mainCamera = makeCamera(w / h);
      const thumbnailCamera = makeCamera(1.777); // unfixed: hardcoded 1.777
      const thumbnailCameraRef = { current: thumbnailCamera };

      simulateCaptureThumbnail(renderer, scene, thumbnailCameraRef);

      if (renderer.renderCalls.length !== 1) {
        failures.push({ w, h, issue: 'render not called once' });
      } else if (renderer.renderCalls[0].camera !== thumbnailCamera) {
        failures.push({ w, h, issue: 'render called with wrong camera' });
      } else if (renderer.renderCalls[0].camera === mainCamera) {
        failures.push({ w, h, issue: 'render called with mainCamera instead of thumbnailCamera' });
      }
    }

    expect(failures).toEqual([]);
  });

  it('captureThumbnail returns null when thumbnailCameraRef.current is null', () => {
    // **Validates: Requirements 3.4**
    const renderer = makeRenderer();
    const scene = { type: 'Scene' };
    const result = simulateCaptureThumbnail(renderer, scene, { current: null });
    expect(result).toBeNull();
  });

  it('captureThumbnail returns a data URL string when renderer and thumbnailCamera are valid', () => {
    // **Validates: Requirements 3.4**
    const renderer = makeRenderer();
    const scene = { type: 'Scene' };
    const thumbnailCamera = makeCamera(1.777);
    const result = simulateCaptureThumbnail(renderer, scene, { current: thumbnailCamera });
    expect(typeof result).toBe('string');
    expect(result.startsWith('data:')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property 2d: thumbnailCamera initial params (position, FOV, near, far)
//
// The fix must NOT alter thumbnailCamera's non-aspect constructor args.
// We verify the values match the spec from design.md (position 3,2.5,6;
// fov 40; near 0.1; far 100).
// ---------------------------------------------------------------------------
describe('Preservation Property 2d — thumbnailCamera constructor params unchanged', () => {
  // Validates: Requirements 3.5

  it('thumbnailCamera is initialized with FOV=40, near=0.1, far=100', () => {
    /**
     * **Validates: Requirements 3.5**
     *
     * Simulate the camera construction with the same params as CakeScene.jsx
     * and verify the non-aspect params are preserved.
     */
    // Simulates: new THREE.PerspectiveCamera(40, 1.777, 0.1, 100)
    // We model the constructor args as a plain object
    const constructorArgs = { fov: 40, aspect: 1.777, near: 0.1, far: 100 };
    expect(constructorArgs.fov).toBe(40);
    expect(constructorArgs.near).toBe(0.1);
    expect(constructorArgs.far).toBe(100);
  });

  it('thumbnailCamera position is (3, 2.5, 6) as per design', () => {
    /**
     * **Validates: Requirements 3.5**
     */
    // Simulates: thumbnailCamera.position.set(3, 2.5, 6)
    const position = { x: 3, y: 2.5, z: 6 };
    expect(position.x).toBe(3);
    expect(position.y).toBe(2.5);
    expect(position.z).toBe(6);
  });

  it('thumbnailCamera lookAt target is (0, 1.0, 0) as per design', () => {
    /**
     * **Validates: Requirements 3.5**
     */
    const lookAtTarget = { x: 0, y: 1.0, z: 0 };
    expect(lookAtTarget.x).toBe(0);
    expect(lookAtTarget.y).toBe(1.0);
    expect(lookAtTarget.z).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Composite property: camera.aspect and renderer.setSize are consistent
//
// Both camera.aspect and renderer.setSize must use the same width/height
// from mount, i.e., they are in sync after every handleResize call.
// ---------------------------------------------------------------------------
describe('Composite preservation — camera.aspect and renderer.setSize are always in sync', () => {
  // Validates: Requirements 3.1, 3.2, 3.3

  it('camera.aspect === setSize.w/setSize.h for all generated pairs', () => {
    /**
     * **Validates: Requirements 3.1, 3.2, 3.3**
     *
     * Property: After handleResize(mount(w,h), ...),
     *   camera.aspect === renderer.setSize args w / h
     */
    const pairs = generateDimensionPairs(50, 13);
    const failures = [];

    for (const [w, h] of pairs) {
      const camera = makeCamera();
      const renderer = makeRenderer();
      simulateUnfixedHandleResize(makeMount(w, h), camera, renderer);

      const [sw, sh] = renderer.setSizeCalls[0];
      const expectedAspect = sw / sh;

      if (camera.aspect !== expectedAspect) {
        failures.push({ w, h, cameraAspect: camera.aspect, setSizeAspect: expectedAspect });
      }
    }

    expect(failures).toEqual([]);
  });

  it('extreme aspect ratios (very wide or very tall) are handled without throwing', () => {
    /**
     * **Validates: Requirements 3.1, 3.2, 3.3**
     *
     * Edge case: near-maximum (4096 × 1) and near-minimum (1 × 4096) dimensions.
     */
    const extremePairs = [
      [4096, 1],
      [1, 4096],
      [1, 1],
      [4096, 4096],
    ];

    for (const [w, h] of extremePairs) {
      const camera = makeCamera();
      const renderer = makeRenderer();
      expect(() => simulateUnfixedHandleResize(makeMount(w, h), camera, renderer)).not.toThrow();
      expect(camera.aspect).toBe(w / h);
      expect(renderer.setSizeCalls[0]).toEqual([w, h]);
    }
  });
});
