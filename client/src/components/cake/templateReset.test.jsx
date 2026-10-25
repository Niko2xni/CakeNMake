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

describe('ToolPanel Template Reset Options', () => {
  it('renders standard reset design modal when not from template', () => {
    const handleReset = vi.fn();
    render(
      <ToolPanel
        config={DEFAULT_CONFIG}
        onChange={vi.fn()}
        onReset={handleReset}
      />
    );

    // Open reset dialog
    const resetTrigger = screen.getByRole('button', { name: /reset cake design/i });
    fireEvent.click(resetTrigger);

    expect(screen.getByText('Reset Cake Design?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Design' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset to template/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset Design' }));
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('renders both Reset to Template and Blank Reset options when templateOriginalConfig is provided', () => {
    const handleReset = vi.fn();
    const handleResetToTemplate = vi.fn();
    const templateConfig = { ...DEFAULT_CONFIG, sponge: { ...DEFAULT_CONFIG.sponge, flavor: 'chocolate' } };

    render(
      <ToolPanel
        config={DEFAULT_CONFIG}
        onChange={vi.fn()}
        onReset={handleReset}
        templateOriginalConfig={templateConfig}
        onResetToTemplate={handleResetToTemplate}
      />
    );

    // Open reset dialog
    const resetTrigger = screen.getByRole('button', { name: /reset cake design/i });
    fireEvent.click(resetTrigger);

    expect(screen.getByText('Reset Cake Design?')).toBeInTheDocument();
    expect(screen.getByText(/This design originated from a template/i)).toBeInTheDocument();

    const resetToTemplateBtn = screen.getByRole('button', { name: /reset to template/i });
    const blankResetBtn = screen.getByRole('button', { name: /blank reset/i });

    expect(resetToTemplateBtn).toBeInTheDocument();
    expect(blankResetBtn).toBeInTheDocument();

    // Test clicking Reset to Template
    fireEvent.click(resetToTemplateBtn);
    expect(handleResetToTemplate).toHaveBeenCalledTimes(1);
    expect(handleReset).not.toHaveBeenCalled();
  });

  it('allows clicking Blank Reset when from template', () => {
    const handleReset = vi.fn();
    const handleResetToTemplate = vi.fn();
    const templateConfig = { ...DEFAULT_CONFIG, sponge: { ...DEFAULT_CONFIG.sponge, flavor: 'chocolate' } };

    render(
      <ToolPanel
        config={DEFAULT_CONFIG}
        onChange={vi.fn()}
        onReset={handleReset}
        templateOriginalConfig={templateConfig}
        onResetToTemplate={handleResetToTemplate}
      />
    );

    const resetTrigger = screen.getByRole('button', { name: /reset cake design/i });
    fireEvent.click(resetTrigger);

    const blankResetBtn = screen.getByRole('button', { name: /blank reset/i });
    fireEvent.click(blankResetBtn);

    expect(handleReset).toHaveBeenCalledTimes(1);
    expect(handleResetToTemplate).not.toHaveBeenCalled();
  });
});
