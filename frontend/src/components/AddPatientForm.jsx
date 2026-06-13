import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

const PURPOSES = [
  'General Checkup', 'Dental', 'Eye', 'Follow-up',
  'Emergency', 'Consultation', 'Vaccination', 'Lab Test', 'Other',
]

export default function AddPatientForm({ doctors, authToken, onAdded }) {
  const [form, setForm] = useState({
    patientName: '', email: '', phone: '', age: '', sex: '',
    maritalStatus: '', visitPurpose: '', reason: '', estimatedTimeMins: 10, doctorId: '', isPriority: false
  })
  const [customPurpose, setCustomPurpose] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [searchPhone, setSearchPhone] = useState('')
  const [searchStatus, setSearchStatus] = useState(null)
  const nameRef = useRef(null)

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [e.target.name]: value }))
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: null }))
    }
  }

  const handleSearchPatient = async (e) => {
    e.preventDefault()
    if (!/^[0-9]{10}$/.test(searchPhone)) {
      setSearchStatus('Please enter a valid 10-digit phone number.')
      return
    }
    
    setSearchStatus('Searching...')
    try {
      const res = await fetch(`/api/patients/search?phone=${searchPhone}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const data = await res.json()
      
      if (res.ok && data.patient) {
        setForm(prev => ({
          ...prev,
          patientName: data.patient.patientName || '',
          email: data.patient.email || '',
          phone: data.patient.phone || '',
          age: data.patient.age || '',
          sex: data.patient.sex || '',
          maritalStatus: data.patient.maritalStatus || ''
        }))
        setIsSearchModalOpen(false)
        setSearchPhone('')
        setSearchStatus(null)
        // Auto-focus reason/purpose
      } else {
        setSearchStatus('Not registered. Please register them now.')
        setForm(prev => ({ ...prev, phone: searchPhone }))
        setTimeout(() => {
          setIsSearchModalOpen(false)
          setSearchPhone('')
          setSearchStatus(null)
          nameRef.current?.focus()
        }, 2000)
      }
    } catch (err) {
      setSearchStatus('Error searching for patient.')
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!form.doctorId) newErrors.doctorId = 'Fill it before submitting'
    if (!form.patientName.trim()) newErrors.patientName = 'Fill it before submitting'
    if (form.email && !/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(form.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!form.phone) {
      newErrors.phone = 'Fill it before submitting'
    } else if (!/^[0-9]{10}$/.test(form.phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits'
    }
    if (!form.age) newErrors.age = 'Fill it before submitting'
    if (!form.sex) newErrors.sex = 'Fill it before submitting'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    
    setLoading(true)
    const finalPurpose = form.visitPurpose === 'Other' ? customPurpose : form.visitPurpose

    const payload = { 
      ...form, 
      visitPurpose: finalPurpose,
      estimatedTimeMins: Number(form.estimatedTimeMins) 
    }
    if (form.age) payload.age = Number(form.age)
    else delete payload.age

    if (!payload.sex) delete payload.sex
    if (!payload.maritalStatus) delete payload.maritalStatus
    if (!payload.visitPurpose) delete payload.visitPurpose
    if (!payload.email) delete payload.email
    if (!payload.reason) delete payload.reason

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        onAdded(data)
        setForm({
          patientName: '', email: '', phone: '', age: '', sex: '',
          maritalStatus: '', visitPurpose: '', reason: '', estimatedTimeMins: 10, doctorId: form.doctorId, isPriority: false
        })
        setCustomPurpose('')
        setErrors({})
        nameRef.current?.focus()
      } else {
        console.error('Server error:', data)
        setErrors({ patientName: data.message || 'Failed to generate token' })
      }
    } catch (err) {
      console.error('Failed to add patient:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card animate-slide-up-fade" style={{ animationDelay: '0.1s' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="card-title">📝 Add Patient</span>
        <button 
          type="button" 
          onClick={() => setIsSearchModalOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
          title="Search Patient by Phone"
        >
          🔍
        </button>
      </div>

      {/* Patient Search Modal */}
      {isSearchModalOpen && createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1e293b' }}>Search Patient</h3>
            <form onSubmit={handleSearchPatient}>
              <div className="form-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  placeholder="Enter 10-digit phone" 
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  autoFocus
                />
              </div>
              {searchStatus && (
                <div style={{ margin: '1rem 0', color: searchStatus.includes('Not registered') || searchStatus.includes('Error') || searchStatus.includes('valid') ? '#ef4444' : '#3b82f6', fontSize: '0.9rem', fontWeight: 500 }}>
                  {searchStatus}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setIsSearchModalOpen(false); setSearchStatus(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Search</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <form noValidate onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Assign to Doctor *</label>
          <select name="doctorId" className={`form-control ${errors.doctorId ? 'is-invalid' : ''}`} value={form.doctorId} onChange={handleChange}>
            <option value="">Select Doctor</option>
            {doctors.map(doc => (
              <option key={doc._id} value={doc._id}>Dr. {doc.name} ({doc.specialization})</option>
            ))}
          </select>
          {errors.doctorId && <div className="form-error">{errors.doctorId}</div>}
        </div>
        <div className="form-group">
          <label>Patient Name *</label>
          <input ref={nameRef} name="patientName" className={`form-control ${errors.patientName ? 'is-invalid' : ''}`} placeholder="Full name" value={form.patientName} onChange={handleChange} />
          {errors.patientName && <div className="form-error">{errors.patientName}</div>}
        </div>
        <div className="form-group">
          <label>Email Address</label>
          <input name="email" type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} placeholder="patient@example.com" value={form.email} onChange={handleChange} />
          {errors.email && <div className="form-error">{errors.email}</div>}
        </div>
        <div className="form-group">
          <label>Phone *</label>
          <input name="phone" className={`form-control ${errors.phone ? 'is-invalid' : ''}`} type="tel" placeholder="9876543210" value={form.phone} onChange={handleChange} />
          {errors.phone && <div className="form-error">{errors.phone}</div>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Age *</label>
            <input name="age" className={`form-control ${errors.age ? 'is-invalid' : ''}`} type="number" min="0" max="150" placeholder="25" value={form.age} onChange={handleChange} />
            {errors.age && <div className="form-error">{errors.age}</div>}
          </div>
          <div className="form-group">
            <label>Sex *</label>
            <select name="sex" className={`form-control ${errors.sex ? 'is-invalid' : ''}`} value={form.sex} onChange={handleChange}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
            {errors.sex && <div className="form-error">{errors.sex}</div>}
          </div>
        </div>
        <div className="form-group">
          <label>Marital Status <span className="text-muted">(opt)</span></label>
          <select name="maritalStatus" className={`form-control ${errors.maritalStatus ? 'is-invalid' : ''}`} value={form.maritalStatus} onChange={handleChange}>
            <option value="">Select</option>
            <option>Single</option>
            <option>Married</option>
            <option>Divorced</option>
            <option>Widowed</option>
          </select>
          {errors.maritalStatus && <div className="form-error">{errors.maritalStatus}</div>}
        </div>
        <div className="form-group">
          <label>Visit Purpose <span className="text-muted">(opt)</span></label>
          <select name="visitPurpose" className={`form-control ${errors.visitPurpose ? 'is-invalid' : ''}`} value={form.visitPurpose} onChange={handleChange}>
            <option value="">Select purpose</option>
            {PURPOSES.map((p) => <option key={p}>{p}</option>)}
          </select>
          {errors.visitPurpose && <div className="form-error">{errors.visitPurpose}</div>}
        </div>
        {form.visitPurpose === 'Other' && (
          <div className="form-group animate-slide-up">
            <label>Specify Visit Purpose *</label>
            <input 
              name="customPurpose" 
              className={`form-control ${errors.customPurpose ? 'is-invalid' : ''}`} 
              placeholder="Enter purpose..." 
              value={customPurpose} 
              onChange={(e) => {
                setCustomPurpose(e.target.value)
                if (errors.customPurpose) setErrors(prev => ({ ...prev, customPurpose: null }))
              }} 
            />
            {errors.customPurpose && <div className="form-error">{errors.customPurpose}</div>}
          </div>
        )}
        <div className="form-group">
          <label>Notes for Doctor <span className="text-muted">(optional)</span></label>
          <input name="reason" className="form-control" placeholder="Symptoms, medical history, etc..." value={form.reason} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Estimated Time (mins)</label>
          <input name="estimatedTimeMins" className="form-control" type="number" min="0" value={form.estimatedTimeMins} onChange={handleChange} />
        </div>
        <div 
          className={`form-group ${form.isPriority ? 'emergency-toggle-active' : ''}`} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            marginTop: '1rem', 
            marginBottom: '1.5rem', 
            background: form.isPriority ? 'hsla(350, 70%, 55%, 0.1)' : 'hsla(350, 70%, 55%, 0.03)', 
            padding: '1rem', 
            borderRadius: '10px', 
            border: `1.5px solid ${form.isPriority ? 'var(--danger)' : 'hsla(350, 70%, 55%, 0.2)'}`,
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => {
            setForm(prev => ({ ...prev, isPriority: !prev.isPriority }));
            if (errors.isPriority) setErrors(prev => ({ ...prev, isPriority: null }));
          }}
        >
          <input 
            type="checkbox" 
            name="isPriority" 
            id="isPriority"
            checked={form.isPriority} 
            onChange={handleChange} 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer', accentColor: 'var(--danger)', flexShrink: 0 }}
          />
          <div>
            <label htmlFor="isPriority" style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--danger)', cursor: 'pointer', display: 'block' }}>
              🚨 Mark as Emergency / Priority Case
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', opacity: 0.8, marginTop: '2px', display: 'block' }}>
              Patient will be moved to the front of the queue immediately.
            </span>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
          {loading ? 'Generating...' : '➕ Generate Token'}
        </button>
      </form>

      <style>{`
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .form-error {
          color: var(--danger);
          font-size: 0.75rem;
          margin-top: 0.375rem;
          font-weight: 500;
          animation: slide-up 0.2s ease-out;
        }
        .form-control.is-invalid {
          border-color: var(--danger);
          background: hsla(350, 70%, 55%, 0.05);
        }
        .form-control.is-invalid:focus {
          box-shadow: 0 0 0 3px hsla(350, 70%, 55%, 0.2);
        }
      `}</style>
    </div>
  )
}
