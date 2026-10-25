import React from 'react';
import { Outlet } from 'react-router-dom';
import BakeryNavbar from '@/components/bakery/BakeryNavbar';
import BakeryNotifications from '@/components/bakery/BakeryNotifications';
import BakeryControlPanelHeader from '@/components/bakery/BakeryControlPanelHeader';
import { BakeryControlPanelProvider, useBakeryControlPanel } from '@/context/BakeryControlPanelContext';

function BakeryAdminLayoutContent() {
  const { isControlPanelVisible, closeControlPanel } = useBakeryControlPanel();

  return (
    <div className="cn-bakery-shell h-[100dvh] w-full flex bg-pink-50 overflow-hidden relative">
      <BakeryNavbar />
      <BakeryNotifications />

      <main className="cn-bakery-content flex-1 min-w-0 h-[100dvh] overflow-y-auto p-4 flex flex-col">
        {isControlPanelVisible && (
          <div className="max-w-7xl w-full mx-auto animate-in fade-in slide-in-from-top-2 duration-200">
            <BakeryControlPanelHeader onMinimize={closeControlPanel} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function BakeryAdminLayout() {
  return (
    <BakeryControlPanelProvider>
      <BakeryAdminLayoutContent />
    </BakeryControlPanelProvider>
  );
}
