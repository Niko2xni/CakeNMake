import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { getFrostingMaterial } from './frostingMaterial';

describe('frostingMaterial', () => {
  it('returns materials with distinct colors and program cache keys', () => {
    const matVanilla = getFrostingMaterial('#FFF8E7', 'vanilla');
    const matChocolate = getFrostingMaterial('#4A2C11', 'chocolate');

    expect(matVanilla.color.getHexString().toLowerCase()).toBe('fff8e7');
    expect(matChocolate.color.getHexString().toLowerCase()).toBe('4a2c11');
    expect(matVanilla.userData.frostColor).toBe('#FFF8E7');
    expect(matChocolate.userData.frostColor).toBe('#4A2C11');
    expect(matVanilla.customProgramCacheKey()).not.toBe(matChocolate.customProgramCacheKey());
  });

  it('supports polygonOffset and clippingPlanes options with separate cache', () => {
    const baseMat = getFrostingMaterial('#4A2C11', 'chocolate');
    const offsetMat = getFrostingMaterial('#4A2C11', 'chocolate', {
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      clippingPlanes: [],
    });

    expect(baseMat).not.toBe(offsetMat);
    expect(offsetMat.polygonOffset).toBe(true);
    expect(offsetMat.polygonOffsetFactor).toBe(-1);
    expect(offsetMat.polygonOffsetUnits).toBe(-1);
    expect(offsetMat.clippingPlanes).toEqual([]);
    expect(offsetMat.userData.frostColor).toBe('#4A2C11');
    expect(offsetMat.color.getHexString().toLowerCase()).toBe('4a2c11');
  });

  it('preserves onBeforeCompile and customProgramCacheKey if clone is called', () => {
    const mat = getFrostingMaterial('#FF69B4', 'pink');
    const cloned = mat.clone();

    expect(typeof cloned.onBeforeCompile).toBe('function');
    expect(cloned.onBeforeCompile).toBe(mat.onBeforeCompile);
    expect(cloned.customProgramCacheKey()).toBe(mat.customProgramCacheKey());
    expect(cloned.userData.frostColor).toBe('#FF69B4');
    expect(cloned.color.getHexString().toLowerCase()).toBe('ff69b4');
  });

  it('compiles shader with correct uniform value and updates onBeforeRender', () => {
    const mat = getFrostingMaterial('#123456');
    const shader = {
      uniforms: {},
      vertexShader: '#include <common>\n#include <begin_vertex>',
      fragmentShader: '#include <common>\n#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <aomap_fragment>\n#include <emissivemap_fragment>',
    };

    mat.onBeforeCompile(shader);
    expect(shader.uniforms.uFrostColor).toBeDefined();
    expect(shader.uniforms.uFrostColor.value.getHexString().toLowerCase()).toBe('123456');

    mat.userData.frostColor = '#654321';
    mat.onBeforeRender();
    expect(shader.uniforms.uFrostColor.value.getHexString().toLowerCase()).toBe('654321');
  });
});
