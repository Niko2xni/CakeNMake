import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CakeAI from './CakeAI';

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'Jane Doe', email: 'jane@example.com' },
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/cake-ai']}>
      <CakeAI />
    </MemoryRouter>,
  );
}

describe('Cake AI composer presentation', () => {
  it('keeps clear attachment and generation actions visible', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /attach files/i })).toBeVisible();

    const generateButton = screen.getByRole('button', { name: /generate concept/i });
    expect(generateButton).toBeVisible();
    expect(generateButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/describe your idea/i), {
      target: { value: 'A two-tier garden cake with lemon buttercream' },
    });

    expect(generateButton).toBeEnabled();
  });

  it('exposes full history names without removing visible truncation', () => {
    renderPage();

    expect(screen.getByTitle('Vintage Wedding Cake Design')).toBeInTheDocument();
    expect(screen.getByText(/describe the occasion, flavors, colors/i)).toBeVisible();
  });
});
