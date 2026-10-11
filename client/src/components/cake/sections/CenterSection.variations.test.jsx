import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../cakeFonts', () => ({
  getPacificoFont: () => null,
  getHandwrittenFont: () => null,
  areFontsReady: () => false,
  onFontsReady: () => () => {},
}));

import CenterSection from './CenterSection';
import {
  STRAWBERRY_VARIATION_SETS,
  BENTO_STRAWBERRY_VARIATION_SETS,
  BLUEBERRY_VARIATION_SETS,
  BENTO_BLUEBERRY_VARIATION_SETS,
  MANGO_VARIATION_SETS,
  BENTO_MANGO_VARIATION_SETS,
  getCenterItemLimit,
} from '@/lib/cakeConfig';

describe('CenterSection Variations', () => {
  it('has exactly 6 variations for strawberry, blueberry, and mango on both standard and bento cakes', () => {
    expect(STRAWBERRY_VARIATION_SETS).toHaveLength(6);
    expect(BENTO_STRAWBERRY_VARIATION_SETS).toHaveLength(6);
    expect(BLUEBERRY_VARIATION_SETS).toHaveLength(6);
    expect(BENTO_BLUEBERRY_VARIATION_SETS).toHaveLength(6);
    expect(MANGO_VARIATION_SETS).toHaveLength(6);
    expect(BENTO_MANGO_VARIATION_SETS).toHaveLength(6);

    // Ensure all bento variations have at most 4 items placed
    [...BENTO_STRAWBERRY_VARIATION_SETS, ...BENTO_BLUEBERRY_VARIATION_SETS, ...BENTO_MANGO_VARIATION_SETS].forEach((set) => {
      expect(set.placements.length).toBeLessThanOrEqual(4);
    });
  });

  it('enforces maximum 4 items for bento cake format for strawberry, blueberry, and mango', () => {
    expect(getCenterItemLimit('strawberry', { cakeFormat: 'bento' })).toBe(4);
    expect(getCenterItemLimit('blueberry', { cakeFormat: 'bento' })).toBe(4);
    expect(getCenterItemLimit('mangoCube', { cakeFormat: 'bento' })).toBe(4);

    expect(getCenterItemLimit('strawberry', { cakeFormat: 'standard' })).toBe(10);
    expect(getCenterItemLimit('blueberry', { cakeFormat: 'standard' })).toBe(10);
    expect(getCenterItemLimit('mangoCube', { cakeFormat: 'standard' })).toBe(12);
  });

  it('renders Decorations, Text, and Variations tab buttons', () => {
    const center = { mode: 'decorations' };
    render(
      <CenterSection
        center={center}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Decorations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Variations' })).toBeInTheDocument();
  });

  it('switches to Variations tab when clicked and displays Strawberry, Blueberry, and Mango Cube options', () => {
    const onChange = vi.fn();
    const center = { mode: 'decorations' };
    const { rerender } = render(
      <CenterSection
        center={center}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Variations' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mode: 'variations' }));

    rerender(
      <CenterSection
        center={{ mode: 'variations' }}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Strawberry')).toBeInTheDocument();
    expect(screen.getByText('Blueberry')).toBeInTheDocument();
    expect(screen.getByText('Mango Cube')).toBeInTheDocument();

    // Verify all 3 options have 6 variation buttons each (total 18 numbered buttons)
    const buttons1 = screen.getAllByRole('button', { name: '1' });
    expect(buttons1).toHaveLength(3);
  });

  it('displays 6 variations and places at most 4 items for blueberry and mango when format is bento', () => {
    const onChange = vi.fn();
    const onPlacedItemsChange = vi.fn();
    const structure = { cakeFormat: 'bento' };
    const center = { mode: 'variations' };

    render(
      <CenterSection
        center={center}
        structure={structure}
        onChange={onChange}
        onPlacedItemsChange={onPlacedItemsChange}
        placedItems={[]}
      />
    );

    expect(screen.getByText('Strawberry')).toBeInTheDocument();
    expect(screen.getByText('Blueberry')).toBeInTheDocument();
    expect(screen.getByText('Mango Cube')).toBeInTheDocument();

    // Click choice 5 for Blueberry (Center Diamond - 4 blueberries)
    const choice5Buttons = screen.getAllByRole('button', { name: '5' });
    // choice5Buttons[1] is Blueberry's button 5
    fireEvent.click(choice5Buttons[1]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'variations',
        variations: expect.objectContaining({ blueberry: 'centerDiamond' }),
      })
    );

    const updater = onPlacedItemsChange.mock.calls[0][0];
    const newItems = updater([]);
    expect(newItems).toHaveLength(4);
    expect(newItems.every(it => it.type === 'center-blueberry-default' && it.source === 'variation')).toBe(true);
  });

  it('shows limit of 4 for blueberry and mango decoration cards when structure is bento', () => {
    const center = { mode: 'decorations' };
    const structure = { cakeFormat: 'bento' };

    render(
      <CenterSection
        center={center}
        structure={structure}
        onChange={vi.fn()}
        placedItems={[]}
      />
    );

    const strawberryButton = screen.getByTitle('Strawberry');
    expect(strawberryButton).toHaveTextContent('0 / 4');

    const blueberryButton = screen.getByTitle('Blueberry');
    expect(blueberryButton).toHaveTextContent('0 / 4');

    const mangoButton = screen.getByTitle('Mango Cube');
    expect(mangoButton).toHaveTextContent('0 / 4');
  });

  it('places strawberry variation items on the cake when a numbered choice is selected', () => {
    const onChange = vi.fn();
    const onPlacedItemsChange = vi.fn();
    const center = { mode: 'variations' };

    render(
      <CenterSection
        center={center}
        onChange={onChange}
        onPlacedItemsChange={onPlacedItemsChange}
        placedItems={[]}
      />
    );

    // Click choice 2 (Center Trio for strawberry)
    const choice2 = screen.getAllByRole('button', { name: '2' })[0];
    fireEvent.click(choice2);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'variations',
        variations: expect.objectContaining({ strawberry: 'trioCluster' }),
      })
    );

    expect(onPlacedItemsChange).toHaveBeenCalled();
    const updater = onPlacedItemsChange.mock.calls[0][0];
    const newItems = updater([]);
    expect(newItems).toHaveLength(3);
    expect(newItems.every(it => it.type === 'center-strawberry-default' && it.source === 'variation')).toBe(true);
  });

  it('toggles off and removes variation items when active choice is clicked again', () => {
    const onChange = vi.fn();
    const onPlacedItemsChange = vi.fn();
    const center = {
      mode: 'variations',
      variations: { strawberry: 'singleCenter' },
    };
    const placedItems = [
      {
        id: 'center-var-strawberry-1',
        type: 'center-strawberry-default',
        x: 0,
        z: 0,
        source: 'variation',
        variationType: 'strawberry',
      },
    ];

    render(
      <CenterSection
        center={center}
        onChange={onChange}
        onPlacedItemsChange={onPlacedItemsChange}
        placedItems={placedItems}
      />
    );

    // Click choice 1 which is currently active
    const choice1 = screen.getByTitle('Remove Single Center');
    fireEvent.click(choice1);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        variations: {},
      })
    );

    expect(onPlacedItemsChange).toHaveBeenCalled();
    const updater = onPlacedItemsChange.mock.calls[0][0];
    const updatedItems = updater(placedItems);
    expect(updatedItems).toHaveLength(0);
  });
});
