import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Header({ currentUser, onLogout }: { currentUser?: any, onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  const isAdmin = currentUser?.role === 'ADMIN';
  const isSupport = currentUser?.role === 'SUPPORT';
  const isPlanner = currentUser?.role === 'PLANNER';
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white h-16 shadow-sm">
      <div className="max-w-275 mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="">
            <Link to="/" className="text-white font-bold text-lg tracking-wide">PlannerApp</Link>
          </div>

          <button
            className="md:hidden p-2"
            aria-expanded={open}
            aria-label="Toggle navigation"
            onClick={() => setOpen(v => !v)}
          >
            <span className="block w-5 h-0.5 bg-white my-0.75" />
            <span className="block w-5 h-0.5 bg-white my-0.75" />
            <span className="block w-5 h-0.5 bg-white my-0.75" />
          </button>

          <nav className={`${open ? 'flex' : 'hidden'} md:flex items-center gap-4 md:static absolute top-16 right-4 bg-slate-900 md:bg-transparent flex-col md:flex-row p-3 md:p-0 rounded-md min-w-40`}>
            {!currentUser ? (
              <Link to="/login" className="text-sky-100 px-2 py-1 rounded-md hover:bg-white/5">Login</Link>
            ) : isAdmin || isSupport ? (
              <>
                <Link to="/planners" className="text-sky-100 px-2 py-1 rounded-md hover:bg-white/5">Dashboard</Link>
                <Link to="/manage-weddings" className="text-sky-100 px-2 py-1 rounded-md hover:bg-white/5">Manage Weddings</Link>
                <Link to="/manage-planners" className="text-sky-100 px-2 py-1 rounded-md hover:bg-white/5">Manage Planners</Link>
                <Link to="/manage-vendors" className="text-sky-100 px-2 py-1 rounded-md hover:bg-white/5">Manage Vendors</Link>
                <button className="logout-btn text-sky-100 px-2 py-1 rounded-md hover:bg-white/5" onClick={() => { onLogout?.(); navigate('/login'); }}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/my-weddings" className="text-sky-100 px-2 py-1 rounded-md hover:bg-white/5">My Weddings</Link>
                <Link to="/manage-vendors" className="text-sky-100 px-2 py-1 rounded-md hover:bg-white/5">Vendors</Link>
                <button className="logout-btn text-sky-100 px-2 py-1 rounded-md hover:bg-white/5" onClick={() => { onLogout?.(); navigate('/login'); }}>Logout</button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
