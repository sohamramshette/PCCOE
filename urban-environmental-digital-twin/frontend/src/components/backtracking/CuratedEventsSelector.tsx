import React from 'react';
import {
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { CuratedEventItem, ValidationStatus } from '../../types/backtracking';

interface CuratedEventsSelectorProps {
  events: CuratedEventItem[];
  selectedEventId: string | null;
  onSelectEvent: (event: CuratedEventItem) => void;
  loading: boolean;
}

export const CuratedEventsSelector: React.FC<CuratedEventsSelectorProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  loading,
}) => {
  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'HIGH_CONFIDENCE_MULTI_STATION_EPISODE':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#059669',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}>
            <CheckCircle2 size={12} />
            Multi-Station Confirmed Episode
          </span>
        );
      case 'UNVERIFIED_LOCAL_SPIKE_POTENTIAL_ARTIFACT':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}>
            <ShieldAlert size={12} />
            Unverified Local Spike / Artifact
          </span>
        );
      case 'HIGH_CONFIDENCE_MONITORED_PEAK':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(37, 99, 235, 0.1)',
            color: '#2563eb',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}>
            <CheckCircle2 size={12} />
            Verified Sustained Peak
          </span>
        );
      default:
        return (
          <span style={{
            background: 'rgba(100, 116, 139, 0.1)',
            color: '#64748b',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}>
            Historical Observation
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Loading curated historical episodes...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={17} style={{ color: 'var(--accent)' }} />
        <h4 style={{ fontSize: '0.9rem', margin: 0 }}>
          Curated Historical Pollution Benchmark Episodes
        </h4>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
        Select a pre-cataloged event with verified data-quality audit statuses to quickly populate the simulation controls.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px',
      }}>
        {events.map((ev) => {
          const isSelected = selectedEventId === ev.event_id;

          return (
            <div
              key={ev.event_id}
              onClick={() => onSelectEvent(ev)}
              style={{
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: isSelected ? 'rgba(37, 99, 235, 0.04)' : 'var(--bg-card)',
                borderRadius: '12px',
                padding: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isSelected ? 'var(--shadow-blue)' : 'var(--shadow-sm)',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.borderColor = 'var(--primary-light)';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {ev.headline}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: ev.observed_pm25 > 250 ? '#b91c1c' : '#ea580c',
                    color: 'white',
                    whiteSpace: 'nowrap',
                  }}>
                    {ev.observed_pm25.toFixed(1)} µg/m³
                  </span>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  {getStatusBadge(ev.validation_status)}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} />
                    <span>{ev.station_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    <span>{ev.datetime_ist}</span>
                  </div>
                </div>

                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  {ev.description}
                </p>
              </div>

              <div style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Audit: {ev.data_quality_notes}
                </span>
                <span style={{
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}>
                  Load <ArrowRight size={12} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
