import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientNavbar from './ClientNavbar';
import BakeryNavbar from '../bakery/BakeryNavbar';

const mocks = vi.hoisted(() => ({ logout: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { email: 'customer@example.com' }, logout: mocks.logout }) }));
vi.mock('react-hot-toast', () => ({ default: { error: mocks.error } }));

function mount(Component) {
  render(<MemoryRouter initialEntries={['/private']}><Routes>
    <Route path="/private" element={<Component />} />
    <Route path="/login" element={<div>Login destination</div>} />
  </Routes></MemoryRouter>);
}
describe('navigation logout', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.logout.mockResolvedValue(); });
  it('signs out the customer before navigating', async () => {
    let finish;
    mocks.logout.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    mount(ClientNavbar);
    fireEvent.click(screen.getByRole('button', { name: 'Account' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));
    expect(mocks.logout).toHaveBeenCalledWith(false);
    expect(screen.queryByText('Login destination')).not.toBeInTheDocument();
    finish();
    expect(await screen.findByText('Login destination')).toBeInTheDocument();
  });
  it('signs out from the bakery desktop navigation', async () => {
    mount(BakeryNavbar);
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByText('Login destination')).toBeInTheDocument();
    expect(mocks.logout).toHaveBeenCalledWith(false);
  });
  it('signs out from the bakery mobile menu', async () => {
    mount(BakeryNavbar);
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Log out' })[1]);
    expect(await screen.findByText('Login destination')).toBeInTheDocument();
    expect(mocks.logout).toHaveBeenCalledWith(false);
  });
  it('shows a failure and allows retry without navigating', async () => {
    mocks.logout.mockRejectedValueOnce(new Error('sign-out failed'));
    mount(BakeryNavbar);
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.queryByText('Login destination')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeEnabled();
  });
});
