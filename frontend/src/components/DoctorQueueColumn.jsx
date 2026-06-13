import { useState, useEffect } from 'react'
import { useSocket } from '../context/SocketContext'
import NowServing from './NowServing'
import WaitingList from './WaitingList'

export default function DoctorQueueColumn({ doctor, authToken, addToast, onPatientClick, index = 0 }) {
  const { socket } = useSocket()
  const [queue, setQueue] = useState({ waiting: [], serving: null })
  const [stats, setStats] = useState({ waitingCount: 0, completedCount: 0, skippedCount: 0, totalToday: 0 })

  const fetchQueue = async () => {
    try {
      const res = await fetch(`/api/queue/${doctor._id}`, { 
        headers: { Authorization: `Bearer ${authToken}` } 
      })
      const data = await res.json()
      setQueue({ waiting: data.waiting, serving: data.serving })
      if (data.stats) setStats(data.stats)
    } catch (err) {
      console.error('Failed to fetch queue', err)
    }
  }

  // Initial Fetch & Socket Listeners
  useEffect(() => {
    fetchQueue()

    if (socket) {
      const handleUpdate = (data) => {
        if (data.doctorId === doctor._id) {
          if (data.waiting) {
            setQueue({ waiting: data.waiting, serving: data.serving })
            if (data.stats) setStats(data.stats)
          } else if (data.queue && data.queue.waiting) {
            setQueue({ waiting: data.queue.waiting, serving: data.queue.serving })
            if (data.queue.stats) setStats(data.queue.stats)
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
  }, [doctor._id, socket, authToken])

  const handleCallNext = async () => {
    try {
      const res = await fetch(`/api/queue/${doctor._id}/next`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const data = await res.json()
      if (res.ok) {
        if (data.calledToken) {
          addToast(`Called Token #${data.calledToken.tokenNumber} for Dr. ${doctor.name}`, 'success')
        } else {
          addToast(`No waiting patients for Dr. ${doctor.name}`, 'warning')
        }
      } else {
        addToast(data.message, 'error')
      }
    } catch (err) {
      addToast('Failed to call next token', 'error')
    }
  }

  const handleSkip = async () => {
    if (!queue.serving) return
    try {
      const res = await fetch(`/api/queue/${doctor._id}/skip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      })
      if (res.ok) {
        addToast(`Patient skipped for Dr. ${doctor.name}`, 'warning')
      }
    } catch (err) {
      addToast('Failed to skip', 'error')
    }
  }

  const handleEstimateChange = async (tokenId, deltaMins) => {
    try {
      await fetch(`/api/queue/estimate/${tokenId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ adjustment: deltaMins })
      })
    } catch (err) {
      addToast('Failed to update estimate', 'error')
    }
  }

  const handleCancel = async (tokenId) => {
    try {
      const res = await fetch(`/api/queue/${doctor._id}/cancel/${tokenId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      })
      if (res.ok) {
        addToast(`Waiting patient cancelled`, 'warning')
      }
    } catch (err) {
      addToast('Failed to cancel patient', 'error')
    }
  }

  return (
    <div 
      className="doctor-queue-column card animate-slide-up-fade"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="card-header queue-column-header">
        <div>
          <h3>Dr. {doctor.name}</h3>
          <span className="text-muted text-sm">{doctor.specialization} | Room {doctor.roomNumber}</span>
        </div>
        <div className="badge badge-completed">{stats.waitingCount} Waiting</div>
      </div>
      
      <div className="queue-column-body">
        <NowServing 
          serving={queue.serving} 
          onCallNext={handleCallNext} 
          onSkip={handleSkip}
          onEstimateChange={handleEstimateChange}
          hasWaiting={queue.waiting.length > 0}
          onPatientClick={onPatientClick}
        />
        
        <div style={{ marginTop: '1rem' }}>
          <WaitingList 
            waiting={queue.waiting} 
            onPatientClick={onPatientClick}
          />
        </div>
      </div>
    </div>
  )
}
