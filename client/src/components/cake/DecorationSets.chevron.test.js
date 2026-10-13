import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildChevronSideStripes, getChevronCoverageFn } from './DecorationSets';
import { CHEVRON_PATTERN_SETS } from '../../lib/cakeConfig';

describe('Chevron Pattern options and striping', () => {
  it('does not include multiColor and includes threeTone next to twoTone', () => {
    const ids = CHEVRON_PATTERN_SETS.map((s) => s.id);
    expect(ids).not.toContain('multiColor');
    expect(ids).toContain('twoTone');
    expect(ids).toContain('threeTone');
    const twoToneIdx = ids.indexOf('twoTone');
    const threeToneIdx = ids.indexOf('threeTone');
    expect(threeToneIdx).toBe(twoToneIdx + 1);
  });

  it('alternates colors for Two-Tone with 1st color on even rows and 2nd color on odd rows', () => {
    const group = buildChevronSideStripes(2, 3, {
      setId: 'twoTone',
      color: '#111111',
      secondaryColor: '#222222',
    });
    expect(group.children).toHaveLength(5);
    const colors = group.children.map((child) => child.material.userData.frostColor);
    // row 0: even -> #111111
    // row 1: odd -> #222222
    // row 2: even -> #111111
    // row 3: odd -> #222222
    // row 4: even -> #111111
    expect(colors).toEqual(['#111111', '#222222', '#111111', '#222222', '#111111']);
  });

  it('reverses Two-Tone logic for Three-Tone with 2nd color on even rows and 1st color on odd rows', () => {
    const group = buildChevronSideStripes(2, 3, {
      setId: 'threeTone',
      color: '#111111',
      secondaryColor: '#222222',
    });
    expect(group.children).toHaveLength(5);
    const colors = group.children.map((child) => child.material.userData.frostColor);
    // row 0: even -> #222222 (2nd color)
    // row 1: odd -> #111111 (1st color)
    // row 2: even -> #222222 (2nd color)
    // row 3: odd -> #111111 (1st color)
    // row 4: even -> #222222 (2nd color)
    expect(colors).toEqual(['#222222', '#111111', '#222222', '#111111', '#222222']);
  });

  it('computes coverage properly for threeTone', () => {
    const fn = getChevronCoverageFn(2, 3, { setId: 'threeTone' });
    expect(typeof fn).toBe('function');
    // Center of row 0 is covered
    const rowHeight = 3 / 5;
    const row0Y = -3 / 2 + 0.5 * rowHeight;
    expect(fn(0, row0Y)).toBeGreaterThan(0.5);
  });
});
