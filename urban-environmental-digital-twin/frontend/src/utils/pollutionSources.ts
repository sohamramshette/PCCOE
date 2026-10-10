/**
 * Pollution Sources & Atmospheric Backtracking Interpretation Utility
 * ====================================================================
 * Translates complex 2D kinematic backward trajectories and ERA5-Land reanalysis winds
 * into plain-language, scientifically grounded environmental insights for residents.
 *
 * Strict Compliance:
 * - Never claims atmospheric backtracking proves that a specific factory, road, or facility caused measured pollution.
 * - Never invents source contribution percentages or rankings.
 * - Accurately describes wind origin directions using standard meteorological conventions.
 * - Highlights upwind monitoring stations when supported by multi-station alignment.
 */

import {
  BacktrackingResponse,
  CorrelatedStationEvidence,
} from '../types/backtracking';

export interface UpwindCorridorInsight {
  compassDirection: string;
  compassDegrees: number | null;
  windSpeedKmh: number | null;
  windSpeedMs: number | null;
  windSpeedCategory: string;
  transportDistanceKm: number;
  durationHours: number;
  originDescription: string;
  corridorSummary: string;
  upwindStations: CorrelatedStationEvidence[];
  downwindStations: CorrelatedStationEvidence[];
  provenanceTimestampIST: string;
  provenanceTimestampUTC: string;
}

/**
 * Convert meteorological wind degrees (direction FROM WHICH wind originates)
 * to a standard 16-point cardinal direction.
 */
export function degreesToCompass(deg: number | null | undefined): string {
  if (deg === null || deg === undefined || isNaN(deg)) return 'Variable';
  const val = (deg + 360) % 360;
  const compassPoints = [
    'North',
    'North-Northeast',
    'Northeast',
    'East-Northeast',
    'East',
    'East-Southeast',
    'Southeast',
    'South-Southeast',
    'South',
    'South-Southwest',
    'Southwest',
    'West-Southwest',
    'West',
    'West-Northwest',
    'Northwest',
    'North-Northwest',
  ];
  const index = Math.round(val / 22.5) % 16;
  return compassPoints[index];
}

/**
 * Classify horizontal wind speed into resident-friendly terminology.
 */
export function classifyWindSpeed(speedMs: number | null | undefined): string {
  if (speedMs === null || speedMs === undefined || isNaN(speedMs)) return 'Calm';
  if (speedMs < 0.5) return 'Calm';
  if (speedMs < 2.0) return 'Light Air';
  if (speedMs < 3.5) return 'Light Breeze';
  if (speedMs < 5.5) return 'Gentle Breeze';
  if (speedMs < 8.0) return 'Moderate Breeze';
  return 'Fresh Wind';
}

/**
 * Characterize geographic origin sector for Pune / PCMC basin.
 */
function describeOriginSector(
  originLat: number,
  originLon: number,
  receptorLat: number,
  receptorLon: number
): string {
  const dLat = originLat - receptorLat;
  const dLon = originLon - receptorLon;

  if (Math.abs(dLat) < 0.02 && Math.abs(dLon) < 0.02) {
    return 'Immediate localized urban basin';
  }

  if (dLon < -0.05 && Math.abs(dLat) < 0.08) {
    return 'Western Ghats / Mulshi & Paud valley corridor';
  } else if (dLon < -0.05 && dLat > 0.05) {
    return 'North-Western corridor (Hinjawadi, Talegaon & Mumbai Expressway corridor)';
  } else if (dLon < -0.05 && dLat < -0.05) {
    return 'South-Western valley corridor (Sinhagad & Khadakwasla)';
  } else if (dLat > 0.06 && Math.abs(dLon) < 0.08) {
    return 'Northern PCMC industrial corridor (Bhosari, Chakan & Nashik highway)';
  } else if (dLat < -0.06 && Math.abs(dLon) < 0.08) {
    return 'Southern corridor (Katraj pass, Saswad & Satara highway)';
  } else if (dLon > 0.05 && Math.abs(dLat) < 0.08) {
    return 'Eastern agricultural and urban fringe (Hadapsar, Wagholi & Solapur corridor)';
  } else if (dLon > 0.05 && dLat > 0.05) {
    return 'North-Eastern corridor (Viman Nagar, Ahmednagar highway)';
  }

  return 'Surrounding regional Pune-PCMC airshed';
}

/**
 * Interpret atmospheric backtracking response into resident-friendly insights.
 */
export function interpretBacktrackingData(
  data: BacktrackingResponse | null
): UpwindCorridorInsight | null {
  if (!data || !data.waypoints || data.waypoints.length === 0) {
    return null;
  }

  const arrivalWaypoint = data.waypoints[0];
  const originWaypoint = data.waypoints[data.waypoints.length - 1];

  const windDeg = arrivalWaypoint.wind_dir_deg;
  const windMs = arrivalWaypoint.wind_speed_ms;
  const windKmh = windMs !== null ? Number((windMs * 3.6).toFixed(1)) : null;
  const compassDir = degreesToCompass(windDeg);
  const windCategory = classifyWindSpeed(windMs);

  const originSector = describeOriginSector(
    originWaypoint.latitude,
    originWaypoint.longitude,
    data.receptor_station.latitude,
    data.receptor_station.longitude
  );

  const upwindStations = data.multi_station_evidence.filter(
    (s) => s.relative_wind_alignment === 'UPWIND_CORRIDOR'
  );
  const downwindStations = data.multi_station_evidence.filter(
    (s) => s.relative_wind_alignment === 'DOWNWIND_CORRIDOR'
  );

  const corridorSummary =
    `Over the past ${data.backward_duration_hours} hours, the air mass reaching ${data.receptor_station.station_name.split(',')[0]} ` +
    `traveled approximately ${data.total_distance_km.toFixed(1)} km, arriving predominantly from the ${compassDir} ` +
    `(${originSector}).`;

  return {
    compassDirection: compassDir,
    compassDegrees: windDeg,
    windSpeedKmh: windKmh,
    windSpeedMs: windMs,
    windSpeedCategory: windCategory,
    transportDistanceKm: Number(data.total_distance_km.toFixed(1)),
    durationHours: data.backward_duration_hours,
    originDescription: originSector,
    corridorSummary,
    upwindStations,
    downwindStations,
    provenanceTimestampIST: data.arrival_datetime_ist,
    provenanceTimestampUTC: data.arrival_datetime_utc,
  };
}
