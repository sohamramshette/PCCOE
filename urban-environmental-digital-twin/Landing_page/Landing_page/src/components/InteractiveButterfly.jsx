import React, { useState, useEffect, useRef } from 'react';

export default function InteractiveButterfly({ onTriggerFlight, isExternalFlying }) {
  const [internalFlying, setInternalFlying] = useState(false);
  const [flightPhase, setFlightPhase] = useState('perched'); // 'perched' | 'taking-off' | 'cruising' | 'returning'
  const [particles, setParticles] = useState([]);
  const timerRef = useRef(null);
  const particleTimerRef = useRef(null);

  const isFlying = isExternalFlying !== undefined ? isExternalFlying : internalFlying;

  const handleSpook = (e) => {
    if (e) {
      e.stopPropagation();
    }

    if (onTriggerFlight) {
      onTriggerFlight();
    }

    // Trigger local flight cycle
    setInternalFlying(true);
    setFlightPhase('taking-off');

    // Spawn flight pollen burst
    spawnPollenBurst();

    if (timerRef.current) clearTimeout(timerRef.current);

    // Progression of flight
    setTimeout(() => {
      setFlightPhase('cruising');
    }, 1200);

    setTimeout(() => {
      setFlightPhase('returning');
    }, 4500);

    timerRef.current = setTimeout(() => {
      setInternalFlying(false);
      setFlightPhase('perched');
    }, 6500);
  };

  // Pollen particle generator during flight
  const spawnPollenBurst = () => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i + Math.random(),
      x: (Math.random() - 0.5) * 30,
      y: (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() * -50) - 10,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 1.5 + 1.2
    }));
    setParticles((prev) => [...prev.slice(-24), ...newParticles]);
  };

  useEffect(() => {
    if (isFlying) {
      particleTimerRef.current = setInterval(() => {
        setParticles((prev) => [
          ...prev.slice(-20),
          {
            id: Date.now() + Math.random(),
            x: (Math.random() - 0.5) * 20,
            y: (Math.random() - 0.5) * 15,
            vx: (Math.random() - 0.5) * 35,
            vy: Math.random() * 30 + 10,
            size: Math.random() * 3 + 1.5,
            duration: 1.4
          }
        ]);
      }, 250);
    } else {
      if (particleTimerRef.current) clearInterval(particleTimerRef.current);
    }
    return () => {
      if (particleTimerRef.current) clearInterval(particleTimerRef.current);
    };
  }, [isFlying]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (particleTimerRef.current) clearInterval(particleTimerRef.current);
    };
  }, []);

  return (
    <div
      className={`butterfly-container ${isFlying ? 'is-flying' : 'is-perched'} phase-${flightPhase}`}
      onClick={handleSpook}
      title="Tap to make the butterfly fly"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleSpook(e);
        }
      }}
    >
      {/* 3D Butterfly Body and Wings */}
      <div className="butterfly-rig">
        {/* Left Wing Assembly */}
        <div className="wing-group wing-group-left">
          <svg className="wing-svg forewing-left" viewBox="0 0 100 120" fill="none">
            <defs>
              <linearGradient id="wingGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d4e6bc" stopOpacity="0.95" />
                <stop offset="40%" stopColor="#95ab7c" stopOpacity="0.88" />
                <stop offset="75%" stopColor="#63774d" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#313e28" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="veinGoldLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f5e6a8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8fa07e" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            {/* Wing Membrane */}
            <path
              d="M90 110 C85 80, 50 40, 15 15 C8 10, 0 20, 5 35 C12 60, 35 90, 85 115 Z"
              fill="url(#wingGradLeft)"
              stroke="#222b1c"
              strokeWidth="2.5"
            />
            {/* Delicate Wing Veins */}
            <path d="M85 105 C60 75, 30 45, 15 15" stroke="url(#veinGoldLeft)" strokeWidth="1.6" />
            <path d="M60 85 C40 65, 20 50, 10 38" stroke="url(#veinGoldLeft)" strokeWidth="1.2" />
            <path d="M75 95 C55 80, 35 70, 25 60" stroke="url(#veinGoldLeft)" strokeWidth="1.2" />
            <circle cx="22" cy="30" r="3" fill="#f5e6a8" opacity="0.8" />
            <circle cx="36" cy="48" r="2.5" fill="#f5e6a8" opacity="0.7" />
          </svg>

          <svg className="wing-svg hindwing-left" viewBox="0 0 80 90" fill="none">
            <path
              d="M75 10 C60 30, 40 55, 20 65 C10 70, 15 85, 30 85 C55 82, 70 50, 75 15 Z"
              fill="url(#wingGradLeft)"
              stroke="#222b1c"
              strokeWidth="2"
            />
            <path d="M72 18 C50 45, 35 65, 25 75" stroke="#f5e6a8" strokeWidth="1.2" opacity="0.6" />
            <circle cx="32" cy="74" r="2.5" fill="#e8ba62" opacity="0.9" />
          </svg>
        </div>

        {/* Butterfly Central Body */}
        <div className="butterfly-body">
          {/* Antennae */}
          <div className="antenna antenna-left"></div>
          <div className="antenna antenna-right"></div>

          {/* Thorax and Abdomen */}
          <div className="body-segment head"></div>
          <div className="body-segment thorax"></div>
          <div className="body-segment abdomen"></div>
        </div>

        {/* Right Wing Assembly */}
        <div className="wing-group wing-group-right">
          <svg className="wing-svg forewing-right" viewBox="0 0 100 120" fill="none">
            <defs>
              <linearGradient id="wingGradRight" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d4e6bc" stopOpacity="0.95" />
                <stop offset="40%" stopColor="#95ab7c" stopOpacity="0.88" />
                <stop offset="75%" stopColor="#63774d" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#313e28" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <path
              d="M10 110 C15 80, 50 40, 85 15 C92 10, 100 20, 95 35 C88 60, 65 90, 15 115 Z"
              fill="url(#wingGradRight)"
              stroke="#222b1c"
              strokeWidth="2.5"
            />
            <path d="M15 105 C40 75, 70 45, 85 15" stroke="url(#veinGoldLeft)" strokeWidth="1.6" />
            <path d="M40 85 C60 65, 80 50, 90 38" stroke="url(#veinGoldLeft)" strokeWidth="1.2" />
            <path d="M25 95 C45 80, 65 70, 75 60" stroke="url(#veinGoldLeft)" strokeWidth="1.2" />
            <circle cx="78" cy="30" r="3" fill="#f5e6a8" opacity="0.8" />
            <circle cx="64" cy="48" r="2.5" fill="#f5e6a8" opacity="0.7" />
          </svg>

          <svg className="wing-svg hindwing-right" viewBox="0 0 80 90" fill="none">
            <path
              d="M5 10 C20 30, 40 55, 60 65 C70 70, 65 85, 50 85 C25 82, 10 50, 5 15 Z"
              fill="url(#wingGradRight)"
              stroke="#222b1c"
              strokeWidth="2"
            />
            <path d="M8 18 C30 45, 45 65, 55 75" stroke="#f5e6a8" strokeWidth="1.2" opacity="0.6" />
            <circle cx="48" cy="74" r="2.5" fill="#e8ba62" opacity="0.9" />
          </svg>
        </div>
      </div>

      {/* Floating Pollen Dust Particles when Flying */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="butterfly-pollen-particle"
          style={{
            '--px': `${p.x}px`,
            '--py': `${p.y}px`,
            '--vx': `${p.vx}px`,
            '--vy': `${p.vy}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
