import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

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

import * as THREE from 'three';
import CakeScene from './CakeScene';
import CenterSection from './sections/CenterSection';

describe('Selecting and Dragging Placed Items', () => {
  it('allows dragging a selected item and places it at new position when valid', () => {
    const onPlacedItemsChange = vi.fn();
    const onCenterItemSelect = vi.fn();
    const onPlacementBlocked = vi.fn();

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

    const { container } = render(
      <CakeScene
        cakeConfig={cakeConfig}
        activeTool={null}
        selectedCenterItemId="decor-1"
        onPlacedItemsChange={onPlacedItemsChange}
        onCenterItemSelect={onCenterItemSelect}
        onPlacementBlocked={onPlacementBlocked}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();

    const mount = container.querySelector('.cursor-grab') || canvas.parentElement;
    const mockRect = {
      left: 0,
      top: 0,
      width: 400,
      height: 400,
      right: 400,
      bottom: 400,
    };
    mount.getBoundingClientRect = () => mockRect;
    canvas.getBoundingClientRect = () => mockRect;
    Object.defineProperty(mount, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(mount, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(canvas, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 400, configurable: true });
    window.dispatchEvent(new Event('resize'));
    const aspect = 1.0;
    const baseFov = 40;
    const baseAspect = 1.6;
    const fovRad = 2 * Math.atan(Math.tan((baseFov * Math.PI) / 360) * (baseAspect / aspect));
    const dynamicFov = Math.min(62, Math.max(35, (fovRad * 180) / Math.PI));
    const testCam = new THREE.PerspectiveCamera(dynamicFov, 1, 0.1, 300);
    testCam.position.set(0, 8, 22);
    testCam.lookAt(0, 4, 0);
    testCam.updateMatrixWorld(true);
    const pt = new THREE.Vector3(0, 6.15, 0).project(testCam);

    // Mousedown on decor-1 at (x=0, z=0) which projects to clientX: 200, clientY: 167
    canvas.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        button: 0,
        clientX: 200,
        clientY: 167,
      })
    );

    // Mousemove to drag item slightly (>4px)
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 215,
        clientY: 167,
      })
    );

    // Mouseup to drop at valid location
    window.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        button: 0,
        clientX: 215,
        clientY: 167,
      })
    );

    // Should have placed item at new position and maintained selection
    expect(onPlacedItemsChange).toHaveBeenCalled();
    expect(onCenterItemSelect).toHaveBeenCalledWith('decor-1');
  });

  it('brings item back to original place if placement does not comply with green highlight', () => {
    const onPlacedItemsChange = vi.fn();
    const onCenterItemSelect = vi.fn();
    const onPlacementBlocked = vi.fn();

    const placedItems = [
      {
        id: 'decor-1',
        type: 'center-strawberry-default',
        x: 0,
        z: 0,
      },
      {
        id: 'decor-2',
        type: 'center-strawberry-default',
        x: 1.5,
        z: 1.5,
      },
    ];

    const cakeConfig = {
      layers: 1,
      frostingColor: '#FFFFFF',
      placedItems,
    };

    const { container } = render(
      <CakeScene
        cakeConfig={cakeConfig}
        activeTool={null}
        selectedCenterItemId="decor-1"
        onPlacedItemsChange={onPlacedItemsChange}
        onCenterItemSelect={onCenterItemSelect}
        onPlacementBlocked={onPlacementBlocked}
      />
    );

    const canvas = container.querySelector('canvas');
    const mount = container.querySelector('.cursor-grab') || canvas.parentElement;
    const mockRect = {
      left: 0,
      top: 0,
      width: 400,
      height: 400,
      right: 400,
      bottom: 400,
    };
    mount.getBoundingClientRect = () => mockRect;
    canvas.getBoundingClientRect = () => mockRect;
    Object.defineProperty(mount, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(mount, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(canvas, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 400, configurable: true });
    window.dispatchEvent(new Event('resize'));

    // Mousedown to grab decor-1 at (0, 0)
    canvas.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        button: 0,
        clientX: 200,
        clientY: 167,
      })
    );

    // Drag way outside the cake (out of bounds)
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      })
    );

    // Release mouse outside valid area
    window.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        button: 0,
        clientX: 20,
        clientY: 20,
      })
    );

    // When dragged out of bounds, it cannot comply with green highlight, so position is preserved
    // and onPlacementBlocked is triggered
    expect(onPlacementBlocked).toHaveBeenCalled();
  });
});

describe('Variation Items Selection and Resetting', () => {
  it('displays variation controls when a variation item is selected on the cake', () => {
    const placedItems = [
      {
        id: 'center-var-strawberry-12345-0',
        type: 'center-strawberry-default',
        source: 'variation',
        variationType: 'strawberry',
        variationId: 'singleCenter',
        x: 0.8,
        z: 0.8,
        rotation: 0,
        tiltX: 0,
        tiltZ: 0,
      },
    ];

    const center = {
      mode: 'variations',
      variations: { strawberry: 'singleCenter' },
    };

    render(
      <CenterSection
        center={center}
        onChange={vi.fn()}
        onPlacedItemsChange={vi.fn()}
        placedItems={placedItems}
        selectedItemId="center-var-strawberry-12345-0"
      />
    );

    // Should indicate that a variation item is selected
    expect(screen.getByText(/Variation item selected/i)).toBeInTheDocument();
  });

  it('resets moved variation items when changing variation', () => {
    const onChange = vi.fn();
    const onPlacedItemsChange = vi.fn();

    // A variation item that was moved by user dragging
    const placedItems = [
      {
        id: 'center-var-strawberry-12345-0',
        type: 'center-strawberry-default',
        source: 'variation',
        variationType: 'strawberry',
        variationId: 'singleCenter',
        x: 2.5, // moved
        z: 1.8, // moved
      },
    ];

    const center = {
      mode: 'variations',
      variations: { strawberry: 'singleCenter' },
    };

    render(
      <CenterSection
        center={center}
        onChange={onChange}
        onPlacedItemsChange={onPlacedItemsChange}
        placedItems={placedItems}
      />
    );

    // "Reset Layout" button should appear because item was moved
    const resetButton = screen.getByRole('button', { name: /Reset Layout/i });
    expect(resetButton).toBeInTheDocument();

    // Clicking Reset Layout resets variation items to default placement
    fireEvent.click(resetButton);
    expect(onPlacedItemsChange).toHaveBeenCalled();

    const updater = onPlacedItemsChange.mock.calls[0][0];
    const resetItems = updater(placedItems);
    // Placed items are restored to default placements for singleCenter (5 items, centered)
    expect(resetItems.length).toBe(5);
    expect(resetItems[0].x).toBe(0);
    expect(resetItems[0].z).toBe(0);
  });
});
