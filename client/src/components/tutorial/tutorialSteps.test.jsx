import { describe, it, expect } from 'vitest';
import { TUTORIAL_STEPS } from './tutorialSteps';

describe('TUTORIAL_STEPS ordering and content', () => {
  it('places interior preview and reset cake steps right after cake design is complete and before sending', () => {
    const stepIds = TUTORIAL_STEPS.map((s) => s.id);

    const variationsIdx = stepIds.indexOf('center-variations');
    const interiorToggleIdx = stepIds.indexOf('interior-preview-toggle');
    const interiorExplainIdx = stepIds.indexOf('interior-preview-explain');
    const interiorCloseIdx = stepIds.indexOf('interior-preview-close');
    const resetOpenIdx = stepIds.indexOf('reset-cake-open');
    const resetExplainIdx = stepIds.indexOf('reset-cake-explain');
    const resetDismissIdx = stepIds.indexOf('reset-cake-dismiss');
    const sendBakeryIdx = stepIds.indexOf('send-bakery');

    // Cake design (fundamentals -> side -> edge -> center variations) comes first
    expect(variationsIdx).toBeGreaterThan(0);

    // Interior preview comes after cake design is complete
    expect(interiorToggleIdx).toBe(variationsIdx + 1);
    expect(interiorExplainIdx).toBe(interiorToggleIdx + 1);
    expect(interiorCloseIdx).toBe(interiorExplainIdx + 1);

    // Reset cake tutorial follows interior preview
    expect(resetOpenIdx).toBe(interiorCloseIdx + 1);
    expect(resetExplainIdx).toBe(resetOpenIdx + 1);
    expect(resetDismissIdx).toBe(resetExplainIdx + 1);

    // Send bakery comes after reset tutorial
    expect(sendBakeryIdx).toBe(resetDismissIdx + 1);
  });

  it('interior preview step checks config.interiorPreview and explains how/why it works', () => {
    const toggleStep = TUTORIAL_STEPS.find((s) => s.id === 'interior-preview-toggle');
    expect(toggleStep).toBeTruthy();
    expect(toggleStep.target).toBe('[data-tutorial="interior-preview"]');
    expect(toggleStep.done.when({ config: { interiorPreview: true } })).toBe(true);
    expect(toggleStep.done.when({ config: { interiorPreview: false } })).toBe(false);

    const explainStep = TUTORIAL_STEPS.find((s) => s.id === 'interior-preview-explain');
    expect(explainStep).toBeTruthy();
    // Explains 3D cutaway and why it works (inspecting sponge, filling, frosting)
    expect(explainStep.text).toContain('3D geometric cross-section');
    expect(explainStep.text).toContain('filling');
    expect(explainStep.text).toContain('sponge');
  });

  it('reset cake step explains template vs blank reset and why it works', () => {
    const openStep = TUTORIAL_STEPS.find((s) => s.id === 'reset-cake-open');
    expect(openStep).toBeTruthy();
    expect(openStep.target).toBe('[data-tutorial="reset-cake"]');

    const explainStep = TUTORIAL_STEPS.find((s) => s.id === 'reset-cake-explain');
    expect(explainStep).toBeTruthy();
    expect(explainStep.text).toContain('Reset to Template');
    expect(explainStep.text).toContain('Blank Reset');
    expect(explainStep.text).toContain('protect');

    const dismissStep = TUTORIAL_STEPS.find((s) => s.id === 'reset-cake-dismiss');
    expect(dismissStep).toBeTruthy();
    expect(dismissStep.target).toBe('[data-tutorial="reset-cancel"]');
  });
});
