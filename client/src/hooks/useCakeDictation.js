import { useEffect, useRef, useState } from 'react';

export default function useCakeDictation({ onText, active = true, sessionKey }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognition = useRef(null);
  const callback = useRef(onText); callback.current = onText;
  const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const stop = () => recognition.current?.stop();
  useEffect(() => {
    if (!active) recognition.current?.abort();
    const hide = () => { if (document.hidden) recognition.current?.abort(); };
    document.addEventListener('visibilitychange', hide);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      const current = recognition.current;
      if (current) { current.onresult = null; current.onerror = null; current.onend = null; current.abort(); }
      recognition.current = null;
      setListening(false);
    };
  }, [active, sessionKey]);
  const toggle = () => {
    if (listening) { stop(); return; }
    if (!Constructor || !active) return;
    const current = new Constructor();
    recognition.current = current;
    current.lang = document.documentElement.lang || navigator.language || 'en-US';
    current.continuous = false; current.interimResults = false;
    current.onresult = event => {
      const words = Array.from(event.results).filter(result => result.isFinal).map(result => result[0].transcript).join(' ').trim();
      if (words) callback.current(words);
    };
    current.onerror = event => {
      setError(event.error === 'not-allowed' ? 'Microphone access was denied. Allow microphone access or type your request.' : 'Speech could not be recognized. Try again or type your request.');
      setListening(false);
    };
    current.onend = () => { setListening(false); recognition.current = null; };
    setError('');
    try { current.start(); setListening(true); } catch { setError('Could not start the microphone. Try again.'); }
  };
  return { supported: Boolean(Constructor), listening, error, toggle, stop };
}
