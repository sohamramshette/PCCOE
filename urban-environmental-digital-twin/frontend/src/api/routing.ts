/**
 * Routing and Geocoding API Client for AirLens Pune & PCMC
 * ========================================================
 * Uses OpenStreetMap OSRM public routing engine for genuine road geometries
 * and OSM Nominatim + curated Pune/PCMC locality presets for location search.
 */

export type TravelMode = 'driving' | 'cycling' | 'walking';

export interface LocationItem {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  isPreset?: boolean;
}

export interface RouteOption {
  id: string;
  name: string;
  summary: string;
  mode: TravelMode;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  // Road coordinates in [latitude, longitude] order for Leaflet
  coordinates: [number, number][];
}

// Curated landmarks and residential/commercial hubs across Pune & Pimpri-Chinchwad
export const PUNE_LOCALITY_PRESETS: LocationItem[] = [
  {
    id: 'preset-shivajinagar',
    name: 'Shivajinagar',
    subtitle: 'Central Pune · Transportation Hub & College Campus',
    lat: 18.5308,
    lon: 73.8475,
    isPreset: true,
  },
  {
    id: 'preset-kothrud',
    name: 'Kothrud',
    subtitle: 'West Pune · Paud Road & Karve Road Residential Hub',
    lat: 18.5074,
    lon: 73.8077,
    isPreset: true,
  },
  {
    id: 'preset-hinjawadi',
    name: 'Hinjawadi',
    subtitle: 'North-West · Rajiv Gandhi Infotech Park Phase 1',
    lat: 18.5913,
    lon: 73.7389,
    isPreset: true,
  },
  {
    id: 'preset-swargate',
    name: 'Swargate',
    subtitle: 'South-Central Pune · Major Bus Terminus & Flyover Hub',
    lat: 18.5018,
    lon: 73.8586,
    isPreset: true,
  },
  {
    id: 'preset-viman-nagar',
    name: 'Viman Nagar',
    subtitle: 'North-East Pune · Airport Corridor & Tech Parks',
    lat: 18.5679,
    lon: 73.9143,
    isPreset: true,
  },
  {
    id: 'preset-hadapsar',
    name: 'Hadapsar / Magarpatta',
    subtitle: 'East Pune · Magarpatta Cybercity & Industrial Zone',
    lat: 18.5089,
    lon: 73.9259,
    isPreset: true,
  },
  {
    id: 'preset-baner',
    name: 'Baner',
    subtitle: 'West Pune · High Street & Mumbai-Pune Highway Corridor',
    lat: 18.5590,
    lon: 73.7868,
    isPreset: true,
  },
  {
    id: 'preset-wakad',
    name: 'Wakad',
    subtitle: 'PCMC / West Pune · IT Corridor Gateway & Hinjawadi Flyover',
    lat: 18.5987,
    lon: 73.7663,
    isPreset: true,
  },
  {
    id: 'preset-pimpri',
    name: 'Pimpri',
    subtitle: 'PCMC · Municipal Corporation HQ & Industrial Belt',
    lat: 18.6279,
    lon: 73.8009,
    isPreset: true,
  },
  {
    id: 'preset-chinchwad',
    name: 'Chinchwad',
    subtitle: 'PCMC · Station Road & Automobile Manufacturing Zone',
    lat: 18.6385,
    lon: 73.7925,
    isPreset: true,
  },
  {
    id: 'preset-bhosari',
    name: 'Bhosari',
    subtitle: 'PCMC · MIDC Industrial Area & Nashik Phata Corridor',
    lat: 18.6258,
    lon: 73.8437,
    isPreset: true,
  },
  {
    id: 'preset-akurdi',
    name: 'Akurdi',
    subtitle: 'PCMC · PCCOE Campus & Pradhikaran Residential Sector',
    lat: 18.6496,
    lon: 73.7684,
    isPreset: true,
  },
  {
    id: 'preset-nigdi',
    name: 'Nigdi',
    subtitle: 'PCMC · Pradhikaran & Bhakti Shakti Chowk',
    lat: 18.6575,
    lon: 73.7745,
    isPreset: true,
  },
  {
    id: 'preset-katraj',
    name: 'Katraj',
    subtitle: 'South Pune · Katraj Snake Park & Old Pune-Satara Road',
    lat: 18.4529,
    lon: 73.8552,
    isPreset: true,
  },
  {
    id: 'preset-aundh',
    name: 'Aundh',
    subtitle: 'North-West Pune · University Road & Parihar Chowk',
    lat: 18.5580,
    lon: 73.8075,
    isPreset: true,
  },
  {
    id: 'preset-kharadi',
    name: 'Kharadi',
    subtitle: 'East Pune · EON IT Park & World Trade Centre Corridor',
    lat: 18.5515,
    lon: 73.9458,
    isPreset: true,
  },
  {
    id: 'preset-pune-station',
    name: 'Pune Railway Station',
    subtitle: 'Central Pune · Pune Junction Railway Complex',
    lat: 18.5289,
    lon: 73.8744,
    isPreset: true,
  },
];

/**
 * Search locations across Pune & PCMC.
 * Matches local curated presets first, then queries OpenStreetMap Nominatim for exact matches.
 */
export async function searchLocations(query: string): Promise<LocationItem[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return PUNE_LOCALITY_PRESETS.slice(0, 8);
  }

  // 1. Check curated presets
  const presetMatches = PUNE_LOCALITY_PRESETS.filter(
    (p) =>
      p.name.toLowerCase().includes(cleanQuery) ||
      p.subtitle.toLowerCase().includes(cleanQuery)
  );

  // If query is short or we have good preset matches, return presets immediately
  if (cleanQuery.length < 3 || presetMatches.length >= 4) {
    return presetMatches;
  }

  // 2. Query OSM Nominatim geocoder with Pune bounding box focus
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query + ' Pune Maharashtra'
    )}&limit=5&countrycodes=in&viewbox=73.65,18.78,74.10,18.35`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return presetMatches;
    }

    interface NominatimItem {
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      name?: string;
    }

    const data: NominatimItem[] = await response.json();
    const geocodedResults: LocationItem[] = data.map((item) => {
      const parts = item.display_name.split(',');
      const mainName = parts[0].trim();
      const areaDesc = parts.slice(1, 3).join(',').trim() || 'Pune Region';

      return {
        id: `osm-${item.place_id}`,
        name: mainName,
        subtitle: `${areaDesc} · OpenStreetMap Geocoding`,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        isPreset: false,
      };
    });

    // Merge without duplicates
    const combined = [...presetMatches];
    for (const geo of geocodedResults) {
      if (
        !combined.some(
          (c) =>
            Math.abs(c.lat - geo.lat) < 0.005 &&
            Math.abs(c.lon - geo.lon) < 0.005
        )
      ) {
        combined.push(geo);
      }
    }

    return combined.slice(0, 8);
  } catch {
    // If Nominatim fails or is blocked by network, fallback to preset matches
    return presetMatches;
  }
}

/**
 * Fetch genuine road routes between origin and destination using OpenStreetMap OSRM.
 * Returns genuine road geometries (LineString coordinates).
 */
export async function fetchRoadRoutes(
  start: LocationItem,
  destination: LocationItem,
  mode: TravelMode = 'driving'
): Promise<RouteOption[]> {
  // Map travel mode to OSRM profile
  // OSRM demo server supports driving, bike/cycling, and foot/walking
  const osrmProfile =
    mode === 'driving' ? 'driving' : mode === 'cycling' ? 'bike' : 'foot';

  // OSRM expects coordinates in {lon},{lat} order
  const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${start.lon},${start.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&alternatives=3&steps=false`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Routing provider returned HTTP ${response.status}`);
    }

    interface OSRMRoute {
      distance: number;
      duration: number;
      geometry: {
        coordinates: [number, number][]; // [lon, lat]
      };
      legs: Array<{
        summary: string;
      }>;
    }

    interface OSRMResponse {
      code: string;
      routes?: OSRMRoute[];
      message?: string;
    }

    const data: OSRMResponse = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(data.message || 'No road route found between selected points');
    }

    return data.routes.map((route, index) => {
      // Convert OSRM [lon, lat] coordinates to Leaflet [lat, lon]
      const latLngCoords: [number, number][] = route.geometry.coordinates.map(
        ([lon, lat]) => [lat, lon]
      );

      const summaryText = route.legs[0]?.summary
        ? `Via ${route.legs[0].summary}`
        : index === 0
        ? 'Primary Corridor'
        : `Alternative Corridor ${index}`;

      const distanceKm = Number((route.distance / 1000).toFixed(1));
      const durationMinutes = Math.max(1, Math.round(route.duration / 60));

      return {
        id: `route-${index}`,
        name: index === 0 ? 'Primary Route' : `Alternate Route ${index}`,
        summary: summaryText,
        mode,
        distanceMeters: route.distance,
        distanceKm,
        durationSeconds: route.duration,
        durationMinutes,
        coordinates: latLngCoords,
      };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to connect to road-routing service';
    throw new Error(message);
  }
}
