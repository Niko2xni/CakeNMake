import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PayBalanceModal from './PayBalanceModal';
import GCashPayment from '@/components/bakery/GCashPayment';
import * as maintenanceModule from '@/utils/maintenance';

vi.mock('@/services/api', () => ({
  accountApi: {
    payBalance: vi.fn(),
  },
}));

describe('Payment 30-minute cutoff logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isWithinThirtyMinutePaymentCutoff utility', () => {
    it('returns true between 21:30 and 22:05 Manila time (UTC+8)', () => {
      // 21:30 Manila = 13:30 UTC
      const start = new Date('2026-10-25T13:30:00Z');
      expect(maintenanceModule.isWithinThirtyMinutePaymentCutoff(start)).toBe(true);

      // 21:45 Manila = 13:45 UTC
      const mid = new Date('2026-10-25T13:45:00Z');
      expect(maintenanceModule.isWithinThirtyMinutePaymentCutoff(mid)).toBe(true);

      // 22:04 Manila = 14:04 UTC
      const beforeEnd = new Date('2026-10-25T14:04:00Z');
      expect(maintenanceModule.isWithinThirtyMinutePaymentCutoff(beforeEnd)).toBe(true);

      // 21:29 Manila = 13:29 UTC -> false
      const beforeWindow = new Date('2026-10-25T13:29:59Z');
      expect(maintenanceModule.isWithinThirtyMinutePaymentCutoff(beforeWindow)).toBe(false);

      // 22:05 Manila = 14:05 UTC -> false
      const afterWindow = new Date('2026-10-25T14:05:00Z');
      expect(maintenanceModule.isWithinThirtyMinutePaymentCutoff(afterWindow)).toBe(false);
    });
  });

  describe('PayBalanceModal component during cutoff', () => {
    it('shows cutoff alert and disables payment button when cutoff is active', () => {
      vi.spyOn(maintenanceModule, 'isWithinThirtyMinutePaymentCutoff').mockReturnValue(true);

      render(
        <PayBalanceModal
          isOpen={true}
          transaction={{
            id: 'ord_123',
            designName: 'Special Cake',
            totalPrice: 2000,
            remainingBalance: 1000,
          }}
          onClose={() => {}}
        />
      );

      expect(screen.getByText(/Payment Cutoff Active/i)).toBeInTheDocument();
      expect(screen.getByText(/No payments are available 30 minutes before the scheduled 10:00 PM update/i)).toBeInTheDocument();

      const payBtn = screen.getByRole('button', { name: /Payments unavailable during 9:30 PM cutoff/i });
      expect(payBtn).toBeDisabled();
    });

    it('enables payment button when outside cutoff window', () => {
      vi.spyOn(maintenanceModule, 'isWithinThirtyMinutePaymentCutoff').mockReturnValue(false);

      render(
        <PayBalanceModal
          isOpen={true}
          transaction={{
            id: 'ord_123',
            designName: 'Special Cake',
            totalPrice: 2000,
            remainingBalance: 1000,
          }}
          onClose={() => {}}
        />
      );

      expect(screen.queryByText(/Payment Cutoff Active/i)).not.toBeInTheDocument();
      const payBtn = screen.getByRole('button', { name: /Pay ₱1,000 with GCash/i });
      expect(payBtn).not.toBeDisabled();
    });
  });

  describe('GCashPayment component during cutoff', () => {
    it('shows cutoff alert and disables checkout button when cutoff is active', () => {
      vi.spyOn(maintenanceModule, 'isWithinThirtyMinutePaymentCutoff').mockReturnValue(true);

      render(
        <GCashPayment
          total={2000}
          selectedDate={new Date('2026-11-01')}
          onPaid={() => {}}
          onBack={() => {}}
          onPaymentComplete={() => {}}
        />
      );

      expect(screen.getByText(/Payment Cutoff Active/i)).toBeInTheDocument();
      expect(screen.getByText(/No payments are available 30 minutes before the scheduled 10:00 PM update/i)).toBeInTheDocument();

      const checkoutBtn = screen.getByRole('button', { name: /Payments unavailable during 9:30 PM cutoff/i });
      expect(checkoutBtn).toBeDisabled();
    });

    it('enables checkout button when outside cutoff window', () => {
      vi.spyOn(maintenanceModule, 'isWithinThirtyMinutePaymentCutoff').mockReturnValue(false);

      render(
        <GCashPayment
          total={2000}
          selectedDate={new Date('2026-11-01')}
          onPaid={() => {}}
          onBack={() => {}}
          onPaymentComplete={() => {}}
        />
      );

      expect(screen.queryByText(/Payment Cutoff Active/i)).not.toBeInTheDocument();
      const checkoutBtn = screen.getByRole('button', { name: /Continue simulated checkout/i });
      expect(checkoutBtn).not.toBeDisabled();
    });
  });
});
