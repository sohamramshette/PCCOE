import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { getStations } from '../api/stations';
import { Station } from '../types/station';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';

export const Stations: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStationData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStations(false); // fetch all stations
      setStations(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load monitoring stations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStationData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading monitoring station registry..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={fetchStationData} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Continuous Ambient Air Quality Stations</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Ground-truth continuous CAAQMS telemetry stations operating within Pune Municipal Corporation (PMC) and
            Pimpri-Chinchwad Municipal Corporation (PCMC).
          </p>
        </div>
        <button onClick={fetchStationData} className="btn btn-secondary" style={{ gap: '0.4rem' }}>
          <RefreshCw size={15} />
          <span>Refresh Stations</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))', gap: '1.25rem' }}>
        {stations.map((st) => (
          <div key={st.station_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '6px',
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                    }}
                  >
                    <MapPin size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {st.station_id}</span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{st.station_name}</h3>
                  </div>
                </div>
                <span
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backgroundColor: st.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: st.is_active ? '#047857' : '#b91c1c',
                  }}
                >
                  {st.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                <div><strong>Zone Classification:</strong> {st.zone_type}</div>
                <div><strong>Operating Authority:</strong> {st.monitoring_authority}</div>
                <div><strong>City / Region:</strong> {st.city}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <Navigation size={13} color="var(--primary)" />
                  <span>
                    Lat: {st.latitude.toFixed(4)}°, Lon: {st.longitude.toFixed(4)}°
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <ProvenanceBadge classification="OBSERVED" />
                <Link
                  to={`/stations/${st.station_id}`}
                  className="btn btn-primary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  <span>View Diagnostics</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          backgroundColor: 'rgba(248, 250, 252, 0.72)',
        }}
      >
        <ShieldCheck size={24} color="var(--primary)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong>Analytical Coverage Notice:</strong> All six stations are synchronously indexed on the canonical
          14,016-hour analytical grid (Feb 18, 2025 to Sep 24, 2026), with co-located ERA5-Land reanalysis and
          spatial exposure buffer metrics.
        </div>
      </div>
    </div>
  );
};
