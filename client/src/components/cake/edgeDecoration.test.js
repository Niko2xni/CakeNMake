import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EdgeSection from './sections/EdgeSection';
import { computeEdgeTrimRadius, computeEdgeTrimY } from './DecorationSets';

describe('edge decoration placement', () => {
  it('embeds trim below the top face and keeps the inside-the-rim hug for frosting finishes', () => {
    expect(computeEdgeTrimY(1.25, 1.0, 'beadedTrim', 'fullyFrosted')).toBeCloseTo(1.09, 3);
    expect(computeEdgeTrimY(1.25, 1.0, 'piping', 'fullyFrosted')).toBeCloseTo(1.07, 3);
    expect(computeEdgeTrimY(1.25, 1.0, 'piping', 'texturedButtercream')).toBeCloseTo(1.07, 3);
    expect(computeEdgeTrimRadius(1.0, 'beadedTrim', 'fullyFrosted')).toBeCloseTo(0.54, 3);
    expect(computeEdgeTrimRadius(1.0, 'piping', 'texturedButtercream')).toBeCloseTo(0.46, 3);
    expect(computeEdgeTrimRadius(1.0, 'piping', 'naked')).toBeCloseTo(0.56, 3);
  });

  it('does not render the generic None option in the edge picker and uses dedicated design rows', () => {
    render(
      React.createElement(EdgeSection, {
        edge: {
          mode: 'both',
          both: {
            decorations: { setId: null, colorId: 'vanilla' },
            piping: { tip: null, colorId: 'vanilla' },
          },
          top: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
          middle: { piping: { tip: null, colorId: 'vanilla' } },
        },
        onChange: () => {},
        sugarColor: {},
        onSugarColorChange: () => {},
      })
    );

    expect(screen.queryByRole('button', { name: 'None' })).not.toBeInTheDocument();
    expect(screen.getByText('Rope')).toBeInTheDocument();
    expect(screen.getByText('Beaded Trim')).toBeInTheDocument();
  });
});
