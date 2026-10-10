import React, { useEffect, useRef } from 'react';

const CUT_STEPS = 12;
const CUT_MS = 1450;

function PortalFigure({ src, alt, delay = 1080 }) {
  const figRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const fig = figRef.current;
    const canvasEl = canvasRef.current;
    const media = mediaRef.current;
    const img = imgRef.current;
    if (!fig || !canvasEl || !media || !img) return;

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (REDUCED) return;

    let timeoutId = null;
    let animId = null;

    function launch() {
      timeoutId = setTimeout(() => {
        const box = canvasEl.getBoundingClientRect();
        if (!box.width || !box.height) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvasEl.width = Math.max(1, Math.round(box.width * dpr));
        canvasEl.height = Math.max(1, Math.round(box.height * dpr));
        const ctx = canvasEl.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const cols = 52;
        const rows = Math.max(18, Math.round((cols * box.height) / box.width));

        const sample = document.createElement('canvas');
        sample.width = cols;
        sample.height = rows;
        const sg = sample.getContext('2d', { willReadFrequently: true });
        let rgba = null;
        try {
          sg.drawImage(img, 0, 0, cols, rows);
          rgba = sg.getImageData(0, 0, cols, rows).data;
        } catch (e) {
          // Fallback if cross-origin or local restriction
        }

        const over = -media.offsetLeft;
        const span = media.offsetWidth;
        const reach = box.width;

        canvasEl.style.opacity = '1';
        const startedAt = performance.now();

        function paint(now) {
          const t = Math.min(1, (now - startedAt) / CUT_MS);
          const stepped = Math.floor(t * CUT_STEPS) / CUT_STEPS;
          const front = (stepped * span - over) / reach;
          const tailFade = t < 0.88 ? 1 : (1 - t) / 0.12;
          ctx.clearRect(0, 0, box.width, box.height);

          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const an = (x + 0.5) / cols;
              const delta = an - front;
              if (delta < -0.16 || delta > 0.16) continue;

              const band = 1 - Math.abs(delta) / 0.16;
              const pulse = 0.68 + 0.32 * Math.sin(x * 2.71 + y * 1.93 + t * 26);
              const alpha = Math.max(0, band * pulse * tailFade);
              if (alpha < 0.08) continue;

              let r = 220,
                g = 238,
                b = 202;
              if (rgba) {
                const q = (y * cols + x) * 4;
                r = Math.min(255, rgba[q] * 1.18 + 20);
                g = Math.min(255, rgba[q + 1] * 1.18 + 24);
                b = Math.min(255, rgba[q + 2] * 1.12 + 14);
              }

              let px = ((x + 0.5) * box.width) / cols;
              let py = ((y + 0.5) * box.height) / rows;
              const jitter = (1 - band) * 5;
              px += Math.sin(y * 3.17 + x) * jitter;
              py += Math.cos(x * 2.41 - y) * jitter;
              const radius = (0.55 + band * 1.25) * Math.max(0.75, reach / 300);

              ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha * 0.92})`;
              ctx.beginPath();
              ctx.arc(px, py, radius, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          if (t < 1) {
            animId = requestAnimationFrame(paint);
          } else {
            ctx.clearRect(0, 0, box.width, box.height);
            canvasEl.style.opacity = '0';
          }
        }

        animId = requestAnimationFrame(paint);
      }, delay);
    }

    if (img.complete && img.naturalWidth) {
      launch();
    } else {
      img.addEventListener('load', launch, { once: true });
    }

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animId);
    };
  }, [delay]);

  return (
    <figure ref={figRef} className="portal" data-delay={delay}>
      <span ref={mediaRef} className="portal-media">
        <img ref={imgRef} src={src} alt={alt} loading="eager" decoding="async" />
      </span>
      <canvas ref={canvasRef} className="pixel-reveal" aria-hidden="true"></canvas>
    </figure>
  );
}

export function EthosCard() {
  return (
    <>
      <article className="card card--about mask" style={{ '--d': '760ms', '--pd': 10, '--pr': 2.2 }}>
        <PortalFigure
          src="/inner-green-assets/card-ethos.webp"
          alt="A cushion of moss grown over lichen-crusted stones"
          delay={920}
        />
        <p className="label">Our Ethos</p>
        <h2>Let the wild lead.</h2>
      </article>

      <span className="knob-float" style={{ '--pd': 10, '--pr': 2.2 }}>
        <button className="knob knob--about mask-circle" style={{ '--d': '1100ms' }} aria-label="Read about Sylva">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21v-7" />
            <path d="M12 14c0-3.3 2.4-6 5.5-6 .3 3.6-2.2 6.4-5.5 6Z" />
            <path d="M12 16c-.1-2.9-2.2-5.2-4.9-5.2C6.8 13.7 9 16 12 16Z" />
          </svg>
        </button>
      </span>
    </>
  );
}

export function FieldNoteCard() {
  return (
    <article className="card card--stove mask" style={{ '--d': '880ms', '--pd': 22, '--pr': 2.4 }}>
      <p className="label">Field Note 07</p>
      <h2>After the Rain</h2>
      <PortalFigure
        src="/inner-green-assets/card-ecostove.webp"
        alt="Moss-covered boulders in a misty grove"
        delay={1080}
      />
      <button className="knob" aria-label="Open field note: After the Rain">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21v-7" />
          <path d="M12 14c0-3.3 2.4-6 5.5-6 .3 3.6-2.2 6.4-5.5 6Z" />
          <path d="M12 16c-.1-2.9-2.2-5.2-4.9-5.2C6.8 13.7 9 16 12 16Z" />
        </svg>
      </button>
    </article>
  );
}
