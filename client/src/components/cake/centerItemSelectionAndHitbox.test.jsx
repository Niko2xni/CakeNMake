import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('./cakeFonts', () => ({
  getPacificoFont: () => null,
  getHandwrittenFont: () => null,
  areFontsReady: () => false,
  onFontsReady: () => () => {},
}));

vi.mock('./sections/DecorationPreview', () => ({
  default: () => <div data-testid="mock-preview" />,
}));
import { getItemFootprint, PLACE_ITEM_RADII, CENTER_ITEM_RADII } from '@/lib/cakeConfig';
import CenterSection from './sections/CenterSection';

describe('Center Item Tab Auto-Switching and Calibrated Hitboxes', () => {
  describe('Tab switching by selected item category', () => {
    it('switches to variations mode when a variation item is selected', () => {
      const onChange = vi.fn();
      const variationItem = {
        id: 'center-var-strawberry-123-0',
        type: 'center-strawberry-default',
        source: 'variation',
        x: 0,
        z: 0,
      };

      render(
        <CenterSection
          center={{ mode: 'decorations' }}
          structure={{ shape: 'round', size: '6', cakeFormat: 'standard' }}
          onChange={onChange}
          placedItems={[variationItem]}
          selectedItemId="center-var-strawberry-123-0"
        />
      );

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'variations',
        })
      );
    });

    it('switches to text mode when a buttercream letter item is selected', () => {
      const onChange = vi.fn();
      const letterItem = {
        id: 'letter-1',
        type: 'center-letterUpper-A',
        x: 0.5,
        z: 0.5,
      };

      render(
        <CenterSection
          center={{ mode: 'variations' }}
          structure={{ shape: 'round', size: '6', cakeFormat: 'standard' }}
          onChange={onChange}
          placedItems={[letterItem]}
          selectedItemId="letter-1"
        />
      );

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'text',
          textCategory: 'buttercream',
        })
      );
    });

    it('switches to decorations mode when a standard decoration item is selected', () => {
      const onChange = vi.fn();
      const decorItem = {
        id: 'decor-1',
        type: 'center-cherry-default',
        x: -0.5,
        z: 0.2,
      };

      render(
        <CenterSection
          center={{ mode: 'variations' }}
          structure={{ shape: 'round', size: '6', cakeFormat: 'standard' }}
          onChange={onChange}
          placedItems={[decorItem]}
          selectedItemId="decor-1"
        />
      );

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'decorations',
        })
      );
    });
  });

  describe('Calibrated hitboxes fitting item sizes', () => {
    it('provides tight, calibrated physical radii for place items matching 3D visuals', () => {
      expect(PLACE_ITEM_RADII.strawberry).toBe(0.30);
      expect(PLACE_ITEM_RADII.cherry).toBe(0.34);
      expect(PLACE_ITEM_RADII.blueberry).toBe(0.25);
      expect(PLACE_ITEM_RADII.mangoCube).toBe(0.24);
      expect(PLACE_ITEM_RADII.candle).toBe(0.16);
      expect(PLACE_ITEM_RADII.chocolateChip).toBe(0.20);
      expect(PLACE_ITEM_RADII.rosette).toBe(0.48);
      expect(PLACE_ITEM_RADII.piping).toBe(0.42);
    });

    it('computes exact oriented OBB footprints for uppercase and lowercase letters without radius inflation', () => {
      const upperFp = getItemFootprint({ type: 'center-letterUpper-B', x: 1, z: 2, rotation: Math.PI / 4 });
      expect(upperFp.type).toBe('obb');
      expect(upperFp.halfLength).toBe(0.24);
      expect(upperFp.halfWidth).toBe(0.12);
      expect(upperFp.angle).toBe(Math.PI / 4);

      const lowerFp = getItemFootprint({ type: 'center-letterLower-b', x: -1, z: 0, rotation: 0 });
      expect(lowerFp.type).toBe('obb');
      expect(lowerFp.halfLength).toBe(0.18);
      expect(lowerFp.halfWidth).toBe(0.12);
    });

    it('computes standing oreo as an OBB and flat oreo as a circle', () => {
      const standingOreo = getItemFootprint({ type: 'center-oreo-standing', orientation: 'standing', x: 0, z: 0, rotation: 0 });
      expect(standingOreo.type).toBe('obb');
      expect(standingOreo.halfLength).toBe(0.875);
      expect(standingOreo.halfWidth).toBe(0.23);

      const flatOreo = getItemFootprint({ type: 'center-oreo-flat', orientation: 'flat', x: 0, z: 0 });
      expect(flatOreo.type).toBe('circle');
      expect(flatOreo.radius).toBe(0.875);
    });

    it('resolves variation item types without center- prefix to exact physical footprint', () => {
      const strawberryFp = getItemFootprint({ type: 'strawberry', x: 0.5, z: 0.5 });
      expect(strawberryFp.type).toBe('circle');
      expect(strawberryFp.radius).toBe(0.30);

      const blueberryFp = getItemFootprint({ type: 'blueberry', x: 0.2, z: 0.2 });
      expect(blueberryFp.type).toBe('circle');
      expect(blueberryFp.radius).toBe(0.25);

      const mangoFp = getItemFootprint({ type: 'mango', x: 0, z: 0 });
      expect(mangoFp.type).toBe('circle');
      expect(mangoFp.radius).toBe(0.24);
    });
  });
});
