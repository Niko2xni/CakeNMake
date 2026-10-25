import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bakeryApi } from '@/services/api';
import BakeryBlueprints from './BakeryBlueprints';

vi.mock('@/services/api', () => ({
  bakeryApi: {
    getBlueprints: vi.fn(),
    getBlueprintAccess: vi.fn(),
  },
}));

vi.mock('@/lib/chat-socket', () => ({
  getChatSocket: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/components/shared/CustomScrollbar', () => ({
  default: ({ children, className }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/bakery/SidePatternsGalleryModal', () => ({
  default: () => null,
}));

const mockRecords = [
  {
    id: 'bp-1',
    customerName: 'Nikolai Ng',
    designName: '9:16 PM Cake Order',
    deliveryDate: '2026-11-02T00:00:00.000Z',
    totalMinor: 120000,
    currency: 'PHP',
    status: 'completed',
  },
  {
    id: 'bp-2',
    customerName: 'Jizel Vergara',
    designName: 'Choco Vanilla Size',
    deliveryDate: '2026-11-02T00:00:00.000Z',
    totalMinor: 95000,
    currency: 'PHP',
    status: 'in_production',
  },
  {
    id: 'bp-3',
    customerName: 'Edrian Paul Dariguez',
    designName: 'Custom Cake 1',
    deliveryDate: '2026-11-02T00:00:00.000Z',
    totalMinor: 125000,
    currency: 'PHP',
    status: 'ready',
  },
  {
    id: 'bp-4',
    customerName: 'Uploading User',
    designName: 'Pending Cake',
    deliveryDate: '2026-11-05T00:00:00.000Z',
    totalMinor: 80000,
    currency: 'PHP',
    status: 'uploading',
  },
  {
    id: 'bp-5',
    customerName: 'Failed User',
    designName: 'Failed Cake',
    deliveryDate: '2026-11-06T00:00:00.000Z',
    totalMinor: 50000,
    currency: 'PHP',
    status: 'failed',
    failureReason: 'Network error',
  },
];

describe('BakeryBlueprints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bakeryApi.getBlueprints.mockResolvedValue(mockRecords);
  });

  it('renders status badges with appropriate labels and colors', async () => {
    render(<BakeryBlueprints />);

    await waitFor(() => {
      expect(screen.getByText('Nikolai Ng')).toBeInTheDocument();
    });

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Production')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Uploading')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('displays View and Download buttons for ready, in-production, and completed blueprints', async () => {
    render(<BakeryBlueprints />);

    await waitFor(() => {
      expect(screen.getByText('Nikolai Ng')).toBeInTheDocument();
    });

    // 3 accessible records (completed, in_production, ready)
    const viewButtons = screen.getAllByRole('button', { name: 'View' });
    const downloadButtons = screen.getAllByRole('button', { name: 'Download' });

    expect(viewButtons).toHaveLength(3);
    expect(downloadButtons).toHaveLength(3);
  });

  it('calls getBlueprintAccess when clicking View on in-production blueprint', async () => {
    bakeryApi.getBlueprintAccess.mockResolvedValue({ url: 'https://example.com/test.pdf' });
    render(<BakeryBlueprints />);

    await waitFor(() => {
      expect(screen.getByText('Jizel Vergara')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: 'View' });
    // Jizel is the second record with buttons (index 1)
    fireEvent.click(viewButtons[1]);

    await waitFor(() => {
      expect(bakeryApi.getBlueprintAccess).toHaveBeenCalledWith('bp-2', false);
    });
  });

  it('filters records when searching for in production status', async () => {
    render(<BakeryBlueprints />);

    await waitFor(() => {
      expect(screen.getByText('Jizel Vergara')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Search blueprints');
    fireEvent.change(searchInput, { target: { value: 'in production' } });

    expect(screen.getByText('Jizel Vergara')).toBeInTheDocument();
    expect(screen.queryByText('Nikolai Ng')).not.toBeInTheDocument();
    expect(screen.queryByText('Edrian Paul Dariguez')).not.toBeInTheDocument();
  });
});
