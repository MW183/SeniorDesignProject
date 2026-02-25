import React from 'react';
import Header from './Header';

export default function Layout({ children, currentUser, onLogout }: { children: React.ReactNode, currentUser?: any, onLogout?: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header currentUser={currentUser} onLogout={onLogout} />
      <div className="max-w-[1100px] mx-auto px-4 pt-20 w-full">
        {children}
      </div>
    </div>
  );
}
