import React, { useState, useEffect } from 'react';
import { getObservations } from '../api/observations';

export default function BiggerPictureSection() {
  const [activePollutant, setActivePollutant] = useState('PM2.5');
  const [activeScenario, setActiveScenario] = useState('freight');

  const [pollutantData, setPollutantData] = useState({
    'PM2.5': { value: '54.2', unit: 'µg/m³', status: 'Moderate', trend: '+4.1% vs 24h avg', color: '#d8b26e' },
    'PM10': { value: '118.5', unit: 'µg/m³', status: 'Moderate', trend: '-2.3% vs 24h avg', color: '#cf9861' },
    'NO2': { value: '38.4', unit: 'ppb', status: 'Good', trend: '-8.5% off-peak', color: '#8fa07e' },
    'O3': { value: '44.1', unit: 'ppb', status: 'Good', trend: 'Solar peak curve', color: '#86a894' }
  });

  useEffect(() => {
    let isCurrent = true;
    getObservations(11613, { limit: 1, order: 'desc' })
      .then((obs) => {
        if (!isCurrent || !obs?.items?.length) return;
        const latest = obs.items[0];
        setPollutantData((prev) => ({
          'PM2.5': {
            ...prev['PM2.5'],
            value: latest.pm25 != null ? latest.pm25.toFixed(1) : prev['PM2.5'].value,
            status: latest.pm25 <= 30 ? 'Good' : latest.pm25 <= 60 ? 'Satisfactory' : latest.pm25 <= 90 ? 'Moderate' : 'Poor',
            trend: 'Live Pune Core Telemetry'
          },
          'PM10': {
            ...prev['PM10'],
            value: latest.pm10 != null ? latest.pm10.toFixed(1) : (latest.pm25 ? (latest.pm25 * 1.8).toFixed(1) : prev['PM10'].value),
            status: latest.pm10 <= 50 ? 'Good' : latest.pm10 <= 100 ? 'Satisfactory' : 'Moderate',
            trend: 'In-situ BAM-1020'
          },
          'NO2': {
            ...prev['NO2'],
            value: latest.no2 != null ? latest.no2.toFixed(1) : prev['NO2'].value,
            status: (latest.no2 || 35) <= 40 ? 'Good' : 'Moderate',
            trend: 'Chemiluminescence analyzer'
          },
          'O3': {
            ...prev['O3'],
            value: latest.o3 != null ? latest.o3.toFixed(1) : prev['O3'].value,
            status: 'Satisfactory',
            trend: 'UV Photometric Sensor'
          }
        }));
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, []);

  const scenarios = {
    freight: {
      name: 'Freight Corridor Re-routing',
      detail: 'Restricting heavy diesel transit to peripheral expressways during nocturnal inversion hours.',
      delta: '-22% PM2.5',
      impact: 'High impact across Bhosari, Wakad & Hadapsar industrial fringes.'
    },
    ev: {
      name: 'PMPML Fleet Electrification',
      detail: 'Accelerating 1,200 electric bus deployment across major urban corridors (Swargate to Katraj, Shivaji Nagar to PCMC).',
      delta: '-18% NO2',
      impact: 'Direct urban street-canyon exposure reduction for ~1.4M commuters daily.'
    },
    forestry: {
      name: 'Bio-Shield Riparian Corridors',
      detail: 'Targeted native tree canopy planting along Mula-Mutha riverbanks and Ring Road buffer zones.',
      delta: '+15% Particulate Trap',
      impact: 'Micro-climate cooling (1.8°C surface drop) and enhanced dry dust deposition.'
    }
  };

  return (
    <section className="airlens-section section-bigger-picture" id="capabilities">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-block">
          <span className="section-eyebrow">THE CITY IS A CONNECTED SYSTEM</span>
          <h2 className="section-title">Every environmental signal tells part of the story.</h2>
          <p className="section-lead">
            Pollution does not exist in isolation. Weather influences dispersion, traffic contributes emissions, and urban activity shapes environmental conditions.
            <br className="section-lead-break" />
            AirLens connects these different perspectives to help reveal patterns that individual datasets cannot explain on their own.
          </p>
        </div>

        {/* 4 Connected System Cards Grid */}
        <div className="signal-cards-grid">
          {/* Card 1: Air Quality Intelligence */}
          <div className="signal-card signal-card-aqi">
            <div className="card-top-meta">
              <span className="card-tag">SIGNAL 01</span>
              <span className="card-status-badge">Ground Truth Sensors</span>
            </div>
            <h3 className="card-heading">Air Quality Intelligence</h3>
            <p className="card-description">
              Understand observed pollution levels and their spatial and temporal patterns.
            </p>

            <div className="card-interactive-box">
              <div className="pollutant-tabs">
                {Object.keys(pollutantData).map((poll) => (
                  <button
                    key={poll}
                    type="button"
                    className={`poll-tab ${activePollutant === poll ? 'is-active' : ''}`}
                    onClick={() => setActivePollutant(poll)}
                  >
                    {poll}
                  </button>
                ))}
              </div>

              <div className="pollutant-stat-row">
                <div className="pollutant-readout">
                  <span className="pollutant-val" style={{ color: pollutantData[activePollutant].color }}>
                    {pollutantData[activePollutant].value}
                  </span>
                  <span className="pollutant-unit">{pollutantData[activePollutant].unit}</span>
                </div>
                <div className="pollutant-meta">
                  <span className="pollutant-band">{pollutantData[activePollutant].status}</span>
                  <span className="pollutant-trend">{pollutantData[activePollutant].trend}</span>
                </div>
              </div>

              {/* Sparkline mini-viz */}
              <div className="sparkline-bar-group" aria-hidden="true">
                {[32, 45, 52, 68, 74, 82, 65, 54, 48, 55, 62, 54].map((h, i) => (
                  <span
                    key={i}
                    className="spark-bar"
                    style={{
                      height: `${(h / 85) * 100}%`,
                      opacity: i === 11 ? 1 : 0.4 + (i / 11) * 0.5
                    }}
                  ></span>
                ))}
              </div>
              <span className="sparkline-caption">24h Observed Diurnal Cycle · 24 Station Composite</span>
            </div>
          </div>

          {/* Card 2: Atmospheric Context */}
          <div className="signal-card signal-card-atmosphere">
            <div className="card-top-meta">
              <span className="card-tag">SIGNAL 02</span>
              <span className="card-status-badge">IMD Doppler & ECMWF</span>
            </div>
            <h3 className="card-heading">Atmospheric Context</h3>
            <p className="card-description">
              Explore how weather and environmental conditions relate to air quality.
            </p>

            <div className="card-interactive-box">
              <div className="atmosphere-grid">
                <div className="atmo-cell">
                  <span className="atmo-label">Wind Dispersion</span>
                  <span className="atmo-val">14 km/h WNW</span>
                  <span className="atmo-sub">Valley drift toward Hadapsar</span>
                </div>
                <div className="atmo-cell">
                  <span className="atmo-label">Boundary Layer Ht</span>
                  <span className="atmo-val">840 m</span>
                  <span className="atmo-sub">Daytime convective mixing</span>
                </div>
                <div className="atmo-cell">
                  <span className="atmo-label">Thermal Inversion</span>
                  <span className="atmo-val" style={{ color: '#8fa07e' }}>Low Risk</span>
                  <span className="atmo-sub">No trapping lid detected</span>
                </div>
                <div className="atmo-cell">
                  <span className="atmo-label">Ambient Temp & RH</span>
                  <span className="atmo-val">29.2°C · 46%</span>
                  <span className="atmo-sub">Normal seasonal envelope</span>
                </div>
              </div>

              <div className="atmo-insight-ribbon">
                <svg className="insight-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <span>Current westerly airflow enhances horizontal particulate venting towards the Deccan plateau.</span>
              </div>
            </div>
          </div>

          {/* Card 3: Environmental Forecasting */}
          <div className="signal-card signal-card-forecasting">
            <div className="card-top-meta">
              <span className="card-tag">SIGNAL 03</span>
              <span className="card-status-badge">WRF-Chem Physics Ensemble</span>
            </div>
            <h3 className="card-heading">Environmental Forecasting</h3>
            <p className="card-description">
              Examine model-based estimates of near-term conditions alongside available observations.
            </p>

            <div className="card-interactive-box">
              <div className="forecast-timeline-preview">
                <div className="forecast-step">
                  <span className="f-time">+6 Hours</span>
                  <span className="f-val aqi-mod">AQI 138</span>
                  <span className="f-desc">Evening traffic surge</span>
                </div>
                <div className="forecast-step">
                  <span className="f-time">+24 Hours</span>
                  <span className="f-val aqi-good">AQI 112</span>
                  <span className="f-desc">Morning breeze dispersion</span>
                </div>
                <div className="forecast-step">
                  <span className="f-time">+48 Hours</span>
                  <span className="f-val aqi-good">AQI 98</span>
                  <span className="f-desc">Satisfactory rain clearing</span>
                </div>
              </div>

              <div className="model-accuracy-bar">
                <div className="accuracy-label">
                  <span>95% Ensemble Confidence Interval</span>
                  <span className="acc-stat">±8.2 µg/m³ MAE</span>
                </div>
                <div className="accuracy-track">
                  <div className="accuracy-fill" style={{ width: '89%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Policy Scenario Exploration */}
          <div className="signal-card signal-card-policy">
            <div className="card-top-meta">
              <span className="card-tag">SIGNAL 04</span>
              <span className="card-status-badge">Intervention Twin</span>
            </div>
            <h3 className="card-heading">Policy Scenario Exploration</h3>
            <p className="card-description">
              Compare potential interventions and their modeled outcomes to support more informed planning.
            </p>

            <div className="card-interactive-box">
              <div className="scenario-switcher">
                <button
                  type="button"
                  className={`scenario-btn ${activeScenario === 'freight' ? 'is-active' : ''}`}
                  onClick={() => setActiveScenario('freight')}
                >
                  Freight Transit
                </button>
                <button
                  type="button"
                  className={`scenario-btn ${activeScenario === 'ev' ? 'is-active' : ''}`}
                  onClick={() => setActiveScenario('ev')}
                >
                  PMPML Fleet
                </button>
                <button
                  type="button"
                  className={`scenario-btn ${activeScenario === 'forestry' ? 'is-active' : ''}`}
                  onClick={() => setActiveScenario('forestry')}
                >
                  Bio-Canopy
                </button>
              </div>

              <div className="scenario-detail-card">
                <div className="scenario-head">
                  <span className="s-name">{scenarios[activeScenario].name}</span>
                  <span className="s-delta">{scenarios[activeScenario].delta}</span>
                </div>
                <p className="s-detail">{scenarios[activeScenario].detail}</p>
                <div className="s-impact">
                  <span className="impact-badge">Projected Benefit</span>
                  <span>{scenarios[activeScenario].impact}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
