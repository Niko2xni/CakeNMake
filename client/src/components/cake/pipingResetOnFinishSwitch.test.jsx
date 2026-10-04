import React from 'react';
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
