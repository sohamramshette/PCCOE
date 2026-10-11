import React from 'react';

interface AirLensLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  withBackground?: boolean;
}

export const AirLensLogo: React.FC<AirLensLogoProps> = ({
  size = 24,
  className = '',
  style = {},
  withBackground = false,
}) => {
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      style={{ display: 'block', ...style }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="rgba(255, 255, 255, 0.4)" strokeDasharray="2 3" />
      <circle cx="12" cy="12" r="5" stroke="#a3b593" strokeWidth="1.8" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="rgba(255, 255, 255, 0.7)" strokeLinecap="round" />
    </svg>
  );

  if (withBackground) {
    return (
      <div
        style={{
          background: '#191c16',
          padding: '5px',
          borderRadius: '10px',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(163, 181, 147, 0.25)',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {svg}
      </div>
    );
  }

  return svg;
};

export default AirLensLogo;
