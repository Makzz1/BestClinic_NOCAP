import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, 
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts'
import PatientDetailsModal from '../../components/PatientDetailsModal'

export default function Analytics() {
  const { token } = useAuth()
  
  // Default to the last 30 days
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lookupPhone, setLookupPhone] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [lookupError, setLookupError] = useState('')

  const handleLookup = async (e) => {
    e.preventDefault()
    if (!lookupPhone) return
    setLookupError('')
    try {
      const res = await fetch(`/api/patients/search?phone=${lookupPhone}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const searchData = await res.json()
      if (res.ok && searchData.patient) {
        setSelectedPatient(searchData.patient)
        setLookupPhone('')
      } else {
        setLookupError('Patient not found')
      }
    } catch (err) {
      setLookupError('Search failed')
    }
  }

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setData(await res.json())
      }
    } catch (err) {
      console.error("Failed to load analytics", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [startDate, endDate])

  // Custom colors matching QueueCure theme variables roughly
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (loading && !data) {
    return (
      <div className="admin-page-content">
        <h2>📈 Analytics Dashboard</h2>
        <div className="loading-screen" style={{ height: '300px' }}><div className="spinner" /></div>
      </div>
    )
  }

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h2>📈 Analytics Dashboard</h2>
          <p className="admin-page-subtitle">Your Clinic in Numbers</p>
        </div>
        <div className="admin-form" style={{ marginBottom: 0, padding: '1rem', background: 'transparent', boxShadow: 'none', border: 'none' }}>
          <div>
            <label className="text-xs text-muted" style={{ fontWeight: 600 }}>Start Date</label>
            <input 
              className="form-control" 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs text-muted" style={{ fontWeight: 600 }}>End Date</label>
            <input 
              className="form-control" 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Patient Lookup Card */}
      <div className="report-stat-card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>Patient Lookup</h3>
          <p className="text-muted" style={{ fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>Search comprehensive patient history</p>
        </div>
        <form onSubmit={handleLookup} style={{ display: 'flex', gap: '0.75rem', flex: 1, maxWidth: '400px' }}>
          <input 
            className="form-control" 
            type="text" 
            placeholder="Enter phone number..."
            value={lookupPhone} 
            onChange={(e) => setLookupPhone(e.target.value)} 
            style={{ 
              flex: 1, 
              border: '2px solid #e2e8f0', 
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
            onMouseOver={(e) => { if(document.activeElement !== e.target) e.target.style.borderColor = '#cbd5e1' }}
            onMouseOut={(e) => { if(document.activeElement !== e.target) e.target.style.borderColor = '#e2e8f0' }}
          />
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              padding: '0 1.5rem', 
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
            }}
          >Search</button>
        </form>
        {lookupError && <div style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 500 }}>{lookupError}</div>}
      </div>

      {!data ? (
        <div className="empty-state admin-card" style={{ padding: '4rem 2rem' }}>
          <div className="icon" style={{ fontSize: '3rem', opacity: 0.8, marginBottom: '1rem' }}>📊</div>
          <p style={{ fontWeight: 500, color: '#64748b' }}>No analytics data available for this date range.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Wait Time Trends */}
          <div className="report-stat-card" style={{ gridColumn: '1 / -1', minWidth: 0 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 700 }}>Average Wait Time Trends (mins)</h3>
            <div style={{ height: 300, width: '100%' }}>
              {data.waitTimeTrends.length === 0 ? (
                <p className="text-muted" style={{textAlign: 'center', marginTop: '100px'}}>No wait time data for this period</p>
              ) : (
                <ResponsiveContainer width="99%" height="100%">
                  <LineChart data={data.waitTimeTrends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} />
                    <YAxis tick={{fontSize: 12, fill: '#6b7280'}} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="avgWaitTime" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Avg Wait (min)" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Peak Hours */}
          <div className="report-stat-card" style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 700 }}>Peak Hours Heatmap</h3>
            <div style={{ height: 250, width: '100%' }}>
              {data.peakHours.length === 0 ? (
                <p className="text-muted" style={{textAlign: 'center', marginTop: '100px'}}>No peak hour data</p>
              ) : (
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={data.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{fontSize: 12, fill: '#6b7280'}} />
                    <YAxis tick={{fontSize: 12, fill: '#6b7280'}} />
                    <RechartsTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Patients" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Doctor Efficiency */}
          <div className="report-stat-card" style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 700 }}>Doctor Efficiency (Patients Served)</h3>
            <div style={{ height: 250, width: '100%' }}>
              {data.doctorEfficiency.length === 0 ? (
                <p className="text-muted" style={{textAlign: 'center', marginTop: '100px'}}>No doctor efficiency data</p>
              ) : (
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={data.doctorEfficiency} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" tick={{fontSize: 12, fill: '#6b7280'}} />
                    <YAxis dataKey="doctorName" type="category" tick={{fontSize: 12, fill: '#6b7280'}} width={100} />
                    <RechartsTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="patientsServed" fill="var(--primary)" radius={[0, 4, 4, 0]} name="Patients Served" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Visit Purposes */}
          <div className="report-stat-card" style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 700 }}>Most Common Visit Purposes</h3>
            <div style={{ height: 250, width: '100%' }}>
              {data.visitPurposes.length === 0 ? (
                <p className="text-muted" style={{textAlign: 'center', marginTop: '100px'}}>No visit purpose data</p>
              ) : (
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.visitPurposes}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="purpose"
                    >
                      {data.visitPurposes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Volume by Day of Week */}
          <div className="report-stat-card" style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 700 }}>Patient Volume by Day</h3>
            <div style={{ height: 250, width: '100%' }}>
              {data.volumeByDay.length === 0 ? (
                <p className="text-muted" style={{textAlign: 'center', marginTop: '100px'}}>No patient volume data</p>
              ) : (
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={data.volumeByDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{fontSize: 12, fill: '#6b7280'}} />
                    <YAxis tick={{fontSize: 12, fill: '#6b7280'}} />
                    <RechartsTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="var(--warning)" radius={[4, 4, 0, 0]} name="Visits" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      )}

      {selectedPatient && (
        <PatientDetailsModal 
          patient={selectedPatient} 
          onClose={() => setSelectedPatient(null)} 
          authToken={token}
          onUpdated={(updatedPatient) => setSelectedPatient(updatedPatient)}
        />
      )}
    </div>
  )
}
