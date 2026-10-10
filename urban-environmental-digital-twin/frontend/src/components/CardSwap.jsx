import React, { useState, useEffect, useRef, Children } from 'react';
import './CardSwap.css';

/**
 * Card Component: Single card in the 3D swap deck
 */
export function Card({
  children,
  className = '',
  style = {},
  onClick,
  ...props
}) {
  return (
    <div
      className={`card-swap-item ${className}`}
      style={style}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * CardSwap Component: 3D interactive stacked card animation
 * 
 * Props:
 * - cardDistance: Horizontal offset between stacked cards (default 60)
 * - verticalDistance: Vertical offset between stacked cards (default 70)
 * - delay: Time in ms between automatic card swaps (default 5000)
 * - pauseOnHover: Whether auto-swap pauses when mouse hovers over deck (default false)
 * - skewAmount: Skew angle in degrees for isometric depth (default 4)
 * - showControls: Whether to show manual prev/next & pause buttons (default true)
 * - showIndicators: Whether to show step dots / pagination (default true)
 * - onCardChange: Callback when active card changes (index)
 */
export default function CardSwap({
  children,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  skewAmount = 4,
  showControls = true,
  showIndicators = true,
  onCardChange,
  className = '',
  style = {}
}) {
  const cards = Children.toArray(children);
  const total = cards.length;

  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [droppingIndex, setDroppingIndex] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const activeCardIndex = order[0] ?? 0;

  // Notify parent of active card
  useEffect(() => {
    if (onCardChange) {
      onCardChange(activeCardIndex);
    }
  }, [activeCardIndex, onCardChange]);

  // Handle swapping to next card
  const swapNext = React.useCallback(() => {
    if (total < 2 || droppingIndex !== null) return;
    const frontCard = orderRef.current[0];
    setDroppingIndex(frontCard);

    setTimeout(() => {
      setOrder(([front, ...rest]) => [...rest, front]);
      setDroppingIndex(null);
      setProgress(0);
    }, 540);
  }, [total, droppingIndex]);

  // Handle swapping to previous card (bring back card to front)
  const swapPrev = React.useCallback(() => {
    if (total < 2 || droppingIndex !== null) return;
    setOrder((prev) => {
      const last = prev[prev.length - 1];
      const rest = prev.slice(0, prev.length - 1);
      return [last, ...rest];
    });
    setProgress(0);
  }, [total, droppingIndex]);

  // Jump to specific card
  const jumpToCard = React.useCallback((targetIdx) => {
    if (droppingIndex !== null) return;
    const pos = orderRef.current.indexOf(targetIdx);
    if (pos === 0 || pos === -1) return;

    setOrder((prev) => {
      const item = prev[pos];
      const rest = prev.filter((_, i) => i !== pos);
      return [item, ...rest];
    });
    setProgress(0);
  }, [droppingIndex]);

  // Auto-swap timer & progress indicator
  useEffect(() => {
    const isPaused = isManualPaused || (pauseOnHover && isHovered);
    if (total < 2 || isPaused || delay <= 0) return;

    const intervalStep = 50;
    const stepIncrement = (intervalStep / delay) * 100;

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          swapNext();
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalStep);

    return () => clearInterval(progressTimer);
  }, [total, delay, pauseOnHover, isHovered, isManualPaused, swapNext]);

  return (
    <div
      className={`card-swap-wrapper ${className}`}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D Stage */}
      <div className="card-swap-stage">
        {cards.map((card, idx) => {
          const slotPos = order.indexOf(idx);
          const isDropping = droppingIndex === idx;

          // Coordinate calculations for stacked 3D slots
          const x = slotPos * cardDistance;
          const y = -slotPos * verticalDistance;
          const z = -slotPos * (cardDistance * 1.6);
          const zIndex = isDropping ? total + 10 : total - slotPos;
          const scale = Math.max(0.72, 1 - slotPos * 0.055);
          const opacity = isDropping ? 0 : (slotPos > 3 ? Math.max(0.18, 1 - slotPos * 0.25) : 1);

          const transform = isDropping
            ? `translate3d(${x}px, ${y + 380}px, 60px) rotate(-4deg) skewY(${skewAmount}deg) scale(0.92)`
            : `translate3d(${x}px, ${y}px, ${z}px) skewY(${skewAmount}deg) scale(${scale})`;

          return (
            <div
              key={idx}
              className={`card-swap-slot ${isDropping ? 'is-dropping' : ''} ${slotPos === 0 ? 'is-active-front' : 'is-stacked-back'}`}
              style={{
                zIndex,
                transform,
                opacity,
              }}
              onClick={() => {
                if (slotPos > 0) jumpToCard(idx);
              }}
              role="button"
              tabIndex={slotPos === 0 ? 0 : -1}
              aria-label={`Deck card ${idx + 1} of ${total}`}
            >
              {card}
            </div>
          );
        })}
      </div>

      {/* Floating Navigation Controls & Progress */}
      {(showControls || showIndicators) && total > 1 && (
        <div className="card-swap-hud">
          {/* Indicator Dots */}
          {showIndicators && (
            <div className="card-swap-dots" role="tablist">
              {cards.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`card-swap-dot ${activeCardIndex === i ? 'is-active' : ''}`}
                  onClick={() => jumpToCard(i)}
                  title={`Go to card ${i + 1}`}
                  aria-label={`Go to card ${i + 1}`}
                >
                  {activeCardIndex === i && (
                    <span
                      className="card-swap-dot-fill"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {showControls && (
            <div className="card-swap-actions">
              <button
                type="button"
                className="card-swap-ctrl-btn"
                onClick={swapPrev}
                title="Previous card"
                aria-label="Previous card"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <button
                type="button"
                className={`card-swap-ctrl-btn ${isManualPaused ? 'is-paused' : ''}`}
                onClick={() => setIsManualPaused((p) => !p)}
                title={isManualPaused ? 'Resume auto swap' : 'Pause auto swap'}
                aria-label={isManualPaused ? 'Resume' : 'Pause'}
              >
                {isManualPaused ? (
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.5 3.5l8 4.5-8 4.5V3.5z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.5 3h2.5v10H4.5V3zm4.5 0h2.5v10H9V3z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                className="card-swap-ctrl-btn"
                onClick={swapNext}
                title="Next card"
                aria-label="Next card"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
