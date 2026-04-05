import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import headerImage from '../assets/VENUE LOGO TRANSLUCENT.png'

export default function Header({ currentUser, onLogout }: { currentUser?: any, onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  const isAdmin = currentUser?.role === 'ADMIN';
  const isSupport = currentUser?.role === 'SUPPORT';
  const isPlanner = currentUser?.role === 'PLANNER';
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card text-foreground h-16 shadow-sm border-b border-accent">
      <div className="max-w-11/12 mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="">
            <Link to="/" >
            <img src={headerImage} className="h-12 w-auto" />
            </Link>
          </div>

          <button
            className="md:hidden p-2"
            aria-expanded={open}
            aria-label="Toggle navigation"
            onClick={() => setOpen(v => !v)}
          >
            <span className="block w-5 h-0.5 bg-foreground my-0.75" />
            <span className="block w-5 h-0.5 bg-foreground my-0.75" />
            <span className="block w-5 h-0.5 bg-foreground my-0.75" />
          </button>

          <nav className={`${open ? 'flex' : 'hidden'} md:flex items-center gap-4 md:static absolute top-16 right-4 bg-card md:bg-transparent flex-col md:flex-row p-3 md:p-0 rounded-xl min-w-40 border md:border-0 border-accent`}>
            {!currentUser ? (
              <Link to="/login" className="align-end  text-foreground px-2 py-1 rounded-lg hover:bg-primary/80">Login</Link>
            ) : isAdmin || isSupport ? (
              <>
                <Link to="/planners" className="text-foreground bg-primary px-2 py-1 rounded-lg hover:bg-primary/80">Dashboard</Link>
                {/*<Link to="/manage-weddings" className="text-foreground bg-primary px-2 py-1 rounded-lg hover:bg-primary/80">Manage Weddings</Link> deprecated */} 
                <Link to="/manage-planners" className="text-foreground bg-primary px-2 py-1 rounded-lg hover:bg-primary/80">Manage Planners</Link>
                <Link to="/manage-vendors" className="text-foreground bg-primary px-2 py-1 rounded-lg hover:bg-primary/80">Manage Vendors</Link>
                <button className="logout-btn text-foreground bg-primary px-2 py-1 rounded-lg hover:bg-primary/80" onClick={() => { onLogout?.(); navigate('/login'); }}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/my-weddings" className="text-foreground bg-primary px-2 py-1 rounded-lg hover:bg-primary/80">My Weddings</Link>
                <Link to="/manage-vendors" className="text-foreground bg-primary px-2 py-1 rounded-lg hover:bg-primary/80">Vendors</Link>
                <button className="logout-btn text-foreground bg-primary px-2 py-1 rounded-lg hover:bg-primary/80" onClick={() => { onLogout?.(); navigate('/login'); }}>Logout</button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
