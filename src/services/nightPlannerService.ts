import {
  Pandal,
  RouteStop,
  RouteResult,
  NightPlanConfig,
  NightPlan,
  NightPlanStop,
  NightPlanLeg,
  SkippedMustVisit,
} from '../types';
import { METRO_STATIONS, METRO_STATIONS_BY_ID } from '../data/metroStations';
import { calculateHaversineDistance, getPedestrianRoute } from './routingService';

/**
 * Returns estimated visit duration in minutes based on real category & scale
 * Clearly identified as a planning estimate
 */
export function getVisitDurationEstimate(pandal: Pandal): number {
  if (pandal.highlighted || pandal.category === 'Contemporary Landmark') {
    return 35; // Major crowd & grand installation
  }
  if (pandal.category === 'Theme') {
    return 30; // Conceptual art & craft detail
  }
  if (pandal.category === 'Heritage Rajbari') {
    return 25; // Bonedi courtyard viewing
  }
  return 25; // Traditional Sabeki idol
}

/**
 * Explains clearly why a pandal was selected based on user preferences
 */
export function explainWhyPandalMatches(
  pandal: Pandal,
  config: NightPlanConfig,
  isMustVisit: boolean
): string {
  if (isMustVisit) {
    return `Selected as Must-Visit · ${pandal.knownFor || pandal.theme || pandal.category}`;
  }
  if (pandal.highlighted) {
    return `Famous Landmark Puja · ${pandal.knownFor || 'High-footfall Durga Puja icon'}`;
  }
  if (config.categories.includes(pandal.category as any)) {
    if (pandal.category === 'Traditional') {
      return `Matches your Traditional preference · ${pandal.knownFor || 'Centenary Sabeki Ekchala idol'}`;
    }
    if (pandal.category === 'Theme') {
      return `Matches your Artistic Theme preference · ${pandal.theme || pandal.knownFor || 'Creative craft installation'}`;
    }
    if (pandal.category === 'Heritage Rajbari') {
      return `Matches your Heritage Rajbari preference · ${pandal.theme || 'Historic zamindari household'}`;
    }
    if (pandal.category === 'Contemporary Landmark') {
      return `Matches your Famous Puja preference · ${pandal.knownFor || 'Grand carnival attraction'}`;
    }
  }
  return `Nearby convenient stop · ${pandal.category} Puja in ${pandal.neighbourhood}`;
}

/**
 * Estimates travel between two points taking into account:
 * - Walking distance & walking speed (~75m/min)
 * - Metro network connection (if stations are present and beneficial)
 * - Walking tolerance & travel preferences
 */
export function estimateLegTravel(
  from: { lat: number; lng: number; stationId?: string; name: string },
  to: { lat: number; lng: number; stationId?: string; name: string },
  config: NightPlanConfig
): NightPlanLeg {
  const straightDist = calculateHaversineDistance(from.lat, from.lng, to.lat, to.lng);
  const approxWalkDist = Math.round(straightDist * 1.25); // 25% urban road grid detour factor
  const walkTimeMin = Math.max(2, Math.round(approxWalkDist / 75)); // 75m/min walking speed

  const st1 = from.stationId ? METRO_STATIONS_BY_ID[from.stationId] : null;
  const st2 = to.stationId ? METRO_STATIONS_BY_ID[to.stationId] : null;

  const canUseMetro =
    st1 &&
    st2 &&
    st1.id !== st2.id &&
    st1.operational &&
    st2.operational &&
    approxWalkDist > 1200;

  // Decide mode based on preference
  let useMetro = false;
  if (canUseMetro) {
    if (config.travelPreference === 'metro-assisted' && approxWalkDist > 1000) {
      useMetro = true;
    } else if (config.travelPreference === 'balanced' && approxWalkDist > 1600) {
      useMetro = true;
    } else if (config.travelPreference === 'walking-first' && approxWalkDist > 2500) {
      useMetro = true;
    }
  }

  // Walking tolerance factor
  if (config.walkingTolerance === 'low' && approxWalkDist > 700 && canUseMetro) {
    useMetro = true;
  }

  if (useMetro && st1 && st2) {
    // Estimate metro travel time scaled by real track distance and line transfers
    const distKm = approxWalkDist / 1000;
    const sameLine = st1.lineCode === st2.lineCode;
    // Average transit speed (~25 km/h ≈ 2.4 min/km) plus station platform wait and transfer
    const baseRideMin = Math.round(distKm * 2.4);
    const metroRideMinutes = sameLine
      ? Math.max(8, baseRideMin + 4)
      : Math.max(18, baseRideMin + 14);

    const metroAdvice = sameLine
      ? `Take Kolkata Metro (${st1.line}) from ${st1.name} to ${st2.name} (~${metroRideMinutes} min)`
      : `Take Metro from ${st1.name} to ${st2.name} with interchange at Central / Esplanade (~${metroRideMinutes} min)`;

    return {
      fromName: from.name,
      toName: to.name,
      distanceMeters: approxWalkDist,
      timeMinutes: metroRideMinutes + 6, // 6 mins total station access/egress walk
      mode: 'metro',
      description: `Metro-assisted link: ${st1.name} → ${st2.name}`,
      metroAdvice,
    };
  }

  return {
    fromName: from.name,
    toName: to.name,
    distanceMeters: approxWalkDist,
    timeMinutes: walkTimeMin,
    mode: 'walk',
    description: `~${walkTimeMin} min walking corridor (~${(approxWalkDist / 1000).toFixed(1)} km)`,
  };
}

/**
 * 2-Opt local search heuristic to eliminate criss-crossing and backtracking
 */
function improveSequence2Opt(
  pandalStops: Pandal[],
  startCoords: { lat: number; lng: number }
): Pandal[] {
  if (pandalStops.length <= 2) return [...pandalStops];

  const route = [...pandalStops];

  const getDistance = (
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number }
  ) => calculateHaversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);

  let improved = true;
  let iterations = 0;
  const maxIterations = 20;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const prevNode = i === 0 ? startCoords : { lat: route[i - 1].lat!, lng: route[i - 1].lng! };
        const nodeI = { lat: route[i].lat!, lng: route[i].lng! };
        const nodeK = { lat: route[k].lat!, lng: route[k].lng! };
        const nextNode =
          k === route.length - 1 ? null : { lat: route[k + 1].lat!, lng: route[k + 1].lng! };

        const currentDist =
          getDistance(prevNode, nodeI) + (nextNode ? getDistance(nodeK, nextNode) : 0);
        const newDist =
          getDistance(prevNode, nodeK) + (nextNode ? getDistance(nodeI, nextNode) : 0);

        if (newDist < currentDist - 25) {
          // Reverse subsegment [i...k]
          const sub = route.slice(i, k + 1).reverse();
          route.splice(i, sub.length, ...sub);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return route;
}

/**
 * Core Algorithm: Generate an optimized Durga Puja Night Itinerary
 */
export async function generateNightPlan(
  config: NightPlanConfig,
  allPandals: Pandal[]
): Promise<NightPlan> {
  // 1. Resolve starting point
  let startLabel = 'Starting Location';
  let startBengaliLabel: string | undefined;
  let startLat = 22.5726; // Default Central Kolkata (Esplanade)
  let startLng = 88.3639;
  let startStationId: string | undefined;

  if (config.startType === 'metro-station' && config.startStationId) {
    const st = METRO_STATIONS_BY_ID[config.startStationId] || METRO_STATIONS[0];
    if (st) {
      startLabel = `${st.name} Metro Station`;
      startBengaliLabel = st.bengaliName ? `${st.bengaliName} মেট্রো` : undefined;
      startLat = st.lat;
      startLng = st.lng;
      startStationId = st.id;
    }
  } else if (config.startType === 'pandal' && config.startPandalId) {
    const p = allPandals.find((p) => p.id === config.startPandalId);
    if (p && p.lat && p.lng) {
      startLabel = p.name;
      startBengaliLabel = p.bengaliName;
      startLat = p.lat;
      startLng = p.lng;
      startStationId = p.nearestStationId || undefined;
    }
  } else if (config.startType === 'current-location' && config.startCoords) {
    startLabel = config.startCoords.label || 'Current GPS Location';
    startBengaliLabel = config.startCoords.bengaliLabel;
    startLat = config.startCoords.lat;
    startLng = config.startCoords.lng;
  }

  const startPoint = {
    label: startLabel,
    bengaliLabel: startBengaliLabel,
    lat: startLat,
    lng: startLng,
    type: config.startType,
    stationId: startStationId,
    pandalId: config.startPandalId,
  };

  // 2. Filter candidates by valid coordinates
  const validPandals = allPandals.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      p.lat !== 0 &&
      p.lng !== 0 &&
      // Do not duplicate if start point is already this pandal
      (config.startType !== 'pandal' || p.id !== config.startPandalId)
  );

  // 3. Resolve Must-Visit pandals
  const mustVisitSet = new Set(config.mustVisitPandalIds || []);
  const mustVisitPandals = validPandals.filter((p) => mustVisitSet.has(p.id));

  // 4. Resolve Category-preference pandals
  const categoryMatched = validPandals.filter((p) => {
    if (mustVisitSet.has(p.id)) return false; // Handled separately
    if (config.categories.length === 0) return true;

    if (config.categories.includes(p.category as any)) return true;
    if (
      config.categories.includes('Contemporary Landmark') &&
      (p.highlighted || p.category === 'Contemporary Landmark')
    ) {
      return true;
    }
    return false;
  });

  // Time budget in minutes
  const totalBudgetMinutes = config.timeAvailableHours * 60;
  // Reserve ~15 min safety buffer for nighttime crowd/queues
  const effectiveBudgetMinutes = totalBudgetMinutes - 15;

  const skippedMustVisits: SkippedMustVisit[] = [];
  const selectedPandals: Pandal[] = [];

  let accumulatedTime = 0;
  let currentLoc = { lat: startLat, lng: startLng, stationId: startStationId, name: startLabel };

  // 5. Try to fit must-visit pandals first using greedy nearest insertion
  const remainingMustVisits = [...mustVisitPandals];

  while (remainingMustVisits.length > 0) {
    let bestIdx = 0;
    let minTravelTime = Infinity;

    for (let i = 0; i < remainingMustVisits.length; i++) {
      const p = remainingMustVisits[i];
      const leg = estimateLegTravel(
        currentLoc,
        { lat: p.lat!, lng: p.lng!, stationId: p.nearestStationId || undefined, name: p.name },
        config
      );
      if (leg.timeMinutes < minTravelTime) {
        minTravelTime = leg.timeMinutes;
        bestIdx = i;
      }
    }

    const candidate = remainingMustVisits[bestIdx];
    const visitTime = getVisitDurationEstimate(candidate);
    const legCost = minTravelTime;

    if (accumulatedTime + legCost + visitTime <= effectiveBudgetMinutes) {
      selectedPandals.push(candidate);
      accumulatedTime += legCost + visitTime;
      currentLoc = {
        lat: candidate.lat!,
        lng: candidate.lng!,
        stationId: candidate.nearestStationId || undefined,
        name: candidate.name,
      };
      remainingMustVisits.splice(bestIdx, 1);
    } else {
      // Must visit cannot fit within budget!
      const distFromStart = Math.round(
        calculateHaversineDistance(startLat, startLng, candidate.lat!, candidate.lng!) / 1000
      );
      skippedMustVisits.push({
        pandalId: candidate.id,
        name: candidate.name,
        bengaliName: candidate.bengaliName,
        reason: `Located ~${distFromStart} km away. Travel & visit time (~${legCost + visitTime} mins) exceeds your ${config.timeAvailableHours}h limit with previous stops.`,
      });
      remainingMustVisits.splice(bestIdx, 1);
    }
  }

  // 6. Fill remaining time with category-matching pandals near current cluster
  // Sort candidate pool by proximity to current selection or start
  const pool = [...categoryMatched].filter((p) => !selectedPandals.some((s) => s.id === p.id));

  while (pool.length > 0) {
    let bestIdx = 0;
    let minCost = Infinity;

    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      const leg = estimateLegTravel(
        currentLoc,
        { lat: p.lat!, lng: p.lng!, stationId: p.nearestStationId || undefined, name: p.name },
        config
      );

      // Walking tolerance check
      let tolerancePenalty = 0;
      if (config.walkingTolerance === 'low' && leg.distanceMeters > 700) {
        tolerancePenalty = 30; // heavy penalty
      } else if (config.walkingTolerance === 'moderate' && leg.distanceMeters > 1300) {
        tolerancePenalty = 20;
      }

      // Proximity & preference bonus for highlighted pandals
      const highlightBonus = p.highlighted ? -5 : 0;
      const effectiveCost = leg.timeMinutes + tolerancePenalty + highlightBonus;

      if (effectiveCost < minCost) {
        minCost = effectiveCost;
        bestIdx = i;
      }
    }

    const candidate = pool[bestIdx];
    const leg = estimateLegTravel(
      currentLoc,
      {
        lat: candidate.lat!,
        lng: candidate.lng!,
        stationId: candidate.nearestStationId || undefined,
        name: candidate.name,
      },
      config
    );
    const visitTime = getVisitDurationEstimate(candidate);

    if (accumulatedTime + leg.timeMinutes + visitTime <= effectiveBudgetMinutes) {
      selectedPandals.push(candidate);
      accumulatedTime += leg.timeMinutes + visitTime;
      currentLoc = {
        lat: candidate.lat!,
        lng: candidate.lng!,
        stationId: candidate.nearestStationId || undefined,
        name: candidate.name,
      };
      pool.splice(bestIdx, 1);
    } else {
      // Cannot fit any more pandals without exceeding budget
      break;
    }
  }

  // If even after filling we have 0 pandals (e.g. extremely strict filters), pick closest pandal
  if (selectedPandals.length === 0 && validPandals.length > 0) {
    let nearestPandal = validPandals[0];
    let minDist = Infinity;
    for (const p of validPandals) {
      const d = calculateHaversineDistance(startLat, startLng, p.lat!, p.lng!);
      if (d < minDist) {
        minDist = d;
        nearestPandal = p;
      }
    }
    selectedPandals.push(nearestPandal);
  }

  // 7. Improve sequence using 2-Opt to eliminate backtracking
  const optimizedPandals = improveSequence2Opt(selectedPandals, { lat: startLat, lng: startLng });

  // 8. Build detailed stops and legs
  return assembleNightPlan({
    startPoint,
    pandals: optimizedPandals,
    config,
    skippedMustVisits,
    status: 'generated',
  });
}

/**
 * Assembles and calculates a complete NightPlan object from an ordered list of pandals
 */
export async function assembleNightPlan({
  startPoint,
  pandals,
  config,
  skippedMustVisits = [],
  status = 'generated',
}: {
  startPoint: NightPlan['startPoint'];
  pandals: Pandal[];
  config: NightPlanConfig;
  skippedMustVisits?: SkippedMustVisit[];
  status?: NightPlan['status'];
}): Promise<NightPlan> {
  const stops: NightPlanStop[] = [];

  // Stop 0: Starting Node
  const startStop: NightPlanStop = {
    id: `start-node-${Date.now()}`,
    stopNumber: 0,
    type: 'start',
    name: startPoint.label,
    bengaliName: startPoint.bengaliLabel,
    lat: startPoint.lat,
    lng: startPoint.lng,
    isMustVisit: false,
    matchReason: 'Journey Starting Point',
    suggestedVisitMinutes: 0,
  };
  stops.push(startStop);

  let totalVisitMinutes = 0;
  let totalTravelMinutes = 0;
  let totalWalkingDistMeters = 0;

  // Add Pandal stops
  pandals.forEach((p, idx) => {
    const isMustVisit = config.mustVisitPandalIds?.includes(p.id) || false;
    const visitMin = getVisitDurationEstimate(p);
    totalVisitMinutes += visitMin;

    const stop: NightPlanStop = {
      id: p.id,
      stopNumber: idx + 1,
      type: 'pandal',
      pandalId: p.id,
      pandal: p,
      name: p.name,
      bengaliName: p.bengaliName,
      category: p.category,
      neighbourhood: p.neighbourhood,
      lat: p.lat!,
      lng: p.lng!,
      isMustVisit,
      matchReason: explainWhyPandalMatches(p, config, isMustVisit),
      suggestedVisitMinutes: visitMin,
    };
    stops.push(stop);
  });

  // Calculate legs between consecutive stops
  for (let i = 0; i < stops.length - 1; i++) {
    const fromStop = stops[i];
    const toStop = stops[i + 1];

    const leg = estimateLegTravel(
      {
        lat: fromStop.lat,
        lng: fromStop.lng,
        stationId: fromStop.pandal?.nearestStationId || startPoint.stationId,
        name: fromStop.name,
      },
      {
        lat: toStop.lat,
        lng: toStop.lng,
        stationId: toStop.pandal?.nearestStationId,
        name: toStop.name,
      },
      config
    );

    fromStop.legToNext = leg;
    totalTravelMinutes += leg.timeMinutes;
    if (leg.mode === 'walk') {
      totalWalkingDistMeters += leg.distanceMeters;
    }
  }

  // Construct RouteStop array for map polyline routing
  const routeStops: RouteStop[] = stops.map((s, idx) => ({
    id: s.id,
    type: s.type === 'start' ? (startPoint.type === 'metro-station' ? 'station' : 'custom') : 'pandal',
    name: s.name,
    bengaliName: s.bengaliName,
    lat: s.lat,
    lng: s.lng,
    stationId: s.pandal?.nearestStationId || (idx === 0 ? startPoint.stationId : undefined),
    note: s.matchReason,
  }));

  let routeResult: RouteResult | null = null;
  if (routeStops.length >= 2) {
    try {
      routeResult = await getPedestrianRoute(routeStops);
    } catch (err) {
      console.warn('Pedestrian polyline route error:', err);
    }
  }

  const totalDurationMinutes = totalVisitMinutes + totalTravelMinutes;

  return {
    id: `night-plan-${Date.now()}`,
    createdAt: new Date().toISOString(),
    config,
    startPoint,
    stops,
    totalStops: pandals.length,
    totalDurationMinutes,
    totalVisitMinutes,
    totalTravelMinutes,
    totalWalkingDistanceMeters: totalWalkingDistMeters,
    skippedMustVisits,
    routeResult,
    status,
  };
}

/**
 * Recalculate an existing plan after stops are reordered, added, or removed
 */
export async function recalculateNightPlan(
  currentPlan: NightPlan,
  updatedStops: NightPlanStop[]
): Promise<NightPlan> {
  // Separate start node and pandal stops
  const startStop = updatedStops.find((s) => s.type === 'start') || currentPlan.stops[0];
  const pandalStops = updatedStops.filter((s) => s.type === 'pandal' && s.pandal);

  const pandals = pandalStops.map((s) => s.pandal!);

  const startPoint = {
    ...currentPlan.startPoint,
    lat: startStop.lat,
    lng: startStop.lng,
    label: startStop.name,
    bengaliLabel: startStop.bengaliName,
  };

  return assembleNightPlan({
    startPoint,
    pandals,
    config: currentPlan.config,
    skippedMustVisits: currentPlan.skippedMustVisits,
    status: 'modified',
  });
}
