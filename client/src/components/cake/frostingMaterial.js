// ---------------------------------------------------------------------------
// Procedural buttercream frosting material
// ---------------------------------------------------------------------------
// GPU-only shader — no texture uploads, no canvas rasterisation. Uses the
// same onBeforeCompile injection technique as createSpongeMaterial /
// createFillingMaterial in CakeScene.jsx.
//
// Three visual layers (all fragment-shader noise):
//   1. Spatula ridges  — low-frequency directional bands (circumferential)
//   2. Micro-pores     — mid-frequency 3-octave organic dips
//   3. Color variation  — very-low-frequency warm/cool shifts
//
// Each layer feeds a combined height field into perturbNormalArb() via
// screen-space derivatives (dFdx/dFdy) for real geometric shading at zero
// memory cost. Every layer has its own fwidth()-based anti-alias fade so
// it degrades gracefully when the camera pulls back.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { getSpongeDummyMap, markShared } from './materialUtils';
import { buildGradientTexture } from './cakeTextures';
import { SUGAR_COLORS } from '../../lib/cakeConfig';

// ── Cache ──────────────────────────────────────────────────────────────────
const frostingMaterialCache = {};

/**
 * Returns a cached, shared frosting material for the given hex color.
 * Safe to call on every buildCake — only creates a new material + compiles
 * the shader the first time a color is seen; subsequent calls return the
 * same instance (uniforms already set).
 */
export function getFrostingMaterial(hexColor, colorId = null) {
  const cacheKey = colorId ? `${colorId}_${hexColor}` : hexColor;
  if (frostingMaterialCache[cacheKey]) {
    return frostingMaterialCache[cacheKey];
  }
  frostingMaterialCache[cacheKey] = markShared(createFrostingMaterial(hexColor, colorId));
  return frostingMaterialCache[cacheKey];
}

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * Parse CSS gradient string to extract color stops
 * @param {string} gradientCss - CSS gradient string (e.g., 'linear-gradient(180deg, #D6293E 0%, #DD5363 20%, ...)')
 * @returns {Array} Array of {color: hex, position: 0-1} objects
 */
function parseGradientStops(gradientCss) {
  try {
    console.log('Parsing gradient CSS:', gradientCss);
    // Extract the part between parentheses. Matches BOTH linear-gradient(...)
    // (Marble/Ombré/Watercolor Pastel Mix/Red-White Gradient) and
    // conic-gradient(...) (Rainbow Swirl) — the old linear-only regex meant
    // Rainbow Swirl's swatchCss never matched here, colorStops stayed empty,
    // and it silently fell through to the flat-hex fallback below instead
    // of ever building a gradient texture. Both syntaxes share the same
    // "first segment is the direction/angle, rest are color stops" shape
    // (conic-gradient's first segment is "from 0deg" rather than a plain
    // angle), so the parts.slice(1) skip further down still works unchanged
    // for either.
    const match = gradientCss.match(/(?:linear|conic)-gradient\(([^)]+)\)/);
    if (!match) {
      console.log('No gradient match found');
      return [];
    }

    const content = match[1];
    console.log('Gradient content:', content);
    const parts = content.split(',');
    console.log('Gradient parts:', parts);

    // Skip the first part (direction: 180deg)
    const colorParts = parts.slice(1);
    console.log('Color parts:', colorParts);

    const stops = [];
    colorParts.forEach(part => {
      const trimmed = part.trim();
      const colorMatch = trimmed.match(/#[0-9A-Fa-f]{6}/);
      const positionMatch = trimmed.match(/(\d+)%/);

      if (colorMatch) {
        const color = colorMatch[0];
        const position = positionMatch ? parseInt(positionMatch[1]) / 100 : stops.length / (colorParts.length - 1);
        stops.push({ color, position });
        console.log('Added stop:', { color, position });
      }
    });

    console.log('Final stops:', stops);
    return stops;
  } catch (e) {
    console.error('Error parsing gradient CSS:', e);
    return [];
  }
}

function createFrostingMaterial(hexColor, colorId = null) {
  const dummyMap = getSpongeDummyMap();

  console.log('Creating frosting material - hexColor:', hexColor, 'colorId:', colorId);

  // Check if this is a gradient color
  const sugarColor = colorId ? SUGAR_COLORS.find(c => c.id === colorId) : null;
  const isGradient = sugarColor && sugarColor.swatchCss && sugarColor.swatchCss.includes('gradient');
  // Gold Shimmer's `metallic: true` flag on SUGAR_COLORS (cakeConfig.js)
  // was previously never read anywhere in this file — it rendered as a
  // flat non-metallic color like any other solid. Detected here and
  // applied to metalness/roughness below and to the roughness clamp in
  // the shader further down (metallic needs a much glossier range than
  // buttercream's default matte 0.85–0.95).
  const isMetallic = !!(sugarColor && sugarColor.metallic);

  console.log('Sugar color found:', sugarColor, 'Is gradient:', isGradient, 'Is metallic:', isMetallic);

  let gradientTexture = null;
  if (isGradient) {
    // Parse gradient CSS to extract color stops
    const colorStops = parseGradientStops(sugarColor.swatchCss);
    console.log('Gradient color detected:', colorId, 'Color stops:', colorStops);
    if (colorStops.length > 0) {
      gradientTexture = buildGradientTexture(colorStops, 512, 512);
      // ClampToEdge (not the Three.js default RepeatWrapping) so a UV
      // range that runs slightly outside [0,1] — as can happen on
      // geometry whose UVs weren't authored with a flat gradient wash in
      // mind, e.g. the Mashed Circles/Mashed Swirls bump geometry in
      // spongeGeometry.js — holds the nearest edge color instead of
      // tiling/repeating the gradient into visible hard seams.
      gradientTexture.wrapS = THREE.ClampToEdgeWrapping;
      gradientTexture.wrapT = THREE.ClampToEdgeWrapping;
      gradientTexture.needsUpdate = true;
      console.log('Gradient texture created:', gradientTexture);
    } else {
      console.log('No color stops found, falling back to solid color');
    }
  }

  // For gradient colors, use a simpler material without custom shader
  if (isGradient && gradientTexture) {
    console.log('Using simple gradient material');
    const material = new THREE.MeshStandardMaterial({
      map: gradientTexture,
      roughness: 0.90,
      metalness: 0,
    });
    material.userData.isGradient = true;
    return material;
  }

  const material = new THREE.MeshStandardMaterial({
    map: gradientTexture || dummyMap,
    bumpMap: dummyMap,        // dummy — only used to unlock Three's USE_BUMPMAP
    bumpScale: 0.02,
    color: isGradient ? '#ffffff' : '#ffffff',         // white for gradients to let texture show through
    // Gold Shimmer gets real metalness/roughness values here; everything
    // else keeps the previous flat buttercream defaults.
    roughness: isMetallic ? 0.35 : 0.90,
    metalness: isMetallic ? 0.85 : 0,
  });

  // All frosting colors share the same compiled GPU program — only
  // the uFrostColor uniform differs per instance. Metallic gets its own
  // cache key alongside gradient's, since it also needs a different
  // roughness clamp range compiled into the shader below.
  material.customProgramCacheKey = () => isGradient
    ? 'frostingButtercreamGradient'
    : (isMetallic ? 'frostingButtercreamMetallic' : 'frostingButtercream');
  material.userData.frostColor = hexColor;
  material.userData.isGradient = isGradient;
  material.userData.isMetallic = isMetallic;
  material.defines = { ...material.defines, USE_UV: '', USE_BUMPMAP: '' };

  material.onBeforeCompile = function (shader) {
    shader.uniforms.uFrostColor = {
      value: new THREE.Color(this.userData.frostColor),
    };
    shader.uniforms.uIsGradient = {
      value: this.userData.isGradient ? 1.0 : 0.0,
    };
    shader.uniforms.uIsMetallic = {
      value: this.userData.isMetallic ? 1.0 : 0.0,
    };

    // ── Vertex — pass object-space position to the fragment shader ──
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vFrostPos;\nvarying vec3 vFrostNormal;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvFrostPos = position;\nvFrostNormal = normal;`
      );

    // ── Fragment — procedural buttercream ────────────────────────────
    shader.fragmentShader = shader.fragmentShader
      // --- Declarations (noise, uniforms, varying) ---
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vFrostPos;
varying vec3 vFrostNormal;
uniform vec3 uFrostColor;
uniform float uIsGradient;
uniform float uIsMetallic;
float gFrostHeight;

// ---- shared value noise (same implementation as sponge/filling) ----
float frostHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float frostNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);   // smoothstep interpolation
  float n000 = frostHash(i);
  float n100 = frostHash(i + vec3(1,0,0));
  float n010 = frostHash(i + vec3(0,1,0));
  float n110 = frostHash(i + vec3(1,1,0));
  float n001 = frostHash(i + vec3(0,0,1));
  float n101 = frostHash(i + vec3(1,0,1));
  float n011 = frostHash(i + vec3(0,1,0) + vec3(0,0,1));
  float n111 = frostHash(i + vec3(1,1,1));
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

      // --- Map fragment: compute diffuse color + height field ---
      .replace(
        '#include <map_fragment>',
        `
{
  // ── 1. Spatula ridges (macro-texture) ──────────────────────────
  float upFactor = smoothstep(0.4, 0.8, abs(vFrostNormal.y));
  
  // Side streaks
  vec3 spatCoord = vFrostPos * vec3(2.0, 12.0, 2.0);
  float spatFade = mix(1.0 - smoothstep(2.0, 5.0, length(fwidth(spatCoord))), 1.0, upFactor);
  float sideN = frostNoise(spatCoord) * 0.65 + frostNoise(spatCoord * 2.1 + 7.0) * 0.35;
  
  // Top spiral swirl
  vec2 polar = vec2(length(vFrostPos.xz), atan(vFrostPos.z, vFrostPos.x));
  vec3 topCoord = vec3(polar.x * 15.0, polar.y * 3.0 + polar.x * 5.0, 0.0);
  float topN = frostNoise(topCoord) * 0.65 + frostNoise(topCoord * 2.1 + 7.0) * 0.35;
  
  float spatN = mix(sideN, topN, upFactor);
  float spatula = (spatN - 0.5) * spatFade;  // centred around 0

  // ── 2. Micro-pores (organic imperfections) ─────────────────────
  // 3-octave noise at medium frequency — the "whipped" porosity
  // that keeps it from looking like fondant or plastic.
  vec3 poreCoord = vFrostPos * 22.0;
  float poreFade = mix(1.0 - smoothstep(1.0, 2.5, length(fwidth(poreCoord))), 1.0, upFactor);
  float poreN = frostNoise(poreCoord) * 0.6
              + frostNoise(poreCoord * 2.3 + 41.0) * 0.3
              + frostNoise(poreCoord * 4.7 + 83.0) * 0.1;
  float pores = (poreN - 0.5) * poreFade;  // centred around 0

  // ── 3. Color variation (warm/cool shifts) ──────────────────────
  vec3 varCoord = vFrostPos * 2.5;
  float varFade = 1.0 - smoothstep(3.0, 7.0, length(fwidth(varCoord)));
  float varN = frostNoise(varCoord + 200.0);

  // Combine into a height field for normal perturbation
  gFrostHeight = 0.5 + spatula * 0.35 + pores * 0.15;

  // ── Diffuse color ──────────────────────────────────────────────
  // Strictly no procedural noise applied to the diffuse color; 
  // all spatial/spatula detail is handled purely by normal perturbation.
  // For gradient colors, use the texture as-is; for solid colors, multiply by uFrostColor
  if (uIsGradient < 0.5) {
    diffuseColor.rgb *= uFrostColor;
  }
}
`
      )

      // --- Roughness modulation: peaks slightly smoother, valleys rougher ---
      // This clamp used to be hardcoded to buttercream's matte 0.85–0.95
      // range unconditionally — so even after setting a lower base
      // `roughness`/higher `metalness` on the material for Gold Shimmer,
      // this line silently pushed it right back to matte every frame,
      // meaning the "shimmer" never actually showed. Metallic colors now
      // get a much glossier 0.25–0.45 band instead.
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = uIsMetallic > 0.5
  ? clamp(roughnessFactor + (0.5 - gFrostHeight) * 0.06, 0.25, 0.45)
  : clamp(roughnessFactor + (0.5 - gFrostHeight) * 0.12, 0.85, 0.95);`
      )

      // --- Normal perturbation from the combined height field ---
      .replace(
        '#include <normal_fragment_maps>',
        `#ifdef USE_BUMPMAP
{
  vec2 gDHdxy = vec2(dFdx(gFrostHeight), dFdy(gFrostHeight)) * bumpScale * 50.0;
  normal = perturbNormalArb(-vViewPosition, normal, gDHdxy, faceDirection);
}
#endif`
      )

      // --- Procedural Ambient Occlusion (Shadows fix) ---
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
float proceduralAO = clamp(0.7 + gFrostHeight * 0.6, 0.0, 1.0);
reflectedLight.indirectDiffuse *= proceduralAO;`
      );

    material.userData.shader = shader;
  };

  return material;
}