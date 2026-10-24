import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SurfaceDesignIcon, {
  GlazeLongGapsIcon,
  GlazeLongShortAltIcon,
  GlazeShortDripsIcon,
  GlazeLongWaveIcon,
  GlazeMidWaveIcon,
  GlazeShortWaveIcon,
  GlazeUnevenComboIcon,
  GlazeTinyTipIcon,
} from './SurfaceDesignIcons';

describe('SurfaceDesignIcon', () => {
  const allPatterns = [
    'longGaps',
    'longShortAlt',
    'shortDrips',
    'longWave',
    'midWave',
    'shortWave',
    'unevenCombo',
    'tinyTip',
  ];

  it.each(allPatterns)('renders svg circle for pattern %s', (patternId) => {
    const { container } = render(<SurfaceDesignIcon patternId={patternId} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.querySelector('circle')).toBeTruthy();
  });

  it('renders default icon when pattern is unrecognized', () => {
    const { container } = render(<SurfaceDesignIcon patternId="unknown-pattern" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('exports individual pattern icon components', () => {
    expect(GlazeLongGapsIcon).toBeDefined();
    expect(GlazeLongShortAltIcon).toBeDefined();
    expect(GlazeShortDripsIcon).toBeDefined();
    expect(GlazeLongWaveIcon).toBeDefined();
    expect(GlazeMidWaveIcon).toBeDefined();
    expect(GlazeShortWaveIcon).toBeDefined();
    expect(GlazeUnevenComboIcon).toBeDefined();
    expect(GlazeTinyTipIcon).toBeDefined();
  });
});
