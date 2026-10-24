import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FillingDesignIcon, {
  FillingNoneIcon,
  FillingMashedCirclesIcon,
  FillingMashedSwirlsIcon,
} from './FillingDesignIcons';

describe('FillingDesignIcons', () => {
  it('renders FillingNoneIcon for "none" or null', () => {
    const { container: c1 } = render(<FillingDesignIcon designId="none" />);
    expect(c1.querySelector('svg')).toBeInTheDocument();
    expect(c1.querySelector('rect')).toBeInTheDocument();

    const { container: c2 } = render(<FillingNoneIcon />);
    expect(c2.querySelector('svg')).toBeInTheDocument();
  });

  it('renders FillingMashedCirclesIcon for "mashedCircles"', () => {
    const { container } = render(<FillingDesignIcon designId="mashedCircles" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    // 3 mashed round circles + outer circle = 4 circles
    expect(container.querySelectorAll('circle').length).toBe(4);
    // 3 crescent specular highlights
    expect(container.querySelectorAll('path').length).toBe(3);
  });

  it('renders FillingMashedSwirlsIcon for "mashedSwirls"', () => {
    const { container } = render(<FillingDesignIcon designId="mashedSwirls" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    // 3 mashed circles + outer circle = 4 circles
    expect(container.querySelectorAll('circle').length).toBe(4);
    // 2 sponge guide lines + 6 spiral slash lines = 8 lines
    expect(container.querySelectorAll('line').length).toBe(8);
  });
});
