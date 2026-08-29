import React, { useState } from 'react';
import { FileText, Download, Eye, Calendar, User } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';

const seedBlueprints = [
  {
    id: 1,
    customerName: 'Maria Santos',
    pickupDate: '2025-02-01',
    totalPrice: 2700,
    status: 'confirmed',
    blueprintUrl: null,
    createdAt: '2025-01-28',
  },
  {
    id: 2,
    customerName: 'Jose Reyes',
    pickupDate: '2025-02-03',
    totalPrice: 3700,
    status: 'in_production',
    blueprintUrl: null,
    createdAt: '2025-01-29',
  },
  {
    id: 3,
    customerName: 'Ana Cruz',
    pickupDate: '2025-01-25',
    totalPrice: 1700,
    status: 'completed',
    blueprintUrl: 'https://example.com/sample-blueprint.pdf',
    createdAt: '2025-01-20',
  },
];

const STATUS_META = {
  pending_payment: { label: 'Awaiting Payment', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_production: { label: 'In Production', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  completed: { label: 'Completed', color: 'bg-green-50 text-green-700 border-green-200' },
};

function formatDate(str) {
  return new Date(str).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPeso(n) {
  return `₱${Number(n || 0).toLocaleString()}`;
}

export default function BakeryBlueprints() {
  const [blueprints] = useState(seedBlueprints);

  return (
    <div className="h-full rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-pink-100 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">Blueprints</h1>
        <p className="text-sm text-gray-500">
          Production PDF documents — generated automatically after payment confirmation
        </p>
      </header>

      <CustomScrollbar className="flex-1" contentClassName="p-4 space-y-2">
        {blueprints.map((b) => {
          const meta = STATUS_META[b.status] || STATUS_META.confirmed;
          const hasBlueprint = !!b.blueprintUrl;
          return (
            <div
              key={b.id}
              className="flex items-center gap-4 rounded-xl border border-pink-100 px-4 py-3"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                hasBlueprint ? 'bg-pink-50' : 'bg-gray-50'
              }`}>
                <FileText className={`w-6 h-6 ${hasBlueprint ? 'text-pink-500' : 'text-gray-300'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{b.customerName}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Pickup {formatDate(b.pickupDate)}
                  </span>
                  <span>{formatPeso(b.totalPrice)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {hasBlueprint ? (
                  <>
                    <a
                      href={b.blueprintUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border border-pink-200 text-pink-600 hover:bg-pink-50 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </a>

                    <a
                      href={b.blueprintUrl}
                      download
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-gray-400 italic">Generating...</span>
                )}
              </div>
            </div>
          );
        })}
      </CustomScrollbar>
    </div>
  );
}