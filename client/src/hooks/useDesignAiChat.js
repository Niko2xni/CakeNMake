import { useEffect, useRef, useState } from 'react';
import { designApi } from '@/services/api';
import { emptyCakeAiConversation, savedCakeAiConversation } from '@/lib/cakeAiConversation';

export default function useDesignAiChat({ designId, accountId, guestId }) {
  const key = accountId && designId ? `account:${accountId}:design:${designId}` : `guest:${guestId}`;
  const [state, setState] = useState(() => ({ key, ...emptyCakeAiConversation(), ready: false, error: '' }));
  const queue = useRef(Promise.resolve());
  const lastSaved = useRef('');
  const currentKey = useRef(key);
  currentKey.current = key;

  useEffect(() => {
    let active = true;
    lastSaved.current = '';
    setState({ key, ...emptyCakeAiConversation(), ready: false, error: '' });
    const restore = async () => {
      try {
        let saved;
        if (accountId && designId) saved = await designApi.getAiChat(designId);
        else {
          try { saved = JSON.parse(sessionStorage.getItem(`cake-ai:${key}`) || 'null'); } catch { /* unavailable storage */ }
        }
        if (!active) return;
        const data = saved && Array.isArray(saved.history) && Array.isArray(saved.display)
          ? saved : savedCakeAiConversation(emptyCakeAiConversation());
        lastSaved.current = JSON.stringify(data);
        setState({ key, ...emptyCakeAiConversation(), ...data,
          display: data.display.length ? data.display : emptyCakeAiConversation().display,
          ready: !accountId || Boolean(designId), error: '' });
      } catch {
        if (active) setState({ key, ...emptyCakeAiConversation(), ready: false, error: 'Could not load this design’s chat. Reopen the design to retry.' });
      }
    };
    restore();
    return () => { active = false; };
  }, [key, accountId, designId]);

  useEffect(() => {
    if (state.key !== key || !state.ready || state.thinking) return;
    const data = savedCakeAiConversation(state);
    const serialized = JSON.stringify(data);
    if (serialized === lastSaved.current) return;
    lastSaved.current = serialized;
    if (!accountId || !designId) {
      try { sessionStorage.setItem(`cake-ai:${key}`, serialized); } catch {
        setState(current => current.key === key ? { ...current, error: 'Chat could not be saved in this browser.' } : current);
      }
      return;
    }
    // Serialize writes so a slow earlier save cannot overwrite Clear chat.
    queue.current = queue.current.catch(() => {}).then(() => designApi.saveAiChat(designId, data)).then(() => {
      setState(current => current.key === key ? { ...current, error: '' } : current);
    }).catch(() => {
      if (currentKey.current === key) lastSaved.current = '';
      setState(current => current.key === key ? { ...current, error: 'Chat could not be saved. Your messages remain here; send another message to retry.' } : current);
    });
  }, [state.history, state.display, state.thinking, state.ready, state.key, key, accountId, designId]);

  const update = field => value => setState(current => current.key === key ? {
    ...current, [field]: typeof value === 'function' ? value(current[field]) : value,
  } : current);
  return {
    ...(state.key === key ? state : { ...emptyCakeAiConversation(), ready: false, error: '' }),
    setHistory: update('history'), setDisplay: update('display'), setInput: update('input'), setThinking: update('thinking'),
  };
}
