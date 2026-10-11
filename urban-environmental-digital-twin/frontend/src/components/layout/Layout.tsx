import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { AuthModal } from '../auth/AuthModal';
import { SakuraPetals } from '../common/SakuraPetals';

export const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Falling Leaves Background */}
      <SakuraPetals />

      {/* Subtle ambient background orbs */}
      <div className="ambient-orb ambient-orb--blue" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--orange" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--blue-soft" aria-hidden="true" />
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)} />
      <div className="main-wrapper">
        <Navbar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      {/* Global Role & Authentication Modal */}
      <AuthModal />
    </div>
  );
};
