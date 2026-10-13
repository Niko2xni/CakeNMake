// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import SideSection from './SideSection';
import SurfaceTreatmentSection from './SurfaceTreatmentSection';
import CollectionSection from './CollectionSection';
import { DEFAULT_CONFIG, GLAZE_PATTERNS, PETIT_FOURS_GLAZE_PATTERNS, getSurfaceTreatmentPattern } from '@/lib/cakeConfig';
import { adaptConfigFromLegacy, adaptConfigToLegacy } from '@/lib/configAdapter';

vi.mock('./SugarColorSection', () => ({ default: () => null }));
afterEach(cleanup);

describe('treatment payload growth', () => {
  for (const individual of [false, true]) {
    it(`keeps repeated side and glaze edits flat in ${individual ? 'individual' : 'uniform'} mode`, () => {
      for (const Component of [SideSection, SurfaceTreatmentSection]) {
        let section = Component === SideSection ? DEFAULT_CONFIG.side : DEFAULT_CONFIG.surfaceTreatment;
        const props = () => ({
          side: section, surfaceTreatment: section,
          structure: { layers: 2, layerDesign: individual ? 'individual' : 'uniform' },
          isIndividual: individual, activeLayer: 0,
          onChange: next => { section = next; },
        });
        const view = render(<Component {...props()} />);
        for (let i = 0; i < 40; i++) {
          fireEvent.click(view.container.querySelector('button'));
          view.rerender(<Component {...props()} />);
          expect(JSON.stringify(section).length).toBeLessThan(15000);
          for (const tier of section.layerTreatments) expect(tier.layerTreatments).toBeUndefined();
        }
        view.unmount();
      }
    });
  }

  it('keeps every drip pattern selectable through repeated uniform and individual edits', () => {
    for (const isPetitsFour of [false, true]) {
      const patterns = isPetitsFour ? PETIT_FOURS_GLAZE_PATTERNS : GLAZE_PATTERNS;
      for (const individual of [false, true]) {
        let section = {
          ...DEFAULT_CONFIG.surfaceTreatment,
          mode: null,
          layerTreatments: [
            { mode: null, pattern: 'longGaps' },
            { mode: 'glaze', pattern: 'midWave' },
            { mode: null, pattern: 'longGaps' },
            { mode: null, pattern: 'longGaps' },
          ],
        };
        const props = () => ({
          surfaceTreatment: section,
          structure: { layers: isPetitsFour ? 1 : 2, shape: isPetitsFour ? 'petitsFour' : 'round' },
          isIndividual: individual,
          activeLayer: 0,
          onChange: next => { section = next; },
        });
        const view = render(<SurfaceTreatmentSection {...props()} />);

        for (let cycle = 0; cycle < 8; cycle++) {
          fireEvent.click(view.container.querySelector('button'));
          view.rerender(<SurfaceTreatmentSection {...props()} />);

          for (const pattern of patterns) {
            const patternButton = [...view.container.querySelectorAll('button')]
              .find(button => button.textContent.startsWith(pattern.label));
            expect(patternButton, `${pattern.label} should be available`).toBeDefined();
            fireEvent.click(patternButton);
            view.rerender(<SurfaceTreatmentSection {...props()} />);

            const selected = individual ? section.layerTreatments[0] : section;
            expect(selected).toMatchObject({ mode: 'glaze', pattern: pattern.id });
            expect(JSON.stringify(section).length).toBeLessThan(15000);
            for (const tier of section.layerTreatments) expect(tier.layerTreatments).toBeUndefined();
            if (individual) {
              expect(section.layerTreatments[1]).toEqual({ mode: 'glaze', pattern: 'midWave' });
            }
          }

          fireEvent.click(view.container.querySelector('button'));
          view.rerender(<SurfaceTreatmentSection {...props()} />);
          expect((individual ? section.layerTreatments[0] : section).mode).toBeNull();
        }
        view.unmount();
      }
    }
  });

  it('remembers and renders a valid selected pattern separately for each cake format', () => {
    let section = { mode: 'glaze', pattern: 'tinyTip' };
    let structure = { size: 'classicCube', shape: 'petitsFour', cakeFormat: 'petitsFour' };
    const props = () => ({ surfaceTreatment: section, structure, onChange: next => { section = next; } });
    const view = render(<SurfaceTreatmentSection {...props()} />);
    const selectedButton = (label) => [...view.container.querySelectorAll('button')]
      .find(button => button.textContent.startsWith(label));

    expect(selectedButton('Wave Curve').className).toContain('border-primary');

    structure = { size: '8x8', shape: 'round', cakeFormat: 'standard' };
    view.rerender(<SurfaceTreatmentSection {...props()} />);
    expect(selectedButton('Long Drips').className).toContain('border-primary');
    fireEvent.click(selectedButton('Mid Coverage'));
    view.rerender(<SurfaceTreatmentSection {...props()} />);

    expect(section.patternsByFormat).toEqual({ petitsFour: 'tinyTip', standard: 'midWave' });
    expect(getSurfaceTreatmentPattern(section, structure)).toBe('midWave');
    expect(adaptConfigToLegacy({ ...DEFAULT_CONFIG, structure, surfaceTreatment: section }).surfaceTreatmentPattern).toBe('midWave');

    structure = { size: 'classicCube', shape: 'petitsFour', cakeFormat: 'petitsFour' };
    view.rerender(<SurfaceTreatmentSection {...props()} />);
    expect(selectedButton('Wave Curve').className).toContain('border-primary');
    expect(getSurfaceTreatmentPattern(section, structure)).toBe('tinyTip');
    expect(adaptConfigToLegacy({ ...DEFAULT_CONFIG, structure, surfaceTreatment: section }).surfaceTreatmentPattern).toBe('tinyTip');
    view.unmount();
  });

  it('shows a centered X only for a selected option that can be deselected', () => {
    const view = render(<CollectionSection collection="elegant" onChange={() => {}} />);
    const selectedButton = [...view.container.querySelectorAll('button')]
      .find(button => button.textContent.includes('Elegant Collection'));

    expect(selectedButton.querySelector('svg')).not.toBeNull();
    expect(selectedButton.querySelector('svg').parentElement.className).toContain('absolute inset-0 flex items-center justify-center');
    expect(selectedButton.textContent).toContain('Elegant Collection');
    view.unmount();
  });

  it('shows an X on selected Side variants and clicking it deselects the treatment', () => {
    let side = {
      ...DEFAULT_CONFIG.side,
      mode: 'checkeredPattern',
      checkeredPattern: { ...DEFAULT_CONFIG.side.checkeredPattern, setId: 'wholeCake' },
    };
    const props = () => ({
      side,
      structure: { layers: 1, layerDesign: 'uniform' },
      onChange: (next) => { side = next; },
    });
    const view = render(<SideSection {...props()} />);
    const selectedButton = () => view.container.querySelector('button[title="Remove Full Pattern"]');

    expect(selectedButton()?.querySelector('svg')).not.toBeNull();
    fireEvent.click(selectedButton());
    view.rerender(<SideSection {...props()} />);

    expect(side.mode).toBeNull();
    expect(view.container.querySelector('button[title="Full Pattern"]')?.querySelector('svg')).toBeNull();
    view.unmount();
  });

  it('shows the X for the default Side variant when no variant is stored', () => {
    let side = { ...DEFAULT_CONFIG.side, mode: 'checkeredPattern' };
    const props = () => ({
      side,
      structure: { layers: 1, layerDesign: 'uniform' },
      onChange: (next) => { side = next; },
    });
    const view = render(<SideSection {...props()} />);
    const selectedButton = view.container.querySelector('button[title="Remove Full Pattern"]');

    expect(selectedButton?.querySelector('svg')).not.toBeNull();
    fireEvent.click(selectedButton);
    view.rerender(<SideSection {...props()} />);

    expect(side.mode).toBeNull();
    view.unmount();
  });

  it('repairs previously nested saved choices without losing tier designs', () => {
    const old = { mode: 'glaze', pattern: 'draped' };
    for (let i = 0; i < 15; i++) old.layerTreatments = [{ ...old }, { ...old }];
    const config = { ...DEFAULT_CONFIG, surfaceTreatment: old,
      side: { mode: 'chevronPattern', layerTreatments: [{ mode: 'scatterPearls', layerTreatments: [old] }] } };
    const repaired = adaptConfigFromLegacy(config);
    expect(JSON.stringify(repaired).length).toBeLessThan(15000);
    expect(repaired.surfaceTreatment.layerTreatments[0]).toEqual({ mode: 'glaze', pattern: 'draped' });
    expect(repaired.side.layerTreatments[0]).toEqual({ mode: 'scatterPearls' });
    expect(config.side.layerTreatments[0].layerTreatments).toBeDefined();
  });
});
