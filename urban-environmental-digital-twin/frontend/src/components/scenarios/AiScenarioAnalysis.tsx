import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Info,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { ScenarioExplanation } from '../../types/llm';
import { explainScenario } from '../../api/scenarios';
import { formatDateTimeIST } from '../../utils/formatters';

interface AiScenarioAnalysisProps {
  scenarioId: string;
  isSimulated: boolean;
}

export const AiScenarioAnalysis: React.FC<AiScenarioAnalysisProps> = ({
  scenarioId,
  isSimulated,
}) => {
  const [explanation, setExplanation] = useState<ScenarioExplanation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExplanation = async () => {
    if (!isSimulated) return;
    try {
      setLoading(true);
      setError(null);
      const res = await explainScenario(scenarioId);
      setExplanation(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze scenario with AI.');
    } finally {
      setLoading(false);
    }
  };

  const getEffectivenessColor = (eff: string) => {
    switch (eff?.toUpperCase()) {
      case 'HIGH':
        return { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: '#10b981' };
      case 'MODERATE':
        return { bg: 'rgba(37, 99, 235, 0.12)', text: '#2563eb', border: '#3b82f6' };
      case 'LOW':
        return { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: '#f59e0b' };
      case 'CONDITIONAL':
      default:
        return { bg: 'rgba(124, 58, 237, 0.12)', text: '#7c3aed', border: '#8b5cf6' };
    }
  };

  if (!isSimulated) {
    return null;
  }

  // Initial call-to-action banner
  if (!explanation && !loading) {
    return (
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.95), rgba(245, 243, 255, 0.95))',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          boxShadow: 'var(--shadow-md)',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                AI Policy Impact Brief & Civic Recommendations
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Use Gemini to translate counterfactual PM2.5 deltas into atmospheric mechanics and municipal policy guidance.
              </p>
            </div>
          </div>

          <button
            onClick={fetchExplanation}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              border: 'none',
              padding: '0.6rem 1.15rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
            }}
          >
            <Sparkles size={16} />
            <span>Generate Policy Brief</span>
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: '0.85rem',
              padding: '0.65rem 0.85rem',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // Loading spinner
  if (loading) {
    return (
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.95), rgba(245, 243, 255, 0.95))',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 1.5s infinite',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Analyzing Counterfactual Policy Mechanics...</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Synthesizing municipal recommendations and boundary layer physics using Gemini AI.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!explanation) return null;

  const effColors = getEffectivenessColor(explanation.policy_effectiveness);

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 255, 0.95))',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
          paddingBottom: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                AI Policy Impact Brief & Civic Recommendations
              </h3>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  background: effColors.bg,
                  color: effColors.text,
                  border: `1px solid ${effColors.border}`,
                  letterSpacing: '0.04em',
                }}
              >
                EFFECTIVENESS: {explanation.policy_effectiveness}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Synthesized at {formatDateTimeIST(explanation.generated_at)} • Intervention: {explanation.intervention_summary}
            </div>
          </div>
        </div>

        <button
          onClick={fetchExplanation}
          className="btn btn-secondary"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          disabled={loading}
          title="Regenerate Policy Analysis"
        >
          <RefreshCw size={13} className={loading ? 'spinner' : ''} />
          <span>Regenerate</span>
        </button>
      </div>

      {/* Executive Narrative */}
      <div
        style={{
          background: 'rgba(238, 242, 255, 0.45)',
          borderLeft: '4px solid #6366f1',
          borderRadius: '0 8px 8px 0',
          padding: '0.9rem 1.15rem',
          marginBottom: '1rem',
          fontSize: '0.88rem',
          color: 'var(--text-primary)',
          lineHeight: 1.55,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#6366f1', textTransform: 'uppercase', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>
          Executive Policy Assessment
        </div>
        {explanation.executive_summary}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* Mechanism Explanation */}
        <div
          style={{
            background: '#ffffff',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem', color: '#6366f1' }}>
            <BookOpen size={17} />
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700 }}>Atmospheric & Physics Mechanism</h4>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {explanation.mechanism_explanation}
          </p>
        </div>

        {/* Municipal Recommendations */}
        <div
          style={{
            background: '#ffffff',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem', color: '#059669' }}>
            <Lightbulb size={17} />
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700 }}>Municipal & Civic Recommendations</h4>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {explanation.municipal_recommendations.map((rec, idx) => (
              <li key={idx} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.45rem', lineHeight: 1.45 }}>
                <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Epistemological Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid rgba(99, 102, 241, 0.12)',
          paddingTop: '0.65rem',
        }}
      >
        <Info size={14} color="#6366f1" style={{ flexShrink: 0 }} />
        <span>{explanation.epistemological_note}</span>
      </div>
    </div>
  );
};
