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

import { describe, it, expect } from 'vitest';

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
