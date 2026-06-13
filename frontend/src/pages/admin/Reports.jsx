import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function Reports() {
  const { token } = useAuth()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState([])
  const [stats, setStats] = useState({ total: 0, completed: 0, skipped: 0, avgWait: 0 })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const headers = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/patients/history?startDate=${date}&endDate=${date}&page=${page}&limit=10`, { headers })
      const json = await res.json()
      if (json.data) {
        setData(json.data)
        setStats(json.stats || { total: 0, completed: 0, skipped: 0, avgWait: 0 })
        setTotalPages(json.pagination?.totalPages || 1)
      } else {
        // Fallback if backend hasn't restarted yet
        setData(json.length ? json : [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Reset page to 1 when date changes
  useEffect(() => {
    setPage(1)
  }, [date])

  useEffect(() => { load() }, [date, page])

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h2>📊 Reports</h2>
          <p className="admin-page-subtitle">View queue history and statistics</p>
        </div>
        <div className="admin-form" style={{ marginBottom: 0, padding: '1rem', background: 'transparent', boxShadow: 'none', border: 'none' }}>
          <div>
            <label className="text-xs text-muted" style={{ fontWeight: 600 }}>Filter by Date</label>
            <input className="form-control" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="report-stats">
        <div className="report-stat-card" style={{ borderLeft: '4px solid var(--primary)', background: 'linear-gradient(to right, rgba(37,99,235,0.05), transparent)' }}>
          <span className="stat-label" style={{ fontWeight: 600, color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Patients</span>
          <span className="stat-value" style={{ color: '#0f172a', fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem' }}>{stats.total}</span>
        </div>
        <div className="report-stat-card" style={{ borderLeft: '4px solid var(--accent)', background: 'linear-gradient(to right, rgba(16,185,129,0.05), transparent)' }}>
          <span className="stat-label" style={{ fontWeight: 600, color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</span>
          <span className="stat-value" style={{ color: '#0f172a', fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem' }}>{stats.completed}</span>
        </div>
        <div className="report-stat-card" style={{ borderLeft: '4px solid var(--danger)', background: 'linear-gradient(to right, rgba(239,68,68,0.05), transparent)' }}>
          <span className="stat-label" style={{ fontWeight: 600, color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skipped</span>
          <span className="stat-value" style={{ color: '#0f172a', fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem' }}>{stats.skipped}</span>
        </div>
        <div className="report-stat-card" style={{ borderLeft: '4px solid var(--warning)', background: 'linear-gradient(to right, rgba(245,158,11,0.05), transparent)' }}>
          <span className="stat-label" style={{ fontWeight: 600, color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Wait (min)</span>
          <span className="stat-value" style={{ color: '#0f172a', fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem' }}>{Math.round(stats.avgWait)}</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen admin-card" style={{ height: 200 }}><div className="spinner" /></div>
      ) : data.length === 0 ? (
        <div className="empty-state admin-card" style={{ padding: '4rem 2rem' }}>
          <div className="icon" style={{ fontSize: '3rem', opacity: 0.8, marginBottom: '1rem' }}>📋</div>
          <p style={{ fontWeight: 500, color: '#64748b' }}>No records found for this date.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <div key={page} className="page-transition-enter">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d._id}>
                    <td><span className="waiting-token">{d.tokenNumber}</span></td>
                    <td>
                      <div className="font-semibold">{d.patientName}</div>
                      <div className="text-xs text-muted">{d.phone}</div>
                    </td>
                    <td className="text-sm">{d.doctorId?.name || '—'}</td>
                    <td><span className="badge badge-waiting">{d.visitPurpose}</span></td>
                    <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                    <td className="text-sm text-muted">{new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Previous
              </button>
              <span className="text-sm font-semibold text-muted" style={{ minWidth: '100px', textAlign: 'center' }}>
                Page {page} of {totalPages}
              </span>
              <button 
                className="btn btn-ghost" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
