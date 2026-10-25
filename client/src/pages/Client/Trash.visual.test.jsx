import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('permanently deletes all trashed designs when confirmed with typed verification', async () => {
    apiMocks.getDesigns.mockResolvedValue([trashedDesign, { ...trashedDesign, _id: 'design-2' }]);
    apiMocks.deleteAllTrash.mockResolvedValue({ message: 'Deleted', count: 2 });
    renderPage();

    const deleteAllBtn = await screen.findByRole('button', { name: /delete all designs in trash permanently/i });
    fireEvent.click(deleteAllBtn);

    expect(await screen.findByRole('heading', { name: /delete all 2 designs permanently/i })).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Delete all permanently' });
    expect(confirmBtn).toBeDisabled();

    const input = screen.getByPlaceholderText('Type "Delete all designs"');
    fireEvent.change(input, { target: { value: 'random phrase' } });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Delete all designs' } });
    expect(confirmBtn).toBeEnabled();

    fireEvent.click(confirmBtn);

    await waitFor(() => expect(apiMocks.deleteAllTrash).toHaveBeenCalled());
    expect(await screen.findByRole('heading', { name: 'Trash is empty' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(/all 2 designs were permanently deleted/i);
  });

  it('displays design details modal with formatted config specs', async () => {
    const detailedDesign = {
      _id: 'design-detail',
      name: 'Custom Velvet Elegance',
      isTrashed: true,
      createdAt: '2026-10-01T10:00:00.000Z',
      lastEdited: '2026-10-15T12:00:00.000Z',
      trashedAt: '2026-10-20T12:00:00.000Z',
      config: {
        layers: 3,
        cakeColor: 'Red Velvet',
        frostingColor: 'Cream Cheese',
        toppings: [{ name: 'Gold Leaf' }, { name: 'Fresh Berries' }],
      },
      lastEstimate: {
        totalMinor: 450000,
        currency: 'PHP',
      },
      sentToBakery: true,
    };

    apiMocks.getDesigns.mockResolvedValue([detailedDesign]);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /open actions for custom velvet elegance/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /details/i }));

    const modal = await screen.findByRole('dialog', { name: 'Design Details' });
    expect(modal).toBeVisible();
    expect(within(modal).getByText('Custom Velvet Elegance')).toBeInTheDocument();
    expect(within(modal).getByText('3')).toBeInTheDocument();
    expect(within(modal).getByText('Red Velvet')).toBeInTheDocument();
    expect(within(modal).getByText('Cream Cheese')).toBeInTheDocument();
    expect(within(modal).getByText('Gold Leaf, Fresh Berries')).toBeInTheDocument();
    expect(within(modal).getByText('Yes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Design Details' })).not.toBeInTheDocument();
    });
  });

  it('displays error notification when single restore fails', async () => {
    apiMocks.getDesigns.mockResolvedValue([trashedDesign]);
    apiMocks.restoreFromTrash.mockRejectedValue(new Error('Network error'));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /restore design/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/that design could not be restored/i);
    expect(screen.getByText('Garden Celebration')).toBeInTheDocument();
  });

  it('displays error when single permanent delete fails and allows modal cancellation', async () => {
    apiMocks.getDesigns.mockResolvedValue([trashedDesign]);
    apiMocks.permanentlyDelete.mockRejectedValue(new Error('Deletion failed'));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /open actions for garden celebration/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /delete permanently/i }));

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete permanently' });
    fireEvent.click(confirmDeleteBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/that design could not be permanently deleted/i);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /delete “garden celebration” permanently/i })).not.toBeInTheDocument();
    });
  });

  it('submits bulk deletion with Enter key and handles bulk deletion failure', async () => {
    apiMocks.getDesigns.mockResolvedValue([trashedDesign]);
    apiMocks.deleteAllTrash.mockRejectedValue(new Error('Bulk delete failed'));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /delete all designs in trash permanently/i }));

    const input = screen.getByPlaceholderText('Type "Delete all designs"');
    fireEvent.change(input, { target: { value: 'Delete all designs' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not permanently delete all designs/i);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /delete all 1 designs permanently/i })).not.toBeInTheDocument();
    });
  });

  it('safely handles designs with null or invalid dates and fallback placeholders', async () => {
    const edgeCaseDesign = {
      _id: 'edge-1',
      name: '',
      isTrashed: true,
      lastEdited: null,
      trashedAt: 'invalid-date',
      thumbnail: null,
      config: null,
    };

    apiMocks.getDesigns.mockResolvedValue([edgeCaseDesign]);
    renderPage();

    expect(await screen.findByText('Untitled design')).toBeInTheDocument();
    expect(screen.getByText('Deleted recently')).toBeInTheDocument();
    expect(screen.getByText('30 days left to restore')).toBeInTheDocument();
  });
});

