import React, { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import { bakeryApi } from '@/services/api';
import { getChatSocket } from '@/lib/chat-socket';
import { safeExternalUrl } from '@/lib/safe-url';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { AdminRowsSkeleton } from '@/components/shared/PageLoadingSkeleton';
import SidePatternsGalleryModal from '@/components/bakery/SidePatternsGalleryModal';

export default function BakeryBlueprints() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sideGalleryOpen, setSideGalleryOpen] = useState(false);
  useEffect(() => {
    let active = true;
    let socket;
    async function load() {
      try {
        const result = await bakeryApi.getBlueprints();
        if (active) { setRecords(result); setError(''); }
      } catch (err) { if (active) setError(err.message); }
      finally { if (active) setLoading(false); }
    }
    void load();
    Promise.resolve()
      .then(() => getChatSocket?.())
      .then((s) => {
        if (active && s) {
          socket = s;
          socket.on('blueprint:created', load);
          socket.on('blueprint:updated', load);
        }
      })
      .catch(() => {});
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
      socket?.off('blueprint:created', load);
      socket?.off('blueprint:updated', load);
    };
  }, [refresh]);
  async function access(record, download) {
    setBusy(record.id);
    setError('');
    try {
      const result = await bakeryApi.getBlueprintAccess(record.id, download);
      const url = safeExternalUrl(result.url);
      if (!url) throw new Error('Invalid PDF access link.');
      if (download) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${record.id}.pdf`;
        anchor.rel = 'noopener noreferrer';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } else setPreview({ url, title: record.designName });
    } catch (err) { setError(err.message); }
    finally { setBusy(null); }
  }
  return (
    <div className="h-full rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-pink-100 px-6 py-4 flex justify-between items-center">
        <div><h1 className="text-lg font-bold">Blueprints</h1><p className="text-sm text-gray-500">Production PDFs submitted after simulated payment confirmation</p></div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSideGalleryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Palette className="w-4 h-4" />
            Preview 2D Patterns
          </button>
          <button onClick={() => setRefresh((n) => n + 1)} className="text-sm text-pink-600">Refresh</button>
        </div>
      </header>
      <CustomScrollbar className="flex-1" contentClassName="p-4 space-y-2">
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {loading && <div role="status" aria-label="Loading blueprints"><AdminRowsSkeleton count={6} /></div>}
        {!loading && !error && !records.length && <p className="text-sm text-gray-500">No blueprints submitted yet.</p>}
        {records.map((record) => (
          <div key={record.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-pink-100 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 items-center"><p className="text-sm font-semibold">{record.customerName}</p><span className="text-xs text-pink-600">{{ ready: 'Ready', uploading: 'Uploading', failed: 'Failed' }[record.status] || record.status}</span></div>
              <p className="text-sm text-gray-600 truncate">{record.designName}</p>
              <p className="text-xs text-gray-500 mt-1">Delivery {new Date(record.deliveryDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · {record.totalMinor == null ? 'Estimate unavailable' : new Intl.NumberFormat('en-PH', { style: 'currency', currency: record.currency }).format(record.totalMinor / 100)}</p>
              {record.status === 'failed' && <p className="text-xs text-red-600">{record.failureReason || 'PDF upload failed.'}</p>}
            </div>
            {record.status === 'ready' && <div className="flex gap-2">
              <button disabled={busy === record.id} onClick={() => access(record, false)} className="text-xs px-3 py-1.5 rounded-full border border-pink-200 text-pink-600 disabled:opacity-50">View</button>
              <button disabled={busy === record.id} onClick={() => access(record, true)} className="text-xs px-3 py-1.5 rounded-full bg-pink-500 text-white disabled:opacity-50">Download</button>
            </div>}
          </div>
        ))}
      </CustomScrollbar>
      {preview && <div role="dialog" aria-modal="true" aria-label="Blueprint PDF preview" className="fixed inset-0 z-50 bg-black/50 p-6 flex flex-col">
        <div className="bg-white px-4 py-3 flex justify-between rounded-t-xl"><p>{preview.title}</p><button onClick={() => setPreview(null)}>Close preview</button></div>
        <iframe title="Blueprint PDF" src={preview.url} className="flex-1 w-full bg-white rounded-b-xl" />
      </div>}
      <SidePatternsGalleryModal isOpen={sideGalleryOpen} onClose={() => setSideGalleryOpen(false)} />
    </div>
  );
}
