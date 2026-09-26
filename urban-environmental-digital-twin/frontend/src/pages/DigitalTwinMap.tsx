import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Database,
  ArrowRight,
} from 'lucide-react';
import { getStations } from '../api/stations';
import { getObservations } from '../api/observations';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import { PuneTwinMap } from '../components/map/PuneTwinMap';
import { MapLegend } from '../components/map/MapLegend';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { formatNumber } from '../utils/formatters';

export const DigitalTwinMap: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [latestObservations, setLatestObservations] = useState<Record<number, ObservationItem | null>>({});
  
  // Layer controls
  const [showTrafficBuffer, setShowTrafficBuffer] = useState<boolean>(true);
  const [showActivityBuffer, setShowActivityBuffer] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all active monitoring stations
      const stationList = await getStations(true);
      setStations(stationList);

      if (stationList.length > 0 && selectedStationId === null) {
        setSelectedStationId(stationList[0].station_id);
      }

      // Fetch latest observation for each station in parallel
      const obsMap: Record<number, ObservationItem | null> = {};
      await Promise.all(
        stationList.map(async (st) => {
          try {
            const obsRes = await getObservations(st.station_id, { limit: 1 });
            obsMap[st.station_id] = obsRes.items.length > 0 ? obsRes.items[0] : null;
          } catch {
            obsMap[st.station_id] = null;
          }
        })
      );
      setLatestObservations(obsMap);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load spatial digital twin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedStation = stations.find((s) => s.station_id === selectedStationId) || null;

  return (
    <div className="page-container">
      {/* Header & Spatial Subtitle */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Pune Digital Twin</h1>
          <p className="page-subtitle">
            Spatial view of Pune environmental monitoring and urban exposure
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <ProvenanceBadge classification="OBSERVED" />
          <ProvenanceBadge classification="REANALYSIS" />
          <ProvenanceBadge classification="STATIC" />
        </div>
      </div>

      {/* Information Panel */}
      <div className="info-banner-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '0.85rem 1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
            <MapPin size={14} className="text-primary" />
            <span>Monitoring Stations</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stations.length || 6}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Continuous CAAQMN stations
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
            <Calendar size={14} className="text-primary" />
            <span>Analytical Period</span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            18 Feb 2025 → 24 Sep 2026
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            584 synchronized calendar days
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
            <Database size={14} className="text-primary" />
            <span>Data</span>
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            Observed PM2.5 + ERA5-Land + urban exposure
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Zero synthetic data; ground truth preserved
          </div>
        </div>
      </div>

      {/* Main Spatial Twin Layout */}
      {loading ? (
        <LoadingSpinner message="Loading spatial twin geometry and monitoring network..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={loadData} />
      ) : (
        <div className="digital-twin-grid">
          {/* Left Column: Interactive Map */}
          <div className="map-column">
            <div className="card map-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
              <PuneTwinMap
                stations={stations}
                selectedStationId={selectedStationId}
                onSelectStation={(id) => setSelectedStationId(id)}
                latestObservations={latestObservations}
                showTrafficBuffer={showTrafficBuffer}
                showActivityBuffer={showActivityBuffer}
              />

              {/* Overlay Map Legend */}
              <div className="map-legend-overlay">
                <MapLegend
                  showTrafficBuffer={showTrafficBuffer}
                  showActivityBuffer={showActivityBuffer}
                  onToggleTrafficBuffer={setShowTrafficBuffer}
                  onToggleActivityBuffer={setShowActivityBuffer}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Station Selector & Spatial Exposure Panel */}
          <div className="station-sidebar-column">
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={16} className="text-primary" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Pune Monitoring Network</h3>
                </div>
                <span className="badge badge-primary">{stations.length} Active</span>
              </div>

              {/* Station List Selector */}
              <div className="twin-station-list">
                {stations.map((station) => {
                  const isSelected = station.station_id === selectedStationId;
                  const obs = latestObservations[station.station_id];
                  const hasVal = obs && obs.pm25 !== null && obs.pm25 !== undefined;

                  return (
                    <div
                      key={station.station_id}
                      onClick={() => setSelectedStationId(station.station_id)}
                      className={`twin-station-item ${isSelected ? 'active' : ''}`}
                    >
                      <div className="twin-station-info">
                        <div className="twin-station-name">{station.station_name}</div>
                        <div className="twin-station-meta">
                          <span>ID: {station.station_id}</span>
                          <span>•</span>
                          <span>{station.monitoring_authority}</span>
                        </div>
                      </div>

                      <div className="twin-station-badge-col">
                        {hasVal ? (
                          <div className="twin-pm25-pill">
                            <span className="val">{formatNumber(obs.pm25, 1)}</span>
                            <span className="unit">µg/m³</span>
                          </div>
                        ) : (
                          <span className="badge badge-muted">NO DATA</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Station Summary Card */}
              {selectedStation && (
                <div className="selected-station-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Selected Station Details
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                        {selectedStation.station_name}
                      </div>
                    </div>
                    <span className="badge badge-success">ACTIVE</span>
                  </div>

                  <div className="selected-station-grid">
                    <div className="diag-stat">
                      <div className="diag-label">Station ID</div>
                      <div className="diag-val font-mono">{selectedStation.station_id}</div>
                    </div>
                    <div className="diag-stat">
                      <div className="diag-label">Zone Type</div>
                      <div className="diag-val">{selectedStation.zone_type}</div>
                    </div>
                    <div className="diag-stat">
                      <div className="diag-label">Authority</div>
                      <div className="diag-val">{selectedStation.monitoring_authority}</div>
                    </div>
                    <div className="diag-stat">
                      <div className="diag-label">Coordinates</div>
                      <div className="diag-val font-mono">
                        {selectedStation.latitude.toFixed(4)}°, {selectedStation.longitude.toFixed(4)}°
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <Link
                      to={`/stations/${selectedStation.station_id}`}
                      className="btn btn-primary btn-sm w-full"
                      style={{ justifyContent: 'center' }}
                    >
                      <span>Explore Station Diagnostics</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
