import { describe, it, expect } from 'vitest';
import {
  CENTER_ITEM_LIMITS,
  CENTER_PLACEABLE_DESIGNS,
  getCenterItemLimit,
  getCenterItemCount,
  isCenterItemAtLimit,
} from './cakeConfig';

describe('Center tab item placement limits', () => {
  it('defines the exact limits specified by the user', () => {
    expect(CENTER_ITEM_LIMITS).toEqual({
      strawberry: 10,
      cherry: 10,
      blueberry: 10,
      mangoCube: 12,
      mango: 12,
      ferreroRocher: 8,
      oreo: 8,
      hersheysKisses: 9,
      basketball: 8,
      soccerball: 8,
      chocolateBear: 4,
      buttercreamText: 50,
      fondantText: 50,
    });
  });

  it('maps each CENTER_PLACEABLE_DESIGNS entry to its correct maxLimit', () => {
    const limitsByDesignId = Object.fromEntries(
      CENTER_PLACEABLE_DESIGNS.map(d => [d.designId, d.maxLimit])
    );

    expect(limitsByDesignId).toEqual({
      strawberry: 10,
      cherry: 10,
      blueberry: 10,
      mangoCube: 12,
      ferreroRocher: 8,
      hersheysKisses: 9,
      oreo: 8,
      chocolateBear: 4,
      basketball: 8,
      soccerball: 8,
    });
  });

  it('retrieves limits accurately via getCenterItemLimit', () => {
    expect(getCenterItemLimit('strawberry')).toBe(10);
    expect(getCenterItemLimit('cherry')).toBe(10);
    expect(getCenterItemLimit('blueberry')).toBe(10);
    expect(getCenterItemLimit('mangoCube')).toBe(12);
    expect(getCenterItemLimit('mango')).toBe(12);
    expect(getCenterItemLimit('ferreroRocher')).toBe(8);
    expect(getCenterItemLimit('oreo')).toBe(8);
    expect(getCenterItemLimit('hersheysKisses')).toBe(9);
    expect(getCenterItemLimit('basketball')).toBe(8);
    expect(getCenterItemLimit('soccerball')).toBe(8);
    expect(getCenterItemLimit('chocolateBear')).toBe(4);
    expect(getCenterItemLimit('nonExistent')).toBeNull();
  });

  it('counts placed items correctly regardless of orientation suffix', () => {
    const items = [
      { id: '1', type: 'center-oreo-standing' },
      { id: '2', type: 'center-oreo-flat' },
      { id: '3', type: 'center-strawberry-default' },
      { id: '4', type: 'center-strawberry-default' },
      { id: '5', type: 'center-chocolateBear-default' },
      { id: '6', type: 'center-letterUpperA-default' },
    ];

    expect(getCenterItemCount(items, 'oreo')).toBe(2);
    expect(getCenterItemCount(items, 'strawberry')).toBe(2);
    expect(getCenterItemCount(items, 'chocolateBear')).toBe(1);
    expect(getCenterItemCount(items, 'cherry')).toBe(0);
    expect(getCenterItemCount([], 'strawberry')).toBe(0);
    expect(getCenterItemCount(null, 'strawberry')).toBe(0);
  });

  it('correctly reports when an item is at or beyond its limit', () => {
    const items = Array.from({ length: 4 }, (_, i) => ({
      id: `bear-${i}`,
      type: 'center-chocolateBear-default',
    }));

    expect(isCenterItemAtLimit(items, 'chocolateBear')).toBe(true);
    expect(isCenterItemAtLimit(items.slice(0, 3), 'chocolateBear')).toBe(false);
    expect(isCenterItemAtLimit(items, 'strawberry')).toBe(false);
  });

  it('enforces 10 max for Strawberry, Cherry, and Blueberry', () => {
    const strawberries = Array.from({ length: 10 }, (_, i) => ({
      id: `straw-${i}`,
      type: 'center-strawberry-default',
    }));
    expect(isCenterItemAtLimit(strawberries, 'strawberry')).toBe(true);
    expect(isCenterItemAtLimit(strawberries.slice(0, 9), 'strawberry')).toBe(false);

    const cherries = Array.from({ length: 10 }, (_, i) => ({
      id: `cherry-${i}`,
      type: 'center-cherry-default',
    }));
    expect(isCenterItemAtLimit(cherries, 'cherry')).toBe(true);
    expect(isCenterItemAtLimit(cherries.slice(0, 9), 'cherry')).toBe(false);

    const blueberries = Array.from({ length: 10 }, (_, i) => ({
      id: `blue-${i}`,
      type: 'center-blueberry-default',
    }));
    expect(isCenterItemAtLimit(blueberries, 'blueberry')).toBe(true);
    expect(isCenterItemAtLimit(blueberries.slice(0, 9), 'blueberry')).toBe(false);
  });

  it('enforces 12 max for Mango Cube', () => {
    const mangoes = Array.from({ length: 12 }, (_, i) => ({
      id: `mango-${i}`,
      type: 'center-mangoCube-default',
    }));
    expect(isCenterItemAtLimit(mangoes, 'mangoCube')).toBe(true);
    expect(isCenterItemAtLimit(mangoes.slice(0, 11), 'mangoCube')).toBe(false);
  });

  it('enforces 8 max for Ferrero Rocher, Oreo, Fondant Basketball, and Fondant Soccer Ball', () => {
    const eights = ['ferreroRocher', 'oreo', 'basketball', 'soccerball'];
    for (const designId of eights) {
      const items = Array.from({ length: 8 }, (_, i) => ({
        id: `${designId}-${i}`,
        type: `center-${designId}-default`,
      }));
      expect(isCenterItemAtLimit(items, designId)).toBe(true);
      expect(isCenterItemAtLimit(items.slice(0, 7), designId)).toBe(false);
    }
  });

  it('enforces 9 max for Hershey Kisses', () => {
    const kisses = Array.from({ length: 9 }, (_, i) => ({
      id: `kiss-${i}`,
      type: 'center-hersheysKisses-default',
    }));
    expect(isCenterItemAtLimit(kisses, 'hersheysKisses')).toBe(true);
    expect(isCenterItemAtLimit(kisses.slice(0, 8), 'hersheysKisses')).toBe(false);
  });

  it('enforces shared 50 max for Fondant/Buttercream Text across uppercase and lowercase', () => {
    expect(getCenterItemLimit('letterUpperA')).toBe(50);
    expect(getCenterItemLimit('letterLowerZ')).toBe(50);
    expect(getCenterItemLimit('buttercreamText')).toBe(50);
    expect(getCenterItemLimit('fondantText')).toBe(50);

    // 25 uppercase + 25 lowercase = 50 total letters
    const mixedLetters = [
      ...Array.from({ length: 25 }, (_, i) => ({ id: `upper-${i}`, type: 'center-letterUpperA-default' })),
      ...Array.from({ length: 25 }, (_, i) => ({ id: `lower-${i}`, type: 'center-letterLowerB-default' })),
    ];

    expect(getCenterItemCount(mixedLetters, 'letterUpperA')).toBe(50);
    expect(getCenterItemCount(mixedLetters, 'letterLowerB')).toBe(50);
    expect(isCenterItemAtLimit(mixedLetters, 'letterUpperA')).toBe(true);
    expect(isCenterItemAtLimit(mixedLetters, 'letterLowerZ')).toBe(true);
    expect(isCenterItemAtLimit(mixedLetters.slice(0, 49), 'letterUpperA')).toBe(false);
  });
});
