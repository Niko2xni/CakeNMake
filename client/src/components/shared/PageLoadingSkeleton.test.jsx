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
  '/bakery',
  '/bakery/',
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
});
