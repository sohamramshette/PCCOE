import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Plus,
  Trash2,
  Edit3,
  Clock,
  TrendingUp,
  Compass,
  Bell,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Info,
  MapPin,
  Home,
  Briefcase,
  GraduationCap,
  Dumbbell,
  Heart,
  ChevronRight,
  Shield,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

import { getStations } from '../api/stations';
import { getObservations } from '../api/observations';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import { PUNE_LOCALITY_PRESETS } from '../api/routing';
import {
  SavedPlace,
  PlaceCategory,
  loadSavedPlacesWithStatus,
  clearSavedPlaces,
  loadSuggestedPresets,
  addSavedPlace,
  updateSavedPlace,
  deleteSavedPlace,
  calculateHistorySummary,
  getCategoryBadge,
  calculateDistanceKm,
  parseObservationDate,
  StorageLoadResult,
  HistorySummary,
} from '../utils/savedPlaces';
import { evaluateAirQuality, getNAQICategoryInfo, calcPM25SubIndex } from '../utils/aqi';
import { formatLocalIST, formatRelativeTime } from '../utils/residentAlerts';

type TimeRangeKey = '24h' | '7d' | '30d';

interface RangeConfig {
  key: TimeRangeKey;
  label: string;
  durationHours: number;
  expectedHourlySlots: number;
  description: string;
}

const TIME_RANGES: RangeConfig[] = [
  {
    key: '24h',
    label: 'Last 24 Hours',
    durationHours: 24,
    expectedHourlySlots: 24,
    description: 'Hourly observation series within the previous 24 hours',
  },
  {
    key: '7d',
    label: 'Last 7 Days',
    durationHours: 168,
    expectedHourlySlots: 168,
    description: 'Observations recorded within the previous 7-day window',
  },
  {
    key: '30d',
    label: 'Last 30 Days',
    durationHours: 720,
    expectedHourlySlots: 720,
    description: 'Observations recorded within the previous 30-day window',
  },
];

export const MyPlaces: React.FC = () => {
  const navigate = useNavigate();

  // State: Places & Storage Status (Never automatically populated on empty or corrupted storage)
  const [storageStatus, setStorageStatus] = useState<StorageLoadResult>(() => loadSavedPlacesWithStatus());
  const places = storageStatus.places;

  const [stations, setStations] = useState<Station[]>([]);
  const [stationObservations, setStationObservations] = useState<Record<number, ObservationItem | null>>({});

  // State: Selection for History Section
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('24h');

  // State: Historical Data
  const [historyObservations, setHistoryObservations] = useState<ObservationItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // State: Overall Loading & Refreshing
  const [isLoadingNetwork, setIsLoadingNetwork] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // State: Modal for Adding / Editing Place
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPlace, setEditingPlace] = useState<SavedPlace | null>(null);
  const [modalCustomName, setModalCustomName] = useState<string>('');
  const [modalCategory, setModalCategory] = useState<PlaceCategory>('HOME');
  const [modalSelectionMode, setModalSelectionMode] = useState<'STATION' | 'LOCALITY'>('LOCALITY');
  const [modalSelectedStationId, setModalSelectedStationId] = useState<number | null>(null);
  const [modalSelectedLocalityId, setModalSelectedLocalityId] = useState<string>('preset-akurdi');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Automatically select the first place if none selected
  useEffect(() => {
    if (places.length > 0) {
      if (!selectedPlaceId || !places.some((p) => p.id === selectedPlaceId)) {
        setSelectedPlaceId(places[0].id);
      }
    } else {
      setSelectedPlaceId(null);
    }
  }, [places, selectedPlaceId]);

  // 1. Fetch Station Network and Latest Observations
  const loadNetworkData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingNetwork(true);
    else setIsRefreshing(true);
    setNetworkError(null);

    try {
      const stationList = await getStations(true);
      setStations(stationList);

      // Fetch latest observation for each station
      const obsMap: Record<number, ObservationItem | null> = {};
      await Promise.all(
        stationList.map(async (st) => {
          try {
            const res = await getObservations(st.station_id, { limit: 1, order: 'desc' });
            obsMap[st.station_id] = res.items.length > 0 ? res.items[0] : null;
          } catch {
            obsMap[st.station_id] = null;
          }
        })
      );
      setStationObservations(obsMap);
    } catch {
      setNetworkError('Unable to connect to air quality monitoring stations. Please check backend services.');
    } finally {
      setIsLoadingNetwork(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNetworkData();
  }, [loadNetworkData]);

  // Refresh saved places from storage
  const reloadPlacesFromStorage = useCallback(() => {
    const status = loadSavedPlacesWithStatus();
    setStorageStatus(status);
  }, []);

  // Current selected place object
  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return places.find((p) => p.id === selectedPlaceId) || null;
  }, [places, selectedPlaceId]);

  // Active time range configuration
  const activeRangeConfig = useMemo(() => {
    return TIME_RANGES.find((r) => r.key === timeRange) || TIME_RANGES[0];
  }, [timeRange]);

  // 2. Fetch Historical Observations for Selected Place (strictly filtered by actual timestamps)
  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      if (!selectedPlace || selectedPlace.stationId === null) {
        setHistoryObservations([]);
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);
      setHistoryError(null);

      try {
        // Anchor time: latest valid observation timestamp for this station (or Date.now())
        const latestObs = stationObservations[selectedPlace.stationId];
        const latestDate = parseObservationDate(latestObs);
        const anchorMs = !isNaN(latestDate.getTime()) ? latestDate.getTime() : Date.now();
        const startMs = anchorMs - activeRangeConfig.durationHours * 3600 * 1000;

        const startUtcIso = new Date(startMs).toISOString();
        const endUtcIso = new Date(anchorMs).toISOString();

        // Query backend with temporal filters
        const res = await getObservations(selectedPlace.stationId, {
          start: startUtcIso,
          end: endUtcIso,
          limit: 1000,
          order: 'asc',
        });

        if (isMounted) {
          // Strictly verify that retrieved observations fall within the actual selected time range
          const periodObservations = res.items.filter((item) => {
            const itemDate = parseObservationDate(item);
            const t = itemDate.getTime();
            return !isNaN(t) && t >= startMs && t <= anchorMs;
          });

          // Sort chronologically ascending (oldest -> newest)
          periodObservations.sort((a, b) => {
            return parseObservationDate(a).getTime() - parseObservationDate(b).getTime();
          });

          setHistoryObservations(periodObservations);
        }
      } catch {
        if (isMounted) {
          setHistoryError(
            `Unable to retrieve historical observations for ${selectedPlace.stationName || 'this station'}.`
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [selectedPlace, activeRangeConfig, stationObservations]);

  // Calculate historical statistical summary based on actual retrieved observations
  const historySummary: HistorySummary = useMemo(() => {
    return calculateHistorySummary(historyObservations, activeRangeConfig.expectedHourlySlots);
  }, [historyObservations, activeRangeConfig.expectedHourlySlots]);

  // Prepare chart series data (preserves NULLs without fabricating or interpolating missing points)
  const chartData = useMemo(() => {
    return historyObservations.map((obs) => {
      const d = parseObservationDate(obs);
      const isDateValid = !isNaN(d.getTime());

      let timeLabel = '';
      if (isDateValid) {
        if (timeRange === '24h') {
          timeLabel = d.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
        } else if (timeRange === '7d') {
          timeLabel = `${d.getDate()} ${d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            month: 'short',
          })} ${d.getHours()}:00`;
        } else {
          timeLabel = `${d.getDate()} ${d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            month: 'short',
          })}`;
        }
      } else {
        timeLabel = 'Unknown';
      }

      const pm25Val = typeof obs.pm25 === 'number' && !isNaN(obs.pm25) ? obs.pm25 : null;
      const subIdx = calcPM25SubIndex(pm25Val);
      const catInfo = subIdx !== null ? getNAQICategoryInfo(subIdx) : null;

      return {
        timestamp: obs.datetime_local_ist || obs.datetime_utc,
        timeLabel,
        pm25: pm25Val,
        pm10: typeof obs.pm10 === 'number' && !isNaN(obs.pm10) ? obs.pm10 : null,
        category: catInfo?.category || (pm25Val === null ? 'Missing' : 'Unavailable'),
        color: catInfo?.color || '#94a3b8',
        provenance: obs.data_provenance || 'OBSERVED',
      };
    });
  }, [historyObservations, timeRange]);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingPlace(null);
    setModalCustomName('');
    setModalCategory('HOME');
    setModalSelectionMode('LOCALITY');
    setModalSelectedLocalityId('preset-akurdi');
    setModalSelectedStationId(stations.length > 0 ? stations[0].station_id : null);
    setModalNotes('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (place: SavedPlace) => {
    setEditingPlace(place);
    setModalCustomName(place.customName);
    setModalCategory(place.category);
    setModalNotes(place.notes || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const cleanName = modalCustomName.trim();
    if (!cleanName) {
      setModalError('Please enter a friendly name for this place (e.g. "Home Area" or "College / PCCOE").');
      return;
    }

    if (editingPlace) {
      // Renaming / updating existing place
      const res = updateSavedPlace(editingPlace.id, {
        customName: cleanName,
        category: modalCategory,
        notes: modalNotes.trim() || undefined,
      });

      if (!res.success) {
        setModalError(res.error || 'Failed to update place.');
        return;
      }

      reloadPlacesFromStorage();
      setIsModalOpen(false);
      return;
    }

    // Adding new place
    if (modalSelectionMode === 'STATION') {
      const station = stations.find((s) => s.station_id === modalSelectedStationId);
      if (!station) {
        setModalError('Please select a valid continuous monitoring station.');
        return;
      }

      const res = addSavedPlace({
        customName: cleanName,
        category: modalCategory,
        localityName: station.station_name,
        stationId: station.station_id,
        stationName: station.station_name,
        distanceKm: 0.0,
        latitude: station.latitude,
        longitude: station.longitude,
        isStationDirect: true,
        notes: modalNotes.trim() || undefined,
      });

      if (!res.success) {
        setModalError(res.error || 'Failed to save place.');
        return;
      }

      reloadPlacesFromStorage();
      if (res.place) setSelectedPlaceId(res.place.id);
      setIsModalOpen(false);
    } else {
      // Curated Locality selection
      const preset = PUNE_LOCALITY_PRESETS.find((p) => p.id === modalSelectedLocalityId);
      if (!preset) {
        setModalError('Please select a supported Pune / PCMC locality.');
        return;
      }

      // Find nearest monitoring station
      let nearestStation: Station | null = null;
      let minDistance = Infinity;

      for (const st of stations) {
        const d = calculateDistanceKm(preset.lat, preset.lon, st.latitude, st.longitude);
        if (d < minDistance) {
          minDistance = d;
          nearestStation = st;
        }
      }

      const hasReliableStation = nearestStation !== null && minDistance <= 15.0;

      const res = addSavedPlace({
        customName: cleanName,
        category: modalCategory,
        localityName: `${preset.name} (${preset.subtitle.split('·')[0].trim()})`,
        stationId: hasReliableStation && nearestStation ? nearestStation.station_id : null,
        stationName: hasReliableStation && nearestStation ? nearestStation.station_name : null,
        distanceKm: hasReliableStation ? minDistance : null,
        latitude: preset.lat,
        longitude: preset.lon,
        isStationDirect: false,
        notes: modalNotes.trim() || undefined,
      });

      if (!res.success) {
        setModalError(res.error || 'Failed to save place.');
        return;
      }

      reloadPlacesFromStorage();
      if (res.place) setSelectedPlaceId(res.place.id);
      setIsModalOpen(false);
    }
  };

  const handleDeletePlace = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from your saved places?`)) {
      deleteSavedPlace(id);
      reloadPlacesFromStorage();
      if (selectedPlaceId === id) {
        const remaining = loadSavedPlacesWithStatus().places;
        setSelectedPlaceId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  // Explicit user reset for corrupted or clear storage
  const handleResetStorage = () => {
    if (window.confirm('Reset saved places storage for this browser? All malformed or private preferences will be cleared.')) {
      clearSavedPlaces();
      reloadPlacesFromStorage();
      setSelectedPlaceId(null);
    }
  };

  // Explicit on-demand loading of suggested presets
  const handleLoadSuggestedPresets = () => {
    if (
      window.confirm(
        'Load suggested Pune locations (PCCOE Akurdi Campus, Shivajinagar Home, Hadapsar Tech Park) into your saved places?'
      )
    ) {
      const defs = loadSuggestedPresets();
      setStorageStatus({ places: defs, isCorrupted: false });
      setSelectedPlaceId(defs[0].id);
    }
  };

  const getCategoryIcon = (category: PlaceCategory) => {
    switch (category) {
      case 'HOME':
        return <Home size={14} />;
      case 'COLLEGE':
        return <GraduationCap size={14} />;
      case 'WORK':
        return <Briefcase size={14} />;
      case 'FITNESS':
        return <Dumbbell size={14} />;
      case 'FAMILY':
        return <Heart size={14} />;
      default:
        return <Bookmark size={14} />;
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', color: '#0f172a' }}>
      {/* 1. Header & Storage Information */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                background: 'rgba(40, 122, 69, 0.1)',
                border: '1px solid rgba(40, 122, 69, 0.25)',
                color: '#166534',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              <Bookmark size={12} color="#166534" /> Resident Personal Space · Phase 8
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: '#0d1710' }}>
            My Places &amp; Air Quality History
          </h1>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#526b59', maxWidth: '780px', lineHeight: 1.5 }}>
            Save localities that matter to you across Pune and Pimpri-Chinchwad (such as your home, college campus, or
            workplace). Monitor continuous ground-truth pollution readings and explore genuine historical trends.
          </p>
        </div>

        {/* Top Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={() => loadNetworkData(true)}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid rgba(40, 122, 69, 0.25)',
              background: 'rgba(240, 253, 244, 0.85)',
              color: '#166534',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: isRefreshing ? 'wait' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Refresh current air quality readings"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.05rem',
              borderRadius: '8px',
              border: '1px solid #15803d',
              background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(22, 101, 52, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={15} />
            <span>Add New Place</span>
          </button>
        </div>
      </div>

      {/* Storage Notice & Corruption Recovery Banner */}
      {storageStatus.isCorrupted ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.85rem 1.1rem',
            borderRadius: '10px',
            background: 'rgba(254, 243, 199, 0.9)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            fontSize: '0.82rem',
            color: '#92400e',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(146, 64, 14, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
            <span>
              <strong>Storage Warning:</strong> {storageStatus.corruptedReason || 'Saved places data was malformed.'}
            </span>
          </div>
          <button
            onClick={handleResetStorage}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid rgba(217, 119, 6, 0.4)',
              background: '#fef3c7',
              color: '#92400e',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset Storage
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: 'rgba(240, 253, 244, 0.85)',
            border: '1px solid rgba(40, 122, 69, 0.22)',
            fontSize: '0.82rem',
            color: '#284632',
            marginBottom: '1.75rem',
            boxShadow: '0 2px 8px rgba(22, 38, 25, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={16} color="#166534" />
            <span>
              <strong style={{ color: '#166534' }}>Device-Local Storage:</strong> Your saved places are securely stored inside this browser
              (localStorage) and are not synchronized to remote cloud servers or shared with third parties.
            </span>
          </div>
          {places.length === 0 && (
            <button
              onClick={handleLoadSuggestedPresets}
              style={{
                background: 'none',
                border: 'none',
                color: '#15803d',
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Load Suggested Pune Places (PCCOE, Shivajinagar, Hadapsar)
            </button>
          )}
        </div>
      )}

      {networkError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.8rem 1rem',
            borderRadius: '10px',
            background: 'rgba(254, 242, 242, 0.9)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#b91c1c',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          <AlertCircle size={16} color="#dc2626" />
          <span>{networkError}</span>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: MY SAVED PLACES (CARDS GRID)
      ========================================================================= */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bookmark size={18} color="#166534" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
              My Saved Places ({places.length})
            </h2>
          </div>
          {places.length > 0 && (
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Click &apos;Review History Trends&apos; on any card to examine historical observations below
            </span>
          )}
        </div>

        {places.length === 0 ? (
          /* Clean Empty State (Never auto-seeded) */
          <div
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              borderRadius: '14px',
              border: '1.5px dashed rgba(40, 122, 69, 0.3)',
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(240, 253, 244, 0.9)',
                border: '1px solid rgba(40, 122, 69, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
                color: '#166534',
              }}
            >
              <Bookmark size={26} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0d1710' }}>
              No Saved Places
            </h3>
            <p
              style={{
                fontSize: '0.88rem',
                color: '#526b59',
                maxWidth: '520px',
                margin: '0 auto 1.5rem auto',
                lineHeight: 1.55,
              }}
            >
              You have not saved any monitoring locations yet. Save places that matter to you — such as your home area,
              college campus (e.g. PCCOE Akurdi), or workplace — to track local air quality and review historical trends.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleOpenAddModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1.35rem',
                  borderRadius: '8px',
                  border: '1px solid #15803d',
                  background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(22, 101, 52, 0.25)',
                }}
              >
                <Plus size={15} /> Add a Place
              </button>
              <button
                onClick={handleLoadSuggestedPresets}
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(40, 122, 69, 0.25)',
                  background: 'rgba(240, 253, 244, 0.85)',
                  color: '#166534',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Load Suggested Pune Places
              </button>
            </div>
          </div>
        ) : (
          /* Cards Grid */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {places.map((place) => {
              const obs = place.stationId !== null ? stationObservations[place.stationId] : null;
              const evalResult = evaluateAirQuality(obs);
              const catBadge = getCategoryBadge(place.category);
              const isSelected = selectedPlaceId === place.id;

              return (
                <div
                  key={place.id}
                  style={{
                    borderRadius: '12px',
                    border: isSelected
                      ? '2px solid #166534'
                      : '1px solid rgba(40, 122, 69, 0.18)',
                    background: isSelected
                      ? 'rgba(255, 255, 255, 0.98)'
                      : 'rgba(255, 255, 255, 0.92)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isSelected
                      ? '0 8px 24px rgba(22, 101, 52, 0.12)'
                      : '0 4px 16px rgba(22, 38, 25, 0.04)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  {/* Top: Header & Badges */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.6rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.22rem 0.55rem',
                            borderRadius: '6px',
                            background: catBadge.bg,
                            border: `1px solid ${catBadge.border}`,
                            color: catBadge.color,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {getCategoryIcon(place.category)}
                          {catBadge.label}
                        </span>
                        {isSelected && (
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(40, 122, 69, 0.12)',
                              border: '1px solid rgba(40, 122, 69, 0.25)',
                              color: '#166534',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            Active in History
                          </span>
                        )}
                      </div>

                      {/* Card Action Icons (Edit / Delete) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleOpenEditModal(place)}
                          title="Rename or edit notes"
                          aria-label="Rename or edit notes"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: '0.3rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#166534')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeletePlace(place.id, place.customName)}
                          title="Remove saved place"
                          aria-label="Remove saved place"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '0.3rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Place Name & Locality */}
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#0d1710' }}>
                      {place.customName}
                    </h3>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.8rem',
                        color: '#526b59',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <MapPin size={13} color="#166534" style={{ flexShrink: 0 }} />
                      <span>{place.localityName}</span>
                    </div>

                    {/* Associated Station Representation Note */}
                    <div
                      style={{
                        padding: '0.5rem 0.7rem',
                        borderRadius: '6px',
                        background: 'rgba(240, 253, 244, 0.75)',
                        border: '1px solid rgba(40, 122, 69, 0.18)',
                        fontSize: '0.75rem',
                        color: '#284632',
                        marginBottom: '1rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {place.stationId !== null ? (
                        place.isStationDirect ? (
                          <span>
                            <strong style={{ color: '#166534' }}>Continuous CAAQMS Station:</strong> {place.stationName} (Direct Sensor Site)
                          </span>
                        ) : (
                          <span>
                            <strong style={{ color: '#166534' }}>Representative Station:</strong> {place.stationName} (~{place.distanceKm} km away).
                            Reflects ambient regional air quality.
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#d97706' }}>
                          <strong>No CAAQMS in Immediate Area:</strong> Air quality readings unavailable for this
                          specific location.
                        </span>
                      )}
                    </div>

                    {/* Current Air Quality Summary Box */}
                    {place.stationId !== null ? (
                      isLoadingNetwork ? (
                        <div
                          style={{
                            padding: '1rem',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            color: '#64748b',
                          }}
                        >
                          Loading observation...
                        </div>
                      ) : obs && typeof obs.pm25 === 'number' && !isNaN(obs.pm25) ? (
                        <div
                          style={{
                            padding: '0.85rem',
                            borderRadius: '8px',
                            background: '#f8fafc',
                            border: `1px solid ${evalResult.particulateColor ? evalResult.particulateColor + '40' : 'rgba(40, 122, 69, 0.2)'}`,
                            marginBottom: '1.15rem',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              justifyContent: 'space-between',
                              marginBottom: '0.4rem',
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  color: '#64748b',
                                  textTransform: 'uppercase',
                                  fontWeight: 600,
                                }}
                              >
                                Latest PM2.5
                              </span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                                <span
                                  style={{
                                    fontSize: '1.65rem',
                                    fontWeight: 700,
                                    color: evalResult.particulateColor || '#0d1710',
                                    lineHeight: 1,
                                  }}
                                >
                                  {obs.pm25}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  µg/m³
                                </span>
                              </div>
                            </div>

                            {/* CPCB Category Badge */}
                            <div style={{ textAlign: 'right' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '6px',
                                  background: `${evalResult.particulateColor || '#166534'}15`,
                                  border: `1px solid ${evalResult.particulateColor || '#166534'}40`,
                                  color: evalResult.particulateColor || '#166534',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                }}
                              >
                                {evalResult.particulateCategory || 'Moderate'}
                              </span>
                              <div
                                style={{
                                  fontSize: '0.7rem',
                                  color: '#64748b',
                                  marginTop: '0.2rem',
                                }}
                              >
                                Particulate Index ~{evalResult.particulateIndex || calcPM25SubIndex(obs.pm25)}
                              </div>
                            </div>
                          </div>

                          {/* PM10 & Observation Timestamp Metadata */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.73rem',
                              color: '#64748b',
                              borderTop: '1px solid rgba(40, 122, 69, 0.12)',
                              paddingTop: '0.45rem',
                              marginTop: '0.45rem',
                            }}
                          >
                            <span>
                              PM10: {obs.pm10 !== null && obs.pm10 !== undefined ? `${obs.pm10} µg/m³` : 'Not reported'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={11} color="#64748b" />
                              {formatRelativeTime(obs.datetime_utc)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: '0.85rem',
                            borderRadius: '8px',
                            background: 'rgba(240, 253, 244, 0.5)',
                            border: '1px solid rgba(40, 122, 69, 0.15)',
                            marginBottom: '1.15rem',
                            fontSize: '0.78rem',
                            color: '#526b59',
                            textAlign: 'center',
                          }}
                        >
                          <Info
                            size={14}
                            style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-2px' }}
                          />
                          Current measurement temporarily unavailable or sensor undergoing calibration.
                        </div>
                      )
                    ) : (
                      <div
                        style={{
                          padding: '0.85rem',
                          borderRadius: '8px',
                          background: 'rgba(240, 253, 244, 0.5)',
                          border: '1px solid rgba(40, 122, 69, 0.15)',
                          marginBottom: '1.15rem',
                          fontSize: '0.78rem',
                          color: '#526b59',
                          textAlign: 'center',
                        }}
                      >
                        Pollution readings unavailable for this location.
                      </div>
                    )}
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {/* 1. View Air Quality (Navigate to Explore) */}
                      <button
                        onClick={() => {
                          if (place.stationId !== null) {
                            navigate(`/explore?station=${place.stationId}`);
                          } else {
                            navigate('/explore');
                          }
                        }}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #15803d',
                          background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                          color: '#ffffff',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 3px 10px rgba(22, 101, 52, 0.2)',
                          transition: 'all 0.15s ease',
                        }}
                        title="Open this location in Explore Air Quality"
                      >
                        <MapPin size={13} />
                        <span>View Air Quality</span>
                      </button>

                      {/* 2. Review History Trends (Select for Section 2) */}
                      <button
                        onClick={() => {
                          setSelectedPlaceId(place.id);
                          const el = document.getElementById('history-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          border: isSelected
                            ? '1px solid #166534'
                            : '1px solid rgba(40, 122, 69, 0.25)',
                          background: isSelected
                            ? '#166534'
                            : 'rgba(240, 253, 244, 0.85)',
                          color: isSelected ? '#ffffff' : '#166534',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 3px 10px rgba(22, 101, 52, 0.2)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                        title="Display historical air quality trends below"
                      >
                        <TrendingUp size={13} />
                        <span>History Trends</span>
                      </button>
                    </div>

                    {/* Shortcuts Row */}
                    {place.stationId !== null && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          borderTop: '1px solid rgba(40, 122, 69, 0.12)',
                          paddingTop: '0.45rem',
                          fontSize: '0.74rem',
                        }}
                      >
                        <button
                          onClick={() => navigate(`/forecast-guidance?station=${place.stationId}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#15803d',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          Forecast Guidance <ChevronRight size={10} />
                        </button>
                        <button
                          onClick={() => navigate(`/my-alerts?tab=preferences&station=${place.stationId}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#15803d',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          Configure Alerts <ChevronRight size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 2: AIR QUALITY HISTORY (FOR SELECTED SAVED PLACE)
      ========================================================================= */}
      {selectedPlace && (
        <div
          id="history-section"
          style={{
            borderRadius: '14px',
            border: '1px solid rgba(40, 122, 69, 0.18)',
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
            backdropFilter: 'blur(16px)',
            padding: '1.75rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* History Header & Time Range Selector */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginBottom: '1.25rem',
              borderBottom: '1px solid rgba(40, 122, 69, 0.12)',
              paddingBottom: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <TrendingUp size={18} color="#166534" />
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
                  Air Quality History: {selectedPlace.customName}
                </h2>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#526b59' }}>
                {selectedPlace.stationId !== null ? (
                  <span>
                    Ground-truth records from <strong>{selectedPlace.stationName}</strong>
                    {!selectedPlace.isStationDirect && ` (~${selectedPlace.distanceKm} km away)`}
                  </span>
                ) : (
                  <span>No continuous monitoring station associated with this saved place</span>
                )}
              </div>
            </div>

            {/* Time Range Switcher */}
            <div
              style={{
                display: 'inline-flex',
                background: 'rgba(240, 253, 244, 0.85)',
                padding: '0.25rem',
                borderRadius: '8px',
                border: '1px solid rgba(40, 122, 69, 0.2)',
              }}
            >
              {TIME_RANGES.map((r) => {
                const isActive = timeRange === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => setTimeRange(r.key)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: isActive ? '#166534' : 'transparent',
                      color: isActive ? '#ffffff' : '#475e4e',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 2px 6px rgba(22, 101, 52, 0.25)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Honest Disclaimer Banner */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(240, 253, 244, 0.75)',
              border: '1px solid rgba(40, 122, 69, 0.2)',
              fontSize: '0.78rem',
              color: '#284632',
              lineHeight: 1.5,
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Info size={15} color="#166534" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#166534' }}>Honest Sensor Context:</strong> The historical measurements charted below reflect continuous
                ambient air quality recorded at the regional monitoring station (
                {selectedPlace.stationName || 'CAAQMS Site'}). Ambient station records capture macro atmospheric
                conditions across Pune and Pimpri-Chinchwad, but do not imply identical microclimate readings inside
                individual residences, classrooms, or enclosed workspaces. Missing hourly sensor intervals are
                identified rather than filled with artificial zeros or synthetic interpolations.
              </div>
            </div>
          </div>

          {historyError && (
            <div
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '8px',
                background: 'rgba(254, 242, 242, 0.9)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#b91c1c',
                fontSize: '0.82rem',
                marginBottom: '1.25rem',
              }}
            >
              {historyError}
            </div>
          )}

          {/* Historical Summary Metric Tiles (4 Cards) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* 1. Average PM2.5 */}
            <div
              style={{
                padding: '1rem',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid rgba(40, 122, 69, 0.15)',
                boxShadow: '0 2px 8px rgba(22, 38, 25, 0.03)',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Period Average PM2.5
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', margin: '0.25rem 0' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0d1710' }}>
                  {historySummary.averagePm25 !== null ? historySummary.averagePm25 : '—'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>µg/m³</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Arithmetic mean across {historySummary.validCount} valid measurements
              </div>
            </div>

            {/* 2. Peak PM2.5 */}
            <div
              style={{
                padding: '1rem',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid rgba(40, 122, 69, 0.15)',
                boxShadow: '0 2px 8px rgba(22, 38, 25, 0.03)',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Highest Recorded PM2.5
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', margin: '0.25rem 0' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ea580c' }}>
                  {historySummary.highestPm25 ? historySummary.highestPm25.value : '—'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>µg/m³</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {historySummary.highestPm25
                  ? formatLocalIST(historySummary.highestPm25.timestampIst)
                  : 'No valid data'}
              </div>
            </div>

            {/* 3. Lowest PM2.5 */}
            <div
              style={{
                padding: '1rem',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid rgba(40, 122, 69, 0.15)',
                boxShadow: '0 2px 8px rgba(22, 38, 25, 0.03)',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Lowest Recorded PM2.5
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', margin: '0.25rem 0' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#16a34a' }}>
                  {historySummary.lowestPm25 ? historySummary.lowestPm25.value : '—'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>µg/m³</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {historySummary.lowestPm25
                  ? formatLocalIST(historySummary.lowestPm25.timestampIst)
                  : 'No valid data'}
              </div>
            </div>

            {/* 4. Valid Observations Coverage */}
            <div
              style={{
                padding: '1rem',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid rgba(40, 122, 69, 0.15)',
                boxShadow: '0 2px 8px rgba(22, 38, 25, 0.03)',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Observation Coverage
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', margin: '0.25rem 0' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#166534' }}>
                  {historySummary.completenessPct}%
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  ({historySummary.validCount}/{activeRangeConfig.expectedHourlySlots} hrs)
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {historySummary.isSparse
                  ? historySummary.sparseReason
                  : 'Valid measurements across available hours'}
              </div>
            </div>
          </div>

          {/* PM2.5 Trend Chart (Recharts AreaChart) */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid rgba(40, 122, 69, 0.18)',
              boxShadow: '0 2px 12px rgba(22, 38, 25, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0d1710' }}>
                  PM2.5 Concentration Trend (µg/m³) — {activeRangeConfig.label}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                  CPCB Thresholds: Satisfactory (60 µg/m³), Moderate (90 µg/m³)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#16a34a', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
                  Good &le;30
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#0d9488', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0d9488' }} />
                  Satisfactory &le;60
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#d97706', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706' }} />
                  Moderate &le;90
                </span>
              </div>
            </div>

            {isLoadingHistory ? (
              <div
                style={{
                  height: '320px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: '0.85rem',
                }}
              >
                Loading historical observations for selected period...
              </div>
            ) : chartData.length === 0 ? (
              <div
                style={{
                  height: '320px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  padding: '1.5rem',
                }}
              >
                <Info size={22} color="#166534" />
                <span style={{ fontWeight: 600, color: '#0d1710' }}>No observations recorded at this station within the selected {activeRangeConfig.label} window.</span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Station sensor maintenance or power downtime occurred during this interval. No artificial points are fabricated.
                </span>
              </div>
            ) : (
              <div style={{ width: '100%', height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="historyPm25Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#166534" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#166534" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(40, 122, 69, 0.12)" />
                    <XAxis
                      dataKey="timeLabel"
                      stroke="#64748b"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      minTickGap={timeRange === '30d' ? 45 : 25}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div
                              style={{
                                background: '#ffffff',
                                border: '1px solid rgba(40, 122, 69, 0.25)',
                                borderRadius: '8px',
                                padding: '0.65rem 0.85rem',
                                color: '#0f172a',
                                fontSize: '0.78rem',
                                boxShadow: '0 6px 20px rgba(22, 38, 25, 0.12)',
                              }}
                            >
                              <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>
                                {formatLocalIST(data.timestamp)}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: data.color }}>
                                  {data.pm25 !== null ? data.pm25 : 'Missing / Offline'}
                                </span>
                                <span style={{ color: '#64748b' }}>µg/m³ PM2.5</span>
                              </div>
                              <div style={{ color: data.color, fontWeight: 600, marginTop: '0.2rem' }}>
                                {data.category}
                              </div>
                              {data.pm10 !== null && (
                                <div style={{ color: '#64748b', marginTop: '0.2rem' }}>
                                  PM10: {data.pm10} µg/m³
                                </div>
                              )}
                              <div
                                style={{
                                  fontSize: '0.68rem',
                                  color: '#94a3b8',
                                  marginTop: '0.35rem',
                                  borderTop: '1px solid rgba(40, 122, 69, 0.12)',
                                  paddingTop: '0.25rem',
                                }}
                              >
                                Continuous CAAQMS Ground Truth
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={60}
                      stroke="rgba(40, 122, 69, 0.5)"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Satisfactory (60)',
                        fill: '#166534',
                        fontSize: 10,
                        position: 'insideTopRight',
                      }}
                    />
                    <ReferenceLine
                      y={90}
                      stroke="rgba(217, 119, 6, 0.5)"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Moderate (90)',
                        fill: '#d97706',
                        fontSize: 10,
                        position: 'insideTopRight',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pm25"
                      stroke="#166534"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#historyPm25Gradient)"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3: QUICK ACCESS TO SAVED LOCATIONS (CROSS-PORTAL SHORTCUTS)
      ========================================================================= */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Compass size={18} color="#166534" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
            Quick Access to Saved Locations
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Card 1: Explore on Pune Twin Map */}
          <div
            style={{
              padding: '1.35rem',
              borderRadius: '12px',
              border: '1px solid rgba(40, 122, 69, 0.18)',
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 4px 18px rgba(22, 38, 25, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                <MapPin size={16} color="#166534" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
                  Explore on Pune Digital Twin Map
                </h3>
              </div>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: '#526b59',
                  margin: '0 0 1.25rem 0',
                  lineHeight: 1.5,
                }}
              >
                Inspect regional spatial interpolation, heatmaps, and roadside traffic exposures centered on your
                selected place in the live interactive map.
              </p>
            </div>
            <button
              onClick={() => {
                if (selectedPlace && selectedPlace.stationId !== null) {
                  navigate(`/explore?station=${selectedPlace.stationId}`);
                } else {
                  navigate('/explore');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(40, 122, 69, 0.25)',
                background: 'rgba(240, 253, 244, 0.85)',
                color: '#166534',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Open in Explore Air Quality</span>
              <ExternalLink size={13} />
            </button>
          </div>

          {/* Card 2: Next-Hour Forecast & Activity Guidance */}
          <div
            style={{
              padding: '1.35rem',
              borderRadius: '12px',
              border: '1px solid rgba(40, 122, 69, 0.18)',
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 4px 18px rgba(22, 38, 25, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                <TrendingUp size={16} color="#166534" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
                  24-Hour Forecast &amp; Activity Guidance
                </h3>
              </div>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: '#526b59',
                  margin: '0 0 1.25rem 0',
                  lineHeight: 1.5,
                }}
              >
                Review ML-forecasted PM2.5 trajectories for your neighborhood to plan outdoor exercise, campus walks,
                or daily travel schedules.
              </p>
            </div>
            <button
              onClick={() => {
                if (selectedPlace && selectedPlace.stationId !== null) {
                  navigate(`/forecast-guidance?station=${selectedPlace.stationId}`);
                } else {
                  navigate('/forecast-guidance');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(40, 122, 69, 0.25)',
                background: 'rgba(240, 253, 244, 0.85)',
                color: '#166534',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Open Activity Guidance</span>
              <ExternalLink size={13} />
            </button>
          </div>

          {/* Card 3: Personal Alert Thresholds */}
          <div
            style={{
              padding: '1.35rem',
              borderRadius: '12px',
              border: '1px solid rgba(40, 122, 69, 0.18)',
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 4px 18px rgba(22, 38, 25, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                <Bell size={16} color="#166534" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
                  Configure Personal Alerts
                </h3>
              </div>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: '#526b59',
                  margin: '0 0 1.25rem 0',
                  lineHeight: 1.5,
                }}
              >
                Set up custom PM2.5 threshold warnings (e.g. alert me when PM2.5 exceeds 60 µg/m³) for your saved
                monitoring stations in the My Alerts center.
              </p>
            </div>
            <button
              onClick={() => {
                if (selectedPlace && selectedPlace.stationId !== null) {
                  navigate(`/my-alerts?tab=preferences&station=${selectedPlace.stationId}`);
                } else {
                  navigate('/my-alerts?tab=preferences');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(40, 122, 69, 0.25)',
                background: 'rgba(240, 253, 244, 0.85)',
                color: '#166534',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Manage in My Alerts</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: ADD / EDIT PLACE MODAL
      ========================================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              borderRadius: '14px',
              background: '#ffffff',
              border: '1px solid rgba(40, 122, 69, 0.25)',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(40, 122, 69, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bookmark size={18} color="#166534" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
                  {editingPlace ? 'Edit Saved Place' : 'Add New Saved Place'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                title="Close dialog"
                aria-label="Close dialog"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveModal} style={{ padding: '1.5rem' }}>
              {modalError && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: 'rgba(254, 242, 242, 0.9)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#b91c1c',
                    fontSize: '0.8rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  {modalError}
                </div>
              )}

              {/* 1. Custom Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '0.4rem',
                  }}
                >
                  Place Nickname / Friendly Label *
                </label>
                <input
                  type="text"
                  value={modalCustomName}
                  onChange={(e) => setModalCustomName(e.target.value)}
                  placeholder="e.g. Home Area, College / PCCOE, Morning Jogging Park"
                  maxLength={60}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1.5px solid rgba(40, 122, 69, 0.25)',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  autoFocus
                />
              </div>

              {/* 2. Category */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '0.4rem',
                  }}
                >
                  Category
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {(['HOME', 'COLLEGE', 'WORK', 'FITNESS', 'FAMILY', 'OTHER'] as PlaceCategory[]).map((cat) => {
                    const isSelected = modalCategory === cat;
                    const badge = getCategoryBadge(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setModalCategory(cat)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          padding: '0.55rem',
                          borderRadius: '6px',
                          border: isSelected
                            ? '1.5px solid #166534'
                            : '1px solid rgba(40, 122, 69, 0.2)',
                          background: isSelected ? '#166534' : 'rgba(240, 253, 244, 0.7)',
                          color: isSelected ? '#ffffff' : '#284632',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {getCategoryIcon(cat)}
                        <span>{badge.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Picker (Only for new places) */}
              {!editingPlace && (
                <>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        marginBottom: '0.4rem',
                      }}
                    >
                      Location Type
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setModalSelectionMode('LOCALITY')}
                        style={{
                          flex: 1,
                          padding: '0.55rem',
                          borderRadius: '6px',
                          border:
                            modalSelectionMode === 'LOCALITY'
                              ? '1.5px solid #166534'
                              : '1px solid rgba(40, 122, 69, 0.2)',
                          background:
                            modalSelectionMode === 'LOCALITY'
                              ? '#166534'
                              : 'rgba(240, 253, 244, 0.7)',
                          color: modalSelectionMode === 'LOCALITY' ? '#ffffff' : '#284632',
                          fontSize: '0.8rem',
                          fontWeight: modalSelectionMode === 'LOCALITY' ? 600 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        Supported Pune Locality
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalSelectionMode('STATION')}
                        style={{
                          flex: 1,
                          padding: '0.55rem',
                          borderRadius: '6px',
                          border:
                            modalSelectionMode === 'STATION'
                              ? '1.5px solid #166534'
                              : '1px solid rgba(40, 122, 69, 0.2)',
                          background:
                            modalSelectionMode === 'STATION'
                              ? '#166534'
                              : 'rgba(240, 253, 244, 0.7)',
                          color: modalSelectionMode === 'STATION' ? '#ffffff' : '#284632',
                          fontSize: '0.8rem',
                          fontWeight: modalSelectionMode === 'STATION' ? 600 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        Direct CAAQMS Station
                      </button>
                    </div>
                  </div>

                  {modalSelectionMode === 'LOCALITY' ? (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: '#1e293b',
                          marginBottom: '0.4rem',
                        }}
                      >
                        Choose Locality
                      </label>
                      <select
                        value={modalSelectedLocalityId}
                        onChange={(e) => setModalSelectedLocalityId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1.5px solid rgba(40, 122, 69, 0.25)',
                          color: '#0f172a',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      >
                        {PUNE_LOCALITY_PRESETS.map((loc) => (
                          <option key={loc.id} value={loc.id} style={{ background: '#ffffff', color: '#0f172a' }}>
                            {loc.name} — {loc.subtitle}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: '#1e293b',
                          marginBottom: '0.4rem',
                        }}
                      >
                        Choose Monitoring Station
                      </label>
                      <select
                        value={modalSelectedStationId || ''}
                        onChange={(e) => setModalSelectedStationId(parseInt(e.target.value, 10))}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1.5px solid rgba(40, 122, 69, 0.25)',
                          color: '#0f172a',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      >
                        {stations.map((st) => (
                          <option
                            key={st.station_id}
                            value={st.station_id}
                            style={{ background: '#ffffff', color: '#0f172a' }}
                          >
                            {st.station_name} ({st.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* 3. Optional Notes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '0.4rem',
                  }}
                >
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Near bus terminal, 3rd floor apartment, college hostel"
                  maxLength={120}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1.5px solid rgba(40, 122, 69, 0.25)',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.6rem 1.35rem',
                    borderRadius: '8px',
                    border: '1px solid #15803d',
                    background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 101, 52, 0.25)',
                  }}
                >
                  {editingPlace ? 'Update Place' : 'Save Place'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
