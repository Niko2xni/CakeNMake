import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ClientNavbar from './ClientNavbar';

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'Jane Doe', email: 'jane@example.com' },
  }),
}));

function renderNavbar(route = '/client') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ClientNavbar />
    </MemoryRouter>,
  );
}

describe('ClientNavbar', () => {
  it('exposes every primary client destination and marks the current route', () => {
    renderNavbar('/templates');

    expect(screen.getByRole('link', { name: /cakenmake dashboard/i })).toHaveTextContent('CNM');
    expect(screen.getByRole('link', { name: /create/i })).toHaveAttribute('href', '/designer');
    expect(screen.getByRole('link', { name: /recents/i })).toHaveAttribute('href', '/client');
    expect(screen.getByRole('link', { name: /templates/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /trash/i })).toHaveAttribute('href', '/trash');
    expect(screen.queryByRole('link', { name: /chats/i })).not.toBeInTheDocument();
  });

  it('opens an accessible account menu with profile and settings links', () => {
    renderNavbar('/settings');

    fireEvent.click(screen.getByRole('button', { name: /account/i }));

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /profile/i })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('menuitem', { name: /settings/i })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('menuitem', { name: /settings/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('menuitem', { name: /profile/i })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('menuitem', { name: /orders & support/i })).not.toBeInTheDocument();
  });
});
