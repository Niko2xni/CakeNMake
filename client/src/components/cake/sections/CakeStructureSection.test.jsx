import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CakeStructureSection from './CakeStructureSection';

function structure(overrides = {}) {
  return {
    cakeFormat: 'bento',
    format: 'bento',
    size: 'standardBento',
    layers: 1,
    shape: 'round',
    layerDesign: 'uniform',
    ...overrides,
  };
}

describe('CakeStructureSection Bento square sizes', () => {
  it('switches Bento cakes between regular and square size options with matching dimensions', () => {
    const onChange = vi.fn();
    const currentStructure = structure();
    const { rerender } = render(
      <CakeStructureSection
        structure={currentStructure}
        realSize={{ diameter: 4, height: 2 }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Square' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ cakeFormat: 'bento', size: 'squareBento3x3', shape: 'square' }),
      { diameter: 3, height: 3 }
    );

    const squareStructure = structure({ size: 'squareBento3x3', shape: 'square' });
    rerender(
      <CakeStructureSection
        structure={squareStructure}
        realSize={{ diameter: 3, height: 3 }}
        onChange={onChange}
      />
    );
    expect(screen.getByRole('button', { name: '2x2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3x3' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '4x2' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2x2' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ cakeFormat: 'bento', size: 'squareBento2x2', shape: 'square' }),
      { diameter: 2, height: 2 }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Round' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ cakeFormat: 'bento', size: 'standardBento', shape: 'round' }),
      { diameter: 4, height: 2 }
    );
  });
});
