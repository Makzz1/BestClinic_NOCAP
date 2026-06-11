import { useRef } from 'react'

export default function DoctorTabs({ doctors, selected, onSelect }) {
  const scrollRef = useRef(null)

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' })
    }
  }

  return (
    <div className="doctor-tabs-wrapper">
      <button className="scroll-btn scroll-btn-left" onClick={() => scroll(-1)} aria-label="Scroll left">‹</button>
      <div className="doctor-tabs" ref={scrollRef}>
        {doctors.map((doc) => (
          <button
            key={doc._id}
            className={`doctor-tab ${selected?._id === doc._id ? 'active' : ''}`}
            onClick={() => onSelect(doc)}
          >
            <span className="doctor-tab-name">{doc.name}</span>
            <span className="doctor-tab-spec">{doc.specialization}</span>
            <span className="doctor-tab-room">Room {doc.roomNumber}</span>
          </button>
        ))}
      </div>
      <button className="scroll-btn scroll-btn-right" onClick={() => scroll(1)} aria-label="Scroll right">›</button>

      <style>{`
        .doctor-tabs-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--card);
          border-bottom: 1px solid var(--border);
        }
        .doctor-tabs {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          flex: 1;
          scroll-snap-type: x mandatory;
        }
        .doctor-tabs::-webkit-scrollbar { display: none; }
        .doctor-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.15rem;
          padding: 0.75rem 1.5rem;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition);
          min-width: 140px;
          scroll-snap-align: center;
          flex-shrink: 0;
          font-family: var(--font);
        }
        .doctor-tab:hover {
          border-color: var(--primary);
          background: var(--primary-light);
        }
        .doctor-tab.active {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
          box-shadow: var(--shadow-md);
        }
        .doctor-tab-name { font-weight: 700; font-size: 0.9rem; }
        .doctor-tab-spec { font-size: 0.75rem; opacity: 0.8; }
        .doctor-tab-room { font-size: 0.7rem; opacity: 0.65; }
        .doctor-tab.active .doctor-tab-spec,
        .doctor-tab.active .doctor-tab-room { color: hsla(0, 0%, 100%, 0.85); }
        .scroll-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1.5px solid var(--border);
          background: var(--card);
          font-size: 1.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all var(--transition);
          color: var(--text-secondary);
          font-family: var(--font);
        }
        .scroll-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
      `}</style>
    </div>
  )
}
