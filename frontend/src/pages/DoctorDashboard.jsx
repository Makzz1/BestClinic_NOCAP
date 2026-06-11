import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import PatientDetailsModal from '../components/PatientDetailsModal'
import PatientCard from '../components/PatientCard'

export default function DoctorDashboard() {
  const { user, token, logout } = useAuth()
  const socket = useSocket()

  const [isActive, setIsActive] = useState(false)
  const [queue, setQueue] = useState({ serving: null, waiting: [], completed: [], skipped: [] })
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const doctorId = user?.doctorId

  const fetchStatus = async () => {
    if (!doctorId) return
    try {
      const res = await fetch('/api/doctors', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const doctors = await res.json()
      const me = doctors.find(d => d._id === doctorId)
      if (me) setIsActive(me.isActive)
    } catch (err) {
      console.error('Failed to fetch doctor status', err)
    }
  }

  const fetchQueue = async () => {
    if (!doctorId) return
    try {
      const res = await fetch(`/api/queue/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setQueue(data)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch queue', err)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchQueue()

    if (socket && doctorId) {
      const handleUpdate = (data) => {
        if (data.doctorId === doctorId) {
          if (data.waiting) {
            setQueue(data)
          } else {
            fetchQueue()
          }
        }
      }

      socket.on('queue:update', handleUpdate)
      socket.on('estimate:update', handleUpdate)

      return () => {
        socket.off('queue:update', handleUpdate)
        socket.off('estimate:update', handleUpdate)
      }
    }

    return () => {}
  }, [socket, doctorId, token])

  const toggleStatus = async () => {
    // If setting to inactive, warn if they have patients waiting
    if (isActive && queue.waiting.length > 0) {
      if (!window.confirm("You still have patients waiting in your queue. If you go inactive, reception won't add more patients, but you must finish your existing queue. Continue?")) {
        return
      }
    }

    try {
      const res = await fetch(`/api/doctors/${doctorId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (res.ok) {
        setIsActive(!isActive)
        // Also emit a general socket event so display page can update doctor lists if needed
        if (socket) {
          socket.emit('doctor:status:change') // We don't have this on backend, but it's fine
        }
      } else {
        alert("Failed to update status")
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAction = async (action) => {
    if (!doctorId) return

    // Optimistic UI can be added, but we rely on the response + socket
    try {
      const res = await fetch(`/api/queue/${doctorId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.message || `Failed to ${action}`)
      } else if (data.queue) {
        setQueue(data.queue)
      }
    } catch (err) {
      console.error(`Failed action ${action}`, err)
    }
  }

  const handleCallSpecific = async (tokenId) => {
    if (!doctorId) return
    try {
      const res = await fetch(`/api/queue/${doctorId}/call/${tokenId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Failed to call specific patient')
      } else if (data.queue) {
        setQueue(data.queue)
      }
    } catch (err) {
      console.error('Failed to call specific patient', err)
    }
  }

  const handleEstimateChange = async (tokenId, deltaMins) => {
    try {
      await fetch(`/api/queue/estimate/${tokenId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adjustment: deltaMins })
      })
    } catch (err) {
      console.error('Failed to update estimate', err)
    }
  }

  const handleCancel = async (tokenId) => {
    if (!window.confirm("Are you sure you want to remove this patient from the queue?")) return;
    try {
      const res = await fetch(`/api/queue/${doctorId}/cancel/${tokenId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Failed to remove patient')
      } else if (data.queue) {
        setQueue(data.queue)
      }
    } catch (err) {
      console.error('Failed to cancel patient', err)
    }
  }

  if (!doctorId) {
    return <div className="loading-screen"><h2>Invalid Doctor Profile</h2></div>
  }

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>
  }

  return (
    <div className="reception-page">
      <header className="reception-header">
        <div className="header-brand">
          <span className="header-logo">🏥</span>
          <h1>QueueCure <span className="admin-badge">Doctor</span></h1>
        </div>

        <div className="header-right" style={{ gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface)', padding: '0.35rem 0.75rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Status:</span>
            <span className={`badge ${isActive ? 'badge-serving' : 'badge-skipped'}`}>
              {isActive ? '🟢 Active' : '🔴 Paused'}
            </span>
            <button
              className={`btn btn-sm ${isActive ? 'btn-outline' : 'btn-primary'}`}
              onClick={toggleStatus}
              style={{ marginLeft: '0.5rem' }}
            >
              {isActive ? 'Go Inactive' : 'Go Active'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="header-user">👨‍⚕️ Dr. {user.name}</span>
            <button className="btn btn-danger btn-sm" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="reception-main-new" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '1400px', width: '100%', alignItems: 'stretch' }}>

          {/* Left Side: Serving & Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', justifyContent: 'center' }}>
            <div className="card" style={{ padding: '2rem' }}>
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Now Serving</span>
              </h2>

              {queue.serving ? (
                <PatientCard
                  token={queue.serving}
                  isServing={true}
                  onComplete={(e) => { e.stopPropagation(); handleAction('complete'); }}
                  onSkip={(e) => { e.stopPropagation(); handleAction('skip'); }}
                  onEstimateChange={handleEstimateChange}
                  onClick={setSelectedPatient}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                  <p>No patient currently serving.</p>
                  <div style={{ marginTop: '1.5rem' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAction('next')}
                      disabled={queue.waiting.length === 0}
                    >
                      Call Next Patient
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar / Stats */}
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Today's Stats</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px' }}>
                  <div className="text-muted text-sm">Completed</div>
                  <div className="font-semibold" style={{ fontSize: '1.5rem', color: 'var(--success)' }}>{queue.completed?.length || 0}</div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px' }}>
                  <div className="text-muted text-sm">Skipped</div>
                  <div className="font-semibold" style={{ fontSize: '1.5rem', color: 'var(--danger)' }}>{queue.skipped?.length || 0}</div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px' }}>
                  <div className="text-muted text-sm">Total Patients</div>
                  <div className="font-semibold" style={{ fontSize: '1.5rem' }}>
                    {(queue.completed?.length || 0) + (queue.skipped?.length || 0) + queue.waiting.length + (queue.serving ? 1 : 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Waiting Queue */}
          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 120px)' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span>Waiting Queue</span>
              <span className="badge badge-waiting">{queue.waiting.length} Waiting</span>
            </h2>

            {queue.waiting.length > 0 ? (
              <div style={{ display: 'grid', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem', flexGrow: 1, alignContent: 'start' }}>
                {queue.waiting.map((token, index) => (
                  <PatientCard 
                    key={token._id}
                    token={token}
                    isServing={false}
                    onCallNext={!queue.serving && (token.isPriority || index === 0) ? (e) => { e.stopPropagation(); handleCallSpecific(token._id); } : null}
                    onCancel={(e) => { e.stopPropagation(); handleCancel(token._id); }}
                    onEstimateChange={handleEstimateChange}
                    onClick={setSelectedPatient}
                  />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <p>No patients waiting.</p>
              </div>
            )}
          </div>

        </div>
      </main>

      <PatientDetailsModal
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
        hideContactInfo={true}
      />
    </div>
  )
}


