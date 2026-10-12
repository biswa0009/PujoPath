import React, { useState } from 'react';
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
  const [copiedStatus, setCopiedStatus] = useState<string>('');

  // Add starting Metro station
  const handleAddStartStation = (stationId: string) => {
    if (!stationId) return;
    const st = METRO_STATIONS.find((s) => s.id === stationId);
    if (!st) return;

    // Check if station is already first stop
    const newStop: RouteStop = {
      id: `station-${st.id}-${Date.now()}`,
      type: 'station',
      name: `${st.name} Metro (${st.line})`,
      bengaliName: st.bengaliName,
      lat: st.lat,
      lng: st.lng,
      stationId: st.id,
      note: 'Starting Metro transit stop',
    };

    // Prepend as start stop
    onUpdateStops([newStop, ...stops]);
    setSelectedStartStation('');
  };

  // Add user's current GPS location
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
          name: 'My Current Location 📍',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          note: 'Starting from current GPS location',
        };
        onUpdateStops([newStop, ...stops]);
      },
      (err) => {
        alert(`Could not acquire GPS position: ${err.message}`);
      },
      { timeout: 8000 }
    );
  };

  // Move stop up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const copy = [...stops];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    onUpdateStops(copy);
  };

  // Move stop down
  const handleMoveDown = (index: number) => {
    if (index >= stops.length - 1) return;
    const copy = [...stops];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    onUpdateStops(copy);
  };

  // Remove stop
  const handleRemove = (index: number) => {
    const copy = stops.filter((_, i) => i !== index);
    onUpdateStops(copy);
  };

  // Optimize stop order via TSP
  const handleOptimize = () => {
    if (stops.length <= 2) return;
    const optimized = optimizeRouteOrder(stops);
    onUpdateStops(optimized);
  };

  // Copy shareable summary
  const handleShare = () => {
    const lines = [
      '🗺️ Kolkata Puja Navigator — My Pandal Hopping Plan',
      '-----------------------------------------------',
      ...stops.map((s, i) => `${i + 1}. ${s.name}`),
      '',
    ];

    if (routeResult) {
      lines.push(
        `Total Walking: ${(routeResult.totalDistanceMeters / 1000).toFixed(1)} km (~${
          routeResult.totalTimeMinutes
        } min)`
      );
    }

    lines.push('', `Google Maps Navigation: ${getGoogleMapsDirectionsUrl(stops)}`);

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedStatus('Itinerary copied to clipboard!');
      setTimeout(() => setCopiedStatus(''), 3000);
    });
  };

  return (
    <div className="kpn-planner-view">
      <div className="kpn-planner-header">
        <h2 className="kpn-section-title">Pandal-Hopping Route Planner</h2>
        <p className="kpn-section-desc">
          Build and optimize your personalized Durga Puja itinerary. Calculate pedestrian
          walking routes and smart Metro connections.
        </p>
      </div>

      {/* Starting point selector */}
      <div className="kpn-planner-start-box">
        <label className="kpn-planner-label">Set Starting Point</label>
        <div className="kpn-start-controls">
          <select
            value={selectedStartStation}
            onChange={(e) => {
              setSelectedStartStation(e.target.value);
              handleAddStartStation(e.target.value);
            }}
            aria-label="Add starting Metro station"
          >
            <option value="">+ Add Starting Metro Station...</option>
            {METRO_STATIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.line})
              </option>
            ))}
          </select>

          <button
            onClick={handleAddCurrentLocation}
            className="kpn-gps-btn"
            title="Use current GPS location as starting point"
          >
            📍 Use My GPS
          </button>
        </div>
      </div>

      {/* List of stops */}
      <div className="kpn-stops-container">
        <div className="kpn-stops-header">
          <span className="kpn-stops-count">
            {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'} in Itinerary
          </span>
          <div className="kpn-stops-header-actions">
            {stops.length >= 3 && (
              <button
                onClick={handleOptimize}
                className="kpn-optimize-btn"
                title="Reorder stops to minimize walking distance"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                Optimize Order
              </button>
            )}
            {stops.length > 0 && (
              <button onClick={onClearRoute} className="kpn-clear-btn" title="Clear all stops">
                Clear All
              </button>
            )}
          </div>
        </div>

        {stops.length === 0 ? (
          <div className="kpn-empty-planner">
            <span className="kpn-empty-glyph">🚶‍♂️</span>
            <p>Your hopping route is empty.</p>
            <small>
              Click <b>"+ Hop"</b> on any pandal in the directory or select a starting Metro
              station above to construct your tour.
            </small>
          </div>
        ) : (
          <div className="kpn-stops-list">
            {stops.map((stop, index) => (
              <div key={stop.id} className="kpn-stop-item">
                <span className="kpn-stop-badge">
                  {index === 0 ? 'START' : String(index + 1).padStart(2, '0')}
                </span>

                <div className="kpn-stop-info">
                  <strong className="kpn-stop-title">{stop.name}</strong>
                  {stop.bengaliName && <small className="kpn-stop-bengali">{stop.bengaliName}</small>}
                  {stop.note && <span className="kpn-stop-note">{stop.note}</span>}
                </div>

                <div className="kpn-stop-reorder">
                  <button
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    className="kpn-order-btn"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    disabled={index === stops.length - 1}
                    onClick={() => handleMoveDown(index)}
                    className="kpn-order-btn"
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => handleRemove(index)}
                    className="kpn-remove-stop-btn"
                    title="Remove stop"
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Route Calculation Button & Results */}
      {stops.length >= 2 && (
        <div className="kpn-route-actions-block">
          <button
            onClick={onRequestCalculateRoute}
            disabled={isLoadingRoute}
            className="kpn-calc-route-btn"
          >
            <RouteIcon className="w-4 h-4" />
            {isLoadingRoute ? 'Calculating Pedestrian Route...' : 'Calculate Pedestrian Route on Map'}
          </button>

          {/* Route Summary metrics */}
          {routeResult && (
            <div className="kpn-route-summary-card">
              <div className="kpn-summary-row">
                <div className="kpn-summary-stat">
                  <WalkIcon className="w-5 h-5 text-gold" />
                  <div>
                    <small>TOTAL WALKING</small>
                    <b>{(routeResult.totalDistanceMeters / 1000).toFixed(1)} km</b>
                  </div>
                </div>

                <div className="kpn-summary-stat">
                  <span className="kpn-clock-icon text-vermilion">⏱</span>
                  <div>
                    <small>EST. WALKING TIME</small>
                    <b>~{routeResult.totalTimeMinutes} min</b>
                  </div>
                </div>

                <div className="kpn-summary-stat">
                  <span className="kpn-source-tag">
                    {routeResult.source === 'osrm' ? 'OSRM Foot Routing' : 'Estimated Fallback'}
                  </span>
                </div>
              </div>

              {/* Metro Transfer Tips */}
              {routeResult.metroTransferAdvice && routeResult.metroTransferAdvice.length > 0 && (
                <div className="kpn-metro-tips-box">
                  {routeResult.metroTransferAdvice.map((tip, idx) => (
                    <div key={idx} className="kpn-metro-tip-item">
                      {tip}
                    </div>
                  ))}
                </div>
              )}

              {/* Leg-by-leg Walk Directions */}
              {routeResult.legs && routeResult.legs.length > 0 && (
                <div className="kpn-legs-accordion">
                  <h4 className="kpn-legs-title">Turn-by-Turn Leg Overview:</h4>
                  {routeResult.legs.map((leg, lIdx) => (
                    <div key={lIdx} className="kpn-leg-card">
                      <div className="kpn-leg-head">
                        <strong>
                          Leg {lIdx + 1}: {leg.fromName} ➔ {leg.toName}
                        </strong>
                        <span className="kpn-leg-metric">
                          {leg.distanceMeters < 1000
                            ? `${leg.distanceMeters}m`
                            : `${(leg.distanceMeters / 1000).toFixed(1)}km`}{' '}
                          (~{leg.timeMinutes} min)
                        </span>
                      </div>
                      <ul className="kpn-leg-instructions">
                        {leg.instructions.slice(0, 3).map((ins, iIdx) => (
                          <li key={iIdx}>{ins}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* External Share and Navigation */}
              <div className="kpn-summary-actions">
                <a
                  href={getGoogleMapsDirectionsUrl(stops)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kpn-gmaps-turn-btn"
                >
                  Open Turn-by-Turn in Google Maps
                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                </a>

                <button onClick={handleShare} className="kpn-share-itinerary-btn">
                  <ShareIcon className="w-3.5 h-3.5" />
                  {copiedStatus || 'Copy Itinerary'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
