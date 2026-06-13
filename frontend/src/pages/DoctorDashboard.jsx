import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import PatientDetailsModal from '../components/PatientDetailsModal'
import PatientCard from '../components/PatientCard'
import BrandLogo from '../components/BrandLogo'
import { usePopup } from '../context/PopupContext'
import '../css/doctor.css'

export default function DoctorDashboard() {
  const { user, token, logout } = useAuth()
  const { socket } = useSocket()
  const { showAlert, showConfirm } = usePopup()

  const [isActive, setIsActive] = useState(false)
  const [queue, setQueue] = useState({ serving: null, waiting: [], completed: [], skipped: [] })
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [prescription, setPrescription] = useState('')
  const [instructions, setInstructions] = useState('')
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
          } else if (data.queue) {
            setQueue(data.queue)
          } else {
            fetchQueue()
          }
        }
      }

      socket.on('queue:update', handleUpdate)
      socket.on('estimate:update', handleUpdate)
      socket.on('connect', fetchQueue)

      return () => {
        socket.off('queue:update', handleUpdate)
        socket.off('estimate:update', handleUpdate)
        socket.off('connect', fetchQueue)
      }
    }

    return () => {}
  }, [socket, doctorId, token])

  const toggleStatus = async () => {
    const performToggle = async () => {
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
        } else {
          showAlert("Failed to update status")
        }
      } catch (err) {
        console.error(err)
      }
    };

    if (isActive && queue.waiting.length > 0) {
      showConfirm(
        "You still have patients waiting in your queue. If you go inactive, reception won't add more patients, but you must finish your existing queue. Continue?",
        () => performToggle()
      );
    } else {
      performToggle();
    }
  }

  const handleLogout = async () => {
    if (queue.waiting.length > 0 || queue.serving) {
      showAlert("You cannot logout while you have patients in your queue. Please complete or cancel their appointments first. To stop accepting new patients, set your status to 'Paused'.")
      return;
    }

    if (isActive) {
      try {
        await fetch(`/api/doctors/${doctorId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ isActive: false })
        })
      } catch (err) {
        console.error('Failed to set inactive on logout', err)
      }
    }
    
    logout()
  }

  const handleAction = async (action) => {
    if (!doctorId) return

    const fetchOptions = {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }

    if (action === 'complete') {
      const payload = {}
      if (prescription.trim()) payload.prescription = prescription
      if (instructions.trim()) payload.instructions = instructions
      
      if (Object.keys(payload).length > 0) {
        fetchOptions.headers['Content-Type'] = 'application/json'
        fetchOptions.body = JSON.stringify(payload)
      }
    }

    try {
      const res = await fetch(`/api/queue/${doctorId}/${action}`, fetchOptions)
      const data = await res.json()
      if (!res.ok) {
        showAlert(data.message || `Failed to ${action}`)
      } else if (data.queue) {
        setQueue(data.queue)
        if (action === 'complete' || action === 'skip' || action === 'next') {
          setPrescription('')
          setInstructions('')
        }
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
        showAlert(data.message || 'Failed to call specific patient')
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

  const handleCancel = (tokenId) => {
    showConfirm("Are you sure you want to remove this patient from the queue?", async () => {
      try {
        const res = await fetch(`/api/queue/${doctorId}/cancel/${tokenId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) {
          showAlert(data.message || 'Failed to remove patient')
        } else if (data.queue) {
          setQueue(data.queue)
        }
      } catch (err) {
        console.error('Failed to cancel patient', err)
      }
    });
  }

  if (!doctorId) {
    return <div className="loading-screen"><h2>Invalid Doctor Profile</h2></div>
  }

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>
  }

  const hasEmergency = queue.serving?.isPriority || queue.waiting.some(t => t.isPriority);

  return (
    <div className={`reception-page ${hasEmergency ? 'emergency-mode' : ''}`} style={{ position: 'relative' }}>
      <div className="emergency-bg-overlay" />
      <header className="reception-header">
        <BrandLogo subtitle="Doctor" />

        <div className="header-right" style={{ gap: '1.5rem' }}>
          <div className="status-pill-container">
            <span className="status-pill-label">Status</span>
            <span className={`status-indicator ${isActive ? 'active' : 'paused'}`}>
              {isActive ? '🟢 Active' : '🔴 Paused'}
            </span>
            <button
              className="status-toggle-btn"
              onClick={toggleStatus}
            >
              {isActive ? 'Go Inactive' : 'Go Active'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="header-user">👨‍⚕️ Dr. {user.name}</span>
            <button className="btn btn-danger btn-sm" onClick={handleLogout} style={{ borderRadius: '9999px' }}>Logout</button>
          </div>
        </div>
      </header>

      <main className="doctor-dashboard-main">
        <div className="doctor-dashboard-grid">

          {/* Left Side: Serving & Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="doctor-panel" style={{ 
              flexGrow: queue.serving ? 0 : 1,
              flexShrink: 1,
              flexBasis: 'auto',
              transition: 'flex-grow 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s ease, box-shadow 0.3s ease'
            }}>
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Now Serving</span>
              </h2>

              {queue.serving ? (
                <PatientCard
                  token={queue.serving}
                  isServing={true}
                  onComplete={() => handleAction('complete')}
                  onSkip={() => handleAction('skip')}
                  onEstimateChange={handleEstimateChange}
                  onClick={setSelectedPatient}
                />
              ) : (
                <div className="empty-state-card">
                  <div className="empty-state-icon">📭</div>
                  <h3 className="empty-state-title">Ready for next patient</h3>
                  <p className="empty-state-desc">No patient is currently in your serving slot.</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAction('next')}
                    disabled={queue.waiting.length === 0}
                    style={{ padding: '0.75rem 2rem', fontSize: '1rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                  >
                    Call Next Patient
                  </button>
                </div>
              )}
            </div>

            {/* Digital Prescription Pad */}
            <div className={`prescription-wrapper ${queue.serving ? 'active' : ''}`}>
              <div className="doctor-panel prescription-pad">
                <div className="prescription-pad-header">
                  📝 Digital Prescription <span>Optional</span>
                </div>
                <div className="prescription-field">
                  <label className="prescription-label">Medicines & Dosage</label>
                  <textarea 
                    className="prescription-textarea"
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    placeholder="e.g. Paracetamol 500mg (1-0-1) for 3 days"
                    rows={3}
                  />
                </div>
                <div className="prescription-field">
                  <label className="prescription-label">Special Instructions</label>
                  <textarea 
                    className="prescription-textarea"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Drink plenty of water, avoid cold food"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Waiting Queue */}
          <div className="doctor-panel" style={{ height: '100%', maxHeight: 'calc(100vh - 120px)' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span>Waiting Queue</span>
              <span className="badge badge-waiting" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                {queue.waiting.length} Waiting
              </span>
            </h2>

            {queue.waiting.length > 0 ? (
              <div style={{ display: 'grid', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem', flexGrow: 1, alignContent: 'start' }}>
                {queue.waiting.map((token, index) => (
                  <PatientCard 
                    key={token._id}
                    token={token}
                    isServing={false}
                    onCallNext={!queue.serving && (token.isPriority || index === 0) ? () => handleCallSpecific(token._id) : null}
                    onCancel={() => handleCancel(token._id)}
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
        hideContactInfo 
        authToken={token}
        onUpdated={(updatedPatient) => setSelectedPatient(updatedPatient)}
      />
    </div>
  )
}
