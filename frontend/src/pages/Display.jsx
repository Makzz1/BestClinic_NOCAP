import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../context/SocketContext'
import BrandLogo from '../components/BrandLogo'
import '../css/display.css'

export default function Display() {
  const { socket, isConnected } = useSocket()
  const [queues, setQueues] = useState([])
  const [order, setOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qc_display_order')) || [] } catch { return [] }
  })
  const [time, setTime] = useState(new Date())
  const [dragId, setDragId] = useState(null)
  const [calcToken, setCalcToken] = useState('')
  const [calcResult, setCalcResult] = useState(null)
  const dragOverId = useRef(null)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const prevServingRef = useRef({})
  
  // Speech Queue & Voices State
  const [voices, setVoices] = useState([])
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('')
  const speechQueue = useRef([])
  const isSpeaking = useRef(false)

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

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      if (availableVoices.length > 0) {
        setVoices(availableVoices)
        // Hardcode preference for 'Susan', fallback to another female or default
        const susanVoice = availableVoices.find(v => v.name.toLowerCase().includes('susan'))
        const defaultVoice = susanVoice || availableVoices.find(v => v.name.includes('Female') || v.name.includes('Google UK English Female')) || availableVoices[0]
        if (!selectedVoiceURI || selectedVoiceURI !== defaultVoice.voiceURI) {
          setSelectedVoiceURI(defaultVoice.voiceURI)
        }
      }
    }
    loadVoices()
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [selectedVoiceURI])

  const processSpeechQueue = () => {
    if (isSpeaking.current || speechQueue.current.length === 0) return
    
    isSpeaking.current = true
    const text = speechQueue.current.shift()
    const utterance = new SpeechSynthesisUtterance(text)
    
    if (selectedVoiceURI) {
      const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === selectedVoiceURI)
      if (voice) utterance.voice = voice
    }
    
    utterance.rate = 0.9 // slightly slower for clarity
    utterance.onend = () => {
      isSpeaking.current = false
      processSpeechQueue() // process next in queue
    }
    utterance.onerror = () => {
      isSpeaking.current = false
      processSpeechQueue() // skip and continue
    }
    
    window.speechSynthesis.speak(utterance)
  }

  // Voice Announcements
  useEffect(() => {
    if (!audioEnabled || queues.length === 0) return
    
    let addedToQueue = false
    queues.forEach(q => {
      const docId = q.doctor._id
      const serving = q.queue.serving
      const prevToken = prevServingRef.current[docId]
      
      if (serving && serving.tokenNumber !== prevToken) {
        // Only announce if there's an actual change in the serving token
        if (prevToken !== undefined) {
          const room = q.doctor.roomNumber || '1'
          const baseText = `Token number ${serving.tokenNumber}, please proceed to Doctor ${q.doctor.name}, Room ${room}.`
          const text = `${baseText} I repeat. ${baseText}`
          speechQueue.current.push(text)
          addedToQueue = true
        }
        prevServingRef.current[docId] = serving.tokenNumber
      } else if (!serving && prevToken) {
        prevServingRef.current[docId] = null
      } else if (serving && prevToken === undefined) {
        // initial load, do not announce
        prevServingRef.current[docId] = serving.tokenNumber
      }
    })
    
    if (addedToQueue) {
      processSpeechQueue()
    }
  }, [queues, audioEnabled, selectedVoiceURI])

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
    socket.on('connect', handleUpdate)
    return () => {
      socket.off('queue:update', handleUpdate)
      socket.off('estimate:update', handleUpdate)
      socket.off('patient:added', handleUpdate)
      socket.off('doctor:update', handleUpdate)
      socket.off('connect', handleUpdate)
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
  
  const formatDuration = (totalMins) => {
    if (!totalMins || isNaN(totalMins)) return '0 mins'
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    if (h === 0) return `${m} mins`
    if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`
    return `${h} hr${h > 1 ? 's' : ''} ${m} mins`
  }

  return (
    <div className="display-page">
      <header className="display-header-new">
        {/* Left — Brand */}
        <BrandLogo subtitle="Live Queue Display" />

        {/* Center — Clock & Date */}
        <div className="display-header-center">
          <div className="display-header-clock">{formatTime(time)}</div>
          <div className="display-header-date">{formatDate(time)}</div>
        </div>

        {/* Right — Connection + Audio */}
        <div className="display-header-right">
          <div className={`display-conn-pill ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="display-conn-dot" />
            {isConnected ? 'Live' : 'Reconnecting...'}
          </div>
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`display-audio-btn ${audioEnabled ? 'audio-on' : 'audio-off'}`}
          >
            <span className="audio-icon">{audioEnabled ? '🔊' : '🔇'}</span>
            <span className="audio-label">{audioEnabled ? 'Audio ON' : 'Audio OFF'}</span>
          </button>
        </div>
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
          <div className="calc-card" style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <h3 style={{fontSize: '1.2rem', marginBottom: '0.5rem'}}>📱 Join Queue</h3>
            <p className="text-sm" style={{ color: '#64748b', marginBottom: '1rem' }}>
              Scan QR code to join the queue from your phone.
            </p>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/join')}`} 
              alt="Join Queue QR" 
              style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0.5rem', background: 'white', display: 'inline-block' }}
            />
          </div>

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
                    <div className="calc-time">~{formatDuration(calcResult.time)}</div>
                    <p className="calc-label">Estimated Wait</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="display-footer-slim">
        <span>QueueCure &copy; {new Date().getFullYear()} — Smart Clinic Queue Management</span>
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

  const formatDuration = (totalMins) => {
    if (!totalMins || isNaN(totalMins)) return '0 mins'
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    if (h === 0) return `${m} mins`
    if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`
    return `${h} hr${h > 1 ? 's' : ''} ${m} mins`
  }

  const formatDurationShort = (totalMins) => {
    if (!totalMins || isNaN(totalMins)) return '0m'
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

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
        <div 
          className="display-token animate-flip" 
          style={queue.serving.isPriority ? { 
            background: 'linear-gradient(135deg, hsl(350, 70%, 55%) 0%, hsl(350, 70%, 45%) 100%)',
            boxShadow: '0 4px 20px hsla(350, 70%, 55%, 0.4)'
          } : {}} 
          key={animKey}
        >
          <span className="display-token-label">{queue.serving.isPriority ? '🚨 PRIORITY SERVING' : 'NOW SERVING'}</span>
          <span className="display-token-number">#{queue.serving.tokenNumber}</span>
          <span className="display-token-est">⏱️ ~{formatDuration(queue.serving.estimatedTimeMins)}</span>
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
                <small>~{formatDurationShort(t.estimatedWaitMins)}</small>
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
