import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  BellOff,
  BellRing,
  MapPin,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Info,
  RefreshCw,
  ExternalLink,
  Sliders,
  History,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Sparkles,
  Smartphone,
} from 'lucide-react';

import { getActiveAlerts, getAlerts, getAlertSummary } from '../api/alerts';
import { getStations } from '../api/stations';
import { AlertItem, AlertSummary } from '../types/alert';
import { Station } from '../types/station';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  ResidentAlertPreferences,
  loadResidentPreferences,
  saveResidentPreferences,
  formatLocalIST,
  formatRelativeTime,
  getFriendlyAlertTitle,
  getSeverityVisuals,
  getProportionatePrecaution,
  requestNotificationPermission,
  canSendNotification,
  dispatchResidentNotification,
} from '../utils/residentAlerts';

export const MyAlerts: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Navigation / Tab state: 'active' | 'preferences' | 'history'
  const [activeTab, setActiveTab] = useState<'active' | 'preferences' | 'history'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'preferences' || tabParam === 'history') return tabParam;
    return 'active';
  });

  // Network data
  const [stations, setStations] = useState<Station[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);

  // Loading & error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Resident preferences state (persisted in device localStorage)
  const [prefs, setPrefs] = useState<ResidentAlertPreferences>(() => loadResidentPreferences());
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Active alerts filter by station
  const [selectedStationFilter, setSelectedStationFilter] = useState<number | 'ALL_MONITORED' | 'ALL_NETWORK'>('ALL_MONITORED');

  // Modal for technical diagnostic inspection
  const [inspectAlert, setInspectAlert] = useState<AlertItem | null>(null);

  // 1. Fetch initial network data, active alerts, and recent alert history
  const loadAlertsData = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setFetchError(null);

    try {
      const [stationList, activeList, summaryData, paginatedHistory] = await Promise.all([
        getStations(true),
        getActiveAlerts(),
        getAlertSummary().catch(() => null),
        getAlerts({ limit: 15, order: 'desc' }).catch(() => ({ items: [], total: 0 })),
      ]);

      setStations(stationList);
      setActiveAlerts(activeList);
      setAlertSummary(summaryData);
      setRecentAlerts(paginatedHistory.items || []);
    } catch {
      setFetchError('Unable to connect to the regional alert engine. Please check your connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAlertsData();
  }, [loadAlertsData]);

  // Station mapping helper
  const stationMap = useMemo(() => {
    const map = new Map<number, Station>();
    stations.forEach((s) => map.set(s.station_id, s));
    return map;
  }, [stations]);

  // Helper to extract clean station name
  const getCleanStationName = useCallback(
    (stationId: number, rawName?: string) => {
      const station = stationMap.get(stationId);
      if (station) return station.station_name.split(',')[0].trim();
      if (rawName) return rawName.split(',')[0].trim();
      return `Station #${stationId}`;
    },
    [stationMap]
  );

  // Filtered active alerts based on user's current filter selection
  const filteredActiveAlerts = useMemo(() => {
    if (selectedStationFilter === 'ALL_NETWORK') {
      return activeAlerts;
    }
    if (selectedStationFilter === 'ALL_MONITORED') {
      const monitoredSet = new Set(prefs.selectedStationIds);
      return activeAlerts.filter((a) => monitoredSet.has(a.station_id));
    }
    return activeAlerts.filter((a) => a.station_id === selectedStationFilter);
  }, [activeAlerts, selectedStationFilter, prefs.selectedStationIds]);

  // Monitored active alerts count
  const monitoredActiveCount = useMemo(() => {
    const monitoredSet = new Set(prefs.selectedStationIds);
    return activeAlerts.filter((a) => monitoredSet.has(a.station_id)).length;
  }, [activeAlerts, prefs.selectedStationIds]);

  // Handle station toggle in preferences
  const handleToggleStationPref = (stationId: number) => {
    setPrefs((prev) => {
      const exists = prev.selectedStationIds.includes(stationId);
      let updated: number[];
      if (exists) {
        // Prevent deselecting all stations
        if (prev.selectedStationIds.length <= 1) return prev;
        updated = prev.selectedStationIds.filter((id) => id !== stationId);
      } else {
        updated = [...prev.selectedStationIds, stationId];
      }
      return { ...prev, selectedStationIds: updated };
    });
  };

  // Handle threshold preset selection
  const handleSelectPresetThreshold = (val: number) => {
    setPrefs((prev) => ({
      ...prev,
      pm25Threshold: val,
      enableThresholdAlert: true,
    }));
  };

  // Handle browser notification toggle
  const handleToggleNotifications = async () => {
    if (!prefs.enableBrowserNotifications) {
      const perm = await requestNotificationPermission();
      setBrowserPermission(perm);
      if (perm === 'granted') {
        setPrefs((prev) => ({ ...prev, enableBrowserNotifications: true }));
        dispatchResidentNotification(
          'AirLens Alerts Enabled',
          'You will receive environmental notifications in this browser tab when active conditions exceed your thresholds.'
        );
      } else {
        setPrefs((prev) => ({ ...prev, enableBrowserNotifications: false }));
      }
    } else {
      setPrefs((prev) => ({ ...prev, enableBrowserNotifications: false }));
    }
  };

  // Save preferences action
  const handleSavePreferences = () => {
    const success = saveResidentPreferences(prefs);
    if (success) {
      setSavedFeedback('Preferences saved locally to this device.');
      setTimeout(() => setSavedFeedback(null), 3500);
    }
  };

  // Trigger test notification
  const handleTestNotification = () => {
    if (canSendNotification()) {
      dispatchResidentNotification(
        'AirLens Test Notification',
        'Notifications are configured successfully. Monitored Pune localities will notify you when active advisories occur.'
      );
    } else {
      alert('Browser notifications are not permitted. Please enable notification permissions in your browser settings.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner message="Connecting to Regional Environmental Alert Engine..." />
      </div>
    );
  }

  return (
    <div className="alerts-page citizen-theme" style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.25rem 1rem 3rem' }}>
      {/* 1. Header Section */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                background: 'rgba(92, 114, 82, 0.25)',
                border: '1px solid rgba(138, 168, 126, 0.4)',
                color: '#8aa87e',
                textTransform: 'uppercase',
              }}
            >
              <Bell size={12} />
              Resident Advisory Center
            </span>
            <span style={{ fontSize: '0.78rem', color: '#9ba395' }}>· PMC &amp; PCMC Twin City Region</span>
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: '#eef1e7', margin: '0 0 0.35rem' }}>
            My Alerts &amp; Pollution Advisories
          </h1>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#b2baa8', maxWidth: '720px', lineHeight: 1.5 }}>
            Stay informed about active pollution surges, atmospheric inversions, and local air quality advisories
            affecting your monitored neighborhoods.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={() => loadAlertsData(true)}
            disabled={isRefreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid rgba(238, 241, 231, 0.15)',
              background: 'rgba(30, 36, 26, 0.7)',
              color: '#d6ded0',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: isRefreshing ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-animation' : ''} />
            <span>{isRefreshing ? 'Checking...' : 'Check Now'}</span>
          </button>
        </div>
      </div>

      {fetchError && (
        <div
          style={{
            padding: '0.85rem 1.1rem',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <AlertTriangle size={16} />
          <span>{fetchError}</span>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Card 1: Active in Monitored Areas */}
        <div
          style={{
            background: 'rgba(24, 30, 20, 0.75)',
            border: `1px solid ${monitoredActiveCount > 0 ? 'rgba(249, 115, 22, 0.35)' : 'rgba(92, 114, 82, 0.25)'}`,
            borderRadius: '12px',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ba395', fontWeight: 600 }}>Active Advisories</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: monitoredActiveCount > 0 ? 'rgba(249, 115, 22, 0.2)' : 'rgba(92, 114, 82, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: monitoredActiveCount > 0 ? '#fb923c' : '#8aa87e',
              }}
            >
              {monitoredActiveCount > 0 ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: monitoredActiveCount > 0 ? '#fdba74' : '#eef1e7' }}>
              {monitoredActiveCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#889381', marginTop: '0.2rem' }}>
              Across {prefs.selectedStationIds.length} monitored localit{prefs.selectedStationIds.length === 1 ? 'y' : 'ies'}
            </div>
          </div>
        </div>

        {/* Card 2: Monitored Localities */}
        <div
          style={{
            background: 'rgba(24, 30, 20, 0.75)',
            border: '1px solid rgba(92, 114, 82, 0.25)',
            borderRadius: '12px',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ba395', fontWeight: 600 }}>Monitored Areas</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(92, 114, 82, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8aa87e',
              }}
            >
              <MapPin size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#eef1e7' }}>
              {prefs.selectedStationIds.length} <span style={{ fontSize: '1rem', fontWeight: 400, color: '#7a8573' }}>/ {stations.length || 6}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#889381', marginTop: '0.2rem' }}>
              Pune &amp; Pimpri-Chinchwad stations
            </div>
          </div>
        </div>

        {/* Card 3: PM2.5 Custom Watch Rule */}
        <div
          style={{
            background: 'rgba(24, 30, 20, 0.75)',
            border: '1px solid rgba(92, 114, 82, 0.25)',
            borderRadius: '12px',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ba395', fontWeight: 600 }}>PM2.5 Threshold Rule</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: prefs.enableThresholdAlert ? 'rgba(138, 168, 126, 0.2)' : 'rgba(100, 100, 100, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: prefs.enableThresholdAlert ? '#8aa87e' : '#9ca3af',
              }}
            >
              <Sliders size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#eef1e7' }}>
              {prefs.enableThresholdAlert ? `${prefs.pm25Threshold} µg/m³` : 'Disabled'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#889381', marginTop: '0.2rem' }}>
              {prefs.enableThresholdAlert ? 'Alerts if station exceeds this limit' : 'User threshold watch is paused'}
            </div>
          </div>
        </div>

        {/* Card 4: Browser Notification Status */}
        <div
          style={{
            background: 'rgba(24, 30, 20, 0.75)',
            border: '1px solid rgba(92, 114, 82, 0.25)',
            borderRadius: '12px',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ba395', fontWeight: 600 }}>Browser Notifications</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: prefs.enableBrowserNotifications ? 'rgba(56, 189, 248, 0.2)' : 'rgba(100, 100, 100, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: prefs.enableBrowserNotifications ? '#38bdf8' : '#9ca3af',
              }}
            >
              {prefs.enableBrowserNotifications ? <BellRing size={16} /> : <BellOff size={16} />}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#eef1e7' }}>
              {prefs.enableBrowserNotifications ? 'Active' : 'Muted'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#889381', marginTop: '0.2rem' }}>
              {prefs.enableBrowserNotifications ? 'Active while tab is open' : 'In-app notification only'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(92, 114, 82, 0.25)',
          paddingBottom: '0.65rem',
          marginBottom: '1.5rem',
        }}
      >
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'active' ? 'rgba(92, 114, 82, 0.35)' : 'transparent',
            color: activeTab === 'active' ? '#eef1e7' : '#9ba395',
            fontWeight: activeTab === 'active' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Bell size={15} />
          <span>Active Advisories</span>
          {monitoredActiveCount > 0 && (
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                background: '#ea580c',
                color: '#ffffff',
                fontWeight: 700,
              }}
            >
              {monitoredActiveCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'preferences' ? 'rgba(92, 114, 82, 0.35)' : 'transparent',
            color: activeTab === 'preferences' ? '#eef1e7' : '#9ba395',
            fontWeight: activeTab === 'preferences' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Sliders size={15} />
          <span>Alert Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'history' ? 'rgba(92, 114, 82, 0.35)' : 'transparent',
            color: activeTab === 'history' ? '#eef1e7' : '#9ba395',
            fontWeight: activeTab === 'history' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease',
          }}
        >
          <History size={15} />
          <span>Recent Alert History</span>
          {alertSummary?.resolved_alerts ? (
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                background: 'rgba(92, 114, 82, 0.3)',
                color: '#9ba395',
                fontWeight: 600,
              }}
            >
              {alertSummary.resolved_alerts}
            </span>
          ) : null}
        </button>
      </div>

      {/* 4. TAB 1: ACTIVE ADVISORIES */}
      {activeTab === 'active' && (
        <div>
          {/* Station Filter Chips */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.45rem',
              marginBottom: '1.25rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#889381', marginRight: '0.3rem' }}>Filter by Locality:</span>
            <button
              onClick={() => setSelectedStationFilter('ALL_MONITORED')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: selectedStationFilter === 'ALL_MONITORED' ? '#8aa87e' : 'rgba(92, 114, 82, 0.25)',
                background: selectedStationFilter === 'ALL_MONITORED' ? 'rgba(138, 168, 126, 0.2)' : 'rgba(25, 30, 22, 0.6)',
                color: selectedStationFilter === 'ALL_MONITORED' ? '#eef1e7' : '#9ba395',
                fontSize: '0.8rem',
                fontWeight: selectedStationFilter === 'ALL_MONITORED' ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              Monitored Localities ({monitoredActiveCount})
            </button>

            {prefs.selectedStationIds.map((stId) => {
              const name = getCleanStationName(stId);
              const count = activeAlerts.filter((a) => a.station_id === stId).length;
              return (
                <button
                  key={stId}
                  onClick={() => setSelectedStationFilter(stId)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: selectedStationFilter === stId ? '#8aa87e' : 'rgba(92, 114, 82, 0.25)',
                    background: selectedStationFilter === stId ? 'rgba(138, 168, 126, 0.2)' : 'rgba(25, 30, 22, 0.6)',
                    color: selectedStationFilter === stId ? '#eef1e7' : '#9ba395',
                    fontSize: '0.8rem',
                    fontWeight: selectedStationFilter === stId ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {name} {count > 0 ? `(${count})` : ''}
                </button>
              );
            })}

            <button
              onClick={() => setSelectedStationFilter('ALL_NETWORK')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: selectedStationFilter === 'ALL_NETWORK' ? '#8aa87e' : 'rgba(92, 114, 82, 0.25)',
                background: selectedStationFilter === 'ALL_NETWORK' ? 'rgba(138, 168, 126, 0.2)' : 'rgba(25, 30, 22, 0.6)',
                color: selectedStationFilter === 'ALL_NETWORK' ? '#eef1e7' : '#9ba395',
                fontSize: '0.8rem',
                fontWeight: selectedStationFilter === 'ALL_NETWORK' ? 700 : 500,
                cursor: 'pointer',
                marginLeft: 'auto',
              }}
            >
              Entire Network ({activeAlerts.length})
            </button>
          </div>

          {/* Active Alerts List or Empty State */}
          {filteredActiveAlerts.length === 0 ? (
            <div
              style={{
                background: 'rgba(24, 30, 20, 0.6)',
                border: '1px solid rgba(92, 114, 82, 0.3)',
                borderRadius: '16px',
                padding: '3rem 2rem',
                textAlign: 'center',
                maxWidth: '680px',
                margin: '2rem auto',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(92, 114, 82, 0.25)',
                  border: '1px solid rgba(138, 168, 126, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  color: '#8aa87e',
                }}
              >
                <ShieldCheck size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#eef1e7', margin: '0 0 0.5rem' }}>
                No active pollution alerts for your selected locations.
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#a2ab9a', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
                Current air quality readings and atmospheric conditions at these stations are operating within standard
                baseline advisory thresholds.
              </p>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(30, 38, 26, 0.8)',
                  border: '1px solid rgba(92, 114, 82, 0.2)',
                  fontSize: '0.78rem',
                  color: '#889381',
                  textAlign: 'left',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#9ba395', fontWeight: 600, marginBottom: '0.2rem' }}>
                  <Info size={13} />
                  <span>Important Resident Note</span>
                </div>
                The absence of active alerts indicates that warning triggers have not been breached. It does not
                guarantee clean or allergen-free air. Check continuous station measurements in Explore Air Quality for
                exact concentrations.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredActiveAlerts.map((alert) => {
                const visuals = getSeverityVisuals(alert.severity);
                const title = getFriendlyAlertTitle(alert.alert_type);
                const precaution = getProportionatePrecaution(alert);
                const stationName = getCleanStationName(alert.station_id, alert.station_name);

                return (
                  <div
                    key={alert.alert_id}
                    style={{
                      background: 'rgba(24, 30, 20, 0.8)',
                      border: `1px solid ${visuals.badgeBorder}`,
                      borderRadius: '14px',
                      padding: '1.25rem 1.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.9rem',
                      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.2)',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    {/* Top Row: Severity, Title, Locality, Timestamp */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.6rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            background: visuals.badgeBg,
                            border: `1px solid ${visuals.badgeBorder}`,
                            color: visuals.badgeText,
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: visuals.dotColor,
                            }}
                          />
                          {visuals.label}
                        </span>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            background: 'rgba(92, 114, 82, 0.2)',
                            color: '#d6ded0',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                        >
                          <MapPin size={12} color="#8aa87e" />
                          {stationName}
                        </span>

                        <span style={{ fontSize: '0.75rem', color: '#889381' }}>
                          Detected: {formatLocalIST(alert.detected_at)} ({formatRelativeTime(alert.detected_at)})
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => setInspectAlert(alert)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(238, 241, 231, 0.15)',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            color: '#9ba395',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Info size={12} />
                          <span>Diagnostic Info</span>
                        </button>
                        <button
                          onClick={() => navigate('/explore')}
                          style={{
                            background: 'rgba(92, 114, 82, 0.25)',
                            border: '1px solid rgba(138, 168, 126, 0.35)',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            color: '#8aa87e',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <span>Explore Locality</span>
                          <ExternalLink size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Alert Headline & Situation Description */}
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#eef1e7', margin: '0 0 0.3rem' }}>
                        {title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#b9c1b2', lineHeight: 1.5 }}>
                        {alert.message}
                      </p>
                    </div>

                    {/* Precaution Card Box */}
                    <div
                      style={{
                        borderRadius: '10px',
                        background: 'rgba(32, 40, 28, 0.7)',
                        border: '1px solid rgba(92, 114, 82, 0.3)',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#8aa87e', fontSize: '0.82rem', fontWeight: 700 }}>
                        <Shield size={14} />
                        <span>Recommended Practical Precaution</span>
                      </div>
                      <div style={{ fontSize: '0.86rem', color: '#e2e8dc', lineHeight: 1.48 }}>
                        {precaution.action}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#889381', marginTop: '0.2rem' }}>
                        Focus group: <strong style={{ color: '#adb7a4' }}>{precaution.targetGroup}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: ALERT PREFERENCES */}
      {activeTab === 'preferences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '880px' }}>
          {/* Section A: Monitored Localities */}
          <div
            style={{
              background: 'rgba(24, 30, 20, 0.75)',
              border: '1px solid rgba(92, 114, 82, 0.25)',
              borderRadius: '14px',
              padding: '1.5rem',
            }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#eef1e7', margin: '0 0 0.3rem' }}>
                Monitored Neighborhoods (Pune &amp; PCMC)
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ba395', lineHeight: 1.5 }}>
                Choose the monitoring localities you wish to track. Active advisories and threshold watches will filter
                specifically for these selected neighborhoods.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.25rem' }}>
              {stations.map((station) => {
                const isSelected = prefs.selectedStationIds.includes(station.station_id);
                const shortName = station.station_name.split(',')[0].trim();
                const district = station.city?.includes('Pimpri') || station.city?.includes('PCMC') ? 'PCMC' : 'PMC';

                return (
                  <button
                    key={station.station_id}
                    onClick={() => handleToggleStationPref(station.station_id)}
                    style={{
                      padding: '0.55rem 0.95rem',
                      borderRadius: '10px',
                      border: '1.5px solid',
                      borderColor: isSelected ? '#8aa87e' : 'rgba(92, 114, 82, 0.25)',
                      background: isSelected ? 'rgba(138, 168, 126, 0.22)' : 'rgba(20, 24, 16, 0.7)',
                      color: isSelected ? '#ffffff' : '#9ba395',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        background: isSelected ? '#8aa87e' : 'transparent',
                        border: '1.5px solid',
                        borderColor: isSelected ? '#8aa87e' : 'rgba(238, 241, 231, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && <CheckCircle2 size={12} color="#181e14" />}
                    </span>
                    <span>{shortName}</span>
                    <span style={{ fontSize: '0.72rem', color: isSelected ? '#a8c29e' : '#6f7967' }}>
                      ({district})
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: '0.78rem', color: '#7a8573' }}>
              Currently monitoring: <strong>{prefs.selectedStationIds.length}</strong> of {stations.length} regional stations.
            </div>
          </div>

          {/* Section B: PM2.5 Threshold Rule */}
          <div
            style={{
              background: 'rgba(24, 30, 20, 0.75)',
              border: '1px solid rgba(92, 114, 82, 0.25)',
              borderRadius: '14px',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#eef1e7', margin: '0 0 0.3rem' }}>
                  Fine Particulate (PM2.5) Watch Threshold
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ba395', lineHeight: 1.5 }}>
                  Set a particulate concentration trigger to alert you when measured PM2.5 at your monitored stations
                  exceeds your comfort or health limit.
                </p>
              </div>

              {/* Enable / Disable Toggle */}
              <button
                onClick={() => setPrefs((prev) => ({ ...prev, enableThresholdAlert: !prev.enableThresholdAlert }))}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: prefs.enableThresholdAlert ? '#8aa87e' : 'rgba(238, 241, 231, 0.2)',
                  background: prefs.enableThresholdAlert ? 'rgba(138, 168, 126, 0.25)' : 'rgba(40, 40, 40, 0.4)',
                  color: prefs.enableThresholdAlert ? '#8aa87e' : '#889381',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {prefs.enableThresholdAlert ? 'Rule Enabled' : 'Rule Paused'}
              </button>
            </div>

            {/* Presets */}
            <div style={{ opacity: prefs.enableThresholdAlert ? 1 : 0.4, pointerEvents: prefs.enableThresholdAlert ? 'auto' : 'none' }}>
              <div style={{ fontSize: '0.8rem', color: '#889381', marginBottom: '0.5rem', fontWeight: 600 }}>
                Standard National &amp; Health Presets:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <button
                  onClick={() => handleSelectPresetThreshold(30)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: prefs.pm25Threshold === 30 ? '#8aa87e' : 'rgba(92, 114, 82, 0.25)',
                    background: prefs.pm25Threshold === 30 ? 'rgba(138, 168, 126, 0.2)' : 'rgba(20, 24, 16, 0.6)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#eef1e7' }}>30 µg/m³ (Satisfactory)</div>
                  <div style={{ fontSize: '0.74rem', color: '#889381', marginTop: '0.15rem' }}>CPCB Satisfactory boundary</div>
                </button>

                <button
                  onClick={() => handleSelectPresetThreshold(60)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: prefs.pm25Threshold === 60 ? '#8aa87e' : 'rgba(92, 114, 82, 0.25)',
                    background: prefs.pm25Threshold === 60 ? 'rgba(138, 168, 126, 0.2)' : 'rgba(20, 24, 16, 0.6)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#eef1e7' }}>60 µg/m³ (Moderate)</div>
                  <div style={{ fontSize: '0.74rem', color: '#8aa87e', marginTop: '0.15rem' }}>Recommended urban baseline</div>
                </button>

                <button
                  onClick={() => handleSelectPresetThreshold(90)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: prefs.pm25Threshold === 90 ? '#8aa87e' : 'rgba(92, 114, 82, 0.25)',
                    background: prefs.pm25Threshold === 90 ? 'rgba(138, 168, 126, 0.2)' : 'rgba(20, 24, 16, 0.6)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#eef1e7' }}>90 µg/m³ (Elevated)</div>
                  <div style={{ fontSize: '0.74rem', color: '#889381', marginTop: '0.15rem' }}>CPCB Poor category trigger</div>
                </button>

                <button
                  onClick={() => handleSelectPresetThreshold(120)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: prefs.pm25Threshold === 120 ? '#8aa87e' : 'rgba(92, 114, 82, 0.25)',
                    background: prefs.pm25Threshold === 120 ? 'rgba(138, 168, 126, 0.2)' : 'rgba(20, 24, 16, 0.6)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#eef1e7' }}>120 µg/m³ (Severe)</div>
                  <div style={{ fontSize: '0.74rem', color: '#889381', marginTop: '0.15rem' }}>CPCB Very Poor category trigger</div>
                </button>
              </div>

              {/* Slider for custom value */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="5"
                  value={prefs.pm25Threshold}
                  onChange={(e) => setPrefs((prev) => ({ ...prev, pm25Threshold: parseInt(e.target.value, 10) }))}
                  style={{ flex: 1, accentColor: '#8aa87e' }}
                />
                <span
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#8aa87e',
                    minWidth: '90px',
                    textAlign: 'right',
                  }}
                >
                  {prefs.pm25Threshold} µg/m³
                </span>
              </div>
            </div>

            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(30, 36, 26, 0.6)',
                border: '1px solid rgba(92, 114, 82, 0.2)',
                fontSize: '0.78rem',
                color: '#889381',
                lineHeight: 1.45,
              }}
            >
              <Info size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
              <strong>Clarification:</strong> This threshold monitors fine particulate matter (PM2.5) specifically. It does
              not calculate or represent an official 24-hour CPCB National AQI, which requires multi-pollutant monitoring
              across at least 3 criteria gases.
            </div>
          </div>

          {/* Section C: Browser Notifications & Client Delivery */}
          <div
            style={{
              background: 'rgba(24, 30, 20, 0.75)',
              border: '1px solid rgba(92, 114, 82, 0.25)',
              borderRadius: '14px',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#eef1e7', margin: '0 0 0.3rem' }}>
                  Web Browser Notifications
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ba395', lineHeight: 1.5 }}>
                  Receive instant desktop banner notifications when active environmental advisories or threshold breaches
                  occur in your selected areas.
                </p>
              </div>

              <button
                onClick={handleToggleNotifications}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: prefs.enableBrowserNotifications ? '#38bdf8' : 'rgba(238, 241, 231, 0.2)',
                  background: prefs.enableBrowserNotifications ? 'rgba(56, 189, 248, 0.25)' : 'rgba(40, 40, 40, 0.4)',
                  color: prefs.enableBrowserNotifications ? '#38bdf8' : '#889381',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {prefs.enableBrowserNotifications ? 'Notifications Active' : 'Enable Web Notifications'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#9ba395' }}>
                Browser Permission Status:{' '}
                <strong
                  style={{
                    color:
                      browserPermission === 'granted'
                        ? '#8aa87e'
                        : browserPermission === 'denied'
                        ? '#f87171'
                        : '#fbbf24',
                  }}
                >
                  {browserPermission.toUpperCase()}
                </strong>
              </span>

              {browserPermission === 'granted' && (
                <button
                  onClick={handleTestNotification}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#7dd3fc',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Test Sample Notification
                </button>
              )}
            </div>

            {/* Clear Technical Limitation Disclosure */}
            <div
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '8px',
                background: 'rgba(32, 38, 28, 0.7)',
                border: '1px solid rgba(92, 114, 82, 0.25)',
                fontSize: '0.8rem',
                color: '#9ba395',
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#8aa87e', fontWeight: 600, marginBottom: '0.2rem' }}>
                <Smartphone size={14} />
                <span>Device &amp; Background Delivery Limitation</span>
              </div>
              Web notifications trigger through your current browser tab while the AirLens application is running.
              Because this client operates on modern browser APIs without a native mobile application, notifications
              cannot be delivered when your computer is asleep or the browser application is completely closed.
            </div>
          </div>

          {/* Save Preferences Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={handleSavePreferences}
              style={{
                padding: '0.75rem 1.75rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #5c7252 0%, #3e5036 100%)',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Save Alert Preferences</span>
            </button>

            {savedFeedback && (
              <span style={{ fontSize: '0.85rem', color: '#8aa87e', fontWeight: 600 }}>
                {savedFeedback}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#6e7766' }}>
            Preferences are saved to this browser&apos;s local storage. They do not overwrite other devices or accounts.
          </div>
        </div>
      )}

      {/* 6. TAB 3: RECENT ALERT HISTORY */}
      {activeTab === 'history' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#eef1e7', margin: '0 0 0.3rem' }}>
              Historical Environmental Advisories
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ba395', lineHeight: 1.5 }}>
              Chronological log of past pollution threshold events and resolved atmospheric stagnation states recorded
              by the regional monitoring network.
            </p>
          </div>

          {recentAlerts.length === 0 ? (
            <div
              style={{
                background: 'rgba(24, 30, 20, 0.6)',
                border: '1px solid rgba(92, 114, 82, 0.25)',
                borderRadius: '12px',
                padding: '2.5rem',
                textAlign: 'center',
                color: '#889381',
                fontSize: '0.9rem',
              }}
            >
              No past alert history entries recorded.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentAlerts.map((item) => {
                const visuals = getSeverityVisuals(item.severity);
                const title = getFriendlyAlertTitle(item.alert_type);
                const stationName = getCleanStationName(item.station_id, item.station_name);
                const isResolved = item.status === 'RESOLVED';

                return (
                  <div
                    key={item.alert_id}
                    style={{
                      background: 'rgba(24, 30, 20, 0.7)',
                      border: '1px solid rgba(92, 114, 82, 0.2)',
                      borderRadius: '10px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          background: isResolved ? 'rgba(92, 114, 82, 0.25)' : visuals.badgeBg,
                          border: `1px solid ${isResolved ? 'rgba(138, 168, 126, 0.4)' : visuals.badgeBorder}`,
                          color: isResolved ? '#8aa87e' : visuals.badgeText,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.status}
                      </span>

                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#eef1e7' }}>
                          {title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#889381', marginTop: '0.15rem' }}>
                          {stationName} · Triggered: {formatLocalIST(item.detected_at)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#a1aba0',
                          maxWidth: '380px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={item.message}
                      >
                        {item.message}
                      </span>

                      <button
                        onClick={() => setInspectAlert(item)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(238, 241, 231, 0.15)',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '6px',
                          color: '#9ba395',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. Educational Panel: How AirLens Generates Alerts */}
      <div
        style={{
          marginTop: '2.5rem',
          background: 'rgba(20, 26, 18, 0.65)',
          border: '1px solid rgba(92, 114, 82, 0.25)',
          borderRadius: '14px',
          padding: '1.4rem 1.6rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Sparkles size={16} color="#8aa87e" />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#eef1e7', margin: 0 }}>
            How to Understand AirLens Alerts
          </h4>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            fontSize: '0.82rem',
            color: '#a6b09f',
            lineHeight: 1.5,
          }}
        >
          <div>
            <strong style={{ color: '#eef1e7', display: 'block', marginBottom: '0.2rem' }}>
              1. Ground-Truth Sensor Exceedances
            </strong>
            Alerts such as PM2.5 Spikes are triggered when continuous particulate monitors record sudden deviations or
            breach standard baseline thresholds.
          </div>

          <div>
            <strong style={{ color: '#eef1e7', display: 'block', marginBottom: '0.2rem' }}>
              2. Atmospheric Inversions &amp; Stagnation
            </strong>
            When wind drops below 1 m/s and boundary layer height falls below 500 meters, emitted fumes linger near road
            level, prompting a low-dispersal advisory.
          </div>

          <div>
            <strong style={{ color: '#eef1e7', display: 'block', marginBottom: '0.2rem' }}>
              3. Absence of Alerts vs. Safe Air
            </strong>
            A lack of active alerts confirms current values have not breached severe warning thresholds, but does not
            guarantee pure or zero-emission air.
          </div>
        </div>
      </div>

      {/* 8. Diagnostic Modal for Residents */}
      {inspectAlert && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setInspectAlert(null)}
        >
          <div
            style={{
              background: '#191f16',
              border: '1px solid rgba(92, 114, 82, 0.4)',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '1.5rem',
              color: '#eef1e7',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: getSeverityVisuals(inspectAlert.severity).badgeBg,
                    border: `1px solid ${getSeverityVisuals(inspectAlert.severity).badgeBorder}`,
                    color: getSeverityVisuals(inspectAlert.severity).badgeText,
                  }}
                >
                  {inspectAlert.severity}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  {getFriendlyAlertTitle(inspectAlert.alert_type)}
                </h3>
              </div>
              <button
                onClick={() => setInspectAlert(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ba395',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.86rem', color: '#c5cebe', lineHeight: 1.5, marginBottom: '1rem' }}>
              {inspectAlert.message}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                padding: '0.85rem',
                borderRadius: '8px',
                background: 'rgba(28, 34, 24, 0.7)',
                fontSize: '0.78rem',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <span style={{ color: '#889381' }}>Affected Locality:</span>
                <div style={{ fontWeight: 600, color: '#eef1e7', marginTop: '0.15rem' }}>
                  {getCleanStationName(inspectAlert.station_id, inspectAlert.station_name)}
                </div>
              </div>
              <div>
                <span style={{ color: '#889381' }}>Data Source:</span>
                <div style={{ fontWeight: 600, color: '#eef1e7', marginTop: '0.15rem' }}>
                  {inspectAlert.source || 'Regional CAAQMS Sensor'}
                </div>
              </div>
              <div>
                <span style={{ color: '#889381' }}>Detected Timestamp:</span>
                <div style={{ fontWeight: 600, color: '#eef1e7', marginTop: '0.15rem' }}>
                  {formatLocalIST(inspectAlert.detected_at)}
                </div>
              </div>
              <div>
                <span style={{ color: '#889381' }}>Current Status:</span>
                <div style={{ fontWeight: 600, color: '#eef1e7', marginTop: '0.15rem' }}>
                  {inspectAlert.status}
                </div>
              </div>
              {inspectAlert.observed_value !== null && inspectAlert.observed_value !== undefined && (
                <div>
                  <span style={{ color: '#889381' }}>Observed Reading:</span>
                  <div style={{ fontWeight: 600, color: '#eef1e7', marginTop: '0.15rem' }}>
                    {inspectAlert.observed_value} {inspectAlert.pollutant ? 'µg/m³' : ''}
                  </div>
                </div>
              )}
              {inspectAlert.threshold_value !== null && inspectAlert.threshold_value !== undefined && (
                <div>
                  <span style={{ color: '#889381' }}>Trigger Threshold:</span>
                  <div style={{ fontWeight: 600, color: '#eef1e7', marginTop: '0.15rem' }}>
                    {inspectAlert.threshold_value} {inspectAlert.pollutant ? 'µg/m³' : ''}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setInspectAlert(null);
                  navigate('/explore');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(138, 168, 126, 0.4)',
                  background: 'rgba(92, 114, 82, 0.25)',
                  color: '#8aa87e',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>View on Explore Map</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAlerts;
