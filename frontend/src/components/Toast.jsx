export default function Toast({ toasts }) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type || 'success'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
