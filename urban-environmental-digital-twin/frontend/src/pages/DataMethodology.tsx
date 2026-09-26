import React from 'react';
import {
  Database,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
  Info,
  CheckCircle,
} from 'lucide-react';
import {
  DATA_SOURCE_CLASSIFICATIONS,
  FEATURE_DOMAINS,
  DATA_PROCESSING_PIPELINE,
} from '../data/methodologyData';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';

export const DataMethodology: React.FC = () => {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-observed">DATA GOVERNANCE</span>
            <ProvenanceBadge classification="OBSERVED" />
            <ProvenanceBadge classification="REANALYSIS" />
          </div>
          <h1 className="page-title">Data Architecture & Methodology</h1>
          <p className="page-subtitle">
            Scientific data provenance, multi-domain feature engineering, and temporal pipeline specifications
          </p>
        </div>
      </div>

      {/* Section A: Master Dataset Overview */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <Database size={18} className="text-primary" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Master Analytical Dataset Overview</h3>
        </div>

        <div className="stat-grid" style={{ marginBottom: '1rem' }}>
          <div className="stat-tile">
            <div className="stat-label">Master Analytical Grain</div>
            <div className="stat-value" style={{ fontSize: '1.15rem', color: 'var(--primary)' }}>
              (station_id, datetime_utc)
            </div>
            <div className="stat-subtext">Unbroken 1-hour analytical intervals</div>
          </div>

          <div className="stat-tile">
            <div className="stat-label">Total Station-Hour Records</div>
            <div className="stat-value">
              84,096 <span className="stat-unit">rows</span>
            </div>
            <div className="stat-subtext">6 stations × 14,016 contiguous hours</div>
          </div>

          <div className="stat-tile">
            <div className="stat-label">Synchronized Analytical Window</div>
            <div className="stat-value" style={{ fontSize: '1.15rem' }}>
              584 <span className="stat-unit">calendar days</span>
            </div>
            <div className="stat-subtext">2025-02-18 00:00 UTC → 2026-09-24 23:00 UTC</div>
          </div>

          <div className="stat-tile">
            <div className="stat-label">Feature Dimension</div>
            <div className="stat-value">
              70 / 118 <span className="stat-unit">cols</span>
            </div>
            <div className="stat-subtext">70 integrated master / 118 engineered</div>
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          The analytical horizon spans exactly 584 synchronized calendar days across six continuous ambient air quality monitoring stations in the Pune and Pimpri-Chinchwad municipal corporations. The dataset deliberately reflects the empirical 584-day period and is not described as generic annual cycles.
        </div>
      </div>

      {/* Section B: Data Source Classification Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Layers size={16} className="text-primary" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Multi-Source Data Provenance Classification</h3>
          </div>
          <span className="badge badge-primary">8 Ingested Layers</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data Source</th>
                <th>Classification</th>
                <th>Analytical Role in Digital Twin</th>
                <th>Update Frequency</th>
                <th>Spatial Coverage / Buffer</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SOURCE_CLASSIFICATIONS.map((src, idx) => (
                <tr key={idx}>
                  <td><strong>{src.sourceName}</strong></td>
                  <td><ProvenanceBadge classification={src.classification} /></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{src.role}</td>
                  <td style={{ fontSize: '0.78rem' }}>{src.updateFrequency}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{src.coverage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section C: PM2.5 Data Quality & Completeness */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <ShieldCheck size={16} className="text-primary" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>PM2.5 Sensor Data Quality & Missingness Policy</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Valid Ground Observations</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary)' }}>63,019</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>74.94% capture rate across network</div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Missing Sensor Dropouts</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f59e0b' }}>21,077</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>25.06% physical sensor downtime / maintenance</div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Regulatory Quality Flags</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
              <span className="badge badge-success">COMPLETE</span>
              <span className="badge badge-primary">PARTIAL</span>
              <span className="badge badge-warning">INSUFFICIENT</span>
              <span className="badge badge-muted">MISSING</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>CPCB 15-minute sub-sample completeness</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(6, 182, 212, 0.06)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.85rem 1rem',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
          }}
        >
          <strong>Scientific Target Imputation Policy:</strong> True physical sensor dropouts, electrical power outages, and CPCB CAAQMS recalibration cycles are preserved as <code>NaN</code>. Ground-truth target values are <strong>never artificially imputed</strong> for supervised machine learning training or historical validation.
        </div>
      </div>

      {/* Section E: Visual Data Processing Pipeline */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileText size={16} className="text-primary" />
          <span>End-to-End Data Processing Pipeline</span>
        </h3>

        <div className="methodology-pipeline-grid">
          {DATA_PROCESSING_PIPELINE.map((stage, idx) => (
            <div key={stage.id} className="pipeline-step-card">
              <div className="pipeline-step-header">
                <span className="pipeline-step-num">Step {stage.id}</span>
                {idx < DATA_PROCESSING_PIPELINE.length - 1 && (
                  <ArrowRight size={14} className="pipeline-step-arrow" />
                )}
              </div>
              <div className="pipeline-step-title">{stage.name}</div>
              <div className="pipeline-step-desc">{stage.description}</div>
              <div className="pipeline-step-artifact font-mono">{stage.outputArtifact}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section D: Feature Engineering Taxonomy */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Feature Store Architecture (118 Columns)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              10 structured feature domains with rigorous time-series leakage protection
            </p>
          </div>
          <span className="badge badge-success">5/5 Leakage Checks Passed</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          {FEATURE_DOMAINS.map((domain, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{domain.domain}</span>
                <span className="badge badge-primary">{domain.columnCount} cols</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', lineHeight: 1.4 }}>
                {domain.description}
              </p>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <code>{domain.examples.join(', ')}</code>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          • Leakage Audits: Verified that target values at $t+1$ are absent from feature inputs at time $t$. First chronological row per station has <code>NaN</code> lag (no cross-station lag leak), and last chronological row per station has <code>NaN</code> target (no cross-station target leak).
        </div>
      </div>

      {/* Section F: Observed vs Derived vs Proxy (Scientific Transparency Panel) */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Info size={16} className="text-primary" />
          <span>Epistemological Data Modes: Observed vs Reanalysis vs Proxy vs Derived</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <div style={{ marginBottom: '0.35rem' }}><ProvenanceBadge classification="OBSERVED" /></div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Physical Ground Observations</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Actual in-situ PM2.5 measurements obtained from continuous environmental monitoring stations. Zero synthetic interpolation.
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <div style={{ marginBottom: '0.35rem' }}><ProvenanceBadge classification="REANALYSIS" /></div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Atmospheric Reanalysis</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              ECMWF ERA5-Land assimilated synoptic weather. Reanalysis provides high spatial-temporal continuity but is not on-site mast measurement.
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <div style={{ marginBottom: '0.35rem' }}><ProvenanceBadge classification="STATIC" /></div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Spatial Infrastructure</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              OpenStreetMap road buffers, industrial facility counts, and zoning polygons. Represents constant spatial context during the study window.
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <div style={{ marginBottom: '0.35rem' }}><ProvenanceBadge classification="TRAFFIC_PROXY" /></div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Diurnal Proxies</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Empirically shaped diurnal mobility profiles. Used because continuous real-time camera counts are unavailable. Not direct vehicle counts.
            </div>
          </div>
        </div>
      </div>

      {/* Section G: Methodology Notes & Scientific Guarantees */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <CheckCircle size={16} className="text-primary" />
          <span>Core Methodological Principles & Scientific Guarantees</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div style={{ padding: '0.5rem 0' }}>
            <strong style={{ color: 'var(--text-primary)' }}>1. Strict UTC Timestamps:</strong> All analytical pipelines, database records, and ML models operate strictly on UTC timestamps. Local IST displays are purely presentation-layer conversions.
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            <strong style={{ color: 'var(--text-primary)' }}>2. Chronological Split:</strong> Train (Feb 2025–Mar 2026), Validation (Apr–Jun 2026), and Test (Jul–Sep 2026) are strictly forward-looking blocks with zero temporal leakage.
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            <strong style={{ color: 'var(--text-primary)' }}>3. Raw Data Preservation:</strong> Ingested raw datasets in <code>data/raw/</code> and canonical database records remain immutable and read-only.
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            <strong style={{ color: 'var(--text-primary)' }}>4. Counterfactual Isolation:</strong> What-If scenario simulations run in-memory and persist to separate tables; source ground observations are never overwritten.
          </div>
        </div>
      </div>
    </div>
  );
};
