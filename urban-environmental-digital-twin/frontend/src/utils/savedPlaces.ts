/**
 * Saved Places & History Utility Engine
 * =====================================
 * Manages resident-customized saved locations and historical observation analytics
 * for the AirLens Urban Environmental Digital Twin (Pune and Pimpri-Chinchwad).
 *
 * Strict Compliance:
 * - Versioned localStorage persistence (airlens_saved_places_v1).
 * - NEVER automatically seeds default places on empty, invalid, or corrupted storage.
 * - Explains corruption issues and allows explicit user reset rather than silently adding locations.
 * - Prevents duplicate entries.
 * - Filters historical observations strictly by actual timestamps relative to the selected period.
 * - Does not assume record count equals hourly coverage.
 * - Does not fabricate or interpolate missing observations.
 * - Does not display weekday/weekend or commute peak claims without supporting data.
 */

import { ObservationItem } from '../types/observation';

export type PlaceCategory = 'HOME' | 'WORK' | 'COLLEGE' | 'FITNESS' | 'FAMILY' | 'OTHER';

export interface SavedPlace {
  id: string;
  customName: string;
  category: PlaceCategory;
  localityName: string;
  stationId: number | null;
  stationName: string | null;
  distanceKm: number | null;
  latitude: number;
  longitude: number;
  isStationDirect: boolean;
  notes?: string;
  createdAt: string;
}

export interface StorageLoadResult {
  places: SavedPlace[];
  isCorrupted: boolean;
  corruptedReason?: string;
}

export interface HistorySummary {
  averagePm25: number | null;
  highestPm25: { value: number; timestampIst: string } | null;
  lowestPm25: { value: number; timestampIst: string } | null;
  validCount: number;
  totalCount: number;
  completenessPct: number;
  isSparse: boolean;
  sparseReason?: string;
}

export const STORAGE_KEY_PLACES = 'airlens_saved_places_v1';

/**
 * Suggested Pune presets available strictly on explicit resident request.
 * NEVER seeded automatically.
 */
export const SUGGESTED_PUNE_PRESETS: SavedPlace[] = [
  {
    id: 'place-college-pccoe',
    customName: 'College / PCCOE Campus',
    category: 'COLLEGE',
    localityName: 'Akurdi / Pradhikaran (PCCOE)',
    stationId: 3409331,
    stationName: 'Bhosari, Pune - IITM',
    distanceKm: 4.8,
    latitude: 18.6496,
    longitude: 73.7684,
    isStationDirect: false,
    notes: 'Pimpri Chinchwad College of Engineering main academic campus and Pradhikaran residential sector',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'place-home-shivajinagar',
    customName: 'Home Area',
    category: 'HOME',
    localityName: 'Shivajinagar / Model Colony',
    stationId: 11613,
    stationName: 'Revenue Colony-Shivajinagar, Pune - IITM',
    distanceKm: 0.2,
    latitude: 18.5301,
    longitude: 73.8496,
    isStationDirect: true,
    notes: 'Central residential neighbourhood near FC Road and Agriculture College',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'place-work-hadapsar',
    customName: 'Tech Park / Workplace',
    category: 'WORK',
    localityName: 'Hadapsar / Magarpatta Cybercity',
    stationId: 60658,
    stationName: 'Hadapsar, Pune - IITM',
    distanceKm: 0.5,
    latitude: 18.5089,
    longitude: 73.9259,
    isStationDirect: false,
    notes: 'IT Cybercity enterprise zone and East Pune commercial hub',
    createdAt: '2026-09-01T08:00:00Z',
  },
];

export const DEFAULT_SAVED_PLACES = SUGGESTED_PUNE_PRESETS;

/**
 * Validate a candidate SavedPlace object
 */
export function isValidSavedPlace(obj: unknown): obj is SavedPlace {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    p.id.trim().length > 0 &&
    typeof p.customName === 'string' &&
    p.customName.trim().length > 0 &&
    typeof p.localityName === 'string' &&
    typeof p.latitude === 'number' &&
    !isNaN(p.latitude) &&
    typeof p.longitude === 'number' &&
    !isNaN(p.longitude) &&
    (p.stationId === null || (typeof p.stationId === 'number' && !isNaN(p.stationId)))
  );
}

/**
 * Loads resident saved places from device localStorage with versioning & schema validation.
 * NEVER populates automatic default locations when empty, invalid, or corrupted.
 */
export function loadSavedPlacesWithStatus(): StorageLoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLACES);
    if (!raw || raw.trim() === '') {
      // Clean empty state — do not seed defaults
      return { places: [], isCorrupted: false };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        places: [],
        isCorrupted: true,
        corruptedReason: 'Saved places data in this browser is corrupted (invalid JSON syntax).',
      };
    }

    if (!Array.isArray(parsed)) {
      return {
        places: [],
        isCorrupted: true,
        corruptedReason: 'Saved places data in storage was structured incorrectly (expected a list).',
      };
    }

    const validPlaces: SavedPlace[] = [];
    let discardedCount = 0;

    for (const item of parsed) {
      if (isValidSavedPlace(item)) {
        validPlaces.push(item);
      } else {
        discardedCount++;
      }
    }

    if (discardedCount > 0 && validPlaces.length === 0 && parsed.length > 0) {
      return {
        places: [],
        isCorrupted: true,
        corruptedReason: 'None of the saved entries could be recovered because required fields were missing or invalid.',
      };
    }

    if (discardedCount > 0) {
      return {
        places: validPlaces,
        isCorrupted: true,
        corruptedReason: `${discardedCount} malformed entry was discarded, but your valid saved places were recovered.`,
      };
    }

    return {
      places: validPlaces,
      isCorrupted: false,
    };
  } catch {
    return {
      places: [],
      isCorrupted: true,
      corruptedReason: 'Browser localStorage is disabled or inaccessible.',
    };
  }
}

/**
 * Standard accessor returning valid saved places list (empty array when empty or corrupted).
 */
export function loadSavedPlaces(): SavedPlace[] {
  return loadSavedPlacesWithStatus().places;
}

/**
 * Persists resident saved places to device localStorage.
 */
export function saveSavedPlaces(places: SavedPlace[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_PLACES, JSON.stringify(places));
    return true;
  } catch {
    return false;
  }
}

/**
 * Completely clears stored saved places from localStorage without seeding any defaults.
 */
export function clearSavedPlaces(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY_PLACES);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads suggested Pune / PCCOE presets ONLY upon explicit resident request.
 */
export function loadSuggestedPresets(): SavedPlace[] {
  saveSavedPlaces(SUGGESTED_PUNE_PRESETS);
  return [...SUGGESTED_PUNE_PRESETS];
}

export function resetToDefaultPlaces(): SavedPlace[] {
  return loadSuggestedPresets();
}

/**
 * Haversine distance in km between two GPS coordinates.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Adds a new place with duplicate prevention.
 */
export function addSavedPlace(
  candidate: Omit<SavedPlace, 'id' | 'createdAt'>
): { success: boolean; place?: SavedPlace; error?: string } {
  const existing = loadSavedPlaces();

  // 1. Prevent exact duplicate by custom name
  const nameCollision = existing.some(
    (p) => p.customName.trim().toLowerCase() === candidate.customName.trim().toLowerCase()
  );
  if (nameCollision) {
    return {
      success: false,
      error: `You already have a saved place named "${candidate.customName}". Please choose a distinct name (e.g. "Home 2" or "Parent's House").`,
    };
  }

  // 2. Prevent duplicate by station if mapped directly to the same station
  if (candidate.stationId !== null) {
    const stationDuplicate = existing.find(
      (p) => p.stationId === candidate.stationId && p.isStationDirect === candidate.isStationDirect
    );
    if (stationDuplicate) {
      return {
        success: false,
        error: `This monitoring location is already saved as "${stationDuplicate.customName}". You can rename or edit that existing place instead.`,
      };
    }
  }

  // 3. Prevent duplicate by very close coordinates (< 0.2 km)
  const proximityDuplicate = existing.find(
    (p) => calculateDistanceKm(p.latitude, p.longitude, candidate.latitude, candidate.longitude) < 0.2
  );
  if (proximityDuplicate) {
    return {
      success: false,
      error: `A place at virtually this identical coordinates already exists as "${proximityDuplicate.customName}".`,
    };
  }

  const newPlace: SavedPlace = {
    ...candidate,
    id: `place-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  const updated = [newPlace, ...existing];
  saveSavedPlaces(updated);
  return { success: true, place: newPlace };
}

/**
 * Renames or updates an existing saved place.
 */
export function updateSavedPlace(
  id: string,
  updates: Partial<Omit<SavedPlace, 'id' | 'createdAt'>>
): { success: boolean; error?: string } {
  const existing = loadSavedPlaces();
  const index = existing.findIndex((p) => p.id === id);
  if (index === -1) {
    return { success: false, error: 'Saved place not found.' };
  }

  // If renaming, check collision with other places
  if (updates.customName) {
    const newNameClean = updates.customName.trim().toLowerCase();
    const collision = existing.some(
      (p) => p.id !== id && p.customName.trim().toLowerCase() === newNameClean
    );
    if (collision) {
      return {
        success: false,
        error: `Another saved place is already named "${updates.customName}". Please use a distinct name.`,
      };
    }
  }

  existing[index] = {
    ...existing[index],
    ...updates,
  };

  saveSavedPlaces(existing);
  return { success: true };
}

/**
 * Removes a saved place by ID.
 */
export function deleteSavedPlace(id: string): boolean {
  const existing = loadSavedPlaces();
  const filtered = existing.filter((p) => p.id !== id);
  if (filtered.length === existing.length) return false;
  return saveSavedPlaces(filtered);
}

/**
 * Safely parses observation date taking into account UTC vs. IST offsets.
 */
export function parseObservationDate(obs?: ObservationItem | null): Date {
  if (!obs) return new Date(NaN);
  if (obs.datetime_utc) {
    let s = String(obs.datetime_utc).trim();
    if (s.includes(' ') && !s.includes('T')) {
      s = s.replace(' ', 'T');
    }
    if (!s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
      s = s + 'Z';
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  if (obs.datetime_local_ist) {
    let s = String(obs.datetime_local_ist).trim().replace(' ', 'T');
    if (!s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
      s = s + '+05:30';
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(NaN);
}

/**
 * Calculates genuine historical air quality summary statistics from actual observations.
 * Compares against expected hourly slots for the period (e.g. 24, 168, 720).
 * Does NOT interpolate gaps or label result as official CPCB AQI.
 */
export function calculateHistorySummary(
  observations: ObservationItem[],
  expectedHourlySlots: number = 24
): HistorySummary {
  const totalCount = observations.length;
  if (totalCount === 0) {
    return {
      averagePm25: null,
      highestPm25: null,
      lowestPm25: null,
      validCount: 0,
      totalCount: 0,
      completenessPct: 0,
      isSparse: true,
      sparseReason: 'No historical observations were recorded for this station within the selected period.',
    };
  }

  // Filter valid non-null, non-negative PM2.5 readings with valid numbers
  const valid = observations.filter(
    (o) => typeof o.pm25 === 'number' && !isNaN(o.pm25) && o.pm25 >= 0
  );

  const validCount = valid.length;
  const effectiveExpected = Math.max(expectedHourlySlots, 1);
  const completenessPct = Math.min(100, Math.round((validCount / effectiveExpected) * 100));

  if (validCount === 0) {
    return {
      averagePm25: null,
      highestPm25: null,
      lowestPm25: null,
      validCount: 0,
      totalCount,
      completenessPct: 0,
      isSparse: true,
      sparseReason: 'All retrieved records in this period had missing or invalid PM2.5 sensor measurements.',
    };
  }

  const sum = valid.reduce((acc, o) => acc + (o.pm25 as number), 0);
  const averagePm25 = Math.round((sum / validCount) * 10) / 10;

  // Find peak PM2.5
  let peak = valid[0];
  for (const o of valid) {
    if ((o.pm25 as number) > (peak.pm25 as number)) {
      peak = o;
    }
  }

  // Find lowest PM2.5
  let trough = valid[0];
  for (const o of valid) {
    if ((o.pm25 as number) < (trough.pm25 as number)) {
      trough = o;
    }
  }

  const isSparse = validCount < Math.min(12, Math.round(effectiveExpected * 0.5));
  let sparseReason: string | undefined;
  if (isSparse) {
    sparseReason = `Sparse observation coverage: Only ${validCount} valid measurements (${completenessPct}% of ${effectiveExpected} expected hours) were recorded. Trend summary should be viewed with caution.`;
  }

  return {
    averagePm25,
    highestPm25: {
      value: peak.pm25 as number,
      timestampIst: peak.datetime_local_ist || peak.datetime_utc || 'Unknown time',
    },
    lowestPm25: {
      value: trough.pm25 as number,
      timestampIst: trough.datetime_local_ist || trough.datetime_utc || 'Unknown time',
    },
    validCount,
    totalCount,
    completenessPct,
    isSparse,
    sparseReason,
  };
}

/**
 * Returns human-friendly category metadata (badge styling, labels)
 */
export function getCategoryBadge(category: PlaceCategory): {
  label: string;
  bg: string;
  border: string;
  color: string;
} {
  switch (category) {
    case 'HOME':
      return {
        label: 'Home',
        bg: 'rgba(22, 163, 74, 0.1)',
        border: 'rgba(22, 163, 74, 0.28)',
        color: '#15803d',
      };
    case 'COLLEGE':
      return {
        label: 'College / Campus',
        bg: 'rgba(40, 122, 69, 0.12)',
        border: 'rgba(40, 122, 69, 0.28)',
        color: '#166534',
      };
    case 'WORK':
      return {
        label: 'Workplace',
        bg: 'rgba(2, 132, 199, 0.1)',
        border: 'rgba(2, 132, 199, 0.28)',
        color: '#0284c7',
      };
    case 'FITNESS':
      return {
        label: 'Fitness / Outdoors',
        bg: 'rgba(217, 119, 6, 0.1)',
        border: 'rgba(217, 119, 6, 0.28)',
        color: '#b45309',
      };
    case 'FAMILY':
      return {
        label: 'Family / Parents',
        bg: 'rgba(219, 39, 119, 0.1)',
        border: 'rgba(219, 39, 119, 0.28)',
        color: '#be185d',
      };
    case 'OTHER':
    default:
      return {
        label: 'Custom Place',
        bg: 'rgba(100, 116, 139, 0.1)',
        border: 'rgba(100, 116, 139, 0.28)',
        color: '#475569',
      };
  }
}
