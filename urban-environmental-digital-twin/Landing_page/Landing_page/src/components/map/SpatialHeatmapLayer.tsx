import React from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import { InterpolatedGridPoint } from '../../types/spatial';

interface SpatialHeatmapLayerProps {
  gridPoints: InterpolatedGridPoint[];
  visible: boolean;
  onSelectPoint?: (point: InterpolatedGridPoint) => void;
}

export const SpatialHeatmapLayer: React.FC<SpatialHeatmapLayerProps> = ({
  gridPoints,
  visible,
  onSelectPoint,
}) => {
  if (!visible || !gridPoints || gridPoints.length === 0) {
    return null;
  }

  return (
    <>
      {gridPoints.map((point, idx) => (
        <CircleMarker
          key={`idw-grid-${idx}-${point.lat}-${point.lon}`}
          center={[point.lat, point.lon]}
          radius={11}
          pathOptions={{
            fillColor: point.color,
            fillOpacity: Math.max(0.35, point.confidence * 0.7),
            stroke: true,
            color: point.color,
            weight: 0.5,
            opacity: 0.4,
          }}
          eventHandlers={{
            click: () => {
              if (onSelectPoint) {
                onSelectPoint(point);
              }
            },
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
            <div style={{ padding: '4px 6px', fontSize: '12px', minWidth: '150px' }}>
              <div style={{ fontWeight: 600, marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Estimated PM2.5:</span>
                <span style={{ color: point.color, fontWeight: 700 }}>
                  {point.pm25} µg/m³
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: point.color,
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {point.aqi_category}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#94a3b8' }}>
                  {Math.round(point.confidence * 100)}% conf
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '3px' }}>
                Nearest: {point.nearest_station_name} ({point.distance_to_nearest_km} km)
              </div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
};
