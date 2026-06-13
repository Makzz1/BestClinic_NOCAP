import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePopup } from '../context/PopupContext';
import '../css/index.css';

export default function PatientDetailsModal({ patient, onClose, hideContactInfo, authToken, onUpdated }) {
  const { showAlert } = usePopup();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (patient) {
      setEditForm({
        patientName: patient.patientName || '',
        age: patient.age || '',
        sex: patient.sex || '',
        phone: patient.phone || '',
        email: patient.email || '',
        maritalStatus: patient.maritalStatus || '',
        visitPurpose: patient.visitPurpose || '',
        reason: patient.reason || '',
      });
      setIsEditing(false);

      if (patient.phone) {
        setHistoryLoading(true);
        fetch(`/api/patients/search?phone=${patient.phone}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
        .then(res => res.json())
        .then(data => {
          if (data.history) {
            setHistory(data.history.filter(t => t._id !== patient._id));
          }
        })
        .catch(err => console.error("Failed to fetch history", err))
        .finally(() => setHistoryLoading(false));
      }
    }
  }, [patient, authToken]);

  if (!patient) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = { ...editForm };
      if (payload.age) payload.age = Number(payload.age);
      else delete payload.age;

      const res = await fetch(`/api/patients/${patient._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedPatient = await res.json();
        setIsEditing(false);
        if (onUpdated) onUpdated(updatedPatient);
      } else {
        const error = await res.json();
        showAlert('Failed to update: ' + error.message);
      }
    } catch (err) {
      console.error(err);
      showAlert('Error updating patient');
    } finally {
      setIsSaving(false);
    }
  };
  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()} style={{ width: '90vw', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3>Patient Details</h3>
            {!hideContactInfo && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)} 
                className="btn btn-ghost btn-sm" 
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                ✏️ Edit
              </button>
            )}
          </div>
          <button className="btn btn-ghost" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1rem 2rem' }}>
          {isEditing ? (
            <div className="edit-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Name</label>
                <input className="form-control" value={editForm.patientName} onChange={e => setEditForm({...editForm, patientName: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Age</label>
                  <input type="number" className="form-control" value={editForm.age} onChange={e => setEditForm({...editForm, age: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Sex</label>
                  <select className="form-control" value={editForm.sex} onChange={e => setEditForm({...editForm, sex: e.target.value})}>
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Phone</label>
                  <input className="form-control" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Marital Status</label>
                  <select className="form-control" value={editForm.maritalStatus} onChange={e => setEditForm({...editForm, maritalStatus: e.target.value})}>
                    <option value="">Select</option>
                    <option>Single</option>
                    <option>Married</option>
                    <option>Divorced</option>
                    <option>Widowed</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Visit Purpose</label>
                <input className="form-control" value={editForm.visitPurpose} onChange={e => setEditForm({...editForm, visitPurpose: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-control" value={editForm.reason} onChange={e => setEditForm({...editForm, reason: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {patient.tokenNumber && (
                  <div className="detail-group">
                    <span className="detail-label">Token Number</span>
                    <span className="detail-value token-highlight">#{patient.tokenNumber}</span>
                  </div>
                )}
                <div className="detail-group">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{patient.patientName}</span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">Age</span>
                  <span className="detail-value">{patient.age}</span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">Sex</span>
                  <span className="detail-value">{patient.sex}</span>
                </div>
                {!hideContactInfo && (
                  <div className="detail-group">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{patient.phone}</span>
                  </div>
                )}
                {!hideContactInfo && patient.email && (
                  <div className="detail-group">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{patient.email}</span>
                  </div>
                )}
                {patient.maritalStatus && (
                  <div className="detail-group">
                    <span className="detail-label">Marital Status</span>
                    <span className="detail-value">{patient.maritalStatus}</span>
                  </div>
                )}
                <div className="detail-group">
                  <span className="detail-label">Visit Purpose</span>
                  <span className="detail-value">{patient.visitPurpose}</span>
                </div>
              </div>
              
              {patient.reason && (
                <div className="detail-group note-box" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">Notes for Doctor</span>
                  <p className="detail-note">{patient.reason}</p>
                </div>
              )}
          
          {!isEditing && (
            historyLoading ? (
              <div style={{ marginTop: '1rem', fontStyle: 'italic', color: '#64748b', fontSize: '0.9rem' }}>Loading past visits...</div>
            ) : history.length > 0 ? (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '1rem', fontWeight: 600 }}>Past Visits</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {history.map(h => (
                    <div key={h._id} style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{new Date(h.date).toLocaleDateString()}</span>
                        <span>Dr. {h.doctorId?.name || 'Unknown'}</span>
                      </div>
                      <div style={{ color: '#475569', marginBottom: '4px' }}><strong>Purpose:</strong> {h.visitPurpose || 'N/A'}</div>
                      {h.prescription && <div style={{ color: '#64748b', marginTop: '6px', background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}><strong>Rx:</strong> {h.prescription}</div>}
                      {h.instructions && <div style={{ color: '#64748b', marginTop: '6px', background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}><strong>Notes:</strong> {h.instructions}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#334155', fontSize: '1rem', fontWeight: 600 }}>Past Visits</h4>
                No past visits found.
              </div>
            )
          )}
        </>
      )}
        </div>
      </div>
    </div>,
    document.body
  );
}
