import React, { useEffect, useRef, useState } from 'react';

export default function Navigation({ onBurst }) {
  const dockRef = useRef(null);
  const [activeTab, setActiveTab] = useState('Grove');

  useEffect(() => {
    const root = dockRef.current;
    if (!root) return;

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const NARROW = window.matchMedia('(max-width: 900px)');

    function fineHover() {
      return !REDUCED && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    }

    const DOCK = {
      root,
      items: [],
      on: fineHover(),
      live: false,
      key: false,
      dirty: false,
      u: 1
    };

    const SPEC = {
      items: [],
      on: fineHover(),
      dirty: false
    };

    let aimX = 0;
    let aimY = 0;
    let aimSeen = false;
    let aimMoved = false;

    function clamp01(x) {
      return x < 0 ? 0 : x > 1 ? 1 : x;
    }

    function measureDock() {
      if (!DOCK.root) return;
      DOCK.on = fineHover();
      const stageEl = document.getElementById('stage') || document.body;
      DOCK.u = stageEl.getBoundingClientRect().width / (NARROW.matches ? 760 : 1600);

      DOCK.items.forEach((st) => {
        st.el.style.width = '';
        st.el.style.height = '';
        st.el.style.transform = '';
        st.el.dataset.near = 'false';
        st.v = 0;
        st.vel = 0;
        st.target = 0;
      });

      DOCK.items.forEach((st) => {
        const r = st.el.getBoundingClientRect();
        st.w = r.width;
        st.h = r.height;
      });

      DOCK.live = false;
      DOCK.dirty = true;
      aimMoved = aimSeen;
    }

    function dockRest() {
      DOCK.live = false;
      DOCK.dirty = true;
      DOCK.items.forEach((st) => {
        st.target = 0;
        st.el.dataset.near = 'false';
      });
    }

    DOCK.items = Array.from(root.querySelectorAll('[data-dock]')).map((el) => ({
      el,
      w: 0,
      h: 0,
      v: 0,
      vel: 0,
      target: 0
    }));

    SPEC.items = Array.from(document.querySelectorAll('[data-spec]')).map((el) => ({
      el,
      ang: 2.4,
      tAng: 2.4,
      br: 0,
      tBr: 0,
      focused: false,
      reach: el.classList.contains('dock') ? 250 : 185
    }));

    measureDock();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureDock);
    }

    function onPointerMove(e) {
      if (e.pointerType === 'touch') return;
      aimX = e.clientX;
      aimY = e.clientY;
      aimSeen = true;
      aimMoved = true;
      DOCK.key = false;
      DOCK.dirty = true;
      SPEC.dirty = true;
    }

    function onPointerLeave() {
      aimSeen = false;
      dockRest();
      SPEC.items.forEach((st) => {
        st.tBr = st.focused ? 0.9 : 0;
      });
      SPEC.dirty = true;
    }

    function onResize() {
      measureDock();
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', onResize);

    let lastTick = performance.now();
    let animId = null;

    function updatePhysics() {
      const now = performance.now();
      const dt = Math.min((now - lastTick) / 1000, 0.05);
      lastTick = now;

      // Dock update
      if (DOCK.root && DOCK.on) {
        if (aimSeen && aimMoved && !DOCK.key) {
          const rr = DOCK.root.getBoundingClientRect();
          if (
            aimX > rr.left - 48 &&
            aimX < rr.right + 48 &&
            aimY > rr.top - 44 &&
            aimY < rr.bottom + 104
          ) {
            DOCK.items.forEach((st) => {
              const r = st.el.getBoundingClientRect();
              const prox = clamp01(1 - Math.abs(aimX - (r.left + r.width * 0.5)) / (128 * DOCK.u));
              st.target = prox * prox * (3 - 2 * prox);
              st.el.dataset.near = st.target > 0.08 ? 'true' : 'false';
            });
            DOCK.live = true;
            DOCK.dirty = true;
          } else if (DOCK.live) {
            dockRest();
          }
        }

        if (DOCK.dirty) {
          let moving = false;
          DOCK.items.forEach((st) => {
            st.vel += (st.target - st.v) * 190 * dt;
            st.vel *= Math.exp(-23 * dt);
            st.v += st.vel * dt;
            if (Math.abs(st.target - st.v) < 0.001 && Math.abs(st.vel) < 0.004) {
              st.v = st.target;
              st.vel = 0;
            } else {
              moving = true;
            }

            const v = Math.min(Math.max(st.v, 0), 1.08);
            const mark = st.el.classList.contains('dock-mark');
            const ew = mark ? 14 * DOCK.u : Math.min(18 * DOCK.u, st.w * 0.24);
            const eh = mark ? 14 * DOCK.u : 16 * DOCK.u;
            st.el.style.width = (st.w + ew * v).toFixed(2) + 'px';
            st.el.style.height = (st.h + eh * v).toFixed(2) + 'px';
            st.el.style.transform = `translateY(${(v * 3.5 * DOCK.u).toFixed(2)}px)`;
          });
          if (!moving) DOCK.dirty = false;
        }
      }

      // Specular update
      if (SPEC.on) {
        if (aimSeen && aimMoved) {
          SPEC.items.forEach((st) => {
            const r = st.el.getBoundingClientRect();
            const cx = r.left + r.width * 0.5;
            const cy = r.top + r.height * 0.5;
            const dx = Math.max(r.left - aimX, 0, aimX - r.right);
            const dy = Math.max(r.top - aimY, 0, aimY - r.bottom);
            const d = Math.sqrt(dx * dx + dy * dy);

            st.tAng =
              d === 0
                ? Math.atan2(2 / Math.max(r.height, 1), -2 / Math.max(r.width, 1)) +
                  ((aimX - cx) / Math.max(r.width * 0.5, 1)) * 0.3 +
                  ((cy - aimY) / Math.max(r.height * 0.5, 1)) * 0.15
                : Math.atan2(cy - aimY, aimX - cx);

            const raw = clamp01(1 - d / (st.reach * DOCK.u));
            st.tBr = Math.max(raw * raw * (3 - 2 * raw), st.focused ? 0.9 : 0);
          });
          SPEC.dirty = true;
        }

        if (SPEC.dirty) {
          let moving = false;
          SPEC.items.forEach((st) => {
            const diff = (((st.tAng - st.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            st.ang += diff * (1 - Math.exp(-dt * 8));
            st.br += (st.tBr - st.br) * (1 - Math.exp(-dt * 9));
            if (Math.abs(diff) < 0.001 && Math.abs(st.tBr - st.br) < 0.002) {
              st.ang = st.tAng;
              st.br = st.tBr;
            } else {
              moving = true;
            }
            st.el.style.setProperty('--spec-angle', st.ang.toFixed(4) + 'rad');
            st.el.style.setProperty('--spec-bright', (clamp01(st.br) * 0.92).toFixed(3));
          });
          if (!moving) SPEC.dirty = false;
        }
      }

      aimMoved = false;
      animId = requestAnimationFrame(updatePhysics);
    }

    animId = requestAnimationFrame(updatePhysics);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const handleNavClick = (e, name) => {
    e.preventDefault();
    if (name !== 'home') {
      setActiveTab(name);
    }
    if (onBurst) {
      onBurst(e.clientX, e.clientY);
    }
  };

  return (
    <div className="dock-wrap">
      <nav ref={dockRef} className="dock par-dock" style={{ '--pd': 5 }} data-spec aria-label="Primary">
        <a
          className="dock-item dock-mark"
          data-dock
          data-spec
          data-burst
          href="#home"
          style={{ '--d': '120ms' }}
          aria-label="Sylva — home"
          onClick={(e) => handleNavClick(e, 'home')}
        >
          <svg viewBox="0 0 22 24" aria-hidden="true">
            <path d="M11 1.3c-2.1 0-3.95 1.2-4.75 2.95C3.95 4.55 2.3 6.25 2.3 8.35c0 2.3 1.9 4.2 4.3 4.2h8.8c2.4 0 4.3-1.9 4.3-4.2 0-2.1-1.65-3.8-4-4.1C14.95 2.5 13.1 1.3 11 1.3Z" />
            <path d="M9.6 12.55h2.8v4.2c1.35.3 2.45 1.15 3.15 2.4-1.35.4-2.4.15-3.15-.4v4.15H9.6v-4.15c-.75.55-1.8.8-3.15.4.7-1.25 1.8-2.1 3.15-2.4v-4.2Z" />
          </svg>
        </a>
        <a
          className={`dock-item ${activeTab === 'Grove' ? 'is-active' : ''}`}
          data-dock
          data-spec
          data-burst
          href="#grove"
          style={{ '--d': '180ms' }}
          onClick={(e) => handleNavClick(e, 'Grove')}
        >
          <span className="glyph" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M8 14V9" />
              <path d="M8 9c0-2.4 1.7-4.3 4-4.3.2 2.6-1.6 4.6-4 4.3Z" />
              <path d="M8 10.5C7.9 8.4 6.4 6.8 4.4 6.8 4.3 8.9 5.9 10.6 8 10.5Z" />
            </svg>
          </span>
          <span>Grove</span>
        </a>
        <a
          className={`dock-item ${activeTab === 'Habitats' ? 'is-active' : ''}`}
          data-dock
          data-spec
          data-burst
          href="#habitats"
          style={{ '--d': '230ms' }}
          onClick={(e) => handleNavClick(e, 'Habitats')}
        >
          <span className="glyph" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M1.6 12.4c2.4-3.4 4.3-5.1 5.7-5.1 2 0 3 3.6 5 3.6 1.1 0 1.9-.5 2.4-1.4" />
              <path d="M4.3 6.2C5.5 4.4 6.6 3.5 7.6 3.5c1.5 0 2.2 2.4 3.7 2.4" />
            </svg>
          </span>
          <span>Habitats</span>
        </a>
        <a
          className={`dock-item ${activeTab === 'Journal' ? 'is-active' : ''}`}
          data-dock
          data-spec
          data-burst
          href="#journal"
          style={{ '--d': '280ms' }}
          onClick={(e) => handleNavClick(e, 'Journal')}
        >
          <span className="glyph" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M4 2.4h5.3L12 5.1v8.5H4z" />
              <path d="M9.2 2.4V5h2.7" />
              <path d="M6 8.4h4M6 10.8h2.8" />
            </svg>
          </span>
          <span>Journal</span>
        </a>
        <a
          className={`dock-item dock-item--enter ${activeTab === 'Enter' ? 'is-active' : ''}`}
          data-dock
          data-spec
          data-burst
          href="#enter"
          style={{ '--d': '330ms' }}
          onClick={(e) => handleNavClick(e, 'Enter')}
        >
          <span className="glyph" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M6.6 2.5h5.1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6.6" />
              <path d="M2.6 8h6.6" />
              <path d="m7 5.6 2.4 2.4L7 10.4" />
            </svg>
          </span>
          <span>Enter</span>
        </a>
      </nav>
    </div>
  );
}
