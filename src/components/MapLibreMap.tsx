import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Pandal, MetroStation, RouteResult, RouteStop } from '../types';
import { METRO_STATIONS_BY_ID } from '../data/metroStations';

interface MapLibreMapProps {
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
  onNearbyFound?: (count: number) => void;
}

// Configurable OpenFreeMap vector style URL
const DEFAULT_STYLE_URL =
  (import.meta.env?.VITE_MAP_STYLE_URL as string) ||
  'https://tiles.openfreemap.org/styles/liberty';

// Helper to create a GeoJSON circle polygon for GPS accuracy
function createGeoJsonCircle(center: [number, number], radiusInMeters: number, points = 64) {
  const [lng, lat] = center;
  const coords: [number, number][] = [];
  const km = radiusInMeters / 1000;
  const distanceX = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

export function MapLibreMap({
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
  onNearbyFound,
}: MapLibreMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapStyleUrl, setMapStyleUrl] = useState(DEFAULT_STYLE_URL);

  // User Geolocation State
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Marker storage refs to clean up without full map teardown
  const pandalMarkersRef = useRef<maplibregl.Marker[]>([]);
  const metroMarkersRef = useRef<maplibregl.Marker[]>([]);
  const waypointMarkersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker[]>([]);

  // 1. Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Kolkata Center: [lng, lat]
    const kolkataCenter: [number, number] = [88.3639, 22.5726];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyleUrl,
      center: kolkataCenter,
      zoom: 12.5,
      minZoom: 9,
      maxZoom: 19,
      attributionControl: false, // Custom attribution rendered in UI
    });

    // Add navigation controls (zoom + pitch)
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    map.on('load', () => {
      setIsMapLoaded(true);

      // Add source & layers for walking route line
      map.addSource('route-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Route underlay glow
      map.addLayer({
        id: 'route-glow-layer',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#D4AF37',
          'line-width': 8,
          'line-opacity': 0.55,
        },
      });

      // Route dashed center line
      map.addLayer({
        id: 'route-line-layer',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#C92A2A',
          'line-width': 4,
          'line-dasharray': [2, 2],
          'line-opacity': 0.95,
        },
      });

      // User location accuracy circle source & layers
      map.addSource('user-accuracy-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.addLayer({
        id: 'user-accuracy-fill',
        type: 'fill',
        source: 'user-accuracy-source',
        paint: {
          'fill-color': '#0062B1',
          'fill-opacity': 0.15,
        },
      });

      map.addLayer({
        id: 'user-accuracy-stroke',
        type: 'line',
        source: 'user-accuracy-source',
        paint: {
          'line-color': '#0062B1',
          'line-width': 1.5,
          'line-opacity': 0.6,
        },
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [mapStyleUrl]);

  // Resize map when window or container size changes
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 300);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [selectedPandal]);

  // 2. Camera flyTo handler
  useEffect(() => {
    if (!mapRef.current || !flyToTarget) return;
    mapRef.current.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: flyToTarget.zoom || 15.5,
      essential: true,
      duration: 1200,
    });
  }, [flyToTarget]);

  // 3. Render Pandal Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    // Remove existing pandal markers
    pandalMarkersRef.current.forEach((m) => m.remove());
    pandalMarkersRef.current = [];

    if (!showPandals) return;

    const mapped = pandals.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    mapped.forEach((pandal) => {
      const isSelected = selectedPandal?.id === pandal.id;
      const station = pandal.nearestStationId
        ? METRO_STATIONS_BY_ID[pandal.nearestStationId]
        : null;

      const isTraditional = pandal.category === 'Traditional';
      const isRajbari = pandal.category === 'Heritage Rajbari';
      const badgeColor = isRajbari ? '#9B2226' : isTraditional ? '#C92A2A' : '#D9480F';

      // Custom HTML Marker Element
      const el = document.createElement('div');
      el.className = `kpn-marker-pandal ${isSelected ? 'is-selected' : ''}`;
      el.style.setProperty('--badge-color', badgeColor);
      el.innerHTML = `
        <div class="kpn-pandal-pin">
          <span class="kpn-pin-symbol">✦</span>
        </div>
        <div class="kpn-pin-shadow"></div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectPandal(pandal);
      });

      // Popup
      const popupHtml = `
        <div class="kpn-popup-content">
          <div class="kpn-popup-pandal-title">
            <strong>${pandal.name}</strong>
            ${pandal.bengaliName ? `<small class="kpn-popup-bengali">${pandal.bengaliName}</small>` : ''}
          </div>
          <div class="kpn-popup-tags">
            <span class="kpn-popup-cat">${pandal.category}</span>
            <span class="kpn-popup-area">${pandal.neighbourhood}</span>
          </div>
          ${
            station
              ? `<div class="kpn-popup-walk">
                  <span>🚇 Nearest: ${station.name}</span>
                  ${
                    pandal.walkingDistanceMeters
                      ? `<span>(${
                          pandal.walkingDistanceMeters < 1000
                            ? `${pandal.walkingDistanceMeters}m`
                            : `${(pandal.walkingDistanceMeters / 1000).toFixed(1)}km`
                        })</span>`
                      : ''
                  }
                </div>`
              : ''
          }
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: [0, -32], closeButton: false }).setHTML(
        popupHtml
      );

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([pandal.lng!, pandal.lat!])
        .setPopup(popup)
        .addTo(map);

      pandalMarkersRef.current.push(marker);
    });
  }, [pandals, selectedPandal, showPandals, isMapLoaded, onSelectPandal]);

  // 4. Render Metro Station Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    // Clean old metro markers
    metroMarkersRef.current.forEach((m) => m.remove());
    metroMarkersRef.current = [];

    if (!showMetro) return;

    metroStations.forEach((station) => {
      const isSelected = selectedStationId === station.id;
      const color =
        station.lineCode === 'green'
          ? '#00875A'
          : station.lineCode === 'purple'
          ? '#7B2CBF'
          : station.lineCode === 'orange'
          ? '#E8590C'
          : '#0062B1';

      const el = document.createElement('div');
      el.className = `kpn-marker-metro ${isSelected ? 'is-selected' : ''}`;
      el.style.setProperty('--line-color', color);
      el.innerHTML = `<span class="kpn-metro-badge">M</span>`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectStation(station.id);
      });

      const popupHtml = `
        <div class="kpn-popup-content">
          <div class="kpn-popup-header">
            <span class="kpn-popup-line-dot" style="background-color: ${color};"></span>
            <strong>${station.name} Metro</strong>
          </div>
          ${station.bengaliName ? `<small class="kpn-popup-bengali">${station.bengaliName}</small>` : ''}
          <p class="kpn-popup-sub">${station.line} · ${station.zone} Zone</p>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: [0, -18], closeButton: false }).setHTML(
        popupHtml
      );

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([station.lng, station.lat])
        .setPopup(popup)
        .addTo(map);

      metroMarkersRef.current.push(marker);
    });
  }, [metroStations, selectedStationId, showMetro, isMapLoaded, onSelectStation]);

  // 5. Update Walking Route Polyline & Waypoint Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    // Update GeoJSON Route Line Source
    const source = map.getSource('route-source') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      if (showRoute && routeResult && routeResult.coordinates.length > 1) {
        // Convert [lat, lng] to GeoJSON [lng, lat]
        const lineCoords = routeResult.coordinates.map(([lat, lng]) => [lng, lat]);
        source.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: lineCoords,
              },
              properties: {},
            },
          ],
        });
      } else {
        source.setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    }

    // Waypoint Markers
    waypointMarkersRef.current.forEach((m) => m.remove());
    waypointMarkersRef.current = [];

    if (showRoute && routeStops.length > 0) {
      routeStops.forEach((stop, idx) => {
        const isStart = idx === 0;
        const isEnd = idx === routeStops.length - 1;
        const label = isStart ? 'A' : isEnd ? 'B' : `${idx + 1}`;
        const bg = isStart ? '#00875A' : isEnd ? '#C92A2A' : '#D4AF37';

        const el = document.createElement('div');
        el.className = 'kpn-waypoint-marker';
        el.style.backgroundColor = bg;
        el.innerHTML = `<span>${label}</span>`;

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([stop.lng, stop.lat])
          .addTo(map);

        waypointMarkersRef.current.push(marker);
      });
    }
  }, [routeResult, routeStops, showRoute, isMapLoaded]);

  // 6. User GPS Location Marker & Accuracy Circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    // Clear old user marker
    userMarkerRef.current.forEach((m) => m.remove());
    userMarkerRef.current = [];

    const accuracySource = map.getSource(
      'user-accuracy-source'
    ) as maplibregl.GeoJSONSource | undefined;

    if (userLocation) {
      // Create accuracy polygon
      if (accuracySource) {
        const circle = createGeoJsonCircle(
          [userLocation.lng, userLocation.lat],
          Math.max(userLocation.accuracy, 30)
        );
        accuracySource.setData({
          type: 'FeatureCollection',
          features: [circle],
        });
      }

      // Create animated pulsing blue dot marker
      const el = document.createElement('div');
      el.className = 'kpn-user-location-marker';
      el.innerHTML = `
        <div class="kpn-user-dot"></div>
        <div class="kpn-user-pulse"></div>
      `;

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);

      userMarkerRef.current.push(marker);
    } else {
      if (accuracySource) {
        accuracySource.setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    }
  }, [userLocation, isMapLoaded]);

  // 7. Locate Me Click Handler
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        const newLoc = { lat: latitude, lng: longitude, accuracy };
        setUserLocation(newLoc);

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 15.5,
            duration: 1200,
            essential: true,
          });
        }

        // Count nearby pandals within 1.5 km
        const nearby = pandals.filter((p) => {
          if (!p.lat || !p.lng) return false;
          const dLat = (p.lat - latitude) * 111.32;
          const dLng = (p.lng - longitude) * 110.57 * Math.cos((latitude * Math.PI) / 180);
          return Math.sqrt(dLat * dLat + dLng * dLng) <= 1.5;
        });

        if (onNearbyFound) {
          onNearbyFound(nearby.length);
        }
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission was denied. Please allow GPS access in browser.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('GPS signal unavailable. Please ensure location services are enabled.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again.');
            break;
          default:
            setLocationError('Could not determine current location.');
            break;
        }
        setTimeout(() => setLocationError(null), 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [pandals, onNearbyFound]);

  // 8. Reset to Kolkata Center
  const handleResetView = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [88.3639, 22.5726],
      zoom: 12.5,
      pitch: 0,
      bearing: 0,
      duration: 1000,
    });
  }, []);

  return (
    <div className="kpn-map-wrapper">
      {/* Top Floating Controls & Layer Toggles */}
      <div className="kpn-map-floating-bar">
        <div className="kpn-map-stat-chip">
          <span className="kpn-stat-dot" />
          <span>
            {pandals.filter((p) => Number.isFinite(p.lat)).length} OpenStreetMap Pins
          </span>
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
            title="Toggle Metro station pins"
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

      {/* Floating Locate Me and Reset Controls */}
      <div className="kpn-map-floating-actions">
        <button
          className={`kpn-map-action-btn ${isLocating ? 'is-loading' : ''} ${
            userLocation ? 'is-active' : ''
          }`}
          onClick={handleLocateMe}
          title="Locate Me (Show my real position & nearby pandals)"
          aria-label="Locate Me"
        >
          {isLocating ? (
            <span className="kpn-spinner" />
          ) : (
            <span className="kpn-crosshair-icon">⌖</span>
          )}
          <span className="kpn-action-text">{isLocating ? 'Locating...' : 'Locate Me'}</span>
        </button>

        <button
          className="kpn-map-action-btn"
          onClick={handleResetView}
          title="Reset map view to central Kolkata"
          aria-label="Reset Map View"
        >
          <span>↺</span>
          <span className="kpn-action-text">Reset View</span>
        </button>

        {/* Style Selector */}
        <select
          value={mapStyleUrl}
          onChange={(e) => setMapStyleUrl(e.target.value)}
          className="kpn-style-selector"
          aria-label="Select vector map style"
        >
          <option value="https://tiles.openfreemap.org/styles/liberty">Liberty Style</option>
          <option value="https://tiles.openfreemap.org/styles/bright">Bright Style</option>
          <option value="https://tiles.openfreemap.org/styles/positron">Positron (Light)</option>
        </select>
      </div>

      {/* Location Error Toast */}
      {locationError && (
        <div className="kpn-location-error-toast" role="alert">
          <span>⚠️ {locationError}</span>
          <button onClick={() => setLocationError(null)}>×</button>
        </div>
      )}

      {/* MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="kpn-maplibre-container" />

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
        {userLocation && (
          <div className="kpn-legend-item">
            <span className="kpn-legend-user-dot" />
            <span>My Location</span>
          </div>
        )}
        {routeResult && (
          <div className="kpn-legend-item">
            <span className="kpn-legend-route-line" />
            <span>Walking Route</span>
          </div>
        )}
      </div>

      {/* Documented OpenFreeMap & OpenStreetMap Attribution */}
      <div className="kpn-map-attribution">
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">
          OpenFreeMap
        </a>
        <span>·</span>
        <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">
          © OpenMapTiles
        </a>
        <span>·</span>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          © OpenStreetMap contributors
        </a>
      </div>
    </div>
  );
}
