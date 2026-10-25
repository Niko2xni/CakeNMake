import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Templates from './Templates';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const apiMocks = vi.hoisted(() => ({
  getPublicTemplates: vi.fn(),
  getPublicTemplateById: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  templateApi: apiMocks,
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'John Doe', email: 'john@example.com' },
    account: { displayName: 'John Doe', email: 'john@example.com' },
  }),
}));

const mockSections = [
  {
    _id: 'sec-1',
    name: 'Birthday Celebrations',
    order: 0,
    templates: [
      {
        _id: '671b00010000000000000001',
        name: 'Rainbow Sparkle Cake',
        description: 'Multi-layer fun cake',
        longDescription: 'A delightful and colorful celebration cake loaded with rainbow layers.',
        price: '₱2,450',
        views: [
          { label: 'Front View', url: 'https://example.com/front.png', angle: '0°' },
          { label: 'Top View', url: 'https://example.com/top.png', angle: 'Top' },
        ],
        specs: ['Buttercream Cake', 'Vanilla Sponge', '8 inch Round'],
      },
      {
        _id: '671b00020000000000000002',
        name: 'Chocolate Truffle Bliss',
        description: 'Decadent dark chocolate',
        longDescription: 'Rich chocolate sponge layered with luscious dark chocolate ganache.',
        price: '₱3,100',
        views: [
          { label: 'Front View', url: 'https://example.com/choc.png' },
        ],
        specs: ['Ganache Cake', 'Chocolate Sponge'],
      },
    ],
  },
  {
    _id: 'sec-2',
    name: 'Wedding & Formal',
    order: 1,
    templates: [
      {
        _id: '671b00030000000000000003',
        name: 'Elegance Fondant Tier',
        description: 'Sophisticated tiered cake',
        longDescription: 'Three-tiered fondant cake decorated with delicate hand-piped flowers.',
        price: '₱5,800',
        views: [
          { label: 'Front View', url: 'https://example.com/wedding.png' },
        ],
        specs: ['3-Tier Cake', 'White Fondant'],
      },
    ],
  },
];

const mockAllTemplates = [
  mockSections[0].templates[0],
  mockSections[0].templates[1],
  mockSections[1].templates[0],
];

describe('Templates client page functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    apiMocks.getPublicTemplates.mockResolvedValue({
      sections: mockSections,
      allTemplates: mockAllTemplates,
    });
  });

  it('loads and renders template sections, rows, and cards', async () => {
    render(
      <MemoryRouter>
        <Templates />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/search cake templates/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Birthday Celebrations')).toBeInTheDocument();
      expect(screen.getByText('Wedding & Formal')).toBeInTheDocument();
      expect(screen.getByText('Rainbow Sparkle Cake')).toBeInTheDocument();
      expect(screen.getByText('Chocolate Truffle Bliss')).toBeInTheDocument();
      expect(screen.getByText('Elegance Fondant Tier')).toBeInTheDocument();
    });
  });

  it('filters templates when searching by name, description, or cake ID', async () => {
    render(
      <MemoryRouter>
        <Templates />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Rainbow Sparkle Cake')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search cake templates/i);

    // Filter by name
    fireEvent.change(searchInput, { target: { value: 'Truffle' } });
    expect(screen.queryByText('Rainbow Sparkle Cake')).not.toBeInTheDocument();
    expect(screen.getByText('Chocolate Truffle Bliss')).toBeInTheDocument();

    // Filter by cake ID with leading hash (#)
    fireEvent.change(searchInput, { target: { value: '#000001' } });
    expect(screen.getByText('Rainbow Sparkle Cake')).toBeInTheDocument();
    expect(screen.queryByText('Chocolate Truffle Bliss')).not.toBeInTheDocument();

    // Clear search button clears input
    const clearBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(clearBtn);
    expect(searchInput.value).toBe('');
    expect(screen.getByText('Rainbow Sparkle Cake')).toBeInTheDocument();
    expect(screen.getByText('Chocolate Truffle Bliss')).toBeInTheDocument();
  });

  it('displays empty search result state when no templates match', async () => {
    render(
      <MemoryRouter>
        <Templates />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Rainbow Sparkle Cake')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search cake templates/i);
    fireEvent.change(searchInput, { target: { value: 'NonexistentFluffyCake' } });

    expect(screen.getByText('No matching templates')).toBeInTheDocument();
    expect(screen.getByText(/We couldn't find any cake templates matching/i)).toBeInTheDocument();

    // Clicking Clear Search resets search
    const clearSearchBtn = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearSearchBtn);
    expect(screen.queryByText('No matching templates')).not.toBeInTheDocument();
    expect(screen.getByText('Rainbow Sparkle Cake')).toBeInTheDocument();
  });

  it('displays empty state when the bakery has no published sections/templates', async () => {
    apiMocks.getPublicTemplates.mockResolvedValueOnce({
      sections: [],
      allTemplates: [],
    });

    render(
      <MemoryRouter>
        <Templates />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No templates yet')).toBeInTheDocument();
      expect(screen.getByText(/The bakery hasn't published any template designs yet/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /start designing/i })).toHaveAttribute('href', '/designer');
    });
  });

  it('opens template modal on card click and cycles multi-angle views', async () => {
    render(
      <MemoryRouter>
        <Templates />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Rainbow Sparkle Cake')).toBeInTheDocument();
    });

    // Click card to open modal
    const card = screen.getByText('Rainbow Sparkle Cake').closest('.cn-template-card');
    fireEvent.click(card);

    // Modal opens with detailed info and specs
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Rainbow Sparkle Cake' })).toBeInTheDocument();
      expect(screen.getByText(/A delightful and colorful celebration cake/i)).toBeInTheDocument();
      expect(screen.getByText('Vanilla Sponge')).toBeInTheDocument();
    });

    // Angle navigation
    const nextBtn = screen.getByRole('button', { name: /next image/i });
    fireEvent.click(nextBtn);

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Rainbow Sparkle Cake' })).not.toBeInTheDocument();
    });
  });

  it('navigates to 3D designer with templateId on clicking Customize', async () => {
    render(
      <MemoryRouter>
        <Templates />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chocolate Truffle Bliss')).toBeInTheDocument();
    });

    const card = screen.getByText('Chocolate Truffle Bliss').closest('.cn-template-card');
    fireEvent.click(card);

    const customizeBtn = await screen.findByRole('button', { name: /customize in 3d designer/i });
    fireEvent.click(customizeBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/designer?templateId=671b00020000000000000002');
  });

  it('calls custom onSelectTemplate callback when provided instead of navigating', async () => {
    const handleSelect = vi.fn();
    render(
      <MemoryRouter>
        <Templates onSelectTemplate={handleSelect} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Rainbow Sparkle Cake')).toBeInTheDocument();
    });

    const card = screen.getByText('Rainbow Sparkle Cake').closest('.cn-template-card');
    fireEvent.click(card);

    const customizeBtn = await screen.findByRole('button', { name: /customize in 3d designer/i });
    fireEvent.click(customizeBtn);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rainbow Sparkle Cake',
        id: '671b00010000000000000001',
      })
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
