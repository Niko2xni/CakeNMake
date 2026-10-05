import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AIChatPanel from './AIChatPanel';
import { DEFAULT_CONFIG } from '@/lib/cakeConfig';
import { cakeAiApi } from '@/services/api';
import { prepareCakeReference } from '@/lib/cakeReferenceImage';
vi.mock('@/services/api', () => ({ cakeAiApi: { beginTurn: vi.fn().mockResolvedValue({ turnId: 'test-turn' }), endTurn: vi.fn().mockResolvedValue({}), sendMessage: vi.fn(), describeReference: vi.fn() } }));
vi.mock('@/lib/cakeReferenceImage', () => ({ prepareCakeReference: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it('analyzes an attachment once and sends only its description through tool exchanges', async () => {
  prepareCakeReference.mockResolvedValue({ name: 'cake.png', data: 'data:image/jpeg;base64,/9j/2Q==' });
  cakeAiApi.describeReference.mockResolvedValue('Pink frosting and cream borders.');
  cakeAiApi.sendMessage.mockResolvedValueOnce({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'flavor', name: 'set_sponge_flavor', input: { flavor: 'chocolate' } }] })
    .mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Design updated.' }] });
  render(<AIChatPanel config={DEFAULT_CONFIG} onChange={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Choose cake reference image'), { target: { files: [new File(['image'], 'cake.png', { type: 'image/png' })] } });
  await screen.findByAltText('Cake reference preview');
  fireEvent.click(screen.getByRole('button', { name: 'Send cake request' }));
  await screen.findByText('Design updated.');
  expect(cakeAiApi.describeReference).toHaveBeenCalledTimes(1);
  expect(cakeAiApi.sendMessage).toHaveBeenCalledTimes(2);
  const sent = JSON.stringify(cakeAiApi.sendMessage.mock.calls);
  expect(sent).toContain('Pink frosting'); expect(sent).not.toContain('base64');
  expect(screen.queryByAltText('Cake reference preview')).not.toBeInTheDocument();
});

it('clears the sent reference even when analysis fails and shows a useful error without editing', async () => {
  prepareCakeReference.mockResolvedValue({ name: 'cake.png', data: 'image' });
  cakeAiApi.describeReference.mockRejectedValue(Object.assign(new Error('failed'), { validationMessage: 'Choose a cake reference.' }));
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<AIChatPanel config={DEFAULT_CONFIG} onChange={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Choose cake reference image'), { target: { files: [new File(['x'], 'cake.png', { type: 'image/png' })] } });
  await screen.findByAltText('Cake reference preview');
  fireEvent.click(screen.getByRole('button', { name: 'Send cake request' }));
  await screen.findByText('Choose a cake reference.');
  expect(cakeAiApi.sendMessage).not.toHaveBeenCalled();
  expect(screen.queryByAltText('Cake reference preview')).not.toBeInTheDocument();
  log.mockRestore();
});

it('clears the composer immediately while keeping the submitted image available to the pending request', async () => {
  let finishAnalysis;
  prepareCakeReference.mockResolvedValue({ name: 'cake.png', data: 'image-bytes' });
  cakeAiApi.describeReference.mockImplementationOnce(() => new Promise(resolve => { finishAnalysis = resolve; }));
  cakeAiApi.sendMessage.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Reference applied.' }] });
  render(<AIChatPanel config={DEFAULT_CONFIG} onChange={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Choose cake reference image'), { target: { files: [new File(['x'], 'cake.png', { type: 'image/png' })] } });
  await screen.findByAltText('Cake reference preview');
  fireEvent.click(screen.getByRole('button', { name: 'Send cake request' }));
  expect(screen.queryByAltText('Cake reference preview')).not.toBeInTheDocument();
  await waitFor(() => expect(cakeAiApi.describeReference).toHaveBeenCalledWith('image-bytes', expect.any(String), expect.any(AbortSignal), 'test-turn'));
  await act(async () => finishAnalysis('Pink cake.'));
  await screen.findByText('Reference applied.');
  fireEvent.change(screen.getByPlaceholderText('Describe your cake...'), { target: { value: 'Make it blue' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send cake request' }));
  await waitFor(() => expect(cakeAiApi.sendMessage).toHaveBeenCalledTimes(2));
  expect(cakeAiApi.describeReference).toHaveBeenCalledTimes(1);
});

it('dictates into the draft without sending and stops when the AI panel is hidden', async () => {
  let recognition;
  class Recognition { constructor() { recognition = this; } start = vi.fn(); stop = vi.fn(); abort = vi.fn(); }
  vi.stubGlobal('SpeechRecognition', Recognition);
  const view = render(<AIChatPanel config={DEFAULT_CONFIG} onChange={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start dictation' }));
  expect(recognition.start).toHaveBeenCalledOnce();
  act(() => recognition.onresult({ results: [Object.assign([{ transcript: 'Make it pink' }], { isFinal: true })] }));
  expect(screen.getByPlaceholderText('Describe your cake...')).toHaveValue('Make it pink');
  expect(cakeAiApi.sendMessage).not.toHaveBeenCalled();
  view.rerender(<AIChatPanel config={DEFAULT_CONFIG} onChange={vi.fn()} active={false} />);
  await waitFor(() => expect(recognition.abort).toHaveBeenCalled());
});
