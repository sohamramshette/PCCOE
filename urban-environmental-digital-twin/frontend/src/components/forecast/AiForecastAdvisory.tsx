
import React, { useState } from 'react';
import {
  Sparkles,
  Wind,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Info,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { ForecastExplanation } from '../../types/llm';
import { getForecastExplanation } from '../../api/forecast';
import { formatDateTimeIST } from '../../utils/formatters';

interface AiForecastAdvisoryProps {
  stationId: number;
  modelId?: string;
}

export const AiForecastAdvisory: React.FC<AiForecastAdvisoryProps> = ({
  stationId,
  modelId,
}) => {
  const [advisory, setAdvisory] = useState<ForecastExplanation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdvisory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getForecastExplanation(stationId, { model_id: modelId });
      setAdvisory(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI advisory.');
    } finally {
      setLoading(false);
    }
  };

  // If not yet generated, show an enticing call-to-action button
  if (!advisory && !loading) {
    return (
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(243, 232, 255, 0.85))',
          border: '1px solid rgba(147, 51, 234, 0.25)',
          boxShadow: 'var(--shadow-md)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                AI Atmospheric & Public Health Advisory
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Synthesize domain-grounded atmospheric insights, ventilation dynamics, and NAQI health advisories using Gemini.
              </p>
            </div>
          </div>

          <button
            onClick={fetchAdvisory}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
              border: 'none',
              padding: '0.65rem 1.25rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.25)',
            }}
          >
            <Sparkles size={16} />
            <span>Generate AI Advisory</span>
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(243, 232, 255, 0.85))',
          border: '1px solid rgba(147, 51, 234, 0.25)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 1.5s infinite',
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Synthesizing Environmental Insights with Gemini AI...</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Evaluating atmospheric ventilation, boundary layer depth, and Indian NAQI health metrics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!advisory) return null;

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(245, 243, 255, 0.92))',
        border: '1px solid rgba(147, 51, 234, 0.3)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderBottom: '1px solid rgba(147, 51, 234, 0.15)',
          paddingBottom: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                AI Atmospheric & Public Health Advisory
              </h3>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  background: 'rgba(124, 58, 237, 0.12)',
                  color: '#7c3aed',
                  letterSpacing: '0.04em',
                }}
              >
                GEMINI AI INSIGHT
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Synthesized at {formatDateTimeIST(advisory.generated_at)} for {advisory.station_name}
            </div>
          </div>
        </div>

        <button
          onClick={fetchAdvisory}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          disabled={loading}
          title="Regenerate Advisory"
        >
          <RefreshCw size={13} className={loading ? 'spinner' : ''} />
          <span>Regenerate</span>
        </button>
      </div>

      {/* Executive Summary */}
      <div
        style={{
          background: 'rgba(243, 232, 255, 0.5)',
          borderLeft: '4px solid #7c3aed',
          borderRadius: '0 8px 8px 0',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          fontSize: '0.92rem',
          color: 'var(--text-primary)',
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#7c3aed', textTransform: 'uppercase', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>
          Executive Atmospheric Assessment
        </div>
        {advisory.executive_summary}
      </div>

      {/* 3 Pillars Grid: Drivers, Health, Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* 1. Atmospheric Drivers */}
        <div
          style={{
            background: '#ffffff',
            padding: '1.1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem', color: '#2563eb' }}>
            <Wind size={18} />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Dispersion & Emission Drivers</h4>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {advisory.atmospheric_drivers.map((driver, idx) => (
              <li key={idx} style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.45rem', lineHeight: 1.45 }}>
                <Layers size={14} color="#3b82f6" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                <span>{driver}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 2. Public Health Advisory */}
        <div
          style={{
            background: '#ffffff',
            padding: '1.1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem', color: '#d97706' }}>
            <ShieldAlert size={18} />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Public Health Advisory ({advisory.aqi_category})</h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {advisory.health_advisory}
          </p>
        </div>

        {/* 3. Recommended Actions */}
        <div
          style={{
            background: '#ffffff',
            padding: '1.1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem', color: '#059669' }}>
            <CheckCircle2 size={18} />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Actionable Civic Interventions</h4>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {advisory.recommended_actions.map((action, idx) => (
              <li key={idx} style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.45rem', lineHeight: 1.45 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    marginTop: '0.45rem',
                    flexShrink: 0,
                  }}
                />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Epistemological Disclosure Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid rgba(147, 51, 234, 0.12)',
          paddingTop: '0.75rem',
        }}
      >
        <Info size={14} color="#7c3aed" style={{ flexShrink: 0 }} />
        <span>{advisory.epistemological_note}</span>
      </div>
    </div>
  );
};
