import { useEffect, useRef, useState } from 'react';

export default function useCakeDictation({ onText, active = true, sessionKey }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [interim, setInterim] = useState('');
  const [started, setStarted] = useState(false);
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
      if (current) { current.onstart = null; current.onresult = null; current.onerror = null; current.onend = null; current.abort(); }
      recognition.current = null;
      setListening(false);
      setStarted(false); setInterim('');
    };
  }, [active, sessionKey]);
  const toggle = () => {
    if (recognition.current) { stop(); return; }
    if (!Constructor || !active) return;
    if (window.isSecureContext === false) { setError('Microphone dictation requires HTTPS or localhost. Open the secure version of this page.'); return; }
    const current = new Constructor();
    recognition.current = current;
    const language = document.documentElement.lang || navigator.language || 'en-US';
    current.lang = language === 'en' ? 'en-US' : language;
    current.continuous = false; current.interimResults = true;
    const delivered = new Set();
    let heardSpeech = false;
    let failed = false;
    current.onstart = () => { if (recognition.current === current) setStarted(true); };
    current.onresult = event => {
      if (recognition.current !== current) return;
      const final = [], pending = [];
      Array.from(event.results).forEach((result, index) => {
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) return;
        heardSpeech = true;
        if (!result.isFinal) pending.push(transcript);
        else if (!delivered.has(index)) { delivered.add(index); final.push(transcript); }
      });
      setInterim(pending.join(' '));
      const words = final.join(' ');
      if (words) callback.current(words);
    };
    current.onerror = event => {
      if (recognition.current !== current) return;
      failed = true;
      const messages = {
        'not-allowed': 'Microphone access is blocked. Allow microphone access in your browser’s site settings and check your device privacy settings.',
        'audio-capture': 'No working microphone was found. Check your microphone connection and your browser’s selected input device.',
        'network': navigator.brave
          ? 'Brave could not connect to a speech recognition service. Try Chrome, or use your device’s keyboard dictation in the text field.'
          : 'Your browser could not connect to its speech service. Check your connection, or try another browser with speech recognition.',
        'service-not-allowed': 'This browser cannot use its speech recognition service. Try a browser with speech recognition enabled.',
        'language-not-supported': 'Your browser’s speech service does not support the selected language.',
        'no-speech': 'No speech was detected. Check your microphone and speak after the listening indicator appears.',
      };
      if (event.error !== 'aborted') setError(messages[event.error] || 'Speech recognition failed. Try again or type your request.');
      setListening(false);
      setStarted(false); setInterim('');
    };
    current.onend = () => {
      if (recognition.current !== current) return;
      setListening(false); setStarted(false); setInterim(''); recognition.current = null;
      if (!failed && (!heardSpeech || delivered.size === 0)) setError('No completed transcript was returned. Check your microphone and try again.');
    };
    setError(''); setInterim(''); setStarted(false);
    try { current.start(); setListening(true); } catch {
      recognition.current = null; setListening(false);
      setError('Could not start speech recognition. Check microphone permissions and try again.');
    }
  };
  return { supported: Boolean(Constructor), listening, started, interim, error, toggle, stop };
}
