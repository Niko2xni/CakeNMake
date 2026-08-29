import React from 'react';
import { Cake } from 'lucide-react';

export default function BakeryDashboard() {
  return (
    <div className="h-full w-full rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-pink-100 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Mamshie Bakery overview</p>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center">
            <Cake className="w-8 h-8 text-white" />
          </div>
          <p className="text-sm text-gray-500 max-w-xs">
            This is the Bakery Admin shell. Reservations, pricing, assets,
            chats, and the rest of the pages plug in here next.
          </p>
        </div>
      </div>
    </div>
  );
}