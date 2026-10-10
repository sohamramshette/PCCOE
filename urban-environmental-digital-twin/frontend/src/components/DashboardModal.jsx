import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStations } from '../api/stations';
import { getObservations } from '../api/observations';

const DEFAULT_STATIONS = {
  'Revenue Colony-Shivajinagar, Pune - IITM': { id: 11613, aqi: 142, pm25: 56, pm10: 124, no2: 44, band: 'Moderate', zone: 'Central Urban Core' },
  'Bhosari, Pune - IITM': { id: 3409331, aqi: 178, pm25: 78, pm10: 168, no2: 58, band: 'Poor', zone: 'Northern Industrial (PCMC)' },
  'Katraj Dairy, Pune - MPCB': { id: 3409438, aqi: 94, pm25: 36, pm10: 82, no2: 24, band: 'Satisfactory', zone: 'Southern Foothills' },
  'Mhada Colony, Pune - IITM': { id: 11609, aqi: 115, pm25: 48, pm10: 104, no2: 32, band: 'Moderate', zone: 'North-Eastern Corridor' },
  'Hadapsar, Pune - IITM': { id: 60658, aqi: 156, pm25: 65, pm10: 142, no2: 48, band: 'Moderate', zone: 'Eastern Commercial' },
  'Panchawati_Pashan, Pune - IITM': { id: 3409526, aqi: 86, pm25: 30, pm10: 70, no2: 18, band: 'Satisfactory', zone: 'Western Institutional' },
};

export default function DashboardModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [stationData, setStationData] = useState(DEFAULT_STATIONS);
  const [stationNames, setStationNames] = useState(Object.keys(DEFAULT_STATIONS));
  const [selectedStation, setSelectedStation] = useState('Revenue Colony-Shivajinagar, Pune - IITM');
  const [activeTab, setActiveTab] = useState('twin');
  const [transitReduction, setTransitReduction] = useState(25);
  const [evAdoption, setEvAdoption] = useState(40);

  useEffect(() => {
    let isCurrent = true;
    getStations(true)
      .then(async (stations) => {
        if (!stations || stations.length === 0 || !isCurrent) return;

        const updated = {};
        for (const st of stations) {
          try {
            const obs = await getObservations(st.station_id, { limit: 1, order: 'desc' });
            const latest = obs?.items?.[0];
            const pm25 = latest?.pm25 ?? 45;
            const pm10 = latest?.pm10 ?? (pm25 * 1.8);
            const aqi = pm25 <= 30 ? Math.round(pm25 * 1.6) : pm25 <= 60 ? Math.round(50 + (pm25 - 30) * 1.6) : Math.round(100 + (pm25 - 60) * 3.3);
            const band = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Satisfactory' : aqi <= 200 ? 'Moderate' : 'Poor';

            updated[st.station_name] = {
              id: st.station_id,
              aqi,
              pm25: Number(pm25.toFixed(1)),
              pm10: Number(pm10.toFixed(1)),
              no2: latest?.no2 ? Number(latest.no2.toFixed(1)) : 32,
              band,
              zone: st.zone_type || 'Pune Urban Area'
            };
          } catch {
            updated[st.station_name] = DEFAULT_STATIONS[st.station_name] || {
              id: st.station_id,
              aqi: 120,
              pm25: 50,
              pm10: 110,
              no2: 30,
              band: 'Moderate',
              zone: st.zone_type || 'Pune Urban Area'
            };
          }
        }
        if (isCurrent && Object.keys(updated).length > 0) {
          setStationData(updated);
          setStationNames(Object.keys(updated));
          setSelectedStation(Object.keys(updated)[0]);
        }
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, []);

  if (!isOpen) return null;

  const curr = stationData[selectedStation] || stationData[stationNames[0]] || DEFAULT_STATIONS['Revenue Colony-Shivajinagar, Pune - IITM'];
  const simulatedPm25 = Math.round(curr.pm25 * (1 - (transitReduction * 0.005) - (evAdoption * 0.004)));
  const simulatedAqi = Math.round(curr.aqi * (1 - (transitReduction * 0.004) - (evAdoption * 0.003)));
  const deltaPct = Math.round(((simulatedPm25 - curr.pm25) / curr.pm25) * 100);

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="dashboard-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dashboard-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="modal-top-bar">
          <div className="modal-title-group">
            <span className="modal-brand">AirLens</span>
            <span className="modal-twin-badge">
              <span className="modal-live-blink"></span>
              LIVE TWIN · PUNE & PCMC
            </span>
          </div>

          <div className="modal-tab-group">
            <button
              type="button"
              className={`modal-tab ${activeTab === 'twin' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('twin')}
            >
              Live Telemetry
            </button>
            <button
              type="button"
              className={`modal-tab ${activeTab === 'sim' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('sim')}
            >
              Policy Simulator
            </button>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dashboard modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body-content">
          {/* Station Selector Strip */}
          <div className="modal-station-selector">
            <span className="selector-label">SELECT SENSOR NODE:</span>
            <div className="selector-pills-row">
              {stationNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`station-select-pill ${selectedStation === name ? 'is-active' : ''}`}
                  onClick={() => setSelectedStation(name)}
                >
                  {name.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'twin' ? (
            /* Live Monitoring View */
            <div className="modal-twin-view">
              <div className="twin-telemetry-card">
                <div className="station-meta-strip">
                  <div>
                    <h3 className="meta-station-title">{selectedStation}</h3>
                    <span className="meta-station-zone">{curr.zone}</span>
                  </div>
                  <div className="meta-aqi-stamp">
                    <span className="stamp-val">{curr.aqi}</span>
                    <span className="stamp-lbl">AQI ({curr.band})</span>
                  </div>
                </div>

                <div className="metrics-triad-grid">
                  <div className="triad-box">
                    <span className="triad-label">PM2.5 Ambient</span>
                    <span className="triad-val">{curr.pm25} <small>µg/m³</small></span>
                    <span className="triad-sub">Continuous BAM Sensor</span>
                  </div>
                  <div className="triad-box">
                    <span className="triad-label">PM10 Coarse</span>
                    <span className="triad-val">{curr.pm10} <small>µg/m³</small></span>
                    <span className="triad-sub">Optical Particle Counter</span>
                  </div>
                  <div className="triad-box">
                    <span className="triad-label">Nitrogen Dioxide (NO2)</span>
                    <span className="triad-val">{curr.no2} <small>ppb</small></span>
                    <span className="triad-sub">Combustion Exhaust</span>
                  </div>
                </div>

                <div className="modal-cta-row" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn-primary-muted-green"
                    onClick={() => handleNavigate('/dashboard')}
                    style={{ flex: 1 }}
                  >
                    Launch Full Analytics Dashboard →
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-subtle"
                    onClick={() => handleNavigate(`/stations/${curr.id || 11613}`)}
                  >
                    Station History
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Scenario Simulation View */
            <div className="modal-sim-view">
              <div className="sim-controls-panel">
                <h4 className="sim-panel-title">Counterfactual Policy Interventions</h4>

                <div className="sim-slider-row">
                  <div className="slider-label-line">
                    <span>Public Transit Expansion / Traffic Reduction:</span>
                    <span className="slider-val-tag">-{transitReduction}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={transitReduction}
                    onChange={(e) => setTransitReduction(Number(e.target.value))}
                    className="airlens-range-input"
                  />
                </div>

                <div className="sim-slider-row">
                  <div className="slider-label-line">
                    <span>Clean Fleet / Commercial EV Adoption:</span>
                    <span className="slider-val-tag">+{evAdoption}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={evAdoption}
                    onChange={(e) => setEvAdoption(Number(e.target.value))}
                    className="airlens-range-input"
                  />
                </div>

                <div className="sim-results-comparison" style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(22, 30, 21, 0.7)', borderRadius: '14px', border: '1px solid rgba(163, 181, 147, 0.18)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(238, 241, 231, 0.6)' }}>Baseline PM2.5:</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#eef1e7' }}>{curr.pm25} µg/m³</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#a3b593' }}>Intervention Impact:</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8fa07e' }}>{deltaPct}%</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(238, 241, 231, 0.6)' }}>Simulated PM2.5:</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#8fa07e' }}>{simulatedPm25} µg/m³</div>
                    </div>
                  </div>
                </div>

                <div className="modal-cta-row" style={{ marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn-primary-muted-green btn-full-width"
                    onClick={() => handleNavigate('/scenarios')}
                  >
                    Open Full Counterfactual Scenario Simulator →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
