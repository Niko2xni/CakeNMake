import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeliveryCalendar from './DeliveryCalendar';
import { addDays, format } from 'date-fns';

vi.mock('@/services/api', () => ({
  reservationApi: {
    getBookedDates: vi.fn().mockResolvedValue({ bookedDates: [] }),
  },
}));

describe('DeliveryCalendar - 1 reservation per day capacity limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables dates that are already booked and displays "Booked"', async () => {
    // Pick a date 10 days from now that is guaranteed to be a weekday
    const today = new Date();
    let targetDate = addDays(today, 10);
    while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
      targetDate = addDays(targetDate, 1);
    }
    const bookedKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    const dayNumber = String(targetDate.getDate());

    const onSelect = vi.fn();
    render(
      <DeliveryCalendar
        config={{}}
        selectedDate={null}
        onSelect={onSelect}
        bookedDates={[bookedKey]}
      />
    );

    // Look for button with that day number and text "Booked"
    const dayButtons = screen.getAllByRole('button');
    const bookedButton = dayButtons.find(
      (b) => b.textContent?.includes(dayNumber) && b.textContent?.includes('Booked')
    );

    expect(bookedButton).toBeDefined();
    expect(bookedButton).toBeDisabled();

    // Clicking booked date must NOT trigger onSelect
    fireEvent.click(bookedButton);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('allows selecting an unbooked weekday', async () => {
    const today = new Date();
    let availableDate = addDays(today, 12);
    while (availableDate.getDay() === 0 || availableDate.getDay() === 6) {
      availableDate = addDays(availableDate, 1);
    }
    const dayNumber = String(availableDate.getDate());

    const onSelect = vi.fn();
    render(
      <DeliveryCalendar
        config={{}}
        selectedDate={null}
        onSelect={onSelect}
        bookedDates={[]}
      />
    );

    const dayButtons = screen.getAllByRole('button');
    const availableButton = dayButtons.find(
      (b) => !b.disabled && b.textContent === dayNumber
    );

    expect(availableButton).toBeDefined();
    fireEvent.click(availableButton);
    expect(onSelect).toHaveBeenCalled();
  });

  it('displays the daily capacity notice explaining 1 custom cake per day', () => {
    render(<DeliveryCalendar config={{}} selectedDate={null} onSelect={vi.fn()} />);

    expect(
      screen.getByText(/1 custom cake\/day for quality craft/i)
    ).toBeInTheDocument();
  });
});
