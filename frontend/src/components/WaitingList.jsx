import PatientCard from './PatientCard'

export default function WaitingList({ waiting, onPatientClick }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">📋 Waiting List ({waiting.length})</span>
      </div>

      {waiting.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>No patients waiting</p>
          <p className="text-xs text-muted">Add a patient to get started</p>
        </div>
      ) : (
        <div className="waiting-list-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
          {waiting.map((t, i) => (
            <div key={t._id} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <PatientCard 
                token={t} 
                isServing={false} 
                onClick={onPatientClick}
                compact={true}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
