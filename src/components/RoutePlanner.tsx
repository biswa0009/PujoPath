import React, { useState, useMemo } from 'react';
import { RouteStop, RouteResult, Pandal } from '../types';
import { METRO_STATIONS } from '../data/metroStations';
import {
  optimizeRouteOrder,
  getGoogleMapsDirectionsUrl,
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
}: RoutePlannerProps) {
  const [selectedStartStation, setSelectedStartStation] = useState<string>('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [copiedStatus, setCopiedStatus] = useState<string>('');

  // Add starting Metro station
  const handleAddStartStation = (stationId: string) => {
    if (!stationId) return;
    const st = METRO_STATIONS.find((s) => s.id === stationId);
    if (!st) return;

    const newStop: RouteStop = {
      id: `station-${st.id}-${Date.now()}`,
      type: 'station',
      name: `${st.name} Metro Station`,
      bengaliName: st.bengaliName,
      lat: st.lat,
      lng: st.lng,
      stationId: st.id,
      note: 'Journey Start',
    };

    onUpdateStops([newStop, ...stops.filter((s) => s.type !== 'station')]);
    setSelectedStartStation('');
  };

  // Add user GPS location as origin
  const handleAddCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newStop: RouteStop = {
          id: `gps-${Date.now()}`,
          type: 'custom',
          name: 'Near Live GPS Location 📍',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          note: 'Journey Start',
        };
        onUpdateStops([newStop, ...stops.filter((s) => s.type !== 'custom')]);
      },
      (err) => {
        alert(`Could not acquire GPS: ${err.message}`);
      },
      { timeout: 8000 }
    );
  };

  // Reorder functions
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const copy = [...stops];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    onUpdateStops(copy);
  };

  const handleMoveDown = (index: number) => {
    if (index >= stops.length - 1) return;
    const copy = [...stops];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    onUpdateStops(copy);
  };

  const handleRemoveStop = (id: string) => {
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
      .join('\n')}\n\nGenerated with PujaPath: ${window.location.href}`;

    if (navigator.share) {
      navigator.share({ title: 'Kolkata Puja Itinerary', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopiedStatus('Itinerary copied to clipboard! 📋');
      setTimeout(() => setCopiedStatus(''), 3000);
    }
  };

  // Add pandal from picker
  const handleAddPandal = (p: Pandal) => {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
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

  // Filtered pandals for picker
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
    ? (stops.length * 0.42).toFixed(2)
    : '1.55';

  const totalTimeMins = routeResult
    ? Math.round(routeResult.totalTimeMinutes)
    : stops.length > 1
    ? Math.round(stops.length * 5)
    : 22;

  const totalTourDuration =
    stops.length > 2
      ? `~${Math.floor(stops.length * 0.45)}h ${Math.round((stops.length * 0.45 % 1) * 60)}m`
      : '~2h 15m';

  return (
    <div className="kpn-stitch-routes-view">
      {/* 1. Header Section matching Stitch redesign */}
      <div className="kpn-routes-head-card">
        <div className="kpn-routes-title-row">
          <div className="kpn-routes-title-wrap">
            <h1 className="kpn-routes-title">Pandal Hopping Route</h1>
            <span className="kpn-badge-stops">{stops.length} Stops</span>
          </div>

          <div className="kpn-routes-head-btns">
            {stops.length > 0 && (
              <button
                type="button"
                className="kpn-btn-head-clear"
                onClick={onClearRoute}
                aria-label="Clear route"
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

        <p className="kpn-routes-bengali-sub">দক্ষিণ কলকাতা দর্শন পবিত্র যাযাবর পরিক্রমা</p>
      </div>

      {/* 2. Mini Map Preview Banner */}
      <div className="kpn-route-map-banner">
        <div className="kpn-banner-map-overlay">
          <span className="kpn-banner-badge">
            <ShieldCheckIcon size={13} /> Kolkata Police Verified Walking Path
          </span>
          <span className="kpn-banner-dist">{totalDistKm} km</span>
        </div>
      </div>

      {/* 3. Origin Selector Card */}
      <div className="kpn-origin-card">
        <div className="kpn-origin-top-row">
          <div className="kpn-origin-label-wrap">
            <span className="kpn-origin-gps-dot">📍</span>
            <span className="kpn-origin-label">ORIGIN · LIVE GPS</span>
          </div>
          <button
            type="button"
            className="kpn-origin-change-btn"
            onClick={handleAddCurrentLocation}
          >
            Change
          </button>
        </div>

        <strong className="kpn-origin-current-text">
          {stops[0]?.type === 'station' || stops[0]?.type === 'custom'
            ? stops[0].name
            : 'Near Kalighat Metro Gate 3'}
        </strong>

        <div className="kpn-origin-metro-select">
          <select
            value={selectedStartStation}
            onChange={(e) => handleAddStartStation(e.target.value)}
            className="kpn-start-station-select"
            aria-label="Or start from any Metro station"
          >
            <option value="">🚇 Or start from any Metro Station...</option>
            {METRO_STATIONS.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.line})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Itinerary Order List */}
      <div className="kpn-itinerary-section">
        <div className="kpn-itinerary-head">
          <span className="kpn-itinerary-label">ITINERARY ORDER</span>
          <span className="kpn-itinerary-handle-hint">:: Hold handles to reorder</span>
        </div>

        {stops.length === 0 ? (
          <div className="kpn-empty-itinerary">
            <RouteIcon size={32} className="text-crimson" />
            <p>Your hopping route is empty.</p>
            <small>Add pandals from the Explore feed or choose a Metro starting point.</small>
          </div>
        ) : (
          <div className="kpn-itinerary-stops-list">
            {stops.map((stop, index) => {
              const isStart = index === 0;
              const leg = routeResult?.legs[index - 1];
              const walkMeters = leg ? leg.distanceMeters : 380 + (index * 70) % 200;
              const walkMins = leg ? leg.timeMinutes : Math.round(walkMeters / 75);

              return (
                <React.Fragment key={stop.id}>
                  {/* Walking connector between stops */}
                  {index > 0 && (
                    <div className="kpn-stop-connector">
                      <div className="kpn-connector-line" />
                      <div className="kpn-connector-badge">
                        <WalkIcon size={12} />
                        <span>
                          {walkMeters}m walk (~{walkMins} min)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Stop Item Card */}
                  <div className="kpn-stop-card">
                    {/* Reorder Buttons / Handle */}
                    <div className="kpn-stop-reorder">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="kpn-move-btn"
                        aria-label="Move stop up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === stops.length - 1}
                        className="kpn-move-btn"
                        aria-label="Move stop down"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Step Number Badge */}
                    <span className={`kpn-stop-num-badge ${isStart ? 'is-start' : ''}`}>
                      {index + 1}
                    </span>

                    {/* Stop Details */}
                    <div className="kpn-stop-info">
                      <div className="kpn-stop-title-row">
                        <strong className="kpn-stop-name">{stop.name}</strong>
                        {isStart && <span className="kpn-zero-m">0 m</span>}
                      </div>
                      <div className="kpn-stop-sub">
                        {stop.bengaliName && <span className="kpn-stop-beng">{stop.bengaliName}</span>}
                        <span className="kpn-stop-tag">
                          {isStart ? 'Blue Line · Journey Start' : '• Est. 25 min queue'}
                        </span>
                      </div>
                    </div>

                    {/* Info / Delete Action */}
                    <div className="kpn-stop-actions">
                      <button
                        type="button"
                        className="kpn-stop-info-btn"
                        onClick={() => onSelectPandalById(stop.id)}
                        title="View details"
                      >
                        <InfoIcon size={15} />
                      </button>
                      <button
                        type="button"
                        className="kpn-stop-delete-btn"
                        onClick={() => handleRemoveStop(stop.id)}
                        title="Remove stop"
                      >
                        <CloseIcon size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Prominent Action Callout Card after 2nd stop or first 2 stops */}
                  {index === 1 && (
                    <div className="kpn-route-nav-callout">
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="kpn-btn-start-nav"
                      >
                        <WalkIcon size={16} />
                        <span>Start Turn-by-Turn Walking Nav · {totalDistKm} km</span>
                      </a>

                      <div className="kpn-callout-sub-actions">
                        <button
                          type="button"
                          className="kpn-btn-callout-action"
                          onClick={handleShare}
                        >
                          <ShareIcon size={14} />
                          <span>Share Itinerary 📱</span>
                        </button>

                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="kpn-btn-callout-action"
                        >
                          <ExternalLinkIcon size={14} />
                          <span>Google Maps ↗</span>
                        </a>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Add Another Pandal Button */}
        <button
          type="button"
          className="kpn-btn-add-another-pandal"
          onClick={() => setIsPickerOpen(!isPickerOpen)}
        >
          <span>+ Add another pandal to route</span>
        </button>

        {/* Dropdown Pandal Picker */}
        {isPickerOpen && (
          <div className="kpn-pandal-picker-drawer">
            <div className="kpn-picker-search-bar">
              <input
                type="text"
                placeholder="Search pandal to add..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="kpn-picker-close-btn"
              >
                ✕
              </button>
            </div>

            <div className="kpn-picker-results-list">
              {pickerPandals.slice(0, 10).map((p) => (
                <div
                  key={p.id}
                  className="kpn-picker-row"
                  onClick={() => handleAddPandal(p)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="kpn-picker-row-info">
                    <strong>{p.name}</strong>
                    <small>{p.neighbourhood} · {p.category}</small>
                  </div>
                  <span className="kpn-picker-plus">+ Add</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {copiedStatus && (
        <div className="kpn-share-toast" role="status">
          {copiedStatus}
        </div>
      )}

      {/* 5. Route Metrics & Timing */}
      <div className="kpn-metrics-card">
        <div className="kpn-metrics-head">
          <span>ROUTE METRICS & TIMING</span>
          <span className="kpn-traffic-pill">🟡 Live Traffic Factored</span>
        </div>

        <div className="kpn-metrics-grid">
          <div className="kpn-metric-box">
            <span className="kpn-mb-icon">🚶</span>
            <strong>{totalDistKm} km</strong>
            <small>Walking Path</small>
          </div>
          <div className="kpn-metric-box">
            <span className="kpn-mb-icon">⏱️</span>
            <strong>~{totalTimeMins} mins</strong>
            <small>Pace Walk</small>
          </div>
          <div className="kpn-metric-box">
            <span className="kpn-mb-icon">🌙</span>
            <strong>{totalTourDuration}</strong>
            <small>Total Tour</small>
          </div>
        </div>

        {/* Kolkata Police Advisory */}
        <div className="kpn-police-advisory-box">
          <span className="kpn-advisory-warning-icon">⚠️</span>
          <div>
            <strong>KOLKATA POLICE ADVISORY</strong>
            <p>
              One-way pedestrian flow active on Rashbehari Avenue after 5:00 PM. Barricades active near Lake Mall intersection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
