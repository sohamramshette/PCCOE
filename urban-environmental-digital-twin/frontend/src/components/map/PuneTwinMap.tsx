import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Station } from '../../types/station';
import { ObservationItem } from '../../types/observation';
import { StationMarker } from './StationMarker';

interface MapControllerProps {
  selectedStation: Station | null;
  stations: Station[];
}

const MapController: React.FC<MapControllerProps> = ({ selectedStation, stations }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedStation) {
      map.flyTo([selectedStation.latitude, selectedStation.longitude], 13, {
        duration: 1.2,
      });
    } else if (stations.length > 0) {
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
  showTrafficBuffer: boolean;
  showActivityBuffer: boolean;
}

export const PuneTwinMap: React.FC<PuneTwinMapProps> = ({
  stations,
  selectedStationId,
  onSelectStation,
  latestObservations,
  showTrafficBuffer,
  showActivityBuffer,
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

        {/* Render 6 Monitoring Stations */}
        {stations.map((station) => (
          <StationMarker
            key={station.station_id}
            station={station}
            isSelected={station.station_id === selectedStationId}
            latestObservation={latestObservations[station.station_id]}
            onSelect={onSelectStation}
            showTrafficBuffer={showTrafficBuffer}
            showActivityBuffer={showActivityBuffer}
          />
        ))}
      </MapContainer>
    </div>
  );
};
