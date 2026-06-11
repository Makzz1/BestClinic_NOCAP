export default function PatientCard({ token, isServing, onComplete, onSkip, onCallNext, onCancel, onEstimateChange, onClick, compact = false }) {
  const formatTime = (mins) => {
    if (mins === undefined || mins === null) return '';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs} hr ${remainingMins} mins` : `${hrs} hr`;
  };

  return (
    <div
      className="card"
      style={{
        borderLeft: isServing ? '4px solid var(--success)' : token.isPriority ? '4px solid white' : '4px solid hsl(210, 80%, 75%)',
        border: token.isPriority && !isServing ? '2px solid var(--danger)' : 'none',
        background: token.isPriority && !isServing ? 'var(--danger)' : 'var(--primary)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: compact ? '1.5rem 1.5rem' : '4.5rem 3rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        margin: 0,
        width: '100%',
        borderRadius: compact ? '24px' : '56px'
      }}
      onClick={() => onClick && onClick(token)}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{
          width: compact ? '40px' : '50px', 
          height: compact ? '40px' : '50px',
          borderRadius: compact ? '20px' : '25px',
          background: isServing ? 'var(--success)' : token.isPriority ? 'white' : 'hsla(0, 0%, 100%, 0.2)',
          color: token.isPriority && !isServing ? 'var(--danger)' : 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', fontSize: compact ? '1.1rem' : '1.25rem'
        }}>
          #{token.tokenNumber}
        </div>
        <div>
          <div style={{ 
            fontSize: compact ? '1rem' : '1.15rem', 
            fontWeight: '600', 
            color: isServing ? 'var(--success)' : 'white', 
            display: 'flex', alignItems: 'center', gap: '0.5rem' 
          }}>
            {token.patientName}
            {isServing && <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }} className="badge badge-serving">Now Serving</span>}
            {token.isPriority && !isServing && <span className="badge" style={{ background: 'white', color: 'var(--danger)', border: '1px solid white' }}>🚨 PRIORITY</span>}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'hsla(0, 0%, 100%, 0.7)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{token.visitPurpose}</span>
            {!isServing && token.estimatedWaitMins !== undefined && <span>• ~{formatTime(token.estimatedWaitMins)} wait ({formatTime(token.estimatedTimeMins)} consult)</span>}
            {isServing && token.estimatedTimeMins !== undefined && <span>• {formatTime(token.estimatedTimeMins)} consult</span>}
            
            {onEstimateChange && (
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.75rem' }}>
                <button 
                  style={{ 
                    background: 'hsla(0, 0%, 100%, 0.2)', 
                    border: '1px solid hsla(0, 0%, 100%, 0.6)', 
                    color: 'white', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    padding: '0.15rem 0.5rem', 
                    fontSize: '0.8rem', 
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.35)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.2)'}
                  onClick={(e) => { e.stopPropagation(); onEstimateChange(token._id, -5); }}
                  title="Decrease time by 5 mins"
                >-5m</button>
                <button 
                  style={{ 
                    background: 'hsla(0, 0%, 100%, 0.2)', 
                    border: '1px solid hsla(0, 0%, 100%, 0.6)', 
                    color: 'white', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    padding: '0.15rem 0.5rem', 
                    fontSize: '0.8rem', 
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.35)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.2)'}
                  onClick={(e) => { e.stopPropagation(); onEstimateChange(token._id, 5); }}
                  title="Increase time by 5 mins"
                >+5m</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {isServing ? (
          <>
            {onComplete && (
              <button className="btn btn-primary" onClick={onComplete} style={{ background: 'var(--success)', borderColor: 'var(--success)', color: 'white' }}>
                ✔ Complete
              </button>
            )}
            {onSkip && (
              <button className="btn btn-outline" onClick={onSkip} style={{ color: 'var(--danger)', borderColor: 'var(--danger)', background: 'white' }}>
                ⏭ Skip
              </button>
            )}
          </>
        ) : (
          <>
            {onCallNext && (
              <button className="btn btn-primary" onClick={onCallNext} style={{ background: 'white', color: token.isPriority ? 'var(--danger)' : 'var(--primary)', borderColor: 'white' }}>
                {token.isPriority ? '🚨 Call In' : 'Call Next'}
              </button>
            )}
            {onCancel && (
              <button className="btn btn-outline" onClick={onCancel} style={{ color: 'white', borderColor: 'hsla(0, 0%, 100%, 0.3)', padding: '0.5rem' }} title="Remove from Queue">
                🗑
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
