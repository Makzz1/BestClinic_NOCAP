import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'

import AddPatientForm from '../components/AddPatientForm'
import DoctorQueueColumn from '../components/DoctorQueueColumn'
import PatientDetailsModal from '../components/PatientDetailsModal'
import Toast from '../components/Toast'
import '../css/reception.css'

export default function Reception() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const socket = useSocket()

  const [doctors, setDoctors] = useState([])
  const [toasts, setToasts] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)

  const addToast = (msg, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message: msg, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  const fetchDoctors = () => {
    fetch('/api/doctors?active=true', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setDoctors(data))
  }

  // Initial Data Fetch & Socket
  useEffect(() => {
    fetchDoctors()

    if (socket) {
      socket.on('doctor:update', fetchDoctors)
      return () => socket.off('doctor:update', fetchDoctors)
    }
  }, [token, socket])

  const handlePatientAdded = (patient) => {
    addToast(`Generated Token #${patient.tokenNumber} for ${patient.patientName}`, 'success')
  }

  return (
    <div className="reception-page">
      <header className="reception-header">
        <div className="header-brand">
          <span className="header-logo">🏥</span>
          <h1>QueueCure</h1>
        </div>
        <div className="header-right">
          {user.role === 'admin' && (
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin')}>
              ⚙️ Admin Panel
            </button>
          )}
          <span className="header-user">{user.name} ({user.role})</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="reception-main-new">
        <div className="reception-sidebar">
          {doctors.length > 0 ? (
            <AddPatientForm 
              doctors={doctors} 
              authToken={token} 
              onAdded={handlePatientAdded} 
            />
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="icon">👨‍⚕️</div>
                <p>No Doctors Available</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="reception-queues-container">
          {doctors.length > 0 ? (
            doctors.map(doctor => (
              <DoctorQueueColumn 
                key={doctor._id} 
                doctor={doctor} 
                authToken={token} 
                addToast={addToast} 
                onPatientClick={setSelectedPatient}
              />
            ))
          ) : (
             <div className="empty-state" style={{ margin: 'auto' }}>
               <p>Please contact an administrator to add doctors to the system.</p>
             </div>
          )}
        </div>
      </main>

      <Toast toasts={toasts} />
      <PatientDetailsModal patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
    </div>
  )
}
