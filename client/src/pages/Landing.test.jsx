import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Landing from './Landing';

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('Landing page presentation', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not present static content as a carousel or interactive process', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);

    expect(screen.queryByText('01 / 04')).not.toBeInTheDocument();

    const firstStep = screen.getByRole('heading', { name: 'Set the scene' }).closest('article');
    expect(firstStep).toBeInTheDocument();
    expect(within(firstStep).queryByRole('button')).not.toBeInTheDocument();
    expect(within(firstStep).queryByRole('link')).not.toBeInTheDocument();
  });

  it('uses a distinct composition for the example brief and keeps the FAQ accessible', () => {
    const { container } = render(<MemoryRouter><Landing /></MemoryRouter>);

    const heroImage = container.querySelector('#home .hero-background');
    const briefImage = screen.getByAltText(/cake shown inside the cakenmake design preview/i);
    expect(heroImage).toHaveAttribute('src', expect.stringContaining('landing-page-bg'));
    expect(heroImage.getAttribute('src')).not.toBe(briefImage.getAttribute('src'));

    const sectionIds = [...container.querySelectorAll('main > section')].map((section) => section.id);
    expect(sectionIds.indexOf('about')).toBeLessThan(sectionIds.indexOf('design-brief'));

    const firstQuestion = screen.getByText('Do I need design experience?').closest('details');
    expect(firstQuestion).toHaveAttribute('open');
    expect(screen.getByText(/a clear brief gives your baker a practical starting point/i)).toBeVisible();
  });
});
