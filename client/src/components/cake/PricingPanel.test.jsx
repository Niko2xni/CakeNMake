import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PricingPanel from './PricingPanel';

describe('PricingPanel', () => {
  it('renders the details modal above the app in a body-level portal', () => {
    const onOpenChange = vi.fn();
    const view = render(
      <PricingPanel
        quote={{
          totalMinor: 160000,
          lineItems: [{
            componentKey: 'cake',
            label: 'Tier Naked Cake',
            lineTotalMinor: 150000,
            quantity: 1,
            unitPriceMinor: 150000,
          }],
        }}
        loading={false}
        error={null}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByTitle('Click to view full breakdown'));

    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    const dialog = screen.getByRole('dialog', { name: 'Price list breakdown' });
    expect(view.container).not.toContainElement(dialog);
    const backdrop = dialog.parentElement;
    expect(backdrop.parentElement).toBe(document.body);
    expect(backdrop.style.zIndex).toBe('10000');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
