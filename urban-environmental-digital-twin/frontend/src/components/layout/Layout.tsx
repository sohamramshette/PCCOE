import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { AuthModal } from '../auth/AuthModal';
import { SakuraPetals } from '../common/SakuraPetals';

export const Layout: React.FC = () => {
  return (
    <div className="app-container app-container--top-nav full-width-layout">
      {/* Subtle ambient background orbs */}
      <div className="ambient-orb ambient-orb--blue" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--orange" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--blue-soft" aria-hidden="true" />

      {/* Falling Leaf Animation for Dashboards and All App Pages */}
      <SakuraPetals />

      {/* Unified Top Navigation Bar (Converted from former sidebar with proper padding & rounding) */}
      <div className="main-wrapper" style={{ width: '100%', maxWidth: '100%', margin: 0, position: 'relative', zIndex: 2 }}>
        <Navbar />
        <main
          className="page-content full-width-page"
          style={{
            maxWidth: '100%',
            width: '100%',
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Global Role & Authentication Modal */}
      <AuthModal />
    </div>
  );
};
