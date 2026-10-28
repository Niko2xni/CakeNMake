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
  PETITS_FOUR_STRAWBERRY_VARIATION_SETS,
  BLUEBERRY_VARIATION_SETS,
  BENTO_BLUEBERRY_VARIATION_SETS,
  PETITS_FOUR_BLUEBERRY_VARIATION_SETS,
  MANGO_VARIATION_SETS,
  BENTO_MANGO_VARIATION_SETS,
  PETITS_FOUR_MANGO_VARIATION_SETS,
  STRAWBERRY_AND_BLUEBERRY_VARIATION_SETS,
  BENTO_STRAWBERRY_AND_BLUEBERRY_VARIATION_SETS,
  BLUEBERRY_AND_MANGO_VARIATION_SETS,
  BENTO_BLUEBERRY_AND_MANGO_VARIATION_SETS,
  STRAWBERRY_AND_MANGO_VARIATION_SETS,
  BENTO_STRAWBERRY_AND_MANGO_VARIATION_SETS,
  STRAWBERRY_BLUEBERRY_AND_MANGO_VARIATION_SETS,
  BENTO_STRAWBERRY_BLUEBERRY_AND_MANGO_VARIATION_SETS,
  getCenterVariations,
  getCenterItemLimit,
} from '@/lib/cakeConfig';

describe('CenterSection Variations', () => {
  it('has exactly 6 variations for all 7 variation sections on both standard and bento cakes', () => {
    expect(STRAWBERRY_VARIATION_SETS).toHaveLength(6);
    expect(BENTO_STRAWBERRY_VARIATION_SETS).toHaveLength(6);
    expect(BLUEBERRY_VARIATION_SETS).toHaveLength(6);
    expect(BENTO_BLUEBERRY_VARIATION_SETS).toHaveLength(6);
    expect(MANGO_VARIATION_SETS).toHaveLength(6);
    expect(BENTO_MANGO_VARIATION_SETS).toHaveLength(6);
    expect(STRAWBERRY_AND_BLUEBERRY_VARIATION_SETS).toHaveLength(6);
    expect(BENTO_STRAWBERRY_AND_BLUEBERRY_VARIATION_SETS).toHaveLength(6);
    expect(BLUEBERRY_AND_MANGO_VARIATION_SETS).toHaveLength(6);
    expect(BENTO_BLUEBERRY_AND_MANGO_VARIATION_SETS).toHaveLength(6);
    expect(STRAWBERRY_AND_MANGO_VARIATION_SETS).toHaveLength(6);
    expect(BENTO_STRAWBERRY_AND_MANGO_VARIATION_SETS).toHaveLength(6);
    expect(STRAWBERRY_BLUEBERRY_AND_MANGO_VARIATION_SETS).toHaveLength(6);
    expect(BENTO_STRAWBERRY_BLUEBERRY_AND_MANGO_VARIATION_SETS).toHaveLength(6);

    // Ensure all bento variations have at most 6 items placed overall, and at most 4 of any single decoration
    [
      ...BENTO_STRAWBERRY_VARIATION_SETS,
      ...BENTO_BLUEBERRY_VARIATION_SETS,
      ...BENTO_MANGO_VARIATION_SETS,
      ...BENTO_STRAWBERRY_AND_BLUEBERRY_VARIATION_SETS,
      ...BENTO_BLUEBERRY_AND_MANGO_VARIATION_SETS,
      ...BENTO_STRAWBERRY_AND_MANGO_VARIATION_SETS,
      ...BENTO_STRAWBERRY_BLUEBERRY_AND_MANGO_VARIATION_SETS,
    ].forEach((set) => {
      expect(set.placements.length).toBeLessThanOrEqual(6);
      const countByType = {};
      set.placements.forEach((p) => {
        const type = p.type || 'default';
        countByType[type] = (countByType[type] || 0) + 1;
      });
      Object.values(countByType).forEach((count) => {
        expect(count).toBeLessThanOrEqual(4);
      });
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

  it('switches to Variations tab when clicked and displays all 7 options on standard cakes', () => {
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
    expect(screen.getByText('Strawberry and Blueberry')).toBeInTheDocument();
    expect(screen.getByText('Blueberry and Mango Cube')).toBeInTheDocument();
    expect(screen.getByText('Strawberry and Mango Cube')).toBeInTheDocument();
    expect(screen.getByText('Strawberry, Blueberry, and Mango Cube')).toBeInTheDocument();

    // Verify all 7 options have 6 variation buttons each (total 42 numbered buttons)
    const buttons1 = screen.getAllByRole('button', { name: '1' });
    expect(buttons1).toHaveLength(7);
  });

  it('displays all 7 options on bento format and places at most 4 items for combination variations', () => {
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
    expect(screen.getByText('Strawberry and Blueberry')).toBeInTheDocument();
    expect(screen.getByText('Blueberry and Mango Cube')).toBeInTheDocument();
    expect(screen.getByText('Strawberry and Mango Cube')).toBeInTheDocument();
    expect(screen.getByText('Strawberry, Blueberry, and Mango Cube')).toBeInTheDocument();

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
    expect(newItems).toHaveLength(5);
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

  it('has exactly 1 variation for each decoration option when cake format is petitsFour', () => {
    expect(PETITS_FOUR_STRAWBERRY_VARIATION_SETS).toHaveLength(1);
    expect(PETITS_FOUR_BLUEBERRY_VARIATION_SETS).toHaveLength(1);
    expect(PETITS_FOUR_MANGO_VARIATION_SETS).toHaveLength(1);

    const variations = getCenterVariations({ cakeFormat: 'petitsFour' });
    expect(variations).toHaveLength(3);
    variations.forEach((v) => {
      expect(v.sets).toHaveLength(1);
      // Exactly 4 placements, placing one decoration on each petit cake
      expect(v.sets[0].placements).toHaveLength(4);
    });
  });

  it('enforces limit of 4 items for petitsFour cake format', () => {
    expect(getCenterItemLimit('strawberry', { cakeFormat: 'petitsFour' })).toBe(4);
    expect(getCenterItemLimit('blueberry', { cakeFormat: 'petitsFour' })).toBe(4);
    expect(getCenterItemLimit('mangoCube', { cakeFormat: 'petitsFour' })).toBe(4);
  });

  it('displays only 1 variation button for each decoration and places 4 items (1 per petit cake) on petitsFour format', () => {
    const onChange = vi.fn();
    const onPlacedItemsChange = vi.fn();
    const structure = { cakeFormat: 'petitsFour' };
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

    // Verify there is only 1 button for each option (3 buttons total with label '1')
    const buttons1 = screen.getAllByRole('button', { name: '1' });
    expect(buttons1).toHaveLength(3);

    // Verify button '2' does not exist
    expect(screen.queryByRole('button', { name: '2' })).not.toBeInTheDocument();

    // Click variation 1 for Strawberry
    fireEvent.click(buttons1[0]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'variations',
        variations: expect.objectContaining({ strawberry: 'singlePerCake' }),
      })
    );

    const updater = onPlacedItemsChange.mock.calls[0][0];
    const newItems = updater([]);
    // Exactly 4 strawberries placed: 1 per petit cake
    expect(newItems).toHaveLength(4);
    expect(newItems.every(it => it.type === 'center-strawberry-default' && it.source === 'variation')).toBe(true);
  });

  it('replaces existing variation when a different decoration variation is picked on petitsFour', () => {
    const onChange = vi.fn();
    const onPlacedItemsChange = vi.fn();
    const structure = { cakeFormat: 'petitsFour' };
    const center = {
      mode: 'variations',
      variations: { strawberry: 'singlePerCake' },
    };
    const placedItems = [
      { id: '1', type: 'center-strawberry-default', source: 'variation', variationType: 'strawberry' },
      { id: '2', type: 'center-strawberry-default', source: 'variation', variationType: 'strawberry' },
      { id: '3', type: 'center-strawberry-default', source: 'variation', variationType: 'strawberry' },
      { id: '4', type: 'center-strawberry-default', source: 'variation', variationType: 'strawberry' },
    ];

    render(
      <CenterSection
        center={center}
        structure={structure}
        onChange={onChange}
        onPlacedItemsChange={onPlacedItemsChange}
        placedItems={placedItems}
      />
    );

    // Click variation 1 for Blueberry (buttons1[1])
    const buttons1 = screen.getAllByRole('button', { name: '1' });
    fireEvent.click(buttons1[1]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'variations',
        variations: { blueberry: 'singlePerCake' },
      })
    );

    const updater = onPlacedItemsChange.mock.calls[0][0];
    const updated = updater(placedItems);
    expect(updated).toHaveLength(4);
    expect(updated.every(it => it.type === 'center-blueberry-default')).toBe(true);
  });

  it('replaces existing variation when a different decoration variation is picked on standard cakes (single option allowed)', () => {
    const onChange = vi.fn();
    const onPlacedItemsChange = vi.fn();
    const structure = { cakeFormat: 'standard' };
    const center = {
      mode: 'variations',
      variations: { strawberry: 'singleCenter' },
    };
    const placedItems = [
      { id: '1', type: 'center-strawberry-default', source: 'variation', variationType: 'strawberry' },
    ];

    render(
      <CenterSection
        center={center}
        structure={structure}
        onChange={onChange}
        onPlacedItemsChange={onPlacedItemsChange}
        placedItems={placedItems}
      />
    );

    // Click variation 3 for Blueberry (buttons3[1])
    const buttons3 = screen.getAllByRole('button', { name: '3' });
    fireEvent.click(buttons3[1]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'variations',
        variations: { blueberry: 'centerDiamond' },
      })
    );

    const updater = onPlacedItemsChange.mock.calls[0][0];
    const updated = updater(placedItems);
    expect(updated).toHaveLength(6);
    expect(updated.every(it => it.type === 'center-blueberry-default')).toBe(true);
  });

  it('does not include combination variations on petitsFour cake format', () => {
    const pfVariations = getCenterVariations({ cakeFormat: 'petitsFour' });
    expect(pfVariations).toHaveLength(3);
    const variationIds = pfVariations.map(v => v.id);
    expect(variationIds).toEqual(['strawberry', 'blueberry', 'mangoCube']);
    expect(variationIds).not.toContain('strawberryAndBlueberry');
    expect(variationIds).not.toContain('blueberryAndMango');
    expect(variationIds).not.toContain('strawberryAndMango');
    expect(variationIds).not.toContain('strawberryBlueberryAndMango');
  });

  it('places combination variation items with distinct fruit types and supports mutual exclusivity', () => {
    const onChange = vi.fn();
    const onPlacedItemsChange = vi.fn();
    const structure = { cakeFormat: 'standard' };
    const center = {
      mode: 'variations',
      variations: { strawberry: 'singleCenter' },
    };
    const placedItems = [
      { id: '1', type: 'center-strawberry-default', source: 'variation', variationType: 'strawberry' },
    ];

    render(
      <CenterSection
        center={center}
        structure={structure}
        onChange={onChange}
        onPlacedItemsChange={onPlacedItemsChange}
        placedItems={placedItems}
      />
    );

    // Variation options on standard:
    // 0: Strawberry
    // 1: Blueberry
    // 2: Mango Cube
    // 3: Strawberry and Blueberry
    // 4: Blueberry and Mango Cube
    // 5: Strawberry and Mango Cube
    // 6: Strawberry, Blueberry, and Mango Cube
    const buttons1 = screen.getAllByRole('button', { name: '1' });
    expect(buttons1).toHaveLength(7);

    // Click variation 1 for 'Strawberry and Blueberry' (buttons1[3])
    fireEvent.click(buttons1[3]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'variations',
        variations: { strawberryAndBlueberry: 'duoCenter' },
      })
    );

    const updater = onPlacedItemsChange.mock.calls[0][0];
    const newItems = updater(placedItems);
    // duoCenter has 3 strawberries and 4 blueberries
    expect(newItems).toHaveLength(7);
    expect(newItems.some(it => it.type === 'center-strawberry-default' && it.source === 'variation')).toBe(true);
    expect(newItems.some(it => it.type === 'center-blueberry-default' && it.source === 'variation')).toBe(true);
    expect(newItems.every(it => it.variationType === 'strawberryAndBlueberry')).toBe(true);
  });

  it('places mixed items for Blueberry and Mango Cube and Strawberry and Mango Cube variations', () => {
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

    // Click variation 1 for 'Blueberry and Mango Cube' (buttons1[4])
    const buttons1 = screen.getAllByRole('button', { name: '1' });
    fireEvent.click(buttons1[4]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        variations: { blueberryAndMango: 'duoCenter' },
      })
    );

    let updater = onPlacedItemsChange.mock.calls[0][0];
    let newItems = updater([]);
    expect(newItems).toHaveLength(2);
    expect(newItems.some(it => it.type === 'center-blueberry-default')).toBe(true);
    expect(newItems.some(it => it.type === 'center-mangoCube-default')).toBe(true);

    // Now click variation 1 for 'Strawberry and Mango Cube' (buttons1[5])
    fireEvent.click(buttons1[5]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        variations: { strawberryAndMango: 'duoCenter' },
      })
    );

    updater = onPlacedItemsChange.mock.calls[1][0];
    newItems = updater(newItems);
    expect(newItems).toHaveLength(2);
    expect(newItems.some(it => it.type === 'center-strawberry-default')).toBe(true);
    expect(newItems.some(it => it.type === 'center-mangoCube-default')).toBe(true);
  });

  it('places mixed items for Strawberry, Blueberry, and Mango Cube variation', () => {
    const onChange = vi.fn();
    const onPlacedItemsChange = vi.fn();
    const structure = { cakeFormat: 'standard' };
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

    // Click variation 1 for 'Strawberry, Blueberry, and Mango Cube' (buttons1[6])
    const buttons1 = screen.getAllByRole('button', { name: '1' });
    fireEvent.click(buttons1[6]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        variations: { strawberryBlueberryAndMango: 'trioCenter' },
      })
    );

    const updater = onPlacedItemsChange.mock.calls[0][0];
    const newItems = updater([]);
    // trioCenter (Centerpiece Medley) on standard has 12 fruits
    expect(newItems).toHaveLength(12);
    expect(newItems.some(it => it.type === 'center-strawberry-default')).toBe(true);
    expect(newItems.some(it => it.type === 'center-blueberry-default')).toBe(true);
    expect(newItems.some(it => it.type === 'center-mangoCube-default')).toBe(true);
    expect(newItems.every(it => it.variationType === 'strawberryBlueberryAndMango')).toBe(true);
  });

  it('deletes existing placed Decorations and Text that collide with a newly selected Variation while keeping non-colliding items', () => {
    const onChange = vi.fn();
    const onPlacedItemsChange = vi.fn();
    const structure = { cakeFormat: 'standard', size: '8x6', layers: 1 };
    const center = { mode: 'variations' };

    const existingItems = [
      { id: 'dec-collide', type: 'center-cherry-default', x: 0.05, z: 0.05, rotation: 0 },
      { id: 'txt-collide', type: 'center-letterUpperA-default', x: 0.65, z: 0.02, rotation: 0 },
      { id: 'dec-safe', type: 'center-chocolateBear-default', x: -2.2, z: -2.2, rotation: 0 },
      { id: 'txt-safe', type: 'center-letterUpperB-default', x: 2.2, z: 2.2, rotation: 0 },
    ];

    render(
      <CenterSection
        center={center}
        structure={structure}
        onChange={onChange}
        onPlacedItemsChange={onPlacedItemsChange}
        placedItems={existingItems}
      />
    );

    const buttons1 = screen.getAllByRole('button', { name: '1' });
    fireEvent.click(buttons1[0]);

    const updater = onPlacedItemsChange.mock.calls[0][0];
    const resultingItems = updater(existingItems);

    const ids = resultingItems.map((it) => it.id);
    expect(ids).not.toContain('dec-collide');
    expect(ids).not.toContain('txt-collide');
    expect(ids).toContain('dec-safe');
    expect(ids).toContain('txt-safe');
    expect(resultingItems.filter((it) => it.source === 'variation')).toHaveLength(5);
  });

  it('deletes colliding placed Decorations and Text when resetting a moved Variation layout', () => {
    const onChange = vi.fn();
    const onPlacedItemsChange = vi.fn();
    const structure = { cakeFormat: 'standard', size: '8x6', layers: 1 };
    const center = {
      mode: 'variations',
      variations: { strawberry: 'singleCenter' },
    };

    const placedItems = [
      {
        id: 'center-var-strawberry-100-0',
        type: 'center-strawberry-default',
        x: 1.8,
        z: 1.8,
        source: 'variation',
        variationType: 'strawberry',
        variationId: 'singleCenter',
      },
      { id: 'txt-at-origin', type: 'center-letterLowera-default', x: 0, z: 0, rotation: 0 },
      { id: 'dec-far', type: 'center-ferreroRocher-default', x: -2.1, z: 2.1, rotation: 0 },
    ];

    render(
      <CenterSection
        center={center}
        structure={structure}
        onChange={onChange}
        onPlacedItemsChange={onPlacedItemsChange}
        placedItems={placedItems}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Reset Layout/i });
    fireEvent.click(resetBtn);

    const updater = onPlacedItemsChange.mock.calls[0][0];
    const resultingItems = updater(placedItems);

    const ids = resultingItems.map((it) => it.id);
    expect(ids).not.toContain('txt-at-origin');
    expect(ids).toContain('dec-far');
    expect(resultingItems.filter((it) => it.source === 'variation')).toHaveLength(5);
  });

  it('removes existing Decorations starting from the last placed down to the first when a Variation exceeds the decoration max limit', () => {
    const onChange = vi.fn();
    const onPlacedItemsChange = vi.fn();
    const structure = { cakeFormat: 'standard', size: '8x6', layers: 1 };
    const center = { mode: 'variations' };

    // 10 strawberries placed via Decorations around the outer ring (r=2.5, none physically colliding with singleCenter)
    const maxPlacedStrawberries = Array.from({ length: 10 }, (_, idx) => {
      const angle = (idx / 10) * Math.PI * 2;
      return {
        id: `straw-${idx + 1}`,
        type: 'center-strawberry-default',
        x: Math.cos(angle) * 2.5,
        z: Math.sin(angle) * 2.5,
        rotation: 0,
      };
    });

    // Also include a cherry placed AFTER all strawberries (should remain untouched since variation is strawberry)
    const existingItems = [
      ...maxPlacedStrawberries,
      { id: 'cherry-1', type: 'center-cherry-default', x: 2.2, z: 2.2, rotation: 0 },
    ];

    render(
      <CenterSection
        center={center}
        structure={structure}
        onChange={onChange}
        onPlacedItemsChange={onPlacedItemsChange}
        placedItems={existingItems}
      />
    );

    // Click variation 1 for Strawberry (singleCenter -> 5 variation strawberries)
    // Since strawberry limit on standard is 10, 5 existing strawberries must be removed
    // starting from the last placed down (straw-10, straw-9, straw-8, straw-7, straw-6)
    const buttons1 = screen.getAllByRole('button', { name: '1' });
    fireEvent.click(buttons1[0]);

    const updater = onPlacedItemsChange.mock.calls[0][0];
    const resultingItems = updater(existingItems);

    const survivingManualStrawberries = resultingItems.filter(
      (it) => it.type === 'center-strawberry-default' && it.source !== 'variation'
    );
    expect(survivingManualStrawberries.map((it) => it.id)).toEqual([
      'straw-1',
      'straw-2',
      'straw-3',
      'straw-4',
      'straw-5',
    ]);

    const variationStrawberries = resultingItems.filter((it) => it.source === 'variation');
    expect(variationStrawberries).toHaveLength(5);

    // Total strawberries == 10 (max limit) and unrelated cherry is untouched
    expect(survivingManualStrawberries.length + variationStrawberries.length).toBe(10);
    expect(resultingItems.some((it) => it.id === 'cherry-1')).toBe(true);
  });
});


