import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Station } from '../../types/station';
import { ObservationItem } from '../../types/observation';
import { InterpolatedGridPoint, CoordinateInterpolationResponse } from '../../types/spatial';
import { AlertItem } from '../../types/alert';
import { StationMarker } from './StationMarker';
import { SpatialHeatmapLayer } from './SpatialHeatmapLayer';
import { CustomPointInspector } from './CustomPointInspector';

interface MapControllerProps {
  selectedStation: Station | null;
  stations: Station[];
}

const MapController: React.FC<MapControllerProps> = ({ selectedStation, stations }) => {
  const map = useMap();
  const initialFittedRef = useRef<boolean>(false);
  const prevSelectedStationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!initialFittedRef.current && stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map((s) => [s.latitude, s.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
      initialFittedRef.current = true;
      if (selectedStation) {
        prevSelectedStationIdRef.current = selectedStation.station_id;
      }
      return;
    }

    if (selectedStation && selectedStation.station_id !== prevSelectedStationIdRef.current) {
      prevSelectedStationIdRef.current = selectedStation.station_id;
      map.flyTo([selectedStation.latitude, selectedStation.longitude], 13, {
        duration: 1.2,
      });
    } else if (!selectedStation && stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map((s) => [s.latitude, s.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [selectedStation, stations, map]);

  return null;
};

interface PuneTwinMapProps {
  stations: Station[];
  selectedStationId: number | null;
  onSelectStation: (stationId: number) => void;
  latestObservations: Record<number, ObservationItem | null>;
  alertsByStation?: Record<number, AlertItem[]>;
  outageStationIds?: number[];
  showTrafficBuffer: boolean;
  showActivityBuffer: boolean;
  showHeatmap?: boolean;
  heatmapGridPoints?: InterpolatedGridPoint[];
  customInspectionResult?: CoordinateInterpolationResponse | null;
  onMapClickCoordinate?: (lat: number, lon: number) => void;
  onClearCustomInspection?: () => void;
  disablePopup?: boolean;
}

export const PuneTwinMap: React.FC<PuneTwinMapProps> = ({
  stations,
  selectedStationId,
  onSelectStation,
  latestObservations,
  alertsByStation = {},
  outageStationIds = [],
  showTrafficBuffer,
  showActivityBuffer,
  showHeatmap = false,
  heatmapGridPoints = [],
  customInspectionResult = null,
  onMapClickCoordinate,
  onClearCustomInspection,
  disablePopup = false,
}) => {
  // Center of PCMC / Pune air quality monitoring network
  const defaultCenter: [number, number] = [18.64, 73.80];
  const defaultZoom = 11;

  const selectedStation = stations.find((s) => s.station_id === selectedStationId) || null;

  return (
    <div className="pune-map-wrapper">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="pune-leaflet-container"
      >
        {/* OpenStreetMap Base Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Camera Controller to pan/zoom smoothly */}
        <MapController selectedStation={selectedStation} stations={stations} />

        {/* 2D IDW Spatial Air Quality Heatmap Layer */}
        <SpatialHeatmapLayer
          gridPoints={heatmapGridPoints}
          visible={showHeatmap}
        />

        {/* Pinpoint Coordinate Inspector on Map Click */}
        {onMapClickCoordinate && (
          <CustomPointInspector
            inspectionResult={customInspectionResult}
            onMapClick={onMapClickCoordinate}
            onClear={onClearCustomInspection || (() => {})}
          />
        )}

        {/* Render 6 Monitoring Stations */}
        {stations.map((station) => {
          const isOutage = outageStationIds.includes(station.station_id);
          return (
            <StationMarker
              key={station.station_id}
              station={station}
              isSelected={station.station_id === selectedStationId}
              isOutage={isOutage}
              latestObservation={isOutage ? null : latestObservations[station.station_id]}
              alerts={alertsByStation[station.station_id] || []}
              onSelect={onSelectStation}
              showTrafficBuffer={showTrafficBuffer}
              showActivityBuffer={showActivityBuffer}
              disablePopup={disablePopup}
            />
          );
        })}
      </MapContainer>
    </div>
  );
};

