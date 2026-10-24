import React from 'react';
import { Outlet } from 'react-router-dom';
import BakeryNavbar from '@/components/bakery/BakeryNavbar';
import BakeryNotifications from '@/components/bakery/BakeryNotifications';

export default function BakeryAdminLayout() {
  return (
    <div className="cn-bakery-shell h-[100dvh] w-full flex bg-pink-50 overflow-hidden relative">
      <BakeryNavbar />
      <BakeryNotifications />

      <main className="cn-bakery-content flex-1 min-w-0 h-[100dvh] overflow-y-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
