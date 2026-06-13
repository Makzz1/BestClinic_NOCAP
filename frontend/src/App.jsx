import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Reception from './pages/Reception'
import Display from './pages/Display'
import AdminLayout from './pages/admin/AdminLayout'
import Staff from './pages/admin/Staff'
import Reports from './pages/admin/Reports'
import Analytics from './pages/admin/Analytics'
import DoctorDashboard from './pages/DoctorDashboard'
import NoNetwork from './components/NoNetwork'
import PublicJoin from './pages/PublicJoin'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /><p>Loading...</p></div>
  }

  if (!user) return <Navigate to="/login" replace />
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    if (user.role === 'doctor') return <Navigate to="/doctor" replace />
    return <Navigate to="/" replace />
  }
  
  return children
}

export default function App() {
  return (
    <>
      <NoNetwork />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/display" element={<Display />} />
      <Route path="/join" element={<PublicJoin />} />
      <Route path="/join/:doctorId" element={<PublicJoin />} />
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['admin', 'receptionist']}>
            <Reception />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="analytics" replace />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="staff" element={<Staff />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
