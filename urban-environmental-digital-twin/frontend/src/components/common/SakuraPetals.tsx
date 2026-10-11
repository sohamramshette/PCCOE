import React, { useMemo } from 'react';

const LEAF_COUNT = 24;

export function SakuraPetals() {
  const leaves = useMemo(
    () =>
      Array.from({ length: LEAF_COUNT }, (_, i) => ({
        id: i,
        left: `${(i * 47 + 13) % 100}%`,
        delay: `${-((i * 1.73) % 18)}s`,
        duration: `${12 + ((i * 7) % 12)}s`,
        size: `${12 + ((i * 11) % 13)}px`,
        drift: `${((i % 2 ? 1 : -1) * (25 + (i % 5) * 12))}px`,
        opacity: 0.35 + (i % 5) * 0.1,
      })),
    []
  );

  return (
    <div
      aria-hidden="true"
      className="leaf-background"
    >
      {leaves.map((leaf) => (
        <span
          key={leaf.id}
          className="falling-leaf"
          style={{
            left: leaf.left,
            animationDelay: leaf.delay,
            animationDuration: leaf.duration,
            fontSize: leaf.size,
            opacity: leaf.opacity,
            '--leaf-drift': leaf.drift,
          } as React.CSSProperties}
        >
          {leaf.id % 3 === 0 ? '🍂' : leaf.id % 3 === 1 ? '🍃' : '🌿'}
        </span>
      ))}
    </div>
  );
}

export default SakuraPetals;
