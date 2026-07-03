import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { ThemeProvider } from './theme/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { IncidentProvider } from './context/IncidentContext'
import { SystemProvider } from './context/SystemContext'
import { NotificationProvider } from './context/NotificationContext'

// Auth
import LoginScreen from './screens/auth/LoginScreen'

// Admin Screens
import AdminDashboard from './screens/admin/AdminDashboard'
import CameraManagement from './screens/admin/CameraManagement'
import UserManagement from './screens/admin/UserManagement'
import SystemAuditLog from './screens/admin/SystemAuditLog'
import VideoTest from './screens/admin/VideoTest'

// Responder Screens
import ResponderDashboard from './screens/responder/ResponderDashboard'
import IncidentDetails from './screens/responder/IncidentDetails'
import IncidentArchives from './screens/responder/IncidentArchives'
import CamerasScreen from './screens/responder/CamerasScreen'

function ProtectedRoute({ requiredRole }: { requiredRole?: 'admin' | 'responder' }) {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-text-primary)' }}>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/responder/dashboard'} replace />
  }

  return <Outlet />
}

function AppRoutes() {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-text-primary)' }}>Loading...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginScreen /> : <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/responder/dashboard'} replace />} />
      
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin" />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="cameras" element={<CameraManagement />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="audit" element={<SystemAuditLog />} />
        <Route path="video-test" element={<VideoTest />} />
      </Route>

      <Route path="/responder" element={<ProtectedRoute requiredRole="responder" />}>
        <Route path="dashboard" element={<ResponderDashboard />} />
        <Route path="incident/:id" element={<IncidentDetails />} />
        <Route path="archives" element={<IncidentArchives />} />
        <Route path="cameras" element={<CamerasScreen />} />
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated ? (user?.role === 'admin' ? '/admin/dashboard' : '/responder/dashboard') : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <SystemProvider>
            <IncidentProvider>
              <Router
                basename="/"
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <AppRoutes />
              </Router>
            </IncidentProvider>
          </SystemProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  )
}

