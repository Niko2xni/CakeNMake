import React from 'react';
import { cleanup, renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import useDesignAiChat from './useDesignAiChat';
import { designApi } from '@/services/api';
import { recentCakeAiHistory, savedCakeAiConversation } from '@/lib/cakeAiConversation';

vi.mock('@/services/api', () => ({ designApi: { getAiChat: vi.fn(), saveAiChat: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.clear(); });

it('restores private per-design chat, saves updates and clearing, and starts another design fresh', async () => {
  const saved = { history: [{ role: 'user', content: 'Pink please' }], display: [{ role: 'user', content: 'Pink please' }] };
  designApi.getAiChat.mockImplementation(async id => id === 'one' ? saved : { history: [], display: [] });
  designApi.saveAiChat.mockResolvedValue({ saved: true });
  const { result, rerender } = renderHook(props => useDesignAiChat(props), { initialProps: { accountId: 'owner', designId: 'one' } });
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.display[0].content).toBe('Pink please');
  act(() => { result.current.setDisplay([{ role: 'assistant', content: 'Done' }]); });
  await waitFor(() => expect(designApi.saveAiChat).toHaveBeenCalledWith('one', expect.objectContaining({ display: [{ role: 'assistant', content: 'Done' }] })));
  act(() => { result.current.setHistory([]); result.current.setDisplay([]); });
  await waitFor(() => expect(designApi.saveAiChat).toHaveBeenLastCalledWith('one', { history: [], display: [] }));
  rerender({ accountId: 'owner', designId: 'two' });
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.history).toEqual([]);
  expect(result.current.display[0].content).toMatch(/Hi!/);
});

it('restores guest chat in the same browser session without sharing it with a new design', async () => {
  const first = renderHook(() => useDesignAiChat({ guestId: 'one' }));
  await waitFor(() => expect(first.result.current.ready).toBe(true));
  act(() => first.result.current.setDisplay([{ role: 'user', content: 'Blue please' }]));
  await waitFor(() => expect(sessionStorage.getItem('cake-ai:guest:one')).toContain('Blue please'));
  first.unmount();
  const second = renderHook(props => useDesignAiChat(props), { initialProps: { guestId: 'one' } });
  await waitFor(() => expect(second.result.current.ready).toBe(true));
  expect(second.result.current.display[0].content).toBe('Blue please');
  second.rerender({ guestId: 'two' });
  await waitFor(() => expect(second.result.current.ready).toBe(true));
  expect(second.result.current.display[0].content).toMatch(/Hi!/);
  expect(designApi.saveAiChat).not.toHaveBeenCalled();
});

it('keeps complete recent tool exchanges and bounds the stored transcript', () => {
  const history = Array.from({ length: 6 }, (_, i) => [
    { role: 'user', content: `Turn ${i}` },
    { role: 'assistant', content: [{ type: 'tool_use', id: `tool${i}` }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: `tool${i}` }] },
  ]).flat();
  expect(recentCakeAiHistory(history)[0].content).toBe('Turn 2');
  const stored = savedCakeAiConversation({ history, display: Array.from({ length: 60 }, () => ({ role: 'assistant', content: 'x'.repeat(10000) })) });
  expect(JSON.stringify(stored.display).length).toBeLessThanOrEqual(60000);
});
