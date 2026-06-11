import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function Reports() {
  const { token } = useAuth()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const headers = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/patients/history?startDate=${date}&endDate=${date}`, { headers })
    setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [date])

  const stats = {
    total: data.length,
    completed: data.filter((d) => d.status === 'completed').length,
    skipped: data.filter((d) => d.status === 'skipped').length,
    avgWait: data.filter((d) => d.status === 'completed' && d.calledAt && d.createdAt).reduce((acc, d) => {
      return acc + (new Date(d.calledAt) - new Date(d.createdAt)) / 60000
    }, 0) / (data.filter((d) => d.status === 'completed' && d.calledAt).length || 1),
  }

  return (
    <div>
      <h2>📊 Reports</h2>
      <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>View queue history and statistics</p>

      <div className="admin-form" style={{ marginBottom: '1.5rem' }}>
        <input className="form-control" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 200 }} />
      </div>

      <div className="report-stats">
        <div className="report-stat-card">
          <span className="stat-value" style={{ color: 'var(--primary)' }}>{stats.total}</span>
          <span className="stat-label">Total Patients</span>
        </div>
        <div className="report-stat-card">
          <span className="stat-value" style={{ color: 'var(--accent)' }}>{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="report-stat-card">
          <span className="stat-value" style={{ color: 'var(--danger)' }}>{stats.skipped}</span>
          <span className="stat-label">Skipped</span>
        </div>
        <div className="report-stat-card">
          <span className="stat-value" style={{ color: 'var(--warning)' }}>{Math.round(stats.avgWait)}</span>
          <span className="stat-label">Avg Wait (min)</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ height: 200 }}><div className="spinner" /></div>
      ) : data.length === 0 ? (
        <div className="empty-state"><div className="icon">📋</div><p>No records for this date</p></div>
      ) : (
        <div className="admin-table-wrap">
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
      )}
    </div>
  )
}
