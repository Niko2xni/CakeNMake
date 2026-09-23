import * as THREE from 'three';
import { markShared, getSpongeDummyMap, parseGradientStops } from './materialUtils';
import { buildGradientTexture } from './cakeTextures';
import { SUGAR_COLORS } from '../../lib/cakeConfig';

export const fillingMaterialCache = {};

/**
 * Procedural filling material — soft, glossy, gently undulating like real
 * whipped cream/jam, instead of a single flat diffuse color.
 * Extended to support Sugar Color patterns, gradients, and metallic Gold Shimmer.
 */
export function createFillingMaterial(hexColor, colorId = null) {
  const dummyMap = getSpongeDummyMap();

  const sugarColor = colorId ? SUGAR_COLORS.find((c) => c.id === colorId) : null;
  const isGradient = sugarColor && sugarColor.swatchCss && sugarColor.swatchCss.includes('gradient');
  const isMetallic = !!(sugarColor && sugarColor.metallic);

  let gradientTexture = null;
  if (isGradient) {
    const colorStops = parseGradientStops(sugarColor.swatchCss);
    if (colorStops.length > 0) {
      gradientTexture = buildGradientTexture(colorStops, 512, 512);
      gradientTexture.wrapS = THREE.ClampToEdgeWrapping;
      gradientTexture.wrapT = THREE.ClampToEdgeWrapping;
      gradientTexture.needsUpdate = true;
    }
  }

  // For gradient colors, return a material with the gradient texture and the signature glossy finish (0.38 roughness)
  if (isGradient && gradientTexture) {
    const material = new THREE.MeshStandardMaterial({
      map: gradientTexture,
      roughness: 0.38,
      metalness: 0,
    });
    material.userData.isGradient = true;
    return material;
  }

  const material = new THREE.MeshStandardMaterial({
    map: dummyMap,
    bumpMap: dummyMap,
    bumpScale: 0.35,
    color: '#ffffff',
    roughness: isMetallic ? 0.25 : 0.38,
    metalness: isMetallic ? 0.85 : 0,
  });

  material.customProgramCacheKey = () => (isMetallic ? 'fillingProceduralMetallic' : 'fillingProcedural');
  material.userData.fillColor = hexColor;
  material.userData.isMetallic = isMetallic;
  material.defines = { ...material.defines, USE_UV: '', USE_BUMPMAP: '' };

  material.onBeforeCompile = function (shader) {
    shader.uniforms.uFillColor = { value: new THREE.Color(this.userData.fillColor) };
    shader.uniforms.uIsMetallic = { value: this.userData.isMetallic ? 1.0 : 0.0 };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vFillPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvFillPos = position;`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vFillPos;
uniform vec3 uFillColor;
uniform float uIsMetallic;
float gFillHeight;

float fillHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float fillNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = fillHash(i + vec3(0.0,0.0,0.0));
  float n100 = fillHash(i + vec3(1.0,0.0,0.0));
  float n010 = fillHash(i + vec3(0.0,1.0,0.0));
  float n110 = fillHash(i + vec3(1.0,1.0,0.0));
  float n001 = fillHash(i + vec3(0.0,0.0,1.0));
  float n101 = fillHash(i + vec3(1.0,0.0,1.0));
  float n011 = fillHash(i + vec3(0.0,1.0,1.0));
  float n111 = fillHash(i + vec3(1.0,1.0,1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}
`)
      .replace('#include <map_fragment>', `
{
  // Low-frequency soft peaks — like whipped cream/jam surface, not grain.
  // Anti-alias fade included from the outset, same technique as the sponge
  // pore fix, so this never gets the "TV static" look at a distance.
  vec3 peakCoord = vFillPos * 3.2;
  float peakFade = 1.0 - smoothstep(2.0, 5.0, length(fwidth(peakCoord)));
  float peakN = fillNoise(peakCoord) * 0.7 + fillNoise(peakCoord * 2.1 + 17.0) * 0.3;

  vec3 highlightCol = mix(uFillColor, vec3(1.0), 0.13);
  vec3 shadowCol = mix(uFillColor, vec3(0.0), 0.07);
  vec3 body = mix(shadowCol, highlightCol, smoothstep(0.25, 0.95, peakN) * peakFade + (1.0 - peakFade) * 0.5);

  gFillHeight = peakN;
  diffuseColor.rgb *= body;
}
`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
if (uIsMetallic > 0.5) {
  roughnessFactor = clamp(roughnessFactor + (0.5 - gFillHeight) * 0.06, 0.20, 0.35);
}
`)
      .replace('#include <normal_fragment_maps>', `#ifdef USE_BUMPMAP
{
  vec2 gDHdxy = vec2(dFdx(gFillHeight), dFdy(gFillHeight));
  normal = perturbNormalArb(-vViewPosition, normal, gDHdxy, faceDirection);
}
#endif`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (uIsMetallic > 0.5) {
  vec3 sparkleCoord = vFillPos * 40.0;
  float sparkleN = fillNoise(sparkleCoord) * 0.5 + fillNoise(sparkleCoord * 1.7 + 91.0) * 0.5;
  float glint = smoothstep(0.88, 0.97, sparkleN);
  totalEmissiveRadiance += uFillColor * glint * 1.4;
}`);
  };

  return material;
}

export function getFillingMaterial(hexColor, colorId = null) {
  const cacheKey = colorId ? `${colorId}_${hexColor}` : hexColor;
  if (!fillingMaterialCache[cacheKey]) {
    fillingMaterialCache[cacheKey] = markShared(createFillingMaterial(hexColor, colorId));
  }
  return fillingMaterialCache[cacheKey];
}
