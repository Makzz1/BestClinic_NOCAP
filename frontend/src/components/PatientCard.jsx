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
        borderLeft: isServing ? (token.isPriority ? '4px solid white' : '4px solid var(--success)') : token.isPriority ? '4px solid white' : '4px solid hsl(210, 80%, 75%)',
        border: token.isPriority ? '2px solid var(--danger)' : 'none',
        background: token.isPriority ? 'var(--danger)' : 'var(--primary)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isServing ? '3rem 2rem' : '1.5rem 1.5rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: isServing ? '0 10px 25px rgba(0,0,0,0.1)' : '0 4px 6px rgba(0,0,0,0.05)',
        margin: '0 auto',
        width: isServing ? '85%' : '100%',
        minHeight: isServing ? '250px' : 'auto',
        borderRadius: isServing ? '32px' : '20px'
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
        <div style={{
          width: isServing ? '80px' : '48px', 
          height: isServing ? '80px' : '48px',
          borderRadius: '50%',
          background: token.isPriority ? 'white' : isServing ? 'var(--success)' : 'hsla(0, 0%, 100%, 0.2)',
          color: token.isPriority ? 'var(--danger)' : 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '800', fontSize: isServing ? '1.5rem' : '0.9rem',
          flexShrink: 0
        }}>
          #{token.tokenNumber}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontSize: isServing ? '1.5rem' : '1.05rem', 
            fontWeight: '700', 
            color: isServing ? 'var(--success)' : 'white', 
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{token.patientName}</span>
            {isServing && <span style={{ fontSize: '0.75rem', background: token.isPriority ? 'white' : 'var(--success)', color: token.isPriority ? 'var(--danger)' : 'white', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }} className="badge">Now Serving</span>}
            {token.isPriority && <span className="badge" style={{ background: 'white', color: 'var(--danger)', border: 'none', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>🚨 PRIORITY</span>}
          </div>
          <div style={{ fontSize: isServing ? '1rem' : '0.85rem', color: 'hsla(0, 0%, 100%, 0.85)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>{token.visitPurpose}</span>
            {!isServing && token.estimatedWaitMins !== undefined && <span style={{ opacity: 0.9 }}>~{formatTime(token.estimatedWaitMins)} wait ({formatTime(token.estimatedTimeMins)} consult)</span>}
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

      <div style={{ display: 'flex', gap: '0.75rem', flexDirection: isServing ? 'column' : 'row', minWidth: isServing ? '140px' : 'auto' }}>
        {isServing ? (
          <>
            {onComplete && (
              <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); onComplete(); }} style={{ background: 'var(--success)', borderColor: 'var(--success)', color: 'white' }}>
                ✔ Complete
              </button>
            )}
            {onSkip && (
              <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); onSkip(); }} style={{ color: 'var(--danger)', borderColor: 'var(--danger)', background: 'white' }}>
                ⏭ Skip
              </button>
            )}
          </>
        ) : (
          <>
            {onCallNext && (
              <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); onCallNext(); }} style={{ background: 'white', color: token.isPriority ? 'var(--danger)' : 'var(--primary)', borderColor: 'white' }}>
                {token.isPriority ? '🚨 Call In' : 'Call Next'}
              </button>
            )}
            {onCancel && (
              <button 
                className="btn" 
                onClick={(e) => { e.stopPropagation(); onCancel(); }} 
                style={{ 
                  color: 'white', 
                  backgroundColor: 'transparent',
                  border: '1px solid hsla(0, 0%, 100%, 0.3)', 
                  padding: '0.5rem',
                  transition: 'border-color 0.2s, background-color 0.2s'
                }} 
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.9)';
                  e.currentTarget.style.backgroundColor = 'hsla(0, 0%, 100%, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.3)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Remove from Queue"
              >
                🗑
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
