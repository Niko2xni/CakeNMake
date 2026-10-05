import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ToolPanel from './ToolPanel';
import { DEFAULT_CONFIG } from '@/lib/cakeConfig';
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
