import React, { useEffect, useRef } from 'react';
import Navigation from './components/Navigation';
import SceneCanvas from './components/SceneCanvas';
import LiquidMetalButton from './components/LiquidMetalButton';
import { EthosCard, FieldNoteCard } from './components/Cards';
import Stats from './components/Stats';

export default function App() {
  const sceneRef = useRef(null);
  const heroRef = useRef(null);
  const playWrapRef = useRef(null);

  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Trigger entrance transition
    void document.body.offsetHeight;
    document.body.classList.add('is-ready');

    const introTimer = setTimeout(() => {
      document.body.classList.add('intro-done');
    }, REDUCED ? 0 : 2900);

    // Pointer Parallax
    const PARALLAX_SELECTOR =
      '.dock,.headline,.lede,.pill,.play-wrap,.stat--a,.stat--b,.card--about,.knob-float,.card--stove,.scroll';
    const nodes = document.querySelectorAll(PARALLAX_SELECTOR);
    if (!REDUCED) {
      nodes.forEach((n) => n.classList.add('par'));
    }

    const pointer = { x: 0, y: 0 };
    const smooth = { x: 0, y: 0 };
    let lastX = null;
    let lastY = null;
    let animId = null;

    function onPointerMove(e) {
      if (e.pointerType === 'touch') return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;

      // Play button proximity
      if (playWrapRef.current) {
        const playClip = playWrapRef.current.querySelector('.play-clip');
        if (playClip) {
          const r = playClip.getBoundingClientRect();
          if (r.width) {
            const k = r.width / 396;
            const m = 40;
            const b = {
              x0: r.left + 106 * k - m,
              x1: r.right - 106 * k + m,
              y0: r.top + 131 * k - m,
              y1: r.bottom - 73 * k + m
            };
            const isNear = e.clientX > b.x0 && e.clientX < b.x1 && e.clientY > b.y0 && e.clientY < b.y1;
            playWrapRef.current.classList.toggle('is-near', isNear);
          }
        }
      }
    }

    function onPointerLeave() {
      pointer.x = 0;
      pointer.y = 0;
      if (playWrapRef.current) {
        playWrapRef.current.classList.remove('is-near');
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);

    function loop() {
      if (!REDUCED) {
        smooth.x += (pointer.x - smooth.x) * 0.055;
        smooth.y += (pointer.y - smooth.y) * 0.055;
        const nx = Math.round(smooth.x * 1000) / 1000;
        const ny = Math.round(smooth.y * 1000) / 1000;
        if (nx !== lastX || ny !== lastY) {
          lastX = nx;
          lastY = ny;
          heroEl.style.setProperty('--px', nx);
          heroEl.style.setProperty('--py', ny);
        }
      }
      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    return () => {
      clearTimeout(introTimer);
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  const handlePollenBurst = (x, y) => {
    if (sceneRef.current) {
      sceneRef.current.burstAt(x, y);
    }
  };

  return (
    <main ref={heroRef} className="hero" id="hero">
      <SceneCanvas ref={sceneRef} />

      <Navigation onBurst={handlePollenBurst} />

      <div className="stage" id="stage">
        {/* Guides */}
        <div className="guides fade" style={{ '--d': '900ms' }} aria-hidden="true">
          <i style={{ left: 'calc(405 * var(--u))' }}></i>
          <i style={{ left: 'calc(748 * var(--u))' }}></i>
          <i style={{ left: 'calc(1091 * var(--u))' }}></i>
        </div>

        {/* Ghost Wordmark */}
        <div className="ghost fade" style={{ '--d': '1150ms' }} aria-hidden="true">
          SYLVA
        </div>

        {/* Ethos Card (seated behind canvas with moss drape effect) */}
        <EthosCard />

        {/* Headline */}
        <h1 className="headline" style={{ '--pd': 18, '--pr': 1.2 }}>
          <span>
            <i style={{ '--d': '260ms' }}>Step into</i>
          </span>
          <span>
            <i style={{ '--d': '360ms' }}>the living world</i>
          </span>
        </h1>

        {/* Lede */}
        <p className="lede mask" style={{ '--d': '480ms', '--pd': 14, '--pr': 1 }}>
          We restore wild places through patient design, native planting, and a deeper kind of stewardship.
        </p>

        {/* Explore Button (Liquid metal WebGL2 dispersion) */}
        <div className="pill-clip">
          <div className="pill mask" style={{ '--d': '600ms', '--pd': 15, '--pr': 1.4 }}>
            <LiquidMetalButton
              mode="explore"
              label="Explore the work"
              onClick={() => console.log('Explore clicked')}
            />
          </div>
        </div>

        {/* Play Button */}
        <span ref={playWrapRef} className="play-wrap" style={{ '--pd': 20 }}>
          <span className="play-clip">
            <span className="play-glass mask-circle" style={{ '--d': '900ms' }}>
              <LiquidMetalButton
                mode="play"
                label="Play the film"
                onClick={() => console.log('Play clicked')}
              />
            </span>
          </span>
          <span className="play-ring mask-circle" style={{ '--d': '840ms' }} aria-hidden="true"></span>
        </span>

        {/* Stats */}
        <Stats />

        {/* Field Note Card */}
        <FieldNoteCard />

        {/* Scroll Cue */}
        <a className="scroll mask" style={{ '--d': '1040ms', '--pd': 9 }} href="#discover">
          Discover<span className="track"></span>
        </a>
      </div>
    </main>
  );
}
