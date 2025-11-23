import React from 'react';
import Header from './Header';
import './Layout.css';

export default function Layout({ children, currentUser, onLogout }: { children: React.ReactNode, currentUser?: any, onLogout?: () => void }) {
  return (
    <div className="app-root">
      <Header currentUser={currentUser} onLogout={onLogout} />
      <div className="page-content">
        {children}
      </div>
    </div>
  );
}
