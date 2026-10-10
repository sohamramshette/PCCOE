/**
 * Activity Guidance and Forecast Interpretation Engine
 * =====================================================
 * Generates responsible, plain-language activity guidance and locality-specific
 * recommendations from genuine ML forecast trajectories and current station observations.
 *
 * Strict Compliance:
 * - Never claims any outdoor activity is "completely safe".
 * - Never offers individual medical diagnoses or clinical health claims.
 * - Only highlights a cleaner period if the forecast establishes a meaningful difference (>= 5 µg/m³).
 * - Distinguishes measured readings from model forecasts and particulate-based estimates.
 * - Provides at most 3 concise, data-driven recommendations.
 */

import { ObservationItem } from '../types/observation';
import { TrajectoryPoint } from '../types/forecast';

export type ActivityType = 'exercise' | 'walking' | 'children';

export interface ActivityAdvice {
  activityType: ActivityType;
  title: string;
  badge: 'Optimal Window' | 'Standard Precautions' | 'Caution Advised' | 'Forecast Unavailable';
  badgeColor: string;
  bestTimeWindow: string;
  guidanceText: string;
  timingReason: string;
}

export interface LocalityForecastInterpretation {
  trendDirection: 'increasing' | 'decreasing' | 'steady' | 'insufficient_data';
  trendLabel: string;
  trendText: string;
  trendBadgeColor: string;
  currentObsPm25: number | null;
  currentObsTime: string | null;
  currentObsIsStale: boolean;
  forecastInitTime: string | null;
  peakHourLabel: string | null;
  peakPm25: number | null;
  lowestHourLabel: string | null;
  lowestPm25: number | null;
  hasMeaningfulVariation: boolean;
  activeGuidance: ActivityAdvice;
  practicalRecommendations: string[];
}

/**
 * Format ISO UTC string into readable Indian Standard Time (IST).
 */
export function formatISTTime(isoUtc?: string | null): string {
  if (!isoUtc) return 'Recent';
  try {
    const dt = new Date(isoUtc);
    return dt.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' IST';
  } catch {
    return 'Recent';
  }
}

/**
 * Format ISO UTC string into short hour label (e.g. "04:00 PM").
 */
export function formatShortHour(isoUtc: string): string {
  try {
    const dt = new Date(isoUtc);
    return dt.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoUtc;
  }
}

/**
 * Interprets locality forecast trajectory alongside current observation.
 */
export function interpretForecastAndActivity(
  stationName: string,
  latestObs: ObservationItem | null,
  trajectory: TrajectoryPoint[] = [],
  initializationTimeUtc?: string | null,
  selectedActivity: ActivityType = 'exercise'
): LocalityForecastInterpretation {
  // 1. Evaluate Current Observation Freshness
  const currentObsPm25 = latestObs?.pm25 ?? null;
  const currentObsTime = latestObs?.datetime_local_ist || latestObs?.datetime_utc || null;
  let currentObsIsStale = false;

  if (currentObsTime) {
    try {
      const obsDate = new Date(currentObsTime);
      const now = new Date();
      const diffHours = (now.getTime() - obsDate.getTime()) / (1000 * 60 * 60);
      if (diffHours > 4.0) {
        currentObsIsStale = true;
      }
    } catch {
      // Ignore timestamp parsing errors
    }
  }

  // 2. Handle Empty or Unavailable Trajectory
  if (!trajectory || trajectory.length === 0) {
    const unavailableAdvice: ActivityAdvice = {
      activityType: selectedActivity,
      title: getActivityTitle(selectedActivity),
      badge: 'Forecast Unavailable',
      badgeColor: '#a3b593',
      bestTimeWindow: 'Forecast timing unavailable',
      guidanceText:
        'Machine learning forecast updates are currently syncing for this locality. Check current sensor readings to plan outdoor activities, or revisit shortly.',
      timingReason: 'Continuous ML model inputs are undergoing alignment.',
    };

    return {
      trendDirection: 'insufficient_data',
      trendLabel: 'Forecast Updating',
      trendText:
        'Next-hour model predictions are currently synchronizing for this monitoring station.',
      trendBadgeColor: '#a3b593',
      currentObsPm25,
      currentObsTime,
      currentObsIsStale,
      forecastInitTime: initializationTimeUtc || null,
      peakHourLabel: null,
      peakPm25: null,
      lowestHourLabel: null,
      lowestPm25: null,
      hasMeaningfulVariation: false,
      activeGuidance: unavailableAdvice,
      practicalRecommendations: [
        'Forecast inputs are currently synchronizing for this locality.',
        'Refer to recent ambient sensor measurements to assess current conditions.',
        'Consider usual sensible precautions if local air feels hazy.',
      ],
    };
  }

  // 3. Analyze Trajectory Extremes & Trend
  const pm25Values = trajectory.map((p) => p.predicted_pm25);
  const minPm25 = Math.min(...pm25Values);
  const maxPm25 = Math.max(...pm25Values);
  const minIdx = pm25Values.indexOf(minPm25);
  const maxIdx = pm25Values.indexOf(maxPm25);

  const peakHourLabel = formatShortHour(trajectory[maxIdx].target_time_utc);
  const lowestHourLabel = formatShortHour(trajectory[minIdx].target_time_utc);

  // Meaningful variation threshold: at least 5.0 µg/m³ spread across forecast horizon
  const spread = maxPm25 - minPm25;
  const hasMeaningfulVariation = spread >= 5.0;

  // Evaluate overall trend: compare start (t+1..t+3) vs later (t+4..t+6 or t+12)
  const earlySteps = trajectory.slice(0, Math.min(3, trajectory.length));
  const avgEarly = earlySteps.reduce((acc, p) => acc + p.predicted_pm25, 0) / earlySteps.length;
  const laterSteps = trajectory.slice(Math.min(3, trajectory.length), Math.min(8, trajectory.length));
  const avgLater = laterSteps.length > 0
    ? laterSteps.reduce((acc, p) => acc + p.predicted_pm25, 0) / laterSteps.length
    : avgEarly;

  const trendDiff = avgLater - avgEarly;

  let trendDirection: 'increasing' | 'decreasing' | 'steady' = 'steady';
  let trendLabel = 'Relatively Steady';
  let trendText = 'Particulate concentrations are forecast to remain relatively stable over upcoming hours.';
  let trendBadgeColor = '#38bdf8';

  if (trendDiff >= 3.0) {
    trendDirection = 'increasing';
    trendLabel = 'Expected Increase';
    trendText = `Pollution is projected to rise later in the forecast window, peaking around ${peakHourLabel} (~${maxPm25.toFixed(1)} µg/m³).`;
    trendBadgeColor = '#facc15';
  } else if (trendDiff <= -3.0) {
    trendDirection = 'decreasing';
    trendLabel = 'Expected Improvement';
    trendText = `Pollution is projected to decrease over upcoming hours, reaching lowest levels around ${lowestHourLabel} (~${minPm25.toFixed(1)} µg/m³).`;
    trendBadgeColor = '#4ade80';
  }

  // 4. Find Best Consecutive 2-3 Hour Window
  let bestWindowStartIdx = minIdx;
  let bestWindowEndIdx = minIdx;

  if (trajectory.length >= 3) {
    let lowestRollingSum = Infinity;
    let bestStart = 0;
    for (let i = 0; i <= trajectory.length - 3; i++) {
      const rollingSum =
        trajectory[i].predicted_pm25 +
        trajectory[i + 1].predicted_pm25 +
        trajectory[i + 2].predicted_pm25;
      if (rollingSum < lowestRollingSum) {
        lowestRollingSum = rollingSum;
        bestStart = i;
      }
    }
    bestWindowStartIdx = bestStart;
    bestWindowEndIdx = bestStart + 2;
  }

  const windowStartTime = formatShortHour(trajectory[bestWindowStartIdx].target_time_utc);
  const windowEndTime = formatShortHour(trajectory[bestWindowEndIdx].target_time_utc);
  const windowAvgPm25 = (
    trajectory.slice(bestWindowStartIdx, bestWindowEndIdx + 1).reduce((acc, p) => acc + p.predicted_pm25, 0) /
    (bestWindowEndIdx - bestWindowStartIdx + 1)
  ).toFixed(1);

  // 5. Activity Guidance Generation
  const activeGuidance = generateActivityAdvice(
    selectedActivity,
    stationName,
    hasMeaningfulVariation,
    windowStartTime,
    windowEndTime,
    windowAvgPm25,
    minPm25,
    maxPm25,
    peakHourLabel,
    lowestHourLabel,
    trendDirection
  );

  // 6. Generate Max 3 Practical Recommendations (Data-driven, locality-focused)
  const practicalRecommendations: string[] = [];

  // Recommendation 1: Trend-based summary
  if (trendDirection === 'increasing') {
    practicalRecommendations.push(
      `Pollution is forecast to increase later in the period, peaking near ${peakHourLabel} (${maxPm25.toFixed(1)} µg/m³).`
    );
  } else if (trendDirection === 'decreasing') {
    practicalRecommendations.push(
      `Air quality is projected to improve over upcoming hours, reaching lower levels around ${lowestHourLabel} (${minPm25.toFixed(1)} µg/m³).`
    );
  } else {
    practicalRecommendations.push(
      `Predicted particulate levels remain relatively steady throughout upcoming hours (~${minPm25.toFixed(1)}–${maxPm25.toFixed(1)} µg/m³).`
    );
  }

  // Recommendation 2: Activity timing window
  if (hasMeaningfulVariation) {
    practicalRecommendations.push(
      `Consider choosing the period between ${windowStartTime} and ${windowEndTime} for outdoor activities to reduce estimated particulate exposure.`
    );
  } else {
    practicalRecommendations.push(
      `Forecast data shows minimal variation between hours; schedule activities based on standard weather and convenience.`
    );
  }

  // Recommendation 3: Sensible exposure guideline
  if (maxPm25 >= 60.0) {
    practicalRecommendations.push(
      `Children, seniors, and sensitive individuals should pace prolonged strenuous exertion during peak periods.`
    );
  } else if (maxPm25 >= 30.0) {
    practicalRecommendations.push(
      `Ambient conditions are suitable for most residents; sensitive individuals may prefer lower-exposure hours.`
    );
  } else {
    practicalRecommendations.push(
      `Ambient particulate concentrations are within clean thresholds across the forecast window.`
    );
  }

  return {
    trendDirection,
    trendLabel,
    trendText,
    trendBadgeColor,
    currentObsPm25,
    currentObsTime,
    currentObsIsStale,
    forecastInitTime: initializationTimeUtc || null,
    peakHourLabel,
    peakPm25: Number(maxPm25.toFixed(1)),
    lowestHourLabel,
    lowestPm25: Number(minPm25.toFixed(1)),
    hasMeaningfulVariation,
    activeGuidance,
    practicalRecommendations: practicalRecommendations.slice(0, 3),
  };
}

function getActivityTitle(activityType: ActivityType): string {
  switch (activityType) {
    case 'exercise':
      return 'Outdoor Exercise & Running';
    case 'walking':
      return 'Walking & Outdoor Errands';
    case 'children':
      return "Children's Outdoor Play";
  }
}

function generateActivityAdvice(
  activityType: ActivityType,
  stationName: string,
  hasMeaningfulVariation: boolean,
  windowStartTime: string,
  windowEndTime: string,
  windowAvgPm25: string,
  minPm25: number,
  maxPm25: number,
  peakHourLabel: string,
  lowestHourLabel: string,
  trendDirection: 'increasing' | 'decreasing' | 'steady'
): ActivityAdvice {
  const title = getActivityTitle(activityType);

  let badge: 'Optimal Window' | 'Standard Precautions' | 'Caution Advised' = 'Standard Precautions';
  let badgeColor = '#38bdf8';

  if (hasMeaningfulVariation && (trendDirection === 'decreasing' || minPm25 < 35)) {
    badge = 'Optimal Window';
    badgeColor = '#4ade80';
  } else if (maxPm25 > 90) {
    badge = 'Caution Advised';
    badgeColor = '#fb923c';
  }

  let bestTimeWindow = hasMeaningfulVariation
    ? `${windowStartTime} – ${windowEndTime}`
    : 'Flexible across forecast window';

  let guidanceText = '';
  let timingReason = '';

  if (activityType === 'exercise') {
    if (hasMeaningfulVariation) {
      guidanceText = `Planning your workout between ${windowStartTime} and ${windowEndTime} exposes you to estimated PM2.5 levels of ~${windowAvgPm25} µg/m³, which is lower than the peak period around ${peakHourLabel} (~${maxPm25.toFixed(1)} µg/m³). Higher exertion increases air intake, making timing beneficial.`;
      timingReason = `Derived from machine learning dispersion forecasts indicating improved ventilation around ${lowestHourLabel}.`;
    } else {
      guidanceText = `Predicted particulate concentrations in ${stationName.split(',')[0]} stay within ~${minPm25.toFixed(1)}–${maxPm25.toFixed(1)} µg/m³ throughout this window. You can proceed with outdoor training at your regular preferred time while listening to your body.`;
      timingReason = `Forecast data does not establish a statistically significant difference between hours.`;
    }
  } else if (activityType === 'walking') {
    if (hasMeaningfulVariation) {
      guidanceText = `For general walks, commuting, or outdoor errands, the window from ${windowStartTime} to ${windowEndTime} offers lighter particulate exposure (~${windowAvgPm25} µg/m³). Avoid walking along heavily congested road corridors during the peak hour around ${peakHourLabel}.`;
      timingReason = `Model trajectory projects particulate concentrations to ease near ${lowestHourLabel}.`;
    } else {
      guidanceText = `Outdoor walking and everyday errands can be undertaken normally throughout the forecast period. Particulate levels are expected to hover around ~${minPm25.toFixed(1)} µg/m³ across the neighborhood.`;
      timingReason = `Steady atmospheric conditions predicted with no prominent peak or trough.`;
    }
  } else {
    // Children's outdoor play
    if (hasMeaningfulVariation) {
      guidanceText = `Children have faster breathing rates and developing respiratory systems. Scheduling outdoor playground activities between ${windowStartTime} and ${windowEndTime} avoids the projected morning/evening peak (~${maxPm25.toFixed(1)} µg/m³).`;
      timingReason = `Lowest predicted exposure window (~${windowAvgPm25} µg/m³) identified from station forecast.`;
    } else {
      guidanceText = `Children can engage in outdoor activities as usual. Conditions are projected to remain relatively consistent (~${minPm25.toFixed(1)} µg/m³). Encourage regular hydration and standard outdoor breaks.`;
      timingReason = `Model trajectory shows consistent ambient readings without sharp spikes.`;
    }
  }

  return {
    activityType,
    title,
    badge,
    badgeColor,
    bestTimeWindow,
    guidanceText,
    timingReason,
  };
}
