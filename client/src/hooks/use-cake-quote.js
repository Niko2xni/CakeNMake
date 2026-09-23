import { useEffect, useRef, useState } from 'react';
import { pricingApi } from '@/services/api';

export default function useCakeQuote(config) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const previousVersionRef = useRef((() => {
    const stored = window.localStorage.getItem('cakenmake:last-pricing-version');
    return stored === null ? null : Number(stored);
  })());
  const [versionChanged, setVersionChanged] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') setRefreshKey((current) => current + 1);
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const next = await pricingApi.quoteCake(config);
        if (cancelled) return;
        if (previousVersionRef.current !== null && previousVersionRef.current !== next.pricingVersion) setVersionChanged(true);
        previousVersionRef.current = next.pricingVersion;
        window.localStorage.setItem('cakenmake:last-pricing-version', String(next.pricingVersion));
        setQuote(next);
      } catch (quoteError) {
        if (!cancelled) setError(quoteError.message || 'The estimate is temporarily unavailable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [config, refreshKey]);

  return { quote, loading, error, versionChanged, dismissVersionChanged: () => setVersionChanged(false) };
}
