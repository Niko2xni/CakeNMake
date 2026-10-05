import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ToolPanel from './ToolPanel';
import { DEFAULT_CONFIG } from '@/lib/cakeConfig';
import { cakeAiApi } from '@/services/api';

vi.mock('@/services/api', () => ({ cakeAiApi: { beginTurn: vi.fn().mockResolvedValue({ turnId: 'test-turn' }), endTurn: vi.fn().mockResolvedValue({}), sendMessage: vi.fn() } }));
// Decorative previews load Three.js fonts; this regression exercises the
// real tab switcher and chat, not those unrelated manual controls.
vi.mock('./sections/CenterSection', () => ({ default: () => null }));
vi.mock('./sections/EdgeSection', () => ({ default: () => null }));
vi.mock('./sections/SideSection', () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('preserves chat messages, draft, and model history across Design and AI switches', async () => {
  cakeAiApi.sendMessage.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Your sporty theme is ready.' }] });
  const config = structuredClone(DEFAULT_CONFIG);
  const view = render(<ToolPanel config={config} onChange={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'AI', exact: true }));
  const input = screen.getByPlaceholderText('Describe your cake...');
  fireEvent.change(input, { target: { value: 'Make it sporty' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await screen.findByText('Your sporty theme is ready.');
  await waitFor(() => expect(input).toBeEnabled());
  fireEvent.change(input, { target: { value: 'Keep it pink' } });
  fireEvent.click(screen.getByRole('button', { name: 'Design', exact: true }));
  expect(input.closest('[aria-hidden="true"]')).toHaveClass('hidden');
  // Manual changes still reach the preserved chat on its next request.
  const updated = { ...config, exteriorFinish: { ...config.exteriorFinish, style: 'fullyFrosted' } };
  view.rerender(<ToolPanel config={updated} onChange={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'AI', exact: true }));
  expect(screen.getByText('Your sporty theme is ready.')).toBeVisible();
  expect(input).toHaveValue('Keep it pink');
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(cakeAiApi.sendMessage).toHaveBeenCalledTimes(2));
  const [history, sentConfig] = cakeAiApi.sendMessage.mock.calls[1];
  expect(history.map(message => message.role)).toEqual(['user', 'assistant', 'user']);
  expect(history[0].content).toBe('Make it sporty');
  expect(sentConfig).toEqual(updated);
});
