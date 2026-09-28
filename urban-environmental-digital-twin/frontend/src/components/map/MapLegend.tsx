import React from 'react';
import { Layers, Info } from 'lucide-react';

interface MapLegendProps {
  showTrafficBuffer: boolean;
  showActivityBuffer: boolean;
  onToggleTrafficBuffer?: (val: boolean) => void;
  onToggleActivityBuffer?: (val: boolean) => void;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  showTrafficBuffer,
  showActivityBuffer,
  onToggleTrafficBuffer,
  onToggleActivityBuffer,
}) => {
  return (
    <div className="map-legend-card">
      <div className="map-legend-header">
        <Layers size={14} className="text-primary" />
        <span className="map-legend-title">Map Layers & Legend</span>
      </div>

      <div className="map-legend-items">
        {/* Layer 1: Monitoring Stations (Active) */}
        <div className="map-legend-item">
          <div className="map-marker-dot active" />
          <div className="map-legend-text">
            <div className="legend-label">Monitoring Stations</div>
            <div className="legend-sub">6 ground stations (OBSERVED)</div>
          </div>
          <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
            Active
          </span>
        </div>

        {/* Layer 2: 1.5 km Traffic Exposure Buffer (Derived from static GIS) */}
        <label className="map-legend-item cursor-pointer">
          <input
            type="checkbox"
            checked={showTrafficBuffer}
            onChange={(e) => onToggleTrafficBuffer?.(e.target.checked)}
            style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '2px solid #2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.12)',
            }}
          />
          <div className="map-legend-text">
            <div className="legend-label">1.5 km Road Exposure Buffer</div>
            <div className="legend-sub">Static spatial radius (STATIC)</div>
          </div>
        </label>

        {/* Layer 3: 2.0 km Activity Exposure Buffer (Derived from static GIS) */}
        <label className="map-legend-item cursor-pointer">
          <input
            type="checkbox"
            checked={showActivityBuffer}
            onChange={(e) => onToggleActivityBuffer?.(e.target.checked)}
            style={{ accentColor: 'var(--warning)', cursor: 'pointer' }}
          />
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '2px solid #f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
            }}
          />
          <div className="map-legend-text">
            <div className="legend-label">2.0 km Activity Buffer</div>
            <div className="legend-sub">Industrial & POI zone (STATIC)</div>
          </div>
        </label>

        {/* Deferred Layer 4: Vector Road Network Lines */}
        <div className="map-legend-item opacity-60">
          <input type="checkbox" disabled />
          <div style={{ width: 14, height: 2, backgroundColor: '#94a3b8' }} />
          <div className="map-legend-text">
            <div className="legend-label">Road Network Geometry</div>
            <div className="legend-sub">Requires vector GeoJSON API</div>
          </div>
          <span className="badge badge-muted" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
            Planned
          </span>
        </div>

        {/* Deferred Layer 5: Industrial Footprint Polygons */}
        <div className="map-legend-item opacity-60">
          <input type="checkbox" disabled />
          <div style={{ width: 12, height: 12, border: '1px dashed #94a3b8' }} />
          <div className="map-legend-text">
            <div className="legend-label">Industrial Footprints</div>
            <div className="legend-sub">Requires spatial polygon API</div>
          </div>
          <span className="badge badge-muted" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
            Planned
          </span>
        </div>
      </div>

      {/* CPCB NAQI Heatmap Color Legend */}
      <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
          <span>CPCB NAQI Breakpoints (PM2.5)</span>
          <span style={{ fontSize: '9px', color: '#64748b' }}>µg/m³</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', fontSize: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#00E400', flexShrink: 0 }} />
            <span style={{ color: '#166534', fontWeight: 600 }}>Good (0–30)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#92D050', flexShrink: 0 }} />
            <span style={{ color: '#3f6212', fontWeight: 600 }}>Satisfactory (31–60)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#FFFF00', flexShrink: 0, border: '1px solid #ca8a04' }} />
            <span style={{ color: '#854d0e', fontWeight: 600 }}>Moderate (61–90)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#FF7E00', flexShrink: 0 }} />
            <span style={{ color: '#9a3412', fontWeight: 600 }}>Poor (91–120)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#FF0000', flexShrink: 0 }} />
            <span style={{ color: '#991b1b', fontWeight: 600 }}>Very Poor (121–250)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#7E0023', flexShrink: 0 }} />
            <span style={{ color: '#581c87', fontWeight: 600 }}>Severe (&gt;250)</span>
          </div>
        </div>
      </div>

      <div className="map-legend-footer">
        <Info size={12} />
        <span>OSM Basemap &copy; OpenStreetMap contributors</span>
      </div>
    </div>
  );
};
