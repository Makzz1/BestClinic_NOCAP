import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import '../css/publicJoin.css';

const PublicJoin = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [formData, setFormData] = useState({
    patientName: '',
    phone: '',
    email: '',
    age: '',
    sex: 'Male',
    maritalStatus: 'Prefer not to say',
    visitPurposeCategory: 'Checkup',
    visitPurposeOther: '',
    reason: '',
    doctorId: doctorId || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  
  // Lookup states
  const [lookupPhone, setLookupPhone] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [lookupSuccess, setLookupSuccess] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch('/api/doctors/public');
        if (!res.ok) throw new Error('Failed to fetch doctors');
        const data = await res.json();
        setDoctors(data);
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    };
    fetchDoctors();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation error when user types
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookupPhone.trim() || lookupPhone.length < 10) {
      setLookupError('Please enter a valid phone number to search.');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    setLookupSuccess(false);

    try {
      const res = await fetch(`/api/patients/public-lookup/${lookupPhone.trim()}`);
      if (!res.ok) {
        throw new Error('Patient not found.');
      }
      const data = await res.json();
      
      setFormData(prev => ({
        ...prev,
        patientName: data.patientName || '',
        phone: data.phone || lookupPhone,
        email: data.email || '',
        age: data.age || '',
        sex: data.sex || 'Male',
        maritalStatus: data.maritalStatus || 'Prefer not to say',
      }));
      setLookupSuccess(true);
      setTimeout(() => setLookupSuccess(false), 3000);
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setValidationErrors({});

    const newErrors = {};
    if (!formData.doctorId) newErrors.doctorId = 'Please select a doctor.';
    if (!formData.patientName.trim()) newErrors.patientName = 'Full name is required.';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (!/^\d{10,15}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number (10+ digits).';
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.age || formData.age < 0 || formData.age > 120) newErrors.age = 'Please enter a valid age.';
    if (!formData.sex) newErrors.sex = 'Please select a sex.';
    if (formData.visitPurposeCategory === 'Other' && !formData.visitPurposeOther.trim()) {
      newErrors.visitPurposeOther = 'Please specify your visit purpose.';
    }

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    const submitData = { ...formData };
    submitData.visitPurpose = submitData.visitPurposeCategory === 'Other' 
      ? submitData.visitPurposeOther 
      : submitData.visitPurposeCategory;

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to submit request');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="public-join-container">
        <div className="success-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ marginBottom: '1rem' }}>Request Sent!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>The receptionist has received your details and will review your request shortly.</p>
          <p style={{ color: 'var(--text-secondary)' }}>Please wait for your name to be called or appear on the screen.</p>
        </div>
      </div>
    );
  }

  const renderError = (field) => {
    return validationErrors[field] ? (
      <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.35rem', fontWeight: '500' }}>
        {validationErrors[field]}
      </div>
    ) : null;
  };

  const getInputStyle = (field) => ({
    borderColor: validationErrors[field] ? 'var(--danger)' : undefined,
    backgroundColor: validationErrors[field] ? '#fff5f5' : undefined
  });

  return (
    <div className="public-join-container">
      <div style={{ marginBottom: '2rem', textAlign: 'center', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <BrandLogo subtitle="Patient Portal" />
      </div>

      <div className="public-join-card">
        <h2>Join Queue</h2>
        <p className="subtitle">Enter your details to join the doctor's queue</p>
        
        {/* Already Registered Section */}
        <div className="lookup-section">
          <h3>Already registered?</h3>
          <p>Enter your phone number to auto-fill your details.</p>
          <div className="lookup-form">
            <input 
              type="tel" 
              placeholder="Enter registered phone number..." 
              value={lookupPhone}
              onChange={(e) => setLookupPhone(e.target.value)}
              className="form-control"
            />
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleLookup}
              disabled={isLookingUp}
            >
              {isLookingUp ? 'Searching...' : 'Search'}
            </button>
          </div>
          {lookupError && <div className="error-message" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{lookupError}</div>}
          {lookupSuccess && <div className="success-message" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--success)' }}>Details loaded successfully!</div>}
        </div>

        <hr className="divider" />

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Doctor *</label>
            <select
              name="doctorId"
              value={formData.doctorId}
              onChange={handleChange}
              style={getInputStyle('doctorId')}
            >
              <option value="" disabled>Select a Doctor</option>
              {doctors.map(doc => (
                <option key={doc._id} value={doc._id}>
                  Dr. {doc.name} - {doc.specialization}
                </option>
              ))}
            </select>
            {renderError('doctorId')}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="patientName"
                value={formData.patientName}
                onChange={handleChange}
                style={getInputStyle('patientName')}
              />
              {renderError('patientName')}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                style={getInputStyle('phone')}
              />
              {renderError('phone')}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                style={getInputStyle('email')}
              />
              {renderError('email')}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Age *</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                min="0"
                max="120"
                style={getInputStyle('age')}
              />
              {renderError('age')}
            </div>
            <div className="form-group">
              <label>Sex *</label>
              <select 
                name="sex" 
                value={formData.sex} 
                onChange={handleChange}
                style={getInputStyle('sex')}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {renderError('sex')}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Marital Status</label>
              <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
            <div className="form-group">
              <label>Visit Purpose</label>
              <select name="visitPurposeCategory" value={formData.visitPurposeCategory} onChange={handleChange}>
                <option value="Checkup">Checkup</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Consultation">Consultation</option>
                <option value="Prescription">Prescription</option>
                <option value="Other">Other</option>
              </select>
              {formData.visitPurposeCategory === 'Other' && (
                <div>
                  <input
                    type="text"
                    name="visitPurposeOther"
                    value={formData.visitPurposeOther}
                    onChange={handleChange}
                    placeholder="Please specify"
                    style={{ marginTop: '0.5rem', ...getInputStyle('visitPurposeOther') }}
                  />
                  {renderError('visitPurposeOther')}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Reason for Visit (Symptoms)</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-lg full-width"
            disabled={isSubmitting}
            style={{ 
              marginTop: '1.5rem',
              padding: '1rem',
              fontSize: '1.1rem',
              fontWeight: '700',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              gap: '0.5rem'
            }}
          >
            {isSubmitting ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'white' }}></div>
                Sending Request...
              </>
            ) : (
              '✨ Join Queue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PublicJoin;
