import React from 'react'

export default function BrandLogo({ subtitle, className = '' }) {
  return (
    <div className={`qc-brand-logo ${className}`}>
      <div className="qc-brand-icon">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="url(#brandGrad)" opacity="0.15"/>
          <path d="M13 11c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v6a5 5 0 0 1-5 5v0a5 5 0 0 1-5-5v-1" stroke="url(#iconStroke)" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <path d="M9 17a5 5 0 0 0 10 0" stroke="url(#iconStroke)" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <path d="M14 22v4a7 7 0 0 0 14 0v-2" stroke="url(#iconStroke)" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <circle cx="28" cy="24" r="3" stroke="url(#iconStroke)" strokeWidth="2" fill="none"/>
          <defs>
            <linearGradient id="brandGrad" x1="0" y1="0" x2="40" y2="40">
              <stop offset="0%" stopColor="#60a5fa"/>
              <stop offset="100%" stopColor="#34d399"/>
            </linearGradient>
            <linearGradient id="iconStroke" x1="8" y1="9" x2="31" y2="31" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#93c5fd"/>
              <stop offset="100%" stopColor="#6ee7b7"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="qc-brand-text">
        <h1 className="qc-brand-name">QueueCure</h1>
        {subtitle && <p className="qc-brand-sub">{subtitle}</p>}
      </div>
    </div>
  )
}
