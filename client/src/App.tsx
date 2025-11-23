import { useState, useEffect } from 'react'
import './App.css'
import Login from './pages/Login'
import Users from './pages/Users'
import AdminHome from './pages/AdminHome'
import { setToken } from './lib/api'
import { api } from './lib/api'
import Layout from './components/Layout'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)

  async function loadMe() {
    try {
      const res = await api('/auth/me');
      if (res.ok && res.body?.user) setCurrentUser(res.body.user);
      else setCurrentUser(null);
    } catch (e) { setCurrentUser(null); }
  }

  function onLogin() { loadMe(); }

  async function serverLogout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore network errors
    }
    setCurrentUser(null);
    setToken(null);
  }

  useEffect(() => { loadMe(); }, []);

  return (
    <BrowserRouter>
      <Layout currentUser={currentUser} onLogout={serverLogout}>
        <Routes>
          <Route path="/" element={<Users />} />
          <Route path="/login" element={<Login onLogin={onLogin} />} />
          <Route path="/users" element={<Users />} />
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/planners" element={<AdminHome />} />
          
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
