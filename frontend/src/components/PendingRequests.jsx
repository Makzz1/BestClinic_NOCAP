import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSocket } from '../context/SocketContext';
import { usePopup } from '../context/PopupContext';
import '../css/pendingRequests.css';

const PendingRequests = ({ authToken, onApproved }) => {
  const [requests, setRequests] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { socket } = useSocket();
  const { showAlert } = usePopup();

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/requests', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests', error);
    }
  };

  useEffect(() => {
    fetchRequests();

    if (socket) {
      socket.on('request:new', fetchRequests);
      socket.on('request:update', fetchRequests);

      return () => {
        socket.off('request:new', fetchRequests);
        socket.off('request:update', fetchRequests);
      };
    }
  }, [socket, authToken]);

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`/api/requests/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to approve');
      }
      const data = await res.json();
      setRequests(prev => prev.filter(r => r._id !== id));
      if (onApproved) {
        onApproved(data);
      }
    } catch (error) {
      console.error('Approval failed', error);
      showAlert(error.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await fetch(`/api/requests/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to reject');
      setRequests(prev => prev.filter(r => r._id !== id));
    } catch (error) {
      console.error('Rejection failed', error);
    }
  };

  return (
    <>
      <button 
        className="btn btn-outline btn-sm" 
        onClick={() => setIsOpen(true)}
        style={{ position: 'relative' }}
      >
        🔔 Patient Requests
        {requests.length > 0 && (
          <span style={{
            position: 'absolute', top: '-5px', right: '-5px', 
            background: 'var(--danger)', color: 'white', 
            borderRadius: '50%', padding: '2px 6px', 
            fontSize: '0.7rem', fontWeight: 'bold'
          }}>
            {requests.length}
          </span>
        )}
      </button>

      {isOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content animate-slide-up pending-requests-modal" onClick={e => e.stopPropagation()} style={{ width: '60vw', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <h3>Patient Requests</h3>
              <button className="btn btn-ghost" onClick={() => setIsOpen(false)} style={{ padding: '0.25rem' }}>✖</button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', padding: '0.5rem 1rem 1rem 1rem', margin: '0 1rem 1rem 1rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
              {requests.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🔔</div>
                  <p>No pending requests at the moment.</p>
                </div>
              ) : (
                <div className="request-list">
                  {requests.map(req => (
                    <div key={req._id} className="request-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem', padding: '1.5rem' }}>
                      <div className="request-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text)' }}>{req.patientName}</h4>
                          <span className="text-muted">Requested Dr. {req.doctorId?.name}</span>
                        </div>
                        <div className="request-actions">
                          <button className="btn btn-success" onClick={() => handleApprove(req._id)}>✓ Approve</button>
                          <button className="btn btn-danger" style={{ marginLeft: '0.5rem' }} onClick={() => handleReject(req._id)}>✕ Decline</button>
                        </div>
                      </div>
                      
                      <div className="request-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="detail-group">
                          <span className="detail-label">Age & Sex</span>
                          <span className="detail-value">{req.age} years, {req.sex}</span>
                        </div>
                        <div className="detail-group">
                          <span className="detail-label">Phone</span>
                          <span className="detail-value">{req.phone || 'N/A'}</span>
                        </div>
                        <div className="detail-group">
                          <span className="detail-label">Email</span>
                          <span className="detail-value">{req.email || 'N/A'}</span>
                        </div>
                        <div className="detail-group">
                          <span className="detail-label">Marital Status</span>
                          <span className="detail-value">{req.maritalStatus || 'N/A'}</span>
                        </div>
                        <div className="detail-group">
                          <span className="detail-label">Visit Purpose</span>
                          <span className="detail-value">{req.visitPurpose || 'N/A'}</span>
                        </div>
                        <div className="detail-group" style={{ gridColumn: '1 / -1' }}>
                          <span className="detail-label">Reason / Symptoms</span>
                          <div className="note-box" style={{ marginTop: '0.5rem', padding: '0.75rem' }}>
                            <span className="detail-note">{req.reason || 'No symptoms provided.'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default PendingRequests;
