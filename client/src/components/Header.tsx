import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

export default function Header({ currentUser, onLogout }: { currentUser?: any, onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  const isAdmin = currentUser?.role === 'ADMIN';
  const navigate = useNavigate();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand">
          <Link to="/">PlannerApp</Link>
        </div>

        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-label="Toggle navigation"
          onClick={() => setOpen(v => !v)}
        >
          <span className="hamburger" />
        </button>

        <nav className={`main-nav ${open ? 'open' : ''}`}>
          <Link to="/planners">Planners</Link>
          {isAdmin && <Link to="/admin">Admin</Link>}
          <Link to="/users">Users</Link>
          {!currentUser ? (
            <Link to="/login">Login</Link>
          ) : (
            <>
              <Link to="/account">Account</Link>
              <button className="logout-btn" onClick={() => { onLogout?.(); navigate('/login'); }}>Logout</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
