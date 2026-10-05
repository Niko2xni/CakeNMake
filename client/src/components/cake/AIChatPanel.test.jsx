import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AIChatPanel from './AIChatPanel';
import { DEFAULT_CONFIG } from '@/lib/cakeConfig';
import { cakeAiApi } from '@/services/api';

vi.mock('@/services/api', () => ({ cakeAiApi: { beginTurn: vi.fn().mockResolvedValue({ turnId: 'test-turn' }), endTurn: vi.fn().mockResolvedValue({}), sendMessage: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('imported Cake AI tool conversation', () => {
  it('disables AI editing for a submitted design without making a provider request', () => {
    render(<AIChatPanel config={DEFAULT_CONFIG} onChange={vi.fn()} readOnly />);
    expect(screen.getByPlaceholderText('Describe your cake...')).toBeDisabled();
    expect(screen.getByText(/This design has been sent to the bakery/)).toBeVisible();
    fireEvent.keyDown(screen.getByPlaceholderText('Describe your cake...'), { key: 'Enter' });
    expect(cakeAiApi.beginTurn).not.toHaveBeenCalled();
  });
  it('ignores an in-flight AI edit if submission locks the design', async () => {
    let finish;
    cakeAiApi.sendMessage.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const onChange = vi.fn();
    const view = render(<AIChatPanel config={DEFAULT_CONFIG} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Describe your cake...');
    fireEvent.change(input, { target: { value: 'Make it chocolate' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(cakeAiApi.sendMessage).toHaveBeenCalled());
    view.rerender(<AIChatPanel config={DEFAULT_CONFIG} onChange={onChange} readOnly />);
    finish({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'edit', name: 'set_exterior_finish', input: { style: 'fullyFrosted', flavor: 'chocolate' } }] });
    await waitFor(() => expect(cakeAiApi.endTurn).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });
  it('renders assistant Markdown as paragraphs, emphasis and lists without embedding HTML or remote images', () => {
    const content = '**Exterior:** ivory frosting.\n\n- **Border:** chocolate piping\n- **Center:** truffles\n\nReview your cake.\n\n<img src="https://example.com/unsafe.png">\n\n![remote](https://example.com/image.png)';
    const session = { ready: true, history: [], display: [{ role: 'assistant', content }], input: '', thinking: false,
      setHistory: vi.fn(), setDisplay: vi.fn(), setInput: vi.fn(), setThinking: vi.fn() };
    const { container } = render(<AIChatPanel config={DEFAULT_CONFIG} onChange={vi.fn()} session={session} />);
    expect(screen.getByText('Exterior:').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Review your cake.').tagName).toBe('P');
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).not.toContain('**');
  });
  it('does not apply a delayed cake edit after leaving the designer', async () => {
    let finish;
    cakeAiApi.sendMessage.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const onChange = vi.fn();
    const panel = render(<AIChatPanel config={DEFAULT_CONFIG} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Describe your cake...');
    fireEvent.change(input, { target: { value: 'Make it chocolate' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(cakeAiApi.sendMessage).toHaveBeenCalled());
    panel.unmount();
    finish({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'edit', name: 'set_sponge_flavor', input: { flavor: 'chocolate' } }] });
    await waitFor(() => expect(cakeAiApi.sendMessage).toHaveBeenCalledTimes(1));
    expect(onChange).not.toHaveBeenCalled();
  });
  it('shows prompt rejection without editing the cake and allows a corrected request', async () => {
    const onChange = vi.fn();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    cakeAiApi.sendMessage.mockRejectedValueOnce(Object.assign(new Error('Rejected'), {
      validationMessage: 'Please send a cake-related request.',
    })).mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Ready to design.' }] });
    render(<AIChatPanel config={DEFAULT_CONFIG} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Describe your cake...');
    fireEvent.change(input, { target: { value: 'Write a Python script' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('Please send a cake-related request.');
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: 'Make it pink' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('Ready to design.');
    expect(cakeAiApi.sendMessage.mock.calls[1][0]).toEqual([{ role: 'user', content: 'Make it pink' }]);
    errorLog.mockRestore();
  });
  it('applies successive edits and sends their updated state with tool results', async () => {
    const config = structuredClone(DEFAULT_CONFIG);
    const onChange = vi.fn();
    cakeAiApi.sendMessage
      .mockResolvedValueOnce({ stop_reason: 'tool_use', reasoning_details: [{ type: 'reasoning.encrypted', data: 'opaque' }], content: [
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
    expect(history[1].reasoning_details).toEqual([{ type: 'reasoning.encrypted', data: 'opaque' }]);
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
