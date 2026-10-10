import React from 'react';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  WifiOff,
} from 'lucide-react';
import { CorrelatedStationEvidence } from '../../types/backtracking';

interface EvidenceCorrelationTableProps {
  evidence: CorrelatedStationEvidence[];
}

export const EvidenceCorrelationTable: React.FC<EvidenceCorrelationTableProps> = ({ evidence }) => {
  const getAlignmentBadge = (alignment: string | null) => {
    switch (alignment) {
      case 'UPWIND_CORRIDOR':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(37, 99, 235, 0.1)',
            color: '#2563eb',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 600,
          }}>
            <ArrowDownRight size={12} />
            Upwind Corridor
          </span>
        );
      case 'DOWNWIND_CORRIDOR':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(124, 58, 237, 0.1)',
            color: '#7c3aed',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 600,
          }}>
            <ArrowUpRight size={12} />
            Downwind
          </span>
        );
      case 'CROSSWIND':
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(100, 116, 139, 0.1)',
            color: '#64748b',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 600,
          }}>
            <ArrowRight size={12} />
            Crosswind
          </span>
        );
    }
  };

  const getNaqiColor = (cat: string | null) => {
    switch (cat) {
      case 'Good':
        return '#10b981';
      case 'Satisfactory':
        return '#84cc16';
      case 'Moderate':
        return '#eab308';
      case 'Poor':
        return '#f97316';
      case 'Very Poor':
        return '#ef4444';
      case 'Severe':
        return '#b91c1c';
      default:
        return '#94a3b8';
    }
  };

  return (
    <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={19} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1rem', margin: 0 }}>
            Contemporaneous Network Concordance & Correlation
          </h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {evidence.length} Surrounding Monitoring Stations
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '10px 12px' }}>Station</th>
              <th style={{ padding: '10px 12px' }}>Distance / Bearing</th>
              <th style={{ padding: '10px 12px' }}>Wind Alignment</th>
              <th style={{ padding: '10px 12px' }}>Observed PM2.5</th>
              <th style={{ padding: '10px 12px' }}>NAQI Tier</th>
              <th style={{ padding: '10px 12px' }}>Valid Samples (N)</th>
              <th style={{ padding: '10px 12px' }}>Pearson (r)</th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((stn) => {
              const hasObs = stn.observed_pm25_at_arrival !== null;
              const hasCorr = stn.correlation_coefficient !== null;

              return (
                <tr
                  key={stn.station_id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{stn.station_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {stn.station_id}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div>{stn.distance_to_receptor_km.toFixed(1)} km</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{stn.bearing_from_receptor_deg.toFixed(0)}° from receptor</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {getAlignmentBadge(stn.relative_wind_alignment)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {hasObs ? (
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stn.observed_pm25_at_arrival?.toFixed(1)} µg/m³
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.75rem', fontWeight: 500 }}>
                        <WifiOff size={12} />
                        Offline (null)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {stn.cpcb_naqi_category ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'white',
                        backgroundColor: getNaqiColor(stn.cpcb_naqi_category),
                      }}>
                        {stn.cpcb_naqi_category}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      fontWeight: 600,
                      color: stn.valid_sample_count >= 4 ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}>
                      {stn.valid_sample_count} pairs
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {hasCorr ? (
                      <span style={{
                        fontWeight: 700,
                        color: (stn.correlation_coefficient ?? 0) > 0.5 ? '#10b981' : (stn.correlation_coefficient ?? 0) < -0.2 ? '#ef4444' : 'var(--text-primary)',
                      }}>
                        {stn.correlation_coefficient?.toFixed(3)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }} title="Requires N ≥ 4 mutual non-null observations with non-zero variance">
                        — (N &lt; 4)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Non-Causal Epistemological Disclaimer Footnote */}
      <div style={{
        marginTop: '16px',
        padding: '10px 14px',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <AlertCircle size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span>
          <strong>Scientific Caveat:</strong> Exploratory cross-station Pearson correlations reflect concurrent statistical co-movement across valid observation hours only. They do not imply emissions causality, transport continuity, or source attribution. Missing sensor readings remain strictly null.
        </span>
      </div>
    </div>
  );
};
