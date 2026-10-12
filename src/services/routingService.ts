import { RouteStop, RouteResult } from '../types';
import { METRO_STATIONS_BY_ID } from '../data/metroStations';

/**
 * Calculates straight-line distance in meters between two lat/lng points using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Solves Traveling Salesperson Problem (TSP) using Nearest-Neighbor heuristic
 * Orders stops to minimize total walking distance from the start
 */
export function optimizeRouteOrder(stops: RouteStop[]): RouteStop[] {
  if (stops.length <= 2) return [...stops];

  const result: RouteStop[] = [stops[0]];
  const remaining = stops.slice(1);

  while (remaining.length > 0) {
    const current = result[result.length - 1];
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = calculateHaversineDistance(
        current.lat,
        current.lng,
        remaining[i].lat,
        remaining[i].lng
      );
      if (d < minDistance) {
        minDistance = d;
        nearestIdx = i;
      }
    }

    result.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return result;
}

/**
 * Fetch pedestrian route from OSRM foot routing API with fallback
 */
/**
 * Fetch pedestrian route with fast OpenStreetMap mirror, pairwise fallback, and optional API key support
 */
export async function getPedestrianRoute(rawStops: RouteStop[]): Promise<RouteResult> {
  // 1. Sanitize and validate stops
  const stops = rawStops.filter(
    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && s.lat !== 0 && s.lng !== 0
  );

  if (stops.length < 2) {
    return {
      coordinates: stops.map((s) => [s.lat, s.lng]),
      totalDistanceMeters: 0,
      totalTimeMinutes: 0,
      legs: [],
      source: 'fallback',
    };
  }

  // 2. Check for user-configured external API keys in localStorage or env
  const config = getStoredRoutingConfig();

  if (config.apiKey) {
    try {
      if (config.provider === 'ors') {
        const orsResult = await fetchOpenRouteServiceRoute(stops, config.apiKey);
        if (orsResult) return orsResult;
      } else if (config.provider === 'geoapify') {
        const geoResult = await fetchGeoapifyRoute(stops, config.apiKey);
        if (geoResult) return geoResult;
      } else if (config.provider === 'mapbox') {
        const mapboxResult = await fetchMapboxRoute(stops, config.apiKey);
        if (mapboxResult) return mapboxResult;
      }
    } catch (apiErr) {
      console.warn(`Configured routing provider (${config.provider}) failed, falling back to OSM mirrors:`, apiErr);
    }
  }

  // 3. Fast OSM Mirrored Foot Routing (OSM-DE + Project OSRM)
  const coordString = stops.map((s) => `${s.lng},${s.lat}`).join(';');
  const mirrors = [
    // Primary fast OSM mirror
    `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coordString}?overview=full&geometries=geojson`,
    // Secondary public OSRM mirror
    `https://router.project-osrm.org/route/v1/foot/${coordString}?overview=full&geometries=geojson`,
  ];

  for (const url of mirrors) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3800); // 3.8s timeout per mirror

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates: [number, number][] = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );

          const legs = (route.legs || []).map((leg: any, idx: number) => {
            const fromName = stops[idx]?.name || `Stop ${idx + 1}`;
            const toName = stops[idx + 1]?.name || `Stop ${idx + 2}`;
            const dist = Math.round(leg.distance || calculateHaversineDistance(stops[idx].lat, stops[idx].lng, stops[idx + 1]?.lat || stops[idx].lat, stops[idx + 1]?.lng || stops[idx].lng));
            const timeMin = Math.max(1, Math.round((leg.duration || dist / 1.25) / 60));

            return {
              fromName,
              toName,
              distanceMeters: dist,
              timeMinutes: timeMin,
              instructions: [
                `Walk from ${fromName} to ${toName} (~${dist} m)`,
                `Follow street path (est. ${timeMin} min walk)`
              ],
            };
          });

          // Fill any missing legs if OSRM returned fewer legs
          while (legs.length < stops.length - 1) {
            const idx = legs.length;
            const from = stops[idx];
            const to = stops[idx + 1];
            const d = Math.round(calculateHaversineDistance(from.lat, from.lng, to.lat, to.lng) * 1.25);
            legs.push({
              fromName: from.name,
              toName: to.name,
              distanceMeters: d,
              timeMinutes: Math.max(1, Math.round(d / 75)),
              instructions: [`Walk towards ${to.name} (~${d} m)`],
            });
          }

          const metroTransferAdvice = generateMetroAdvice(stops);

          return {
            coordinates,
            totalDistanceMeters: Math.round(route.distance),
            totalTimeMinutes: Math.max(1, Math.round((route.duration || route.distance / 1.25) / 60)),
            legs,
            metroTransferAdvice,
            source: 'osrm',
          };
        }
      }
    } catch {
      // Continue to next mirror or pairwise fallback
    }
  }

  // 4. Pairwise Segment Routing Fallback (robust when a 10-stop request fails on 1 waypoint)
  try {
    const pairResult = await fetchPairwiseRoute(stops);
    if (pairResult) return pairResult;
  } catch (pairErr) {
    console.warn('Pairwise route resolution fallback:', pairErr);
  }

  // 5. Honest Local Geometry Fallback (Urban street detour factor)
  return createFallbackRoute(stops);
}

/**
 * Routes pairs of consecutive stops concurrently to guarantee road network snapping
 */
async function fetchPairwiseRoute(stops: RouteStop[]): Promise<RouteResult | null> {
  if (stops.length < 2) return null;

  const legPromises = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${s1.lng},${s1.lat};${s2.lng},${s2.lat}?overview=full&geometries=geojson`;

    legPromises.push(
      fetch(url, { signal: AbortSignal.timeout(2500) })
        .then((r) => r.json())
        .then((data) => {
          if (data.code === 'Ok' && data.routes?.[0]) {
            const r = data.routes[0];
            return {
              coords: r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
              distance: Math.round(r.distance),
              duration: Math.round(r.duration / 60),
            };
          }
          return null;
        })
        .catch(() => null)
    );
  }

  const results = await Promise.all(legPromises);
  const coordinates: [number, number][] = [];
  const legs: RouteResult['legs'] = [];
  let totalDist = 0;
  let totalDur = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    const r = results[i];

    if (r && r.coords.length > 0) {
      if (coordinates.length === 0) {
        coordinates.push(...r.coords);
      } else {
        coordinates.push(...r.coords.slice(1));
      }
      totalDist += r.distance;
      totalDur += r.duration;
      legs.push({
        fromName: s1.name,
        toName: s2.name,
        distanceMeters: r.distance,
        timeMinutes: Math.max(1, r.duration),
        instructions: [`Walk to ${s2.name} (${r.distance} m, ~${r.duration} min)`],
      });
    } else {
      // Approximate single leg
      const straight = calculateHaversineDistance(s1.lat, s1.lng, s2.lat, s2.lng);
      const estDist = Math.round(straight * 1.25);
      const estTime = Math.max(1, Math.round(estDist / 75));
      totalDist += estDist;
      totalDur += estTime;
      coordinates.push([s1.lat, s1.lng], [(s1.lat + s2.lat) / 2, (s1.lng + s2.lng) / 2], [s2.lat, s2.lng]);
      legs.push({
        fromName: s1.name,
        toName: s2.name,
        distanceMeters: estDist,
        timeMinutes: estTime,
        instructions: [`Walk towards ${s2.name} (~${estDist} m)`],
      });
    }
  }

  return {
    coordinates,
    totalDistanceMeters: totalDist,
    totalTimeMinutes: Math.max(1, totalDur),
    legs,
    metroTransferAdvice: generateMetroAdvice(stops),
    source: 'osrm',
  };
}

/**
 * Creates honest approximate route without fabricating turn-by-turn instructions
 */
function createFallbackRoute(stops: RouteStop[]): RouteResult {
  const coordinates: [number, number][] = [];
  const legs: RouteResult['legs'] = [];
  let totalDistance = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];

    const straightDist = calculateHaversineDistance(s1.lat, s1.lng, s2.lat, s2.lng);
    const approxWalkDist = Math.round(straightDist * 1.25); // 25% urban road winding estimate
    const approxWalkTimeMin = Math.max(1, Math.round(approxWalkDist / 75)); // 75m/min (~4.5 km/h)

    totalDistance += approxWalkDist;

    coordinates.push([s1.lat, s1.lng]);
    const midLat = (s1.lat + s2.lat) / 2;
    const midLng = (s1.lng + s2.lng) / 2;
    coordinates.push([midLat, midLng]);

    legs.push({
      fromName: s1.name,
      toName: s2.name,
      distanceMeters: approxWalkDist,
      timeMinutes: approxWalkTimeMin,
      instructions: [
        `Direct pedestrian corridor link (~${approxWalkDist} m, est. ${approxWalkTimeMin} min walking)`,
        `Follow local signage toward ${s2.name} (live road turn-by-turn routing unavailable)`
      ],
    });
  }

  // Push final coordinate
  if (stops.length > 0) {
    coordinates.push([stops[stops.length - 1].lat, stops[stops.length - 1].lng]);
  }

  const totalTime = Math.max(1, Math.round(totalDistance / 75));
  const metroTransferAdvice = generateMetroAdvice(stops);

  return {
    coordinates,
    totalDistanceMeters: totalDistance,
    totalTimeMinutes: totalTime,
    legs,
    metroTransferAdvice,
    source: 'fallback',
  };
}

/**
 * Detects if stops cross distant Kolkata zones and advises practical Metro ride
 */
function generateMetroAdvice(stops: RouteStop[]): string[] {
  const advice: string[] = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    const dist = calculateHaversineDistance(s1.lat, s1.lng, s2.lat, s2.lng);

    // If leg is greater than 2.2 km, suggest Metro connection
    if (dist > 2200) {
      const near1 = s1.stationId ? METRO_STATIONS_BY_ID[s1.stationId]?.name : null;
      const near2 = s2.stationId ? METRO_STATIONS_BY_ID[s2.stationId]?.name : null;

      if (near1 && near2 && near1 !== near2) {
        advice.push(
          `🚇 Metro Tip: Hopping between ${s1.name} and ${s2.name} is ~${(dist / 1000).toFixed(1)} km. Take Kolkata Metro from ${near1} station to ${near2} station to save ~25 min of walking!`
        );
      } else {
        advice.push(
          `🚇 Note: Distance between ${s1.name} and ${s2.name} is ${(dist / 1000).toFixed(1)} km. Consider taking a local e-rickshaw or Metro connection.`
        );
      }
    }
  }

  return advice;
}

/**
 * Generates an external Google Maps directions link
 */
export function getGoogleMapsDirectionsUrl(stops: RouteStop[]): string {
  if (stops.length === 0) return 'https://www.google.com/maps';
  if (stops.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${stops[0].lat},${stops[0].lng}`;
  }

  const origin = `${stops[0].lat},${stops[0].lng}`;
  const dest = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;

  if (stops.length === 2) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=walking`;
  }

  // Middle stops are waypoints
  const waypoints = stops
    .slice(1, -1)
    .map((s) => `${s.lat},${s.lng}`)
    .join('|');

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${encodeURIComponent(
    waypoints
  )}&travelmode=walking`;
}

export interface RoutingProviderConfig {
  provider: 'osm' | 'ors' | 'geoapify' | 'mapbox';
  apiKey: string | null;
}

const STORAGE_KEY_ROUTING_PROVIDER = 'pujopath_routing_provider';
const STORAGE_KEY_ROUTING_KEY = 'pujopath_routing_api_key';

export function getStoredRoutingConfig(): RoutingProviderConfig {
  if (typeof window === 'undefined') {
    return { provider: 'osm', apiKey: null };
  }
  const provider = (localStorage.getItem(STORAGE_KEY_ROUTING_PROVIDER) || 'osm') as RoutingProviderConfig['provider'];
  const envKey = (import.meta as any).env?.VITE_ROUTING_API_KEY || null;
  const apiKey = localStorage.getItem(STORAGE_KEY_ROUTING_KEY) || envKey;
  return { provider, apiKey };
}

export function setStoredRoutingConfig(provider: RoutingProviderConfig['provider'], apiKey: string | null): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ROUTING_PROVIDER, provider);
  if (apiKey) {
    localStorage.setItem(STORAGE_KEY_ROUTING_KEY, apiKey);
  } else {
    localStorage.removeItem(STORAGE_KEY_ROUTING_KEY);
  }
}

/**
 * OpenRouteService (ORS) integration (Free tier: 2000 req/day)
 */
async function fetchOpenRouteServiceRoute(stops: RouteStop[], apiKey: string): Promise<RouteResult | null> {
  const coords = stops.map((s) => [s.lng, s.lat]);
  const url = 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ coordinates: coords }),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const coordinates: [number, number][] = feature.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );
  const summary = feature.properties?.summary;
  const totalDist = Math.round(summary?.distance || 0);
  const totalTime = Math.max(1, Math.round((summary?.duration || 0) / 60));

  const legs = feature.properties?.segments?.map((seg: any, idx: number) => ({
    fromName: stops[idx]?.name || `Stop ${idx + 1}`,
    toName: stops[idx + 1]?.name || `Stop ${idx + 2}`,
    distanceMeters: Math.round(seg.distance),
    timeMinutes: Math.max(1, Math.round(seg.duration / 60)),
    instructions: [`Walk to ${stops[idx + 1]?.name || 'next stop'} (${Math.round(seg.distance)} m)`],
  })) || [];

  return {
    coordinates,
    totalDistanceMeters: totalDist,
    totalTimeMinutes: totalTime,
    legs,
    metroTransferAdvice: generateMetroAdvice(stops),
    source: 'osrm',
  };
}

/**
 * Geoapify Routing API (Free tier: 3000 credits/day)
 */
async function fetchGeoapifyRoute(stops: RouteStop[], apiKey: string): Promise<RouteResult | null> {
  const waypoints = stops.map((s) => `${s.lat},${s.lng}`).join('|');
  const url = `https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=walk&apiKey=${apiKey}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const rawCoords = feature.geometry?.coordinates?.[0] || feature.geometry?.coordinates || [];
  const coordinates: [number, number][] = rawCoords.map(([lng, lat]: [number, number]) => [lat, lng]);
  const props = feature.properties;

  return {
    coordinates,
    totalDistanceMeters: Math.round(props.distance || 0),
    totalTimeMinutes: Math.max(1, Math.round((props.time || 0) / 60)),
    legs: (props.legs || []).map((leg: any, idx: number) => ({
      fromName: stops[idx]?.name || `Stop ${idx + 1}`,
      toName: stops[idx + 1]?.name || `Stop ${idx + 2}`,
      distanceMeters: Math.round(leg.distance),
      timeMinutes: Math.max(1, Math.round(leg.time / 60)),
      instructions: [`Walk to ${stops[idx + 1]?.name || 'next stop'}`],
    })),
    metroTransferAdvice: generateMetroAdvice(stops),
    source: 'osrm',
  };
}

/**
 * Mapbox Directions API (Free tier: 100k req/month)
 */
async function fetchMapboxRoute(stops: RouteStop[], apiKey: string): Promise<RouteResult | null> {
  const coordString = stops.map((s) => `${s.lng},${s.lat}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordString}?geometries=geojson&access_token=${apiKey}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) return null;

  const coordinates: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );

  return {
    coordinates,
    totalDistanceMeters: Math.round(route.distance),
    totalTimeMinutes: Math.max(1, Math.round(route.duration / 60)),
    legs: (route.legs || []).map((leg: any, idx: number) => ({
      fromName: stops[idx]?.name || `Stop ${idx + 1}`,
      toName: stops[idx + 1]?.name || `Stop ${idx + 2}`,
      distanceMeters: Math.round(leg.distance),
      timeMinutes: Math.max(1, Math.round(leg.duration / 60)),
      instructions: [`Walk to ${stops[idx + 1]?.name || 'next stop'}`],
    })),
    metroTransferAdvice: generateMetroAdvice(stops),
    source: 'osrm',
  };
}

