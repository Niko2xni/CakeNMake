// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import SideSection from './SideSection';
import SurfaceTreatmentSection from './SurfaceTreatmentSection';
import { DEFAULT_CONFIG } from '@/lib/cakeConfig';
import { adaptConfigFromLegacy } from '@/lib/configAdapter';

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
