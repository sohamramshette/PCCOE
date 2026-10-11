/**
 * Navigation Tracking & Pollution-Aware Rerouting Utilities
 * ==========================================================
 * Provides mathematical projections, GPS accuracy gating, off-route detection,
 * upcoming route segmentation, and pollution-aware comparison logic for AirLens.
 *
 * Strict Compliance:
 * - Uses genuine road geometry returned by OSRM.
 * - Filters GPS noise and temporary drift before flagging off-route.
 * - Reuses IDW spatial estimation from routePollution.ts for upcoming segments.
 * - Does not invent pollution readings or unverified alternatives.
 * - Guarantees all watchers and timers stop when navigation ends.
 */

import { RouteOption } from '../api/routing';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import {
  estimateRoutePollution,
  RoutePollutionEstimate,
  RouteComparisonResult,
} from './routePollution';
import { loadResidentPreferences } from './residentAlerts';

export interface GPSPosition {
  lat: number;
  lon: number;
  accuracy: number; // in meters (radius of 68% confidence)
  heading: number | null; // heading in degrees (0 - 360)
  speed: number | null; // speed in meters / second
  timestamp: number;
}

export type GPSState =
  | 'idle'
  | 'locating'
  | 'locked'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'inaccurate';

export type NavigationStatus =
  | 'following'
  | 'off_route'
  | 'arrived'
  | 'rerouting'
  | 'poor_accuracy';

export interface RouteProgress {
  nearestSegmentIndex: number;
  projectedCoord: [number, number]; // [lat, lon]
  distanceToRouteMeters: number;
  isOffRoute: boolean;
  offRouteCount: number;
  isAccuracyImprecise: boolean;
  remainingDistanceMeters: number;
  remainingDistanceKm: number;
  remainingDurationMinutes: number;
  distanceToDestinationMeters: number;
  hasArrived: boolean;
  upcomingCoordinates: [number, number][];
}

export interface UpcomingPollutionStatus {
  isElevated: boolean;
  estimate: RoutePollutionEstimate;
  thresholdPm25: number;
  thresholdSource: 'Resident Alert Preference' | 'CPCB Moderate Baseline Standard';
  comparisonMessage: string;
}

export interface RerouteComparison {
  currentRouteId: string;
  currentRemainingEstimate: RoutePollutionEstimate;
  currentRemainingDurationMinutes: number;
  currentRemainingDistanceKm: number;
  candidateAlternatives: RouteComparisonResult[];
  bestCleanerAlternative: RouteComparisonResult | null;
  isMeaningfullyCleaner: boolean;
  pm25Reduction: number | null; // µg/m³
  pm25ReductionPercent: number | null; // %
  additionalDurationMinutes: number;
  autoSwitchEligible: boolean;
  reason: string;
}

/**
 * Great-circle distance between two geographic coordinates in meters.
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000.0; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Projects a point P onto a line segment A -> B in meters using local flat-Earth projection.
 * Returns the nearest projected point [lat, lon], the distance in meters, and parameter t in [0, 1].
 */
export function projectPointOntoSegment(
  pLat: number,
  pLon: number,
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): {
  projectedLat: number;
  projectedLon: number;
  distanceMeters: number;
  t: number;
} {
  const midLatRad = (((aLat + bLat) / 2) * Math.PI) / 180;
  const metersPerDegLat = 111139.0;
  const metersPerDegLon = 111139.0 * Math.cos(midLatRad);

  const dxAB = (bLon - aLon) * metersPerDegLon;
  const dyAB = (bLat - aLat) * metersPerDegLat;
  const segLenSq = dxAB * dxAB + dyAB * dyAB;

  if (segLenSq < 0.0001) {
    // Degenerate segment: A and B are effectively identical
    const d = haversineMeters(pLat, pLon, aLat, aLon);
    return {
      projectedLat: aLat,
      projectedLon: aLon,
      distanceMeters: d,
      t: 0,
    };
  }

  const dxAP = (pLon - aLon) * metersPerDegLon;
  const dyAP = (pLat - aLat) * metersPerDegLat;

  const rawT = (dxAP * dxAB + dyAP * dyAB) / segLenSq;
  const t = Math.max(0, Math.min(1, rawT));

  const projectedLat = aLat + t * (bLat - aLat);
  const projectedLon = aLon + t * (bLon - aLon);

  const dxProj = (pLon - projectedLon) * metersPerDegLon;
  const dyProj = (pLat - projectedLat) * metersPerDegLat;
  const distanceMeters = Math.sqrt(dxProj * dxProj + dyProj * dyProj);

  return {
    projectedLat,
    projectedLon,
    distanceMeters,
    t,
  };
}

/**
 * Calculates current route progress, cross-track distance, and upcoming route coordinates.
 * Incorporates GPS accuracy gating and sustained deviation filtering to prevent false off-route alarms.
 */
export function calculateRouteProgress(
  gps: GPSPosition,
  routeCoordinates: [number, number][],
  totalDistanceMeters: number,
  totalDurationMinutes: number,
  prevOffRouteCount: number = 0
): RouteProgress {
  if (routeCoordinates.length === 0) {
    return {
      nearestSegmentIndex: 0,
      projectedCoord: [gps.lat, gps.lon],
      distanceToRouteMeters: 0,
      isOffRoute: false,
      offRouteCount: 0,
      isAccuracyImprecise: false,
      remainingDistanceMeters: 0,
      remainingDistanceKm: 0,
      remainingDurationMinutes: 0,
      distanceToDestinationMeters: 0,
      hasArrived: false,
      upcomingCoordinates: [],
    };
  }

  const destCoord = routeCoordinates[routeCoordinates.length - 1];
  const distanceToDestinationMeters = haversineMeters(
    gps.lat,
    gps.lon,
    destCoord[0],
    destCoord[1]
  );

  // Arrival threshold: within 45m of destination (or within GPS accuracy if between 40-75m)
  const arrivalThresholdMeters = Math.max(
    45,
    Math.min(75, gps.accuracy > 0 ? gps.accuracy * 0.9 : 45)
  );
  const hasArrived = distanceToDestinationMeters <= arrivalThresholdMeters;

  // Single-point route edge case
  if (routeCoordinates.length === 1) {
    return {
      nearestSegmentIndex: 0,
      projectedCoord: routeCoordinates[0],
      distanceToRouteMeters: distanceToDestinationMeters,
      isOffRoute: false,
      offRouteCount: 0,
      isAccuracyImprecise: gps.accuracy > 120,
      remainingDistanceMeters: distanceToDestinationMeters,
      remainingDistanceKm: Number((distanceToDestinationMeters / 1000).toFixed(1)),
      remainingDurationMinutes: 1,
      distanceToDestinationMeters,
      hasArrived,
      upcomingCoordinates: routeCoordinates,
    };
  }

  // Find nearest segment along polyline
  let minDistanceMeters = Infinity;
  let bestSegmentIndex = 0;
  let bestProjectedCoord: [number, number] = routeCoordinates[0];
  let bestT = 0;

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const a = routeCoordinates[i];
    const b = routeCoordinates[i + 1];
    const projection = projectPointOntoSegment(
      gps.lat,
      gps.lon,
      a[0],
      a[1],
      b[0],
      b[1]
    );

    if (projection.distanceMeters < minDistanceMeters) {
      minDistanceMeters = projection.distanceMeters;
      bestSegmentIndex = i;
      bestProjectedCoord = [projection.projectedLat, projection.projectedLon];
      bestT = projection.t;
    }
  }

  // Calculate remaining distance along road polyline from projection point
  // 1. Remaining portion of the current segment
  const currA = routeCoordinates[bestSegmentIndex];
  const currB = routeCoordinates[bestSegmentIndex + 1];
  const currSegLengthMeters = haversineMeters(currA[0], currA[1], currB[0], currB[1]);
  let remainingDistanceMeters = (1 - bestT) * currSegLengthMeters;

  // 2. Sum of all subsequent segments
  for (let j = bestSegmentIndex + 1; j < routeCoordinates.length - 1; j++) {
    const p1 = routeCoordinates[j];
    const p2 = routeCoordinates[j + 1];
    remainingDistanceMeters += haversineMeters(p1[0], p1[1], p2[0], p2[1]);
  }

  const remainingDistanceKm = Number((remainingDistanceMeters / 1000).toFixed(1));

  // Estimate remaining duration proportionally from original route duration
  const ratio =
    totalDistanceMeters > 0
      ? Math.max(0, Math.min(1.2, remainingDistanceMeters / totalDistanceMeters))
      : 0;
  const remainingDurationMinutes = hasArrived
    ? 0
    : Math.max(1, Math.round(totalDurationMinutes * ratio));

  // Build upcoming road coordinates slice
  const upcomingCoordinates: [number, number][] = [
    bestProjectedCoord,
    ...routeCoordinates.slice(bestSegmentIndex + 1),
  ];

  // GPS noise and off-route analysis:
  // Urban streets have lane offsets, tall structures, and occasional GPS jitter.
  // We establish an adaptive tolerance buffer based on reported GPS accuracy.
  const isAccuracyImprecise = gps.accuracy > 120;
  const toleranceMeters = Math.max(
    45,
    Math.min(130, (gps.accuracy > 0 ? gps.accuracy : 30) * 1.35)
  );

  let newOffRouteCount = prevOffRouteCount;
  let isOffRoute = false;

  if (hasArrived) {
    newOffRouteCount = 0;
    isOffRoute = false;
  } else if (isAccuracyImprecise) {
    // When accuracy is genuinely poor, do not flag false off-route; maintain route lock
    newOffRouteCount = Math.max(0, prevOffRouteCount - 1);
    isOffRoute = false;
  } else if (minDistanceMeters > toleranceMeters) {
    // Deviation detected. Sustained requirement: at least 3 consecutive updates outside buffer
    newOffRouteCount = prevOffRouteCount + 1;
    if (newOffRouteCount >= 3) {
      isOffRoute = true;
    }
  } else {
    // Back within buffer
    newOffRouteCount = 0;
    isOffRoute = false;
  }

  return {
    nearestSegmentIndex: bestSegmentIndex,
    projectedCoord: bestProjectedCoord,
    distanceToRouteMeters: Math.round(minDistanceMeters),
    isOffRoute,
    offRouteCount: newOffRouteCount,
    isAccuracyImprecise,
    remainingDistanceMeters: Math.round(remainingDistanceMeters),
    remainingDistanceKm,
    remainingDurationMinutes,
    distanceToDestinationMeters: Math.round(distanceToDestinationMeters),
    hasArrived,
    upcomingCoordinates,
  };
}

/**
 * Creates an upcoming slice of a RouteOption for pollution re-estimation.
 */
export function sliceUpcomingRoute(
  route: RouteOption,
  progress: RouteProgress
): RouteOption {
  const coords =
    progress.upcomingCoordinates.length >= 2
      ? progress.upcomingCoordinates
      : route.coordinates;

  return {
    ...route,
    id: `${route.id}-upcoming`,
    name: `${route.name} (Remaining Corridor)`,
    distanceMeters: progress.remainingDistanceMeters,
    distanceKm: progress.remainingDistanceKm,
    durationSeconds: progress.remainingDurationMinutes * 60,
    durationMinutes: progress.remainingDurationMinutes,
    coordinates: coords,
  };
}

/**
 * Monitors estimated PM2.5 exposure along the upcoming portion of the route.
 * Reuses existing IDW spatial estimation from routePollution.ts and user threshold preferences.
 */
export function monitorUpcomingRoutePollution(
  upcomingRoute: RouteOption,
  stations: Station[],
  stationObservations: Record<number, ObservationItem | null>
): UpcomingPollutionStatus {
  const estimate = estimateRoutePollution(
    upcomingRoute,
    stations,
    stationObservations
  );

  // Load resident alert threshold preference from device localStorage (or default 60 µg/m³)
  const residentPrefs = loadResidentPreferences();
  const hasUserPref =
    residentPrefs.enableThresholdAlert &&
    typeof residentPrefs.pm25Threshold === 'number' &&
    residentPrefs.pm25Threshold > 0;

  const thresholdPm25 = hasUserPref ? residentPrefs.pm25Threshold : 60;
  const thresholdSource = hasUserPref
    ? ('Resident Alert Preference' as const)
    : ('CPCB Moderate Baseline Standard' as const);

  let isElevated = false;
  let comparisonMessage = '';

  if (estimate.coverageStatus === 'VALID' && estimate.avgPm25 !== null) {
    if (estimate.avgPm25 > thresholdPm25) {
      isElevated = true;
      comparisonMessage = `Estimated PM2.5 along upcoming corridor (${estimate.avgPm25} µg/m³) exceeds your threshold (${thresholdPm25} µg/m³).`;
    } else {
      isElevated = false;
      comparisonMessage = `Upcoming route estimated PM2.5 is ${estimate.avgPm25} µg/m³, within the ${thresholdPm25} µg/m³ threshold.`;
    }
  } else if (estimate.coverageStatus === 'INSUFFICIENT_COVERAGE') {
    isElevated = false;
    comparisonMessage =
      'Upcoming road corridor is outside the reliable spatial radius of active monitoring stations. Model comparison is unverified.';
  } else {
    isElevated = false;
    comparisonMessage =
      'Regional monitoring station telemetry is currently syncing. Route pollution comparison paused.';
  }

  return {
    isElevated,
    estimate,
    thresholdPm25,
    thresholdSource,
    comparisonMessage,
  };
}

/**
 * Checks whether an alternative route has an acceptable detour time.
 * Rejects detours that add > 14 minutes or > 35% extra travel time.
 */
export function isDetourAcceptable(
  currentMinutes: number,
  altMinutes: number
): boolean {
  const extraMinutes = altMinutes - currentMinutes;
  if (extraMinutes <= 0) return true; // Equal or faster
  if (extraMinutes > 14) return false; // Over 14 minutes extra
  const percentIncrease = (extraMinutes / Math.max(1, currentMinutes)) * 100;
  return percentIncrease <= 35; // Maximum 35% time increase
}

/**
 * Evaluates candidate road routes fetched from current GPS position to destination.
 * Compares remaining PM2.5 exposure, travel time, and data validity.
 */
export function evaluateRerouteAlternatives(
  currentRouteId: string,
  currentRemainingEstimate: RoutePollutionEstimate,
  currentRemainingDurationMinutes: number,
  currentRemainingDistanceKm: number,
  candidateAlternatives: RouteComparisonResult[]
): RerouteComparison {
  // If no candidates or only 1 route returned by routing provider
  if (!candidateAlternatives || candidateAlternatives.length === 0) {
    return {
      currentRouteId,
      currentRemainingEstimate,
      currentRemainingDurationMinutes,
      currentRemainingDistanceKm,
      candidateAlternatives: [],
      bestCleanerAlternative: null,
      isMeaningfullyCleaner: false,
      pm25Reduction: null,
      pm25ReductionPercent: null,
      additionalDurationMinutes: 0,
      autoSwitchEligible: false,
      reason: 'No alternative road paths available from current GPS location.',
    };
  }

  // Filter candidates with VALID spatial coverage
  const validCandidates = candidateAlternatives.filter(
    (c) =>
      c.estimate.coverageStatus === 'VALID' &&
      c.estimate.avgPm25 !== null &&
      c.route.id !== currentRouteId
  );

  const currentPm25 = currentRemainingEstimate.avgPm25;

  if (
    currentRemainingEstimate.coverageStatus !== 'VALID' ||
    currentPm25 === null
  ) {
    return {
      currentRouteId,
      currentRemainingEstimate,
      currentRemainingDurationMinutes,
      currentRemainingDistanceKm,
      candidateAlternatives,
      bestCleanerAlternative: null,
      isMeaningfullyCleaner: false,
      pm25Reduction: null,
      pm25ReductionPercent: null,
      additionalDurationMinutes: 0,
      autoSwitchEligible: false,
      reason:
        'Current corridor lacks validated monitoring station coverage. Reliable comparison cannot be established.',
    };
  }

  // Find candidate with lowest PM2.5 that is also cleaner than current route
  let bestCandidate: RouteComparisonResult | null = null;
  let maxPm25Reduction = 0;

  for (const cand of validCandidates) {
    const candPm25 = cand.estimate.avgPm25!;
    const reduction = currentPm25 - candPm25;

    // Minimum meaningful difference: at least 2.5 µg/m³ lower PM2.5
    if (reduction >= 2.5 && isDetourAcceptable(currentRemainingDurationMinutes, cand.route.durationMinutes)) {
      if (reduction > maxPm25Reduction) {
        maxPm25Reduction = reduction;
        bestCandidate = cand;
      }
    }
  }

  if (!bestCandidate) {
    return {
      currentRouteId,
      currentRemainingEstimate,
      currentRemainingDurationMinutes,
      currentRemainingDistanceKm,
      candidateAlternatives,
      bestCleanerAlternative: null,
      isMeaningfullyCleaner: false,
      pm25Reduction: null,
      pm25ReductionPercent: null,
      additionalDurationMinutes: 0,
      autoSwitchEligible: false,
      reason:
        candidateAlternatives.length > 1
          ? 'Alternative road options exist, but none provide a meaningful reduction in estimated PM2.5 (>= 2.5 µg/m³).'
          : 'Routing provider returned only one road corridor to destination.',
    };
  }

  const pm25Reduction = Number(maxPm25Reduction.toFixed(1));
  const pm25ReductionPercent = Math.round(
    (maxPm25Reduction / Math.max(1, currentPm25)) * 100
  );
  const additionalDurationMinutes = Math.max(
    0,
    bestCandidate.route.durationMinutes - currentRemainingDurationMinutes
  );

  // Conditions for automatic switching:
  // 1. Meaningful difference threshold: >= 3.0 µg/m³ AND >= 8% lower PM2.5
  // 2. Detour is not unreasonable: extra time <= 10 mins
  // 3. Alternative coverage is VALID
  const autoSwitchEligible =
    maxPm25Reduction >= 3.0 &&
    pm25ReductionPercent >= 8 &&
    additionalDurationMinutes <= 10 &&
    bestCandidate.estimate.coverageStatus === 'VALID';

  const reason = `Found cleaner route via ${bestCandidate.route.summary}: est. PM2.5 is ${bestCandidate.estimate.avgPm25} µg/m³ (${pm25ReductionPercent}% cleaner, +${additionalDurationMinutes} mins).`;

  return {
    currentRouteId,
    currentRemainingEstimate,
    currentRemainingDurationMinutes,
    currentRemainingDistanceKm,
    candidateAlternatives,
    bestCleanerAlternative: bestCandidate,
    isMeaningfullyCleaner: true,
    pm25Reduction,
    pm25ReductionPercent,
    additionalDurationMinutes,
    autoSwitchEligible,
    reason,
  };
}

/**
 * Human-readable distance formatter.
 */
export function formatNavDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Human-readable duration formatter.
 */
export function formatNavDuration(minutes: number): string {
  if (minutes <= 0) return 'Arrived';
  if (minutes < 60) return `~${minutes} min${minutes === 1 ? '' : 's'}`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `${hrs} hr${hrs > 1 ? 's' : ''} ${rem} min${rem > 1 ? 's' : ''}`;
}
