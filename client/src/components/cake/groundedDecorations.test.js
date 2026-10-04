import { beforeAll, describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4096) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  }));
});

vi.mock('./cakeFonts', () => ({
  getPacificoFont: () => null,
  getHandwrittenFont: () => null,
  areFontsReady: () => false,
  onFontsReady: () => () => {},
}));

import {
  buildRotatedDecoration,
  getCakeTopSurfacePoint,
  getDecorationLandingY,
} from './CakeScene';

describe('Grounded Rotated Decorations', () => {
  it('grounds standing Oreo flush on surface at 0 tilt and when tilted flat (90 deg)', () => {
    // Standing Oreo upright (0 deg tilt)
    const upright = buildRotatedDecoration('oreo', 'standing', 0, 0, 1, '#F6DEAB', Math.random, 0);
    const boxUpright = new THREE.Box3().setFromObject(upright);
    expect(boxUpright.min.y).toBeCloseTo(0, 2);

    // Standing Oreo tilted flat (90 deg left/right roll)
    const tiltedFlat = buildRotatedDecoration('oreo', 'standing', 0, 0, 1, '#F6DEAB', Math.random, Math.PI / 2);
    const boxTilted = new THREE.Box3().setFromObject(tiltedFlat);
    expect(boxTilted.min.y).toBeCloseTo(0, 2);

    // Standing Oreo tilted flat front/back (90 deg pitch)
    const tiltedPitch = buildRotatedDecoration('oreo', 'standing', Math.PI / 2, 0, 1, '#F6DEAB', Math.random, 0);
    const boxPitch = new THREE.Box3().setFromObject(tiltedPitch);
    expect(boxPitch.min.y).toBeCloseTo(0, 2);
  });

  it('grounds Chocolate Bear flush on surface when sitting upright and when lying down', () => {
    const upright = buildRotatedDecoration('chocolateBear', null, 0, 0, 1, '#F6DEAB', Math.random, 0);
    const boxUpright = new THREE.Box3().setFromObject(upright);
    expect(boxUpright.min.y).toBeCloseTo(0, 2);

    const lyingDown = buildRotatedDecoration('chocolateBear', null, Math.PI / 2, 0, 1, '#F6DEAB', Math.random, 0);
    const boxLying = new THREE.Box3().setFromObject(lyingDown);
    expect(boxLying.min.y).toBeCloseTo(0, 2);
  });

  it('grounds Strawberry flush on surface when upright and when on its side', () => {
    const upright = buildRotatedDecoration('strawberry', null, 0, 0, 1, '#F6DEAB', Math.random, 0);
    const boxUpright = new THREE.Box3().setFromObject(upright);
    expect(boxUpright.min.y).toBeCloseTo(0, 2);

    const onSide = buildRotatedDecoration('strawberry', null, 0, 0, 1, '#F6DEAB', Math.random, Math.PI / 2);
    const boxSide = new THREE.Box3().setFromObject(onSide);
    expect(boxSide.min.y).toBeCloseTo(0, 2);
  });

  it('grounds Hershey Kiss flush on surface when upright and when tilted', () => {
    const upright = buildRotatedDecoration('hersheysKisses', null, 0, 0, 1, '#F6DEAB', Math.random, 0);
    const boxUpright = new THREE.Box3().setFromObject(upright);
    expect(boxUpright.min.y).toBeCloseTo(0, 2);

    const tilted = buildRotatedDecoration('hersheysKisses', null, Math.PI / 4, 0, 1, '#F6DEAB', Math.random, 0);
    const boxTilted = new THREE.Box3().setFromObject(tilted);
    expect(boxTilted.min.y).toBeCloseTo(0, 2);
  });

  it('preserves spherical designs (Ferrero Rocher) perfectly flush on surface across all angles', () => {
    const rocher0 = buildRotatedDecoration('ferreroRocher', null, 0, 0, 1, '#F6DEAB', Math.random, 0);
    const box0 = new THREE.Box3().setFromObject(rocher0);
    expect(box0.min.y).toBeCloseTo(0, 2);

    const rocher90 = buildRotatedDecoration('ferreroRocher', null, Math.PI / 2, 0, 1, '#F6DEAB', Math.random, Math.PI / 4);
    const box90 = new THREE.Box3().setFromObject(rocher90);
    expect(box90.min.y).toBeCloseTo(0, 2);
  });

  it('accurately reads the hill-like dome bump surface height across positions', () => {
    const topMetrics = { baseY: 5.0, domeHeight: 0.25, radius: 4.0 };

    // At the peak of the hill (x=0, z=0)
    const peak = getCakeTopSurfacePoint(0, 0, topMetrics);
    expect(peak.y).toBeCloseTo(5.25, 2);

    // On the downhill slope along +X
    const slopeX = getCakeTopSurfacePoint(2.5, 0, topMetrics);
    expect(slopeX.y).toBeLessThan(5.25);
    expect(slopeX.y).toBeGreaterThan(5.0);

    // On the shoulder bevel (r >= 3.82)
    const shoulder = getCakeTopSurfacePoint(3.9, 0, topMetrics);
    expect(shoulder.y).toBeLessThanOrEqual(5.0);
    expect(shoulder.y).toBeGreaterThan(4.8);
  });

  it('computes exact landing Y so decoration touches surface at any tilt angle', () => {
    const topMetrics = { baseY: 5.0, domeHeight: 0.25, radius: 4.0 };

    // Standing Oreo upright at hill peak (x=0, z=0)
    const oreoUpright = buildRotatedDecoration('oreo', 'standing', 0, 0, 1, '#F6DEAB', Math.random, 0);
    const landingPeak = getDecorationLandingY(oreoUpright, 0, 0, topMetrics);
    // Peak surface is 5.25, minus 0.015 nestle = ~5.235 (Oreo base contact at 5.23)
    expect(landingPeak).toBeGreaterThan(5.20);
    expect(landingPeak).toBeLessThanOrEqual(5.25);

    // Standing Oreo tilted flat (roll = 90 deg) on the slope
    const oreoFlat = buildRotatedDecoration('oreo', 'standing', 0, 0, 1, '#F6DEAB', Math.random, Math.PI / 2);
    const landingSlope = getDecorationLandingY(oreoFlat, 2.0, 0, topMetrics);
    expect(landingSlope).toBeGreaterThan(5.0);
    expect(landingSlope).toBeLessThan(5.25);
  });

  it('guarantees standing items at compound tilt angles land firmly on the cake surface', () => {
    const topMetrics = { baseY: 5.0, domeHeight: 0.25, radius: 4.0 };
    // Oreo tilted both pitch and roll (e.g. 45 deg tilt, 30 deg roll)
    const tiltedOreo = buildRotatedDecoration(
      'oreo', 'standing', Math.PI / 4, 0, 1, '#F6DEAB', Math.random, Math.PI / 6
    );
    const landingY = getDecorationLandingY(tiltedOreo, 1.5, 1.0, topMetrics);
    expect(landingY).toBeDefined();
    expect(landingY).toBeGreaterThan(4.8);
    expect(landingY).toBeLessThan(5.25);

    // Hershey Kiss tilted at angle
    const tiltedKiss = buildRotatedDecoration(
      'hersheysKisses', null, Math.PI / 3, 0, 1, '#F6DEAB', Math.random, 0
    );
    const kissLandingY = getDecorationLandingY(tiltedKiss, 1.0, 1.0, topMetrics);
    expect(kissLandingY).toBeDefined();
    expect(kissLandingY).toBeGreaterThan(4.5);
    expect(kissLandingY).toBeLessThan(5.25);
  });

  it('grounds Cherry by its fruit body only, ignoring the stem when tilted (e.g. 150 deg)', () => {
    const topMetrics = { baseY: 5.0, domeHeight: 0.25, radius: 4.0 };
    // Cherry tilted 150 deg (stem pointing downward)
    const tilt150 = THREE.MathUtils.degToRad(150);
    const cherry150 = buildRotatedDecoration('cherry', null, 0, 0, 1, '#F6DEAB', Math.random, tilt150);

    // Check that fruit body itself rests at min Y = 0 (and stem extends below 0)
    let bodyMinY = Infinity;
    cherry150.traverse((child) => {
      if (child.isMesh && child.userData.isCherryBody) {
        const v = new THREE.Vector3();
        const pos = child.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld);
          if (v.y < bodyMinY) bodyMinY = v.y;
        }
      }
    });
    // Fruit body rests flush at the base (not propped up by the ~1.15 long stem)
    expect(bodyMinY).toBeGreaterThanOrEqual(0);
    expect(bodyMinY).toBeLessThan(0.1);

    // When placed on top of cake (x=0, z=0, surface 5.25), cherry body lands right at the surface
    const landingY = getDecorationLandingY(cherry150, 0, 0, topMetrics);
    expect(landingY).toBeGreaterThan(5.0);
    expect(landingY).toBeLessThanOrEqual(5.25);
  });

  it('buries Hershey Kiss deeper into frosting when tilted upside down (e.g. 150 deg)', () => {
    const topMetrics = { baseY: 5.0, domeHeight: 0.25, radius: 4.0 };
    // Upright Hershey Kiss at peak (0,0)
    const kissUpright = buildRotatedDecoration('hersheysKisses', null, 0, 0, 1, '#F6DEAB', Math.random, 0);
    const uprightLanding = getDecorationLandingY(kissUpright, 0, 0, topMetrics);

    // Upside down Hershey Kiss at peak (0,0) with 150 deg tilt
    const tilt150 = THREE.MathUtils.degToRad(150);
    const kiss150 = buildRotatedDecoration('hersheysKisses', null, 0, 0, 1, '#F6DEAB', Math.random, tilt150);
    const upsideDownLanding = getDecorationLandingY(kiss150, 0, 0, topMetrics);

    // Upside down kiss should be buried deeper into the frosting (lower landing Y) than upright
    expect(upsideDownLanding).toBeLessThan(uprightLanding);
    // Difference should be around 0.05 - 0.09 deeper so the pointy tip doesn't look floating
    expect(uprightLanding - upsideDownLanding).toBeGreaterThan(0.04);
  });

  it('buries Oreo progressively deeper per angle tilt and even deeper upside down', () => {
    // Constant surface baseline to isolate and verify progressive frosting bury depth
    const topMetrics = { baseY: 5.0, domeHeight: 0, radius: 4.0 };
    // Upright Oreo (0 deg)
    const oreo0 = buildRotatedDecoration('oreo', 'standing', 0, 0, 1, '#F6DEAB', Math.random, 0);
    const landing0 = getDecorationLandingY(oreo0, 0, 0, topMetrics);

    // Tilted 45 deg roll
    const oreo45 = buildRotatedDecoration('oreo', 'standing', 0, 0, 1, '#F6DEAB', Math.random, Math.PI / 4);
    const landing45 = getDecorationLandingY(oreo45, 0, 0, topMetrics);

    // Tilted 90 deg flat
    const oreo90 = buildRotatedDecoration('oreo', 'standing', 0, 0, 1, '#F6DEAB', Math.random, Math.PI / 2);
    const landing90 = getDecorationLandingY(oreo90, 0, 0, topMetrics);

    // Tilted 150 deg upside down
    const tilt150 = THREE.MathUtils.degToRad(150);
    const oreo150 = buildRotatedDecoration('oreo', 'standing', 0, 0, 1, '#F6DEAB', Math.random, tilt150);
    const landing150 = getDecorationLandingY(oreo150, 0, 0, topMetrics);

    // Helper to find the actual lowest mesh vertex resting in the frosting
    const getLowestWorldY = (anchor, landingY) => {
      let lowest = Infinity;
      anchor.traverse((child) => {
        if (!child.isMesh || !child.geometry) return;
        const pos = child.geometry.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld);
          if (v.y < lowest) lowest = v.y;
        }
      });
      return landingY + lowest;
    };

    const worldY0 = getLowestWorldY(oreo0, landing0);
    const worldY45 = getLowestWorldY(oreo45, landing45);
    const worldY90 = getLowestWorldY(oreo90, landing90);
    const worldY150 = getLowestWorldY(oreo150, landing150);

    // 0 deg upright sits on surface with baseline nestle (4.985)
    expect(worldY0).toBeCloseTo(4.985, 2);
    // 45 deg tilt is buried deeper into the frosting than 0 deg
    expect(worldY45).toBeLessThan(worldY0);
    // 90 deg tilt (flat) is buried deeper than 45 deg
    expect(worldY90).toBeLessThan(worldY45);
    // 150 deg upside down is buried significantly deeper than 90 deg
    expect(worldY150).toBeLessThan(worldY90);
    // Upside down extra bury reaches > 0.20 depth into cake
    expect(topMetrics.baseY - worldY150).toBeGreaterThan(0.20);
  });

  it('buries Strawberry when standing upright and even deeper upside down', () => {
    const topMetrics = { baseY: 5.0, domeHeight: 0, radius: 4.0 };
    // Upright Strawberry (pointy apex tip pointing down)
    const strawberry0 = buildRotatedDecoration('strawberry', null, 0, 0, 1, '#F6DEAB', Math.random, 0);
    const landing0 = getDecorationLandingY(strawberry0, 0, 0, topMetrics);

    // Upside down Strawberry (leaves/calyx crown facing down)
    const tilt180 = Math.PI;
    const strawberry180 = buildRotatedDecoration('strawberry', null, tilt180, 0, 1, '#F6DEAB', Math.random, 0);
    const landing180 = getDecorationLandingY(strawberry180, 0, 0, topMetrics);

    // Upright strawberry has apex tip sunk into frosting (bury depth > 0.04)
    expect(topMetrics.baseY - landing0).toBeGreaterThan(0.04);
    // Upside down strawberry is buried even deeper into frosting than upright
    expect(landing180).toBeLessThan(landing0);
    expect(topMetrics.baseY - landing180).toBeGreaterThan(0.07);
  });

  it('buries Chocolate Bear progressively deeper per angle tilt and even deeper upside down', () => {
    const topMetrics = { baseY: 5.0, domeHeight: 0, radius: 4.0 };
    // Helper to find the actual lowest mesh vertex resting in the frosting
    const getLowestWorldY = (anchor, landingY) => {
      let lowest = Infinity;
      anchor.traverse((child) => {
        if (!child.isMesh || !child.geometry) return;
        const pos = child.geometry.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld);
          if (v.y < lowest) lowest = v.y;
        }
      });
      return landingY + lowest;
    };

    // Sitting upright (0 deg)
    const bear0 = buildRotatedDecoration('chocolateBear', null, 0, 0, 1, '#F6DEAB', Math.random, 0);
    const landing0 = getDecorationLandingY(bear0, 0, 0, topMetrics);

    // Tilted 45 deg
    const bear45 = buildRotatedDecoration('chocolateBear', null, Math.PI / 4, 0, 1, '#F6DEAB', Math.random, 0);
    const landing45 = getDecorationLandingY(bear45, 0, 0, topMetrics);

    // Tilted 90 deg (lying on back)
    const bear90 = buildRotatedDecoration('chocolateBear', null, Math.PI / 2, 0, 1, '#F6DEAB', Math.random, 0);
    const landing90 = getDecorationLandingY(bear90, 0, 0, topMetrics);

    // Tilted 150 deg (upside down)
    const tilt150 = THREE.MathUtils.degToRad(150);
    const bear150 = buildRotatedDecoration('chocolateBear', null, tilt150, 0, 1, '#F6DEAB', Math.random, 0);
    const landing150 = getDecorationLandingY(bear150, 0, 0, topMetrics);

    const worldY0 = getLowestWorldY(bear0, landing0);
    const worldY45 = getLowestWorldY(bear45, landing45);
    const worldY90 = getLowestWorldY(bear90, landing90);
    const worldY150 = getLowestWorldY(bear150, landing150);

    // Tilted 45 deg should be buried deeper into frosting than upright sitting
    expect(worldY45).toBeLessThan(worldY0);
    // Lying down 90 deg should be buried deeper than 45 deg
    expect(worldY90).toBeLessThan(worldY45);
    // Upside down 150 deg should be buried significantly deeper than 90 deg
    expect(worldY150).toBeLessThan(worldY90);
    // Upside down extra bury reaches > 0.20 depth into cake
    expect(topMetrics.baseY - worldY150).toBeGreaterThan(0.20);
  });

  it('buries 3D text designs progressively deeper as they tilt, with maximum bury upside down', () => {
    const topMetrics = {
      baseY: 4.0,
      domeHeight: 0.15,
      radius: 4.0,
    };

    function createLetterAnchor(designId, localUpY) {
      const anchor = new THREE.Group();
      anchor.userData.designId = designId;
      anchor.userData.localUpY = localUpY;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2));
      anchor.add(mesh);
      return anchor;
    }

    // Test both uppercase and lowercase letters
    for (const letterId of ['letterUpperA', 'letterLowerZ']) {
      const anchor0 = createLetterAnchor(letterId, 1.0); // Upright (0 deg)
      const landing0 = getDecorationLandingY(anchor0, 0, 0, topMetrics);

      const anchor45 = createLetterAnchor(letterId, Math.cos(Math.PI / 4)); // Tilted 45 deg
      const landing45 = getDecorationLandingY(anchor45, 0, 0, topMetrics);

      const anchor90 = createLetterAnchor(letterId, 0.0); // Lying flat (90 deg)
      const landing90 = getDecorationLandingY(anchor90, 0, 0, topMetrics);

      const anchor150 = createLetterAnchor(letterId, Math.cos(THREE.MathUtils.degToRad(150))); // Upside down (150 deg)
      const landing150 = getDecorationLandingY(anchor150, 0, 0, topMetrics);

      const anchor180 = createLetterAnchor(letterId, -1.0); // Completely upside down (180 deg)
      const landing180 = getDecorationLandingY(anchor180, 0, 0, topMetrics);

      // Tilted 45 deg should be buried deeper than sitting upright
      expect(landing45).toBeLessThan(landing0);
      // Lying down 90 deg has peak embed into surface frosting (buried deeper than 45 deg)
      expect(landing90).toBeLessThan(landing45);
      // Upside down bury is reduced compared to lying flat so tops don't sink deep
      expect(landing150).toBeGreaterThan(landing90);
      expect(landing180).toBeGreaterThan(landing90);
      expect(landing180).toBeCloseTo(landing0, 4);
    }
  });
});

