import { useState, useEffect } from 'react'
import Login from './pages/Login'
import UserManagement from './pages/UserManagement'
import PlanningDashboard from './pages/PlanningDashboard'
import PlannerOverview from './pages/PlannerOverview' 
import { setToken } from './lib/api'
import { api } from './lib/api'
import Layout from './components/Layout'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'

function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadMe() {
    try {
      const res = await api('/auth/me');
      if (res.ok && res.body?.user) setCurrentUser(res.body.user);
      else setCurrentUser(null);
    } catch (e) { setCurrentUser(null); }
    finally { setLoading(false); }
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

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <BrowserRouter>
      <div className="min-h-screen w-full">
        <Layout currentUser={currentUser} onLogout={serverLogout}>
          <Routes>
            <Route path="/" element={currentUser ? <Navigate to="/planners" replace /> : <Navigate to="/login" replace />} />
            <Route path="/login" element={!currentUser ? <Login onLogin={onLogin} /> : <Navigate to="/planners" replace />} />
            <Route path="/planners" element={currentUser ? <PlanningDashboard currentUser={currentUser} /> : <Navigate to="/login" replace />} />
            <Route path="/account-management" element={currentUser?.role === 'ADMIN' ? <UserManagement currentUser={currentUser} /> : <Navigate to="/planners" replace />} />
            <Route path="/planner-overview" element={currentUser?.role === 'ADMIN' ? <PlannerOverview currentUser={currentUser} /> : <Navigate to="/planners" replace />} />
          </Routes>
        </Layout>
      </div>
    </BrowserRouter>
  )
}

export default App
