import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BakeryEmployees from './BakeryEmployees';

const authMocks = vi.hoisted(() => ({
  account: {
    _id: 'admin-123',
    displayName: 'Head Baker',
    email: 'headbaker@example.com',
    role: 'bakery_admin',
    platform: 'platform-1',
  },
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    account: authMocks.account,
  }),
}));

const employeeApiMocks = vi.hoisted(() => ({
  getEmployees: vi.fn(),
  addEmployee: vi.fn(),
  removeEmployee: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  employeeApi: {
    getEmployees: employeeApiMocks.getEmployees,
    addEmployee: employeeApiMocks.addEmployee,
    removeEmployee: employeeApiMocks.removeEmployee,
  },
}));

const mockEmployees = [
  {
    _id: 'admin-123',
    displayName: 'Head Baker',
    email: 'headbaker@example.com',
    role: 'bakery_admin',
    status: 'active',
    photoURL: 'https://example.com/headbaker.jpg',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    _id: 'staff-456',
    displayName: 'Pastry Assistant',
    email: 'assistant@example.com',
    role: 'bakery_staff',
    status: 'active',
    photoURL: null,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    _id: 'staff-789',
    displayName: null,
    email: 'decorator@example.com',
    role: 'bakery_staff',
    status: 'active',
    photoURL: 'https://example.com/broken.jpg',
    createdAt: '2026-01-03T00:00:00.000Z',
  },
];

describe('BakeryEmployees Management Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.account = {
      _id: 'admin-123',
      displayName: 'Head Baker',
      email: 'headbaker@example.com',
      role: 'bakery_admin',
      platform: 'platform-1',
    };
    employeeApiMocks.getEmployees.mockResolvedValue({ employees: mockEmployees });
    employeeApiMocks.addEmployee.mockResolvedValue({ message: 'Employee added successfully!' });
    employeeApiMocks.removeEmployee.mockResolvedValue({ message: 'Employee access removed.' });
  });

  describe('Access Control', () => {
    it('restricts access when logged in user is a regular bakery staff member', () => {
      authMocks.account.role = 'bakery_staff';
      render(<BakeryEmployees />);

      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
      expect(screen.getByText(/reserved for Bakery Administrators/i)).toBeInTheDocument();
      expect(employeeApiMocks.getEmployees).not.toHaveBeenCalled();
    });

    it('grants full access when logged in user is bakery_admin', async () => {
      render(<BakeryEmployees />);

      expect(await screen.findByText('Bakery Employee Management')).toBeInTheDocument();
      expect(employeeApiMocks.getEmployees).toHaveBeenCalledTimes(1);
    });

    it('grants full access when logged in user is platform_admin', async () => {
      authMocks.account.role = 'platform_admin';
      render(<BakeryEmployees />);

      expect(await screen.findByText('Bakery Employee Management')).toBeInTheDocument();
      expect(employeeApiMocks.getEmployees).toHaveBeenCalledTimes(1);
    });
  });

  describe('Employee Directory & Statistics', () => {
    it('renders overview metrics cards accurately', async () => {
      render(<BakeryEmployees />);

      expect(await screen.findByText('Bakery Employee Management')).toBeInTheDocument();

      // Total count: 3
      expect(screen.getByText('3 Members')).toBeInTheDocument();
      expect(screen.getByText('Total Staff & Admins')).toBeInTheDocument();

      // Bakery Staff Members: 2
      expect(screen.getByText('Bakery Staff Members')).toBeInTheDocument();

      // Bakery Admins: 1
      expect(screen.getByText('Bakery Admins')).toBeInTheDocument();
    });

    it('renders employees in the table with roles and status', async () => {
      render(<BakeryEmployees />);

      expect(await screen.findByText('Head Baker')).toBeInTheDocument();
      expect(screen.getByText('headbaker@example.com')).toBeInTheDocument();
      expect(screen.getByText('Pastry Assistant')).toBeInTheDocument();
      expect(screen.getByText('assistant@example.com')).toBeInTheDocument();
      expect(screen.getByText('decorator@example.com')).toBeInTheDocument();

      // Formats email username fallback when displayName is null
      expect(screen.getByText('decorator')).toBeInTheDocument();
    });

    it('protects current session admin from self-revocation', async () => {
      render(<BakeryEmployees />);

      await screen.findByText('Head Baker');

      // The current admin has "You" badge and "Current Session" text instead of Revoke button
      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.getByText('Current Session')).toBeInTheDocument();

      // Other staff members have "Revoke Access" buttons
      const revokeButtons = screen.getAllByRole('button', { name: /revoke access/i });
      expect(revokeButtons).toHaveLength(2);
    });

    it('shows empty directory message when no employees exist', async () => {
      employeeApiMocks.getEmployees.mockResolvedValueOnce({ employees: [] });
      render(<BakeryEmployees />);

      expect(await screen.findByText('No employee accounts found')).toBeInTheDocument();
      expect(screen.getByText(/use "add employee" above/i)).toBeInTheDocument();
    });

    it('displays error alert when fetching employees fails', async () => {
      employeeApiMocks.getEmployees.mockRejectedValueOnce(new Error('Network error loading directory'));
      render(<BakeryEmployees />);

      expect(await screen.findByRole('alert')).toHaveTextContent('Network error loading directory');
    });

    it('allows refreshing the directory using the refresh button', async () => {
      render(<BakeryEmployees />);

      await screen.findByText('Head Baker');
      const refreshBtn = screen.getByTitle('Refresh employees');
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(employeeApiMocks.getEmployees).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Add Employee Flow', () => {
    it('opens modal, inputs email, and grants staff access only (without admin role option)', async () => {
      render(<BakeryEmployees />);

      await screen.findByText('Bakery Employee Management');
      fireEvent.click(screen.getByRole('button', { name: /add employee/i }));

      const dialog = await screen.findByRole('dialog', { name: /grant employee access/i });
      expect(dialog).toBeInTheDocument();

      // Verify Staff is shown and no Admin radio option exists
      expect(within(dialog).getByText('Staff (Bakery Worker)')).toBeInTheDocument();
      expect(within(dialog).queryByRole('radio', { name: /admin/i })).not.toBeInTheDocument();

      const emailInput = screen.getByPlaceholderText('employee@cakenmake.com');
      fireEvent.change(emailInput, { target: { value: 'newstaff@cakenmake.com' } });

      const submitBtn = screen.getByRole('button', { name: /confirm & add/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(employeeApiMocks.addEmployee).toHaveBeenCalledWith('newstaff@cakenmake.com', 'bakery_staff');
        expect(screen.getByText('Employee added successfully!')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('displays error inside the modal when adding an employee fails', async () => {
      employeeApiMocks.addEmployee.mockRejectedValueOnce(
        new Error('No registered user was found with this email. Have them register or sign in first.')
      );

      render(<BakeryEmployees />);

      await screen.findByText('Bakery Employee Management');
      fireEvent.click(screen.getByRole('button', { name: /add employee/i }));

      const emailInput = screen.getByPlaceholderText('employee@cakenmake.com');
      fireEvent.change(emailInput, { target: { value: 'unregistered@example.com' } });

      fireEvent.click(screen.getByRole('button', { name: /confirm & add/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'No registered user was found with this email. Have them register or sign in first.'
        );
        // Modal remains open so user can fix their email
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('closes modal when Cancel button, X button, or Escape key is pressed', async () => {
      render(<BakeryEmployees />);

      await screen.findByText('Bakery Employee Management');

      // Test Cancel button
      fireEvent.click(screen.getByRole('button', { name: /add employee/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Test X button
      fireEvent.click(screen.getByRole('button', { name: /add employee/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Close'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Test Escape key
      fireEvent.click(screen.getByRole('button', { name: /add employee/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Revoke Employee Flow', () => {
    it('opens confirmation modal and revokes employee access successfully', async () => {
      render(<BakeryEmployees />);

      await screen.findByText('Pastry Assistant');
      const revokeButtons = screen.getAllByRole('button', { name: /revoke access/i });
      fireEvent.click(revokeButtons[0]);

      const dialog = await screen.findByRole('dialog', { name: /revoke employee access\?/i });
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to revoke bakery access for/i)).toBeInTheDocument();
      expect(within(dialog).getByText('Pastry Assistant')).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /yes, revoke access/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(employeeApiMocks.removeEmployee).toHaveBeenCalledWith('staff-456');
        expect(screen.getByText('Employee access removed.')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('displays error inside the confirmation modal when revocation fails', async () => {
      employeeApiMocks.removeEmployee.mockRejectedValueOnce(
        new Error('Cannot revoke a platform administrator.')
      );

      render(<BakeryEmployees />);

      await screen.findByText('Pastry Assistant');
      const revokeButtons = screen.getAllByRole('button', { name: /revoke access/i });
      fireEvent.click(revokeButtons[0]);

      fireEvent.click(screen.getByRole('button', { name: /yes, revoke access/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Cannot revoke a platform administrator.');
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('closes revoke modal when Cancel button or Escape key is pressed', async () => {
      render(<BakeryEmployees />);

      await screen.findByText('Pastry Assistant');
      const revokeButtons = screen.getAllByRole('button', { name: /revoke access/i });

      // Cancel button
      fireEvent.click(revokeButtons[0]);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Escape key
      fireEvent.click(revokeButtons[0]);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Notifications and Visual Controls', () => {
    it('allows dismissing success notification banner', async () => {
      render(<BakeryEmployees />);

      await screen.findByText('Pastry Assistant');
      const revokeButtons = screen.getAllByRole('button', { name: /revoke access/i });
      fireEvent.click(revokeButtons[0]);
      fireEvent.click(screen.getByRole('button', { name: /yes, revoke access/i }));

      const banner = await screen.findByText('Employee access removed.');
      expect(banner).toBeInTheDocument();

      const dismissBtn = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissBtn);

      expect(screen.queryByText('Employee access removed.')).not.toBeInTheDocument();
    });

    it('allows dismissing error notification banner', async () => {
      employeeApiMocks.getEmployees.mockRejectedValueOnce(new Error('Temporary error'));
      render(<BakeryEmployees />);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Temporary error');

      const dismissBtn = screen.getByLabelText('Dismiss error');
      fireEvent.click(dismissBtn);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('falls back to avatar initial on image load error', async () => {
      render(<BakeryEmployees />);

      const img = await screen.findByAltText('Head Baker');
      expect(img).toBeInTheDocument();

      fireEvent.error(img);

      await waitFor(() => {
        // Image element unmounted / replaced with initial "H"
        expect(screen.queryByAltText('Head Baker')).not.toBeInTheDocument();
        expect(screen.getByText('H')).toBeInTheDocument();
      });
    });
  });
});
