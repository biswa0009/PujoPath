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
export async function getPedestrianRoute(stops: RouteStop[]): Promise<RouteResult> {
  if (stops.length < 2) {
    return {
      coordinates: stops.map((s) => [s.lat, s.lng]),
      totalDistanceMeters: 0,
      totalTimeMinutes: 0,
      legs: [],
      source: 'fallback',
    };
  }

  // Build OSRM coordinates string: {lng},{lat};{lng},{lat}...
  const coordString = stops.map((s) => `${s.lng},${s.lat}`).join(';');
  const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${coordString}?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // OSRM returns GeoJSON coordinates as [lng, lat], convert to [lat, lng] for Leaflet
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        const legs = route.legs.map((leg: any, idx: number) => {
          const fromName = stops[idx]?.name || `Stop ${idx + 1}`;
          const toName = stops[idx + 1]?.name || `Stop ${idx + 2}`;
          const instructions: string[] = (leg.steps || [])
            .map((step: any) => {
              const name = step.name ? ` on ${step.name}` : '';
              const type = step.maneuver?.type || 'turn';
              const modifier = step.maneuver?.modifier ? ` ${step.maneuver.modifier}` : '';
              return `${type}${modifier}${name} (${Math.round(step.distance)} m)`;
            })
            .filter(Boolean);

          return {
            fromName,
            toName,
            distanceMeters: Math.round(leg.distance),
            timeMinutes: Math.round(leg.duration / 60) || 1,
            instructions: instructions.length > 0 ? instructions : [`Walk towards ${toName}`],
          };
        });

        const metroTransferAdvice = generateMetroAdvice(stops);

        return {
          coordinates,
          totalDistanceMeters: Math.round(route.distance),
          totalTimeMinutes: Math.round(route.duration / 60) || 1,
          legs,
          metroTransferAdvice,
          source: 'osrm',
        };
      }
    }
  } catch (err) {
    console.warn('OSRM pedestrian route fetch failed, using realistic fallback:', err);
  }

  // Realistic Fallback: Haversine distance with 1.25x street grid winding factor
  return createFallbackRoute(stops);
}

/**
 * Creates fallback route with realistic walking distance and Metro transfer hints
 */
function createFallbackRoute(stops: RouteStop[]): RouteResult {
  const coordinates: [number, number][] = [];
  const legs: RouteResult['legs'] = [];
  let totalDistance = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];

    const straightDist = calculateHaversineDistance(s1.lat, s1.lng, s2.lat, s2.lng);
    const walkDist = Math.round(straightDist * 1.25); // 25% urban road detour factor
    const walkTimeMin = Math.max(1, Math.round(walkDist / 75)); // 75m/min (~4.5 km/h)

    totalDistance += walkDist;

    // Add intermediate interpolated points for smoother curve
    coordinates.push([s1.lat, s1.lng]);
    const midLat = (s1.lat + s2.lat) / 2;
    const midLng = (s1.lng + s2.lng) / 2;
    coordinates.push([midLat, midLng]);

    legs.push({
      fromName: s1.name,
      toName: s2.name,
      distanceMeters: walkDist,
      timeMinutes: walkTimeMin,
      instructions: [
        `Walk east/west from ${s1.name}`,
        `Continue along neighborhood arterial street (~${walkDist} m)`,
        `Arrive at ${s2.name}`,
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
