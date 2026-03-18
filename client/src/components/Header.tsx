import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Header({ currentUser, onLogout }: { currentUser?: any, onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  const isAdmin = currentUser?.role === 'ADMIN';
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white h-16 shadow-sm">
      <div className="max-w-[1100px] mx-auto px-4">
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
            <span className="block w-5 h-0.5 bg-white my-[3px]" />
            <span className="block w-5 h-0.5 bg-white my-[3px]" />
            <span className="block w-5 h-0.5 bg-white my-[3px]" />
          </button>

          <nav className={`${open ? 'flex' : 'hidden'} md:flex items-center gap-4 md:static absolute top-16 right-4 bg-slate-900 md:bg-transparent flex-col md:flex-row p-3 md:p-0 rounded-md min-w-[160px]`}>
            {!currentUser ? (
              <Link to="/login" className="text-sky-100 px-2 py-1 rounded-md hover:bg-white/5">Login</Link>
            ) : (
              <>
                <Link to="/planners" className="text-sky-100 px-2 py-1 rounded-md hover:bg-white/5">Home</Link>
                <Link to="/my-weddings" className="text-sky-100 px-2 py-1 rounded-md hover:bg-white/5">My Weddings</Link>
                {isAdmin && (
                  <>
                    <Link to="/account-management" className="text-sky-100 px-2 py-1 rounded-md hover:bg-white/5">Account Management</Link>
                    <Link to="/planner-overview" className="text-sky-100 px-2 py-1 rounded-md hover:bg-white/5">Planner Overview</Link>
                  </>
                )}
                <button className="logout-btn text-sky-100 px-2 py-1 rounded-md hover:bg-white/5" onClick={() => { onLogout?.(); navigate('/login'); }}>Logout</button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
