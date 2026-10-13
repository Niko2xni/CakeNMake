import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ToolPanel from './ToolPanel';
import { DEFAULT_CONFIG } from '@/lib/cakeConfig';

vi.mock('./cakeFonts', () => ({
  getPacificoFont: () => null,
  getHandwrittenFont: () => null,
  areFontsReady: () => true,
  onFontsReady: (cb) => cb && cb(),
}));

describe('Piping design reset on finish switch', () => {
  it('keeps option tiles clickable when pressing their contents with slight pointer movement', () => {
    const handleChange = vi.fn();

    render(
      <ToolPanel
        config={DEFAULT_CONFIG}
        onChange={handleChange}
        expandedSections={{ sponge: true }}
      />
    );

    const vanillaButton = screen.getByRole('button', { name: 'Vanilla' });
    expect(vanillaButton.closest('.cn-designer-tool-panel')).toBeInTheDocument();
    fireEvent.pointerDown(vanillaButton, { button: 0, clientY: 100 });
    fireEvent.pointerMove(window, { clientY: 105 });
    fireEvent.pointerUp(window);
    fireEvent.click(screen.getByText('Vanilla'));

    expect(handleChange).toHaveBeenCalled();
    expect(handleChange.mock.calls[0][0].sponge.flavor).toBe('vanilla');
  });

  it('resets Mashed Circles to None when user switches to Frosted finish', () => {
    const handleChange = vi.fn();
    const configWithMashedCircles = {
      ...DEFAULT_CONFIG,
      exteriorFinish: {
        ...DEFAULT_CONFIG.exteriorFinish,
        style: 'naked',
      },
      filling: {
        ...DEFAULT_CONFIG.filling,
        enabled: true,
        piping: {
          tip: 'mashedCircles',
          colorId: 'vanilla',
        },
      },
    };

    render(
      <ToolPanel
        config={configWithMashedCircles}
        onChange={handleChange}
        expandedSections={{ exteriorFinish: true, filling: true }}
      />
    );

    const frostedOption = screen.getByRole('button', { name: /Frosted/i });
    fireEvent.click(frostedOption);

    expect(handleChange).toHaveBeenCalled();
    const updatedConfig = handleChange.mock.calls[0][0];
    expect(updatedConfig.exteriorFinish.style).toBe('fullyFrosted');
    expect(updatedConfig.filling.piping.tip).toBeNull();
  });

  it('resets Mashed Swirls to None when user switches to Textured finish', () => {
    const handleChange = vi.fn();
    const configWithMashedSwirls = {
      ...DEFAULT_CONFIG,
      exteriorFinish: {
        ...DEFAULT_CONFIG.exteriorFinish,
        style: 'naked',
      },
      filling: {
        ...DEFAULT_CONFIG.filling,
        enabled: true,
        piping: {
          tip: 'mashedSwirls',
          colorId: 'vanilla',
        },
      },
    };

    render(
      <ToolPanel
        config={configWithMashedSwirls}
        onChange={handleChange}
        expandedSections={{ exteriorFinish: true, filling: true }}
      />
    );

    const texturedOption = screen.getByRole('button', { name: /Textured/i });
    fireEvent.click(texturedOption);

    expect(handleChange).toHaveBeenCalled();
    const updatedConfig = handleChange.mock.calls[0][0];
    expect(updatedConfig.exteriorFinish.style).toBe('texturedButtercream');
    expect(updatedConfig.filling.piping.tip).toBeNull();
  });

  it('disables Mashed Circles and Mashed Swirls buttons when finish is Frosted', () => {
    const configFrosted = {
      ...DEFAULT_CONFIG,
      exteriorFinish: {
        ...DEFAULT_CONFIG.exteriorFinish,
        style: 'fullyFrosted',
      },
      filling: {
        ...DEFAULT_CONFIG.filling,
        enabled: true,
        piping: {
          tip: null,
          colorId: 'vanilla',
        },
      },
    };

    render(
      <ToolPanel
        config={configFrosted}
        onChange={vi.fn()}
        expandedSections={{ exteriorFinish: true, filling: true }}
      />
    );

    const mashedCirclesBtn = screen.getByRole('button', { name: /Mashed Circles/i });
    const mashedSwirlsBtn = screen.getByRole('button', { name: /Mashed Swirls/i });
    const noneBtn = screen.getByTitle('None');

    expect(mashedCirclesBtn).toBeDisabled();
    expect(mashedSwirlsBtn).toBeDisabled();
    expect(noneBtn).not.toBeDisabled();
  });

  it('enables Mashed Circles and Mashed Swirls buttons when finish is Naked', () => {
    const configNaked = {
      ...DEFAULT_CONFIG,
      exteriorFinish: {
        ...DEFAULT_CONFIG.exteriorFinish,
        style: 'naked',
      },
      filling: {
        ...DEFAULT_CONFIG.filling,
        enabled: true,
        piping: {
          tip: null,
          colorId: 'vanilla',
        },
      },
    };

    render(
      <ToolPanel
        config={configNaked}
        onChange={vi.fn()}
        expandedSections={{ exteriorFinish: true, filling: true }}
      />
    );

    const mashedCirclesBtn = screen.getByRole('button', { name: /Mashed Circles/i });
    const mashedSwirlsBtn = screen.getByRole('button', { name: /Mashed Swirls/i });

    expect(mashedCirclesBtn).not.toBeDisabled();
    expect(mashedSwirlsBtn).not.toBeDisabled();
  });
});

describe('Piping Design None selection state', () => {
  // Stateful harness so a finish click round-trips through onChange
  // back into the rendered config — the same way the Designer pages
  // wire ToolPanel (config + setConfig).
  function ToolPanelHarness({ initialConfig }) {
    const [config, setConfig] = useState(initialConfig);
    return (
      <ToolPanel
        config={config}
        onChange={setConfig}
        expandedSections={{ exteriorFinish: true, filling: true }}
      />
    );
  }

  const pipingNoneBtn = () => screen.getByTitle('None');
  const isSelected = (btn) => btn.className.includes('bg-primary');

  it('shows None as selected after switching the finish to Frosted', () => {
    render(
      <ToolPanelHarness
        initialConfig={{
          ...DEFAULT_CONFIG,
          exteriorFinish: { ...DEFAULT_CONFIG.exteriorFinish, style: 'naked' },
          filling: {
            ...DEFAULT_CONFIG.filling,
            enabled: true,
            piping: { tip: 'mashedCircles', colorId: 'vanilla' },
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Frosted/i }));

    expect(isSelected(pipingNoneBtn())).toBe(true);
  });

  it('shows None as selected when a stale tip survives under a Frosted finish', () => {
    // Reachable via AI-driven finish changes or designs reloaded from
    // storage: the render layer already treats the piping as None for
    // Frosted/Textured finishes (configAdapter's regionsHidden), so the
    // picker's selected option must follow the same effective tip.
    render(
      <ToolPanelHarness
        initialConfig={{
          ...DEFAULT_CONFIG,
          exteriorFinish: { ...DEFAULT_CONFIG.exteriorFinish, style: 'fullyFrosted' },
          filling: {
            ...DEFAULT_CONFIG.filling,
            enabled: true,
            piping: { tip: 'mashedCircles', colorId: 'vanilla' },
          },
        }}
      />
    );

    expect(isSelected(pipingNoneBtn())).toBe(true);
  });

  it('resets only the frosted tier in individual design — a Naked tier keeps its piping', () => {
    const handleChange = vi.fn();
    render(
      <ToolPanel
        config={{
          ...DEFAULT_CONFIG,
          structure: { ...DEFAULT_CONFIG.structure, layers: 2, layerDesign: 'individual' },
          exteriorFinish: {
            ...DEFAULT_CONFIG.exteriorFinish,
            style: 'naked',
            layerStyles: ['naked', 'naked'],
          },
          filling: {
            ...DEFAULT_CONFIG.filling,
            enabled: true,
            layerEnabled: [true, true],
            piping: { tip: 'mashedSwirls', colorId: 'vanilla' },
            layerPipings: [
              { tip: 'mashedSwirls', colorId: 'vanilla' },
              { tip: 'mashedSwirls', colorId: 'vanilla' },
            ],
          },
        }}
        onChange={handleChange}
        expandedSections={{ exteriorFinish: true, filling: true }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Frosted/i }));

    expect(handleChange).toHaveBeenCalled();
    const updatedConfig = handleChange.mock.calls[0][0];
    expect(updatedConfig.filling.piping.tip).toBeNull();
    expect(updatedConfig.filling.layerPipings[0].tip).toBeNull();
    expect(updatedConfig.filling.layerPipings[1].tip).toBe('mashedSwirls');
  });

  it('shows None as selected after switching a tier finish to Frosted in individual design', () => {
    render(
      <ToolPanelHarness
        initialConfig={{
          ...DEFAULT_CONFIG,
          structure: { ...DEFAULT_CONFIG.structure, layers: 2, layerDesign: 'individual' },
          exteriorFinish: {
            ...DEFAULT_CONFIG.exteriorFinish,
            style: 'naked',
            layerStyles: ['naked', 'naked'],
          },
          filling: {
            ...DEFAULT_CONFIG.filling,
            enabled: true,
            layerEnabled: [true, true],
            piping: { tip: 'mashedCircles', colorId: 'vanilla' },
            layerPipings: [
              { tip: 'mashedCircles', colorId: 'vanilla' },
              { tip: 'mashedCircles', colorId: 'vanilla' },
            ],
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Frosted/i }));

    expect(isSelected(pipingNoneBtn())).toBe(true);
  });
});
