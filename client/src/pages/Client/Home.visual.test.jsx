import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientHome from './Home';

const apiMocks = vi.hoisted(() => ({
  getDesigns: vi.fn(),
  createDesign: vi.fn(),
  updateDesign: vi.fn(),
  moveToTrash: vi.fn(),
  moveAllToTrash: vi.fn(),
  restoreFromTrash: vi.fn(),
  getDesignById: vi.fn(),
}));

vi.mock('@/components/client/ClientNavbar', () => ({
  default: () => <nav aria-label="Client navigation" />,
}));

const pricingMocks = vi.hoisted(() => ({
  quoteCake: vi.fn().mockResolvedValue({ totalMinor: 250000, lineItems: [] }),
}));

const accountMocks = vi.hoisted(() => ({
  getTransactions: vi.fn().mockResolvedValue({ transactions: [] }),
  payBalance: vi.fn().mockResolvedValue({ message: 'Success', status: 'in_production' }),
}));

vi.mock('@/services/api', () => ({
  designApi: apiMocks,
  pricingApi: pricingMocks,
  accountApi: accountMocks,
}));

const designs = [
  { _id: 'older', name: 'Garden cake', lastEdited: '2026-09-19T09:00:00Z', thumbnail: 'garden.png', config: {}, sentToBakery: false },
  { _id: 'latest', name: 'Cherry cake', lastEdited: '2026-09-20T09:00:00Z', thumbnail: 'cherry.png', thumbnailFallback: 'cherry-fallback.png', config: { structure: { size: 'big' } }, sentToBakery: true },
];

function renderHome() {
  return render(<MemoryRouter><ClientHome /></MemoryRouter>);
}

describe('ClientHome presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getDesigns.mockResolvedValue([]);
  });

  it('keeps the dashboard focused on starting or continuing real work', async () => {
    apiMocks.getDesigns.mockResolvedValue(designs);
    renderHome();

    const title = screen.getByRole('heading', { name: /welcome to cakenmake/i });
    expect(title).toHaveClass('cn-home-title');
    expect(title).not.toHaveClass('bg-gradient-to-r', 'bg-clip-text', 'text-transparent');

    expect(await screen.findByText('Cherry cake')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your designs/i })).toBeInTheDocument();
    expect(screen.getByText('Latest')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open cherry cake/i })).toHaveAttribute('href', '/designer?designId=latest');
    expect(screen.getByRole('link', { name: /view design/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit design/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /continue designing/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Premium Quality')).not.toBeInTheDocument();
    expect(screen.queryByText('Easy Ordering')).not.toBeInTheDocument();
  });

  it('offers useful first-design and template actions when the table is empty', async () => {
    renderHome();

    expect(await screen.findByText(/cake table is ready/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create a cake/i })).toHaveAttribute('href', '/designer');
    expect(screen.getByRole('link', { name: /browse templates/i })).toHaveAttribute('href', '/templates');
  });

  it('shows a retryable error instead of presenting a failed request as an empty dashboard', async () => {
    apiMocks.getDesigns.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    renderHome();

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(apiMocks.getDesigns).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/cake table is ready/i)).toBeInTheDocument();
  });

  it('opens card actions without navigating and duplicates through the design API copying all details, preserving thumbnail, and resetting sentToBakery to false', async () => {
    apiMocks.getDesigns.mockResolvedValue(designs);
    apiMocks.createDesign.mockResolvedValue({
      ...designs[1],
      _id: 'duplicate',
      name: 'Cherry cake copy',
      sentToBakery: false,
      lastEdited: '2026-09-20T10:00:00Z',
    });
    renderHome();

    fireEvent.click(await screen.findByRole('button', { name: /actions for cherry cake/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: /duplicate/i }));

    await waitFor(() => expect(apiMocks.createDesign).toHaveBeenCalledWith({
      name: 'Cherry cake copy',
      config: { structure: { size: 'big' } },
      thumbnail: 'cherry.png',
      thumbnailFallback: 'cherry-fallback.png',
      sentToBakery: false,
      isDuplicated: true,
    }));
    expect(await screen.findByText('Cherry cake copy')).toBeInTheDocument();
    expect(await screen.findByText('Duplicated')).toBeInTheDocument();
  });

  it('wraps long unbroken design names in the move-to-trash confirmation', async () => {
    const longName = 'HA'.repeat(40);
    apiMocks.getDesigns.mockResolvedValue([{ ...designs[0], name: longName }]);
    renderHome();

    fireEvent.click(await screen.findByRole('button', { name: `Actions for ${longName}` }));
    fireEvent.click(screen.getByRole('menuitem', { name: /move to trash/i }));

    expect(screen.getByRole('heading', { name: `Move “${longName}” to trash?` })).toHaveClass('break-words');
  });

  it('moves all designs to trash through the Move to Trash all button after typing confirmation', async () => {
    apiMocks.getDesigns.mockResolvedValue(designs);
    apiMocks.moveAllToTrash.mockResolvedValue({ message: 'All designs moved to trash', count: 2 });
    renderHome();

    const moveAllBtn = await screen.findByRole('button', { name: /move all designs to trash/i });
    fireEvent.click(moveAllBtn);

    expect(await screen.findByRole('heading', { name: /move all 2 designs to trash\?/i })).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Move all to trash' });
    expect(confirmBtn).toBeDisabled();

    const input = screen.getByPlaceholderText('Type "Move all to trash"');
    fireEvent.change(input, { target: { value: 'wrong phrase' } });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Move all to trash' } });
    expect(confirmBtn).toBeEnabled();

    fireEvent.click(confirmBtn);

    await waitFor(() => expect(apiMocks.moveAllToTrash).toHaveBeenCalled());
    expect(await screen.findByText(/your cake table is ready/i)).toBeInTheDocument();
  });

  it('prevents bypassing the 20 max limit and displays the capacity modal', async () => {
    const twentyDesigns = Array.from({ length: 20 }, (_, i) => ({
      _id: `design-${i}`,
      name: `Cake ${i}`,
      lastEdited: new Date().toISOString(),
      thumbnail: 'cake.png',
      config: {},
      sentToBakery: false,
    }));
    apiMocks.getDesigns.mockResolvedValue(twentyDesigns);
    renderHome();

    expect(await screen.findByText(/max limit reached/i)).toBeInTheDocument();

    // Try duplicating when at 20 limit
    fireEvent.click(await screen.findByRole('button', { name: /actions for cake 0/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /duplicate/i }));

    expect(await screen.findByRole('heading', { name: /maximum design capacity reached \(20\/20\)/i })).toBeInTheDocument();
    expect(apiMocks.createDesign).not.toHaveBeenCalled();

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    // Try searching for nonexistent cake to reveal empty search result
    const searchInput = screen.getByPlaceholderText(/search your designs/i);
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Cake' } });

    expect(await screen.findByText(/no designs found/i)).toBeInTheDocument();
    const createBtn = screen.getByRole('button', { name: /create a new cake/i });
    fireEvent.click(createBtn);

    expect(await screen.findByRole('heading', { name: /maximum design capacity reached \(20\/20\)/i })).toBeInTheDocument();
  });

  it('displays Pay Balance button on design card when associated order has remaining balance, and completes payment to In Progress', async () => {
    const testDesign = {
      _id: 'design-bal-1',
      name: 'Strawberry Birthday Cake',
      lastEdited: '2026-10-24T09:00:00Z',
      thumbnail: 'strawberry.png',
      config: {},
      sentToBakery: true,
    };
    apiMocks.getDesigns.mockResolvedValue([testDesign]);
    accountMocks.getTransactions.mockResolvedValue({
      transactions: [
        {
          id: 'res-order-99',
          designId: 'design-bal-1',
          designName: 'Strawberry Birthday Cake',
          totalPrice: 2000,
          downPayment: { amount: 1000, isPaid: true },
          remainingBalance: 1000,
          status: 'confirmed',
        },
      ],
    });
    accountMocks.payBalance.mockResolvedValue({
      message: 'Payment complete',
      status: 'in_production',
      finalPayment: { amount: 1000, isPaid: true, method: 'gcash' },
    });

    renderHome();

    // Verify "Pay Balance (₱1,000)" button appears inside the design box
    const payBalBtn = await screen.findByRole('button', { name: /pay balance \(₱1,000\)/i });
    expect(payBalBtn).toBeInTheDocument();

    // Click it to open the GCash payment dialog
    fireEvent.click(payBalBtn);

    expect(await screen.findByText('Complete Cake Balance')).toBeInTheDocument();
    expect(screen.getByText(/order #ORDER-99/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pay ₱1,000 with gcash/i })).toBeInTheDocument();

    // Complete simulated payment
    fireEvent.click(screen.getByRole('button', { name: /pay ₱1,000 with gcash/i }));

    expect(await screen.findByText('Payment Complete!')).toBeInTheDocument();
    expect(screen.getByText(/status switched to in production!/i)).toBeInTheDocument();
  });

  it('does not display Pay Balance button on designs where sentToBakery is false', async () => {
    apiMocks.getDesigns.mockResolvedValue([
      {
        _id: 'unsent-design-1',
        name: 'Draft Unsent Cake',
        sentToBakery: false,
        lastEdited: '2026-09-20T10:00:00Z',
      },
    ]);
    accountMocks.getTransactions.mockResolvedValue({
      transactions: [
        {
          id: 'res-order-101',
          designId: 'unsent-design-1',
          designName: 'Draft Unsent Cake',
          totalPrice: 1500,
          downPayment: { amount: 750, isPaid: true },
          remainingBalance: 750,
          status: 'confirmed',
        },
      ],
    });

    renderHome();

    expect(await screen.findByText('Draft Unsent Cake')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pay balance/i })).not.toBeInTheDocument();
  });
});
