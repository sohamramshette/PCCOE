import React from 'react';
import { Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { CoordinateInterpolationResponse } from '../../types/spatial';

interface CustomPointInspectorProps {
  inspectionResult: CoordinateInterpolationResponse | null;
  onMapClick: (lat: number, lon: number) => void;
  onClear: () => void;
}

export const CustomPointInspector: React.FC<CustomPointInspectorProps> = ({
  inspectionResult,
  onMapClick,
  onClear,
}) => {
  // Listen for user clicks across the Leaflet canvas
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  if (!inspectionResult) {
    return null;
  }

  const inspectorIcon = L.divIcon({
    className: 'custom-inspector-marker-wrapper',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${inspectionResult.color};
        border: 3px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #1e293b;
        font-weight: 800;
        font-size: 11px;
      ">
        ⌖
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

  return (
    <Marker
      position={[inspectionResult.latitude, inspectionResult.longitude]}
      icon={inspectorIcon}
    >
      <Popup autoPan={true} maxWidth={320}>
        <div style={{ padding: '8px 4px', minWidth: '260px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>
              Spatial Pinpoint Estimation
            </span>
            <button
              onClick={onClear}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0 4px',
              }}
              title="Close inspection"
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: inspectionResult.color }}>
              {inspectionResult.interpolated_pm25}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>µg/m³ PM2.5</span>
            <span
              style={{
                marginLeft: 'auto',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: `${inspectionResult.color}25`,
                color: inspectionResult.color,
                border: `1px solid ${inspectionResult.color}50`,
              }}
            >
              {inspectionResult.aqi_category}
            </span>
          </div>

          <div style={{ fontSize: '11px', color: '#475569', marginBottom: '10px' }}>
            Coord: {inspectionResult.latitude.toFixed(4)}°N, {inspectionResult.longitude.toFixed(4)}°E
            <span style={{ marginLeft: '6px', color: '#059669', fontWeight: 600 }}>
              ({Math.round(inspectionResult.confidence_score * 100)}% confidence)
            </span>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Sensor Spatial Weight Attribution:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {inspectionResult.contributing_stations.slice(0, 3).map((st) => (
                <div key={st.station_id} style={{ fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: '2px' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                      {st.station_name.split(',')[0]} ({st.distance_km} km)
                    </span>
                    <span style={{ fontWeight: 600 }}>{st.weight_percentage}%</span>
                  </div>
                  <div style={{ height: '4px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${st.weight_percentage}%`,
                        backgroundColor: '#3b82f6',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
            Computed via 2D Inverse Distance Weighting (IDW)
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
