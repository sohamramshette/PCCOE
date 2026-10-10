/**
 * Resident Alerts Utility & Preferences Engine
 * ============================================
 * Provides plain-English interpretations, proportionate resident precautions,
 * and device-local preference management for the AirLens User Portal.
 *
 * Strict Compliance:
 * - Distinguishes measured readings from model estimates.
 * - Does not invent false alerts or claim unverified push notification capabilities.
 * - Explains clearly that alert preferences are saved locally on this browser.
 * - Does not conflate user PM2.5 thresholds with official 24-hour CPCB AQI.
 */

import { AlertItem, AlertSeverity, AlertType } from '../types/alert';
import { parseUtcDate } from './formatters';

export interface ResidentAlertPreferences {
  selectedStationIds: number[];
  enableThresholdAlert: boolean;
  pm25Threshold: number; // in µg/m³
  enableForecastWatch: boolean;
  forecastThreshold: number; // in µg/m³
  enableBrowserNotifications: boolean;
}

export const DEFAULT_RESIDENT_PREFERENCES: ResidentAlertPreferences = {
  selectedStationIds: [11613, 60658, 3409438], // Shivajinagar, Hadapsar, Katraj
  enableThresholdAlert: true,
  pm25Threshold: 60, // CPCB Moderate threshold boundary (60 µg/m³)
  enableForecastWatch: false,
  forecastThreshold: 90,
  enableBrowserNotifications: false,
};

const STORAGE_KEY = 'airlens_resident_alert_preferences_v1';

/**
 * Loads resident alert preferences from device localStorage.
 */
export function loadResidentPreferences(): ResidentAlertPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RESIDENT_PREFERENCES };
    const parsed = JSON.parse(raw);
    return {
      selectedStationIds: Array.isArray(parsed.selectedStationIds) && parsed.selectedStationIds.length > 0
        ? parsed.selectedStationIds
        : DEFAULT_RESIDENT_PREFERENCES.selectedStationIds,
      enableThresholdAlert: typeof parsed.enableThresholdAlert === 'boolean' ? parsed.enableThresholdAlert : true,
      pm25Threshold: typeof parsed.pm25Threshold === 'number' && parsed.pm25Threshold > 0 ? parsed.pm25Threshold : 60,
      enableForecastWatch: typeof parsed.enableForecastWatch === 'boolean' ? parsed.enableForecastWatch : false,
      forecastThreshold: typeof parsed.forecastThreshold === 'number' && parsed.forecastThreshold > 0 ? parsed.forecastThreshold : 90,
      enableBrowserNotifications: typeof parsed.enableBrowserNotifications === 'boolean' ? parsed.enableBrowserNotifications : false,
    };
  } catch {
    return { ...DEFAULT_RESIDENT_PREFERENCES };
  }
}

/**
 * Persists resident alert preferences to device localStorage.
 */
export function saveResidentPreferences(prefs: ResidentAlertPreferences): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats a UTC ISO timestamp to Indian Standard Time (IST) for ordinary Pune residents.
 */
export function formatLocalIST(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = parseUtcDate(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' IST';
  } catch {
    return String(isoString);
  }
}

/**
 * Formats relative time elapsed since the alert was detected.
 */
export function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return 'Recently';
  try {
    const d = parseUtcDate(isoString);
    if (isNaN(d.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } catch {
    return 'Recently';
  }
}

/**
 * Maps system AlertType to resident-friendly titles.
 */
export function getFriendlyAlertTitle(type: AlertType): string {
  switch (type) {
    case 'ATMOSPHERIC_STAGNATION':
      return 'Atmospheric Inversion & Low Dispersal';
    case 'PM25_SPIKE':
      return 'Rapid PM2.5 Elevation Detected';
    case 'PM25_THRESHOLD':
      return 'PM2.5 Sensor Threshold Exceeded';
    case 'PM25_ANOMALY':
      return 'Unusual Local PM2.5 Pattern';
    case 'LOW_WIND':
      return 'Calm Surface Wind (< 1.0 m/s)';
    case 'FORECAST_DEVIATION':
      return 'Air Quality Divergence from Forecast';
    case 'SENSOR_OFFLINE':
    case 'DATA_GAP':
      return 'Monitoring Stream Temporarily Offline';
    case 'SENSOR_ANOMALY':
      return 'Telemetry Signal Irregularity';
    default:
      return type.replace(/_/g, ' ');
  }
}

/**
 * Maps system severity to human-readable label and visual styling tokens.
 */
export interface SeverityVisuals {
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
}

export function getSeverityVisuals(severity: AlertSeverity): SeverityVisuals {
  switch (severity) {
    case 'CRITICAL':
      return {
        label: 'Critical Advisory',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        badgeBorder: 'rgba(239, 68, 68, 0.4)',
        badgeText: '#fca5a5',
        dotColor: '#ef4444',
      };
    case 'HIGH':
      return {
        label: 'Significant Advisory',
        badgeBg: 'rgba(249, 115, 22, 0.15)',
        badgeBorder: 'rgba(249, 115, 22, 0.4)',
        badgeText: '#fdba74',
        dotColor: '#f97316',
      };
    case 'MEDIUM':
      return {
        label: 'Moderate Notice',
        badgeBg: 'rgba(234, 179, 8, 0.15)',
        badgeBorder: 'rgba(234, 179, 8, 0.4)',
        badgeText: '#fef08a',
        dotColor: '#eab308',
      };
    case 'LOW':
      return {
        label: 'Advisory Watch',
        badgeBg: 'rgba(132, 204, 22, 0.15)',
        badgeBorder: 'rgba(132, 204, 22, 0.4)',
        badgeText: '#bef264',
        dotColor: '#84cc16',
      };
    case 'INFO':
    default:
      return {
        label: 'Network Notice',
        badgeBg: 'rgba(56, 189, 248, 0.15)',
        badgeBorder: 'rgba(56, 189, 248, 0.4)',
        badgeText: '#7dd3fc',
        dotColor: '#38bdf8',
      };
  }
}

/**
 * Returns calm, practical, and proportionate precautions for residents.
 */
export function getProportionatePrecaution(alert: AlertItem): {
  headline: string;
  action: string;
  targetGroup: string;
} {
  switch (alert.alert_type) {
    case 'ATMOSPHERIC_STAGNATION':
      return {
        headline: 'Ventilation is restricted near the surface.',
        action: 'Emitted smoke and vehicular exhaust disperse slowly during calm mornings. Shift strenuous workouts or jogging to midday or late afternoon when solar warming expands the mixing layer.',
        targetGroup: 'Joggers, outdoor fitness enthusiasts & roadside commuters',
      };
    case 'PM25_SPIKE':
    case 'PM25_THRESHOLD':
    case 'PM25_ANOMALY':
      if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
        return {
          headline: 'Fine particulate concentration is significantly elevated.',
          action: 'Children, seniors, and residents with asthma or respiratory sensitivity should stay indoors and avoid heavy outdoor exertion. Keep windows closed facing arterial roads.',
          targetGroup: 'Sensitive groups, seniors & children',
        };
      }
      return {
        headline: 'Temporary rise in local fine particulates.',
        action: 'Consider taking cleaner, tree-lined routes away from heavy construction or traffic congestion. Sensitive individuals should take extra care during transit.',
        targetGroup: 'Sensitive residents & daily commuters',
      };
    case 'LOW_WIND':
      return {
        headline: 'Airflow is calm across the locality.',
        action: 'Low wind speeds allow localized roadside emissions to accumulate near road level. Prefer pedestrian paths that are buffered from vehicle tailpipes.',
        targetGroup: 'Pedestrians & cyclists',
      };
    case 'FORECAST_DEVIATION':
      return {
        headline: 'Local readings departed from the statistical forecast.',
        action: 'Check real-time station measurements before organizing outdoor events rather than relying solely on the previous hour\'s forecast model.',
        targetGroup: 'Event planners & outdoor activity groups',
      };
    case 'DATA_GAP':
    case 'SENSOR_OFFLINE':
    case 'SENSOR_ANOMALY':
      return {
        headline: 'Local sensor stream is synchronizing.',
        action: 'Ground-truth particulate data is temporarily unverified at this sensor. Refer to nearby monitoring stations (e.g. Shivajinagar or Hadapsar) for regional baseline trends.',
        targetGroup: 'All residents monitoring this neighborhood',
      };
    default:
      return {
        headline: 'Environmental condition update.',
        action: 'Review local air quality readings periodically and plan sensitive outdoor activities during daylight hours.',
        targetGroup: 'General public',
      };
  }
}

/**
 * Browser Notification Helper
 * Respects user permission and avoids duplicated notifications.
 */
const notifiedAlertIds = new Set<number>();

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
}

export function canSendNotification(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

export function dispatchResidentNotification(title: string, body: string, alertId?: number): boolean {
  if (!canSendNotification()) return false;
  if (alertId && notifiedAlertIds.has(alertId)) return false;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: alertId ? `airlens-alert-${alertId}` : 'airlens-notice',
    });
    if (alertId) {
      notifiedAlertIds.add(alertId);
    }
    notification.onclick = () => {
      window.focus();
    };
    return true;
  } catch {
    return false;
  }
}
