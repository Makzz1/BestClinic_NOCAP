import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import '../../css/admin.css'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="header-brand">
          <span className="header-logo">🏥</span>
          <h1>QueueCure <span className="admin-badge">Admin</span></h1>
        </div>
        <div className="header-right">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>← Reception</button>
          <span className="header-user">👤 {user?.name}</span>
          <button className="btn btn-danger btn-sm" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="admin-layout">
        <nav className="admin-sidebar">
          <NavLink to="/admin/staff" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            👥 Staff & Doctors
          </NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            📊 Reports
          </NavLink>
        </nav>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
