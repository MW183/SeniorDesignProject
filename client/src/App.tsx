import { useState, useEffect } from 'react'
import "./index.css"
import Login from './pages/Login/Login'
import Register from './pages/Login/Register'
import VerifyEmail from './pages/Login/VerifyEmail'
import ResendVerification from './pages/Login/ResendVerification'
import SetPassword from './pages/Login/SetPassword'
import ResetPassword from './pages/Login/ResetPassword'
import ClientDashboard from './pages/Client/ClientDashboard'
import PlannerManagement from './pages/Admin/PlannerManagement'
import WeddingManagement from './pages/Admin/WeddingManagement'
import CreateWedding from './pages/Admin/CreateWedding'
import AdminDashboard from './pages/Admin/AdminDashboard'
import PlanningDashboard from './pages/Planner/PlanningDashboard'
import PlannerWorkspace from './pages/Planner/PlannerWorkspace'
import AssignedWeddings from './pages/Planner/AssignedWeddings'
import Vendors from './pages/Admin/Vendors'
import { setToken } from './lib/api'
import { api } from './lib/api'
import { onLogoutNeeded, resetLogoutTrigger } from './lib/auth'
import Layout from './components/Layout'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'


function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  // Apply dark mode based on system preference
  useEffect(() => {
    const html = document.documentElement;
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    
    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  async function loadMe() {
    try {
      const res = await api('/auth/me');
      if (res.ok && res.body?.user) {
        resetLogoutTrigger();
        setCurrentUser(res.body.user);
      } else {
        setCurrentUser(null);
      }
    } catch (e) { setCurrentUser(null); }
    finally { setLoading(false); }
  }

  function onLogin() { 
    resetLogoutTrigger();
    loadMe(); 
  }

  async function serverLogout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore network errors
    }
    setCurrentUser(null);
    setToken(null);
  }

  // Subscribe to automatic logout when JWT expires (401 Unauthorized)
  useEffect(() => {
    const unsubscribe = onLogoutNeeded(() => {
      console.log('[App] JWT expired or unauthorized - logging out');
      serverLogout();
    });
    return unsubscribe;
  }, []);

  useEffect(() => { loadMe(); }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  // Debug log
  if (currentUser) {
    console.log('[App] currentUser:', { role: currentUser.role, id: currentUser.id, email: currentUser.email });
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen w-full">
        <Layout currentUser={currentUser} onLogout={serverLogout}>
          <Routes>
            {/* Home redirect - admins go to /planners, clients go to /couple, others go to /my-weddings */}
            <Route 
              path="/" 
              element={
                currentUser 
                  ? currentUser.role === 'ADMIN'
                    ? <Navigate to="/planners" replace />
                    : currentUser.role === 'CLIENT'
                    ? <Navigate to="/couple" replace />
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
                    : currentUser.role === 'CLIENT'
                    ? <Navigate to="/couple" replace />
                    : <Navigate to="/my-weddings" replace />
              } 
            />

            {/* Register */}
            <Route 
              path="/register" 
              element={
                !currentUser 
                  ? <Register /> 
                  : currentUser.role === 'ADMIN'
                    ? <Navigate to="/planners" replace />
                    : currentUser.role === 'CLIENT'
                    ? <Navigate to="/couple" replace />
                    : <Navigate to="/my-weddings" replace />
              } 
            />

            {/* Verify Email */}
            <Route 
              path="/verify-email" 
              element={<VerifyEmail />}
            />

            {/* Resend Verification Email */}
            <Route 
              path="/resend-verification" 
              element={<ResendVerification />}
            />

            {/* Reset Password */}
            <Route 
              path="/reset-password" 
              element={<ResetPassword />}
            />

            {/* Set Password (for couple members after email verification) */}
            <Route 
              path="/set-password" 
              element={<SetPassword />}
            />
            
            {/* CLIENT Dashboard - for couple members */}
            <Route 
              path="/couple" 
              element={
                currentUser?.role === 'CLIENT'
                  ? <ClientDashboard currentUser={currentUser} />
                  : currentUser
                  ? <Navigate to={currentUser.role === 'ADMIN' ? "/planners" : "/my-weddings"} replace />
                  : <Navigate to="/login" replace />
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
                currentUser?.role === 'ADMIN' || currentUser?.role === 'USER'
                  ? <Vendors currentUser={currentUser} /> 
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
