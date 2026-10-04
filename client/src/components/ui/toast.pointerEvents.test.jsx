import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Toast, ToastProvider, ToastViewport } from './toast';

describe('toast overlay pointer events', () => {
  it('lets pointer events pass through empty fixed toast layers while keeping toasts interactive', () => {
    render(
      <ToastProvider data-testid="toast-provider">
        <Toast data-testid="toast">Saved</Toast>
        <ToastViewport data-testid="toast-viewport" />
      </ToastProvider>,
    );

    expect(screen.getByTestId('toast-provider')).toHaveClass('pointer-events-none');
    expect(screen.getByTestId('toast-viewport')).toHaveClass('pointer-events-none');
    expect(screen.getByText('Saved').closest('[data-testid="toast"]')).toHaveClass('pointer-events-auto');
  });
});
