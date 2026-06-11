import React from 'react';
import '../css/index.css';

export default function PatientDetailsModal({ patient, onClose, hideContactInfo }) {
  if (!patient) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Patient Details</h3>
          <button className="btn btn-ghost" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body">
          <div className="detail-group">
            <span className="detail-label">Token Number</span>
            <span className="detail-value token-highlight">#{patient.tokenNumber}</span>
          </div>
          <div className="detail-group">
            <span className="detail-label">Name</span>
            <span className="detail-value">{patient.patientName}</span>
          </div>
          <div className="detail-row">
            <div className="detail-group">
              <span className="detail-label">Age</span>
              <span className="detail-value">{patient.age}</span>
            </div>
            <div className="detail-group">
              <span className="detail-label">Sex</span>
              <span className="detail-value">{patient.sex}</span>
            </div>
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
          <div className="detail-group">
            <span className="detail-label">Visit Purpose</span>
            <span className="detail-value">{patient.visitPurpose}</span>
          </div>
          {patient.reason && (
            <div className="detail-group note-box">
              <span className="detail-label">Notes for Doctor</span>
              <p className="detail-note">{patient.reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
