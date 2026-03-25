import { useState, useEffect } from 'react'
import Login from './pages/Login'
import PlannerManagement from './pages/PlannerManagement'
import WeddingManagement from './pages/WeddingManagement'
import CreateWedding from './pages/CreateWedding'
import AdminDashboard from './pages/AdminDashboard'
import PlanningDashboard from './pages/PlanningDashboard'
import PlannerOverview from './pages/PlannerOverview'
import PlannerTasks from './pages/PlannerTasks'
import PlannerWorkspace from './pages/PlannerWorkspace'
import AssignedWeddings from './pages/AssignedWeddings'
import Vendors from './pages/Vendors'
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
            {/* Home redirect - admins go to /planners, others go to /my-weddings */}
            <Route 
              path="/" 
              element={
                currentUser 
                  ? currentUser.role === 'ADMIN'
                    ? <Navigate to="/planners" replace />
                    : <Navigate to="/my-weddings" replace />
                  : <Navigate to="/login" replace />
              } 
            />
            
            {/* Login */}
            <Route 
              path="/login" 
              element={
                !currentUser 
                  ? <Login onLogin={onLogin} /> 
                  : currentUser.role === 'ADMIN'
                    ? <Navigate to="/planners" replace />
                    : <Navigate to="/my-weddings" replace />
              } 
            />
            
            {/* Admin Dashboard */}
            <Route 
              path="/planners" 
              element={
                currentUser?.role === 'ADMIN' 
                  ? <AdminDashboard currentUser={currentUser} /> 
                  : currentUser
                  ? <PlanningDashboard currentUser={currentUser} />
                  : <Navigate to="/login" replace />
              } 
            />
            
            {/* Planner Wedding List */}
            <Route 
              path="/my-weddings" 
              element={
                currentUser 
                  ? <AssignedWeddings currentUser={currentUser} /> 
                  : <Navigate to="/login" replace />
              } 
            />
            
            {/* Planner Tasks for a Wedding */}
            <Route 
              path="/my-weddings/:weddingId/tasks" 
              element={
                currentUser 
                  ? <PlannerWorkspace currentUser={currentUser} /> 
                  : <Navigate to="/login" replace />
              } 
            />
            
            {/* All Tasks (DEPRECATED - keeping for backward compatibility) */}
            <Route 
              path="/my-tasks" 
              element={
                currentUser 
                  ? <PlannerTasks currentUser={currentUser} /> 
                  : <Navigate to="/login" replace />
              } 
            />
            
            {/* Admin: Manage Weddings */}
            <Route 
              path="/manage-weddings" 
              element={
                currentUser?.role === 'ADMIN' 
                  ? <WeddingManagement currentUser={currentUser} /> 
                  : <Navigate to={currentUser ? "/my-weddings" : "/login"} replace />
              } 
            />
            
            {/* Admin: Manage Planners */}
            <Route 
              path="/manage-planners" 
              element={
                currentUser?.role === 'ADMIN' 
                  ? <PlannerManagement currentUser={currentUser} /> 
                  : <Navigate to={currentUser ? "/my-weddings" : "/login"} replace />
              } 
            />
            
            {/* Admin: Create Wedding */}
            <Route 
              path="/create-wedding" 
              element={
                currentUser?.role === 'ADMIN' 
                  ? <CreateWedding /> 
                  : <Navigate to={currentUser ? "/my-weddings" : "/login"} replace />
              } 
            />
            
            {/* Admin/Planner: Manage Vendors */}
            <Route 
              path="/manage-vendors" 
              element={
                currentUser?.role === 'ADMIN' || currentUser?.role === 'PLANNER'
                  ? <Vendors currentUser={currentUser} /> 
                  : <Navigate to={currentUser ? "/my-weddings" : "/login"} replace />
              } 
            />
            
            {/* Legacy Routes (backward compatibility) */}
            <Route 
              path="/account-management" 
              element={
                currentUser?.role === 'ADMIN' 
                  ? <PlannerManagement currentUser={currentUser} /> 
                  : <Navigate to={currentUser ? "/my-weddings" : "/login"} replace />
              } 
            />
            <Route 
              path="/planner-overview" 
              element={
                currentUser?.role === 'ADMIN' 
                  ? <PlannerOverview currentUser={currentUser} /> 
                  : <Navigate to={currentUser ? "/my-weddings" : "/login"} replace />
              } 
            />
          </Routes>
        </Layout>
      </div>
    </BrowserRouter>
  )
}

export default App
