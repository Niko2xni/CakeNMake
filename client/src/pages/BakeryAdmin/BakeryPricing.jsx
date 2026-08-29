import React, { useState, useEffect } from 'react';
import { Tag, Pencil, X, Check, History } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { pricingApi } from '@/services/api';

const CATEGORY_LABELS = {
  base: 'Base Pricing',
  tier: 'Tiers',
  topping: 'Toppings & Decorations',
};

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString()}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BakeryPricing() {
  const [presets, setPresets] = useState([]);
  const [changeLog, setChangeLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [draftPrice, setDraftPrice] = useState('');
  const [draftReason, setDraftReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [presetData, logData] = await Promise.all([
        pricingApi.getPresets(),
        pricingApi.getChangeLog(),
      ]);
      setPresets(presetData);
      setChangeLog(logData);
    } catch (err) {
      console.error('Failed to load pricing', err);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(preset) {
    setEditingId(preset._id);
    setDraftPrice(String(preset.price));
    setDraftReason('');
    setSaveError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftPrice('');
    setDraftReason('');
    setSaveError('');
  }

  async function saveEdit(preset) {
    const numericPrice = Number(draftPrice);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setSaveError('Enter a valid price.');
      return;
    }
    if (!draftReason.trim()) {
      setSaveError('A reason is required for every price change.');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const updated = await pricingApi.updatePresetPrice(preset._id, numericPrice, draftReason);
      setPresets((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      cancelEdit();
      const logData = await pricingApi.getChangeLog();
      setChangeLog(logData);
    } catch (err) {
      setSaveError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  const grouped = presets.reduce((acc, p) => {
    acc[p.category] = acc[p.category] || [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="flex h-full gap-4">
      {/* Main pricing list */}
      <div className="flex-1 min-w-0 rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
        <header className="flex-shrink-0 border-b border-pink-100 px-6 py-4">
          <h1 className="text-lg font-bold text-gray-900">Pricing Configuration</h1>
          <p className="text-sm text-gray-500">Component prices for Mamshie Bakery</p>
        </header>

        <CustomScrollbar className="flex-1" contentClassName="p-4 space-y-6">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading pricing...</p>
          ) : presets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No pricing presets configured yet.</p>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {CATEGORY_LABELS[category] || category}
                </h2>
                <div className="space-y-2">
                  {items.map((preset) => {
                    const isEditing = editingId === preset._id;
                    return (
                      <div
                        key={preset._id}
                        className="rounded-xl border border-pink-100 px-4 py-3"
                      >
                        {!isEditing ? (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                              <Tag className="w-4.5 h-4.5 text-pink-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{preset.name}</p>
                              <p className="text-sm text-pink-600 font-semibold">{formatPeso(preset.price)}</p>
                            </div>
                            <button
                              onClick={() => startEdit(preset)}
                              aria-label={`Edit ${preset.name}`}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-pink-50 hover:text-pink-500 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-800">{preset.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">₱</span>
                              <input
                                type="number"
                                value={draftPrice}
                                onChange={(e) => setDraftPrice(e.target.value)}
                                className="w-28 px-2 py-1.5 rounded-lg border border-pink-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                                autoFocus
                              />
                            </div>
                            <input
                              type="text"
                              value={draftReason}
                              onChange={(e) => setDraftReason(e.target.value)}
                              placeholder="Reason for this change (required)"
                              className="w-full px-3 py-1.5 rounded-lg border border-pink-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                            />
                            {saveError && <p className="text-xs text-rose-500">{saveError}</p>}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => saveEdit(preset)}
                                disabled={saving}
                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-colors disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-pink-100 text-gray-600 hover:bg-pink-50 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </CustomScrollbar>
      </div>

      {/* Change log panel */}
      <div className="w-80 flex-shrink-0 rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
        <header className="flex-shrink-0 border-b border-pink-100 px-4 py-3 flex items-center gap-2">
          <History className="w-4 h-4 text-pink-500" />
          <h2 className="font-semibold text-gray-900 text-sm">Price Change Log</h2>
        </header>

        <CustomScrollbar className="flex-1" contentClassName="p-3 space-y-2">
          {changeLog.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No changes logged yet.</p>
          ) : (
            changeLog.map((entry) => (
              <div key={entry._id} className="rounded-xl border border-pink-100 px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{entry.componentName}</p>
                  <p className="text-[11px] text-gray-400 flex-shrink-0">{formatDate(entry.createdAt)}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {formatPeso(entry.oldPrice)} → <span className="text-pink-600 font-medium">{formatPeso(entry.newPrice)}</span>
                </p>
                <p className="text-xs text-gray-400 italic mt-0.5">"{entry.reason}"</p>
              </div>
            ))
          )}
        </CustomScrollbar>
      </div>
    </div>
  );
}