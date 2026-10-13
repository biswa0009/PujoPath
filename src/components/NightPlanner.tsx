import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  EndLocationType,
  DiscoveryPreference,
} from '../types';
import { METRO_STATIONS, METRO_STATIONS_BY_ID } from '../data/metroStations';
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from '../data/categoryMeta';
import {
  generateNightPlan,
  recalculateNightPlan,
} from '../services/nightPlannerService';
import {
  saveNightPlan,
  clearSavedNightPlan,
} from '../services/storageService';
import {
  getGoogleMapsDirectionsUrl,
  getStoredRoutingConfig,
  setStoredRoutingConfig,
  RoutingProviderConfig,
} from '../services/routingService';
import { BottomSheet, SheetSnapState } from './BottomSheet';
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
  sheetState?: SheetSnapState;
  onSheetStateChange?: (state: SheetSnapState) => void;
}

const DEFAULT_CONFIG: NightPlanConfig = {
  startType: 'metro-station',
  startStationId: 'kalighat',
  endType: 'same-as-start',
  timeAvailableHours: 3,
  categories: ['Traditional', 'Theme', 'Contemporary Landmark'],
  includeFeatured: true,
  travelPreference: 'balanced',
  walkingTolerance: 'moderate',
  discoveryPreference: 'famous-first',
  mustVisitPandalIds: [],
  excludedPandalIds: [],
  startTime: '19:30',
};

const METRO_LINE_COLORS: Record<string, string> = {
  blue: '#0062B1',
  green: '#00875A',
  purple: '#7B2CBF',
  orange: '#E8590C',
};

export function NightPlanner({
  allPandals,
  currentNightPlan,
  onUpdateNightPlan,
  onSelectPandal,
  onSelectStop,
  onViewOnMap,
  isMobileSheet = false,
  sheetState = 'half',
  onSheetStateChange,
}: NightPlannerProps) {
  // Configuration State
  const [config, setConfig] = useState<NightPlanConfig>(() => {
    if (currentNightPlan?.config) return currentNightPlan.config;
    return DEFAULT_CONFIG;
  });

  // Track if config has been modified compared to currentNightPlan
  const isConfigModified = useMemo(() => {
    if (!currentNightPlan?.config) return false;
    const cur = currentNightPlan.config;
    return (
      cur.startType !== config.startType ||
      cur.startStationId !== config.startStationId ||
      cur.startPandalId !== config.startPandalId ||
      cur.endType !== config.endType ||
      cur.endStationId !== config.endStationId ||
      cur.endPandalId !== config.endPandalId ||
      cur.timeAvailableHours !== config.timeAvailableHours ||
      cur.travelPreference !== config.travelPreference ||
      cur.walkingTolerance !== config.walkingTolerance ||
      cur.discoveryPreference !== config.discoveryPreference ||
      cur.preferredDwellMinutes !== config.preferredDwellMinutes ||
      cur.maxStops !== config.maxStops ||
      cur.startTime !== config.startTime ||
      JSON.stringify(cur.categories) !== JSON.stringify(config.categories) ||
      JSON.stringify(cur.mustVisitPandalIds) !== JSON.stringify(config.mustVisitPandalIds) ||
      JSON.stringify(cur.excludedPandalIds || []) !== JSON.stringify(config.excludedPandalIds || [])
    );
  }, [config, currentNightPlan]);

  // UI Flow State
  const [isConfigExpanded, setIsConfigExpanded] = useState<boolean>(() => !currentNightPlan);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GPS Permission State
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'success' | 'denied'>('idle');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  // Station Search Query for Starting Station
  const [startStationSearch, setStartStationSearch] = useState('');
  const [isStartStationDropdownOpen, setIsStartStationDropdownOpen] = useState(false);

  // Station Search Query for Ending Station
  const [endStationSearch, setEndStationSearch] = useState('');
  const [isEndStationDropdownOpen, setIsEndStationDropdownOpen] = useState(false);

  // Search & Pickers
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [isMustVisitPickerOpen, setIsMustVisitPickerOpen] = useState(false);
  const [mustVisitSearch, setMustVisitSearch] = useState('');
  const [isExcludePickerOpen, setIsExcludePickerOpen] = useState(false);
  const [excludeSearch, setExcludeSearch] = useState('');

  // Routing Provider & API Key Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [routingProvider, setRoutingProvider] = useState<RoutingProviderConfig['provider']>('osm');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeySavedStatus, setApiKeySavedStatus] = useState<string | null>(null);

  // Active highlighted stop
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Load configured routing engine on mount
  useEffect(() => {
    const cfg = getStoredRoutingConfig();
    setRoutingProvider(cfg.provider);
    setApiKeyInput(cfg.apiKey || '');
  }, []);

  // Automatically save night plan on change
  useEffect(() => {
    if (currentNightPlan) {
      saveNightPlan(currentNightPlan);
    }
  }, [currentNightPlan]);

  // Filtered Metro Stations for Start Station
  const filteredStartStations = useMemo(() => {
    const q = startStationSearch.toLowerCase().trim();
    if (!q) return METRO_STATIONS;
    return METRO_STATIONS.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q);
      const bnMatch = s.bengaliName ? s.bengaliName.includes(q) : false;
      const zoneMatch = s.zone ? s.zone.toLowerCase().includes(q) : false;
      const lineMatch = s.line ? s.line.toLowerCase().includes(q) : false;
      return nameMatch || bnMatch || zoneMatch || lineMatch;
    });
  }, [startStationSearch]);

  // Filtered Metro Stations for End Station
  const filteredEndStations = useMemo(() => {
    const q = endStationSearch.toLowerCase().trim();
    if (!q) return METRO_STATIONS;
    return METRO_STATIONS.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q);
      const bnMatch = s.bengaliName ? s.bengaliName.includes(q) : false;
      const zoneMatch = s.zone ? s.zone.toLowerCase().includes(q) : false;
      const lineMatch = s.line ? s.line.toLowerCase().includes(q) : false;
      return nameMatch || bnMatch || zoneMatch || lineMatch;
    });
  }, [endStationSearch]);

  // Active start station object
  const activeStartStation = useMemo(() => {
    return config.startStationId ? METRO_STATIONS_BY_ID[config.startStationId] : null;
  }, [config.startStationId]);

  // Active end station object
  const activeEndStation = useMemo(() => {
    return config.endStationId ? METRO_STATIONS_BY_ID[config.endStationId] : null;
  }, [config.endStationId]);

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
      let activeConfig = { ...config };

      // Validate and automatically acquire GPS if startType is current-location
      if (activeConfig.startType === 'current-location' && !activeConfig.startCoords) {
        try {
          const coords = await handleAcquireGps();
          activeConfig.startCoords = coords;
        } catch (gpsErr: any) {
          setIsGenerating(false);
          setErrorMessage(gpsErr.message || 'Location permission required for Current Location.');
          return;
        }
      }

      const plan = await generateNightPlan(activeConfig, allPandals);
      onUpdateNightPlan(plan);
      setIsConfigExpanded(false); // Collapse form to reveal itinerary
      if (isMobileSheet && onSheetStateChange) {
        onSheetStateChange('half'); // Set to half on mobile to reveal both map and itinerary
      }
    } catch (err: any) {
      console.error('Error generating night plan:', err);
      setErrorMessage(err.message || 'Could not generate route. Please try another starting point.');
    } finally {
      setIsGenerating(false);
    }
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

  // Remove a stop
  const handleRemoveStop = async (stopId: string) => {
    if (!currentNightPlan) return;
    const updated = currentNightPlan.stops.filter((s) => s.id !== stopId);
    if (updated.length <= 1) {
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
    const pandalIdx = index - 1; // stops[0] is start node

    if (direction === 'up' && pandalIdx <= 0) return;
    if (direction === 'down' && pandalIdx >= pandalStops.length - 1) return;

    const targetIdx = direction === 'up' ? pandalIdx - 1 : pandalIdx + 1;
    const newPandalStops = [...pandalStops];
    const [moved] = newPandalStops.splice(pandalIdx, 1);
    newPandalStops.splice(targetIdx, 0, moved);

    const startNode = currentNightPlan.stops[0];
    const endNode = currentNightPlan.stops[currentNightPlan.stops.length - 1]?.type === 'end'
      ? currentNightPlan.stops[currentNightPlan.stops.length - 1]
      : null;

    const updatedStops = [
      startNode,
      ...newPandalStops,
      ...(endNode ? [endNode] : []),
    ];

    const recalculated = await recalculateNightPlan(currentNightPlan, updatedStops);
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
      suggestedVisitMinutes: config.preferredDwellMinutes || 30,
    };

    // If there's an ending node, insert before end
    const lastIsEnd = currentNightPlan.stops[currentNightPlan.stops.length - 1]?.type === 'end';
    let updatedStops: NightPlanStop[];
    if (lastIsEnd) {
      updatedStops = [
        ...currentNightPlan.stops.slice(0, -1),
        newStop,
        currentNightPlan.stops[currentNightPlan.stops.length - 1],
      ];
    } else {
      updatedStops = [...currentNightPlan.stops, newStop];
    }

    setIsAddPickerOpen(false);
    setAddSearchQuery('');

    const recalculated = await recalculateNightPlan(currentNightPlan, updatedStops);
    onUpdateNightPlan(recalculated);
    setSaveToast(`Added ${pandal.name} to your route!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Save itinerary locally
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

  // Filter candidates for Excluded Pandals picker
  const filteredExcludeCandidates = useMemo(() => {
    const q = excludeSearch.toLowerCase().trim();
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
  }, [allPandals, excludeSearch]);

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

  // RENDER: Collapsed Preview for Mobile Bottom Sheet
  const renderCollapsedPreview = () => (
    <div className="kpn-planner-collapsed-bar" onClick={() => onSheetStateChange?.('half')}>
      <div className="kpn-peek-title-group">
        <div className="kpn-night-badge-glow" style={{ width: 32, height: 32, fontSize: 15 }}>
          🌙
        </div>
        <div className="kpn-peek-info-text">
          <strong className="kpn-peek-main-title">Pujo Night Route</strong>
          <span className="kpn-peek-stats">
            {currentNightPlan
              ? `${currentNightPlan.totalStops} Stops · ${formatMinutes(currentNightPlan.totalDurationMinutes)} · ~${(currentNightPlan.totalWalkingDistanceMeters / 1000).toFixed(1)} km`
              : 'Tap to configure hopping route'}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="kpn-peek-action-btn"
        onClick={(e) => {
          e.stopPropagation();
          onSheetStateChange?.(currentNightPlan ? 'half' : 'expanded');
        }}
        id="planner-peek-action-btn"
      >
        <span>{currentNightPlan ? 'View Route' : 'Plan'}</span>
      </button>
    </div>
  );

  // RENDER: Top Header Row
  const renderHeader = () => (
    <div className="kpn-night-header">
      <div className="kpn-night-title-row">
        <div className="kpn-night-badge-glow">
          <NightPlanIcon size={20} className="kpn-night-icon" />
        </div>
        <div>
          <h2 className="kpn-night-title">Pujo Night Planner</h2>
          <p className="kpn-night-subtitle">Personalized route with real Metro corridors.</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {onViewOnMap && (
          <button
            type="button"
            className="kpn-pill-toggle-btn"
            onClick={() => {
              if (isMobileSheet && onSheetStateChange) {
                onSheetStateChange('collapsed');
              }
              onViewOnMap();
            }}
            id="planner-view-on-map-top-btn"
            title="Show on map"
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
            className={`kpn-pill-toggle-btn ${isConfigModified ? 'is-modified-highlight' : ''}`}
            onClick={() => setIsConfigExpanded(!isConfigExpanded)}
            aria-expanded={isConfigExpanded}
            id="toggle-plan-config-btn"
          >
            <span>{isConfigExpanded ? 'Hide' : 'Tweak'}</span>
            {isConfigExpanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
          </button>
        )}
      </div>
    </div>
  );

  // RENDER: Full Planner Content
  const renderMainContent = () => (
    <div className="kpn-planner-content-scroll">
      {saveToast && (
        <div className="kpn-planner-toast" role="status">
          <span>✓ {saveToast}</span>
        </div>
      )}

      {/* MODIFIED SETTINGS PENDING BANNER */}
      {isConfigModified && currentNightPlan && !isConfigExpanded && (
        <div className="kpn-planner-modified-banner">
          <div>
            <strong>Settings Changed</strong>
            <small>Tap 'Regenerate Route' to apply your new preferences.</small>
          </div>
          <button
            type="button"
            className="kpn-btn-reapply-quick"
            onClick={handleGenerateRoute}
            disabled={isGenerating}
          >
            {isGenerating ? 'Updating...' : 'Regenerate'}
          </button>
        </div>
      )}

      {/* 2. PROGRESSIVE CONFIGURATION SETUP FLOW */}
      {isConfigExpanded && (
        <section className="kpn-planner-config-card" aria-label="Planner Setup Flow">
          {/* STEP 1: Starting Point */}
          <div className="kpn-config-group">
            <label className="kpn-config-label">
              <CompassIcon size={15} />
              <span>1. Starting Point</span>
            </label>

            <div className="kpn-segmented-control" role="tablist">
              <button
                type="button"
                className={`kpn-segment-btn ${config.startType === 'metro-station' ? 'is-active' : ''}`}
                onClick={() => setConfig((p) => ({ ...p, startType: 'metro-station' }))}
                id="start-type-metro-btn"
              >
                <MetroIcon size={14} />
                <span>Metro Station</span>
              </button>

              <button
                type="button"
                className={`kpn-segment-btn ${config.startType === 'current-location' ? 'is-active' : ''}`}
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
                <span>🪔 Pandal</span>
              </button>
            </div>

            {/* Sub-selector: Searchable Metro Station for Start */}
            {config.startType === 'metro-station' && (
              <div className="kpn-start-picker-box">
                {activeStartStation && !isStartStationDropdownOpen ? (
                  <div className="kpn-selected-station-card">
                    <div className="kpn-station-card-left">
                      <span
                        className="kpn-line-badge"
                        style={{ backgroundColor: METRO_LINE_COLORS[activeStartStation.lineCode] || '#0062B1' }}
                      >
                        {activeStartStation.lineCode.toUpperCase()}
                      </span>
                      <div>
                        <strong>{activeStartStation.name}</strong>
                        {activeStartStation.bengaliName && (
                          <span className="kpn-bn-label">({activeStartStation.bengaliName})</span>
                        )}
                        <small className="kpn-station-sub">{activeStartStation.line} · {activeStartStation.zone} Kolkata</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="kpn-btn-change-station"
                      onClick={() => setIsStartStationDropdownOpen(true)}
                      id="change-start-station-btn"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="kpn-searchable-station-picker">
                    <div className="kpn-station-search-input-wrap">
                      <SearchIcon size={14} />
                      <input
                        type="text"
                        placeholder="Search Metro (e.g., Howrah, Kalighat, Shyambazar)..."
                        value={startStationSearch}
                        onChange={(e) => setStartStationSearch(e.target.value)}
                        autoFocus={isStartStationDropdownOpen}
                        id="start-station-search-input"
                      />
                      {startStationSearch && (
                        <button type="button" onClick={() => setStartStationSearch('')} aria-label="Clear search">
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="kpn-station-picker-results">
                      {filteredStartStations.map((st) => (
                        <div
                          key={st.id}
                          className={`kpn-station-picker-row ${config.startStationId === st.id ? 'is-selected' : ''}`}
                          onClick={() => {
                            setConfig((prev) => ({ ...prev, startStationId: st.id }));
                            setIsStartStationDropdownOpen(false);
                            setStartStationSearch('');
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <span
                            className="kpn-line-badge-sm"
                            style={{ backgroundColor: METRO_LINE_COLORS[st.lineCode] || '#0062B1' }}
                          >
                            {st.lineCode.toUpperCase()}
                          </span>
                          <div className="kpn-station-row-info">
                            <strong>{st.name}</strong>
                            {st.bengaliName && <span className="kpn-bn-label">{st.bengaliName}</span>}
                            <small>{st.line} · {st.zone}</small>
                          </div>
                          {st.interchange && <span className="kpn-interchange-badge">⇄ Inter</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-selector: Current Location GPS */}
            {config.startType === 'current-location' && (
              <div className="kpn-gps-box">
                {isLocating && (
                  <div className="kpn-gps-status-loading">
                    <span className="kpn-spinner-small" />
                    <span>Acquiring real-time GPS coordinates...</span>
                  </div>
                )}

                {gpsStatus === 'success' && config.startCoords && (
                  <div className="kpn-gps-status-success">
                    <CheckCircleIcon size={16} />
                    <div>
                      <strong>GPS Acquired:</strong> {config.startCoords.label}
                      <small className="kpn-block-sub">
                        {config.startCoords.lat.toFixed(4)}, {config.startCoords.lng.toFixed(4)}
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

            {/* Sub-selector: Pandal Start */}
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
              </div>
            )}
          </div>

          {/* STEP 2: Ending Point */}
          <div className="kpn-config-group">
            <label className="kpn-config-label">
              <RouteIcon size={15} />
              <span>2. Ending Point / Destination</span>
            </label>

            <div className="kpn-segmented-control wrap-2x2" role="tablist">
              <button
                type="button"
                className={`kpn-segment-btn ${(!config.endType || config.endType === 'same-as-start') ? 'is-active' : ''}`}
                onClick={() => setConfig((p) => ({ ...p, endType: 'same-as-start' }))}
                id="end-type-same-btn"
              >
                <span>🔄 Return to Start</span>
              </button>

              <button
                type="button"
                className={`kpn-segment-btn ${config.endType === 'metro-station' ? 'is-active' : ''}`}
                onClick={() => setConfig((p) => ({ ...p, endType: 'metro-station' }))}
                id="end-type-metro-btn"
              >
                <MetroIcon size={14} />
                <span>Metro Station</span>
              </button>

              <button
                type="button"
                className={`kpn-segment-btn ${config.endType === 'pandal' ? 'is-active' : ''}`}
                onClick={() => setConfig((p) => ({ ...p, endType: 'pandal' }))}
                id="end-type-pandal-btn"
              >
                <span>🪔 End at Pandal</span>
              </button>

              <button
                type="button"
                className={`kpn-segment-btn ${config.endType === 'none' ? 'is-active' : ''}`}
                onClick={() => setConfig((p) => ({ ...p, endType: 'none' }))}
                id="end-type-none-btn"
              >
                <span>🏁 No Fixed End</span>
              </button>
            </div>

            {/* Ending Metro Station Picker */}
            {config.endType === 'metro-station' && (
              <div className="kpn-start-picker-box">
                {activeEndStation && !isEndStationDropdownOpen ? (
                  <div className="kpn-selected-station-card">
                    <div className="kpn-station-card-left">
                      <span
                        className="kpn-line-badge"
                        style={{ backgroundColor: METRO_LINE_COLORS[activeEndStation.lineCode] || '#0062B1' }}
                      >
                        {activeEndStation.lineCode.toUpperCase()}
                      </span>
                      <div>
                        <strong>{activeEndStation.name}</strong>
                        {activeEndStation.bengaliName && (
                          <span className="kpn-bn-label">({activeEndStation.bengaliName})</span>
                        )}
                        <small className="kpn-station-sub">{activeEndStation.line} · {activeEndStation.zone}</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="kpn-btn-change-station"
                      onClick={() => setIsEndStationDropdownOpen(true)}
                      id="change-end-station-btn"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="kpn-searchable-station-picker">
                    <div className="kpn-station-search-input-wrap">
                      <SearchIcon size={14} />
                      <input
                        type="text"
                        placeholder="Search finishing Metro station..."
                        value={endStationSearch}
                        onChange={(e) => setEndStationSearch(e.target.value)}
                        autoFocus={isEndStationDropdownOpen}
                        id="end-station-search-input"
                      />
                      {endStationSearch && (
                        <button type="button" onClick={() => setEndStationSearch('')}>
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="kpn-station-picker-results">
                      {filteredEndStations.map((st) => (
                        <div
                          key={st.id}
                          className={`kpn-station-picker-row ${config.endStationId === st.id ? 'is-selected' : ''}`}
                          onClick={() => {
                            setConfig((prev) => ({ ...prev, endStationId: st.id }));
                            setIsEndStationDropdownOpen(false);
                            setEndStationSearch('');
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <span
                            className="kpn-line-badge-sm"
                            style={{ backgroundColor: METRO_LINE_COLORS[st.lineCode] || '#0062B1' }}
                          >
                            {st.lineCode.toUpperCase()}
                          </span>
                          <div className="kpn-station-row-info">
                            <strong>{st.name}</strong>
                            {st.bengaliName && <span className="kpn-bn-label">{st.bengaliName}</span>}
                            <small>{st.line} · {st.zone}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ending Pandal Picker */}
            {config.endType === 'pandal' && (
              <div className="kpn-start-picker-box">
                <select
                  value={config.endPandalId || allPandals[1]?.id}
                  onChange={(e) => setConfig((p) => ({ ...p, endPandalId: e.target.value }))}
                  className="kpn-native-select"
                  aria-label="Select Ending Pandal"
                  id="select-end-pandal-dropdown"
                >
                  {allPandals
                    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.neighbourhood} · {p.category})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* STEP 3: Available Time Budget */}
          <div className="kpn-config-group">
            <label className="kpn-config-label">
              <ClockIcon size={15} />
              <span>3. Available Time ({config.timeAvailableHours} Hours)</span>
            </label>

            <div className="kpn-chips-row">
              {([2, 3, 4, 6] as TimeBudgetHours[]).map((hours) => (
                <button
                  key={hours}
                  type="button"
                  className={`kpn-chip-btn ${config.timeAvailableHours === hours ? 'is-selected' : ''}`}
                  onClick={() => setConfig((p) => ({ ...p, timeAvailableHours: hours }))}
                  id={`time-chip-${hours}h`}
                >
                  <span className="kpn-chip-val">{hours}</span>
                  <span className="kpn-chip-unit">hours</span>
                </button>
              ))}
              <button
                type="button"
                className={`kpn-chip-btn ${![2, 3, 4, 6].includes(config.timeAvailableHours) ? 'is-selected' : ''}`}
                onClick={() => {
                  const input = prompt('Enter duration in hours (e.g. 5, 8):', String(config.timeAvailableHours));
                  if (input) {
                    const parsed = parseFloat(input);
                    if (!isNaN(parsed) && parsed > 0 && parsed <= 12) {
                      setConfig((p) => ({ ...p, timeAvailableHours: parsed }));
                    }
                  }
                }}
                id="time-chip-custom"
              >
                <span className="kpn-chip-val">Custom</span>
              </button>
            </div>
            <small className="kpn-hint-text">
              Total duration accounts for viewing each pandal + realistic pedestrian & Metro travel.
            </small>
          </div>

          {/* STEP 4: Puja Category Preferences */}
          <div className="kpn-config-group">
            <label className="kpn-config-label">
              <span>🪔</span>
              <span>4. Puja Category Preferences</span>
            </label>

            <div className="kpn-pill-grid">
              {(
                [
                  {
                    id: 'Traditional' as PujoCategoryPreference,
                    label: 'Traditional Sabeki',
                    icon: '🪔',
                    desc: 'Ekchala & Daker Saaj idols',
                  },
                  {
                    id: 'Theme' as PujoCategoryPreference,
                    label: 'Artistic & Theme',
                    icon: '🎨',
                    desc: 'Conceptual craft installations',
                  },
                  {
                    id: 'Heritage Rajbari' as PujoCategoryPreference,
                    label: 'Heritage Bonedi Bari',
                    icon: '🏛',
                    desc: 'Aristocratic household pujas',
                  },
                  {
                    id: 'Contemporary Landmark' as PujoCategoryPreference,
                    label: 'Famous Attractions',
                    icon: '⭐',
                    desc: 'Mega-budget Kolkata landmarks',
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

          {/* STEP 5: Walking Preference */}
          <div className="kpn-config-group">
            <label className="kpn-config-label">
              <WalkIcon size={15} />
              <span>5. Walking Preference</span>
            </label>

            <div className="kpn-segmented-control" role="tablist">
              <button
                type="button"
                className={`kpn-segment-btn ${config.travelPreference === 'minimal' ? 'is-active' : ''}`}
                onClick={() => setConfig((p) => ({ ...p, travelPreference: 'minimal', walkingTolerance: 'low' }))}
                id="walk-pref-minimal"
              >
                <span>🚶 Minimal Walk</span>
              </button>

              <button
                type="button"
                className={`kpn-segment-btn ${config.travelPreference === 'balanced' ? 'is-active' : ''}`}
                onClick={() => setConfig((p) => ({ ...p, travelPreference: 'balanced', walkingTolerance: 'moderate' }))}
                id="walk-pref-balanced"
              >
                <span>⚖️ Balanced</span>
              </button>

              <button
                type="button"
                className={`kpn-segment-btn ${config.travelPreference === 'walking-focused' ? 'is-active' : ''}`}
                onClick={() => setConfig((p) => ({ ...p, travelPreference: 'walking-focused', walkingTolerance: 'high' }))}
                id="walk-pref-focused"
              >
                <span>👟 Walking-Focused</span>
              </button>
            </div>
          </div>

          {/* STEP 6: Discovery Preference */}
          <div className="kpn-config-group">
            <label className="kpn-config-label">
              <SparklesIcon size={15} />
              <span>6. Discovery Focus</span>
            </label>

            <div className="kpn-chips-row flex-wrap">
              {[
                { id: 'max-pandals' as DiscoveryPreference, label: '⚡ Visit as Many as Possible' },
                { id: 'famous-first' as DiscoveryPreference, label: '⭐ Prioritize Famous Pujas' },
                { id: 'heritage-first' as DiscoveryPreference, label: '🏛 Heritage & Traditional' },
                { id: 'artistic-first' as DiscoveryPreference, label: '🎨 Artistic & Unique Themes' },
                { id: 'relaxed' as DiscoveryPreference, label: '☕ Relaxed (More Time at Stops)' },
              ].map((disc) => (
                <button
                  key={disc.id}
                  type="button"
                  className={`kpn-chip-btn ${config.discoveryPreference === disc.id ? 'is-selected' : ''}`}
                  onClick={() => setConfig((p) => ({ ...p, discoveryPreference: disc.id }))}
                  id={`discovery-${disc.id}`}
                >
                  <span className="kpn-chip-val" style={{ fontSize: 12 }}>{disc.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 7: Optional Advanced Controls (Collapsible) */}
          <div className="kpn-advanced-collapsible-box">
            <button
              type="button"
              className="kpn-advanced-toggle-btn"
              onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
              aria-expanded={isAdvancedExpanded}
              id="toggle-advanced-planner-options"
            >
              <span>⚙️ Advanced Options (Must-Visits, Exclusions, Max Stops, Dwell Time)</span>
              {isAdvancedExpanded ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
            </button>

            {isAdvancedExpanded && (
              <div className="kpn-advanced-fields-inner">
                {/* Max stops & Preferred dwell */}
                <div className="kpn-config-row-two-col">
                  <div className="kpn-config-group">
                    <label className="kpn-config-label">
                      <span>Max Number of Stops:</span>
                    </label>
                    <select
                      value={config.maxStops || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setConfig((p) => ({ ...p, maxStops: val === 0 ? undefined : val }));
                      }}
                      className="kpn-native-select"
                      id="select-max-stops"
                    >
                      <option value="0">Auto (Optimized for time budget)</option>
                      <option value="3">Maximum 3 stops</option>
                      <option value="4">Maximum 4 stops</option>
                      <option value="5">Maximum 5 stops</option>
                      <option value="6">Maximum 6 stops</option>
                      <option value="8">Maximum 8 stops</option>
                    </select>
                  </div>

                  <div className="kpn-config-group">
                    <label className="kpn-config-label">
                      <span>Dwell Time per Pandal:</span>
                    </label>
                    <select
                      value={config.preferredDwellMinutes || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setConfig((p) => ({ ...p, preferredDwellMinutes: val === 0 ? undefined : val }));
                      }}
                      className="kpn-native-select"
                      id="select-dwell-time"
                    >
                      <option value="0">Auto (Varies by crowd/category)</option>
                      <option value="15">Quick (15 min)</option>
                      <option value="25">Standard (25 min)</option>
                      <option value="35">Leisurely (35 min)</option>
                      <option value="45">Deep Exploration (45 min)</option>
                    </select>
                  </div>
                </div>

                {/* Trip Start Time */}
                <div className="kpn-config-group">
                  <label className="kpn-config-label">
                    <span>Trip Start Time:</span>
                  </label>
                  <input
                    type="time"
                    value={config.startTime || '19:30'}
                    onChange={(e) => setConfig((p) => ({ ...p, startTime: e.target.value }))}
                    className="kpn-native-select"
                    style={{ background: '#FFF', maxWidth: 160 }}
                    id="trip-start-time-input"
                  />
                  <small className="kpn-hint-text">Used to compute estimated arrival and departure timestamps.</small>
                </div>

                {/* Must-Visit Pandals Picker */}
                <div className="kpn-config-group">
                  <div className="kpn-label-with-action">
                    <label className="kpn-config-label">
                      <SparklesIcon size={14} />
                      <span>Must-Visit Pandals ({config.mustVisitPandalIds.length})</span>
                    </label>
                    <button
                      type="button"
                      className="kpn-text-link-btn"
                      onClick={() => setIsMustVisitPickerOpen(!isMustVisitPickerOpen)}
                      id="toggle-must-visit-drawer-btn"
                    >
                      {isMustVisitPickerOpen ? 'Close' : '+ Pick Must-Visits'}
                    </button>
                  </div>

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

                  {isMustVisitPickerOpen && (
                    <div className="kpn-must-visit-drawer">
                      <div className="kpn-drawer-search">
                        <SearchIcon size={14} />
                        <input
                          type="text"
                          placeholder="Search pandals to mark as Must-Visit..."
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

                {/* Exclude Pandals Picker */}
                <div className="kpn-config-group">
                  <div className="kpn-label-with-action">
                    <label className="kpn-config-label">
                      <TrashIcon size={14} />
                      <span>Exclude Pandals ({(config.excludedPandalIds || []).length})</span>
                    </label>
                    <button
                      type="button"
                      className="kpn-text-link-btn"
                      onClick={() => setIsExcludePickerOpen(!isExcludePickerOpen)}
                      id="toggle-exclude-drawer-btn"
                    >
                      {isExcludePickerOpen ? 'Close' : '+ Exclude Pandals'}
                    </button>
                  </div>

                  {(config.excludedPandalIds || []).length > 0 && (
                    <div className="kpn-must-visit-tags">
                      {(config.excludedPandalIds || []).map((id) => {
                        const p = allPandals.find((item) => item.id === id);
                        if (!p) return null;
                        return (
                          <span key={id} className="kpn-exclude-tag">
                            <span>🚫 {p.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  excludedPandalIds: (prev.excludedPandalIds || []).filter((eId) => eId !== id),
                                }))
                              }
                              title="Remove exclusion"
                              aria-label={`Remove exclusion for ${p.name}`}
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {isExcludePickerOpen && (
                    <div className="kpn-must-visit-drawer">
                      <div className="kpn-drawer-search">
                        <SearchIcon size={14} />
                        <input
                          type="text"
                          placeholder="Search pandals to exclude from itinerary..."
                          value={excludeSearch}
                          onChange={(e) => setExcludeSearch(e.target.value)}
                          id="exclude-search-input"
                        />
                        {excludeSearch && (
                          <button type="button" onClick={() => setExcludeSearch('')}>
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="kpn-drawer-list">
                        {filteredExcludeCandidates.map((pandal) => {
                          const isChecked = (config.excludedPandalIds || []).includes(pandal.id);
                          return (
                            <label key={pandal.id} className="kpn-drawer-item">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setConfig((prev) => {
                                    const currentEx = prev.excludedPandalIds || [];
                                    return {
                                      ...prev,
                                      excludedPandalIds: checked
                                        ? [...currentEx, pandal.id]
                                        : currentEx.filter((id) => id !== pandal.id),
                                    };
                                  });
                                }}
                              />
                              <div className="kpn-drawer-item-info">
                                <strong>{pandal.name}</strong>
                                <small>{pandal.neighbourhood} · {pandal.category}</small>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ACTION BUTTON */}
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
                  <span>Computing Optimized Pujo Route...</span>
                </>
              ) : (
                <>
                  <SparklesIcon size={18} />
                  <span>{currentNightPlan ? 'Regenerate Pujo Route' : 'Generate My Pujo Route'}</span>
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
                <span className="kpn-metric-label">Est. Walking</span>
              </div>
            </div>

            <div className="kpn-summary-breakdown-row">
              <span className="kpn-breakdown-item">
                <ClockIcon size={13} />
                <span>Viewing Pandals: ~{formatMinutes(currentNightPlan.totalVisitMinutes)}</span>
              </span>
              <span className="kpn-breakdown-item">
                <WalkIcon size={13} />
                <span>Travel Corridor: ~{formatMinutes(currentNightPlan.totalTravelMinutes)}</span>
              </span>
            </div>

            <div className="kpn-summary-endpoints">
              <span className="kpn-endpoint-label">
                <strong>Start:</strong> {currentNightPlan.startPoint.label}
              </span>
              <span className="kpn-endpoint-sep">➔</span>
              <span className="kpn-endpoint-label">
                <strong>End:</strong>{' '}
                {currentNightPlan.endPoint
                  ? currentNightPlan.endPoint.label
                  : currentNightPlan.stops[currentNightPlan.stops.length - 1]?.name}
              </span>
            </div>

            <div className="kpn-verified-pill-row">
              <span className="kpn-verified-disclaimer-pill">
                ⏱ Verified OpenStreetMap & OSRM Pedestrian Paths
              </span>
              {currentNightPlan.routeResult?.source === 'fallback' && (
                <span className="kpn-fallback-pill">
                  ℹ Approximate street grid calculation (offline mode)
                </span>
              )}
            </div>

            {/* Quick action bar */}
            <div className="kpn-summary-quick-actions">
              {onViewOnMap && (
                <button
                  type="button"
                  className="kpn-action-chip primary"
                  onClick={() => {
                    if (isMobileSheet && onSheetStateChange) {
                      onSheetStateChange('collapsed');
                    }
                    onViewOnMap();
                  }}
                  id="view-itinerary-map-btn"
                >
                  <CompassIcon size={14} />
                  <span>View on Map</span>
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
          {currentNightPlan.skippedMustVisits && currentNightPlan.skippedMustVisits.length > 0 && (
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
              const isEndNode = stop.type === 'end';
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
                    className={`kpn-stop-card ${isStartNode ? 'is-start-node' : ''} ${isEndNode ? 'is-end-node' : ''}`}
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
                      className={`kpn-stop-badge ${isStartNode ? 'start' : ''} ${isEndNode ? 'end' : ''}`}
                      style={{
                        backgroundColor: isStartNode ? '#00875A' : isEndNode ? '#E8590C' : catMeta.color,
                      }}
                    >
                      {isStartNode ? 'Start' : isEndNode ? 'End' : stop.stopNumber}
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

                      {/* Timestamps if computed */}
                      {stop.arrivalTime && (
                        <div className="kpn-stop-schedule-time">
                          <ClockIcon size={12} />
                          <span>
                            {stop.arrivalTime} {stop.departureTime ? `– ${stop.departureTime}` : ''}
                          </span>
                        </div>
                      )}

                      {!isStartNode && !isEndNode && stop.category && (
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
                      {!isStartNode && !isEndNode && (
                        <div className="kpn-visit-est-badge">
                          <ClockIcon size={12} />
                          <span>Est. {stop.suggestedVisitMinutes} min dwell time</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    {!isStartNode && !isEndNode && (
                      <div className="kpn-stop-actions" onClick={(e) => e.stopPropagation()}>
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
                          disabled={
                            idx >=
                            (currentNightPlan.stops[currentNightPlan.stops.length - 1]?.type === 'end'
                              ? currentNightPlan.stops.length - 2
                              : currentNightPlan.stops.length - 1)
                          }
                          title="Move later in route"
                          aria-label="Move down"
                        >
                          <ChevronDownIcon size={14} />
                        </button>

                        {/* Toggle Must-Visit */}
                        <button
                          type="button"
                          className={`kpn-stop-action-btn star ${stop.isMustVisit ? 'is-starred' : ''}`}
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
                              ~{stop.legToNext.timeMinutes} min walk ({Math.round(stop.legToNext.distanceMeters)} m)
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
                      const alreadyInRoute = currentNightPlan.stops.some((s) => s.pandalId === pandal.id);
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
                            className={`kpn-btn-insert-stop ${alreadyInRoute ? 'is-added' : ''}`}
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
            Choose your starting station, finishing point, time budget, and preferences above.
            We will calculate an itinerary with real Metro connections and walking corridors.
          </p>
        </div>
      )}
    </div>
  );

  // RENDER: Active Routing Provider Settings Modal
  const renderSettingsModal = () => (
    isSettingsOpen && (
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
                  <small>No API key required. High-speed street pathing with 100% offline fallback.</small>
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
                  <small>Free key available at openrouteservice.org with precise footway pathing.</small>
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
                  <small>Free key at geoapify.com with accurate urban routing geometries.</small>
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
                  <small>Free access token at mapbox.com for worldwide pedestrian routing.</small>
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
                <small className="kpn-hint-text">Saved directly into browser localStorage.</small>
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
    )
  );

  // MOBILE: Return unified 3-state BottomSheet
  if (isMobileSheet) {
    return (
      <>
        <BottomSheet
          state={sheetState}
          onStateChange={onSheetStateChange || (() => {})}
          headerContent={renderHeader()}
          collapsedPreview={renderCollapsedPreview()}
          className="kpn-night-planner-bottom-sheet"
          id="night-planner-mobile-bottom-sheet"
        >
          {renderMainContent()}
        </BottomSheet>
        {renderSettingsModal()}
      </>
    );
  }

  // DESKTOP: Return sidebar container
  return (
    <div className="kpn-night-planner-container kpn-planner-desktop">
      {renderHeader()}
      {renderMainContent()}
      {renderSettingsModal()}
    </div>
  );
}
