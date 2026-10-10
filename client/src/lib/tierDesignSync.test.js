import { describe, expect, it } from 'vitest';
import { syncTierDesignOnToggle } from './tierDesignSync';
import { DEFAULT_CONFIG } from './cakeConfig';

describe('syncTierDesignOnToggle', () => {
  it('preserves all uniform designs when toggling to Individual', () => {
    const uniformConfig = {
      ...DEFAULT_CONFIG,
      structure: { size: 'big', layers: 2, layerDesign: 'uniform' },
      sponge: { flavor: 'chocolate', layerFlavors: ['vanilla', 'vanilla'] },
      filling: { enabled: true, layers: 2, flavor: 'strawberry', layerFlavors: ['vanilla', 'vanilla'] },
      exteriorFinish: {
        style: 'fullyFrosted',
        flavor: 'chocolate',
        buttercreamTexture: 'ribbonWrap',
        layerStyles: ['naked', 'naked'],
        layerFlavors: ['vanilla', 'vanilla'],
        layerButtercreamTextures: ['ridged', 'ridged'],
      },
      surfaceTreatment: {
        mode: 'glaze',
        pattern: 'draped',
        patternsByFormat: { standard: 'midWave', petitsFour: 'tinyTip' },
        layerTreatments: [
          { mode: null, pattern: 'longGaps' },
          { mode: null, pattern: 'longGaps' },
        ],
      },
      side: {
        mode: 'scatterPearls',
        scatterPearls: { setId: 'randomScatter', colorId: 'gold' },
      },
      sugarColorOverrides: {
        exterior: { mode: 'colorOverride', colorId: 'rose' },
        filling: { mode: 'colorOverride', colorId: 'mocha' },
        surface: { mode: 'colorOverride', colorId: 'pink' },
        side: { mode: 'colorOverride', colorId: 'gold' },
      },
    };

    const individualConfig = syncTierDesignOnToggle(uniformConfig, 'individual', 0);

    expect(individualConfig.structure.layerDesign).toBe('individual');

    // Sponge
    expect(individualConfig.sponge.layerFlavors).toEqual(['chocolate', 'chocolate']);

    // Filling
    expect(individualConfig.filling.layerFlavors).toEqual(['strawberry', 'strawberry']);

    // Exterior Finish
    expect(individualConfig.exteriorFinish.layerStyles).toEqual(['fullyFrosted', 'fullyFrosted']);
    expect(individualConfig.exteriorFinish.layerFlavors).toEqual(['chocolate', 'chocolate']);
    expect(individualConfig.exteriorFinish.layerButtercreamTextures).toEqual(['ribbonWrap', 'ribbonWrap']);

    // Surface Treatment
    expect(individualConfig.surfaceTreatment.layerTreatments).toEqual([
      { mode: 'glaze', pattern: 'draped', patternsByFormat: { standard: 'midWave', petitsFour: 'tinyTip' } },
      { mode: 'glaze', pattern: 'draped', patternsByFormat: { standard: 'midWave', petitsFour: 'tinyTip' } },
    ]);

    // Side Treatment
    expect(individualConfig.side.layerTreatments[0].mode).toBe('scatterPearls');
    expect(individualConfig.side.layerTreatments[1].mode).toBe('scatterPearls');

    // Sugar Colors
    expect(individualConfig.sugarColorOverrides['exterior-0']).toEqual({ mode: 'colorOverride', colorId: 'rose' });
    expect(individualConfig.sugarColorOverrides['exterior-1']).toEqual({ mode: 'colorOverride', colorId: 'rose' });
    expect(individualConfig.sugarColorOverrides['filling-0']).toEqual({ mode: 'colorOverride', colorId: 'mocha' });
    expect(individualConfig.sugarColorOverrides['filling-1']).toEqual({ mode: 'colorOverride', colorId: 'mocha' });
    expect(individualConfig.sugarColorOverrides['surface-0']).toEqual({ mode: 'colorOverride', colorId: 'pink' });
    expect(individualConfig.sugarColorOverrides['surface-1']).toEqual({ mode: 'colorOverride', colorId: 'pink' });
    expect(individualConfig.sugarColorOverrides['side-0']).toEqual({ mode: 'colorOverride', colorId: 'gold' });
    expect(individualConfig.sugarColorOverrides['side-1']).toEqual({ mode: 'colorOverride', colorId: 'gold' });
  });

  it('preserves the active tier designs when toggling back to Uniform', () => {
    const individualConfig = {
      ...DEFAULT_CONFIG,
      structure: { size: 'big', layers: 2, layerDesign: 'individual' },
      sponge: { flavor: 'vanilla', layerFlavors: ['chocolate', 'ube'] },
      filling: { enabled: true, layers: 2, flavor: 'vanilla', layerFlavors: ['strawberry', 'cheese'] },
      exteriorFinish: {
        style: 'naked',
        flavor: 'vanilla',
        buttercreamTexture: 'ridged',
        layerStyles: ['fullyFrosted', 'texturedButtercream'],
        layerFlavors: ['chocolate', 'ube'],
        layerButtercreamTextures: ['ridged', 'ribbonWrap'],
      },
      surfaceTreatment: {
        mode: null,
        pattern: 'longGaps',
        layerTreatments: [
          { mode: null, pattern: 'longGaps' },
          { mode: 'glaze', pattern: 'draped', patternsByFormat: { standard: 'shortWave', petitsFour: 'tinyTip' } },
        ],
      },
      side: {
        mode: null,
        layerTreatments: [
          { mode: 'drip', drip: { colorId: 'chocolate' } },
          { mode: 'scatterPearls', scatterPearls: { setId: 'randomScatter', colorId: 'gold' } },
        ],
      },
      sugarColorOverrides: {
        'exterior-0': { mode: 'colorOverride', colorId: 'rose' },
        'exterior-1': { mode: 'colorOverride', colorId: 'lavender' },
        'side-0': { mode: 'colorOverride', colorId: 'chocolate' },
        'side-1': { mode: 'colorOverride', colorId: 'gold' },
      },
    };

    // Collapse to uniform while activeLayer is Tier 2 (index 1)
    const uniformConfig = syncTierDesignOnToggle(individualConfig, 'uniform', 1);

    expect(uniformConfig.structure.layerDesign).toBe('uniform');

    // Sponge
    expect(uniformConfig.sponge.flavor).toBe('ube');
    expect(uniformConfig.sponge.layerFlavors).toEqual(['ube', 'ube']);

    // Filling
    expect(uniformConfig.filling.flavor).toBe('cheese');
    expect(uniformConfig.filling.layerFlavors).toEqual(['cheese', 'cheese']);

    // Exterior Finish
    expect(uniformConfig.exteriorFinish.style).toBe('texturedButtercream');
    expect(uniformConfig.exteriorFinish.flavor).toBe('ube');
    expect(uniformConfig.exteriorFinish.buttercreamTexture).toBe('ribbonWrap');
    expect(uniformConfig.exteriorFinish.layerStyles).toEqual(['texturedButtercream', 'texturedButtercream']);

    // Surface Treatment
    expect(uniformConfig.surfaceTreatment.mode).toBe('glaze');
    expect(uniformConfig.surfaceTreatment.pattern).toBe('draped');
    expect(uniformConfig.surfaceTreatment.patternsByFormat).toEqual({ standard: 'shortWave', petitsFour: 'tinyTip' });

    // Side Treatment
    expect(uniformConfig.side.mode).toBe('scatterPearls');

    // Sugar Colors
    expect(uniformConfig.sugarColorOverrides.exterior).toEqual({ mode: 'colorOverride', colorId: 'lavender' });
    expect(uniformConfig.sugarColorOverrides.side).toEqual({ mode: 'colorOverride', colorId: 'gold' });
  });
});
