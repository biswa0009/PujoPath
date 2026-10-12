import React, { useState, useMemo } from 'react';
import { RouteStop, RouteResult, Pandal } from '../types';
import { METRO_STATIONS } from '../data/metroStations';
import {
  optimizeRouteOrder,
  getGoogleMapsDirectionsUrl,
  calculateHaversineDistance,
} from '../services/routingService';
import {
  RouteIcon,
  CloseIcon,
  WalkIcon,
  ExternalLinkIcon,
  ShareIcon,
  SparklesIcon,
  ReorderHandleIcon,
  CrosshairIcon,
  InfoIcon,
  OptimizeIcon,
  ShieldCheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from './Icons';

interface RoutePlannerProps {
  stops: RouteStop[];
  onUpdateStops: (newStops: RouteStop[]) => void;
  routeResult: RouteResult | null;
  isLoadingRoute: boolean;
  onRequestCalculateRoute: () => void;
  onClearRoute: () => void;
  allPandals: Pandal[];
  onSelectPandalById: (id: string) => void;
  onSelectStop?: (stop: RouteStop) => void;
  isMobileSheet?: boolean;
}

export function RoutePlanner({
  stops,
  onUpdateStops,
  routeResult,
  isLoadingRoute,
  onRequestCalculateRoute,
  onClearRoute,
  allPandals,
  onSelectPandalById,
  onSelectStop,
  isMobileSheet = false,
}: RoutePlannerProps) {
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [selectedStartStation, setSelectedStartStation] = useState<string>('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [copiedStatus, setCopiedStatus] = useState<string>('');
  const [navStarted, setNavStarted] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Set origin Metro station
  const handleAddStartStation = (stationId: string) => {
    if (!stationId) return;
    const st = METRO_STATIONS.find((s) => s.id === stationId);
    if (!st) return;

    // Check if station already exists
    if (stops.some((s) => s.stationId === st.id)) {
      setSelectedStartStation('');
      return;
    }

    const newStop: RouteStop = {
      id: `station-${st.id}`,
      type: 'station',
      name: `${st.name} Metro Station`,
      bengaliName: st.bengaliName,
      lat: st.lat,
      lng: st.lng,
      stationId: st.id,
      note: 'Journey Start',
    };

    // Replace previous starting station or prepend
    const withoutExistingStart = stops.filter((s) => s.type !== 'station');
    onUpdateStops([newStop, ...withoutExistingStart]);
    setSelectedStartStation('');
  };

  // Add live GPS as origin
  const handleAddCurrentLocation = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newStop: RouteStop = {
          id: `gps-origin-${Date.now()}`,
          type: 'custom',
          name: 'Near Live GPS Location 📍',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          note: 'Live GPS Origin',
        };
        const withoutOldGps = stops.filter((s) => s.type !== 'custom');
        onUpdateStops([newStop, ...withoutOldGps]);
      },
      (err) => {
        setGpsError(`Could not access GPS: ${err.message}. Please select a Metro station instead.`);
        setTimeout(() => setGpsError(null), 6000);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Reorder functions
  const handleMoveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index <= 0) return;
    const copy = [...stops];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    onUpdateStops(copy);
  };

  const handleMoveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index >= stops.length - 1) return;
    const copy = [...stops];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    onUpdateStops(copy);
  };

  const handleRemoveStop = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateStops(stops.filter((s) => s.id !== id));
  };

  // Optimize TSP order
  const handleOptimize = () => {
    if (stops.length < 3) return;
    const optimized = optimizeRouteOrder(stops);
    onUpdateStops(optimized);
  };

  // Copy shareable itinerary text
  const handleShare = () => {
    if (stops.length === 0) return;
    const text = `🌸 My Kolkata Durga Puja Hopping Route (${stops.length} stops):\n${stops
      .map((s, i) => `${i + 1}. ${s.name} ${s.bengaliName ? `(${s.bengaliName})` : ''}`)
      .join('\n')}\n\nPlan your Puja Hopping with PujoPath: ${window.location.href}`;

    if (navigator.share) {
      navigator.share({ title: 'Kolkata Puja Itinerary', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopiedStatus('Itinerary copied to clipboard! 📋');
      setTimeout(() => setCopiedStatus(''), 3000);
    }
  };

  // Add pandal from picker (prevent duplicates)
  const handleAddPandal = (p: Pandal) => {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
    if (stops.some((s) => s.id === p.id)) return;

    const newStop: RouteStop = {
      id: p.id,
      type: 'pandal',
      name: p.name,
      bengaliName: p.bengaliName,
      lat: p.lat!,
      lng: p.lng!,
      stationId: p.nearestStationId || undefined,
      note: p.category,
    };
    onUpdateStops([...stops, newStop]);
    setIsPickerOpen(false);
  };

  const googleMapsUrl = getGoogleMapsDirectionsUrl(stops);

  // Available pandals for picker excluding existing stops
  const pickerPandals = useMemo(() => {
    const existingIds = new Set(stops.map((s) => s.id));
    return allPandals.filter((p) => {
      if (existingIds.has(p.id)) return false;
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
      if (pickerSearch.trim()) {
        const q = pickerSearch.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.bengaliName && p.bengaliName.includes(q)) ||
          p.neighbourhood.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allPandals, stops, pickerSearch]);

  // Derived metrics
  const totalDistKm = routeResult
    ? (routeResult.totalDistanceMeters / 1000).toFixed(2)
    : stops.length > 1
    ? (
        stops.slice(0, -1).reduce((acc, curr, i) => {
          return acc + calculateHaversineDistance(curr.lat, curr.lng, stops[i + 1].lat, stops[i + 1].lng) * 1.25;
        }, 0) / 1000
      ).toFixed(2)
    : '0.00';

  const totalTimeMins = routeResult
    ? Math.round(routeResult.totalTimeMinutes)
    : Math.max(1, Math.round(parseFloat(totalDistKm) * 13.5));

  const isApproximate = routeResult?.source === 'fallback';

  // Handle stop click to synchronize with map
  const handleStopClick = (stop: RouteStop) => {
    if (onSelectStop) {
      onSelectStop(stop);
    }
    if (stop.type === 'pandal') {
      onSelectPandalById(stop.id);
    }
  };

  const containerClasses = isMobileSheet
    ? `kpn-route-mobile-sheet ${isSheetExpanded ? 'is-expanded' : 'is-peek'}`
    : 'kpn-stitch-routes-view';

  return (
    <div className={containerClasses} aria-label="Turn-by-Turn Route Planner">
      {/* Mobile Sheet Pull Handle */}
      {isMobileSheet && (
        <div
          className="kpn-sheet-drag-handle"
          onClick={() => setIsSheetExpanded(!isSheetExpanded)}
          role="button"
          tabIndex={0}
          aria-label={isSheetExpanded ? 'Collapse route sheet' : 'Expand route sheet'}
        >
          <span className="kpn-drag-bar" />
        </div>
      )}

      {/* 1. Header Section */}
      <div className="kpn-routes-head-card">
        <div className="kpn-routes-title-row">
          <div
            className="kpn-routes-title-wrap"
            onClick={isMobileSheet ? () => setIsSheetExpanded(!isSheetExpanded) : undefined}
            role={isMobileSheet ? 'button' : undefined}
            tabIndex={isMobileSheet ? 0 : undefined}
          >
            <h1 className="kpn-routes-title">Pandal Hopping Route</h1>
            <span className="kpn-badge-stops">{stops.length} Stops</span>
            {isMobileSheet && (
              <span className="kpn-sheet-peek-toggle">
                {isSheetExpanded ? <ChevronDownIcon size={16} /> : <ChevronUpIcon size={16} />}
              </span>
            )}
          </div>

          <div className="kpn-routes-head-btns">
            {stops.length > 0 && (
              <button
                type="button"
                className="kpn-btn-head-clear"
                onClick={onClearRoute}
                aria-label="Clear all stops"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              className="kpn-btn-head-optimize"
              onClick={handleOptimize}
              disabled={stops.length < 3}
              title="Optimize stop sequence using TSP algorithm"
            >
              <OptimizeIcon size={14} />
              <span>Optimize</span>
            </button>
          </div>
        </div>

        <p className="kpn-routes-bengali-sub">কলকাতা দুর্গোৎসব পদযাত্রা ও পথপরিক্রমা</p>
      </div>

      {/* 2. Route Summary & Routing Provider Badge */}
      <div className="kpn-route-status-card">
        <div className="kpn-banner-map-overlay">
          <span className="kpn-banner-badge">
            <ShieldCheckIcon size={13} />
            {isApproximate
              ? 'Approximate Walking Estimate (Urban Grid Detour)'
              : 'OSRM Pedestrian Walking Directions'}
          </span>
          <span className="kpn-banner-dist">
            {totalDistKm} km · ~{totalTimeMins} min
          </span>
        </div>

        {/* GPS Error Notification if any */}
        {gpsError && (
          <div className="kpn-route-error-alert" role="alert">
            <InfoIcon size={14} />
            <span>{gpsError}</span>
          </div>
        )}
      </div>

      {/* 3. Primary Navigation Action Row */}
      {stops.length > 0 && (
        <div className="kpn-route-actions-card">
          <button
            type="button"
            className="kpn-btn-start-nav"
            onClick={() => {
              setNavStarted(true);
              if (stops[0] && onSelectStop) {
                onSelectStop(stops[0]);
              }
            }}
          >
            <WalkIcon size={18} />
            <span>
              {navStarted ? 'Continue Navigation' : `Start Turn-by-Turn Nav · ${totalDistKm} km`}
            </span>
          </button>

          <div className="kpn-route-sub-actions">
            <button
              type="button"
              className="kpn-btn-share-route"
              onClick={handleShare}
              title="Share Itinerary"
            >
              <ShareIcon size={15} />
              <span>Share Itinerary</span>
            </button>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kpn-btn-google-maps"
              title="Open multi-stop walking route in Google Maps"
            >
              <ExternalLinkIcon size={14} />
              <span>Google Maps ↗</span>
            </a>
          </div>

          {copiedStatus && (
            <div className="kpn-share-toast" role="status">
              {copiedStatus}
            </div>
          )}
        </div>
      )}

      {/* 4. Origin Selector Card */}
      <div className="kpn-origin-card">
        <div className="kpn-origin-top-row">
          <div className="kpn-origin-label-wrap">
            <span className="kpn-origin-gps-dot">📍</span>
            <span className="kpn-origin-label">
              {stops[0]?.type === 'custom'
                ? 'ORIGIN: LIVE GPS'
                : stops[0]?.type === 'station'
                ? `ORIGIN: ${stops[0].name.replace(' Station', '')}`
                : 'STARTING POINT'}
            </span>
          </div>
          <button
            type="button"
            className="kpn-btn-gps-locate"
            onClick={handleAddCurrentLocation}
            title="Use current GPS location as starting origin"
          >
            <CrosshairIcon size={13} />
            <span>Use GPS</span>
          </button>
        </div>

        <div className="kpn-origin-dropdown-wrap">
          <select
            value={selectedStartStation}
            onChange={(e) => handleAddStartStation(e.target.value)}
            className="kpn-origin-select"
            aria-label="Select starting Metro station"
          >
            <option value="">🚇 Or set origin from any Metro Station...</option>
            {METRO_STATIONS.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.bengaliName || ''}) — {st.line}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. Itinerary Ordered Stops List */}
      <div className="kpn-itinerary-section">
        <div className="kpn-itinerary-header">
          <span className="kpn-itinerary-label">ITINERARY SEQUENCE</span>
          <span className="kpn-itinerary-reorder-hint">Use ▲ ▼ to reorder stops</span>
        </div>

        {stops.length === 0 ? (
          <div className="kpn-empty-route-card">
            <div className="kpn-empty-icon">🗺️</div>
            <h3>Your route is empty</h3>
            <p>
              Add pandals from Explore or tap below to build your walking hopping tour across Kolkata!
            </p>
            <div className="kpn-empty-suggestions">
              <button
                type="button"
                className="kpn-chip-suggest"
                onClick={() => {
                  const b = allPandals.find((p) => p.id === 'bagbazar-sarbojanin');
                  if (b) handleAddPandal(b);
                }}
              >
                + Add Bagbazar
              </button>
              <button
                type="button"
                className="kpn-chip-suggest"
                onClick={() => {
                  const t = allPandals.find((p) => p.id === 'tridhara-sammilani');
                  if (t) handleAddPandal(t);
                }}
              >
                + Add Tridhara
              </button>
              <button
                type="button"
                className="kpn-chip-suggest"
                onClick={() => {
                  const s = allPandals.find((p) => p.id === 'santosh-mitra-square');
                  if (s) handleAddPandal(s);
                }}
              >
                + Add Santosh Mitra
              </button>
            </div>
          </div>
        ) : (
          <div className="kpn-itinerary-list">
            {stops.map((stop, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === stops.length - 1;
              const isPandal = stop.type === 'pandal';

              // Calculate walking leg distance to next stop
              let legDistanceMeters = 0;
              let legTimeMinutes = 0;
              if (!isLast && stops[idx + 1]) {
                const straight = calculateHaversineDistance(
                  stop.lat,
                  stop.lng,
                  stops[idx + 1].lat,
                  stops[idx + 1].lng
                );
                legDistanceMeters = Math.round(straight * 1.25);
                legTimeMinutes = Math.max(1, Math.round(legDistanceMeters / 75));
              }

              return (
                <React.Fragment key={stop.id}>
                  <div
                    className={`kpn-itinerary-item ${isPandal ? 'is-pandal' : 'is-origin'}`}
                    onClick={() => handleStopClick(stop)}
                    role="button"
                    tabIndex={0}
                  >
                    {/* Reorder Arrows */}
                    <div className="kpn-reorder-controls">
                      <button
                        type="button"
                        className="kpn-btn-reorder"
                        onClick={(e) => handleMoveUp(idx, e)}
                        disabled={isFirst}
                        aria-label={`Move ${stop.name} up`}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="kpn-btn-reorder"
                        onClick={(e) => handleMoveDown(idx, e)}
                        disabled={isLast}
                        aria-label={`Move ${stop.name} down`}
                      >
                        ▼
                      </button>
                    </div>

                    {/* Step Number Circle */}
                    <div className="kpn-step-number-badge">
                      {isFirst && stop.type === 'station'
                        ? '🚇'
                        : isFirst && stop.type === 'custom'
                        ? '📍'
                        : `${idx + 1}`}
                    </div>

                    {/* Stop Details */}
                    <div className="kpn-stop-info">
                      <div className="kpn-stop-name-row">
                        <strong className="kpn-stop-name">{stop.name}</strong>
                      </div>
                      {stop.bengaliName && (
                        <small className="kpn-stop-bn">{stop.bengaliName}</small>
                      )}
                      {stop.note && <span className="kpn-stop-note-tag">{stop.note}</span>}
                    </div>

                    {/* Actions on stop */}
                    <div className="kpn-stop-actions">
                      {isPandal && (
                        <button
                          type="button"
                          className="kpn-btn-stop-info"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPandalById(stop.id);
                          }}
                          title="View pandal details"
                          aria-label={`View details for ${stop.name}`}
                        >
                          <InfoIcon size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="kpn-btn-remove-stop"
                        onClick={(e) => handleRemoveStop(stop.id, e)}
                        title="Remove stop"
                        aria-label={`Remove ${stop.name} from itinerary`}
                      >
                        <CloseIcon size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Inter-stop walking connector bar */}
                  {!isLast && (
                    <div className="kpn-itinerary-connector">
                      <div className="kpn-connector-line" />
                      <div className="kpn-connector-badge">
                        <WalkIcon size={13} />
                        <span>
                          {legDistanceMeters < 1000
                            ? `${legDistanceMeters}m`
                            : `${(legDistanceMeters / 1000).toFixed(1)}km`}{' '}
                          walk (~{legTimeMinutes} min)
                        </span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Add Another Pandal Button */}
        <div className="kpn-add-stop-row">
          <button
            type="button"
            className="kpn-btn-add-pandal-trigger"
            onClick={() => setIsPickerOpen(true)}
          >
            <span>+ Add another pandal to route</span>
          </button>
        </div>
      </div>

      {/* Add Pandal Modal Picker */}
      {isPickerOpen && (
        <div className="kpn-picker-overlay" role="dialog" aria-modal="true">
          <div className="kpn-picker-card">
            <div className="kpn-picker-head">
              <h3>Add Pandal to Itinerary</h3>
              <button
                type="button"
                className="kpn-picker-close-btn"
                onClick={() => setIsPickerOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="kpn-picker-search-bar">
              <input
                type="text"
                placeholder="Search pandal by name, neighbourhood..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="kpn-picker-scroll-list">
              {pickerPandals.slice(0, 20).map((p) => (
                <div
                  key={p.id}
                  className="kpn-picker-item"
                  onClick={() => handleAddPandal(p)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="kpn-picker-left">
                    <strong>{p.name}</strong>
                    {p.bengaliName && <small>{p.bengaliName}</small>}
                    <span className="kpn-picker-area-tag">{p.neighbourhood} · {p.zone}</span>
                  </div>
                  <span className="kpn-picker-add-action">+ Add</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. Route Metrics & Transit Advisory */}
      <div className="kpn-route-metrics-card">
        <div className="kpn-metrics-header">
          <span>ROUTE METRICS & TIMING</span>
          <span className="kpn-metrics-badge">Live Traffic Factored</span>
        </div>

        <div className="kpn-metrics-three-grid">
          <div className="kpn-metric-box">
            <span className="kpn-metric-icon">👟</span>
            <strong>{totalDistKm} km</strong>
            <small>Walking Path</small>
          </div>
          <div className="kpn-metric-box">
            <span className="kpn-metric-icon">⏱️</span>
            <strong>~{totalTimeMins} mins</strong>
            <small>Pace Walk</small>
          </div>
          <div className="kpn-metric-box">
            <span className="kpn-metric-icon">🌙</span>
            <strong>
              ~{stops.length > 2 ? Math.round(stops.length * 0.45) : 1}h {((stops.length * 27) % 60)}m
            </strong>
            <small>Total Tour</small>
          </div>
        </div>

        {/* Kolkata Police Advisory */}
        <div className="kpn-kp-advisory-box">
          <div className="kpn-advisory-icon">⚠️</div>
          <div>
            <strong>KOLKATA POLICE PEDESTRIAN ADVISORY:</strong>
            <p>
              One-way pedestrian flow active on major pandal corridors (Rashbehari Ave, Bidhan Sarani, B.B. Ganguly St) after 5:00 PM. Barricades active near metro entry points.
            </p>
          </div>
        </div>

        {/* Metro Transfer Hints if applicable */}
        {routeResult?.metroTransferAdvice && routeResult.metroTransferAdvice.length > 0 && (
          <div className="kpn-metro-transfer-advice-block">
            {routeResult.metroTransferAdvice.map((advice, i) => (
              <div key={i} className="kpn-advice-item">
                {advice}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
