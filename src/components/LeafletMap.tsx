import React, { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Pandal, MetroStation, RouteResult, RouteStop } from '../types';
import { METRO_STATIONS_BY_ID } from '../data/metroStations';

interface LeafletMapProps {
  pandals: Pandal[];
  metroStations: MetroStation[];
  selectedPandal: Pandal | null;
  onSelectPandal: (pandal: Pandal) => void;
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  routeResult: RouteResult | null;
  routeStops: RouteStop[];
  showPandals: boolean;
  showMetro: boolean;
  showRoute: boolean;
  onToggleLayer: (layer: 'pandals' | 'metro' | 'route') => void;
  flyToTarget: { lat: number; lng: number; zoom?: number } | null;
}

// Custom Leaflet Icons
function createPandalIcon(pandal: Pandal, isSelected: boolean) {
  const isTraditional = pandal.category === 'Traditional';
  const isRajbari = pandal.category === 'Heritage Rajbari';

  const badgeColor = isRajbari ? '#9B2226' : isTraditional ? '#C92A2A' : '#D9480F';
  const size = isSelected ? 42 : 32;

  const html = `
    <div class="kpn-marker-pandal ${isSelected ? 'is-selected' : ''}" style="--badge-color: ${badgeColor};">
      <div class="kpn-pandal-pin">
        <span class="kpn-pin-symbol">✦</span>
      </div>
      <div class="kpn-pin-shadow"></div>
    </div>
  `;

  return L.divIcon({
    className: 'kpn-custom-icon',
    html,
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 6)],
  });
}

function createMetroIcon(station: MetroStation, isSelected: boolean) {
  const size = isSelected ? 34 : 26;
  const color =
    station.lineCode === 'green'
      ? '#00875A'
      : station.lineCode === 'purple'
      ? '#7B2CBF'
      : station.lineCode === 'orange'
      ? '#E8590C'
      : '#0062B1';

  const html = `
    <div class="kpn-marker-metro ${isSelected ? 'is-selected' : ''}" style="--line-color: ${color};">
      <span class="kpn-metro-badge">M</span>
    </div>
  `;

  return L.divIcon({
    className: 'kpn-custom-icon',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

function createRouteWaypointIcon(index: number, isStart: boolean, isEnd: boolean) {
  const label = isStart ? 'A' : isEnd ? 'B' : `${index + 1}`;
  const bg = isStart ? '#00875A' : isEnd ? '#C92A2A' : '#D4AF37';

  return L.divIcon({
    className: 'kpn-custom-icon',
    html: `
      <div class="kpn-waypoint-marker" style="background-color: ${bg};">
        <span>${label}</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// Controller to handle programmatic camera flying and fitBounds
function MapCameraController({
  target,
  boundsPoints,
}: {
  target: { lat: number; lng: number; zoom?: number } | null;
  boundsPoints: [number, number][];
}) {
  const map = useMap();
  const prevTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (target) {
      const key = `${target.lat},${target.lng}`;
      if (prevTargetRef.current !== key) {
        prevTargetRef.current = key;
        map.flyTo([target.lat, target.lng], target.zoom || 15, {
          duration: 0.8,
        });
      }
    }
  }, [target, map]);

  return null;
}

export function LeafletMap({
  pandals,
  metroStations,
  selectedPandal,
  onSelectPandal,
  selectedStationId,
  onSelectStation,
  routeResult,
  routeStops,
  showPandals,
  showMetro,
  showRoute,
  onToggleLayer,
  flyToTarget,
}: LeafletMapProps) {
  // Filter pandals with valid numeric coordinates
  const mappedPandals = useMemo(
    () => pandals.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [pandals]
  );

  // Default Kolkata Center
  const defaultCenter: [number, number] = [22.5726, 88.3639];

  return (
    <div className="kpn-map-wrapper">
      {/* Top Floating Controls & Layer Toggles */}
      <div className="kpn-map-floating-bar">
        <div className="kpn-map-stat-chip">
          <span className="kpn-stat-dot" />
          <span>{mappedPandals.length} Pandal Pins</span>
        </div>

        <div className="kpn-layer-toggles">
          <button
            className={`kpn-layer-btn ${showPandals ? 'active' : ''}`}
            onClick={() => onToggleLayer('pandals')}
            title="Toggle pandal pins"
          >
            ✦ Pandals
          </button>
          <button
            className={`kpn-layer-btn ${showMetro ? 'active' : ''}`}
            onClick={() => onToggleLayer('metro')}
            title="Toggle metro station pins"
          >
            M Metro Stops
          </button>
          {routeResult && (
            <button
              className={`kpn-layer-btn ${showRoute ? 'active' : ''}`}
              onClick={() => onToggleLayer('route')}
              title="Toggle pedestrian route line"
            >
              〰 Route Line
            </button>
          )}
        </div>
      </div>

      {/* Main Map Container */}
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        className="kpn-leaflet-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapCameraController target={flyToTarget} boundsPoints={[]} />

        {/* METRO STATIONS LAYER */}
        {showMetro &&
          metroStations.map((station) => (
            <Marker
              key={`station-${station.id}`}
              position={[station.lat, station.lng]}
              icon={createMetroIcon(station, selectedStationId === station.id)}
              eventHandlers={{
                click: () => onSelectStation(station.id),
              }}
            >
              <Popup className="kpn-popup">
                <div className="kpn-popup-content">
                  <div className="kpn-popup-header">
                    <span
                      className="kpn-popup-line-dot"
                      style={{
                        backgroundColor:
                          station.lineCode === 'green'
                            ? '#00875A'
                            : station.lineCode === 'purple'
                            ? '#7B2CBF'
                            : station.lineCode === 'orange'
                            ? '#E8590C'
                            : '#0062B1',
                      }}
                    />
                    <strong>{station.name} Metro</strong>
                  </div>
                  {station.bengaliName && <small className="kpn-popup-bengali">{station.bengaliName}</small>}
                  <p className="kpn-popup-sub">{station.line} · {station.zone} Zone</p>
                  <button
                    className="kpn-popup-action-btn"
                    onClick={() => onSelectStation(station.id)}
                  >
                    Filter Nearby Pandals ➔
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* PANDALS LAYER */}
        {showPandals &&
          mappedPandals.map((pandal) => {
            const isSelected = selectedPandal?.id === pandal.id;
            const station = pandal.nearestStationId
              ? METRO_STATIONS_BY_ID[pandal.nearestStationId]
              : null;

            return (
              <Marker
                key={`pandal-${pandal.id}`}
                position={[pandal.lat!, pandal.lng!]}
                icon={createPandalIcon(pandal, isSelected)}
                eventHandlers={{
                  click: () => onSelectPandal(pandal),
                }}
              >
                <Popup className="kpn-popup">
                  <div className="kpn-popup-content">
                    <div className="kpn-popup-pandal-title">
                      <strong>{pandal.name}</strong>
                      {pandal.bengaliName && (
                        <small className="kpn-popup-bengali">{pandal.bengaliName}</small>
                      )}
                    </div>
                    <div className="kpn-popup-tags">
                      <span className="kpn-popup-cat">{pandal.category}</span>
                      <span className="kpn-popup-area">{pandal.neighbourhood}</span>
                    </div>
                    {station && (
                      <div className="kpn-popup-walk">
                        <span>🚇 Nearest: {station.name}</span>
                        {pandal.walkingDistanceMeters && (
                          <span>
                            ({pandal.walkingDistanceMeters < 1000
                              ? `${pandal.walkingDistanceMeters}m`
                              : `${(pandal.walkingDistanceMeters / 1000).toFixed(1)}km`})
                          </span>
                        )}
                      </div>
                    )}
                    <button
                      className="kpn-popup-action-btn"
                      onClick={() => onSelectPandal(pandal)}
                    >
                      View Full Details & Directions ➔
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* ROUTE WALKING POLYLINE */}
        {showRoute && routeResult && routeResult.coordinates.length > 1 && (
          <>
            {/* Outer glow stroke */}
            <Polyline
              positions={routeResult.coordinates}
              pathOptions={{
                color: '#D4AF37',
                weight: 8,
                opacity: 0.5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Inner vibrant stroke */}
            <Polyline
              positions={routeResult.coordinates}
              pathOptions={{
                color: '#C92A2A',
                weight: 4,
                opacity: 0.9,
                dashArray: '6, 8',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* ROUTE WAYPOINT MARKERS */}
        {showRoute &&
          routeStops.map((stop, sIdx) => (
            <Marker
              key={`waypoint-${stop.id}`}
              position={[stop.lat, stop.lng]}
              icon={createRouteWaypointIcon(
                sIdx,
                sIdx === 0,
                sIdx === routeStops.length - 1
              )}
            >
              <Popup className="kpn-popup">
                <div className="kpn-popup-content">
                  <strong>
                    {sIdx === 0 ? 'Route Start: ' : `Stop #${sIdx + 1}: `}
                    {stop.name}
                  </strong>
                  {stop.note && <small className="kpn-popup-sub">{stop.note}</small>}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Floating Bottom Left Legend */}
      <div className="kpn-map-legend">
        <div className="kpn-legend-item">
          <span className="kpn-legend-pandal-icon">✦</span>
          <span>Durga Pandal</span>
        </div>
        <div className="kpn-legend-item">
          <span className="kpn-legend-metro-icon">M</span>
          <span>Metro Station</span>
        </div>
        {routeResult && (
          <div className="kpn-legend-item">
            <span className="kpn-legend-route-line" />
            <span>Walking Route</span>
          </div>
        )}
      </div>

      {/* Bottom Right Attribution / City Note */}
      <div className="kpn-map-city-tag">
        <span>📍 Kolkata, West Bengal</span>
      </div>
    </div>
  );
}
