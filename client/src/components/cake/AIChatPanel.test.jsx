import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AIChatPanel from './AIChatPanel';
import { DEFAULT_CONFIG } from '@/lib/cakeConfig';
import { cakeAiApi } from '@/services/api';

vi.mock('@/services/api', () => ({ cakeAiApi: { sendMessage: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('imported Cake AI tool conversation', () => {
  it('applies successive edits and sends their updated state with tool results', async () => {
    const config = structuredClone(DEFAULT_CONFIG);
    const onChange = vi.fn();
    cakeAiApi.sendMessage
      .mockResolvedValueOnce({ stop_reason: 'tool_use', content: [
        { type: 'tool_use', id: 'flavor', name: 'set_sponge_flavor', input: { flavor: 'chocolate' } },
        { type: 'tool_use', id: 'finish', name: 'set_exterior_finish', input: { flavor: 'chocolate' } },
      ] })
      .mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Your chocolate design is ready.' }] });
    render(<AIChatPanel config={config} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Describe your cake...'), { target: { value: 'Make it chocolate' } });
    fireEvent.keyDown(screen.getByPlaceholderText('Describe your cake...'), { key: 'Enter' });

    await screen.findByText('Your chocolate design is ready.');
    expect(onChange).toHaveBeenCalledTimes(2);
    const finalConfig = onChange.mock.calls[1][0];
    expect(finalConfig.sponge.flavor).toBe('chocolate');
    expect(finalConfig.exteriorFinish.flavor).toBe('chocolate');
    const [history, sentConfig] = cakeAiApi.sendMessage.mock.calls[1];
    expect(sentConfig).toEqual(finalConfig);
    expect(history[2].content.map(result => result.tool_use_id)).toEqual(['flavor', 'finish']);
  });

  it('shows an API failure and allows another message', async () => {
    cakeAiApi.sendMessage.mockRejectedValueOnce(new Error('Unavailable'));
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<AIChatPanel config={DEFAULT_CONFIG} onChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Describe your cake...'), { target: { value: 'Hello' } });
    fireEvent.keyDown(screen.getByPlaceholderText('Describe your cake...'), { key: 'Enter' });
    await screen.findByText(/couldn't reach the design assistant/);
    await waitFor(() => expect(screen.getByPlaceholderText('Describe your cake...')).toBeEnabled());
    errorLog.mockRestore();
  });
});
