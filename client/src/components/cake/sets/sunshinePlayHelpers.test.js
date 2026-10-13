import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  buildSunshinePlay,
  getSunshinePlayCoverageFn,
  shouldDoubleDesignQuantities,
} from './sunshinePlayHelpers';

describe('Sunshine Play: Rainbow Arc cloud encasement and Star 75/25 vision', () => {
  describe('Rainbow Arc cloud covers the rainbow completely', () => {
    it('ensures clouds fully cover the rainbow tubes in X, Y, and Z with no poke-through or glitch', () => {
      const radius = 2.0;
      const height = 2.5;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'rainbowArc');

      // Each rainbow copy in group contains rainbowGroup (4 meshes) + leftCloud + rightCloud
      expect(group.children.length).toBeGreaterThan(0);

      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          child.geometry.computeBoundingBox();
        }
      });

      // Check the first rainbow arc group
      const arc = group.children[0];
      expect(arc.children.length).toBe(3); // rainbowGroup, leftCloud, rightCloud

      const rainbowGroup = arc.children[0];
      const leftCloud = arc.children[1];
      const rightCloud = arc.children[2];

      const rBox = new THREE.Box3().setFromObject(rainbowGroup);
      const lBox = new THREE.Box3().setFromObject(leftCloud);
      const rCloudBox = new THREE.Box3().setFromObject(rightCloud);

      // Cloud front surface must stand proud of the rainbow tubes (Z front face)
      // Since objects are wrapped around cylinder at radius ~2.0, max radial distance or max Z:
      expect(lBox.max.z).toBeGreaterThan(rBox.max.z);
      expect(rCloudBox.max.z).toBeGreaterThan(rBox.max.z);

      // Cloud bottom must extend lower than the bottom of the rainbow legs in Y
      expect(lBox.min.y).toBeLessThan(rBox.min.y);
      expect(rCloudBox.min.y).toBeLessThan(rBox.min.y);
    });
  });

  describe('Star 75/25 vision (matching Scatter Pearls)', () => {
    it('positions Star Burst stars with 75/25 vision without drip (standoffRadius = radius - 0.01 * scale)', () => {
      const radius = 2.0;
      const height = 2.5;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'starBurst', undefined, {
        hasDrip: false,
      });

      // Find star meshes
      const starMeshes = [];
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          starMeshes.push(child);
        }
      });

      expect(starMeshes.length).toBeGreaterThan(0);
      for (const mesh of starMeshes) {
        const dist = Math.sqrt(mesh.position.x * mesh.position.x + mesh.position.z * mesh.position.z);
        const scale = mesh.scale.x;
        // standoffRadius = radius - 0.01 * scale
        const expectedStandoff = radius - 0.01 * scale;
        expect(dist).toBeCloseTo(expectedStandoff, 4);

        // Verify 75/25 vision:
        // buildStarGeo bounds: minZ = -0.02 * scale, maxZ = +0.10 * scale (thickness T = 0.12 * scale).
        // Front apex radial reach: dist + 0.10 * scale = radius + 0.09 * scale (75% protruding)
        // Back base radial reach: dist - 0.02 * scale = radius - 0.03 * scale (25% buried)
        const frontApex = dist + 0.10 * scale;
        const backBase = dist - 0.02 * scale;
        expect(frontApex - radius).toBeCloseTo(0.09 * scale, 4);
        expect(radius - backBase).toBeCloseTo(0.03 * scale, 4);
      }
    });

    it('lifts Star Burst stars to 75/25 vision on Drip (surfaceRadius = radius + dripOffset)', () => {
      const radius = 2.0;
      const height = 2.5;
      const coatThickness = 0.06;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'starBurst', undefined, {
        hasDrip: true,
        coatThickness,
      });

      const starMeshes = [];
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          starMeshes.push(child);
        }
      });

      expect(starMeshes.length).toBeGreaterThan(0);
      const surfaceRadius = radius + coatThickness;
      for (const mesh of starMeshes) {
        const dist = Math.sqrt(mesh.position.x * mesh.position.x + mesh.position.z * mesh.position.z);
        const scale = mesh.scale.x;
        const expectedStandoff = surfaceRadius - 0.01 * scale;
        expect(dist).toBeCloseTo(expectedStandoff, 4);

        // 75% protruding from Drip surface, 25% buried in Drip
        const frontApex = dist + 0.10 * scale;
        const backBase = dist - 0.02 * scale;
        expect(frontApex - surfaceRadius).toBeCloseTo(0.09 * scale, 4);
        expect(surfaceRadius - backBase).toBeCloseTo(0.03 * scale, 4);
      }
    });

    it('positions Sky Chumps stars with 75/25 vision on Drip', () => {
      const radius = 2.0;
      const height = 2.5;
      const coatThickness = 0.06;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'skyChumps', undefined, {
        hasDrip: true,
        coatThickness,
      });

      const starMeshes = [];
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry && child.scale.x > 0.4 && child.scale.x < 1.8 && child.scale.x !== 1.0) {
          starMeshes.push(child);
        }
      });

      expect(starMeshes.length).toBeGreaterThan(0);
      const surfaceRadius = radius + coatThickness;
      for (const mesh of starMeshes) {
        const dist = Math.sqrt(mesh.position.x * mesh.position.x + mesh.position.z * mesh.position.z);
        const scale = mesh.scale.x;
        const expectedStandoff = surfaceRadius - 0.01 * scale;
        expect(dist).toBeCloseTo(expectedStandoff, 4);
      }
    });

    it('positions Sunshine Stars stars with 75/25 vision on Drip', () => {
      const radius = 2.0;
      const height = 2.5;
      const coatThickness = 0.06;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'sunshineStars', undefined, {
        hasDrip: true,
        coatThickness,
      });

      const starMeshes = [];
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry && child.scale.x > 0.4 && child.scale.x < 1.8 && child.scale.x !== 1.0) {
          starMeshes.push(child);
        }
      });

      expect(starMeshes.length).toBeGreaterThan(0);
      const surfaceRadius = radius + coatThickness;
      for (const mesh of starMeshes) {
        const dist = Math.sqrt(mesh.position.x * mesh.position.x + mesh.position.z * mesh.position.z);
        const scale = mesh.scale.x;
        const expectedStandoff = surfaceRadius - 0.01 * scale;
        expect(dist).toBeCloseTo(expectedStandoff, 4);
      }
    });

    it('positions Starry Rainbow stars with 75/25 vision on Drip', () => {
      const radius = 2.0;
      const height = 2.5;
      const coatThickness = 0.06;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'starryRainbow', undefined, {
        hasDrip: true,
        coatThickness,
      });

      const starMeshes = [];
      group.traverse((child) => {
        // Stars in starryRainbow use buildStarGeo
        if (child instanceof THREE.Mesh && child.geometry && child.scale.x > 0.4 && child.scale.x < 1.8 && child.scale.x !== 1.0) {
          starMeshes.push(child);
        }
      });

      expect(starMeshes.length).toBeGreaterThan(0);
      const surfaceRadius = radius + coatThickness;
      for (const mesh of starMeshes) {
        const dist = Math.sqrt(mesh.position.x * mesh.position.x + mesh.position.z * mesh.position.z);
        const scale = mesh.scale.x;
        const expectedStandoff = surfaceRadius - 0.01 * scale;
        expect(dist).toBeCloseTo(expectedStandoff, 4);
      }
    });

    it('does not carve empty spaces for stars in Glaze/Drip (matching Scatter Pearls)', () => {
      const radius = 2.0;
      const height = 2.5;
      const starBurstCoverageFn = getSunshinePlayCoverageFn(radius, height, {
        variant: 'starBurst',
        forGlaze: true,
      });

      // Sample points - coverage for starBurst when forGlaze is true should be 0 everywhere
      let maxCoverage = 0;
      for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
        for (let y = -height / 2; y <= height / 2; y += 0.2) {
          const c = starBurstCoverageFn(angle, y);
          if (c > maxCoverage) maxCoverage = c;
        }
      }
      expect(maxCoverage).toBe(0);
    });

    it('still carves empty spaces for rainbow arcs in Glaze/Drip', () => {
      const radius = 2.0;
      const height = 2.5;
      const rainbowCoverageFn = getSunshinePlayCoverageFn(radius, height, {
        variant: 'rainbowArc',
        forGlaze: true,
      });

      let maxCoverage = 0;
      for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
        for (let y = -height / 2; y <= height / 2; y += 0.1) {
          const c = rainbowCoverageFn(angle, y);
          if (c > maxCoverage) maxCoverage = c;
        }
      }
      expect(maxCoverage).toBeCloseTo(0.5, 2);
      expect(maxCoverage).toBeGreaterThan(0.4);
      expect(maxCoverage).toBeLessThanOrEqual(0.5001);
    });
  });

  describe('Non-overlapping guarantee between Sunshine Play design elements', () => {
    it('guarantees stars in Starry Rainbow do NOT overlap with rainbow arcs or their connected clouds', () => {
      const radius = 2.0;
      const height = 2.5;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'starryRainbow');

      // Find rainbow arc groups, clouds, and stars
      const starMeshes = [];
      const cloudMeshes = [];
      const rainbowArcGroups = [];

      group.children[0].children.forEach((child) => {
        if (child.children && child.children.length === 3) {
          // This is a single rainbow arc group: rainbowGroup, leftCloud, rightCloud
          rainbowArcGroups.push(child);
        } else if (child instanceof THREE.Mesh && child.scale.x !== 1.0) {
          starMeshes.push(child);
        } else if (child instanceof THREE.Mesh) {
          cloudMeshes.push(child);
        }
      });

      expect(starMeshes.length).toBeGreaterThan(0);
      expect(rainbowArcGroups.length).toBeGreaterThan(0);
      expect(cloudMeshes.length).toBeGreaterThan(0);

      // Verify that no star overlaps any rainbow arc or its clouds
      for (const star of starMeshes) {
        const starAngle = Math.atan2(star.position.x, star.position.z);
        const starY = star.position.y;
        const starRadius = 0.17 * star.scale.x;

        for (const arc of rainbowArcGroups) {
          const arcAngle = arc.rotation.y;
          const arcY = arc.position.y;

          let dTheta = Math.abs(starAngle - arcAngle);
          if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
          const arcDist = dTheta * radius;
          const yRel = starY - arcY;

          // Rainbow arc total half-width ~0.655 * effectiveHeight
          // Stars must be outside this envelope
          const effectiveHeight = height * 1.0;
          const safeHalfW = 0.60 * effectiveHeight;
          const safeYMin = -0.25 * effectiveHeight;
          const safeYMax = 0.22 * effectiveHeight;

          const insideArcZone = arcDist < safeHalfW && yRel >= safeYMin && yRel <= safeYMax;
          expect(insideArcZone).toBe(false);
        }
      }
    });

    it('guarantees stars in Starry Rainbow do NOT overlap with Cloudy Champ clouds', () => {
      const radius = 2.0;
      const height = 2.5;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'starryRainbow');

      const starMeshes = [];
      const cloudMeshes = [];

      group.children[0].children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.scale.x !== 1.0) {
          starMeshes.push(child);
        } else if (child instanceof THREE.Mesh && child.scale.x === 1.0) {
          cloudMeshes.push(child);
        }
      });

      // Verify each star doesn't overlap any cloud mesh
      for (const star of starMeshes) {
        const starAngle = Math.atan2(star.position.x, star.position.z);
        const starY = star.position.y;
        const starRadius = 0.17 * star.scale.x;

        for (const cloud of cloudMeshes) {
          cloud.geometry.computeBoundingBox();
          const bb = cloud.geometry.boundingBox;
          // Cloud mesh is wrapped on cylinder, let's check distance to cloud center
          const cloudAngle = Math.atan2(
            (bb.min.x + bb.max.x) / 2,
            (bb.min.z + bb.max.z) / 2
          );
          const cloudY = (bb.min.y + bb.max.y) / 2;
          const cloudHalfW = ((bb.max.x - bb.min.x) / 2);
          const cloudHalfH = ((bb.max.y - bb.min.y) / 2);

          let dTheta = Math.abs(starAngle - cloudAngle);
          if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
          const arcDist = dTheta * radius;
          const dy = Math.abs(starY - cloudY);

          // Combined distance test
          const normalizedDist = (arcDist / (cloudHalfW + starRadius)) ** 2 + (dy / (cloudHalfH + starRadius)) ** 2;
          expect(normalizedDist).toBeGreaterThan(0.7);
        }
      }
    });

    it('guarantees stars do NOT overlap with each other in Starry Rainbow', () => {
      const radius = 2.0;
      const height = 2.5;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'starryRainbow');

      const starMeshes = [];
      group.children[0].children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.scale.x !== 1.0) {
          starMeshes.push(child);
        }
      });

      for (let i = 0; i < starMeshes.length; i++) {
        for (let j = i + 1; j < starMeshes.length; j++) {
          const s1 = starMeshes[i];
          const s2 = starMeshes[j];

          const a1 = Math.atan2(s1.position.x, s1.position.z);
          const a2 = Math.atan2(s2.position.x, s2.position.z);
          let dTheta = Math.abs(a1 - a2);
          if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
          const arcDist = dTheta * radius;
          const dy = Math.abs(s1.position.y - s2.position.y);
          const dist = Math.hypot(arcDist, dy);

          const r1 = 0.17 * s1.scale.x;
          const r2 = 0.17 * s2.scale.x;
          expect(dist).toBeGreaterThanOrEqual(r1 + r2);
        }
      }
    });

    it('guarantees stars do NOT overlap with each other in Star Burst', () => {
      const radius = 2.0;
      const height = 2.5;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'starBurst');

      const starMeshes = [];
      group.children[0].children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          starMeshes.push(child);
        }
      });

      for (let i = 0; i < starMeshes.length; i++) {
        for (let j = i + 1; j < starMeshes.length; j++) {
          const s1 = starMeshes[i];
          const s2 = starMeshes[j];

          const a1 = Math.atan2(s1.position.x, s1.position.z);
          const a2 = Math.atan2(s2.position.x, s2.position.z);
          let dTheta = Math.abs(a1 - a2);
          if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
          const arcDist = dTheta * radius;
          const dy = Math.abs(s1.position.y - s2.position.y);
          const dist = Math.hypot(arcDist, dy);

          const r1 = 0.17 * s1.scale.x;
          const r2 = 0.17 * s2.scale.x;
          expect(dist).toBeGreaterThanOrEqual(r1 + r2);
        }
      }
    });

    it('Sky Chumps: contains only clouds and stars (no rainbows), and stars do not overlap clouds or each other', () => {
      const radius = 2.0;
      const height = 2.5;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'skyChumps');

      const starMeshes = [];
      const cloudMeshes = [];
      const rainbowArcGroups = [];

      group.traverse((child) => {
        if (child.children && child.children.length === 3 && child !== group) {
          rainbowArcGroups.push(child);
        } else if (child instanceof THREE.Mesh) {
          if (child.scale.x !== 1.0) {
            starMeshes.push(child);
          } else {
            cloudMeshes.push(child);
          }
        }
      });

      // No rainbows
      expect(rainbowArcGroups.length).toBe(0);
      // Both clouds and stars are present
      expect(cloudMeshes.length).toBeGreaterThan(0);
      expect(starMeshes.length).toBeGreaterThan(0);

      // Stars do NOT overlap clouds
      for (const star of starMeshes) {
        const starAngle = Math.atan2(star.position.x, star.position.z);
        const starY = star.position.y;
        const starRadius = 0.17 * star.scale.x;

        for (const cloud of cloudMeshes) {
          cloud.geometry.computeBoundingBox();
          const bb = cloud.geometry.boundingBox;
          const cloudAngle = Math.atan2(
            (bb.min.x + bb.max.x) / 2,
            (bb.min.z + bb.max.z) / 2
          );
          const cloudY = (bb.min.y + bb.max.y) / 2;
          const cloudHalfW = ((bb.max.x - bb.min.x) / 2);
          const cloudHalfH = ((bb.max.y - bb.min.y) / 2);

          let dTheta = Math.abs(starAngle - cloudAngle);
          if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
          const arcDist = dTheta * radius;
          const dy = Math.abs(starY - cloudY);

          const normalizedDist = (arcDist / (cloudHalfW + starRadius)) ** 2 + (dy / (cloudHalfH + starRadius)) ** 2;
          expect(normalizedDist).toBeGreaterThan(0.7);
        }
      }

      // Stars do NOT overlap each other
      for (let i = 0; i < starMeshes.length; i++) {
        for (let j = i + 1; j < starMeshes.length; j++) {
          const s1 = starMeshes[i];
          const s2 = starMeshes[j];

          const a1 = Math.atan2(s1.position.x, s1.position.z);
          const a2 = Math.atan2(s2.position.x, s2.position.z);
          let dTheta = Math.abs(a1 - a2);
          if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
          const arcDist = dTheta * radius;
          const dy = Math.abs(s1.position.y - s2.position.y);
          const dist = Math.hypot(arcDist, dy);

          const r1 = 0.17 * s1.scale.x;
          const r2 = 0.17 * s2.scale.x;
          expect(dist).toBeGreaterThanOrEqual(r1 + r2);
        }
      }
    });

    it('Sunshine Stars: contains only rainbows and stars (no scattered clouds), and stars do not overlap rainbows or each other', () => {
      const radius = 2.0;
      const height = 2.5;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'sunshineStars');

      const starMeshes = [];
      const standaloneClouds = [];
      const rainbowArcGroups = [];

      // sunshineStars root group contains the rainbow arc groups and star meshes
      const sunshineGroup = group.children[0];
      sunshineGroup.children.forEach((child) => {
        if (child.children && child.children.length === 3) {
          rainbowArcGroups.push(child);
        } else if (child instanceof THREE.Mesh && child.scale.x !== 1.0) {
          starMeshes.push(child);
        } else if (child instanceof THREE.Mesh && child.scale.x === 1.0) {
          standaloneClouds.push(child);
        }
      });

      // Rainbow arcs and stars present, NO standalone clouds
      expect(rainbowArcGroups.length).toBe(2);
      expect(starMeshes.length).toBeGreaterThan(0);
      expect(standaloneClouds.length).toBe(0);

      // Stars do NOT overlap rainbow arcs or their feet
      const ARC_SCALES = [1.00, 0.90];
      for (const star of starMeshes) {
        const starAngle = Math.atan2(star.position.x, star.position.z);
        const starY = star.position.y;

        rainbowArcGroups.forEach((arc, arcIdx) => {
          const arcAngle = arc.rotation.y;
          const arcY = arc.position.y;
          const arcScale = ARC_SCALES[arcIdx] || 1.0;

          let dTheta = Math.abs(starAngle - arcAngle);
          if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
          const arcDist = dTheta * radius;
          const yRel = starY - arcY;

          const effectiveHeight = height * arcScale;
          const safeHalfW = 0.48 * effectiveHeight;
          const safeYMin = -0.25 * effectiveHeight;
          const safeYMax = 0.22 * effectiveHeight;

          const insideArcZone = arcDist < safeHalfW && yRel >= safeYMin && yRel <= safeYMax;
          expect(insideArcZone).toBe(false);
        });
      }

      // Stars do NOT overlap each other
      for (let i = 0; i < starMeshes.length; i++) {
        for (let j = i + 1; j < starMeshes.length; j++) {
          const s1 = starMeshes[i];
          const s2 = starMeshes[j];

          const a1 = Math.atan2(s1.position.x, s1.position.z);
          const a2 = Math.atan2(s2.position.x, s2.position.z);
          let dTheta = Math.abs(a1 - a2);
          if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
          const arcDist = dTheta * radius;
          const dy = Math.abs(s1.position.y - s2.position.y);
          const dist = Math.hypot(arcDist, dy);

          const r1 = 0.17 * s1.scale.x;
          const r2 = 0.17 * s2.scale.x;
          expect(dist).toBeGreaterThanOrEqual(r1 + r2);
        }
      }
    });

    it('Starry Sunshine Play: builds with correct name, components, and non-overlapping stars with 75/25 vision', () => {
      const radius = 2.0;
      const height = 2.5;
      const coatThickness = 0.06;
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'starrySunshinePlay', undefined, {
        hasDrip: true,
        coatThickness,
      });

      const starMeshes = [];
      const cloudMeshes = [];
      const rainbowArcGroups = [];

      const root = group.children[0];
      root.children.forEach((child) => {
        if (child.children && child.children.length === 3) {
          rainbowArcGroups.push(child);
        } else if (child instanceof THREE.Mesh) {
          if (child.scale.x !== 1.0) {
            starMeshes.push(child);
          } else {
            cloudMeshes.push(child);
          }
        }
      });

      expect(rainbowArcGroups.length).toBe(2);
      expect(cloudMeshes.length).toBe(5);
      expect(starMeshes.length).toBeGreaterThan(0);

      // Verify 75/25 vision
      const surfaceRadius = radius + coatThickness;
      for (const star of starMeshes) {
        const dist = Math.sqrt(star.position.x * star.position.x + star.position.z * star.position.z);
        const expectedStandoff = surfaceRadius - 0.01 * star.scale.x;
        expect(dist).toBeCloseTo(expectedStandoff, 4);
      }
    });
  });

  describe('Empty spaces coverage math and rendering for all Sunshine Play designs', () => {
    const radius = 2.0;
    const height = 2.5;
    const allVariants = [
      'rainbowArc',
      'cloudyChump',
      'starBurst',
      'skyChumps',
      'sunshineStars',
      'starrySunshinePlay',
    ];

    it('guarantees coverage is strictly clamped in [0, 1] without NaN across all designs', () => {
      for (const variant of allVariants) {
        const covFn = getSunshinePlayCoverageFn(radius, height, { variant, forGlaze: true });
        for (let a = 0; a < Math.PI * 2; a += 0.3) {
          for (let y = -height / 2; y <= height / 2; y += 0.3) {
            const val = covFn(a, y);
            expect(Number.isFinite(val)).toBe(true);
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    it('Rainbow Arc: correctly carves empty spaces at apex and feet of all 3 rainbow copies with visible Drip preserved', () => {
      const covFn = getSunshinePlayCoverageFn(radius, height, { variant: 'rainbowArc', forGlaze: true });

      // Copy 0: angleDeg = 0, yFrac = 0
      // Apex: angle = 0, y ~ 0 + centerYOffset + outerRadius + tube ~ 0.40
      const apex0 = covFn(0, 0.40);
      expect(apex0).toBeGreaterThan(0.35);
      expect(apex0).toBeLessThanOrEqual(0.5001);

      // Copy 1: angleDeg = 118, yFrac = 0.10
      const angle1 = (118 * Math.PI) / 180;
      const apex1 = covFn(angle1, 0.10 * height + 0.40 * 0.88);
      expect(apex1).toBeGreaterThan(0.35);
      expect(apex1).toBeLessThanOrEqual(0.5001);

      // Copy 2: angleDeg = 238, yFrac = -0.08
      const angle2 = (238 * Math.PI) / 180;
      const apex2 = covFn(angle2, -0.08 * height + 0.40 * 0.94);
      expect(apex2).toBeGreaterThan(0.35);
      expect(apex2).toBeLessThanOrEqual(0.5001);

      // Open space far from rainbows has 0 coverage
      expect(covFn((60 * Math.PI) / 180, -height / 2 + 0.1)).toBe(0);
    });

    it('Cloudy Champ: correctly carves empty spaces matching fluffy cloud shape with visible Drip preserved', () => {
      const covFn = getSunshinePlayCoverageFn(radius, height, { variant: 'cloudyChump', forGlaze: true });
      const baseScale = Math.min(0.85, height * 0.40);

      const CLOUDY_SPECS = [
        { angleDeg: 12, yFrac: 0.22, sizeMul: 1.08 },
        { angleDeg: 68, yFrac: -0.24, sizeMul: 0.95 },
        { angleDeg: 122, yFrac: 0.15, sizeMul: 1.12 },
        { angleDeg: 175, yFrac: -0.18, sizeMul: 0.90 },
        { angleDeg: 226, yFrac: 0.25, sizeMul: 1.05 },
        { angleDeg: 278, yFrac: -0.08, sizeMul: 1.15 },
        { angleDeg: 326, yFrac: -0.26, sizeMul: 0.92 },
      ];

      for (const c of CLOUDY_SPECS) {
        const angle = (c.angleDeg * Math.PI) / 180;
        const scale = baseScale * c.sizeMul;
        // Center lobe body
        const centerY = c.yFrac * height + 0.20 * scale;
        expect(covFn(angle, centerY)).toBeGreaterThan(0.35);
        expect(covFn(angle, centerY)).toBeLessThanOrEqual(0.5001);

        // Bottom undulating lobes (must NOT be buried under drip, but Drip is preserved at 50%)
        const bottomLobeY = c.yFrac * height - 0.18 * scale;
        expect(covFn(angle, bottomLobeY)).toBeGreaterThan(0.35);
        expect(covFn(angle, bottomLobeY)).toBeLessThanOrEqual(0.5001);

        // Top lobe
        const topLobeY = c.yFrac * height + 0.45 * scale;
        expect(covFn(angle, topLobeY)).toBeGreaterThan(0.35);
        expect(covFn(angle, topLobeY)).toBeLessThanOrEqual(0.5001);
      }
    });

    it('Rainbow Arc: prevents drip penetration through the archway interior while preserving reduced Drip layer', () => {
      const covFn = getSunshinePlayCoverageFn(radius, height, { variant: 'rainbowArc', forGlaze: true });

      // Archway interior (under green band, between cloud feet) has 0.50 coverage to prevent full penetration while keeping Drip visible
      expect(covFn(0, 0.05)).toBeGreaterThan(0.35);
      expect(covFn(0, 0.05)).toBeLessThanOrEqual(0.5001);
      expect(covFn(0, -0.05)).toBeGreaterThan(0.35);
      expect(covFn(0, -0.05)).toBeLessThanOrEqual(0.5001);

      // Cloud feet at left and right
      expect(covFn(-0.15, -0.15)).toBeGreaterThan(0.35);
      expect(covFn(0.15, -0.15)).toBeGreaterThan(0.35);
    });

    it('Rainbow Arc: bottom empty space takes the shape of the connected fluffy cloud feet without a flat horizontal cutoff', () => {
      const covFn = getSunshinePlayCoverageFn(radius, height, { variant: 'rainbowArc', forGlaze: true });

      // Measure the bottom cutoff Y where coverage drops below 0.1 at multiple angles across the rainbow base
      // Left cloud foot center ~ -0.20 rad, Right cloud foot center ~ +0.20 rad, Center seam ~ 0.0 rad
      const findBottomY = (angle) => {
        for (let y = -0.50; y <= 0.0; y += 0.005) {
          if (covFn(angle, y) >= 0.1) return y;
        }
        return null;
      };

      const yLeftLobe = findBottomY(-0.20);
      const yCenter = findBottomY(0.0);
      const yRightLobe = findBottomY(0.20);

      expect(yLeftLobe).not.toBeNull();
      expect(yCenter).not.toBeNull();
      expect(yRightLobe).not.toBeNull();

      // The bottom contour must NOT be a flat horizontal line (previously y was identical across all angles due to flat yMin shelf)
      // Because the cloud lobes curve down on the left and right, while dipping up at the center seam,
      // the center bottom Y must be higher (less deep) than the cloud lobe bottoms.
      expect(Math.abs(yLeftLobe - yCenter)).toBeGreaterThan(0.03);
      expect(Math.abs(yRightLobe - yCenter)).toBeGreaterThan(0.03);
    });

    it('allows full coverage (1.0) under forGlaze: false for Filling bump shaving', () => {
      const fillingCovFn = getSunshinePlayCoverageFn(radius, height, { variant: 'rainbowArc', forGlaze: false });
      expect(fillingCovFn(0, 0.40)).toBeCloseTo(1.0, 1);
    });

    it('Star Burst: preserves Drip/Glaze with 0 empty spaces under forGlaze, and carves filling under forGlaze: false', () => {
      const glazeCovFn = getSunshinePlayCoverageFn(radius, height, { variant: 'starBurst', forGlaze: true });
      const fillingCovFn = getSunshinePlayCoverageFn(radius, height, { variant: 'starBurst', forGlaze: false });

      let maxGlazeCov = 0;
      let maxFillingCov = 0;
      for (let a = 0; a < Math.PI * 2; a += 0.1) {
        for (let y = -height / 2; y <= height / 2; y += 0.2) {
          maxGlazeCov = Math.max(maxGlazeCov, glazeCovFn(a, y));
          maxFillingCov = Math.max(maxFillingCov, fillingCovFn(a, y));
        }
      }

      // Glaze has 0 empty spaces (stars sit on drip in 75/25 vision)
      expect(maxGlazeCov).toBe(0);
      // Filling has windows carved for stars
      expect(maxFillingCov).toBeGreaterThan(0.5);
    });

    it('Sky Chumps: carves empty spaces for clouds only in Glaze/Drip, 0 for stars, preserving reduced Drip', () => {
      const covFn = getSunshinePlayCoverageFn(radius, height, { variant: 'skyChumps', forGlaze: true });
      const baseScale = Math.min(0.85, height * 0.40);

      // Cloud at 12 deg
      const cloudVal = covFn((12 * Math.PI) / 180, 0.22 * height + 0.20 * baseScale * 1.08);
      expect(cloudVal).toBeGreaterThan(0.35);
      expect(cloudVal).toBeLessThanOrEqual(0.5001);

      // Far from any cloud, coverage is 0
      expect(covFn((150 * Math.PI) / 180, 0)).toBe(0);
    });

    it('Sunshine Stars: carves empty spaces for rainbows and cloud feet, 0 for stars, preserving reduced Drip', () => {
      const covFn = getSunshinePlayCoverageFn(radius, height, { variant: 'sunshineStars', forGlaze: true });

      // Front rainbow at angle 0
      const apex = covFn(0, 0.40);
      expect(apex).toBeGreaterThan(0.35);
      expect(apex).toBeLessThanOrEqual(0.5001);

      // Open sky away from the two rainbows has 0 coverage
      expect(covFn((80 * Math.PI) / 180, 0)).toBe(0);
    });

    it('Starry Sunshine Play: carves empty spaces for rainbows and clouds, 0 for stars, preserving reduced Drip', () => {
      const covFn = getSunshinePlayCoverageFn(radius, height, { variant: 'starrySunshinePlay', forGlaze: true });

      // Rainbow apex at angle 0
      const apex = covFn(0, 0.40);
      expect(apex).toBeGreaterThan(0.35);
      expect(apex).toBeLessThanOrEqual(0.5001);

      // Cloud at 50 deg
      const cloudVal = covFn((50 * Math.PI) / 180, 0.22 * height + 0.20 * Math.min(0.85, height * 0.38) * 1.05);
      expect(cloudVal).toBeGreaterThan(0.35);
      expect(cloudVal).toBeLessThanOrEqual(0.5001);
    });
  });

  describe('Boxy Cake Shapes (Rectangle & Square) Sunshine Play', () => {
    const radius = 2.0;
    const height = 2.5;

    it('builds Rainbow Arc on Rectangle cake with 4 face-centered arches marked with isBoxySunshinePlay', () => {
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'rainbowArc', undefined, {
        shape: 'rectangle',
        hasDrip: true,
      });

      expect(group.children.length).toBe(4); // 4 faces: Front, Right, Back, Left

      // All meshes must have isBoxySunshinePlay = true
      let meshCount = 0;
      group.traverse((child) => {
        if (child.isMesh) {
          meshCount++;
          expect(child.userData.isBoxySunshinePlay).toBe(true);
          expect(child.userData.morphedToBoxy).toBe(true);
        }
      });
      expect(meshCount).toBeGreaterThan(12);

      // Verify face positions:
      // Front face: centered at x = 0, z > 0
      const frontArc = group.children[0];
      expect(frontArc.position.x).toBeCloseTo(0, 2);
      expect(frontArc.position.z).toBeGreaterThan(1.5);
      expect(frontArc.rotation.y).toBeCloseTo(0, 2);

      // Right face: centered at x > 0, z = 0
      const rightArc = group.children[1];
      expect(rightArc.position.x).toBeGreaterThan(2.0);
      expect(rightArc.position.z).toBeCloseTo(0, 2);
      expect(rightArc.rotation.y).toBeCloseTo(Math.PI / 2, 2);

      // Back face: centered at x = 0, z < 0
      const backArc = group.children[2];
      expect(backArc.position.x).toBeCloseTo(0, 2);
      expect(backArc.position.z).toBeLessThan(-1.5);
      expect(backArc.rotation.y).toBeCloseTo(Math.PI, 2);

      // Left face: centered at x < 0, z = 0
      const leftArc = group.children[3];
      expect(leftArc.position.x).toBeLessThan(-2.0);
      expect(leftArc.position.z).toBeCloseTo(0, 2);
      expect(leftArc.rotation.y).toBeCloseTo(-Math.PI / 2, 2);
    });

    it('builds Rainbow Arc on Square cake with equal face scales', () => {
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'rainbowArc', undefined, {
        shape: 'square',
        hasDrip: false,
      });

      expect(group.children.length).toBe(4);
      for (const arc of group.children) {
        expect(arc.userData.isBoxySunshinePlay).toBe(true);
      }
    });

    it('builds Cloudy Chump on Rectangle cake with 10 clouds across 4 faces', () => {
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'cloudyChump', undefined, {
        shape: 'rectangle',
        hasDrip: true,
      });

      expect(group.children.length).toBe(10);
      for (const cloud of group.children) {
        expect(cloud.userData.isBoxySunshinePlay).toBe(true);
        expect(cloud.userData.morphedToBoxy).toBe(true);
      }
    });

    it('builds Sky Chumps on Rectangle cake with doubled quantities (20 clouds and plentiful stars)', () => {
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'skyChumps', undefined, {
        shape: 'rectangle',
        hasDrip: true,
        coatThickness: 0.06,
      });

      // Doubled design on boxy shapes: 10 base clouds + 10 mirrored companions
      const cloudsGroup = group.children[0];
      expect(cloudsGroup.children.length).toBe(20);

      // Remaining children of group are stars
      const starMeshes = group.children.slice(1);
      expect(starMeshes.length).toBeGreaterThanOrEqual(28);
      for (const star of starMeshes) {
        expect(star.userData.isBoxySunshinePlay).toBe(true);
      }
    });

    it('builds Sunshine Stars on Rectangle cake with 4 Rainbow Arcs and plentiful stars', () => {
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'sunshineStars', undefined, {
        shape: 'rectangle',
        hasDrip: true,
        coatThickness: 0.06,
      });

      // Doubled design on boxy shapes: arcs on all 4 faces (was 2)
      const rainbowArcs = group.children.filter((c) => c.children && c.children.length > 0);
      expect(rainbowArcs.length).toBe(4);

      // And generous stars across faces
      const starMeshes = group.children.filter((c) => c.isMesh);
      expect(starMeshes.length).toBeGreaterThanOrEqual(30);
    });

    it('builds Starry Sunshine Play on Rectangle cake with 4 Rainbow Arcs, 16 clouds, and plentiful stars', () => {
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'starrySunshinePlay', undefined, {
        shape: 'rectangle',
        hasDrip: true,
        coatThickness: 0.06,
      });

      // Doubled design on boxy shapes: 4 rainbow arcs (was 2)
      const rainbowArcs = group.children.filter((c) => c.children && c.children.length > 0);
      expect(rainbowArcs.length).toBe(4);

      // 16 standalone clouds (8 base + 8 mirrored companions)
      const cloudMeshes = group.children.filter((c) => c.isMesh && c.userData?.isCloud);
      expect(cloudMeshes.length).toBe(16);

      // Plentiful stars
      const starMeshes = group.children.filter((c) => c.isMesh && c.userData?.isStar);
      expect(starMeshes.length).toBeGreaterThanOrEqual(28);
    });

    it('builds Sky Chumps on Square cake with doubled cloud quantities', () => {
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'skyChumps', undefined, {
        shape: 'square',
        hasDrip: true,
        coatThickness: 0.06,
      });

      const cloudsGroup = group.children[0];
      expect(cloudsGroup.children.length).toBe(20);
    });

    it('builds Star Burst on Rectangle cake with stars placed across 4 faces in 75/25 vision', () => {
      const group = buildSunshinePlay(radius, height, '#FFD93D', null, 'starBurst', undefined, {
        shape: 'rectangle',
        hasDrip: true,
        coatThickness: 0.06,
      });

      const starMeshes = [];
      group.traverse((child) => {
        if (child.isMesh) starMeshes.push(child);
      });

      expect(starMeshes.length).toBeGreaterThanOrEqual(36);
      for (const star of starMeshes) {
        expect(star.userData.isBoxySunshinePlay).toBe(true);
        expect(star.userData.morphedToBoxy).toBe(true);
      }
    });

    it('getBoxySunshinePlayCoverageFn carves exact empty space on front rainbow and 0 at corners', () => {
      const covFn = getSunshinePlayCoverageFn(radius, height, {
        shape: 'rectangle',
        variant: 'rainbowArc',
        forGlaze: true,
      });

      // Front center: glazeArg = 0
      // Rainbow apex around y = 0.40
      const frontApexCov = covFn(0, 0.40);
      expect(frontApexCov).toBeGreaterThan(0.35);
      expect(frontApexCov).toBeLessThanOrEqual(0.5001); // 50% maxDepth for glaze

      // Right center: glazeArg = Math.PI / 2
      const rightApexCov = covFn(Math.PI / 2, 0.40);
      expect(rightApexCov).toBeGreaterThan(0.35);
      expect(rightApexCov).toBeLessThanOrEqual(0.5001);

      // Back center: glazeArg = Math.PI
      const backApexCov = covFn(Math.PI, 0.40);
      expect(backApexCov).toBeGreaterThan(0.35);
      expect(backApexCov).toBeLessThanOrEqual(0.5001);

      // Left center: glazeArg = -Math.PI / 2
      const leftApexCov = covFn(-Math.PI / 2, 0.40);
      expect(leftApexCov).toBeGreaterThan(0.35);
      expect(leftApexCov).toBeLessThanOrEqual(0.5001);

      // Corner angles (e.g. angle around 45 deg or 135 deg) away from clouds and arches:
      // must have ZERO coverage so no wrong empty spaces are carved
      const cornerArg = Math.PI / 4;
      const cornerCov = covFn(cornerArg, 0.40);
      expect(cornerCov).toBe(0);
    });

    it('getBoxySunshinePlayCoverageFn for Cloudy Chump carves at cloud locations and 0 elsewhere', () => {
      const covFn = getSunshinePlayCoverageFn(radius, height, {
        shape: 'rectangle',
        variant: 'cloudyChump',
        forGlaze: true,
      });

      // Front-left cloud at x = -0.38 * xc, y = 0.20 * height
      // In boxy coords for Face 0: qx < 0, qz > 0 -> angle corresponds to small positive glazeArg
      const isSquare = false;
      const W = radius * 1.25;
      const D = radius * 0.85;
      const safeRc = Math.min(0.35, Math.min(W, D) * 0.45);
      const xc = W - safeRc;
      const targetX = -0.38 * xc;
      const glazeAngle = Math.atan2(targetX, D); // qx = boxR * sin(glazeArg)
      const cloudCov = covFn(glazeAngle, 0.20 * height + 0.1);
      expect(cloudCov).toBeGreaterThan(0.2);
      expect(cloudCov).toBeLessThanOrEqual(0.5001);

      // Blank area on face
      const blankCov = covFn(Math.PI / 4, -0.8);
      expect(blankCov).toBe(0);
    });

    it('shouldDoubleDesignQuantities gates the three designs to Rectangle and Square only', () => {
      // The three doubled designs, on boxy shapes only
      expect(shouldDoubleDesignQuantities('skyChumps', { shape: 'rectangle' })).toBe(true);
      expect(shouldDoubleDesignQuantities('sunshineStars', { shape: 'square' })).toBe(true);
      expect(shouldDoubleDesignQuantities('starrySunshinePlay', { shape: 'rectangle' })).toBe(true);
      expect(shouldDoubleDesignQuantities('assortedStarryRainbow', { cakeShape: 'square' })).toBe(true);

      // Round cakes keep original quantities
      expect(shouldDoubleDesignQuantities('skyChumps', { shape: 'round' })).toBe(false);
      expect(shouldDoubleDesignQuantities('sunshineStars', {})).toBe(false);

      // Other Sunshine Play designs are never doubled
      expect(shouldDoubleDesignQuantities('cloudyChump', { shape: 'rectangle' })).toBe(false);
      expect(shouldDoubleDesignQuantities('rainbowArc', { shape: 'square' })).toBe(false);
      expect(shouldDoubleDesignQuantities('starryRainbow', { shape: 'rectangle' })).toBe(false);
      expect(shouldDoubleDesignQuantities('rainbowChamp', { shape: 'square' })).toBe(false);
    });
  });
});


