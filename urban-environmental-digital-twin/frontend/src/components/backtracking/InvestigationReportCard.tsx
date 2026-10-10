import React from 'react';
import {
  FileText,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  Navigation,
  Wind,
  Activity,
  HelpCircle,
  MapPin,
  Calendar,
} from 'lucide-react';
import {
  InvestigationSummary,
  BacktrackingMetadata,
  ReceptorStationInfo,
} from '../../types/backtracking';

interface InvestigationReportCardProps {
  summary: InvestigationSummary;
  metadata: BacktrackingMetadata;
  receptor: ReceptorStationInfo;
  arrivalUtc: string;
  arrivalIst: string;
  observedPm25: number | null;
  naqiCategory: string | null;
  totalDistanceKm: number;
  durationHours: number;
  status: string;
}

export const InvestigationReportCard: React.FC<InvestigationReportCardProps> = ({
  summary,
  metadata,
  receptor,
  arrivalUtc,
  arrivalIst,
  observedPm25,
  naqiCategory,
  totalDistanceKm,
  durationHours,
  status,
}) => {
  const isArtifactSpike =
    summary.data_quality_assessment.includes('UNVERIFIED LOCAL SPIKE') ||
    summary.data_quality_assessment.includes('POTENTIAL SENSOR ARTIFACT');

  const isMultiStationVerified =
    summary.data_quality_assessment.includes('HIGH_CONFIDENCE') ||
    summary.data_quality_assessment.includes('Multi-station');

  return (
    <div className="investigation-report-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Primary Epistemological Disclaimer Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(249, 115, 22, 0.05))',
        border: '1px solid var(--border-blue)',
        borderRadius: '12px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <Info size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
            2D Kinematic Back-Trajectory Estimate • Non-Causal Transport Model
          </strong>
          {metadata.disclaimer}
        </div>
      </div>

      {/* Episode Header Summary Strip */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '12px 18px',
        fontSize: '0.8rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={15} style={{ color: 'var(--primary)' }} />
          <span><strong>Receptor:</strong> {receptor.station_name} ({receptor.city})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={15} style={{ color: '#0284c7' }} />
          <span><strong>Arrival:</strong> {arrivalIst} <span style={{ color: 'var(--text-muted)' }}>({arrivalUtc.replace('T', ' ').substring(0, 19)} UTC)</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={15} style={{ color: observedPm25 ? '#ef4444' : 'var(--text-muted)' }} />
          <span><strong>Recorded:</strong> {observedPm25 !== null ? `${observedPm25.toFixed(1)} µg/m³ (${naqiCategory || 'N/A'})` : 'Sensor Offline'}</span>
        </div>
      </div>

      {/* Coverage Warnings (if any) */}
      {metadata.coverage_warnings && metadata.coverage_warnings.length > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: '#92400e' }}>
            <strong style={{ display: 'block', marginBottom: '2px' }}>Spatial Coverage Warning</strong>
            {metadata.coverage_warnings.map((w, idx) => (
              <p key={idx} style={{ margin: 0 }}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Structured Investigation Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '18px',
      }}>
        {/* Section 1: Empirical Sensor Observations */}
        <div className="card" style={{ padding: '18px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <Activity size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '0.95rem', margin: 0 }}>1. Observed Ground-Truth Facts</h3>
          </div>
          <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            {summary.observed_facts.map((fact, idx) => (
              <li key={idx} style={{ marginBottom: '6px' }}>{fact}</li>
            ))}
          </ul>
        </div>

        {/* Section 2: Meteorological Reanalysis Context */}
        <div className="card" style={{ padding: '18px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <Wind size={18} style={{ color: '#0284c7' }} />
            <h3 style={{ fontSize: '0.95rem', margin: 0 }}>2. Meteorological Reanalysis Context</h3>
          </div>
          <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            {summary.meteorological_context.map((ctx, idx) => (
              <li key={idx} style={{ marginBottom: '6px' }}>{ctx}</li>
            ))}
          </ul>
          <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px' }}>
            Source: ECMWF ERA5-Land Reanalysis (~9km grid). Not in-situ anemometer.
          </div>
        </div>
      </div>

      {/* Section 3: Trajectory Path Summary Card */}
      <div className="card" style={{ padding: '18px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Navigation size={18} style={{ color: '#7c3aed' }} />
          <h3 style={{ fontSize: '0.95rem', margin: 0 }}>3. Calculated Kinematic Advection Path</h3>
        </div>
        <p style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
          {summary.calculated_trajectory_summary}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.78rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '8px 14px', borderRadius: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Duration: </span>
            <strong>{durationHours} Hours Backward</strong>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '8px 14px', borderRadius: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Geodesic Path Length: </span>
            <strong>{totalDistanceKm.toFixed(1)} km</strong>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '8px 14px', borderRadius: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Integration Step: </span>
            <strong>60 minutes (Hourly Euler)</strong>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '8px 14px', borderRadius: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Domain Status: </span>
            <strong style={{ color: status === 'COMPLETED' ? 'var(--success)' : '#ea580c' }}>
              {status === 'COMPLETED' ? 'Within Pune-PCMC Basin' : 'Partial Boundary Extrapolation'}
            </strong>
          </div>
        </div>
      </div>

      {/* Section 4: Data Quality Audit Verdict (Prominent Banner) */}
      <div style={{
        background: isArtifactSpike
          ? 'rgba(239, 68, 68, 0.06)'
          : isMultiStationVerified
          ? 'rgba(16, 185, 129, 0.06)'
          : 'var(--bg-surface)',
        border: `1.5px solid ${
          isArtifactSpike
            ? 'rgba(239, 68, 68, 0.3)'
            : isMultiStationVerified
            ? 'rgba(16, 185, 129, 0.3)'
            : 'var(--border)'
        }`,
        borderRadius: '14px',
        padding: '18px 22px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          {isArtifactSpike ? (
            <ShieldAlert size={22} style={{ color: 'var(--danger)' }} />
          ) : isMultiStationVerified ? (
            <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
          ) : (
            <FileText size={22} style={{ color: 'var(--primary)' }} />
          )}
          <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-primary)' }}>
            4. Scientific Data-Quality Assessment
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
          {summary.data_quality_assessment}
        </p>
      </div>

      {/* Section 5 & 6: Non-Causal Explanations & Limitations */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '18px',
      }}>
        {/* Candidate Explanations */}
        <div className="card" style={{ padding: '18px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <HelpCircle size={18} style={{ color: '#f59e0b' }} />
            <h3 style={{ fontSize: '0.95rem', margin: 0 }}>5. Plausible Transport Hypotheses</h3>
          </div>
          <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            {summary.candidate_explanations.map((exp, idx) => (
              <li key={idx} style={{ marginBottom: '6px' }}>{exp}</li>
            ))}
          </ul>
        </div>

        {/* Scientific Limitations */}
        <div className="card" style={{ padding: '18px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <AlertTriangle size={18} style={{ color: '#dc2626' }} />
            <h3 style={{ fontSize: '0.95rem', margin: 0 }}>6. Methodological Constraints</h3>
          </div>
          <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            {summary.scientific_limitations.map((lim, idx) => (
              <li key={idx} style={{ marginBottom: '6px' }}>{lim}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
