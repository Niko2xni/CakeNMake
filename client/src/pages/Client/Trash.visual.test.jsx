import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Trash from './Trash';

const apiMocks = vi.hoisted(() => ({
  getDesigns: vi.fn(),
  restoreFromTrash: vi.fn(),
  permanentlyDelete: vi.fn(),
  deleteAllTrash: vi.fn(),
}));

vi.mock('@/services/api', () => ({ designApi: apiMocks }));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'Jane Doe', email: 'jane@example.com' },
  }),
}));

const trashedDesign = {
  _id: 'design-1',
  name: 'Garden Celebration',
  isTrashed: true,
  lastEdited: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  config: { layers: 2, toppings: [] },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/trash']}>
      <Trash />
    </MemoryRouter>,
  );
}

describe('Trash page states and actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getDesigns.mockResolvedValue([]);
    apiMocks.restoreFromTrash.mockResolvedValue({});
    apiMocks.permanentlyDelete.mockResolvedValue({});
  });

  it('offers useful next actions when trash is empty', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Trash is empty' })).toBeVisible();
    expect(screen.getByLabelText(/0 of 20 designs/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /how trash works/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create a design/i })).toHaveAttribute('href', '/designer');
    expect(screen.getByRole('link', { name: /browse templates/i })).toHaveAttribute('href', '/templates');
    expect(apiMocks.getDesigns).toHaveBeenCalledWith({ trashOnly: true });
  });

  it('keeps retention guidance in an accessible disclosure', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Trash is empty' });

    const disclosure = screen.getByRole('button', { name: /how trash works/i });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(disclosure);

    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading', { name: /how trash works/i })).toBeVisible();
    expect(screen.getByText(/twenty-design capacity/i)).toBeInTheDocument();
  });

  it('distinguishes a failed request from an empty trash and can retry', async () => {
    apiMocks.getDesigns.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    renderPage();

    expect(await screen.findByRole('heading', { name: /trash could not be loaded/i })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: 'Trash is empty' })).toBeVisible();
    expect(apiMocks.getDesigns).toHaveBeenCalledTimes(2);
  });

  it('requires confirmation before permanently deleting a design', async () => {
    apiMocks.getDesigns.mockResolvedValue([trashedDesign]);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /open actions for garden celebration/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /delete permanently/i }));

    expect(apiMocks.permanentlyDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /delete “garden celebration” permanently/i })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));
    await waitFor(() => expect(apiMocks.permanentlyDelete).toHaveBeenCalledWith('design-1'));
  });

  it('restores a design through the existing API flow', async () => {
    apiMocks.getDesigns.mockResolvedValue([trashedDesign]);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /restore design/i }));

    await waitFor(() => expect(apiMocks.restoreFromTrash).toHaveBeenCalledWith('design-1'));
    expect(await screen.findByRole('heading', { name: 'Trash is empty' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(/was restored/i);
  });

  it('shows the current capacity and remaining recovery time', async () => {
    apiMocks.getDesigns.mockResolvedValue([
      trashedDesign,
      { ...trashedDesign, _id: 'design-2', name: 'Second design' },
      { ...trashedDesign, _id: 'design-3', name: 'Third design' },
      { ...trashedDesign, _id: 'design-4', name: 'Fourth design' },
    ]);
    renderPage();

    expect(await screen.findByLabelText(/4 of 20 designs/i)).toBeInTheDocument();
    expect(screen.getAllByText(/days left to restore/i)).toHaveLength(4);
  });

  it('permanently deletes all trashed designs when confirmed', async () => {
    apiMocks.getDesigns.mockResolvedValue([trashedDesign, { ...trashedDesign, _id: 'design-2' }]);
    apiMocks.deleteAllTrash.mockResolvedValue({ message: 'Deleted', count: 2 });
    renderPage();

    const deleteAllBtn = await screen.findByRole('button', { name: /delete all designs in trash permanently/i });
    fireEvent.click(deleteAllBtn);

    expect(await screen.findByRole('heading', { name: /delete all 2 designs permanently/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete all permanently' }));

    await waitFor(() => expect(apiMocks.deleteAllTrash).toHaveBeenCalled());
    expect(await screen.findByRole('heading', { name: 'Trash is empty' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(/all 2 designs were permanently deleted/i);
  });
});
