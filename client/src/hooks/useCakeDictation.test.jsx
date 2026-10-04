import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import useCakeDictation from './useCakeDictation';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function setup() {
  const instances = [];
  class Recognition { constructor() { instances.push(this); } start = vi.fn(); stop = vi.fn(); abort = vi.fn(); }
  vi.stubGlobal('webkitSpeechRecognition', Recognition);
  const onText = vi.fn();
  const hook = renderHook(props => useCakeDictation({ onText, ...props }), { initialProps: { active: true, sessionKey: 'one' } });
  act(() => hook.result.current.toggle());
  return { ...hook, onText, instance: instances[0], instances };
}
it('shows interim recognition and delivers final words once without duplicated result events', () => {
  const { result, instance, onText } = setup();
  expect(instance.lang).toBe('en-US'); expect(instance.interimResults).toBe(true);
  const interim = { results: [Object.assign([{ transcript: 'Make it pink' }], { isFinal: false })] };
  act(() => instance.onresult(interim));
  expect(result.current.interim).toBe('Make it pink'); expect(onText).not.toHaveBeenCalled();
  const final = { results: [Object.assign([{ transcript: 'Make it pink' }], { isFinal: true })] };
  act(() => { instance.onresult(final); instance.onresult(final); });
  expect(onText).toHaveBeenCalledTimes(1);
  expect(onText).toHaveBeenCalledWith('Make it pink');
});
it.each([['network', 'speech service'], ['not-allowed', 'site settings'], ['audio-capture', 'microphone'], ['service-not-allowed', 'browser']])('reports %s with actionable feedback', (error, expected) => {
  const { result, instance } = setup();
  act(() => { instance.onerror({ error }); instance.onend(); });
  expect(result.current.error).toContain(expected); expect(result.current.listening).toBe(false);
});
it('ignores late results after switching designs', () => {
  const { rerender, instance, onText } = setup();
  const staleResult = instance.onresult;
  rerender({ active: true, sessionKey: 'two' });
  act(() => staleResult({ results: [Object.assign([{ transcript: 'Old design' }], { isFinal: true })] }));
  expect(instance.abort).toHaveBeenCalled(); expect(onText).not.toHaveBeenCalled();
});
it('clears a failed start so the microphone can be retried', () => {
  const start = vi.fn().mockImplementationOnce(() => { throw Error('blocked'); });
  const stop = vi.fn();
  vi.stubGlobal('SpeechRecognition', class { start = start; stop = stop; abort = vi.fn(); });
  const { result } = renderHook(() => useCakeDictation({ onText: vi.fn() }));
  act(() => result.current.toggle());
  expect(result.current.error).toMatch(/Could not start/);
  expect(result.current.listening).toBe(false);
  act(() => result.current.toggle());
  expect(start).toHaveBeenCalledTimes(2);
  expect(result.current.listening).toBe(true);
  expect(stop).not.toHaveBeenCalled();
});
