import React from 'react';
import { Outlet } from 'react-router-dom';
import BakeryNavbar from '@/components/bakery/BakeryNavbar';

export default function BakeryAdminLayout() {
  return (
    <div className="h-screen w-full flex bg-pink-50 overflow-hidden">
      <BakeryNavbar />

      <div className="flex-1 ml-[70px] min-w-0 h-screen overflow-hidden p-4">
        <Outlet />
      </div>
    </div>
  );
}