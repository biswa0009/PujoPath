import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Pandal,
  RouteStop,
  NightPlan,
  NightPlanConfig,
  NightPlanStop,
  TimeBudgetHours,
  PujoCategoryPreference,
  TravelPreference,
  WalkingTolerance,
  StartLocationType,
} from '../types';
import { METRO_STATIONS, METRO_STATIONS_BY_ID } from '../data/metroStations';
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from '../data/categoryMeta';
import {
  generateNightPlan,
  recalculateNightPlan,
} from '../services/nightPlannerService';
import {
  loadSavedNightPlan,
  saveNightPlan,
  clearSavedNightPlan,
} from '../services/storageService';
import {
  getGoogleMapsDirectionsUrl,
  getStoredRoutingConfig,
  setStoredRoutingConfig,
  RoutingProviderConfig,
} from '../services/routingService';
import {
  NightPlanIcon,
  RouteIcon,
  CompassIcon,
  MetroIcon,
  WalkIcon,
  ExternalLinkIcon,
  CloseIcon,
  SearchIcon,
  SparklesIcon,
  AlertTriangleIcon,
  ClockIcon,
  CrosshairIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  HeartIcon,
  BookmarkIcon,
  InfoIcon,
} from './Icons';

interface NightPlannerProps {
  allPandals: Pandal[];
  currentNightPlan: NightPlan | null;
  onUpdateNightPlan: (plan: NightPlan | null) => void;
  onSelectPandal: (pandal: Pandal) => void;
  onSelectStop?: (stop: NightPlanStop) => void;
  onViewOnMap?: () => void;
  isMobileSheet?: boolean;
}

const DEFAULT_CONFIG: NightPlanConfig = {
  startType: 'metro-station',
  startStationId: 'kalighat',
  timeAvailableHours: 3,
  categories: ['Traditional', 'Theme', 'Contemporary Landmark'],
  travelPreference: 'balanced',
  walkingTolerance: 'moderate',
  mustVisitPandalIds: [],
};

export function NightPlanner({
  allPandals,
  currentNightPlan,
  onUpdateNightPlan,
  onSelectPandal,
  onSelectStop,
  onViewOnMap,
  isMobileSheet = false,
}: NightPlannerProps) {
  // Configuration State
  const [config, setConfig] = useState<NightPlanConfig>(() => {
    if (currentNightPlan?.config) return currentNightPlan.config;
    return DEFAULT_CONFIG;
  });

  // UI Flow State
  const [isConfigExpanded, setIsConfigExpanded] = useState<boolean>(() => !currentNightPlan);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GPS Permission State
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'success' | 'denied'>('idle');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  // Search & Pickers
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [isMustVisitPickerOpen, setIsMustVisitPickerOpen] = useState(false);
  const [mustVisitSearch, setMustVisitSearch] = useState('');
  const [stationSearch, setStationSearch] = useState('');
  const [pandalStartSearch, setPandalStartSearch] = useState('');

  // Mobile Sheet Expanded vs Peek (Minimized Map View)
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(true);

  // Routing Provider & API Key Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [routingProvider, setRoutingProvider] = useState<RoutingProviderConfig['provider']>('osm');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeySavedStatus, setApiKeySavedStatus] = useState<string | null>(null);

  // Load configured routing engine on mount
  useEffect(() => {
    const cfg = getStoredRoutingConfig();
    setRoutingProvider(cfg.provider);
    setApiKeyInput(cfg.apiKey || '');
  }, []);

  // Active highlighted stop
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Automatically save night plan on change
  useEffect(() => {
    if (currentNightPlan) {
      saveNightPlan(currentNightPlan);
    }
  }, [currentNightPlan]);

  // Request GPS Location for start point
  const handleAcquireGps = useCallback((): Promise<{ lat: number; lng: number; label: string; bengaliLabel?: string }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setGpsStatus('denied');
        setGpsErrorMsg('Geolocation is not supported by your browser.');
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      setIsLocating(true);
      setGpsStatus('locating');
      setGpsErrorMsg(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const { latitude, longitude } = pos.coords;

          // Find nearest Metro station to user for human-readable label
          let nearestStation = METRO_STATIONS[0];
          let minDist = Infinity;
          METRO_STATIONS.forEach((st) => {
            const d = Math.hypot(st.lat - latitude, st.lng - longitude);
            if (d < minDist) {
              minDist = d;
              nearestStation = st;
            }
          });

          const label = `Near ${nearestStation.name} (GPS)`;
          const bengaliLabel = nearestStation.bengaliName ? `${nearestStation.bengaliName}-এর কাছে` : undefined;
          const coords = { lat: latitude, lng: longitude, label, bengaliLabel };

          setConfig((prev) => ({
            ...prev,
            startType: 'current-location',
            startCoords: coords,
          }));
          setGpsStatus('success');
          resolve(coords);
        },
        (err) => {
          setIsLocating(false);
          setGpsStatus('denied');
          const msg =
            err.code === 1
              ? 'Location permission denied. Please pick a Metro station or pandal instead.'
              : 'Unable to acquire GPS location. Please try again or select a station.';
          setGpsErrorMsg(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 9000 }
      );
    });
  }, []);

  // Generate Itinerary
  const handleGenerateRoute = async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      let activeConfig = config;

      // Validate and automatically acquire GPS if startType is current-location
      if (config.startType === 'current-location' && !config.startCoords) {
        try {
          const coords = await handleAcquireGps();
          activeConfig = {
            ...config,
            startCoords: coords,
          };
        } catch (gpsErr: any) {
          setIsGenerating(false);
          setErrorMessage(gpsErr.message || 'Location permission required for Current Location.');
          return;
        }
      }

      const plan = await generateNightPlan(activeConfig, allPandals);
      onUpdateNightPlan(plan);
      setIsConfigExpanded(false); // Collapse form to reveal itinerary
      if (isMobileSheet) {
        setIsMobileExpanded(true); // Keep expanded initially so user sees the plan
      }
    } catch (err: any) {
      console.error('Error generating night plan:', err);
      setErrorMessage(err.message || 'Could not generate route. Please try another starting point.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-plan / Tweak preferences
  const handleToggleConfig = () => {
    setIsConfigExpanded(!isConfigExpanded);
  };

  // Remove a stop
  const handleRemoveStop = async (stopId: string) => {
    if (!currentNightPlan) return;
    const updated = currentNightPlan.stops.filter((s) => s.id !== stopId);
    if (updated.length <= 1) {
      // Only start node remains
      onUpdateNightPlan({
        ...currentNightPlan,
        stops: updated,
        totalStops: 0,
        totalDurationMinutes: 0,
        totalVisitMinutes: 0,
        totalTravelMinutes: 0,
        totalWalkingDistanceMeters: 0,
        routeResult: null,
        status: 'modified',
      });
      return;
    }

    const recalculated = await recalculateNightPlan(currentNightPlan, updated);
    onUpdateNightPlan(recalculated);
  };

  // Move a stop up or down
  const handleMoveStop = async (index: number, direction: 'up' | 'down') => {
    if (!currentNightPlan) return;
    const pandalStops = currentNightPlan.stops.filter((s) => s.type === 'pandal');
    const pandalIdx = index - 1; // because stops[0] is start node

    if (direction === 'up' && pandalIdx <= 0) return;
    if (direction === 'down' && pandalIdx >= pandalStops.length - 1) return;

    const targetIdx = direction === 'up' ? pandalIdx - 1 : pandalIdx + 1;
    const newPandalStops = [...pandalStops];
    const [moved] = newPandalStops.splice(pandalIdx, 1);
    newPandalStops.splice(targetIdx, 0, moved);

    const updatedStops = [currentNightPlan.stops[0], ...newPandalStops];
    const recalculated = await recalculateNightPlan(currentNightPlan, updatedStops);
    onUpdateNightPlan(recalculated);
  };

  // Toggle Must-Visit flag on an existing stop
  const handleToggleMustVisitOnStop = async (stop: NightPlanStop) => {
    if (!currentNightPlan || !stop.pandalId) return;
    const isNowMustVisit = !stop.isMustVisit;

    const newMustVisits = isNowMustVisit
      ? [...config.mustVisitPandalIds, stop.pandalId]
      : config.mustVisitPandalIds.filter((id) => id !== stop.pandalId);

    const updatedConfig = { ...config, mustVisitPandalIds: newMustVisits };
    setConfig(updatedConfig);

    const updatedStops = currentNightPlan.stops.map((s) =>
      s.id === stop.id ? { ...s, isMustVisit: isNowMustVisit } : s
    );

    const recalculated = await recalculateNightPlan(
      { ...currentNightPlan, config: updatedConfig },
      updatedStops
    );
    onUpdateNightPlan(recalculated);
  };

  // Add a pandal to the existing itinerary
  const handleAddPandalToRoute = async (pandal: Pandal) => {
    if (!currentNightPlan) return;
    if (currentNightPlan.stops.some((s) => s.pandalId === pandal.id)) {
      alert(`${pandal.name} is already in your itinerary!`);
      return;
    }

    const newStop: NightPlanStop = {
      id: pandal.id,
      stopNumber: currentNightPlan.stops.length,
      type: 'pandal',
      pandalId: pandal.id,
      pandal,
      name: pandal.name,
      bengaliName: pandal.bengaliName,
      category: pandal.category,
      neighbourhood: pandal.neighbourhood,
      lat: pandal.lat!,
      lng: pandal.lng!,
      isMustVisit: config.mustVisitPandalIds.includes(pandal.id),
      matchReason: `Manually added to your night route · ${pandal.category}`,
      suggestedVisitMinutes: 30,
    };

    const updatedStops = [...currentNightPlan.stops, newStop];
    setIsAddPickerOpen(false);
    setAddSearchQuery('');

    const recalculated = await recalculateNightPlan(currentNightPlan, updatedStops);
    onUpdateNightPlan(recalculated);
    setSaveToast(`Added ${pandal.name} to your route!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Save / Copy confirmation toast
  const handleSaveRouteLocally = () => {
    if (currentNightPlan) {
      saveNightPlan(currentNightPlan);
      setSaveToast('Itinerary saved! It will reload automatically next time.');
      setTimeout(() => setSaveToast(null), 4000);
    }
  };

  // Clear current plan
  const handleClearRoute = () => {
    if (window.confirm('Clear your current Pujo Night Plan and start fresh?')) {
      clearSavedNightPlan();
      onUpdateNightPlan(null);
      setIsConfigExpanded(true);
    }
  };

  // Filter candidates for Add Pandal modal
  const filteredCandidatesToAdd = useMemo(() => {
    const q = addSearchQuery.toLowerCase().trim();
    return allPandals
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.bengaliName && p.bengaliName.includes(q)) ||
          p.neighbourhood.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      })
      .slice(0, 25);
  }, [allPandals, addSearchQuery]);

  // Filter candidates for Must-Visit picker
  const filteredMustVisitCandidates = useMemo(() => {
    const q = mustVisitSearch.toLowerCase().trim();
    return allPandals
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.bengaliName && p.bengaliName.includes(q)) ||
          p.neighbourhood.toLowerCase().includes(q)
        );
      })
      .slice(0, 30);
  }, [allPandals, mustVisitSearch]);

  // Format minutes into hours + mins
  const formatMinutes = (totalMin: number) => {
    const hrs = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs} hr`;
    return `${hrs} hr ${mins} min`;
  };

  // Google Maps external link
  const googleMapsUrl = useMemo(() => {
    if (!currentNightPlan || currentNightPlan.stops.length < 2) return '';
    const routeStops: RouteStop[] = currentNightPlan.stops.map((s) => ({
      id: s.id,
      type: s.type === 'start' ? 'station' : 'pandal',
      name: s.name,
      lat: s.lat,
      lng: s.lng,
    }));
    return getGoogleMapsDirectionsUrl(routeStops);
  }, [currentNightPlan]);

  return (
    <div
      className={`kpn-night-planner-container ${
        isMobileSheet
          ? `kpn-planner-mobile-sheet ${isMobileExpanded ? 'is-expanded' : 'is-peek'}`
          : 'kpn-planner-desktop'
      }`}
    >
      {/* 0. MOBILE DRAG HANDLE */}
      {isMobileSheet && (
        <div
          className="kpn-sheet-drag-handle"
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          role="button"
          tabIndex={0}
          aria-label={isMobileExpanded ? 'Minimize to view interactive map' : 'Expand itinerary planner'}
          id="planner-mobile-drag-handle"
        >
          <span className="kpn-drag-bar" />
        </div>
      )}

      {/* MOBILE PEEK SUMMARY BAR (Minimized Map View) */}
      {isMobileSheet && !isMobileExpanded && (
        <div
          className="kpn-planner-peek-summary"
          onClick={() => setIsMobileExpanded(true)}
          role="button"
          tabIndex={0}
          id="planner-mobile-peek-bar"
        >
          <div className="kpn-peek-title-group">
            <div className="kpn-night-badge-glow" style={{ width: 34, height: 34, fontSize: 16 }}>
              🌙
            </div>
            <div>
              <strong>Pujo Night Route</strong>
              <div className="kpn-peek-stats">
                {currentNightPlan
                  ? `${currentNightPlan.totalStops} Pandals · ${formatMinutes(currentNightPlan.totalDurationMinutes)} · ~${(currentNightPlan.totalWalkingDistanceMeters / 1000).toFixed(1)} km`
                  : 'Ready to configure route'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="kpn-planner-map-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileExpanded(true);
            }}
            id="planner-open-plan-btn"
          >
            <span>📝 Open Plan</span>
          </button>
        </div>
      )}

      {/* FULL PLANNER CONTENT (Shown when expanded or on desktop) */}
      {(!isMobileSheet || isMobileExpanded) && (
        <>
          {/* 1. TOP HEADER */}
          <div className="kpn-night-header">
            <div className="kpn-night-title-row">
              <div className="kpn-night-badge-glow">
                <NightPlanIcon size={22} className="kpn-night-icon" />
              </div>
              <div>
                <h2 className="kpn-night-title">Pujo Night Planner</h2>
                <p className="kpn-night-subtitle">Optimized pandal route with walking & Metro corridors.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isMobileSheet && (
                <button
                  type="button"
                  className="kpn-pill-toggle-btn"
                  onClick={() => {
                    setIsMobileExpanded(false);
                    onViewOnMap?.();
                  }}
                  id="planner-view-on-map-btn"
                  title="Minimize sheet to view map"
                >
                  <span>🗺️ Map</span>
                </button>
              )}

              <button
                type="button"
                className="kpn-pill-toggle-btn"
                onClick={() => setIsSettingsOpen(true)}
                id="planner-open-routing-engine-btn"
                title="Routing Engine & API Key Settings"
              >
                <span>⚙️ Engine</span>
              </button>

              {currentNightPlan && (
                <button
                  type="button"
                  className="kpn-pill-toggle-btn"
                  onClick={handleToggleConfig}
                  aria-expanded={isConfigExpanded}
                  id="toggle-plan-config-btn"
                >
                  <span>{isConfigExpanded ? 'Hide' : 'Tweak'}</span>
                  {isConfigExpanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                </button>
              )}
            </div>
          </div>

          {saveToast && (
            <div className="kpn-planner-toast" role="status">
              <span>✓ {saveToast}</span>
            </div>
          )}

      {/* 2. CONFIGURATION SETUP FLOW (Progressive Disclosure) */}
      {isConfigExpanded && (
        <section className="kpn-planner-config-card" aria-label="Planner Setup Flow">
          {/* STEP 1: Starting Point */}
          <div className="kpn-config-group">
            <label className="kpn-config-label">
              <CompassIcon size={15} />
              <span>1. Choose Starting Point</span>
            </label>

            <div className="kpn-segmented-control" role="tablist">
              <button
                type="button"
                className={`kpn-segment-btn ${
                  config.startType === 'metro-station' ? 'is-active' : ''
                }`}
                onClick={() => setConfig((p) => ({ ...p, startType: 'metro-station' }))}
                id="start-type-metro-btn"
              >
                <MetroIcon size={14} />
                <span>Metro Station</span>
              </button>

              <button
                type="button"
                className={`kpn-segment-btn ${
                  config.startType === 'current-location' ? 'is-active' : ''
                }`}
                onClick={() => {
                  setConfig((p) => ({ ...p, startType: 'current-location' }));
                  if (!config.startCoords) handleAcquireGps();
                }}
                id="start-type-gps-btn"
              >
                <CrosshairIcon size={14} />
                <span>Current Location</span>
              </button>

              <button
                type="button"
                className={`kpn-segment-btn ${config.startType === 'pandal' ? 'is-active' : ''}`}
                onClick={() => setConfig((p) => ({ ...p, startType: 'pandal' }))}
                id="start-type-pandal-btn"
              >
                <span>🪔</span>
                <span>Select Pandal</span>
              </button>
            </div>

            {/* Sub-selectors for starting point */}
            {config.startType === 'metro-station' && (
              <div className="kpn-start-picker-box">
                <select
                  value={config.startStationId || 'kalighat'}
                  onChange={(e) => setConfig((p) => ({ ...p, startStationId: e.target.value }))}
                  className="kpn-native-select"
                  aria-label="Select Starting Metro Station"
                  id="select-start-metro-dropdown"
                >
                  <optgroup label="Blue Line (North-South)">
                    {METRO_STATIONS.filter((s) => s.lineCode === 'blue').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.zone}) {s.interchange ? '⇄ Interchange' : ''}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Green Line (Howrah - Salt Lake)">
                    {METRO_STATIONS.filter((s) => s.lineCode === 'green').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.zone})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Purple Line (Joka - Majerhat)">
                    {METRO_STATIONS.filter((s) => s.lineCode === 'purple').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (South-West)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Orange Line (Kavi Subhash - Hemanta Mukherjee)">
                    {METRO_STATIONS.filter((s) => s.lineCode === 'orange').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (East)
                      </option>
                    ))}
                  </optgroup>
                </select>
                <small className="kpn-hint-text">
                  Kolkata Metro stations provide congestion-free, walkable access gates to puja clusters.
                </small>
              </div>
            )}

            {config.startType === 'current-location' && (
              <div className="kpn-gps-box">
                {isLocating && (
                  <div className="kpn-gps-status-loading">
                    <span className="kpn-spinner-small" />
                    <span>Acquiring your real-time coordinates...</span>
                  </div>
                )}

                {gpsStatus === 'success' && config.startCoords && (
                  <div className="kpn-gps-status-success">
                    <CheckCircleIcon size={16} />
                    <div>
                      <strong>GPS Acquired:</strong> {config.startCoords.label}
                      <small className="kpn-block-sub">
                        Coordinates: {config.startCoords.lat.toFixed(4)}, {config.startCoords.lng.toFixed(4)}
                      </small>
                    </div>
                  </div>
                )}

                {gpsStatus === 'denied' && (
                  <div className="kpn-gps-status-denied">
                    <AlertTriangleIcon size={16} />
                    <div>
                      <strong>Location Permission Unavailable</strong>
                      <p>{gpsErrorMsg || 'Please allow location permission or pick a Metro station.'}</p>
                      <button
                        type="button"
                        className="kpn-btn-retry"
                        onClick={handleAcquireGps}
                        id="retry-gps-btn"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {config.startType === 'pandal' && (
              <div className="kpn-start-picker-box">
                <select
                  value={config.startPandalId || allPandals[0]?.id}
                  onChange={(e) => setConfig((p) => ({ ...p, startPandalId: e.target.value }))}
                  className="kpn-native-select"
                  aria-label="Select Starting Pandal"
                  id="select-start-pandal-dropdown"
                >
                  {allPandals
                    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.neighbourhood} · {p.category})
                      </option>
                    ))}
                </select>
                <small className="kpn-hint-text">
                  Route starts right from this pandal's entrance gate.
                </small>
              </div>
            )}
          </div>

          {/* STEP 2: Time Available */}
          <div className="kpn-config-group">
            <label className="kpn-config-label">
              <ClockIcon size={15} />
              <span>2. Time Available for Pandal Hopping</span>
            </label>

            <div className="kpn-chips-row">
              {([2, 3, 4, 6] as TimeBudgetHours[]).map((hours) => (
                <button
                  key={hours}
                  type="button"
                  className={`kpn-chip-btn ${
                    config.timeAvailableHours === hours ? 'is-selected' : ''
                  }`}
                  onClick={() => setConfig((p) => ({ ...p, timeAvailableHours: hours }))}
                  id={`time-chip-${hours}h`}
                >
                  <span className="kpn-chip-val">{hours}</span>
                  <span className="kpn-chip-unit">hours</span>
                </button>
              ))}
            </div>
            <small className="kpn-hint-text">
              Includes estimated viewing time at each pandal + transit corridors.
            </small>
          </div>

          {/* STEP 3: Puja Preferences */}
          <div className="kpn-config-group">
            <label className="kpn-config-label">
              <span>🪔</span>
              <span>3. Puja Preferences (Multiple Allowed)</span>
            </label>

            <div className="kpn-pill-grid">
              {(
                [
                  {
                    id: 'Traditional' as PujoCategoryPreference,
                    label: 'Traditional Sabeki',
                    icon: '🪔',
                    desc: 'Ekchala & Daker Saaj',
                  },
                  {
                    id: 'Theme' as PujoCategoryPreference,
                    label: 'Artistic & Theme',
                    icon: '🎨',
                    desc: 'Handicraft & concepts',
                  },
                  {
                    id: 'Heritage Rajbari' as PujoCategoryPreference,
                    label: 'Heritage Bonedi Bari',
                    icon: '🏛',
                    desc: 'Aristocratic courtyards',
                  },
                  {
                    id: 'Contemporary Landmark' as PujoCategoryPreference,
                    label: 'Famous & Landmarks',
                    icon: '⭐',
                    desc: 'Grand mega carnivals',
                  },
                ]
              ).map((cat) => {
                const isSelected = config.categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`kpn-category-pref-btn ${isSelected ? 'is-active' : ''}`}
                    onClick={() => {
                      setConfig((prev) => {
                        const exists = prev.categories.includes(cat.id);
                        const next = exists
                          ? prev.categories.filter((c) => c !== cat.id)
                          : [...prev.categories, cat.id];
                        // Keep at least one category selected
                        return { ...prev, categories: next.length > 0 ? next : [cat.id] };
                      });
                    }}
                    id={`cat-pref-${cat.id.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <span className="kpn-pref-icon">{cat.icon}</span>
                    <div className="kpn-pref-text">
                      <strong>{cat.label}</strong>
                      <small>{cat.desc}</small>
                    </div>
                    {isSelected && <span className="kpn-check-indicator">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 4: Travel & Walking Preferences */}
          <div className="kpn-config-row-two-col">
            {/* Travel Preference */}
            <div className="kpn-config-group">
              <label className="kpn-config-label">
                <WalkIcon size={15} />
                <span>Travel Mode</span>
              </label>
              <div className="kpn-mini-select-wrap">
                <select
                  value={config.travelPreference}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, travelPreference: e.target.value as TravelPreference }))
                  }
                  className="kpn-native-select"
                  id="select-travel-mode"
                >
                  <option value="walking-first">Walking-first (Local alleys)</option>
                  <option value="balanced">Balanced walking & Metro</option>
                  <option value="metro-assisted">Metro-assisted (Long stretches)</option>
                </select>
              </div>
            </div>

            {/* Walking Tolerance */}
            <div className="kpn-config-group">
              <label className="kpn-config-label">
                <RouteIcon size={15} />
                <span>Walking Tolerance</span>
              </label>
              <div className="kpn-mini-select-wrap">
                <select
                  value={config.walkingTolerance}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      walkingTolerance: e.target.value as WalkingTolerance,
                    }))
                  }
                  className="kpn-native-select"
                  id="select-walking-tolerance"
                >
                  <option value="low">Low (&lt; 600 m legs)</option>
                  <option value="moderate">Moderate (&lt; 1.2 km legs)</option>
                  <option value="high">High (&lt; 2.5 km legs)</option>
                </select>
              </div>
            </div>
          </div>

          {/* STEP 5: Must-Visit Pandals (Optional) */}
          <div className="kpn-config-group">
            <div className="kpn-label-with-action">
              <label className="kpn-config-label">
                <SparklesIcon size={15} />
                <span>Must-Visit Pandals ({config.mustVisitPandalIds.length})</span>
              </label>
              <button
                type="button"
                className="kpn-text-link-btn"
                onClick={() => setIsMustVisitPickerOpen(!isMustVisitPickerOpen)}
                id="toggle-must-visit-picker-btn"
              >
                {isMustVisitPickerOpen ? 'Done' : '+ Pick Must-Visits'}
              </button>
            </div>

            {/* Chips of currently chosen must-visits */}
            {config.mustVisitPandalIds.length > 0 && (
              <div className="kpn-must-visit-tags">
                {config.mustVisitPandalIds.map((id) => {
                  const p = allPandals.find((item) => item.id === id);
                  if (!p) return null;
                  return (
                    <span key={id} className="kpn-must-visit-tag">
                      <span>★ {p.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            mustVisitPandalIds: prev.mustVisitPandalIds.filter((mId) => mId !== id),
                          }))
                        }
                        title="Remove must-visit"
                        aria-label={`Remove ${p.name}`}
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Expandable Must-Visit Picker */}
            {isMustVisitPickerOpen && (
              <div className="kpn-must-visit-drawer">
                <div className="kpn-drawer-search">
                  <SearchIcon size={14} />
                  <input
                    type="text"
                    placeholder="Search famous pandals to mark must-visit..."
                    value={mustVisitSearch}
                    onChange={(e) => setMustVisitSearch(e.target.value)}
                    id="must-visit-search-input"
                  />
                  {mustVisitSearch && (
                    <button type="button" onClick={() => setMustVisitSearch('')}>
                      ✕
                    </button>
                  )}
                </div>
                <div className="kpn-drawer-list">
                  {filteredMustVisitCandidates.map((pandal) => {
                    const isChecked = config.mustVisitPandalIds.includes(pandal.id);
                    return (
                      <label key={pandal.id} className="kpn-drawer-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setConfig((prev) => ({
                              ...prev,
                              mustVisitPandalIds: checked
                                ? [...prev.mustVisitPandalIds, pandal.id]
                                : prev.mustVisitPandalIds.filter((id) => id !== pandal.id),
                            }));
                          }}
                        />
                        <div className="kpn-drawer-item-info">
                          <strong>{pandal.name}</strong>
                          <small>
                            {pandal.neighbourhood} · {pandal.category} {pandal.highlighted ? '· ⭐ Famous' : ''}
                          </small>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* GENERATE PRIMARY ACTION */}
          <div className="kpn-planner-action-bar">
            {errorMessage && (
              <div className="kpn-planner-error-banner" role="alert">
                <AlertTriangleIcon size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              className={`kpn-btn-primary-generate ${isGenerating ? 'is-loading' : ''}`}
              onClick={handleGenerateRoute}
              disabled={isGenerating}
              id="generate-pujo-route-btn"
            >
              {isGenerating ? (
                <>
                  <span className="kpn-spinner-white" />
                  <span>Optimizing Your Hopping Route...</span>
                </>
              ) : (
                <>
                  <SparklesIcon size={18} />
                  <span>Generate My Pujo Route</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* 3. GENERATED ITINERARY VIEW */}
      {currentNightPlan && currentNightPlan.stops.length > 0 && (
        <section className="kpn-itinerary-section" aria-label="Generated Route Itinerary">
          {/* A. ROUTE SUMMARY CARD */}
          <div className="kpn-route-summary-card">
            <div className="kpn-summary-main-metrics">
              <div className="kpn-metric-badge">
                <span className="kpn-metric-number">{currentNightPlan.totalStops}</span>
                <span className="kpn-metric-label">Pandals</span>
              </div>

              <div className="kpn-metric-badge highlight">
                <span className="kpn-metric-number">
                  {formatMinutes(currentNightPlan.totalDurationMinutes)}
                </span>
                <span className="kpn-metric-label">Est. Total Time</span>
              </div>

              <div className="kpn-metric-badge">
                <span className="kpn-metric-number">
                  {(currentNightPlan.totalWalkingDistanceMeters / 1000).toFixed(1)} km
                </span>
                <span className="kpn-metric-label">Est. Walk</span>
              </div>
            </div>

            <div className="kpn-summary-breakdown-row">
              <span className="kpn-breakdown-item">
                <ClockIcon size={13} />
                <span>Viewing Pandals: ~{formatMinutes(currentNightPlan.totalVisitMinutes)}</span>
              </span>
              <span className="kpn-breakdown-item">
                <WalkIcon size={13} />
                <span>Travel Time: ~{formatMinutes(currentNightPlan.totalTravelMinutes)}</span>
              </span>
            </div>

            <div className="kpn-summary-endpoints">
              <span className="kpn-endpoint-label">
                <strong>Origin:</strong> {currentNightPlan.startPoint.label}
              </span>
              <span className="kpn-endpoint-sep">➔</span>
              <span className="kpn-endpoint-label">
                <strong>Finish:</strong>{' '}
                {currentNightPlan.stops[currentNightPlan.stops.length - 1]?.name}
              </span>
            </div>

            <div className="kpn-verified-pill-row">
              <span className="kpn-verified-disclaimer-pill">
                ⏱ Planning Estimates · Verified OpenStreetMap GPS
              </span>
              {currentNightPlan.routeResult?.source === 'fallback' && (
                <span className="kpn-fallback-pill">
                  ℹ Approximate pedestrian link (OSRM street grid fallback)
                </span>
              )}
            </div>

            {/* Quick action bar */}
            <div className="kpn-summary-quick-actions">
              {onViewOnMap && (
                <button
                  type="button"
                  className="kpn-action-chip primary"
                  onClick={onViewOnMap}
                  id="view-itinerary-map-btn"
                >
                  <CompassIcon size={14} />
                  <span>View Route on Map</span>
                </button>
              )}

              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kpn-action-chip"
                  id="open-google-maps-btn"
                  title="Open pedestrian route in Google Maps navigation"
                >
                  <ExternalLinkIcon size={14} />
                  <span>Open Navigation</span>
                </a>
              )}

              <button
                type="button"
                className="kpn-action-chip"
                onClick={handleSaveRouteLocally}
                title="Save itinerary to local storage"
                id="save-route-local-btn"
              >
                <BookmarkIcon size={14} />
                <span>Save</span>
              </button>

              <button
                type="button"
                className="kpn-action-chip danger"
                onClick={handleClearRoute}
                title="Clear itinerary and start over"
                id="clear-itinerary-btn"
              >
                <TrashIcon size={14} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* B. SKIPPED MUST-VISIT WARNING BANNER */}
          {currentNightPlan.skippedMustVisits &&
            currentNightPlan.skippedMustVisits.length > 0 && (
              <div className="kpn-skipped-alert-box" role="alert">
                <div className="kpn-skipped-alert-header">
                  <AlertTriangleIcon size={16} />
                  <strong>
                    {currentNightPlan.skippedMustVisits.length} Must-Visit Pandal
                    {currentNightPlan.skippedMustVisits.length > 1 ? 's' : ''} Could Not Fit
                  </strong>
                </div>
                <ul className="kpn-skipped-list">
                  {currentNightPlan.skippedMustVisits.map((item) => (
                    <li key={item.pandalId} className="kpn-skipped-item">
                      <strong>{item.name}:</strong> {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* C. INTERACTIVE TIMELINE STOPS LIST */}
          <div className="kpn-timeline-wrap">
            {currentNightPlan.stops.map((stop, idx) => {
              const isStartNode = stop.type === 'start';
              const isSelected = selectedStopId === stop.id;
              const catMeta = stop.category
                ? CATEGORY_STYLES[stop.category] || DEFAULT_CATEGORY_STYLE
                : DEFAULT_CATEGORY_STYLE;

              return (
                <div
                  key={stop.id}
                  className={`kpn-timeline-stop-block ${isSelected ? 'is-active-stop' : ''}`}
                >
                  {/* Stop Card */}
                  <div
                    className={`kpn-stop-card ${isStartNode ? 'is-start-node' : ''}`}
                    onClick={() => {
                      setSelectedStopId(stop.id);
                      if (onSelectStop) onSelectStop(stop);
                      if (stop.pandal) onSelectPandal(stop.pandal);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Stop ${stop.stopNumber}: ${stop.name}`}
                  >
                    {/* Badge */}
                    <div
                      className={`kpn-stop-badge ${isStartNode ? 'start' : ''}`}
                      style={{
                        backgroundColor: isStartNode ? '#00875A' : catMeta.color,
                      }}
                    >
                      {isStartNode ? 'Start' : stop.stopNumber}
                    </div>

                    {/* Content */}
                    <div className="kpn-stop-main-content">
                      <div className="kpn-stop-title-row">
                        <h4 className="kpn-stop-name">{stop.name}</h4>
                        {stop.isMustVisit && (
                          <span className="kpn-must-visit-indicator" title="Must-Visit Pandal">
                            ★ Must-Visit
                          </span>
                        )}
                      </div>

                      {stop.bengaliName && (
                        <span className="kpn-stop-bengali-name">{stop.bengaliName}</span>
                      )}

                      {!isStartNode && stop.category && (
                        <div className="kpn-stop-meta-tags">
                          <span
                            className="kpn-category-tag"
                            style={{
                              backgroundColor: catMeta.bgSoft,
                              color: catMeta.color,
                              borderColor: catMeta.border,
                            }}
                          >
                            {catMeta.icon} {stop.category}
                          </span>
                          {stop.neighbourhood && (
                            <span className="kpn-neighbourhood-tag">{stop.neighbourhood}</span>
                          )}
                        </div>
                      )}

                      {/* Why it matches */}
                      <p className="kpn-stop-match-reason">
                        <SparklesIcon size={12} />
                        <span>{stop.matchReason}</span>
                      </p>

                      {/* Duration planning estimate */}
                      {!isStartNode && (
                        <div className="kpn-visit-est-badge">
                          <ClockIcon size={12} />
                          <span>Est. {stop.suggestedVisitMinutes} min visit (planning estimate)</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    {!isStartNode && (
                      <div
                        className="kpn-stop-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* View Pandal Details */}
                        {stop.pandal && (
                          <button
                            type="button"
                            className="kpn-stop-action-btn view"
                            onClick={() => onSelectPandal(stop.pandal!)}
                            title="View pandal details & photos"
                            aria-label={`View details of ${stop.name}`}
                          >
                            <InfoIcon size={14} />
                            <span>Details</span>
                          </button>
                        )}

                        {/* Reorder Up */}
                        <button
                          type="button"
                          className="kpn-stop-action-btn move"
                          onClick={() => handleMoveStop(idx, 'up')}
                          disabled={idx <= 1}
                          title="Move earlier in route"
                          aria-label="Move up"
                        >
                          <ChevronUpIcon size={14} />
                        </button>

                        {/* Reorder Down */}
                        <button
                          type="button"
                          className="kpn-stop-action-btn move"
                          onClick={() => handleMoveStop(idx, 'down')}
                          disabled={idx >= currentNightPlan.stops.length - 1}
                          title="Move later in route"
                          aria-label="Move down"
                        >
                          <ChevronDownIcon size={14} />
                        </button>

                        {/* Toggle Must-Visit */}
                        <button
                          type="button"
                          className={`kpn-stop-action-btn star ${
                            stop.isMustVisit ? 'is-starred' : ''
                          }`}
                          onClick={() => handleToggleMustVisitOnStop(stop)}
                          title={stop.isMustVisit ? 'Unmark must-visit' : 'Mark as must-visit'}
                          aria-label="Toggle must visit"
                        >
                          ★
                        </button>

                        {/* Remove Stop */}
                        <button
                          type="button"
                          className="kpn-stop-action-btn remove"
                          onClick={() => handleRemoveStop(stop.id)}
                          title="Remove from itinerary"
                          aria-label={`Remove ${stop.name}`}
                        >
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Leg to Next Stop Connector */}
                  {stop.legToNext && (
                    <div className="kpn-leg-connector">
                      <div className="kpn-leg-line" />
                      <div className="kpn-leg-chip">
                        {stop.legToNext.mode === 'metro' ? (
                          <>
                            <MetroIcon size={14} />
                            <span>{stop.legToNext.description}</span>
                          </>
                        ) : (
                          <>
                            <WalkIcon size={14} />
                            <span>
                              ~{stop.legToNext.timeMinutes} min walk (
                              {Math.round(stop.legToNext.distanceMeters)} m)
                            </span>
                          </>
                        )}
                      </div>
                      {stop.legToNext.metroAdvice && (
                        <div className="kpn-metro-advice-banner">
                          <span>🚇 {stop.legToNext.metroAdvice}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* D. ADD PANDAL BUTTON & SEARCH MODAL */}
          <div className="kpn-itinerary-footer-actions">
            <button
              type="button"
              className="kpn-btn-add-pandal-route"
              onClick={() => setIsAddPickerOpen(true)}
              id="add-pandal-to-route-btn"
            >
              <PlusIcon size={16} />
              <span>Add Another Pandal to Route</span>
            </button>
          </div>

          {/* Add Pandal Modal */}
          {isAddPickerOpen && (
            <div className="kpn-modal-backdrop" onClick={() => setIsAddPickerOpen(false)}>
              <div
                className="kpn-add-pandal-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-pandal-modal-title"
              >
                <div className="kpn-modal-header">
                  <h3 id="add-pandal-modal-title">Add Pandal to Your Night Plan</h3>
                  <button
                    type="button"
                    onClick={() => setIsAddPickerOpen(false)}
                    className="kpn-modal-close"
                  >
                    <CloseIcon size={16} />
                  </button>
                </div>

                <div className="kpn-modal-search-bar">
                  <SearchIcon size={15} />
                  <input
                    type="text"
                    placeholder="Search by pandal name, area, or category..."
                    value={addSearchQuery}
                    onChange={(e) => setAddSearchQuery(e.target.value)}
                    autoFocus
                    id="add-pandal-modal-search"
                  />
                  {addSearchQuery && (
                    <button type="button" onClick={() => setAddSearchQuery('')}>
                      ✕
                    </button>
                  )}
                </div>

                <div className="kpn-modal-results-list">
                  {filteredCandidatesToAdd.length === 0 ? (
                    <div className="kpn-empty-search-state">
                      <p>No matching pandals found.</p>
                    </div>
                  ) : (
                    filteredCandidatesToAdd.map((pandal) => {
                      const alreadyInRoute = currentNightPlan.stops.some(
                        (s) => s.pandalId === pandal.id
                      );
                      const cat = CATEGORY_STYLES[pandal.category] || DEFAULT_CATEGORY_STYLE;
                      return (
                        <div key={pandal.id} className="kpn-modal-item-row">
                          <div className="kpn-modal-item-info">
                            <strong>{pandal.name}</strong>
                            {pandal.bengaliName && <small>{pandal.bengaliName}</small>}
                            <span className="kpn-modal-tags">
                              <span style={{ color: cat.color }}>
                                {cat.icon} {pandal.category}
                              </span>
                              <span>· {pandal.neighbourhood}</span>
                              {pandal.highlighted && <span>· ⭐ Famous</span>}
                            </span>
                          </div>

                          <button
                            type="button"
                            className={`kpn-btn-insert-stop ${
                              alreadyInRoute ? 'is-added' : ''
                            }`}
                            onClick={() => handleAddPandalToRoute(pandal)}
                            disabled={alreadyInRoute}
                          >
                            {alreadyInRoute ? 'Added' : '+ Add'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Empty State when no itinerary is generated yet */}
      {!currentNightPlan && !isGenerating && (
        <div className="kpn-planner-empty-state">
          <div className="kpn-empty-state-art">🪔 🌙 ⭐</div>
          <h3>Craft Your Customized Durga Puja Hopping Night</h3>
          <p>
            Choose your starting point, time available, and artistic preferences above. We’ll generate
            an optimized walking & Metro route that minimizes backtracking!
          </p>
        </div>
      )}
        </>
      )}

      {/* 4. ROUTING PROVIDER & API KEY MODAL */}
      {isSettingsOpen && (
        <div className="kpn-filter-drawer-overlay" role="dialog" aria-modal="true" onClick={() => setIsSettingsOpen(false)}>
          <div className="kpn-settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="kpn-drawer-head">
              <div className="kpn-drawer-title-wrap">
                <h3>Routing Engine & API Key</h3>
                <span className="kpn-drawer-sub">Live pedestrian pathing for Kolkata Durga Puja hopping</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="kpn-drawer-close"
                aria-label="Close dialog"
                id="close-routing-settings-btn"
              >
                ✕
              </button>
            </div>

            <div className="kpn-drawer-body">
              <label className="kpn-filter-label">Select Active Routing Provider:</label>

              <div className="kpn-provider-options">
                <label className={`kpn-provider-radio-card ${routingProvider === 'osm' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="routingProvider"
                    checked={routingProvider === 'osm'}
                    onChange={() => setRoutingProvider('osm')}
                  />
                  <div>
                    <strong>Fast OpenStreetMap & OSRM Mirrors (Recommended)</strong>
                    <small>No API key required. Snaps walking paths along Kolkata streets via high-speed European OSM mirrors with 100% offline fallback.</small>
                  </div>
                </label>

                <label className={`kpn-provider-radio-card ${routingProvider === 'ors' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="routingProvider"
                    checked={routingProvider === 'ors'}
                    onChange={() => setRoutingProvider('ors')}
                  />
                  <div>
                    <strong>OpenRouteService (ORS)</strong>
                    <small>Free key available at openrouteservice.org. 2,000 requests/day with precise footways and walking directions.</small>
                  </div>
                </label>

                <label className={`kpn-provider-radio-card ${routingProvider === 'geoapify' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="routingProvider"
                    checked={routingProvider === 'geoapify'}
                    onChange={() => setRoutingProvider('geoapify')}
                  />
                  <div>
                    <strong>Geoapify Routing API</strong>
                    <small>Free key at geoapify.com. 3,000 credits/day with excellent urban pedestrian routing geometries.</small>
                  </div>
                </label>

                <label className={`kpn-provider-radio-card ${routingProvider === 'mapbox' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="routingProvider"
                    checked={routingProvider === 'mapbox'}
                    onChange={() => setRoutingProvider('mapbox')}
                  />
                  <div>
                    <strong>Mapbox Directions API</strong>
                    <small>Free access token at mapbox.com (100,000 free requests/month) for worldwide high-fidelity pedestrian routing.</small>
                  </div>
                </label>
              </div>

              {routingProvider !== 'osm' && (
                <div className="kpn-api-key-input-wrap">
                  <label className="kpn-filter-label">Enter your {routingProvider.toUpperCase()} Key / Token:</label>
                  <input
                    type="text"
                    className="kpn-native-select"
                    style={{ background: '#FFFFFF', padding: '8px 10px' }}
                    placeholder={`Paste your ${routingProvider.toUpperCase()} API key here...`}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    id="routing-api-key-input"
                  />
                  <small className="kpn-hint-text">
                    Saved directly into browser localStorage.
                  </small>
                </div>
              )}

              {apiKeySavedStatus && (
                <div className="kpn-settings-saved-badge">✓ {apiKeySavedStatus}</div>
              )}

              <div className="kpn-settings-actions">
                <button
                  type="button"
                  className="kpn-btn-primary-action"
                  onClick={() => {
                    setStoredRoutingConfig(routingProvider, apiKeyInput.trim() || null);
                    setApiKeySavedStatus('Settings saved successfully!');
                    setTimeout(() => {
                      setApiKeySavedStatus(null);
                      setIsSettingsOpen(false);
                    }, 1000);
                  }}
                  id="save-routing-settings-btn"
                >
                  Save & Apply Engine
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
