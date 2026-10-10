import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Check } from 'lucide-react';
import { LocationItem, searchLocations, PUNE_LOCALITY_PRESETS } from '../../api/routing';

interface IncidentLocationPickerProps {
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  onChangeLocation: (name: string, lat: number | null, lon: number | null) => void;
}

// Custom pin marker matching AirLens aesthetic
const incidentMarkerIcon = L.divIcon({
  className: 'incident-pin-marker',
  html: `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
      border: 2px solid #ffffff;
      transform: rotate(-45deg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justifyContent: center;
    ">
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ffffff;
        transform: rotate(45deg);
      "></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

// Click listener inside Leaflet map
const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lon: number) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const IncidentLocationPicker: React.FC<IncidentLocationPickerProps> = ({
  locationName,
  latitude,
  longitude,
  onChangeLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(locationName);
  const [suggestions, setSuggestions] = useState<LocationItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(false);

  // Sync searchQuery when locationName is updated from outside
  useEffect(() => {
    setSearchQuery(locationName);
  }, [locationName]);

  // Handle location search with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions(PUNE_LOCALITY_PRESETS.slice(0, 6));
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocations(searchQuery);
        if (isMounted) {
          setSuggestions(results.slice(0, 7));
        }
      } catch {
        // Fallback to presets
        if (isMounted) {
          setSuggestions(
            PUNE_LOCALITY_PRESETS.filter(
              (p) =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
            ).slice(0, 6)
          );
        }
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleSelectSuggestion = (item: LocationItem) => {
    setSearchQuery(item.name);
    setShowDropdown(false);
    onChangeLocation(item.name, item.lat, item.lon);
  };

  const handleMapClick = (lat: number, lon: number) => {
    const latFormatted = lat.toFixed(4);
    const lonFormatted = lon.toFixed(4);
    const name = locationName.trim()
      ? locationName
      : `Near ${latFormatted}°N, ${lonFormatted}°E`;
    onChangeLocation(name, parseFloat(latFormatted), parseFloat(lonFormatted));
  };

  const defaultCenter: [number, number] = [
    latitude || 18.5308,
    longitude || 73.8475,
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {/* Search Input Bar */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '10px',
            background: 'rgba(20, 26, 18, 0.8)',
            border: '1.5px solid rgba(92, 114, 82, 0.35)',
            transition: 'border-color 0.2s ease',
          }}
        >
          <Search size={16} color="#8aa87e" />
          <input
            type="text"
            placeholder="Type a locality or landmark (e.g. Shivajinagar, Kothrud, Bhosari, Hinjawadi)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
              onChangeLocation(e.target.value, latitude, longitude);
            }}
            onFocus={() => setShowDropdown(true)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#eef1e7',
              fontSize: '0.88rem',
            }}
          />
          {isSearching && (
            <span style={{ fontSize: '0.72rem', color: '#8aa87e', fontStyle: 'italic' }}>
              Searching...
            </span>
          )}
          {latitude !== null && longitude !== null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.72rem',
                color: '#8aa87e',
                background: 'rgba(138, 168, 126, 0.15)',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                fontWeight: 600,
              }}
              title={`Coordinates: ${latitude}, ${longitude}`}
            >
              <Check size={11} />
              Geocoded
            </span>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 100,
              background: '#181f15',
              border: '1px solid rgba(92, 114, 82, 0.4)',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              maxHeight: '220px',
              overflowY: 'auto',
            }}
          >
            {suggestions.map((item) => (
              <div
                key={item.id}
                onMouseDown={() => handleSelectSuggestion(item)}
                style={{
                  padding: '0.6rem 0.85rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(238, 241, 231, 0.05)',
                  transition: 'background 0.15s ease',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(92, 114, 82, 0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <MapPin size={14} color="#8aa87e" style={{ marginTop: '3px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#eef1e7' }}>{item.name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#889381', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map Toggle & Coordinate Details */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.76rem', color: '#889381' }}>
          {latitude !== null && longitude !== null ? (
            <span>
              Pin Location: <strong style={{ color: '#c5cebe' }}>{latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E</strong>
            </span>
          ) : (
            <span>Search a locality above or toggle map to pinpoint the exact location.</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowMap((prev) => !prev)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(92, 114, 82, 0.35)',
            color: '#8aa87e',
            borderRadius: '6px',
            padding: '0.25rem 0.65rem',
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <MapPin size={12} />
          <span>{showMap ? 'Hide Map Pinpoint' : 'Pinpoint on Map'}</span>
        </button>
      </div>

      {/* Interactive Leaflet Map Drawer */}
      {showMap && (
        <div
          style={{
            height: '240px',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid rgba(92, 114, 82, 0.35)',
            marginTop: '0.25rem',
            position: 'relative',
          }}
        >
          <MapContainer
            center={defaultCenter}
            zoom={latitude && longitude ? 13 : 11}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {latitude !== null && longitude !== null && (
              <Marker position={[latitude, longitude]} icon={incidentMarkerIcon} />
            )}
          </MapContainer>
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              zIndex: 400,
              background: 'rgba(20, 24, 16, 0.85)',
              padding: '0.25rem 0.55rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              color: '#8aa87e',
              border: '1px solid rgba(92, 114, 82, 0.3)',
            }}
          >
            Click anywhere on the map to set the incident pin
          </div>
        </div>
      )}
    </div>
  );
};
