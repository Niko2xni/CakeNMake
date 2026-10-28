import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import BakeryControlPanelHeader from '@/components/bakery/BakeryControlPanelHeader';
import ClientUpdateAdvanceWarning from '@/components/shared/ClientUpdateAdvanceWarning';
import { systemApi } from '@/services/api';
import { useAuth } from '@/lib/AuthContext';

vi.mock('@/lib/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  systemApi: {
    getStatus: vi.fn(),
    toggleWebsite: vi.fn(),
    getUnifiedDrafts: vi.fn(),
    discardUnifiedDraft: vi.fn(),
    discardAllUnifiedDrafts: vi.fn(),
    getDailyLog: vi.fn(),
  },
}));

describe('BakeryControlPanelHeader & ClientUpdateAdvanceWarning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ account: { role: 'bakery_admin', displayName: 'Bakery Admin' } });
  });

  it('renders unified control panel header with embedded message when drafts exist', async () => {
    systemApi.getStatus.mockResolvedValue({
      isWebsiteOff: false,
      statusText: 'Website On',
      hasScheduledChanges: true,
      pendingTemplatesCount: 1,
      showClientWarning: false,
    });

    systemApi.getUnifiedDrafts.mockResolvedValue({
      totalCount: 2,
      templateCount: 1,
      pricingCount: 1,
      drafts: [
        {
          id: 'template-1',
          category: 'template',
          pendingAction: 'create',
          name: 'Chocolate Delight',
          summary: 'New Template: "Chocolate Delight"',
          priceMinor: 120000,
          hasOriginal: false,
        },
        {
          id: 'pricing-item-buttercream',
          category: 'pricing',
          pendingAction: 'update',
          name: 'Buttercream Frosting',
          summary: 'Price markup updated: ₱150.00 → ₱180.00 (+₱30.00)',
          priceMinor: 18000,
          hasOriginal: true,
        },
      ],
    });

    systemApi.getDailyLog.mockResolvedValue({
      count: 1,
      date: '2026-10-25',
      timeZone: 'Asia/Manila (UTC+8)',
      logs: [
        {
          _id: 'log-1',
          type: 'template',
          action: 'create',
          title: 'Chocolate Delight',
          description: 'Staged new cake template: Chocolate Delight',
          changedByName: 'Bakery Admin',
          createdAt: '2026-10-25T10:00:00.000Z',
        },
      ],
    });

    render(
      <BrowserRouter>
        <BakeryControlPanelHeader activeView="templates" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Website On')).toBeInTheDocument();
      expect(screen.getByText('2 Drafted Edits')).toBeInTheDocument();
      expect(screen.getByText('Pending Changes on Hold')).toBeInTheDocument();
      expect(screen.getByText(/These are currently drafts waiting to be committed at 10:00 PM/)).toBeInTheDocument();
    });

    // Expand drafts drawer
    const drawerBtn = screen.getByText('2 Drafted Edits');
    fireEvent.click(drawerBtn);

    await waitFor(() => {
      expect(screen.getByText('Chocolate Delight')).toBeInTheDocument();
      expect(screen.getByText('Buttercream Frosting')).toBeInTheDocument();
      expect(screen.getByText('Price markup updated: ₱150.00 → ₱180.00 (+₱30.00)')).toBeInTheDocument();
    });

    // Check Today's Track Log tab
    const trackLogButtons = screen.getAllByText(/Today's Track Log/);
    fireEvent.click(trackLogButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Staged new cake template: Chocolate Delight')).toBeInTheDocument();
    });
  });

  it('requires typing "Turn off the website" into a text input before activating Website Off', async () => {
    systemApi.getStatus.mockResolvedValue({
      isWebsiteOff: false,
      statusText: 'Website On',
    });
    systemApi.getUnifiedDrafts.mockResolvedValue({ totalCount: 0, drafts: [] });
    systemApi.getDailyLog.mockResolvedValue({ logs: [] });
    systemApi.toggleWebsite.mockResolvedValue({
      status: { isWebsiteOff: true, statusText: 'Website Off' },
    });

    render(
      <BrowserRouter>
        <BakeryControlPanelHeader />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Set Website Off')).toBeInTheDocument();
    });

    // Click Set Website Off button
    fireEvent.click(screen.getByText('Set Website Off'));

    // Modal should be visible
    expect(screen.getByText('Turn Off Website Access')).toBeInTheDocument();
    const confirmBtn = screen.getByText('Confirm & Turn Website Off');
    expect(confirmBtn).toBeDisabled();

    // Type something incorrect
    const input = screen.getByPlaceholderText('Type "Turn off the website"');
    fireEvent.change(input, { target: { value: 'turn off' } });
    expect(confirmBtn).toBeDisabled();

    // Type exact phrase
    fireEvent.change(input, { target: { value: 'Turn off the website' } });
    expect(confirmBtn).not.toBeDisabled();

    // Click confirm
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(systemApi.toggleWebsite).toHaveBeenCalledWith(true, expect.any(String));
    });
  });

  it('allows discarding an individual draft edit (template or pricing)', async () => {
    systemApi.getStatus.mockResolvedValue({
      isWebsiteOff: false,
      statusText: 'Website On',
    });

    systemApi.getUnifiedDrafts.mockResolvedValue({
      totalCount: 1,
      templateCount: 0,
      pricingCount: 1,
      drafts: [
        {
          id: 'pricing-item-flavor_redvelvet',
          category: 'pricing',
          pendingAction: 'update',
          name: 'Red Velvet Flavor',
          summary: 'Price markup updated: ₱200.00 → ₱240.00 (+₱40.00)',
          priceMinor: 24000,
          hasOriginal: true,
        },
      ],
    });

    systemApi.getDailyLog.mockResolvedValue({
      count: 0,
      logs: [],
    });

    systemApi.discardUnifiedDraft.mockResolvedValue({ message: 'Pricing item draft reverted' });

    render(
      <BrowserRouter>
        <BakeryControlPanelHeader activeView="pricing" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1 Drafted Edit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('1 Drafted Edit'));

    await waitFor(() => {
      expect(screen.getByText('Red Velvet Flavor')).toBeInTheDocument();
    });

    const revertBtn = screen.getByText('Revert Change');
    fireEvent.click(revertBtn);

    await waitFor(() => {
      expect(systemApi.discardUnifiedDraft).toHaveBeenCalledWith('pricing-item-flavor_redvelvet');
    });
  });

  it('renders advance warning correctly when enabled', async () => {
    systemApi.getStatus.mockResolvedValue({
      showClientWarning: true,
      hasScheduledChanges: true,
      isWebsiteOff: false,
    });

    render(
      <BrowserRouter>
        <ClientUpdateAdvanceWarning />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Scheduled Server Maintenance Notice/)).toBeInTheDocument();
      expect(screen.getByText(/10:00 PM Update/)).toBeInTheDocument();
    });
  });

  it('calls onMinimize callback when minimize button is clicked', async () => {
    systemApi.getStatus.mockResolvedValue({ isWebsiteOff: false, statusText: 'Website On' });
    systemApi.getUnifiedDrafts.mockResolvedValue({ totalCount: 0, drafts: [] });
    systemApi.getDailyLog.mockResolvedValue({ logs: [] });

    const handleMinimize = vi.fn();
    render(
      <BrowserRouter>
        <BakeryControlPanelHeader onMinimize={handleMinimize} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Minimize')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Minimize'));
    expect(handleMinimize).toHaveBeenCalledTimes(1);
  });

  it('hides website toggle and blocks pricing draft modifications for bakery_staff while allowing template draft removal', async () => {
    useAuth.mockReturnValue({ account: { role: 'bakery_staff', displayName: 'Bakery Worker' } });

    systemApi.getStatus.mockResolvedValue({
      isWebsiteOff: false,
      statusText: 'Website On',
    });

    systemApi.getUnifiedDrafts.mockResolvedValue({
      totalCount: 2,
      templateCount: 1,
      pricingCount: 1,
      drafts: [
        {
          id: 'template-admin-draft',
          category: 'template',
          pendingAction: 'create',
          name: 'Admin Cake Template',
          summary: 'New Template: "Admin Cake Template"',
          priceMinor: 150000,
          hasOriginal: false,
        },
        {
          id: 'pricing-item-buttercream',
          category: 'pricing',
          pendingAction: 'update',
          name: 'Buttercream Frosting',
          summary: 'Price markup updated: ₱150.00 → ₱180.00 (+₱30.00)',
          priceMinor: 18000,
          hasOriginal: true,
        },
      ],
    });

    systemApi.getDailyLog.mockResolvedValue({ count: 0, logs: [] });
    systemApi.discardUnifiedDraft.mockResolvedValue({ message: 'Template draft discarded' });

    render(
      <BrowserRouter>
        <BakeryControlPanelHeader activeView="templates" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Website On')).toBeInTheDocument();
      expect(screen.getByText('2 Drafted Edits')).toBeInTheDocument();
    });

    // Website shut-down button must NOT be rendered for bakery_staff
    expect(screen.queryByText('Set Website Off')).not.toBeInTheDocument();
    expect(screen.queryByText('Turn Website On')).not.toBeInTheDocument();

    // Open Pending Drafts drawer
    fireEvent.click(screen.getByText('2 Drafted Edits'));

    await waitFor(() => {
      expect(screen.getByText('Admin Cake Template')).toBeInTheDocument();
      expect(screen.getByText('Buttercream Frosting')).toBeInTheDocument();
    });

    // Bulk discard button is scoped to templates only for staff
    expect(screen.getByText('Discard Template Drafts')).toBeInTheDocument();

    // Pricing draft displays "Admin Only" instead of "Revert Change"
    expect(screen.getByText('Admin Only')).toBeInTheDocument();
    expect(screen.queryByText('Revert Change')).not.toBeInTheDocument();

    // Template draft has "Remove Draft" button and can be removed by staff
    const removeTemplateBtn = screen.getByText('Remove Draft');
    fireEvent.click(removeTemplateBtn);

    await waitFor(() => {
      expect(systemApi.discardUnifiedDraft).toHaveBeenCalledWith('template-admin-draft');
    });
  });
});
