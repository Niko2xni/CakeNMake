import { DEFAULT_CONFIG, isPetitsFourStructure } from './cakeConfig';

/**
 * Synchronizes the cake configuration when toggling between 'uniform' and 'individual'
 * tier designs, ensuring no currently selected designs are erased or unexpectedly reset.
 *
 * @param {object} config - The full bakery-style cake configuration
 * @param {'uniform' | 'individual'} targetDesign - The mode being switched to
 * @param {number} activeLayer - The currently active layer index (0-indexed)
 * @returns {object} The updated cake configuration
 */
export function syncTierDesignOnToggle(config, targetDesign, activeLayer = 0) {
  if (!config) return config;
  const isPetitsFour = isPetitsFourStructure(config.structure);
  const layers = isPetitsFour ? 4 : (config.structure?.layers || 2);
  const newStructure = {
    ...(config.structure || DEFAULT_CONFIG.structure),
    layerDesign: targetDesign,
  };

  if (targetDesign === 'individual') {
    // ── Uniform -> Individual ──
    // Copy the currently active uniform choices across all tiers
    // so every tier starts with the design the user has already configured.
    const uniformSpongeFlavor = config.sponge?.flavor || 'vanilla';
    const sponge = {
      ...(config.sponge || DEFAULT_CONFIG.sponge),
      flavor: uniformSpongeFlavor,
      layerFlavors: Array(layers).fill(uniformSpongeFlavor),
    };

    const uniformFillingFlavor = config.filling?.flavor || 'vanilla';
    const uniformFillingLayers = config.filling?.layers || 1;
    const uniformFillingEnabled = config.filling?.enabled ?? false;
    const uniformPiping = config.filling?.piping || { tip: null, colorId: 'vanilla' };
    const filling = {
      ...(config.filling || DEFAULT_CONFIG.filling),
      flavor: uniformFillingFlavor,
      layers: uniformFillingLayers,
      enabled: uniformFillingEnabled,
      piping: { ...uniformPiping },
      layerFlavors: Array(layers).fill(uniformFillingFlavor),
      layerLayers: Array(layers).fill(uniformFillingLayers),
      layerEnabled: Array(layers).fill(uniformFillingEnabled),
      layerPipings: Array.from({ length: layers }, () => ({ ...uniformPiping })),
    };

    const uniformFinish = config.exteriorFinish || DEFAULT_CONFIG.exteriorFinish;
    const uniformStyle = uniformFinish.style || 'fullyFrosted';
    const uniformFinishFlavor = uniformFinish.flavor || 'vanilla';
    const uniformTexture = uniformFinish.buttercreamTexture || 'ridged';
    const exteriorFinish = {
      ...uniformFinish,
      style: uniformStyle,
      flavor: uniformFinishFlavor,
      buttercreamTexture: uniformTexture,
      layerStyles: Array(layers).fill(uniformStyle),
      layerFlavors: Array(layers).fill(uniformFinishFlavor),
      layerButtercreamTextures: Array(layers).fill(uniformTexture),
    };

    const uniformSurface = config.surfaceTreatment || DEFAULT_CONFIG.surfaceTreatment;
    const uniformTreatment = {
      ...(uniformSurface.patternsByFormat ? { patternsByFormat: { ...uniformSurface.patternsByFormat } } : {}),
      mode: uniformSurface.mode || null,
      pattern: uniformSurface.pattern || 'naturalTear2',
    };
    const surfaceTreatment = {
      ...uniformSurface,
      layerTreatments: Array.from({ length: layers }, () => ({ ...uniformTreatment })),
    };

    const uniformSide = { ...(config.side || DEFAULT_CONFIG.side) };
    delete uniformSide.layerTreatments;
    const side = {
      ...(config.side || DEFAULT_CONFIG.side),
      layerTreatments: Array.from({ length: layers }, () => JSON.parse(JSON.stringify(uniformSide))),
    };

    const sugarColorOverrides = { ...(config.sugarColorOverrides || {}) };
    ['filling', 'exterior', 'surface', 'side'].forEach((ctx) => {
      const uniformColor = sugarColorOverrides[ctx];
      if (uniformColor) {
        for (let i = 0; i < layers; i++) {
          sugarColorOverrides[`${ctx}-${i}`] = { ...uniformColor };
        }
      }
    });

    return {
      ...config,
      structure: newStructure,
      sponge,
      filling,
      exteriorFinish,
      surfaceTreatment,
      side,
      sugarColorOverrides,
    };
  } else {
    // ── Individual -> Uniform ──
    // Take the design from the active tier (or tier 0) and apply it uniformly across all tiers.
    const tierIdx = (typeof activeLayer === 'number' && activeLayer >= 0 && activeLayer < layers)
      ? activeLayer
      : 0;

    const spongeFlavor = config.sponge?.layerFlavors?.[tierIdx] || config.sponge?.flavor || 'vanilla';
    const sponge = {
      ...(config.sponge || DEFAULT_CONFIG.sponge),
      flavor: spongeFlavor,
      layerFlavors: Array(layers).fill(spongeFlavor),
    };

    const fillingFlavor = config.filling?.layerFlavors?.[tierIdx] || config.filling?.flavor || 'vanilla';
    const fillingLayers = (config.filling?.layerLayers && config.filling.layerLayers[tierIdx] !== undefined)
      ? config.filling.layerLayers[tierIdx]
      : (config.filling?.layers || 1);
    const fillingEnabled = (config.filling?.layerEnabled && config.filling.layerEnabled[tierIdx] !== undefined)
      ? config.filling.layerEnabled[tierIdx]
      : (config.filling?.enabled ?? false);
    const fillingPiping = (config.filling?.layerPipings && config.filling.layerPipings[tierIdx])
      ? config.filling.layerPipings[tierIdx]
      : (config.filling?.piping || { tip: null, colorId: 'vanilla' });
    const filling = {
      ...(config.filling || DEFAULT_CONFIG.filling),
      flavor: fillingFlavor,
      layers: fillingLayers,
      enabled: fillingEnabled,
      piping: { ...fillingPiping },
      layerFlavors: Array(layers).fill(fillingFlavor),
      layerLayers: Array(layers).fill(fillingLayers),
      layerEnabled: Array(layers).fill(fillingEnabled),
      layerPipings: Array.from({ length: layers }, () => ({ ...fillingPiping })),
    };

    const currentFinish = config.exteriorFinish || DEFAULT_CONFIG.exteriorFinish;
    const style = currentFinish.layerStyles?.[tierIdx] || currentFinish.style || 'fullyFrosted';
    const flavor = currentFinish.layerFlavors?.[tierIdx] || currentFinish.flavor || 'vanilla';
    const buttercreamTexture = currentFinish.layerButtercreamTextures?.[tierIdx] || currentFinish.buttercreamTexture || 'ridged';
    const exteriorFinish = {
      ...currentFinish,
      style,
      flavor,
      buttercreamTexture,
      layerStyles: Array(layers).fill(style),
      layerFlavors: Array(layers).fill(flavor),
      layerButtercreamTextures: Array(layers).fill(buttercreamTexture),
    };

    const tierTreatment = config.surfaceTreatment?.layerTreatments?.[tierIdx] || config.surfaceTreatment || { mode: null, pattern: 'naturalTear2' };
    const treatmentMode = tierTreatment.mode || null;
    const treatmentPattern = tierTreatment.pattern || 'naturalTear2';
    const patternsByFormat = tierTreatment.patternsByFormat
      ? { ...tierTreatment.patternsByFormat }
      : undefined;
    const surfaceTreatment = {
      ...(config.surfaceTreatment || DEFAULT_CONFIG.surfaceTreatment),
      mode: treatmentMode,
      pattern: treatmentPattern,
      ...(patternsByFormat ? { patternsByFormat } : {}),
      layerTreatments: Array.from({ length: layers }, () => ({
        mode: treatmentMode,
        pattern: treatmentPattern,
        ...(patternsByFormat ? { patternsByFormat: { ...patternsByFormat } } : {}),
      })),
    };

    const tierSide = config.side?.layerTreatments?.[tierIdx] || config.side || DEFAULT_CONFIG.side;
    const cleanTierSide = { ...tierSide };
    delete cleanTierSide.layerTreatments;
    const side = {
      ...cleanTierSide,
      layerTreatments: Array.from({ length: layers }, () => JSON.parse(JSON.stringify(cleanTierSide))),
    };

    const sugarColorOverrides = { ...(config.sugarColorOverrides || {}) };
    ['filling', 'exterior', 'surface', 'side'].forEach((ctx) => {
      const tierColor = sugarColorOverrides[`${ctx}-${tierIdx}`] || sugarColorOverrides[ctx];
      if (tierColor) {
        sugarColorOverrides[ctx] = { ...tierColor };
        for (let i = 0; i < layers; i++) {
          sugarColorOverrides[`${ctx}-${i}`] = { ...tierColor };
        }
      }
    });

    return {
      ...config,
      structure: newStructure,
      sponge,
      filling,
      exteriorFinish,
      surfaceTreatment,
      side,
      sugarColorOverrides,
    };
  }
}
