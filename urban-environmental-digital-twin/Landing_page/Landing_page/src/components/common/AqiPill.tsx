import React from 'react';
import { getPm25AqiCategory, formatNumber } from '../../utils/formatters';

interface AqiPillProps {
  pm25: number | null | undefined;
  showCategory?: boolean;
}

export const AqiPill: React.FC<AqiPillProps> = ({ pm25, showCategory = true }) => {
  const cat = getPm25AqiCategory(pm25);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.25rem 0.6rem',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: cat.bgLight,
        border: `1px solid ${cat.color}40`,
        fontFamily: 'var(--font-sans)',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: cat.textColor,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: cat.color,
          display: 'inline-block',
          boxShadow: `0 0 6px ${cat.color}80`,
        }}
      />
      <span>{formatNumber(pm25, 1)} <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>µg/m³</span></span>
      {showCategory && (
        <span
          style={{
            fontSize: '0.7rem',
            padding: '0.1rem 0.35rem',
            borderRadius: '4px',
            backgroundColor: `${cat.color}20`,
            color: cat.textColor,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            marginLeft: '0.2rem',
          }}
        >
          {cat.label}
        </span>
      )}
    </div>
  );
};
