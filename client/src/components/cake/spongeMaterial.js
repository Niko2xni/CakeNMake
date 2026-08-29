import * as THREE from 'three';
import { FLAVORS } from '../../lib/cakeFlavors';
import { markShared, getSpongeDummyMap } from './materialUtils';
import { buildRoughnessMap, buildSideTexture, buildTopTexture } from './cakeTextures';

export const spongeMaterialCache = {};

export function createSpongeMaterial(entry) {
  const dummyMap = getSpongeDummyMap();
  const material = new THREE.MeshStandardMaterial({
    map: dummyMap,
    bumpMap: dummyMap,
    bumpScale: 0.6,
    color: '#ffffff',
    roughness: entry.roughness ?? 0.93,
    metalness: 0,
  });

  material.customProgramCacheKey = () => 'spongeProcedural';
  material.userData.flavorEntry = entry;
  material.defines = { ...material.defines, USE_UV: '', USE_BUMPMAP: '' };

  material.onBeforeCompile = function (shader) {
    const e = this.userData.flavorEntry;
    const c = e.colors;

    shader.uniforms.uCrumbHighlight = { value: new THREE.Color(c.crumbHighlight) };
    shader.uniforms.uCrumbBase = { value: new THREE.Color(c.crumbBase) };
    shader.uniforms.uCrumbMid = { value: new THREE.Color(c.crumbMid) };
    shader.uniforms.uBakedTop = { value: new THREE.Color(c.bakedTop) };
    shader.uniforms.uBakedRim = { value: new THREE.Color(c.bakedRim) };
    shader.uniforms.uSideCenter = { value: new THREE.Color(c.sideCenter) };
    shader.uniforms.uBottomBake = { value: new THREE.Color(c.bottomBake) };
    shader.uniforms.uPoreDensity = { value: e.poreDensity ?? 1 };
    shader.uniforms.uPoreSize = { value: e.poreSize ?? 1 };
    shader.uniforms.uFiberStrength = { value: e.fiberStrength ?? 1 };
    shader.uniforms.uMoisture = { value: e.moisture ?? 0.5 };
    shader.uniforms.uBakeContrast = { value: e.bakeContrast ?? 0.8 };
    shader.uniforms.uCrustThickness = { value: e.crustThickness ?? 0.15 };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vSpongePos;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvSpongePos = position;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vSpongePos;
uniform vec3 uCrumbHighlight, uCrumbBase, uCrumbMid, uBakedTop, uBakedRim, uSideCenter, uBottomBake;
uniform float uPoreDensity, uPoreSize, uFiberStrength, uMoisture, uBakeContrast, uCrustThickness;
float gPoreHeight;

float spongeHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float spongeNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = spongeHash(i + vec3(0.0,0.0,0.0));
  float n100 = spongeHash(i + vec3(1.0,0.0,0.0));
  float n010 = spongeHash(i + vec3(0.0,1.0,0.0));
  float n110 = spongeHash(i + vec3(1.0,1.0,0.0));
  float n001 = spongeHash(i + vec3(0.0,0.0,1.0));
  float n101 = spongeHash(i + vec3(1.0,0.0,1.0));
  float n011 = spongeHash(i + vec3(0.0,1.0,1.0));
  float n111 = spongeHash(i + vec3(1.0,1.0,1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}
`
      )
      .replace(
        '#include <map_fragment>',
        `
{
  float crust = clamp(uCrustThickness, 0.04, 0.3);
  float contrast = max(clamp(uBakeContrast, 0.0, 1.0), 0.7);
  float yN = clamp(vUv.y, 0.0, 1.0);
  float topBand = 1.0 - smoothstep(0.0, crust, 1.0 - yN);
  float botBand = 1.0 - smoothstep(0.0, crust, yN);

  vec3 moistTint   = mix(uSideCenter, uCrumbHighlight, uMoisture * 0.18);
  vec3 topRimCol   = mix(uSideCenter, uBakedRim, contrast);
  vec3 topCrustCol = mix(uSideCenter, uBakedTop, contrast * 0.85);
  vec3 botTransCol = mix(uSideCenter, uCrumbMid, contrast * 0.7);
  vec3 botBaseCol  = mix(uSideCenter, uBottomBake, contrast);

  vec3 body = moistTint;
  body = mix(body, topCrustCol, topBand * 0.7);
  body = mix(body, topRimCol, pow(topBand, 3.0));
  body = mix(body, botTransCol, botBand * 0.7);
  body = mix(body, botBaseCol, pow(botBand, 3.0));

  vec3 blotchCoord = vSpongePos * 1.6;
  float blotchFade = 1.0 - smoothstep(3.0, 7.0, length(fwidth(blotchCoord)));
  float blotchN = spongeNoise(blotchCoord + 100.0);
  body = mix(body, uBakedTop, smoothstep(0.62, 0.92, blotchN) * 0.18 * contrast * (0.3 + topBand) * blotchFade);
  float coolN = spongeNoise(vSpongePos * 1.3 + 50.0);
  body = mix(body, uCrumbHighlight, smoothstep(0.6, 0.88, coolN) * 0.10 * uMoisture * blotchFade);

  vec3 fiberCoord = vec3(vSpongePos.x * 6.0, vSpongePos.y * 90.0, vSpongePos.z * 6.0);
  float fiberFade = 1.0 - smoothstep(1.0, 3.0, length(fwidth(fiberCoord)));
  float fiberN = spongeNoise(fiberCoord);
  float fiber = smoothstep(0.72, 0.94, fiberN) * clamp(uFiberStrength, 0.2, 2.0) * fiberFade;
  body = mix(body, uCrumbMid, fiber * 0.14);

  float poreScale = 55.0 * clamp(uPoreSize, 0.4, 2.0);
  vec3 poreCoord = vSpongePos * poreScale;
  float poreFade = 1.0 - smoothstep(1.0, 2.2, length(fwidth(poreCoord)));
  float poreH = spongeNoise(poreCoord) * 0.6
              + spongeNoise(poreCoord * 2.3 + 31.7) * 0.3
              + spongeNoise(poreCoord * 4.7 + 91.3) * 0.1;
  float poreDense = clamp(uPoreDensity, 0.3, 2.0);
  float cavity = smoothstep(0.34 + poreDense * 0.05, 0.10, poreH) * poreFade;
  float rimLight = smoothstep(0.42, 0.58, poreH) * (1.0 - smoothstep(0.58, 0.80, poreH)) * poreFade;
  vec3 cavityCol = mix(uBakedRim, vec3(0.0), 0.35);
  body = mix(body, cavityCol, cavity * 0.55 * poreDense);
  body = mix(body, uCrumbHighlight, rimLight * 0.22);

  gPoreHeight = poreH;
  diffuseColor.rgb *= body;
}
`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + (0.5 - gPoreHeight) * 0.15, 0.35, 1.0);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#ifdef USE_BUMPMAP
{
  vec2 gDHdxy = vec2(dFdx(gPoreHeight), dFdy(gPoreHeight));
  normal = perturbNormalArb(-vViewPosition, normal, gDHdxy, faceDirection);
}
#endif`
      );

    material.userData.shader = shader;
  };

  return material;
}

export const getSpongeMaterial = (flavor) => {
  if (!flavor) {
    console.error('getSpongeMaterial called with undefined flavor, using vanilla');
    flavor = 'vanilla';
  }

  if (spongeMaterialCache[flavor]) {
    return spongeMaterialCache[flavor];
  }

  if (!FLAVORS) {
    console.error('FLAVORS is not imported or is undefined! Using hardcoded fallback.');
    const fallbackColors = {
      sideCenter: '#F5E6C8',
      crumbHighlight: '#FFF8E7',
      bakedRim: '#E8D4B0',
      bakedTop: '#D4B896',
      crumbMid: '#F0D9B8',
      bottomBake: '#C9A86C',
    };
    const sideTex = buildSideTexture(fallbackColors, {});
    sideTex.wrapS = THREE.RepeatWrapping;
    sideTex.repeat.set(3, 1);
    const topTex = buildTopTexture(fallbackColors, {});
    const roughMap = buildRoughnessMap();
    const sideMaterial = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughnessMap: roughMap,
      roughness: 0.93,
      metalness: 0
    });
    const topMaterial = new THREE.MeshStandardMaterial({
      map: topTex,
      roughnessMap: roughMap,
      roughness: 0.93,
      metalness: 0
    });
    const bottomMaterial = new THREE.MeshStandardMaterial({
      map: topTex,
      roughnessMap: roughMap,
      roughness: 0.93,
      metalness: 0
    });
    const materials = [sideMaterial, topMaterial, bottomMaterial];
    spongeMaterialCache[flavor] = markShared(materials);
    return materials;
  }

  const entry = FLAVORS[flavor] || FLAVORS.vanilla;
  if (!entry || !entry.colors) {
    console.error(`Flavor "${flavor}" not found or has no colors in FLAVORS, using vanilla as fallback`);
    const vanillaEntry = FLAVORS.vanilla;
    if (!vanillaEntry || !vanillaEntry.colors) {
      console.error('Vanilla flavor is also missing colors! Using hardcoded fallback.');
      const fallbackColors = {
        sideCenter: '#F5E6C8',
        crumbHighlight: '#FFF8E7',
        bakedRim: '#E8D4B0',
        bakedTop: '#D4B896',
        crumbMid: '#F0D9B8',
        bottomBake: '#C9A86C',
      };
      const sideTex = buildSideTexture(fallbackColors, {});
      sideTex.wrapS = THREE.RepeatWrapping;
      sideTex.repeat.set(3, 1);
      const topTex = buildTopTexture(fallbackColors, {});
      const roughMap = buildRoughnessMap();
      const sideMaterial = new THREE.MeshStandardMaterial({
        map: sideTex,
        roughnessMap: roughMap,
        roughness: 0.93,
        metalness: 0
      });
      const topMaterial = new THREE.MeshStandardMaterial({
        map: topTex,
        roughnessMap: roughMap,
        roughness: 0.93,
        metalness: 0
      });
      const bottomMaterial = new THREE.MeshStandardMaterial({
        map: topTex,
        roughnessMap: roughMap,
        roughness: 0.93,
        metalness: 0
      });
      const materials = [sideMaterial, topMaterial, bottomMaterial];
      spongeMaterialCache[flavor] = markShared(materials);
      return materials;
    }
    const colors = vanillaEntry.colors;
    const sideTex = buildSideTexture(colors, vanillaEntry);
    sideTex.wrapS = THREE.RepeatWrapping;
    sideTex.repeat.set(3, 1);
    const topTex = buildTopTexture(colors, vanillaEntry);
    const roughMap = buildRoughnessMap();
    const sideMaterial = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughnessMap: roughMap,
      roughness: vanillaEntry.roughness ?? 0.93,
      metalness: 0
    });
    const topMaterial = new THREE.MeshStandardMaterial({
      map: topTex,
      roughnessMap: roughMap,
      roughness: vanillaEntry.roughness ?? 0.93,
      metalness: 0
    });
    const bottomMaterial = new THREE.MeshStandardMaterial({
      map: topTex,
      roughnessMap: roughMap,
      roughness: vanillaEntry.roughness ?? 0.93,
      metalness: 0
    });
    const materials = [sideMaterial, topMaterial, bottomMaterial];
    spongeMaterialCache[flavor] = markShared(materials);
    return materials;
  }
  const spongeMaterial = createSpongeMaterial(entry);

  spongeMaterialCache[flavor] = markShared(spongeMaterial);
  return spongeMaterial;
};
