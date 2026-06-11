export default function QueueStats({ stats }) {
  const items = [
    { label: 'Waiting', value: stats?.waitingCount || 0, color: 'var(--warning)' },
    { label: 'Served', value: stats?.completedCount || 0, color: 'var(--accent)' },
    { label: 'Skipped', value: stats?.skippedCount || 0, color: 'var(--danger)' },
    { label: 'Total', value: stats?.totalToday || 0, color: 'var(--primary)' },
  ]

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">📊 Today's Stats</span>
      </div>
      <div className="stats-grid">
        {items.map((item) => (
          <div key={item.label} className="stat-item">
            <span className="stat-value" style={{ color: item.color }}>{item.value}</span>
            <span className="stat-label">{item.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.75rem;
          background: var(--surface);
          border-radius: var(--radius-sm);
        }
        .stat-value { font-size: 1.75rem; font-weight: 900; line-height: 1; }
        .stat-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-top: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
      `}</style>
    </div>
  )
}
