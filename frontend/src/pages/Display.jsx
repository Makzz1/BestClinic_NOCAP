import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../context/SocketContext'
import '../css/display.css'

export default function Display() {
  const socket = useSocket()
  const [queues, setQueues] = useState([])
  const [order, setOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qc_display_order')) || [] } catch { return [] }
  })
  const [time, setTime] = useState(new Date())
  const [dragId, setDragId] = useState(null)
  const [calcToken, setCalcToken] = useState('')
  const [calcResult, setCalcResult] = useState(null)
  const dragOverId = useRef(null)

  const calculateWaitTime = (e) => {
    e.preventDefault()
    if (!calcToken) return
    
    for (const q of queues) {
      if (q.queue.serving && String(q.queue.serving.tokenNumber) === calcToken) {
        setCalcResult({ status: 'serving', text: `Currently Serving with Dr. ${q.doctor.name}` })
        return
      }
      const waitingMatch = q.queue.waiting.find(t => String(t.tokenNumber) === calcToken)
      if (waitingMatch) {
        setCalcResult({ 
          status: 'waiting', 
          time: waitingMatch.estimatedWaitMins,
          doctor: q.doctor.name
        })
        return
      }
    }
    setCalcResult({ status: 'not_found', text: 'Token not found or already completed.' })
  }

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Load initial data
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/queue/display')
        const data = await res.json()
        setQueues(data)
        // Initialize order if not saved
        if (order.length === 0 && data.length > 0) {
          const ids = data.map((d) => d.doctor._id)
          setOrder(ids)
          localStorage.setItem('qc_display_order', JSON.stringify(ids))
        }
      } catch (err) {
        console.error('Failed to load display data:', err)
      }
    }
    load()
    const interval = setInterval(load, 30000) // Fallback poll every 30s
    return () => clearInterval(interval)
  }, [])

  // Socket.IO for real-time updates
  useEffect(() => {
    if (!socket) return
    const handleUpdate = () => {
      fetch('/api/queue/display').then((r) => r.json()).then(setQueues).catch(() => { })
    }
    socket.on('queue:update', handleUpdate)
    socket.on('estimate:update', handleUpdate)
    socket.on('patient:added', handleUpdate)
    socket.on('doctor:update', handleUpdate)
    return () => {
      socket.off('queue:update', handleUpdate)
      socket.off('estimate:update', handleUpdate)
      socket.off('patient:added', handleUpdate)
      socket.off('doctor:update', handleUpdate)
    }
  }, [socket])

  // Order queues based on saved order
  const orderedQueues = [...queues].sort((a, b) => {
    const ai = order.indexOf(a.doctor._id)
    const bi = order.indexOf(b.doctor._id)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  // Drag and drop handlers
  const handleDragStart = (id) => setDragId(id)
  const handleDragOver = (e, id) => {
    e.preventDefault()
    dragOverId.current = id
  }
  const handleDrop = () => {
    if (!dragId || !dragOverId.current || dragId === dragOverId.current) return
    const currentActualOrder = orderedQueues.map((q) => q.doctor._id)
    const fromIdx = currentActualOrder.indexOf(dragId)
    const toIdx = currentActualOrder.indexOf(dragOverId.current)
    if (fromIdx === -1 || toIdx === -1) return
    currentActualOrder.splice(fromIdx, 1)
    currentActualOrder.splice(toIdx, 0, dragId)
    setOrder(currentActualOrder)
    localStorage.setItem('qc_display_order', JSON.stringify(currentActualOrder))
    setDragId(null)
    dragOverId.current = null
  }

  const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="display-page">
      <header className="display-header">
        <div className="display-brand">
          <span>🏥</span>
          <h1>QueueCure</h1>
        </div>
        <p className="display-subtitle">Clinic Queue Display</p>
      </header>

      <div className="display-main-content">
        <div className="display-grid">
          {orderedQueues.map((item) => (
            <DoctorCard
              key={item.doctor._id}
              data={item}
              isDragging={dragId === item.doctor._id}
              onDragStart={() => handleDragStart(item.doctor._id)}
              onDragOver={(e) => handleDragOver(e, item.doctor._id)}
              onDrop={handleDrop}
              onDragEnd={() => setDragId(null)}
            />
          ))}
        </div>

        <div className="display-sidebar-right">
          <div className="calc-card">
            <h3>⏳ Estimate Time</h3>
            <p className="text-sm calc-desc">Enter your token number to see your estimated wait time.</p>
            <form onSubmit={calculateWaitTime} className="calc-form">
              <input 
                type="number" 
                placeholder="Token #" 
                value={calcToken} 
                onChange={(e) => { setCalcToken(e.target.value); setCalcResult(null); }} 
                className="form-control"
              />
              <button type="submit" className="btn btn-primary">Calculate</button>
            </form>
            
            {calcResult && (
              <div className={`calc-result ${calcResult.status}`}>
                {calcResult.status === 'not_found' && <p>{calcResult.text}</p>}
                {calcResult.status === 'serving' && <p>{calcResult.text}</p>}
                {calcResult.status === 'waiting' && (
                  <>
                    <p className="calc-doc">Dr. {calcResult.doctor}</p>
                    <div className="calc-time">~{calcResult.time} mins</div>
                    <p className="calc-label">Estimated Wait</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="display-footer">
        <span className="display-clock">⏱️ {formatTime(time)}</span>
        <span className="display-date">📅 {formatDate(time)}</span>
      </footer>
    </div>
  )
}

function DoctorCard({ data, isDragging, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const { doctor, queue } = data
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [queue.serving?.tokenNumber])

  return (
    <div
      className={`display-card ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="display-card-header">
        <h3>{doctor.name}</h3>
        <span className="display-card-room">Room {doctor.roomNumber}</span>
      </div>
      <p className="display-card-spec">{doctor.specialization}</p>

      {queue.serving ? (
        <div className="display-token animate-flip" key={animKey}>
          <span className="display-token-label">NOW SERVING</span>
          <span className="display-token-number">#{queue.serving.tokenNumber}</span>
          <span className="display-token-est">⏱️ ~{queue.serving.estimatedTimeMins} min</span>
        </div>
      ) : (
        <div className="display-token display-token-empty">
          <span className="display-token-label">NO PATIENTS</span>
          <span className="display-token-number">--</span>
        </div>
      )}

      {queue.waiting.length > 0 && (
        <div className="display-upcoming">
          <span className="display-upcoming-label">Next up:</span>
          <div className="display-upcoming-tokens">
            {queue.waiting.slice(0, 4).map((t) => (
              <span key={t._id} className="display-upcoming-chip">
                #{t.tokenNumber}
                <small>~{t.estimatedWaitMins}m</small>
              </span>
            ))}
            {queue.waiting.length > 4 && (
              <span className="display-upcoming-more">+{queue.waiting.length - 4}</span>
            )}
          </div>
        </div>
      )}

      <div className="display-card-stats">
        <span>⏳ Waiting: {queue.stats.waitingCount}</span>
        <span>✅ Served: {queue.stats.completedCount}</span>
      </div>

      <div className="drag-handle" title="Drag to rearrange">⋮⋮</div>
    </div>
  )
}
