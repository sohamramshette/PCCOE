import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowUpDown,
  RotateCcw,
  Search,
  Car,
  Bike,
  Footprints,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Leaf,
  Zap,
  Info,
  MapPin,
  RefreshCw,
  Route,
  Clock,
  Compass,
  Square,
  Radio,
  Sliders,
  X,
  Play,
  SkipForward,
  Sparkles,
} from 'lucide-react';

import { getStations } from '../api/stations';
import { getObservations } from '../api/observations';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import {
  LocationItem,
  TravelMode,
  PUNE_LOCALITY_PRESETS,
  searchLocations,
  fetchRoadRoutes,
  RouteOption,
} from '../api/routing';
import {
  compareRoutes,
  RouteComparisonResult,
} from '../utils/routePollution';
import { RouteMap } from '../components/map/RouteMap';
import {
  GPSPosition,
  GPSState,
  NavigationStatus,
  RouteProgress,
  UpcomingPollutionStatus,
  RerouteComparison,
  calculateRouteProgress,
  sliceUpcomingRoute,
  monitorUpcomingRoutePollution,
  evaluateRerouteAlternatives,
  formatNavDistance,
  formatNavDuration,
} from '../utils/navigationTracking';

export const CleanerRoutes: React.FC = () => {
  // Environmental Monitoring Data State
  const [stations, setStations] = useState<Station[]>([]);
  const [stationObservations, setStationObservations] = useState<Record<number, ObservationItem | null>>({});
  const [isLoadingStations, setIsLoadingStations] = useState<boolean>(true);

  // Route Input State
  const [startQuery, setStartQuery] = useState<string>('Kothrud');
  const [selectedStart, setSelectedStart] = useState<LocationItem | null>(PUNE_LOCALITY_PRESETS[1]); // Kothrud
  const [startSuggestions, setStartSuggestions] = useState<LocationItem[]>([]);
  const [isStartFocused, setIsStartFocused] = useState<boolean>(false);

  const [destQuery, setDestQuery] = useState<string>('Hinjawadi');
  const [selectedDest, setSelectedDest] = useState<LocationItem | null>(PUNE_LOCALITY_PRESETS[2]); // Hinjawadi
  const [destSuggestions, setDestSuggestions] = useState<LocationItem[]>([]);
  const [isDestFocused, setIsDestFocused] = useState<boolean>(false);

  const [travelMode, setTravelMode] = useState<TravelMode>('driving');

  // Routing Results State
  const [routeResults, setRouteResults] = useState<RouteComparisonResult[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // GPS & Live Navigation State
  const [gpsState, setGpsState] = useState<GPSState>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsSuccessMessage, setGpsSuccessMessage] = useState<string | null>(null);
  const [userGpsPosition, setUserGpsPosition] = useState<GPSPosition | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);

  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navStatus, setNavStatus] = useState<NavigationStatus>('following');
  const [routeProgress, setRouteProgress] = useState<RouteProgress | null>(null);
  const [upcomingPollution, setUpcomingPollution] = useState<UpcomingPollutionStatus | null>(null);
  const [elevatedPollutionDismissed, setElevatedPollutionDismissed] = useState<boolean>(false);

  // Rerouting State
  const [rerouteComparison, setRerouteComparison] = useState<RerouteComparison | null>(null);
  const [isRecalculatingReroute, setIsRecalculatingReroute] = useState<boolean>(false);
  const [autoRerouteEnabled, setAutoRerouteEnabled] = useState<boolean>(false);
  const [rerouteNotification, setRerouteNotification] = useState<string | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);

  // Simulation mode (for verification)
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showSimControls, setShowSimControls] = useState<boolean>(false);

  // Refs for tracking lifecycle & timers
  const watchIdRef = useRef<number | null>(null);
  const prevOffRouteCountRef = useRef<number>(0);
  const rerouteCooldownUntilRef = useRef<number>(0);
  const isRecalculatingRef = useRef<boolean>(false);
  const simIndexRef = useRef<number>(0);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedRouteRef = useRef<RouteOption | null>(null);
  const cachedRoutesRef = useRef<RouteOption[] | null>(null);

  // 1. Fetch Station Network and Latest Observations
  const loadStationData = useCallback(async () => {
    try {
      setIsLoadingStations(true);
      const stationList = await getStations(true);

      const obsMap: Record<number, ObservationItem | null> = {};
      await Promise.all(
        stationList.map(async (st) => {
          try {
            const res = await getObservations(st.station_id, {
              limit: 1,
              order: 'desc',
              valid_pm25_only: true,
            });
            obsMap[st.station_id] = res.items.length > 0 ? res.items[0] : null;
          } catch {
            obsMap[st.station_id] = null;
          }
        })
      );

      // Set stations AND observations simultaneously to prevent race condition
      setStations(stationList);
      setStationObservations(obsMap);

      // If routes have already been calculated, refresh them with fresh observations
      if (cachedRoutesRef.current && cachedRoutesRef.current.length > 0) {
        const refreshed = compareRoutes(cachedRoutesRef.current, stationList, obsMap);
        setRouteResults(refreshed);
      }
    } catch {
      // Station network fallback
    } finally {
      setIsLoadingStations(false);
    }
  }, []);

  useEffect(() => {
    loadStationData();
  }, [loadStationData]);

  // Clean up GPS watchers & simulation timers on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, []);

  // Autocomplete search handlers
  useEffect(() => {
    if (!startQuery.trim()) {
      setStartSuggestions(PUNE_LOCALITY_PRESETS.slice(0, 6));
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchLocations(startQuery);
      setStartSuggestions(results);
    }, 200);
    return () => clearTimeout(timer);
  }, [startQuery]);

  useEffect(() => {
    if (!destQuery.trim()) {
      setDestSuggestions(PUNE_LOCALITY_PRESETS.slice(0, 6));
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchLocations(destQuery);
      setDestSuggestions(results);
    }, 200);
    return () => clearTimeout(timer);
  }, [destQuery]);

  // Selected route comparison item
  const selectedRouteComparison = useMemo(() => {
    return (
      routeResults.find((r) => r.route.id === selectedRouteId) ||
      routeResults[0] ||
      null
    );
  }, [routeResults, selectedRouteId]);

  // Synchronize active route ref
  useEffect(() => {
    selectedRouteRef.current = selectedRouteComparison ? selectedRouteComparison.route : null;
  }, [selectedRouteComparison]);

  // Evaluate candidate reroutes from current GPS to destination
  const checkRerouteAlternatives = useCallback(
    async (gps: GPSPosition, activeRoute: RouteOption, currUpcomingEst: UpcomingPollutionStatus) => {
      if (!selectedDest || isRecalculatingRef.current) return;
      if (Date.now() < rerouteCooldownUntilRef.current) return;

      try {
        isRecalculatingRef.current = true;
        setIsRecalculatingReroute(true);

        const currentOriginItem: LocationItem = {
          id: 'current-gps-reroute-start',
          name: 'Current Location',
          subtitle: 'Live Navigation GPS Position',
          lat: gps.lat,
          lon: gps.lon,
          isPreset: false,
        };

        const freshRoutes = await fetchRoadRoutes(currentOriginItem, selectedDest, travelMode);
        if (!freshRoutes || freshRoutes.length === 0) return;

        const freshCompared = compareRoutes(freshRoutes, stations, stationObservations);

        const remainingMinutes = activeRoute.durationMinutes;
        const remainingKm = activeRoute.distanceKm;

        const comparison = evaluateRerouteAlternatives(
          activeRoute.id,
          currUpcomingEst.estimate,
          remainingMinutes,
          remainingKm,
          freshCompared
        );

        setRerouteComparison(comparison);

        if (autoRerouteEnabled && comparison.autoSwitchEligible && comparison.bestCleanerAlternative) {
          const chosen = comparison.bestCleanerAlternative;
          setRouteResults(freshCompared);
          setSelectedRouteId(chosen.route.id);
          selectedRouteRef.current = chosen.route;
          setRerouteNotification(
            `Automatically switched to cleaner corridor (${chosen.route.name}) with ${comparison.pm25ReductionPercent}% lower estimated PM2.5.`
          );
          setRerouteComparison(null);
          rerouteCooldownUntilRef.current = Date.now() + 90000;
        }
      } catch {
        // Preserve current route if recalculation fails
      } finally {
        isRecalculatingRef.current = false;
        setIsRecalculatingReroute(false);
      }
    },
    [selectedDest, travelMode, stations, stationObservations, autoRerouteEnabled]
  );

  // Process GPS update during navigation
  const processNavigationGpsUpdate = useCallback(
    (gps: GPSPosition, activeRoute: RouteOption) => {
      const progress = calculateRouteProgress(
        gps,
        activeRoute.coordinates,
        activeRoute.distanceMeters,
        activeRoute.durationMinutes,
        prevOffRouteCountRef.current
      );

      prevOffRouteCountRef.current = progress.offRouteCount;
      setRouteProgress(progress);

      if (progress.hasArrived) {
        setNavStatus('arrived');
        setUpcomingPollution(null);
        setRerouteComparison(null);
        return;
      }

      if (progress.isOffRoute) {
        setNavStatus('off_route');
      } else if (progress.isAccuracyImprecise) {
        setNavStatus('poor_accuracy');
      } else {
        setNavStatus('following');
      }

      const upcomingRoute = sliceUpcomingRoute(activeRoute, progress);
      const pollStatus = monitorUpcomingRoutePollution(
        upcomingRoute,
        stations,
        stationObservations
      );
      setUpcomingPollution(pollStatus);

      if (pollStatus.isElevated && !elevatedPollutionDismissed) {
        checkRerouteAlternatives(gps, activeRoute, pollStatus);
      }
    },
    [stations, stationObservations, elevatedPollutionDismissed, checkRerouteAlternatives]
  );

  // Execute Route Computation
  const handleFindRoutes = useCallback(async () => {
    if (!selectedStart || !selectedDest) {
      setRouteError('Please select both a starting point and a destination.');
      return;
    }

    if (
      Math.abs(selectedStart.lat - selectedDest.lat) < 0.001 &&
      Math.abs(selectedStart.lon - selectedDest.lon) < 0.001
    ) {
      setRouteError('Starting point and destination cannot be identical.');
      return;
    }

    setIsCalculatingRoutes(true);
    setRouteError(null);

    try {
      const routes = await fetchRoadRoutes(selectedStart, selectedDest, travelMode);

      if (!routes || routes.length === 0) {
        setRouteError('No drivable road routes were found between these locations.');
        setRouteResults([]);
        return;
      }

      cachedRoutesRef.current = routes;
      const compared = compareRoutes(routes, stations, stationObservations);
      setRouteResults(compared);

      const cleanOption = compared.find((c) => c.isLowestPollution);
      setSelectedRouteId(cleanOption ? cleanOption.route.id : compared[0].route.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to calculate road routes';
      setRouteError(`Routing error: ${msg}. Please verify your connectivity or try another location.`);
      setRouteResults([]);
    } finally {
      setIsCalculatingRoutes(false);
    }
  }, [selectedStart, selectedDest, travelMode, stations, stationObservations]);

  // Auto-run initial sample route once stations are loaded
  useEffect(() => {
    if (stations.length > 0 && routeResults.length === 0 && !isCalculatingRoutes && !routeError) {
      handleFindRoutes();
    }
  }, [stations.length, routeResults.length, isCalculatingRoutes, routeError, handleFindRoutes]);

  // Use My Current Location Handler
  const handleUseCurrentLocation = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsState('unavailable');
      return;
    }

    if (
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setGpsError('Browser requires HTTPS (or localhost) to securely access GPS location.');
      setGpsState('unavailable');
      return;
    }

    setIsLocatingGps(true);
    setGpsState('locating');
    setGpsError(null);
    setGpsSuccessMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        const newGps: GPSPosition = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        };

        setUserGpsPosition(newGps);
        setGpsState(newGps.accuracy > 150 ? 'inaccurate' : 'locked');

        const accRounded = Math.round(newGps.accuracy);
        const locItem: LocationItem = {
          id: 'current-gps-location',
          name: 'My Current Location',
          subtitle: `GPS Fix (±${accRounded}m) · ${newGps.lat.toFixed(4)}, ${newGps.lon.toFixed(4)}`,
          lat: newGps.lat,
          lon: newGps.lon,
          isPreset: false,
        };

        setSelectedStart(locItem);
        setStartQuery('My Current Location');

        if (newGps.accuracy > 250) {
          setGpsSuccessMessage(`Current location detected (accuracy ±${accRounded}m - approximate).`);
        } else {
          setGpsSuccessMessage(`Current location detected (accuracy ±${accRounded}m).`);
        }

        setRecenterTrigger((prev) => prev + 1);
      },
      (err) => {
        setIsLocatingGps(false);
        let message = 'Unable to acquire GPS location.';
        if (err.code === 1) {
          message = 'GPS permission denied. Please allow location access in your browser.';
          setGpsState('denied');
        } else if (err.code === 2) {
          message = 'Location signal unavailable. Please ensure GPS/location services are enabled.';
          setGpsState('unavailable');
        } else if (err.code === 3) {
          message = 'Location request timed out. Please try again or choose a preset locality.';
          setGpsState('timeout');
        } else {
          setGpsState('unavailable');
        }
        setGpsError(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  }, []);

  // Navigation Handlers
  const handleStopNavigation = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsNavigating(false);
    setIsSimulating(false);
    setNavStatus('following');
    setRouteProgress(null);
    setUpcomingPollution(null);
    setRerouteComparison(null);
    setRerouteNotification(null);
    setElevatedPollutionDismissed(false);
    prevOffRouteCountRef.current = 0;
  }, []);

  const handleStartNavigation = useCallback(() => {
    if (!selectedDest) {
      setRouteError('Please select a destination before starting navigation.');
      return;
    }
    if (!selectedRouteComparison) {
      setRouteError('Please calculate or select a route before starting navigation.');
      return;
    }

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    setGpsError(null);
    setIsNavigating(true);
    setNavStatus('following');
    setElevatedPollutionDismissed(false);
    setRerouteComparison(null);
    setRerouteNotification(null);
    prevOffRouteCountRef.current = 0;

    const activeRoute = selectedRouteComparison.route;

    if (userGpsPosition) {
      processNavigationGpsUpdate(userGpsPosition, activeRoute);
      setRecenterTrigger((prev) => prev + 1);
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newGps: GPSPosition = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        };
        setUserGpsPosition(newGps);
        setGpsState(newGps.accuracy > 150 ? 'inaccurate' : 'locked');
        setGpsError(null);

        const currentActive = selectedRouteRef.current;
        if (currentActive) {
          processNavigationGpsUpdate(newGps, currentActive);
        }
      },
      (err) => {
        let message = 'GPS connection interrupted.';
        if (err.code === 1) {
          message = 'GPS permission denied. Navigation stopped.';
          setGpsState('denied');
          handleStopNavigation();
        } else if (err.code === 2) {
          message = 'GPS signal lost or unavailable.';
          setGpsState('unavailable');
        } else if (err.code === 3) {
          message = 'GPS update timed out.';
          setGpsState('timeout');
        }
        setGpsError(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      }
    );

    watchIdRef.current = watchId;
  }, [selectedDest, selectedRouteComparison, userGpsPosition, processNavigationGpsUpdate, handleStopNavigation]);

  // Switch to cleaner alternative route
  const handleSwitchToCleanerRoute = useCallback(() => {
    if (!rerouteComparison?.bestCleanerAlternative) return;

    const chosen = rerouteComparison.bestCleanerAlternative;
    setRouteResults(rerouteComparison.candidateAlternatives);
    setSelectedRouteId(chosen.route.id);
    selectedRouteRef.current = chosen.route;

    if (userGpsPosition) {
      const locItem: LocationItem = {
        id: 'current-gps-switched',
        name: 'My Current Location',
        subtitle: `Rerouted Corridor · ${userGpsPosition.lat.toFixed(4)}, ${userGpsPosition.lon.toFixed(4)}`,
        lat: userGpsPosition.lat,
        lon: userGpsPosition.lon,
        isPreset: false,
      };
      setSelectedStart(locItem);
      setStartQuery('My Current Location');
      processNavigationGpsUpdate(userGpsPosition, chosen.route);
    }

    setRerouteNotification(
      `Switched to cleaner corridor (${chosen.route.name}) with ${rerouteComparison.pm25ReductionPercent}% lower estimated PM2.5 exposure.`
    );
    setRerouteComparison(null);
    setElevatedPollutionDismissed(false);
    rerouteCooldownUntilRef.current = Date.now() + 60000;
    setRecenterTrigger((prev) => prev + 1);
  }, [rerouteComparison, userGpsPosition, processNavigationGpsUpdate]);

  const handleStayOnCurrentRoute = useCallback(() => {
    setRerouteComparison(null);
    setElevatedPollutionDismissed(true);
    rerouteCooldownUntilRef.current = Date.now() + 180000;
  }, []);

  const handleRecalculateFromCurrentPosition = useCallback(async () => {
    if (!userGpsPosition || !selectedDest) return;

    setIsCalculatingRoutes(true);
    setRouteError(null);
    prevOffRouteCountRef.current = 0;
    setNavStatus('following');

    try {
      const currentLocItem: LocationItem = {
        id: 'current-gps-recalculate',
        name: 'My Current Location',
        subtitle: `GPS Fix (±${Math.round(userGpsPosition.accuracy)}m)`,
        lat: userGpsPosition.lat,
        lon: userGpsPosition.lon,
        isPreset: false,
      };

      setSelectedStart(currentLocItem);
      setStartQuery('My Current Location');

      const freshRoutes = await fetchRoadRoutes(currentLocItem, selectedDest, travelMode);
      if (!freshRoutes || freshRoutes.length === 0) {
        setRouteError('Could not find road routes from your current GPS position to destination.');
        return;
      }

      const freshCompared = compareRoutes(freshRoutes, stations, stationObservations);
      setRouteResults(freshCompared);

      const cleanest = freshCompared.find((c) => c.isLowestPollution) || freshCompared[0];
      setSelectedRouteId(cleanest.route.id);
      selectedRouteRef.current = cleanest.route;

      processNavigationGpsUpdate(userGpsPosition, cleanest.route);
      setRecenterTrigger((prev) => prev + 1);
      setRerouteNotification('Route recalculated from your current GPS position.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to recalculate road path';
      setRouteError(`Recalculation error: ${msg}.`);
    } finally {
      setIsCalculatingRoutes(false);
    }
  }, [userGpsPosition, selectedDest, travelMode, stations, stationObservations, processNavigationGpsUpdate]);

  // Simulation controls
  const handleToggleSimulation = useCallback(() => {
    if (isSimulating) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      setIsSimulating(false);
      return;
    }

    if (!selectedRouteComparison) return;

    if (!isNavigating) {
      setIsNavigating(true);
      setNavStatus('following');
      setElevatedPollutionDismissed(false);
      setRerouteComparison(null);
      prevOffRouteCountRef.current = 0;
    }

    setIsSimulating(true);
    const coords = selectedRouteComparison.route.coordinates;
    simIndexRef.current = 0;

    simIntervalRef.current = setInterval(() => {
      if (simIndexRef.current < coords.length) {
        const point = coords[simIndexRef.current];
        const simulatedGps: GPSPosition = {
          lat: point[0],
          lon: point[1],
          accuracy: 12,
          heading: 45,
          speed: 11,
          timestamp: Date.now(),
        };

        setUserGpsPosition(simulatedGps);
        setGpsState('locked');

        const activeRoute = selectedRouteRef.current || selectedRouteComparison.route;
        processNavigationGpsUpdate(simulatedGps, activeRoute);

        simIndexRef.current += 1;
      } else {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        setIsSimulating(false);
      }
    }, 1500);
  }, [isSimulating, isNavigating, selectedRouteComparison, processNavigationGpsUpdate]);

  const handleSimulateOffRoute = useCallback(() => {
    if (!userGpsPosition || !selectedRouteComparison) return;
    const offGps: GPSPosition = {
      lat: userGpsPosition.lat + 0.0016,
      lon: userGpsPosition.lon + 0.0016,
      accuracy: 15,
      heading: 90,
      speed: 8,
      timestamp: Date.now(),
    };
    setUserGpsPosition(offGps);
    prevOffRouteCountRef.current = 2;
    processNavigationGpsUpdate(offGps, selectedRouteRef.current || selectedRouteComparison.route);
  }, [userGpsPosition, selectedRouteComparison, processNavigationGpsUpdate]);

  const handleSimulateArrival = useCallback(() => {
    if (!selectedRouteComparison) return;
    const coords = selectedRouteComparison.route.coordinates;
    const destPoint = coords[coords.length - 1];
    const arrivalGps: GPSPosition = {
      lat: destPoint[0],
      lon: destPoint[1],
      accuracy: 8,
      heading: 0,
      speed: 0,
      timestamp: Date.now(),
    };
    setUserGpsPosition(arrivalGps);
    processNavigationGpsUpdate(arrivalGps, selectedRouteRef.current || selectedRouteComparison.route);
  }, [selectedRouteComparison, processNavigationGpsUpdate]);

  const handleSwapLocations = () => {
    const prevStartLoc = selectedStart;
    const prevStartQ = startQuery;

    setSelectedStart(selectedDest);
    setStartQuery(destQuery);

    setSelectedDest(prevStartLoc);
    setDestQuery(prevStartQ);
  };

  const handleClearForm = () => {
    handleStopNavigation();
    setStartQuery('');
    setSelectedStart(null);
    setDestQuery('');
    setSelectedDest(null);
    setRouteResults([]);
    setSelectedRouteId(null);
    setRouteError(null);
    setUserGpsPosition(null);
    setGpsSuccessMessage(null);
    setGpsError(null);
    setGpsState('idle');
  };

  const handleApplyPresetCommute = (startName: string, destName: string) => {
    handleStopNavigation();
    const startItem = PUNE_LOCALITY_PRESETS.find((p) => p.name === startName);
    const destItem = PUNE_LOCALITY_PRESETS.find((p) => p.name === destName);

    if (startItem && destItem) {
      setSelectedStart(startItem);
      setStartQuery(startItem.name);
      setSelectedDest(destItem);
      setDestQuery(destItem.name);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* 1. Header Bar */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '18px',
          padding: '1rem 1.5rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(40, 122, 69, 0.12)',
              border: '1px solid rgba(40, 122, 69, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#166534',
              flexShrink: 0,
            }}
          >
            <Route size={20} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 700,
                  margin: 0,
                  color: '#0d1710',
                  fontFamily: 'var(--font-heading)',
                  letterSpacing: '-0.01em',
                }}
              >
                Compare Cleaner Travel Routes
              </h1>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(40, 122, 69, 0.1)',
                  color: '#166534',
                  border: '1px solid rgba(40, 122, 69, 0.22)',
                }}
              >
                Pune &amp; PCMC
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#526b59' }}>
              Genuine road routes evaluated using live monitoring sensors, spatial interpolation, and GPS navigation.
            </p>
          </div>
        </div>

        {/* Telemetry & GPS Connectivity Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'rgba(240, 253, 244, 0.75)',
              border: '1px solid rgba(40, 122, 69, 0.18)',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '0.74rem',
              color: '#475e4e',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isLoadingStations ? '#facc15' : '#16a34a',
              }}
            />
            <span>{isLoadingStations ? 'Syncing sensors...' : `${stations.length || 6} Ground Stations Active`}</span>
            {gpsState === 'locked' && userGpsPosition && (
              <span style={{ color: '#166534', fontWeight: 600 }}>
                · GPS Locked (±{Math.round(userGpsPosition.accuracy)}m)
              </span>
            )}
          </div>

          {isNavigating && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#15803d',
              }}
            >
              <Radio size={12} style={{ animation: 'pulse 1.5s infinite' }} />
              <span>Navigation Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Reroute Alert Notification Toast */}
      {rerouteNotification && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.98) 0%, rgba(220, 252, 231, 0.98) 100%)',
            border: '1px solid rgba(40, 122, 69, 0.3)',
            borderRadius: '14px',
            padding: '10px 16px',
            marginBottom: '1rem',
            color: '#14532d',
            fontSize: '0.84rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(22, 101, 52, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#16a34a" />
            <span style={{ fontWeight: 600 }}>{rerouteNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setRerouteNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#166534',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 2. Unified Two-Column Studio Layout */}
      <div
        className="cleaner-routes-studio-grid"
      >
        {/* ========================================================= */}
        {/* LEFT COLUMN: Controls, Navigation Console, & Route Cards */}
        {/* ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Card A: Journey Planner */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(40, 122, 69, 0.18)',
              borderRadius: '20px',
              padding: '1.4rem 1.5rem',
              boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
            }}
          >
            {/* Header & Preset commute chips */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0d1710', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Plan Journey Corridor
                </span>
                <button
                  type="button"
                  onClick={handleClearForm}
                  title="Reset form"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              </div>

              {/* Quick commute pills */}
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Kothrud ➔ Hinjawadi', s: 'Kothrud', d: 'Hinjawadi' },
                  { label: 'Swargate ➔ Shivajinagar', s: 'Swargate', d: 'Shivajinagar' },
                  { label: 'Viman Nagar ➔ Hadapsar', s: 'Viman Nagar', d: 'Hadapsar / Magarpatta' },
                  { label: 'Akurdi ➔ Bhosari', s: 'Akurdi', d: 'Bhosari' },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPresetCommute(p.s, p.d)}
                    style={{
                      background: 'rgba(240, 253, 244, 0.8)',
                      border: '1px solid rgba(40, 122, 69, 0.2)',
                      borderRadius: '6px',
                      padding: '3px 7px',
                      color: '#166534',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Starting Point & Use Current Location */}
            <div style={{ marginBottom: '10px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label
                  htmlFor="start-input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#166534',
                    textTransform: 'uppercase',
                    margin: 0,
                  }}
                >
                  <MapPin size={11} color="#166534" />
                  Origin
                </label>

                {/* Requirement 1: Use My Current Location Button */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocatingGps}
                  title="Detect your live position via browser GPS"
                  style={{
                    background: 'rgba(40, 122, 69, 0.1)',
                    border: '1px solid rgba(40, 122, 69, 0.25)',
                    borderRadius: '7px',
                    padding: '2px 8px',
                    color: '#166534',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: isLocatingGps ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isLocatingGps ? (
                    <>
                      <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Locating...</span>
                    </>
                  ) : (
                    <>
                      <Compass size={11} />
                      <span>Use My Current Location</span>
                    </>
                  )}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  id="start-input"
                  type="text"
                  placeholder="Search starting locality or use GPS..."
                  value={startQuery}
                  onChange={(e) => {
                    setStartQuery(e.target.value);
                    setSelectedStart(null);
                    setGpsSuccessMessage(null);
                  }}
                  onFocus={() => setIsStartFocused(true)}
                  onBlur={() => setTimeout(() => setIsStartFocused(false), 250)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                    border: '1.5px solid rgba(40, 122, 69, 0.25)',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    color: '#0f172a',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
                {selectedStart && (
                  <CheckCircle2
                    size={15}
                    color="#16a34a"
                    style={{ position: 'absolute', right: '10px', top: '10px' }}
                  />
                )}
              </div>

              {gpsSuccessMessage && (
                <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={11} color="#166534" />
                  <span>{gpsSuccessMessage}</span>
                </div>
              )}

              {gpsError && (
                <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={11} color="#ef4444" />
                  <span>{gpsError}</span>
                </div>
              )}

              {/* Autocomplete Dropdown */}
              {isStartFocused && startSuggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 2000,
                    background: '#ffffff',
                    border: '1px solid rgba(40, 122, 69, 0.25)',
                    borderRadius: '10px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    marginTop: '3px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  {startSuggestions.map((item) => (
                    <div
                      key={item.id}
                      onMouseDown={() => {
                        setSelectedStart(item);
                        setStartQuery(item.name);
                        setIsStartFocused(false);
                        setGpsSuccessMessage(null);
                      }}
                      style={{
                        padding: '8px 11px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(40, 122, 69, 0.08)',
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0d1710' }}>{item.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.subtitle}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Swap & Destination Row */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <label
                  htmlFor="dest-input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#b91c1c',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  <MapPin size={11} color="#b91c1c" />
                  Destination
                </label>

                <div style={{ position: 'relative' }}>
                  <input
                    id="dest-input"
                    type="text"
                    placeholder="Search destination (e.g. Hinjawadi)..."
                    value={destQuery}
                    onChange={(e) => {
                      setDestQuery(e.target.value);
                      setSelectedDest(null);
                    }}
                    onFocus={() => setIsDestFocused(true)}
                    onBlur={() => setTimeout(() => setIsDestFocused(false), 250)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: '#ffffff',
                      border: '1.5px solid rgba(40, 122, 69, 0.25)',
                      borderRadius: '10px',
                      padding: '9px 12px',
                      color: '#0f172a',
                      fontSize: '0.86rem',
                      outline: 'none',
                    }}
                  />
                  {selectedDest && (
                    <CheckCircle2
                      size={15}
                      color="#16a34a"
                      style={{ position: 'absolute', right: '10px', top: '10px' }}
                    />
                  )}
                </div>

                {/* Destination Dropdown */}
                {isDestFocused && destSuggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 2000,
                      background: '#ffffff',
                      border: '1px solid rgba(40, 122, 69, 0.25)',
                      borderRadius: '10px',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                      marginTop: '3px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                    }}
                  >
                    {destSuggestions.map((item) => (
                      <div
                        key={item.id}
                        onMouseDown={() => {
                          setSelectedDest(item);
                          setDestQuery(item.name);
                          setIsDestFocused(false);
                        }}
                        style={{
                          padding: '8px 11px',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(40, 122, 69, 0.08)',
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0d1710' }}>{item.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.subtitle}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Swap Button */}
              <div style={{ paddingTop: '20px' }}>
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  title="Swap origin and destination"
                  aria-label="Swap origin and destination"
                  style={{
                    background: 'rgba(240, 253, 244, 0.8)',
                    border: '1px solid rgba(40, 122, 69, 0.25)',
                    borderRadius: '10px',
                    color: '#166534',
                    padding: '9px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowUpDown size={15} />
                </button>
              </div>
            </div>

            {/* Travel Mode & Find Routes Action */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              {/* Mode Toggle */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(240, 253, 244, 0.8)',
                  border: '1px solid rgba(40, 122, 69, 0.2)',
                  borderRadius: '10px',
                  padding: '2px',
                }}
              >
                {[
                  { mode: 'driving' as TravelMode, icon: <Car size={13} />, label: 'Drive' },
                  { mode: 'cycling' as TravelMode, icon: <Bike size={13} />, label: 'Bicycle' },
                  { mode: 'walking' as TravelMode, icon: <Footprints size={13} />, label: 'Walk' },
                ].map((m) => {
                  const active = travelMode === m.mode;
                  return (
                    <button
                      key={m.mode}
                      type="button"
                      onClick={() => setTravelMode(m.mode)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 9px',
                        border: 'none',
                        borderRadius: '7px',
                        background: active ? '#166534' : 'transparent',
                        color: active ? '#ffffff' : '#334155',
                        fontSize: '0.74rem',
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                        boxShadow: active ? '0 2px 6px rgba(22, 101, 52, 0.25)' : 'none',
                      }}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Find Routes Button */}
              <button
                type="button"
                onClick={handleFindRoutes}
                disabled={isCalculatingRoutes || !selectedStart || !selectedDest}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: isCalculatingRoutes || !selectedStart || !selectedDest ? 'not-allowed' : 'pointer',
                  opacity: !selectedStart || !selectedDest ? 0.6 : 1,
                  boxShadow: '0 4px 12px rgba(22, 101, 52, 0.25)',
                  whiteSpace: 'nowrap',
                }}
              >
                {isCalculatingRoutes ? (
                  <>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <Search size={13} />
                    <span>Find Routes</span>
                  </>
                )}
              </button>
            </div>

            {routeError && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#dc2626',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{routeError}</span>
              </div>
            )}
          </div>

          {/* Card B: Active Navigation HUD (When Navigating) */}
          {isNavigating && (
            <div
              style={{
                background: 'rgba(240, 253, 244, 0.95)',
                border: '2px solid rgba(40, 122, 69, 0.35)',
                borderRadius: '20px',
                padding: '1.2rem 1.4rem',
                boxShadow: '0 8px 24px rgba(22, 38, 25, 0.08)',
              }}
            >
              {/* Top row: Status & Stop Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      color: '#15803d',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}
                  >
                    <Radio size={11} style={{ animation: 'pulse 1.2s infinite' }} />
                    Navigation Active
                  </span>

                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: navStatus === 'off_route' ? '#c2410c' : '#15803d',
                    }}
                  >
                    {navStatus === 'arrived'
                      ? 'Arrived!'
                      : navStatus === 'off_route'
                      ? 'Off Route'
                      : 'On Route'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleStopNavigation}
                  style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '5px 11px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Square size={11} />
                  <span>Stop</span>
                </button>
              </div>

              {/* Navigation Metrics Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(40, 122, 69, 0.18)' }}>
                  <div style={{ fontSize: '0.65rem', color: '#526b59', textTransform: 'uppercase' }}>Remaining Distance</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0d1710' }}>
                    {routeProgress ? formatNavDistance(routeProgress.remainingDistanceMeters) : `${selectedRouteComparison?.route.distanceKm} km`}
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(40, 122, 69, 0.18)' }}>
                  <div style={{ fontSize: '0.65rem', color: '#526b59', textTransform: 'uppercase' }}>Remaining Time</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0d1710' }}>
                    {routeProgress ? formatNavDuration(routeProgress.remainingDurationMinutes) : `~${selectedRouteComparison?.route.durationMinutes} mins`}
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(40, 122, 69, 0.18)' }}>
                  <div style={{ fontSize: '0.65rem', color: '#526b59', textTransform: 'uppercase' }}>Upcoming PM2.5</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0d1710' }}>
                    {upcomingPollution?.estimate.avgPm25 !== null && upcomingPollution?.estimate.avgPm25 !== undefined
                      ? `${upcomingPollution.estimate.avgPm25} µg/m³`
                      : selectedRouteComparison?.estimate.avgPm25 ? `${selectedRouteComparison.estimate.avgPm25} µg/m³` : '—'}
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(40, 122, 69, 0.18)' }}>
                  <div style={{ fontSize: '0.65rem', color: '#526b59', textTransform: 'uppercase' }}>GPS Precision</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0d1710' }}>
                    {userGpsPosition ? `±${Math.round(userGpsPosition.accuracy)}m` : 'Acquiring...'}
                  </div>
                </div>
              </div>

              {/* Auto-switch checkbox */}
              <div style={{ padding: '6px 10px', background: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: '1px solid rgba(40, 122, 69, 0.18)', marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoRerouteEnabled}
                    onChange={(e) => setAutoRerouteEnabled(e.target.checked)}
                    style={{ accentColor: '#166534', width: '13px', height: '13px' }}
                  />
                  <span>Auto-switch to cleaner corridor if ≥3.0 µg/m³ cleaner</span>
                </label>
              </div>

              {/* Simulator toggle */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowSimControls((p) => !p)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#526b59',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sliders size={11} />
                  <span>{showSimControls ? 'Hide Simulation Tools' : 'Test Simulation Tools'}</span>
                </button>
              </div>

              {/* Simulation drawer */}
              {showSimControls && (
                <div style={{ marginTop: '8px', padding: '10px', background: '#ffffff', borderRadius: '10px', border: '1px dashed rgba(40, 122, 69, 0.35)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700, marginBottom: '6px' }}>
                    Simulation Engine
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleToggleSimulation}
                      style={{
                        background: isSimulating ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        color: isSimulating ? '#dc2626' : '#15803d',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Play size={10} />
                      <span>{isSimulating ? 'Pause' : 'Drive Sim'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSimulateOffRoute}
                      disabled={!userGpsPosition}
                      style={{
                        background: 'rgba(249, 115, 22, 0.15)',
                        border: '1px solid rgba(249, 115, 22, 0.4)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        color: '#c2410c',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                      }}
                    >
                      Off-Route Sim
                    </button>

                    <button
                      type="button"
                      onClick={handleSimulateArrival}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        color: '#0284c7',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <SkipForward size={10} />
                      <span>Jump Dest</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Off-Route Alert */}
              {navStatus === 'off_route' && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '10px 12px',
                    background: 'rgba(254, 243, 199, 0.9)',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: '#92400e' }}>
                    <strong>Off Route:</strong> ~{routeProgress?.distanceToRouteMeters}m deviation.
                  </div>
                  <button
                    type="button"
                    onClick={handleRecalculateFromCurrentPosition}
                    disabled={isCalculatingRoutes}
                    style={{
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '7px',
                      padding: '5px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Recalculate
                  </button>
                </div>
              )}

              {/* Elevated Pollution Notice */}
              {upcomingPollution?.isElevated && !elevatedPollutionDismissed && !rerouteComparison?.bestCleanerAlternative && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '10px 12px',
                    background: 'rgba(254, 240, 138, 0.65)',
                    border: '1px solid rgba(202, 138, 4, 0.4)',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '0.73rem', color: '#713f12', lineHeight: 1.3 }}>
                    <strong>Elevated PM2.5:</strong> Est. {upcomingPollution.estimate.avgPm25} µg/m³.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (userGpsPosition && selectedRouteComparison) {
                        checkRerouteAlternatives(userGpsPosition, selectedRouteComparison.route, upcomingPollution);
                      }
                    }}
                    disabled={isRecalculatingReroute}
                    style={{
                      background: '#ca8a04',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '7px',
                      padding: '5px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Find Cleaner
                  </button>
                </div>
              )}

              {/* Cleaner Route Proposal Card */}
              {rerouteComparison?.bestCleanerAlternative && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '10px 12px',
                    background: 'rgba(240, 253, 244, 0.95)',
                    border: '2px solid #16a34a',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>
                    Cleaner Corridor Available:
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#14532d', marginBottom: '8px' }}>
                    Est. PM2.5 is <strong>{rerouteComparison.bestCleanerAlternative.estimate.avgPm25} µg/m³</strong> ({rerouteComparison.pm25ReductionPercent}% cleaner).
                  </div>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleStayOnCurrentRoute}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(40, 122, 69, 0.3)',
                        borderRadius: '6px',
                        color: '#475e4e',
                        padding: '4px 8px',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                      }}
                    >
                      Stay
                    </button>
                    <button
                      type="button"
                      onClick={handleSwitchToCleanerRoute}
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Switch
                    </button>
                  </div>
                </div>
              )}

              {/* Arrival Banner */}
              {navStatus === 'arrived' && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '10px 12px',
                    background: 'linear-gradient(135deg, #166534 0%, #14532d 100%)',
                    border: '1px solid #86efac',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f0fdf4' }}>
                    🎉 Arrived at {selectedDest?.name}!
                  </div>
                  <button
                    type="button"
                    onClick={handleStopNavigation}
                    style={{
                      background: '#ffffff',
                      color: '#14532d',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    End
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Card C: Primary "Start Navigation" Button (When NOT Navigating) */}
          {!isNavigating && selectedRouteComparison && (
            <button
              type="button"
              onClick={handleStartNavigation}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '12px 18px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(34, 197, 94, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <Navigation size={17} />
              <span>Start Navigation on {selectedRouteComparison.route.name}</span>
            </button>
          )}

          {/* Card D: Route Alternatives Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0d1710', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Route Alternatives ({routeResults.length})
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Click to preview path
              </span>
            </div>

            {/* Calculating spinner */}
            {isCalculatingRoutes && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(40, 122, 69, 0.18)',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  color: '#166534',
                }}
              >
                <RefreshCw size={22} style={{ animation: 'spin 1.2s linear infinite', marginBottom: '8px' }} />
                <div style={{ color: '#0d1710', fontWeight: 600, fontSize: '0.86rem' }}>Calculating road corridors...</div>
              </div>
            )}

            {/* List of Route Cards */}
            {!isCalculatingRoutes &&
              routeResults.map((item) => {
                const { route, estimate, isLowestPollution, recommendationBadge } = item;
                const isSelected = route.id === (selectedRouteId || routeResults[0]?.route.id);

                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    style={{
                      background: isSelected
                        ? 'rgba(240, 253, 244, 0.95)'
                        : 'rgba(255, 255, 255, 0.95)',
                      border: isSelected
                        ? isLowestPollution
                          ? '2px solid #16a34a'
                          : '2px solid #0284c7'
                        : '1px solid rgba(40, 122, 69, 0.18)',
                      borderRadius: '16px',
                      padding: '1rem 1.15rem',
                      cursor: 'pointer',
                      boxShadow: isSelected
                        ? '0 4px 16px rgba(22, 101, 52, 0.12)'
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Top Row: Title, Badge, & Radio */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#0d1710' }}>
                            {route.name}
                          </h3>
                          {recommendationBadge && (
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '5px',
                                fontSize: '9px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: isLowestPollution
                                  ? 'rgba(34, 197, 94, 0.15)'
                                  : 'rgba(56, 189, 248, 0.15)',
                                color: isLowestPollution ? '#15803d' : '#0369a1',
                                border: isLowestPollution
                                  ? '1px solid rgba(34, 197, 94, 0.35)'
                                  : '1px solid rgba(56, 189, 248, 0.35)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              {isLowestPollution ? <Leaf size={9} /> : <Zap size={9} />}
                              {recommendationBadge}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#526b59', marginTop: '2px' }}>
                          {route.summary}
                        </div>
                      </div>

                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          border: isSelected
                            ? isLowestPollution
                              ? '4.5px solid #16a34a'
                              : '4.5px solid #0284c7'
                            : '2px solid rgba(40, 122, 69, 0.3)',
                          background: isSelected ? '#ffffff' : 'transparent',
                          flexShrink: 0,
                        }}
                      />
                    </div>

                    {/* Quick Stats: Travel Time, Distance, and PM2.5 */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid rgba(40, 122, 69, 0.15)',
                        marginTop: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#526b59', textTransform: 'uppercase' }}>Travel Time</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d1710' }}>
                          ~{route.durationMinutes} <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>mins</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#526b59', textTransform: 'uppercase' }}>Distance</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d1710' }}>
                          {route.distanceKm} <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>km</span>
                        </div>
                      </div>
                    </div>

                    {/* Estimated PM2.5 Pill */}
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: '10px',
                        background: 'rgba(240, 253, 244, 0.7)',
                        border: '1px solid rgba(40, 122, 69, 0.15)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Leaf size={12} color="#166534" />
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155' }}>
                            Est. PM2.5 Exposure:
                          </span>
                        </div>

                        {estimate.coverageStatus === 'VALID' && estimate.avgPm25 !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0d1710' }}>
                              {estimate.avgPm25}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#526b59' }}>µg/m³</span>
                            {estimate.categoryInfo && (
                              <span
                                style={{
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  background: `${estimate.categoryInfo.color}25`,
                                  color: estimate.categoryInfo.color,
                                }}
                              >
                                {estimate.categoryInfo.category}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#d97706', fontStyle: 'italic' }}>
                            Coverage Unavailable
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Trade-off Summary */}
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: isLowestPollution ? '#15803d' : '#475e4e',
                        marginTop: '8px',
                        lineHeight: 1.35,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '4px',
                      }}
                    >
                      <Info size={12} color="#166534" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{item.tradeOffSummary}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Full-Height Interactive Map Studio          */}
        {/* ========================================================= */}
        <div
          style={{
            position: 'sticky',
            top: '1rem',
            height: 'calc(100vh - 150px)',
            minHeight: '680px',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(40, 122, 69, 0.18)',
            borderRadius: '24px',
            padding: '1rem',
            boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxSizing: 'border-box',
          }}
        >
          {/* Map Top Bar: Selected Route Overview */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              paddingBottom: '4px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: '#526b59', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {isNavigating ? 'Live Navigation Map' : 'Roadway Corridor Map'}
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0d1710' }}>
                {selectedRouteComparison
                  ? `${selectedRouteComparison.route.name} (${selectedRouteComparison.route.summary})`
                  : 'Selected Road Corridor'}
              </div>
            </div>

            {selectedRouteComparison && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    padding: '4px 9px',
                    borderRadius: '8px',
                    background: 'rgba(40, 122, 69, 0.1)',
                    border: '1px solid rgba(40, 122, 69, 0.22)',
                    color: '#166534',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Clock size={12} color="#166534" />
                  <span>
                    {isNavigating && routeProgress
                      ? formatNavDuration(routeProgress.remainingDurationMinutes)
                      : `~${selectedRouteComparison.route.durationMinutes} mins`}
                  </span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <Navigation size={12} color="#166534" />
                  <span>
                    {isNavigating && routeProgress
                      ? formatNavDistance(routeProgress.remainingDistanceMeters)
                      : `${selectedRouteComparison.route.distanceKm} km`}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Leaflet Map: Stretches 100% to fill container without trailing gaps */}
          <div style={{ flex: 1, width: '100%', minHeight: '520px', borderRadius: '16px', overflow: 'hidden' }}>
            <RouteMap
              startLocation={selectedStart}
              destinationLocation={selectedDest}
              routes={routeResults}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              stations={stations}
              stationObservations={stationObservations}
              showStations={true}
              userLocation={userGpsPosition}
              isNavigating={isNavigating}
              navStatus={navStatus}
              upcomingCoordinates={routeProgress?.upcomingCoordinates}
              recenterTrigger={recenterTrigger}
              onRecenter={() => setRecenterTrigger((p) => p + 1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
