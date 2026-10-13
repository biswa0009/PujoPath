import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Pandal, MetroStation, RouteResult, RouteStop } from '../types';
import { METRO_STATIONS_BY_ID } from '../data/metroStations';
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE, FEATURED_MARKER_STYLE } from '../data/categoryMeta';

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
  onSelectRouteStop?: (stop: RouteStop) => void;
  onMapBackgroundClick?: () => void;
}


// MapLibre Web Worker URL
if (maplibregl.config) {
  maplibregl.config.WORKER_URL = '/maplibre-gl-worker.mjs';
}

const DEFAULT_STYLE_URL =
  (import.meta.env?.VITE_MAP_STYLE_URL as string) ||
  'https://tiles.openfreemap.org/styles/liberty';

// Helper to create GeoJSON circle for GPS accuracy
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
  onSelectRouteStop,
  onMapBackgroundClick,
}: MapLibreMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapStyleUrl, setMapStyleUrl] = useState(DEFAULT_STYLE_URL);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // User Geolocation State
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Markers refs
  const metroMarkersRef = useRef<maplibregl.Marker[]>([]);
  const waypointMarkersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker[]>([]);
  const activePopupRef = useRef<maplibregl.Popup | null>(null);

  // Keep latest callbacks and pandals in refs to avoid stale closures in map event handlers
  const onSelectPandalRef = useRef(onSelectPandal);
  onSelectPandalRef.current = onSelectPandal;
  const onMapBackgroundClickRef = useRef(onMapBackgroundClick);
  onMapBackgroundClickRef.current = onMapBackgroundClick;
  const pandalsRef = useRef(pandals);
  pandalsRef.current = pandals;

  // Prepare GeoJSON for Pandals
  const pandalsGeoJson = useMemo(() => {
    const features = pandals
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat !== 0 && p.lng !== 0)
      .map((p) => {
        const catMeta = CATEGORY_STYLES[p.category] || DEFAULT_CATEGORY_STYLE;
        const color = p.highlighted ? FEATURED_MARKER_STYLE.color : catMeta.color;
        return {
          type: 'Feature' as const,
          id: p.id,
          geometry: {
            type: 'Point' as const,
            coordinates: [p.lng!, p.lat!],
          },
          properties: {
            id: p.id,
            name: p.name,
            bengaliName: p.bengaliName || '',
            category: p.category,
            categoryColor: color,
            highlighted: !!p.highlighted,
            neighbourhood: p.neighbourhood || '',
            nearestStationId: p.nearestStationId || '',
          },
        };
      });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [pandals]);

  // 1. Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const kolkataCenter: [number, number] = [88.3639, 22.5726];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyleUrl,
      center: kolkataCenter,
      zoom: 12.5,
      minZoom: 9,
      maxZoom: 19,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    map.on('error', (e) => {
      console.warn('[MapLibre GL Notice]', e);
    });

    map.on('load', () => {
      // A. ROUTE LAYER SOURCES
      map.addSource('route-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'route-glow-layer',
        type: 'line',
        source: 'route-source',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#D4AF37',
          'line-width': 8,
          'line-opacity': 0.6,
        },
      });

      map.addLayer({
        id: 'route-line-layer',
        type: 'line',
        source: 'route-source',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#C92A2A',
          'line-width': 4,
          'line-dasharray': [2, 2],
          'line-opacity': 0.95,
        },
      });

      // B. USER LOCATION SOURCES
      map.addSource('user-accuracy-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
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

      // C. PANDALS CLUSTERED GEOJSON SOURCE
      map.addSource('pandals-source', {
        type: 'geojson',
        data: pandalsGeoJson,
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 50,
      });

      // 1. Cluster circles
      map.addLayer({
        id: 'pandals-clusters-halo',
        type: 'circle',
        source: 'pandals-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#FFFFFF',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            8,
            24,
            20,
            30,
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(0,0,0,0.12)',
        },
      });

      map.addLayer({
        id: 'pandals-clusters',
        type: 'circle',
        source: 'pandals-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#6B1322', // Maroon for small clusters
            8,
            '#C92A2A', // Vermilion for medium clusters
            20,
            '#B45309', // Gold/amber for large clusters
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            17,
            8,
            21,
            20,
            27,
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // 2. Cluster text counts
      map.addLayer({
        id: 'pandals-cluster-count',
        type: 'symbol',
        source: 'pandals-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Noto Sans Bold'],
          'text-size': 13,
        },
        paint: {
          'text-color': '#FFFFFF',
        },
      });

      // 3. Unclustered pandal halo (high contrast outer outline)
      map.addLayer({
        id: 'unclustered-halo',
        type: 'circle',
        source: 'pandals-source',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['case', ['get', 'highlighted'], 14, 10],
          'circle-color': '#FFFFFF',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(36, 29, 23, 0.3)',
        },
      });

      // 4. Unclustered pandal circle (category color)
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'pandals-source',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['case', ['get', 'highlighted'], 11, 8],
          'circle-color': ['get', 'categoryColor'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // 5. Star symbol on featured pandals
      map.addLayer({
        id: 'unclustered-star-symbol',
        type: 'symbol',
        source: 'pandals-source',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'highlighted'], true]],
        layout: {
          'text-field': '★',
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#FFFFFF',
        },
      });

      // 6. Touch hit-box layer (44x44px touch targets on mobile)
      map.addLayer({
        id: 'unclustered-touch-hitbox',
        type: 'circle',
        source: 'pandals-source',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 22,
          'circle-opacity': 0,
        },
      });

      // D. SELECTED PANDAL HIGHLIGHT PULSE LAYER
      map.addSource('selected-pandal-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'selected-pandal-pulse-ring',
        type: 'circle',
        source: 'selected-pandal-source',
        paint: {
          'circle-radius': 22,
          'circle-color': 'rgba(212, 175, 55, 0.25)',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#D4AF37',
        },
      });

      // Event: Cluster click zooms in smoothly
      map.on('click', 'pandals-clusters', async (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['pandals-clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId == null) return;
        const source = map.getSource('pandals-source') as maplibregl.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        const coords = (features[0].geometry as any).coordinates;
        map.easeTo({
          center: coords,
          zoom: zoom + 0.5,
          duration: 650,
        });
      });

      // Event: Unclustered pandal click
      map.on('click', 'unclustered-touch-hitbox', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['unclustered-touch-hitbox'] });
        if (!features.length) return;
        const props = features[0].properties;
        const found = pandalsRef.current.find((p) => p.id === props.id);
        if (found) {
          onSelectPandalRef.current(found);
        }
      });

      // Event: Click on unobstructed area of the map canvas
      map.on('click', (e) => {
        // Check if an interactive layer feature was clicked
        const interactiveLayers = [
          'pandals-clusters',
          'unclustered-touch-hitbox',
          'selected-pandal-pulse-ring',
        ].filter((l) => map.getLayer(l));

        const features = map.queryRenderedFeatures(e.point, { layers: interactiveLayers });
        if (features && features.length > 0) {
          return;
        }

        // Check if click was on or inside an overlay element (marker, popup, control, button)
        const target = e.originalEvent?.target as HTMLElement | null;
        if (
          target &&
          target.closest(
            '.maplibregl-popup, .maplibregl-marker, .kpn-map-floating-controls, .kpn-map-layer-toggles, .kpn-map-legend-card, .kpn-waypoint-marker, .kpn-user-location-marker, button, a'
          )
        ) {
          return;
        }

        onMapBackgroundClickRef.current?.();
      });

      // Cursor pointer on hover
      const setPointer = () => (map.getCanvas().style.cursor = 'pointer');
      const resetCursor = () => (map.getCanvas().style.cursor = '');
      map.on('mouseenter', 'pandals-clusters', setPointer);
      map.on('mouseleave', 'pandals-clusters', resetCursor);
      map.on('mouseenter', 'unclustered-touch-hitbox', setPointer);
      map.on('mouseleave', 'unclustered-touch-hitbox', resetCursor);

      setIsMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [mapStyleUrl]);

  // Update Pandals GeoJSON data without tearing down map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const source = map.getSource('pandals-source') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(pandalsGeoJson);
    }

    // Toggle layer visibility
    const visibility = showPandals ? 'visible' : 'none';
    [
      'pandals-clusters-halo',
      'pandals-clusters',
      'pandals-cluster-count',
      'unclustered-halo',
      'unclustered-point',
      'unclustered-star-symbol',
      'unclustered-touch-hitbox',
    ].forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });
  }, [pandalsGeoJson, showPandals, isMapLoaded]);

  // Update Selected Pandal Highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const source = map.getSource('selected-pandal-source') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (selectedPandal && Number.isFinite(selectedPandal.lat) && Number.isFinite(selectedPandal.lng)) {
      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [selectedPandal.lng!, selectedPandal.lat!],
            },
            properties: { id: selectedPandal.id },
          },
        ],
      });

      // Open concise MapLibre Popup
      if (activePopupRef.current) {
        activePopupRef.current.remove();
      }

      const st = selectedPandal.nearestStationId
        ? METRO_STATIONS_BY_ID[selectedPandal.nearestStationId]
        : null;
      const catMeta = CATEGORY_STYLES[selectedPandal.category] || DEFAULT_CATEGORY_STYLE;

      const popupHtml = `
        <div class="kpn-popup-content">
          <div class="kpn-popup-pandal-title">
            <strong>${selectedPandal.name}</strong>
            ${selectedPandal.bengaliName ? `<small class="kpn-popup-bengali">${selectedPandal.bengaliName}</small>` : ''}
          </div>
          <div class="kpn-popup-tags">
            <span class="kpn-popup-cat" style="background:${catMeta.bgSoft}; color:${catMeta.color}; border:1px solid ${catMeta.border};">
              ${catMeta.icon} ${catMeta.symbolText}
            </span>
            <span class="kpn-popup-area">${selectedPandal.neighbourhood}</span>
          </div>
          ${
            st
              ? `<div class="kpn-popup-walk">
                  <span>🚇 ${st.name} Metro</span>
                  <span>(${selectedPandal.walkingDistanceMeters || 450}m)</span>
                </div>`
              : ''
          }
        </div>
      `;

      activePopupRef.current = new maplibregl.Popup({ offset: [0, -18], closeButton: true })
        .setLngLat([selectedPandal.lng!, selectedPandal.lat!])
        .setHTML(popupHtml)
        .addTo(map);
    } else {
      source.setData({ type: 'FeatureCollection', features: [] });
      if (activePopupRef.current) {
        activePopupRef.current.remove();
        activePopupRef.current = null;
      }
    }
  }, [selectedPandal, isMapLoaded]);

  // Resize observer
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 150);

    let ro: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
      ro.observe(mapContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
      if (ro) ro.disconnect();
    };
  }, [selectedPandal]);


  // FlyTo Handler
  useEffect(() => {
    if (!mapRef.current || !flyToTarget) return;
    mapRef.current.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: flyToTarget.zoom || 15.5,
      essential: true,
      duration: 1100,
    });
  }, [flyToTarget]);

  // Render Metro Station Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

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
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${station.name} Metro Station`);
      el.innerHTML = `<span class="kpn-metro-badge">${station.interchange ? '⇄' : 'M'}</span>`;

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
          <p class="kpn-popup-sub">${station.line} · ${station.zone} Zone ${station.interchange ? '· Interchange Hub' : ''}</p>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: [0, -16], closeButton: false }).setHTML(
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

  // Route Polyline & Waypoints
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const source = map.getSource('route-source') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      if (showRoute && routeResult && routeResult.coordinates.length > 1) {
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
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    }

    // Waypoints
    waypointMarkersRef.current.forEach((m) => m.remove());
    waypointMarkersRef.current = [];

    if (showRoute && routeStops.length > 0) {
      routeStops.forEach((stop, idx) => {
        const isStart = idx === 0;
        const label = isStart ? 'Start' : `${idx}`;
        const bg = isStart ? '#00875A' : '#C92A2A';

        const el = document.createElement('div');
        el.className = `kpn-waypoint-marker ${isStart ? 'is-start' : 'is-stop'}`;
        el.style.backgroundColor = bg;
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `Stop ${label}: ${stop.name}`);
        el.innerHTML = `<span>${label}</span>`;

        const foundPandal = stop.type === 'pandal' ? pandals.find((p) => p.id === stop.id) : null;
        const catMeta = foundPandal ? CATEGORY_STYLES[foundPandal.category] || DEFAULT_CATEGORY_STYLE : null;

        const popupHtml = `
          <div class="kpn-popup-content">
            <div class="kpn-popup-header">
              <span class="kpn-popup-badge-small" style="background:${bg}; color:#fff;">${label}</span>
              <strong>${stop.name}</strong>
            </div>
            ${stop.bengaliName ? `<small class="kpn-popup-bengali">${stop.bengaliName}</small>` : ''}
            ${
              catMeta
                ? `<div class="kpn-popup-tags"><span class="kpn-popup-cat" style="background:${catMeta.bgSoft}; color:${catMeta.color}; border:1px solid ${catMeta.border};">${catMeta.icon} ${foundPandal?.category}</span></div>`
                : ''
            }
            ${stop.note ? `<p class="kpn-popup-sub">${stop.note}</p>` : ''}
            <div class="kpn-popup-actions-row">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=walking" target="_blank" rel="noopener noreferrer" class="kpn-popup-btn-nav">
                🧭 Directions
              </a>
            </div>
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: [0, -18], closeButton: true }).setHTML(popupHtml);

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          map.flyTo({ center: [stop.lng, stop.lat], zoom: 16, essential: true });
          if (onSelectRouteStop) onSelectRouteStop(stop);
          if (foundPandal) onSelectPandal(foundPandal);
        });

        waypointMarkersRef.current.push(marker);
      });
    }
  }, [routeResult, routeStops, showRoute, isMapLoaded, pandals, onSelectPandal, onSelectRouteStop]);

  // User GPS Geolocation
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by this browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude, accuracy });
        setIsLocating(false);

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            essential: true,
          });

          // Check nearby pandals within 1.5km
          let count = 0;
          pandals.forEach((p) => {
            if (p.lat && p.lng) {
              const dLat = (p.lat - latitude) * 111.32;
              const dLng = (p.lng - longitude) * 111.32 * Math.cos((latitude * Math.PI) / 180);
              const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
              if (distKm <= 1.5) count++;
            }
          });

          if (onNearbyFound) {
            onNearbyFound(count);
          }
        }
      },
      (err) => {
        setIsLocating(false);
        setLocationError(err.message || 'Could not acquire GPS position.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [pandals, onNearbyFound]);

  // User Location Marker & Accuracy Circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    userMarkerRef.current.forEach((m) => m.remove());
    userMarkerRef.current = [];

    const accuracySource = map.getSource('user-accuracy-source') as
      | maplibregl.GeoJSONSource
      | undefined;

    if (userLocation) {
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

      const el = document.createElement('div');
      el.className = 'kpn-user-location-marker';
      el.innerHTML = '<div class="kpn-user-pulse"></div><div class="kpn-user-dot"></div>';

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);

      userMarkerRef.current.push(marker);
    } else if (accuracySource) {
      accuracySource.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [userLocation, isMapLoaded]);

  // Fit bounds to entire route when stops exist
  const handleFitRouteBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map || routeStops.length < 2) return;

    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;

    routeStops.forEach((s) => {
      if (s.lng < minLng) minLng = s.lng;
      if (s.lat < minLat) minLat = s.lat;
      if (s.lng > maxLng) maxLng = s.lng;
      if (s.lat > maxLat) maxLat = s.lat;
    });

    if (minLng !== Infinity && maxLng !== -Infinity) {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: { top: 80, bottom: 90, left: 70, right: 70 }, duration: 900 }
      );
    }
  }, [routeStops]);

  return (
    <div className="kpn-maplibre-container" role="region" aria-label="Interactive Durga Puja Vector Map">
      <div ref={mapContainerRef} className="kpn-map-canvas" />

      {/* Floating Map Controls Top Bar */}
      <div className="kpn-map-floating-bar">
        <div className="kpn-map-stat-chip">
          <span className="kpn-stat-dot" />
          <span>{pandals.length} OpenStreetMap Pins</span>
        </div>

        <div className="kpn-layer-toggles">
          <button
            type="button"
            className={`kpn-layer-btn ${showPandals ? 'active' : ''}`}
            onClick={() => onToggleLayer('pandals')}
            aria-label="Toggle pandals layer"
          >
            ✦ Pandals
          </button>
          <button
            type="button"
            className={`kpn-layer-btn ${showMetro ? 'active' : ''}`}
            onClick={() => onToggleLayer('metro')}
            aria-label="Toggle metro stations layer"
          >
            Ⓜ Metro
          </button>
          {routeStops.length > 0 && (
            <button
              type="button"
              className={`kpn-layer-btn ${showRoute ? 'active' : ''}`}
              onClick={() => onToggleLayer('route')}
              aria-label="Toggle route polyline"
            >
              Route
            </button>
          )}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="kpn-map-floating-actions">
        <button
          type="button"
          className={`kpn-map-action-btn ${isLocating ? 'is-loading' : ''}`}
          onClick={handleLocateMe}
          title="Locate me on map (GPS)"
          aria-label="Locate me on map"
        >
          <span style={{ fontSize: 13 }}>📍</span>
          <span>Locate Me</span>
        </button>

        {routeStops.length >= 2 && (
          <button
            type="button"
            className="kpn-map-action-btn highlight-route"
            onClick={handleFitRouteBounds}
            title="Fit entire night route within map screen"
            aria-label="Fit route to map"
          >
            <span>🗺️</span>
            <span>Fit Route</span>
          </button>
        )}

        <button
          type="button"
          className="kpn-map-action-btn"
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.flyTo({
                center: [88.3639, 22.5726],
                zoom: 12.5,
                duration: 900,
              });
            }
          }}
          title="Reset map view to central Kolkata"
          aria-label="Reset map view"
        >
          <span>↺</span>
          <span>Reset View</span>
        </button>

        {/* Style Selector */}
        <select
          value={mapStyleUrl}
          onChange={(e) => setMapStyleUrl(e.target.value)}
          className="kpn-style-selector"
          aria-label="Select Map Style"
        >
          <option value="https://tiles.openfreemap.org/styles/liberty">Liberty Style</option>
          <option value="https://tiles.openfreemap.org/styles/bright">Bright Style</option>
          <option value="https://tiles.openfreemap.org/styles/positron">Positron Style</option>
        </select>
      </div>

      {/* Collapsible Interactive Map Legend */}
      <div className={`kpn-map-legend-box ${isLegendOpen ? 'is-open' : ''}`}>
        <button
          type="button"
          className="kpn-legend-toggle-btn"
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          aria-label="Toggle map marker category legend"
          aria-expanded={isLegendOpen}
        >
          <span>🗺️ Map Legend</span>
          <span className="kpn-legend-arrow">{isLegendOpen ? '▼' : '▲'}</span>
        </button>

        {isLegendOpen && (
          <div className="kpn-legend-dropdown-content">
            <div className="kpn-legend-entry">
              <span className="kpn-legend-swatch featured">★</span>
              <div>
                <strong>Famous & Featured Puja</strong>
                <small>High contrast star · Kolkata Landmark</small>
              </div>
            </div>

            <div className="kpn-legend-entry">
              <span className="kpn-legend-swatch" style={{ backgroundColor: CATEGORY_STYLES['Traditional'].color }}>
                🪔
              </span>
              <div>
                <strong>Traditional Sabeki</strong>
                <small>Warm saffron · Heritage Ekchala & Daker Saaj</small>
              </div>
            </div>

            <div className="kpn-legend-entry">
              <span className="kpn-legend-swatch" style={{ backgroundColor: CATEGORY_STYLES['Theme'].color }}>
                🎨
              </span>
              <div>
                <strong>Artistic Theme Puja</strong>
                <small>Violet/indigo · Concept & Rural Handicraft</small>
              </div>
            </div>

            <div className="kpn-legend-entry">
              <span className="kpn-legend-swatch" style={{ backgroundColor: CATEGORY_STYLES['Heritage Rajbari'].color }}>
                🏛
              </span>
              <div>
                <strong>Heritage Rajbari / Bonedi</strong>
                <small>Antique bronze · Aristocratic Courtyards</small>
              </div>
            </div>

            <div className="kpn-legend-entry">
              <span className="kpn-legend-swatch metro">M</span>
              <div>
                <strong>Kolkata Metro Station</strong>
                <small>Transit hubs with smart gate exit guide</small>
              </div>
            </div>

            <div className="kpn-legend-entry">
              <span className="kpn-legend-swatch cluster">12</span>
              <div>
                <strong>Clustered Pujas (Tap to zoom)</strong>
                <small>Grouped markers at broad zoom levels</small>
              </div>
            </div>
          </div>
        )}
      </div>

      {locationError && (
        <div className="kpn-map-toast-error" role="alert">
          <span>⚠️ {locationError}</span>
          <button type="button" onClick={() => setLocationError(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
