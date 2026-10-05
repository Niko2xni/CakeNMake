import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import GCashPayment from './GCashPayment';

afterEach(() => { cleanup(); vi.useRealTimers(); });

it('submits automatically only after simulated payment and does not require opening chat', async () => {
  vi.useFakeTimers();
  const submit = vi.fn().mockResolvedValue(undefined);
  const open = vi.fn();
  const date = new Date(2026, 9, 10);
  render(<GCashPayment total={1950} selectedDate={date} onPaymentComplete={submit} onPaid={open} />);
  expect(submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Continue simulated checkout' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit demo order' }));
  await act(async () => { vi.advanceTimersByTime(1799); });
  expect(submit).not.toHaveBeenCalled();
  await act(async () => { vi.advanceTimersByTime(1); });
  expect(submit).toHaveBeenCalledWith(date);
  expect(open).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Open Bakery Chat' })).toBeEnabled();
});

it('shows a failed submission and retries without charging again', async () => {
  vi.useFakeTimers();
  const submit = vi.fn().mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValueOnce(undefined);
  render(<GCashPayment total={1950} selectedDate={new Date(2026, 9, 10)} onPaymentComplete={submit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue simulated checkout' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit demo order' }));
  await act(async () => { vi.advanceTimersByTime(1800); });
  expect(screen.getByRole('alert')).toHaveTextContent('Storage unavailable');
  expect(screen.getByRole('button', { name: 'Open Bakery Chat' })).toBeDisabled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry sending order' })); });
  expect(submit).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('button', { name: 'Continue simulated checkout' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open Bakery Chat' })).toBeEnabled();
});

it('keeps the submitted order retryable when the bakery chat acknowledgement fails', async () => {
  vi.useFakeTimers();
  const submit = vi.fn().mockResolvedValue(undefined);
  const open = vi.fn().mockRejectedValueOnce(new Error('Bakery chat unavailable')).mockResolvedValueOnce(undefined);
  render(<GCashPayment total={1950} selectedDate={new Date(2026, 9, 10)} onPaymentComplete={submit} onPaid={open} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue simulated checkout' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit demo order' }));
  await act(async () => { vi.advanceTimersByTime(1800); });

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Open Bakery Chat' })); });
  expect(screen.getByRole('alert')).toHaveTextContent('Bakery chat unavailable');
  expect(open).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledTimes(1);

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Open Bakery Chat' })); });
  expect(open).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
