import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading digital twin data...' }) => {
  return (
    <div className="state-container">
      <div className="spinner" />
      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{message}</span>
    </div>
  );
};
