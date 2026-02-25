import React from 'react';
import Header from './Header';

export default function Layout({ children, currentUser, onLogout }: { children: React.ReactNode, currentUser?: any, onLogout?: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header currentUser={currentUser} onLogout={onLogout} />
      <main className="flex-1 w-full">
        <div className="max-w mx-auto px-4 py-6 mt-16">
          {children}
        </div>
      </main>
    </div>
  );
}
