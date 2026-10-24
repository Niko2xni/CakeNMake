import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PageLoadingSkeleton from './PageLoadingSkeleton';

const routedPages = [
  '/',
  '/designer',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/login-success',
  '/client',
  '/profile',
  '/settings',
  '/templates',
  '/cake-ai',
  '/trash',
  '/chats',
  '/support',
  '/bakery',
  '/bakery/',
  '/bakery/orders',
  '/bakery/designer',
  '/bakery/reservations',
  '/bakery/pricing',
  '/bakery/templates',
  '/bakery/transactions',
  '/bakery/chats',
  '/bakery/assets',
  '/bakery/billing',
  '/bakery/blueprints',
  '/bakery/profile',
];

describe('PageLoadingSkeleton', () => {
  it.each(routedPages)('renders a page-shaped loading state for %s', (path) => {
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <PageLoadingSkeleton />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveAccessibleName(/loading/i);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(1);
  });

  it('uses the landing hero layout at the root route', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <PageLoadingSkeleton />
      </MemoryRouter>,
    );

    expect(container.querySelector('.landing-hero')).toBeInTheDocument();
    expect(container.querySelector('.occasion-strip')).toBeInTheDocument();
    expect(container.querySelector('.cn-sidebar')).not.toBeInTheDocument();
  });

  it('removes the right panel skeleton for designer when sentToBakery is true', () => {
    const { container: regularContainer } = render(
      <MemoryRouter initialEntries={['/designer']}>
        <PageLoadingSkeleton />
      </MemoryRouter>,
    );
    expect(regularContainer.querySelector('section.w-80')).toBeInTheDocument();

    const { container: sentPropContainer } = render(
      <MemoryRouter initialEntries={['/designer']}>
        <PageLoadingSkeleton sentToBakery />
      </MemoryRouter>,
    );
    expect(sentPropContainer.querySelector('section.w-80')).not.toBeInTheDocument();

    const { container: sentQueryContainer } = render(
      <MemoryRouter initialEntries={['/designer?sentToBakery=true']}>
        <PageLoadingSkeleton />
      </MemoryRouter>,
    );
    expect(sentQueryContainer.querySelector('section.w-80')).not.toBeInTheDocument();
  });
});
