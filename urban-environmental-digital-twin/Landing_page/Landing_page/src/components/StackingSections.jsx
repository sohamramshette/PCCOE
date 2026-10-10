import React, { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './StackingSections.css';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * StackSection component: Wraps an individual page/section in the stack
 */
export function StackSection({
  children,
  className = '',
  id = '',
  ...props
}) {
  return (
    <div className={`stack-card-section ${className}`} id={id} {...props}>
      <div className="stack-card-inner">
        {children}
        <div className="stack-card-veil" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * StackingSections: High-performance 120 FPS overlay card stack
 * 
 * Performance Optimizations:
 * 1. Native CSS sticky positioning handles stacking directly on the GPU compositor thread.
 * 2. Automatic visibility culling: When a page is completely covered by the next page,
 *    its visibility is toggled to 'hidden'. This immediately frees GPU/CPU cycles from
 *    rendering hidden background WebGL/DOM, eliminating top-to-bottom scroll lag.
 * 3. Lenis is configured with 0.9s duration and 1.0 multiplier for ultra-responsive, silky glide.
 * 4. Veil opacity is composited purely on GPU without expensive SVG/canvas rasterization transforms.
 */
export default function StackingSections({ children }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    // 1. Initialize Lenis for responsive, frictionless momentum scrolling
    const lenis = new Lenis({
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.0,
    });

    window.__lenis = lenis;

    // Connect Lenis to GSAP ScrollTrigger ticker
    lenis.on('scroll', ScrollTrigger.update);

    const updateRaf = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateRaf);
    gsap.ticker.lagSmoothing(0);

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const sections = Array.from(container.querySelectorAll('.stack-card-section'));

    // Assign stacking z-index order
    sections.forEach((section, index) => {
      section.style.zIndex = `${index + 1}`;
    });

    let ctx;
    if (!reduceMotion && sections.length > 1) {
      ctx = gsap.context(() => {
        sections.forEach((section, index) => {
          if (index === sections.length - 1) return; // Last card does not get covered

          const veil = section.querySelector('.stack-card-veil');
          const nextSection = sections[index + 1];

          // 1. Smooth ambient veil dimming as next page slides over
          if (veil) {
            gsap.fromTo(
              veil,
              { opacity: 0 },
              {
                opacity: 0.42,
                ease: 'none',
                scrollTrigger: {
                  trigger: nextSection,
                  start: 'top bottom',
                  end: 'top top',
                  scrub: true,
                  invalidateOnRefresh: true,
                }
              }
            );
          }

          // 2. CRITICAL LAG FIX: Visibility Culling
          // When nextSection reaches the top, the current section is 100% covered.
          // Hiding it stops the GPU/Three.js from rendering invisible pixels behind the current card!
          ScrollTrigger.create({
            trigger: nextSection,
            start: 'top top',
            onEnter: () => {
              section.style.visibility = 'hidden';
            },
            onLeaveBack: () => {
              section.style.visibility = 'visible';
            },
          });
        });

        // Recalibrate after mounting
        const timer = setTimeout(() => {
          ScrollTrigger.refresh();
        }, 120);

        return () => clearTimeout(timer);
      }, container);
    }

    const handleResize = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ctx) ctx.revert();
      gsap.ticker.remove(updateRaf);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  return (
    <div className="airlens-stacking-container" ref={containerRef}>
      {children}
    </div>
  );
}
