import { useState, useEffect } from 'react'

export default function NowServing({ serving, onEstimateChange, onPatientClick }) {
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [serving?.tokenNumber])

  return (
    <div className="card now-serving-card">
      <div className="card-header">
        <span className="card-title">🔔 Now Serving</span>
      </div>

      {serving ? (
        <div className={`now-serving-content animate-flip ${serving.isPriority ? 'priority-serving' : ''}`} key={animKey}>
          <div className={`now-serving-token ${serving.isPriority ? 'priority-token' : ''}`}>
            <span className="token-label">TOKEN</span>
            <span className="token-number">#{serving.tokenNumber}</span>
          </div>
          <div className="now-serving-details">
            <h3 
              className="clickable-name" 
              onClick={() => onPatientClick && onPatientClick(serving)}
              title="Click for details"
            >
              {serving.patientName}
            </h3>
            <p className="text-sm text-muted">{serving.visitPurpose}</p>
            <div className="now-serving-estimate">
              <span className="text-sm">⏱️ Est:</span>
              <span className="estimate-value">{serving.estimatedTimeMins} min</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>No patient being served</p>
        </div>
      )}

      <style>{`
        .now-serving-card { overflow: hidden; }
        .now-serving-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 1.25rem;
          padding: 1.5rem;
          background: var(--primary-light);
          border-radius: var(--radius-sm);
          margin-bottom: 1rem;
        }
        .now-serving-token {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.75rem 1.25rem;
          background: var(--primary);
          border-radius: var(--radius-md);
          color: white;
          min-width: 100px;
        }
        .token-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.8; }
        .token-number { font-size: 2.25rem; font-weight: 900; line-height: 1; }
        .now-serving-details { flex: 1; min-width: 150px; }
        .now-serving-estimate {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }
        .estimate-value { font-weight: 700; font-size: 1rem; color: var(--primary); min-width: 55px; text-align: center; }
        .estimate-value { font-weight: 700; font-size: 1rem; color: var(--primary); min-width: 55px; text-align: center; }
        .clickable-name {
          cursor: pointer;
          color: var(--primary);
          transition: color var(--transition);
        }
        .clickable-name:hover {
          color: var(--primary-dark);
          text-decoration: underline;
        }
        .priority-serving { background: hsla(350, 70%, 55%, 0.1) !important; }
        .priority-token { background: var(--danger) !important; }
        .priority-serving .estimate-value { color: var(--danger) !important; }
        .priority-serving .clickable-name { color: var(--danger) !important; }
        .priority-serving .clickable-name:hover { color: #b91c1c !important; }
      `}</style>
    </div>
  )
}
