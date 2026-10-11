import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ToolPanel from './ToolPanel';
import { DEFAULT_CONFIG, GLAZE_PATTERNS } from '@/lib/cakeConfig';
import { adaptConfigToLegacy } from '@/lib/configAdapter';

vi.mock('./AIChatPanel', () => ({ default: () => <div>AI editor</div> }));
vi.mock('./sections/DecorationPreview', () => ({ default: () => null }));
vi.mock('./sections/PipingPreview', () => ({ default: () => null }));
afterEach(cleanup);

function mount(edgeMode = 'both') {
  const initial = structuredClone(DEFAULT_CONFIG);
  initial.exteriorFinish.style = 'fullyFrosted';
  initial.side.mode = 'victorianLambeth';
  initial.side.victorianLambeth = { setId: 'classic' };
  const border = { piping: { tip: 'ropeTwistClassic', colorId: 'ivory' }, decorations: { setId: null, colorId: 'vanilla' } };
  initial.edge = { ...initial.edge, mode: edgeMode, activeSlot: 'top', both: structuredClone(border), ...(edgeMode === 'both' ? {} : { top: structuredClone(border), bottom: structuredClone(border), topEnabled: true, bottomEnabled: true }) };
  let current = initial;
  const changed = vi.fn();
  function Harness() {
    const [config, setConfig] = useState(initial);
    current = config;
    return <ToolPanel config={config} onChange={next => { changed(next); setConfig(next); }} />;
  }
  render(<Harness />);
  return { initial, changed, current: () => current };
}

it('opening every manual tab after AI preserves all cake settings', () => {
  const state = mount();
  fireEvent.click(screen.getByRole('button', { name: 'AI', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Design', exact: true }));
  for (const tab of ['Fundamentals', 'Side', 'Center', 'Edge']) {
    fireEvent.click(screen.getByRole('button', { name: tab, exact: true }));
    expect(state.current()).toEqual(state.initial);
  }
  expect(state.changed).not.toHaveBeenCalled();
});

it('shows only Fundamentals and Center for Petit Fours and restores Side and Edge for other formats', () => {
  const initial = structuredClone(DEFAULT_CONFIG);
  let setConfig;
  function Harness() {
    const [config, updateConfig] = useState(initial);
    setConfig = updateConfig;
    return <ToolPanel config={config} onChange={updateConfig} />;
  }

  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Edge', exact: true }));
  act(() => {
    setConfig((config) => ({
      ...config,
      structure: {
        ...config.structure,
        cakeFormat: 'petitsFour',
        format: 'petitsFour',
        size: 'classicCube',
        layers: 1,
      },
    }));
  });

  expect(screen.getByRole('button', { name: 'Fundamentals', exact: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Center', exact: true })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Side', exact: true })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edge', exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Fundamentals', exact: true })).toHaveClass('bg-card');

  act(() => {
    setConfig((config) => ({
      ...config,
      structure: { ...config.structure, cakeFormat: 'standard', format: 'standard', size: '8x8' },
    }));
  });

  expect(screen.getByRole('button', { name: 'Side', exact: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edge', exact: true })).toBeInTheDocument();
});

for (const mode of ['both', 'topBottomSeparate']) {
  it(`preserves visible borders when navigating edge slots from ${mode}`, () => {
    const state = mount(mode);
    fireEvent.click(screen.getByRole('button', { name: 'Edge', exact: true }));
    for (const slot of ['Top', 'Bottom', 'Top', 'Top']) {
      fireEvent.click(screen.getByRole('button', { name: slot, exact: true }));
      const config = state.current();
      const rendered = adaptConfigToLegacy(config);
      expect(rendered.edgeTop.pipingTip).toBe('ropeTwistClassic');
      expect(rendered.edgeBottom.pipingTip).toBe('ropeTwistClassic');
      expect(config.side).toEqual(state.initial.side);
      expect(config.exteriorFinish).toEqual(state.initial.exteriorFinish);
      expect(config.edge.activeSlot).toBe(slot.toLowerCase());
    }
  });
}

it('shows the Surface Sugar Color controls only when the active individual tier has Glaze', () => {
  const config = structuredClone(DEFAULT_CONFIG);
  config.structure = { ...config.structure, layers: 2, layerDesign: 'individual' };
  config.surfaceTreatment = {
    mode: 'glaze',
    pattern: 'longGaps',
    layerTreatments: [
      { mode: null, pattern: 'shortWave' },
      { mode: 'glaze', pattern: 'midWave' },
    ],
  };
  const view = render(<ToolPanel config={config} onChange={vi.fn()} activeLayer={0} />);

  expect(screen.queryByText('Flavor Color')).not.toBeInTheDocument();

  view.rerender(<ToolPanel config={config} onChange={vi.fn()} activeLayer={1} />);
  expect(screen.getByText('Flavor Color')).toBeInTheDocument();

  view.rerender(<ToolPanel config={config} onChange={vi.fn()} activeLayer={0} />);
  expect(screen.queryByText('Flavor Color')).not.toBeInTheDocument();
});

it('keeps the Fundamentals Surface Treatment section open while cycling through drip patterns', () => {
  const initial = structuredClone(DEFAULT_CONFIG);
  let current;
  function Harness() {
    const [config, setConfig] = useState(initial);
    current = config;
    return <ToolPanel config={config} onChange={setConfig} />;
  }
  render(<Harness />);

  for (let cycle = 0; cycle < 6; cycle++) {
    fireEvent.click(screen.getByRole('button', { name: 'Drip' }));
    for (const pattern of GLAZE_PATTERNS) {
      const patternButton = [...document.querySelectorAll('button')]
        .find(button => button.textContent.startsWith(pattern.label));
      expect(patternButton, `${pattern.label} should be available`).toBeDefined();
      fireEvent.click(patternButton);
      expect(screen.getByText('Pattern')).toBeInTheDocument();
      expect(current.surfaceTreatment.pattern).toBe(pattern.id);
      for (const tier of current.surfaceTreatment.layerTreatments) {
        expect(tier.layerTreatments).toBeUndefined();
      }
    }
    fireEvent.click(screen.getByRole('button', { name: 'Turn off Drip' }));
    expect(current.surfaceTreatment.mode).toBeNull();
  }
});

it('defaults Standard and Bento to Long Drips and remembers Petit Fours Natural Tear', () => {
  const initial = structuredClone(DEFAULT_CONFIG);
  let current;
  function Harness() {
    const [config, setConfig] = useState(initial);
    current = config;
    return <ToolPanel config={config} onChange={setConfig} />;
  }
  const view = render(<Harness />);
  const buttonStartingWith = (label) => [...view.container.querySelectorAll('button')]
    .find(button => button.textContent.startsWith(label));

  fireEvent.click(buttonStartingWith('Drip'));
  expect(buttonStartingWith('Long Drips').className).toContain('border-primary');

  fireEvent.click(buttonStartingWith('Petit Fours'));
  fireEvent.click(buttonStartingWith('Natural Tear'));
  expect(current.surfaceTreatment.pattern).toBe('longGaps');

  fireEvent.click(buttonStartingWith('Standard'));
  expect(current.surfaceTreatment.pattern).toBe('longGaps');
  expect(buttonStartingWith('Long Drips').className).toContain('border-primary');

  fireEvent.click(buttonStartingWith('Bento'));
  expect(current.surfaceTreatment.pattern).toBe('longGaps');
  expect(buttonStartingWith('Long Drips').className).toContain('border-primary');

  fireEvent.click(buttonStartingWith('Petit Fours'));
  expect(current.surfaceTreatment.patternsByFormat).toMatchObject({
    standard: 'longGaps',
    petitsFour: 'longGaps',
  });
  expect(buttonStartingWith('Natural Tear').className).toContain('border-primary');
});

it('clears center decorations when switching between single cake formats and Petit Fours', () => {
  const initial = {
    ...DEFAULT_CONFIG,
    structure: {
      ...DEFAULT_CONFIG.structure,
      cakeFormat: 'bento',
      format: 'bento',
      size: 'standardBento',
    },
    placedItems: [
      { id: '1', type: 'center-strawberry-default', x: 0, z: -0.42 },
      { id: '2', type: 'center-strawberry-default', x: 0.42, z: 0 },
    ],
  };
  let current = initial;
  function Harness() {
    const [config, setConfig] = useState(initial);
    current = config;
    return <ToolPanel config={config} onChange={setConfig} />;
  }
  const view = render(<Harness />);
  const buttonStartingWith = (label) => [...view.container.querySelectorAll('button')]
    .find((button) => button.textContent.startsWith(label));

  expect(current.placedItems).toHaveLength(2);
  fireEvent.click(buttonStartingWith('Petit Fours'));
  expect(current.structure.cakeFormat).toBe('petitsFour');
  expect(current.placedItems).toEqual([]);
});

it('clears center decorations and variations when switching from standard cake to bento', () => {
  const onSelectTool = vi.fn();
  const onCenterItemSelect = vi.fn();
  const initial = {
    ...DEFAULT_CONFIG,
    structure: {
      ...DEFAULT_CONFIG.structure,
      cakeFormat: 'standard',
      format: 'standard',
      size: '8x8',
    },
    center: {
      ...DEFAULT_CONFIG.center,
      mode: 'variations',
      variations: { strawberry: 'strawberry-set-1' },
    },
    place: {
      items: [
        { id: '1', type: 'center-strawberry-default', x: 0, z: -1.75, source: 'variation' },
        { id: '2', type: 'center-strawberry-default', x: 1.75, z: 0, source: 'variation' },
      ],
    },
    placedItems: [
      { id: '1', type: 'center-strawberry-default', x: 0, z: -1.75, source: 'variation' },
      { id: '2', type: 'center-strawberry-default', x: 1.75, z: 0, source: 'variation' },
    ],
  };
  let current = initial;
  function Harness() {
    const [config, setConfig] = useState(initial);
    current = config;
    return (
      <ToolPanel
        config={config}
        onChange={setConfig}
        onSelectTool={onSelectTool}
        onCenterItemSelect={onCenterItemSelect}
      />
    );
  }
  const view = render(<Harness />);
  const buttonStartingWith = (label) => [...view.container.querySelectorAll('button')]
    .find((button) => button.textContent.startsWith(label));

  expect(current.place.items).toHaveLength(2);
  fireEvent.click(buttonStartingWith('Bento'));

  expect(current.structure.cakeFormat).toBe('bento');
  expect(current.place.items).toEqual([]);
  expect(current.placedItems).toEqual([]);
  expect(current.center.variations).toEqual({});
  expect(onSelectTool).toHaveBeenCalledWith(null);
  expect(onCenterItemSelect).toHaveBeenCalledWith(null);
});

it('clears center decorations and variations when switching from bento cake to standard', () => {
  const onSelectTool = vi.fn();
  const onCenterItemSelect = vi.fn();
  const initial = {
    ...DEFAULT_CONFIG,
    structure: {
      ...DEFAULT_CONFIG.structure,
      cakeFormat: 'bento',
      format: 'bento',
      size: 'standardBento',
    },
    center: {
      ...DEFAULT_CONFIG.center,
      mode: 'variations',
      variations: { blueberry: 'blueberry-set-2' },
    },
    place: {
      items: [
        { id: '1', type: 'center-blueberry-default', x: 0, z: -0.5, source: 'variation' },
      ],
    },
    placedItems: [
      { id: '1', type: 'center-blueberry-default', x: 0, z: -0.5, source: 'variation' },
    ],
  };
  let current = initial;
  function Harness() {
    const [config, setConfig] = useState(initial);
    current = config;
    return (
      <ToolPanel
        config={config}
        onChange={setConfig}
        onSelectTool={onSelectTool}
        onCenterItemSelect={onCenterItemSelect}
      />
    );
  }
  const view = render(<Harness />);
  const buttonStartingWith = (label) => [...view.container.querySelectorAll('button')]
    .find((button) => button.textContent.startsWith(label));

  expect(current.place.items).toHaveLength(1);
  fireEvent.click(buttonStartingWith('Standard'));

  expect(current.structure.cakeFormat).toBe('standard');
  expect(current.place.items).toEqual([]);
  expect(current.placedItems).toEqual([]);
  expect(current.center.variations).toEqual({});
  expect(onSelectTool).toHaveBeenCalledWith(null);
  expect(onCenterItemSelect).toHaveBeenCalledWith(null);
});

