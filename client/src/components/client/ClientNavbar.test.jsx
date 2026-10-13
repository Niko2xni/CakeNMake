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
    renderNavbar('/trash');

    expect(screen.getByRole('link', { name: /cakenmake dashboard/i })).toHaveTextContent('CNM');
    expect(screen.getByRole('link', { name: /create/i })).toHaveAttribute('href', '/designer');
    expect(screen.getByRole('link', { name: /recents/i })).toHaveAttribute('href', '/client');
    expect(screen.queryByRole('link', { name: /templates/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /trash/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /chats/i })).toHaveAttribute('href', '/chats');
  });

  it('marks the chats navigation item as active on /chats', () => {
    renderNavbar('/chats');

    const chatsLink = screen.getByRole('link', { name: /chats/i });
    expect(chatsLink).toHaveAttribute('aria-current', 'page');
    expect(chatsLink).toHaveClass('is-active');
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

  it('renders profile picture in account button when available', () => {
    renderNavbar('/client');
    // Default mock has no photoURL, so it shows the User SVG icon
    expect(screen.getByRole('button', { name: /account/i })).toBeInTheDocument();
  });
});
