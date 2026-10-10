/**
 * Route Environmental Pollution Estimation Utility
 * ==================================================
 * Estimates route-level PM2.5 exposure from active ambient monitoring stations
 * using Inverse Distance Weighting (IDW) along actual road coordinates.
 * Strictly adheres to data integrity principles:
 * - Distinguishes measured ground readings from spatial model estimates
 * - Discloses data timestamp and limitations
 * - Flags insufficient or missing station coverage without fabricating numbers
 * - Compares duration vs estimated exposure in plain citizen language
 */

import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import { RouteOption } from '../api/routing';
import { calcPM25SubIndex, getNAQICategoryInfo, CategoryInfo } from './aqi';

export type CoverageStatus = 'VALID' | 'INSUFFICIENT_COVERAGE' | 'NO_ACTIVE_READINGS';

export interface RoutePollutionEstimate {
  routeId: string;
  coverageStatus: CoverageStatus;
  statusMessage: string;
  // Estimated PM2.5 values along corridor in µg/m³
  avgPm25: number | null;
  minPm25: number | null;
  maxPm25: number | null;
  categoryInfo: CategoryInfo | null;
  sampleCount: number;
  validSampleCount: number;
  coveragePercentage: number;
  dataTimestamp: string | null;
  nearbyStationNames: string[];
  dataProvenance: 'Model estimate (Ambient IDW Spatial Extrapolation)';
}

export interface RouteComparisonResult {
  route: RouteOption;
  estimate: RoutePollutionEstimate;
  isLowestPollution: boolean;
  isFastest: boolean;
  pollutionDiffPercentage: number | null; // e.g. -12% compared to primary
  durationDiffMinutes: number; // e.g. +4 mins compared to fastest
  recommendationBadge: string | null;
  tradeOffSummary: string;
}

/**
 * Great-circle distance between two geographic coordinates in kilometers.
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return R * c;
}

/**
 * Estimate pollution exposure along a single route's road coordinates.
 */
export function estimateRoutePollution(
  route: RouteOption,
  stations: Station[],
  stationObservations: Record<number, ObservationItem | null>
): RoutePollutionEstimate {
  // Collect active stations with verified PM2.5 readings
  const activeStationsWithPm25: Array<{
    station: Station;
    pm25: number;
    obsTime: string | null;
  }> = [];

  for (const st of stations) {
    const obs = stationObservations[st.station_id];
    if (
      obs &&
      obs.pm25 !== null &&
      obs.pm25 !== undefined &&
      !isNaN(obs.pm25) &&
      obs.pm25 >= 0
    ) {
      activeStationsWithPm25.push({
        station: st,
        pm25: obs.pm25,
        obsTime: obs.datetime_local_ist || obs.datetime_utc || null,
      });
    }
  }

  // If no monitoring stations have valid readings, report honestly
  if (activeStationsWithPm25.length === 0) {
    return {
      routeId: route.id,
      coverageStatus: 'NO_ACTIVE_READINGS',
      statusMessage:
        'Continuous monitoring telemetry is currently unavailable from regional stations.',
      avgPm25: null,
      minPm25: null,
      maxPm25: null,
      categoryInfo: null,
      sampleCount: 0,
      validSampleCount: 0,
      coveragePercentage: 0,
      dataTimestamp: null,
      nearbyStationNames: [],
      dataProvenance: 'Model estimate (Ambient IDW Spatial Extrapolation)',
    };
  }

  // Extract most recent timestamp from active stations
  const dataTimestamp =
    activeStationsWithPm25.find((s) => s.obsTime)?.obsTime || null;

  // Evenly sample 20 to 30 coordinates along the road polyline
  const totalCoords = route.coordinates.length;
  const targetSamples = Math.min(25, Math.max(12, Math.floor(totalCoords / 6)));
  const step = Math.max(1, Math.floor(totalCoords / targetSamples));

  const sampledCoords: [number, number][] = [];
  for (let i = 0; i < totalCoords; i += step) {
    sampledCoords.push(route.coordinates[i]);
  }
  // Ensure destination coordinate is included
  if (totalCoords > 0) {
    const lastCoord = route.coordinates[totalCoords - 1];
    if (sampledCoords[sampledCoords.length - 1] !== lastCoord) {
      sampledCoords.push(lastCoord);
    }
  }

  const validPm25Samples: number[] = [];
  const nearbyStationSet = new Set<string>();

  for (const [lat, lon] of sampledCoords) {
    // Calculate distance to all available monitoring stations
    let minDist = Infinity;
    let closestStationPm25: number | null = null;
    let weightSum = 0;
    let weightedPm25Sum = 0;

    for (const item of activeStationsWithPm25) {
      const d = haversineKm(lat, lon, item.station.latitude, item.station.longitude);
      if (d < minDist) {
        minDist = d;
        closestStationPm25 = item.pm25;
      }
      if (d <= 8.0) {
        nearbyStationSet.add(item.station.station_name.split(',')[0].trim());
      }

      // IDW calculation (power = 2.0)
      if (d < 0.05) {
        // Very close to station
        weightSum = 1;
        weightedPm25Sum = item.pm25;
        break;
      } else {
        const w = 1.0 / (d * d);
        weightSum += w;
        weightedPm25Sum += w * item.pm25;
      }
    }

    // Maximum distance from nearest station for reliable urban spatial coverage: 25 km
    if (minDist <= 25.0 && weightSum > 0) {
      const estimatedPointPm25 =
        minDist < 0.05 && closestStationPm25 !== null
          ? closestStationPm25
          : weightedPm25Sum / weightSum;

      validPm25Samples.push(Number(estimatedPointPm25.toFixed(1)));
    }
  }

  const sampleCount = sampledCoords.length;
  const validSampleCount = validPm25Samples.length;
  const coveragePercentage =
    sampleCount > 0 ? Math.round((validSampleCount / sampleCount) * 100) : 0;

  // Minimum 50% coverage required to state a representative route exposure
  if (coveragePercentage < 50 || validPm25Samples.length === 0) {
    return {
      routeId: route.id,
      coverageStatus: 'INSUFFICIENT_COVERAGE',
      statusMessage:
        'Insufficient monitoring coverage along this corridor. Distance to active stations exceeds validated spatial radius.',
      avgPm25: null,
      minPm25: null,
      maxPm25: null,
      categoryInfo: null,
      sampleCount,
      validSampleCount,
      coveragePercentage,
      dataTimestamp,
      nearbyStationNames: Array.from(nearbyStationSet),
      dataProvenance: 'Model estimate (Ambient IDW Spatial Extrapolation)',
    };
  }

  const sum = validPm25Samples.reduce((acc, v) => acc + v, 0);
  const avgPm25 = Number((sum / validPm25Samples.length).toFixed(1));
  const minPm25 = Math.min(...validPm25Samples);
  const maxPm25 = Math.max(...validPm25Samples);

  const subIndex = calcPM25SubIndex(avgPm25);
  const categoryInfo = subIndex !== null ? getNAQICategoryInfo(subIndex) : null;

  return {
    routeId: route.id,
    coverageStatus: 'VALID',
    statusMessage: 'Spatial estimate computed from continuous monitoring network',
    avgPm25,
    minPm25,
    maxPm25,
    categoryInfo,
    sampleCount,
    validSampleCount,
    coveragePercentage,
    dataTimestamp,
    nearbyStationNames: Array.from(nearbyStationSet),
    dataProvenance: 'Model estimate (Ambient IDW Spatial Extrapolation)',
  };
}

/**
 * Compare multiple route options and evaluate duration vs estimated PM2.5 trade-offs.
 */
export function compareRoutes(
  routes: RouteOption[],
  stations: Station[],
  stationObservations: Record<number, ObservationItem | null>
): RouteComparisonResult[] {
  if (routes.length === 0) return [];

  // Calculate estimates for all routes
  const estimatedRoutes = routes.map((route) => ({
    route,
    estimate: estimateRoutePollution(route, stations, stationObservations),
  }));

  // Find fastest duration
  const minDuration = Math.min(...routes.map((r) => r.durationMinutes));

  // Find lowest PM2.5 among routes with VALID coverage
  const validEstimates = estimatedRoutes.filter(
    (e) => e.estimate.coverageStatus === 'VALID' && e.estimate.avgPm25 !== null
  );

  const minPm25 =
    validEstimates.length > 0
      ? Math.min(...validEstimates.map((e) => e.estimate.avgPm25!))
      : null;

  // Baseline comparison route is the fastest or primary route
  const baselineRoute =
    estimatedRoutes.find((e) => e.route.durationMinutes === minDuration) ||
    estimatedRoutes[0];
  const baselinePm25 = baselineRoute.estimate.avgPm25;

  return estimatedRoutes.map(({ route, estimate }) => {
    const isFastest = route.durationMinutes === minDuration;
    const durationDiffMinutes = route.durationMinutes - minDuration;

    let isLowestPollution = false;
    let pollutionDiffPercentage: number | null = null;
    let recommendationBadge: string | null = null;
    let tradeOffSummary = '';

    if (estimate.coverageStatus === 'VALID' && estimate.avgPm25 !== null && minPm25 !== null) {
      // Meaningful difference threshold: at least 2.5 µg/m³ difference
      const isLowest = estimate.avgPm25 === minPm25;
      const diffFromBaseline = baselinePm25 !== null ? estimate.avgPm25 - baselinePm25 : 0;

      if (baselinePm25 && baselinePm25 > 0) {
        pollutionDiffPercentage = Math.round((diffFromBaseline / baselinePm25) * 100);
      }

      if (isLowest && validEstimates.length > 1) {
        // Check if meaningfully lower than the highest
        const maxPm25 = Math.max(...validEstimates.map((e) => e.estimate.avgPm25!));
        if (maxPm25 - estimate.avgPm25 >= 2.5) {
          isLowestPollution = true;
          recommendationBadge = 'Lower estimated pollution';
        }
      }

      if (isFastest && !recommendationBadge) {
        recommendationBadge = 'Fastest travel time';
      }

      // Generate honest trade-off explanation
      if (routes.length === 1) {
        tradeOffSummary = `Direct road corridor (${route.distanceKm} km, ~${route.durationMinutes} mins) with estimated average PM2.5 of ${estimate.avgPm25} µg/m³.`;
      } else if (isLowestPollution && !isFastest) {
        tradeOffSummary = `Estimated ~${Math.abs(
          pollutionDiffPercentage || 0
        )}% lower average PM2.5 exposure, but adds approximately ${durationDiffMinutes} min${
          durationDiffMinutes > 1 ? 's' : ''
        } to journey time.`;
      } else if (isFastest && isLowestPollution) {
        tradeOffSummary = `Optimal corridor: fastest arrival time and lowest estimated average PM2.5 concentration.`;
      } else if (isFastest) {
        tradeOffSummary = `Fastest route by ~${Math.abs(durationDiffMinutes)} min${
          durationDiffMinutes !== 0 ? 's' : ''
        }, with ambient PM2.5 estimated at ${estimate.avgPm25} µg/m³.`;
      } else {
        tradeOffSummary = `Alternate route (${route.distanceKm} km). Estimated PM2.5 is comparable to the primary route corridor.`;
      }
    } else {
      // When coverage is insufficient or not valid
      tradeOffSummary = `Real road routing active (${route.distanceKm} km, ~${route.durationMinutes} mins). Reliable pollution comparison unavailable due to distance from active monitoring stations.`;
      if (isFastest && routes.length > 1) {
        recommendationBadge = 'Fastest travel time';
      }
    }

    return {
      route,
      estimate,
      isLowestPollution,
      isFastest,
      pollutionDiffPercentage,
      durationDiffMinutes,
      recommendationBadge,
      tradeOffSummary,
    };
  });
}
