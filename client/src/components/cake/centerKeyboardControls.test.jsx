import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

vi.mock('./cakeFonts', () => ({
  getPacificoFont: () => null,
  getHandwrittenFont: () => null,
  areFontsReady: () => false,
  onFontsReady: () => () => {},
}));

vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      domElement: document.createElement('canvas'),
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      setClearColor: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      shadowMap: { enabled: false, type: null },
    })),
  };
});

import CakeScene from './CakeScene';

describe('CakeScene Keyboard Controls for Decoration Selected on Cake', () => {
  it('updates rotation and tilt of selected decoration when keyboard keys are pressed', () => {
    const onPlacedItemsChange = vi.fn();
    const placedItems = [
      {
        id: 'decor-1',
        type: 'center-strawberry-default',
        x: 0,
        z: 0,
        rotation: 0,
        tiltX: 0,
        tiltZ: 0,
      },
    ];

    const cakeConfig = {
      layers: 1,
      frostingColor: '#FFFFFF',
      placedItems,
    };

    render(
      <CakeScene
        cakeConfig={cakeConfig}
        activeTool={null}
        selectedCenterItemId="decor-1"
        onPlacedItemsChange={onPlacedItemsChange}
      />
    );

    // Press 'e' for Yaw right (rotation +15 deg)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
    expect(onPlacedItemsChange).toHaveBeenCalled();

    const updater = onPlacedItemsChange.mock.calls[0][0];
    const updated = updater(placedItems);
    expect(updated[0].rotation).toBeCloseTo((15 * Math.PI) / 180);

    // Press 'w' for Pitch up (tiltX +15 deg)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    const updaterW = onPlacedItemsChange.mock.calls[1][0];
    const updatedW = updaterW(placedItems);
    expect(updatedW[0].tiltX).toBeCloseTo((15 * Math.PI) / 180);

    // Press 'd' for Roll right (tiltZ +15 deg)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    const updaterD = onPlacedItemsChange.mock.calls[2][0];
    const updatedD = updaterD(placedItems);
    expect(updatedD[0].tiltZ).toBeCloseTo((15 * Math.PI) / 180);
  });
});
