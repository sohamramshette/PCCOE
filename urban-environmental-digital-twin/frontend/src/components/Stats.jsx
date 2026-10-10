import React from 'react';

export default function Stats() {
  return (
    <>
      <dl className="stat stat--a mask" style={{ '--d': '700ms', '--pd': 12 }}>
        <span className="mark" aria-hidden="true">
          <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <circle cx="15" cy="15" r="10.5" strokeDasharray="0.6 3.6" />
            <circle cx="15" cy="15" r="5.6" strokeDasharray="0.6 3.2" />
            <circle cx="15" cy="15" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <div>
          <dt>Canopy restored</dt>
          <dd>282 ha</dd>
        </div>
      </dl>

      <dl className="stat stat--b mask" style={{ '--d': '770ms', '--pd': 13 }}>
        <span className="mark" aria-hidden="true">
          <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <g id="rays">
              <path d="M15 3.5v5" />
              <path d="M15 21.5v5" />
              <path d="M3.5 15h5" />
              <path d="M21.5 15h5" />
              <path d="M6.9 6.9l3.5 3.5" />
              <path d="M19.6 19.6l3.5 3.5" />
              <path d="M23.1 6.9l-3.5 3.5" />
              <path d="M10.4 19.6l-3.5 3.5" />
            </g>
            <circle cx="15" cy="15" r="3.6" />
          </svg>
        </span>
        <div>
          <dt>Native species</dt>
          <dd>43 mapped</dd>
        </div>
      </dl>
    </>
  );
}
