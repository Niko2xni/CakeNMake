import { describe, expect, it, vi } from 'vitest';
import { applyCakeAiTool } from './aiCakeTools';
import { DEFAULT_CONFIG, SIZE_OPTIONS, computeSlotPosition, TOP_SURFACE_SLOTS } from './cakeConfig';
import { adaptConfigToLegacy } from './configAdapter';

function execute(name, input, config = structuredClone(DEFAULT_CONFIG)) {
  const onChange = vi.fn();
  const response = applyCakeAiTool(name, input, { config, onChange });
  return { response, onChange, next: onChange.mock.calls[0]?.[0] };
}

describe('Cake AI edits without a provider', () => {
  it('adds independent borders with colors and preserves the opposite shared edge', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.edge.mode = 'both'; config.edge.both.piping.tip = 'bead';
    config.sugarColorOverrides.edgeBoth = { mode: 'colorOverride', colorId: 'pink' };
    const { next } = execute('set_edge_border', { slot: 'top', designId: 'shellAlt', colorId: 'chocolate', secondaryColorId: 'pink' }, config);
    expect(next.edge.top.piping).toMatchObject({ tip: 'shellAlt', colorId: 'chocolate', secondaryColorId: 'pink' });
    expect(next.edge.bottom.piping.tip).toBe('bead');
    expect(next.sugarColorOverrides.edgeBottom.colorId).toBe('pink');
    expect(config.edge.mode).toBe('both');
  });
  it('targets both borders without adding a middle seam, and all borders with a seam', () => {
    const config = structuredClone(DEFAULT_CONFIG); config.structure.layers = 2;
    const both = execute('set_edge_border', { slot: 'both', designId: 'ropeTwist' }, config).next;
    expect(both.edge.mode).toBe('topBottomSeparate');
    expect(both.edge.top.piping.tip).toBe('ropeTwist'); expect(both.edge.bottom.piping.tip).toBe('ropeTwist');
    expect(both.edge.middle.piping.tip).toBeNull();
    const all = execute('set_edge_border', { slot: 'all', designId: 'shell' }, config).next;
    expect(all.edge.both.piping.tip).toBe('shell'); expect(all.edge.middle.piping.tip).toBe('shell');
    expect(execute('set_edge_border', { slot: 'middle', designId: 'shell' }).response.error).toBeTruthy();
  });
  it('rejects removed flat text without changing the design and clears only letter decorations', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.place.items = [{ id: 'letter', type: 'center-letterUpperA-default', x: 0, z: 0 }, { id: 'decor', type: 'center-cherry-default', x: 0, z: -2.5 }];
    const rejected = execute('set_cake_text', { text: 'Hi', style: 'piping' }, config);
    expect(rejected.response.error).toMatch(/Unsupported/);
    expect(rejected.onChange).not.toHaveBeenCalled();
    const cleared = execute('set_cake_text', { text: '', style: 'buttercream' }, config).next;
    expect(cleared.place.items.map(item => item.id)).toEqual(['decor']);
  });
  it('creates individually movable buttercream letters and rejects unsupported or overlapping text atomically', () => {
    const { next } = execute('set_cake_text', { text: 'Hi Ana', style: 'buttercream', colorId: 'pink' });
    expect(next.place.items).toHaveLength(5);
    expect(next.place.items[0].type).toBe('center-letterUpperH-default');
    expect(next.place.items[1].type).toBe('center-letterLowerI-default');
    expect(next.center.text.middle).toBe('');
    expect(execute('set_cake_text', { text: 'Hi 123', style: 'buttercream' }).response.error).toBeTruthy();
    expect(execute('set_cake_text', { text: 'x'.repeat(61), style: 'piping' }).response.error).toBeTruthy();
    const blocked = structuredClone(DEFAULT_CONFIG); blocked.place.items = [{ type: 'center-basketball-default', x: 0, z: 0 }];
    const { response, onChange } = execute('set_cake_text', { text: 'Hello', style: 'buttercream' }, blocked);
    expect(response.error).toMatch(/overlap/); expect(onChange).not.toHaveBeenCalled();
  });
  it('passes border and text colors to the renderer without recoloring other center decorations', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const config = structuredClone(DEFAULT_CONFIG);
    config.sugarColorOverrides.center = { mode: 'colorOverride', colorId: 'chocolate' };
    let next = execute('set_edge_border', { slot: 'top', designId: 'shellAlt', colorId: 'pink', secondaryColorId: 'red' }, config).next;
    next = execute('set_cake_text', { text: 'Hi', style: 'buttercream', colorId: 'pink' }, next).next;
    const rendered = adaptConfigToLegacy(next);
    expect(rendered.edgeTop.pipingTip).toBe('shellAlt');
    expect(rendered.edgeTop.pipingColorId).toBe('pink');
    expect(rendered.edgeTop.pipingSecondaryColorId).toBe('red');
    expect(next.place.items).toHaveLength(2);
    expect(next.place.items.every(item => item.colorId === 'pink')).toBe(true);
    expect(rendered.centerTextColorId).toBe('pink');
    expect(rendered.centerDecorationColorId).toBe('chocolate');
    log.mockRestore();
  });
  it.each([
    ['set_structure', { layers: 10 }],
    ['set_structure', { size: 'invented' }],
    ['set_sponge_flavor', {}],
    ['set_filling', { enabled: 'true' }],
    ['set_exterior_finish', { arbitraryField: true }],
    ['set_side_treatment', { mode: 'none', setId: 'invented' }],
    ['place_center_decoration', { designId: 'cherry', slot: 'invented' }],
    ['unknown_tool', {}],
  ])('rejects invalid %s arguments without changing the design', (name, input) => {
    const { response, onChange } = execute(name, input);
    expect(response.error).toBeTruthy();
    expect(response.label).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('updates real dimensions and removes center items when changing tier structure', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.structure.layers = 2;
    config.structure.layerDesign = 'individual';
    config.place.items = [{ id: 'one', type: 'center-cherry-default' }, { id: 'other', type: 'candle' }];
    const { next } = execute('set_structure', { size: '6x6', layers: 1 }, config);
    expect(next.structure).toMatchObject({ size: '6x6', layers: 1, layerDesign: 'uniform' });
    expect(next.realSize).toEqual(SIZE_OPTIONS.find(size => size.id === '6x6').dimensions);
    expect(next.place.items).toEqual([{ id: 'other', type: 'candle' }]);
    expect(config.structure.layers).toBe(2);
  });

  it('updates cake size to 10x10 and 12x12 with correct real dimensions', () => {
    const { next: next10 } = execute('set_structure', { size: '10x10' });
    expect(next10.structure.size).toBe('10x10');
    expect(next10.realSize).toEqual({ diameter: 10, height: 8 });

    const { next: next12 } = execute('set_structure', { size: '12x12' });
    expect(next12.structure.size).toBe('12x12');
    expect(next12.realSize).toEqual({ diameter: 12, height: 10 });
  });

  it('rejects 2 tiers for all cake sizes', () => {
    const { response } = execute('set_structure', { size: '6x6', layers: 2 });
    expect(response.error).toBe('All cakes are limited to 1 tier only.');
  });

  it('updates cake shape to rectangle, square, and round', () => {
    const { next: nextRect } = execute('set_structure', { shape: 'rectangle' });
    expect(nextRect.structure.shape).toBe('rectangle');

    const { next: nextSquare } = execute('set_structure', { shape: 'square' });
    expect(nextSquare.structure.shape).toBe('square');
    // Square shape should default to 8x8 if current size isn't 6x6 or 8x8
    expect(['6x6', '8x8']).toContain(nextSquare.structure.size);

    const { next: nextRound } = execute('set_structure', { shape: 'round' });
    expect(nextRound.structure.shape).toBe('round');
  });

  it('switches to Petit Fours with a matching size and keeps the Cake Shape', () => {
    const { next } = execute('set_structure', { cakeFormat: 'petitsFour' });
    expect(next.structure).toMatchObject({ cakeFormat: 'petitsFour', format: 'petitsFour', size: 'classicCube', layers: 1, shape: 'round' });
    expect(next.realSize).toEqual(SIZE_OPTIONS.find(size => size.id === 'classicCube').dimensions);

    // Picking a shape must never reset the format or size of the four pieces.
    const shaped = execute('set_structure', { shape: 'rectangle' }, next).next;
    expect(shaped.structure).toMatchObject({ cakeFormat: 'petitsFour', size: 'classicCube', shape: 'rectangle' });
  });

  it('picks a matching size when switching between formats', () => {
    const bento = execute('set_structure', { cakeFormat: 'bento' }).next;
    expect(bento.structure).toMatchObject({ cakeFormat: 'bento', size: 'standardBento', layers: 1 });

    const standard = execute('set_structure', { cakeFormat: 'standard' }, bento).next;
    expect(standard.structure).toMatchObject({ cakeFormat: 'standard', size: '8x8' });
  });

  it('rejects two tiers for all cake types', () => {
    expect(execute('set_structure', { layers: 2 }).response.error).toBe('All cakes are limited to 1 tier only.');
    expect(execute('set_structure', { size: 'miniBento', layers: 2 }).response.error).toBe('All cakes are limited to 1 tier only.');
    expect(execute('set_structure', { size: 'largeCube', layers: 2 }).response.error).toBe('All cakes are limited to 1 tier only.');
    expect(execute('set_structure', { size: '8x8', layers: 2 }).response.error).toBe('All cakes are limited to 1 tier only.');
    expect(execute('set_structure', { size: '10x10', layers: 2 }).response.error).toBe('All cakes are limited to 1 tier only.');
  });

  it('restricts square shape to supported Standard sizes and selects Bento square sizes', () => {
    // Setting square shape with a non-allowed size should force size to 8x8
    const config = structuredClone(DEFAULT_CONFIG);
    config.structure.size = '10x10';
    const { next } = execute('set_structure', { shape: 'square' }, config);
    expect(next.structure.shape).toBe('square');
    expect(next.structure.size).toBe('8x8');

    // Square shape with 6x6 should work fine
    const { next: next6x6 } = execute('set_structure', { size: '6x6', shape: 'square' });
    expect(next6x6.structure).toMatchObject({ size: '6x6', shape: 'square' });

    // Square shape with 8x8 should work fine
    const { next: next8x8 } = execute('set_structure', { size: '8x8', shape: 'square' });
    expect(next8x8.structure).toMatchObject({ size: '8x8', shape: 'square' });

    const bentoSquare = execute('set_structure', { cakeFormat: 'bento', shape: 'square' }).next;
    expect(bentoSquare.structure).toMatchObject({ cakeFormat: 'bento', size: 'squareBento3x3', shape: 'square' });
    expect(bentoSquare.realSize).toEqual({ diameter: 3, height: 3 });

    const inferredSquare = execute('set_structure', { size: 'squareBento2x2' }).next;
    expect(inferredSquare.structure).toMatchObject({ cakeFormat: 'bento', size: 'squareBento2x2', shape: 'square' });
  });

  it('fills all four Petit Fours variant slots for per-piece edits', () => {
    const petits = execute('set_structure', { cakeFormat: 'petitsFour' }).next;
    const flavors = execute('set_sponge_flavor', { flavor: 'chocolate' }, petits).next;
    expect(flavors.sponge.layerFlavors).toEqual(Array(4).fill('chocolate'));

    const finished = execute('set_exterior_finish', { style: 'fullyFrosted' }, petits).next;
    expect(finished.exteriorFinish.layerStyles).toEqual(Array(4).fill('fullyFrosted'));
  });

  it('changes whole-cake flavors on both individually configured tiers', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.structure.layers = 2;
    config.structure.layerDesign = 'individual';
    const { next } = execute('set_exterior_finish', { flavor: 'chocolate', style: 'fullyFrosted' }, config);
    expect(next.exteriorFinish.layerFlavors).toEqual(['chocolate', 'chocolate']);
    expect(next.exteriorFinish.layerStyles).toEqual(['fullyFrosted', 'fullyFrosted']);
  });

  it('activates a supplied color and replaces stale tier color overrides', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.structure.layers = 2;
    config.sugarColorOverrides = { 'exterior-0': { mode: 'default' } };
    const { next } = execute('set_sugar_color', { colorId: 'chocolate' }, config);
    expect(next.sugarColorOverrides.exterior).toMatchObject({ mode: 'colorOverride', colorId: 'chocolate' });
    expect(next.sugarColorOverrides['exterior-0']).toEqual(next.sugarColorOverrides.exterior);
    expect(next.sugarColorOverrides['exterior-1']).toEqual(next.sugarColorOverrides.exterior);
  });

  it('keeps filling disabled when the same request changes its layer count', () => {
    expect(execute('set_filling', { enabled: false, layers: 2 }).next.filling.enabled).toBe(false);
  });

  it('makes a pink exterior visible on a naked cake and reports the added frosting', () => {
    const { next, response } = execute('set_sugar_color', { colorId: 'pink' });
    expect(next.exteriorFinish.style).toBe('fullyFrosted');
    expect(next.exteriorFinish.layerStyles).toEqual(['fullyFrosted']);
    expect(next.sugarColorOverrides.exterior).toMatchObject({ mode: 'colorOverride', colorId: 'pink' });
    expect(response.result.addedFrosting).toBe(true);
    expect(response.label).toContain('added frosting');
  });

  it('coats only naked tiers while preserving textured buttercream', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.structure = { ...config.structure, layers: 2, layerDesign: 'individual' };
    config.exteriorFinish.layerStyles = ['naked', 'texturedButtercream'];
    const { next } = execute('set_sugar_color', { colorId: 'pink' }, config);
    expect(next.exteriorFinish.layerStyles).toEqual(['fullyFrosted', 'texturedButtercream']);
    expect(config.exteriorFinish.layerStyles).toEqual(['naked', 'texturedButtercream']);
  });

  it.each([{ context: 'filling', colorId: 'pink' }, { mode: 'default' }])(
    'does not add exterior frosting for %j', input => {
      expect(execute('set_sugar_color', input).next.exteriorFinish.style).toBe('naked');
    }
  );

  it('places selectable decorations at the actual top-tier radius', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.structure.layers = 2;
    const { next } = execute('place_center_decoration', { designId: 'cherry', slot: 'inner-0' }, config);
    const item = next.place.items[0];
    expect(item.id).toBeTruthy();
    expect(item).toMatchObject(computeSlotPosition(TOP_SURFACE_SLOTS.find(slot => slot.id === 'inner-0'), 3));
    expect(item).toMatchObject({ rotation: 0, tiltX: 0, tiltZ: 0 });
  });

  it('finds another position for repeated decorations and rejects an occupied exact slot', () => {
    const first = execute('place_center_decoration', { designId: 'cherry' }).next;
    const second = execute('place_center_decoration', { designId: 'cherry' }, first).next;
    expect(second.place.items[1].id).not.toBe(second.place.items[0].id);
    expect(second.place.items[1].x).not.toBe(second.place.items[0].x);
    const failed = execute('place_center_decoration', { designId: 'cherry', slot: 'center-0' }, second);
    expect(failed.response.error).toBeTruthy();
    expect(failed.onChange).not.toHaveBeenCalled();
  });

  it('enforces decoration limits before placement', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.place.items = Array.from({ length: 10 }, (_, id) => ({ id, type: 'center-cherry-default', x: id, z: 0 }));
    expect(execute('place_center_decoration', { designId: 'cherry' }, config).response.error).toMatch(/limit/);
  });

  it('clears center items from both stores without deleting other decorations', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.place.items = [{ type: 'center-cherry-default' }, { type: 'candle' }];
    config.placedItems = [{ type: 'center-cherry-default' }, { type: 'candle' }];
    const { next } = execute('clear_center_decorations', {}, config);
    expect(next.place.items).toEqual([{ type: 'candle' }]);
    expect(next.placedItems).toEqual([{ type: 'candle' }]);
  });
});
