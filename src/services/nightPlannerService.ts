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
 * Returns estimated visit duration in minutes based on pandal category, scale, and user dwell preference
 */
export function getVisitDurationEstimate(pandal: Pandal, config: NightPlanConfig): number {
  if (config.preferredDwellMinutes && config.preferredDwellMinutes > 0) {
    // Respect custom dwell preference while adding minor bump for grand landmarks
    if (pandal.highlighted || pandal.category === 'Contemporary Landmark') {
      return Math.round(config.preferredDwellMinutes * 1.2);
    }
    return config.preferredDwellMinutes;
  }

  // Adjust by discovery preference
  if (config.discoveryPreference === 'relaxed') {
    if (pandal.highlighted || pandal.category === 'Contemporary Landmark') return 45;
    if (pandal.category === 'Theme') return 40;
    if (pandal.category === 'Heritage Rajbari') return 35;
    return 35;
  }

  if (config.discoveryPreference === 'max-pandals') {
    if (pandal.highlighted || pandal.category === 'Contemporary Landmark') return 25;
    if (pandal.category === 'Theme') return 20;
    if (pandal.category === 'Heritage Rajbari') return 18;
    return 18;
  }

  // Default balanced estimates
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
 * Explains clearly why a pandal was selected based on user preferences and route logic
 */
export function explainWhyPandalMatches(
  pandal: Pandal,
  config: NightPlanConfig,
  isMustVisit: boolean
): string {
  if (isMustVisit) {
    return `Selected as your Must-Visit stop · ${pandal.knownFor || pandal.theme || pandal.category}`;
  }

  if (config.discoveryPreference === 'famous-first' && (pandal.highlighted || pandal.category === 'Contemporary Landmark')) {
    return `Prioritized for Famous Attractions preference · High-footfall puja icon in ${pandal.neighbourhood}`;
  }

  if (config.discoveryPreference === 'heritage-first' && (pandal.category === 'Heritage Rajbari' || pandal.category === 'Traditional')) {
    return `Selected for Heritage & Bonedi Bari preference · Centenary Sabeki tradition in ${pandal.neighbourhood}`;
  }

  if (config.discoveryPreference === 'artistic-first' && pandal.category === 'Theme') {
    return `Chosen for Artistic Theme preference · ${pandal.theme || 'Innovative craft installation'}`;
  }

  if (config.travelPreference === 'minimal' && pandal.nearestStationId) {
    const st = METRO_STATIONS_BY_ID[pandal.nearestStationId];
    return `Convenient low-walking stop near ${st?.name || 'Metro'} Station (~${pandal.walkingDistanceMeters || 450}m)`;
  }

  if (config.includeFeatured && pandal.highlighted) {
    return `Featured Landmark Puja · ${pandal.knownFor || 'High-footfall Durga Puja icon'}`;
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
      return `Matches your Contemporary Landmark preference · ${pandal.knownFor || 'Grand carnival attraction'}`;
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
    Boolean(st1 && st2 && st1.id !== st2.id && st1.operational && st2.operational && approxWalkDist > 900);

  // Decide mode based on preference
  let useMetro = false;
  if (canUseMetro) {
    if ((config.travelPreference === 'minimal' || config.travelPreference === 'metro-assisted') && approxWalkDist > 800) {
      useMetro = true;
    } else if (config.travelPreference === 'balanced' && approxWalkDist > 1500) {
      useMetro = true;
    } else if ((config.travelPreference === 'walking-focused' || config.travelPreference === 'walking-first') && approxWalkDist > 2600) {
      useMetro = true;
    }
  }

  // Walking tolerance factor
  if (config.walkingTolerance === 'low' && approxWalkDist > 650 && canUseMetro) {
    useMetro = true;
  }

  if (useMetro && st1 && st2) {
    const distKm = approxWalkDist / 1000;
    const sameLine = st1.lineCode === st2.lineCode;
    const baseRideMin = Math.round(distKm * 2.4);
    const metroRideMinutes = sameLine
      ? Math.max(8, baseRideMin + 4)
      : Math.max(16, baseRideMin + 12);

    const metroAdvice = sameLine
      ? `Take Kolkata Metro (${st1.line}) from ${st1.name} to ${st2.name} (~${metroRideMinutes} min)`
      : `Take Metro from ${st1.name} to ${st2.name} with interchange at Central / Esplanade (~${metroRideMinutes} min)`;

    return {
      fromName: from.name,
      toName: to.name,
      distanceMeters: approxWalkDist,
      timeMinutes: metroRideMinutes + 5, // 5 min access/egress walk
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
 * Supports optional fixed destination endpoint
 */
function improveSequence2Opt(
  pandalStops: Pandal[],
  startCoords: { lat: number; lng: number },
  endCoords?: { lat: number; lng: number }
): Pandal[] {
  if (pandalStops.length <= 2) return [...pandalStops];

  const route = [...pandalStops];

  const getDistance = (
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number }
  ) => calculateHaversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);

  let improved = true;
  let iterations = 0;
  const maxIterations = 30;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const prevNode = i === 0 ? startCoords : { lat: route[i - 1].lat!, lng: route[i - 1].lng! };
        const nodeI = { lat: route[i].lat!, lng: route[i].lng! };
        const nodeK = { lat: route[k].lat!, lng: route[k].lng! };
        const nextNode =
          k === route.length - 1 ? (endCoords || null) : { lat: route[k + 1].lat!, lng: route[k + 1].lng! };

        const currentDist =
          getDistance(prevNode, nodeI) + (nextNode ? getDistance(nodeK, nextNode) : 0);
        const newDist =
          getDistance(prevNode, nodeK) + (nextNode ? getDistance(nodeI, nextNode) : 0);

        if (newDist < currentDist - 30) {
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
 * Helper to calculate clock time (HH:MM AM/PM) after N minutes
 */
function formatClockTime(startTimeStr: string, minutesOffset: number): string {
  const parts = startTimeStr.split(':');
  let startHour = parseInt(parts[0], 10) || 19;
  let startMin = parseInt(parts[1], 10) || 0;

  const totalMinutes = startHour * 60 + startMin + minutesOffset;
  const dayMinutes = totalMinutes % (24 * 60);
  const hour24 = Math.floor(dayMinutes / 60);
  const mins = dayMinutes % 60;

  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;

  return `${hour12}:${paddedMins} ${period}`;
}

/**
 * Core Algorithm: Generate a genuinely personalized Durga Puja Night Itinerary
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
    startLabel = config.startCoords.label || 'Current Location';
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

  // 2. Resolve ending point
  let endPoint: NightPlan['endPoint'] | undefined = undefined;
  let endLat = startLat;
  let endLng = startLng;
  let endStationId: string | undefined = undefined;
  let hasFixedEnd = false;

  const endType = config.endType || 'same-as-start';

  if (endType === 'same-as-start') {
    hasFixedEnd = true;
    endLat = startLat;
    endLng = startLng;
    endStationId = startStationId;
    endPoint = {
      label: `Return to ${startLabel}`,
      bengaliLabel: startBengaliLabel ? `${startBengaliLabel}-এ প্রত্যাবর্তন` : undefined,
      lat: startLat,
      lng: startLng,
      type: 'same-as-start',
      stationId: startStationId,
      pandalId: config.startPandalId,
    };
  } else if (endType === 'metro-station' && config.endStationId) {
    const st = METRO_STATIONS_BY_ID[config.endStationId];
    if (st) {
      hasFixedEnd = true;
      endLat = st.lat;
      endLng = st.lng;
      endStationId = st.id;
      endPoint = {
        label: `${st.name} Metro Station`,
        bengaliLabel: st.bengaliName ? `${st.bengaliName} মেট্রো` : undefined,
        lat: st.lat,
        lng: st.lng,
        type: 'metro-station',
        stationId: st.id,
      };
    }
  } else if (endType === 'pandal' && config.endPandalId) {
    const p = allPandals.find((p) => p.id === config.endPandalId);
    if (p && p.lat && p.lng) {
      hasFixedEnd = true;
      endLat = p.lat;
      endLng = p.lng;
      endStationId = p.nearestStationId || undefined;
      endPoint = {
        label: p.name,
        bengaliLabel: p.bengaliName,
        lat: p.lat,
        lng: p.lng,
        type: 'pandal',
        pandalId: p.id,
        stationId: p.nearestStationId || undefined,
      };
    }
  }

  // 3. Filter candidate pandals
  const excludedSet = new Set(config.excludedPandalIds || []);
  const validPandals = allPandals.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      p.lat !== 0 &&
      p.lng !== 0 &&
      !excludedSet.has(p.id) &&
      (config.startType !== 'pandal' || p.id !== config.startPandalId) &&
      (endType !== 'pandal' || p.id !== config.endPandalId)
  );

  // 4. Must-Visit pandals
  const mustVisitSet = new Set(config.mustVisitPandalIds || []);
  const mustVisitPandals = validPandals.filter((p) => mustVisitSet.has(p.id));

  // 5. Category & preference matching pool
  const candidatePool = validPandals.filter((p) => {
    if (mustVisitSet.has(p.id)) return false; // Evaluated with must-visits first

    // Include if explicitly requested featured/famous
    if (config.includeFeatured && (p.highlighted || p.category === 'Contemporary Landmark')) {
      return true;
    }

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

  // 6. Time budget constraints
  const totalBudgetMinutes = (config.timeAvailableHours || 3) * 60;
  // Safety buffer (10-15 mins) for nighttime crowd
  const effectiveBudgetMinutes = Math.max(60, totalBudgetMinutes - 15);

  const selectedPandals: Pandal[] = [];
  const skippedMustVisits: SkippedMustVisit[] = [];

  let accumulatedTime = 0;
  let currentLoc = { lat: startLat, lng: startLng, stationId: startStationId, name: startLabel };

  const maxStopsLimit = config.maxStops && config.maxStops > 0 ? config.maxStops : 12;

  // Helper to calculate travel cost back to destination endpoint
  const getEndTravelCost = (fromLoc: { lat: number; lng: number; stationId?: string; name: string }): number => {
    if (!hasFixedEnd) return 0;
    const leg = estimateLegTravel(
      fromLoc,
      { lat: endLat, lng: endLng, stationId: endStationId, name: endPoint?.label || 'Finish' },
      config
    );
    return leg.timeMinutes;
  };

  // 7. Insert Must-Visit Pandals first (respecting endpoint transit reserve)
  const remainingMustVisits = [...mustVisitPandals];
  while (remainingMustVisits.length > 0 && selectedPandals.length < maxStopsLimit) {
    let bestIdx = 0;
    let minCost = Infinity;

    for (let i = 0; i < remainingMustVisits.length; i++) {
      const p = remainingMustVisits[i];
      const leg = estimateLegTravel(
        currentLoc,
        { lat: p.lat!, lng: p.lng!, stationId: p.nearestStationId || undefined, name: p.name },
        config
      );
      if (leg.timeMinutes < minCost) {
        minCost = leg.timeMinutes;
        bestIdx = i;
      }
    }

    const candidate = remainingMustVisits[bestIdx];
    const legToCandidate = estimateLegTravel(
      currentLoc,
      { lat: candidate.lat!, lng: candidate.lng!, stationId: candidate.nearestStationId || undefined, name: candidate.name },
      config
    );
    const visitTime = getVisitDurationEstimate(candidate, config);
    const endCost = getEndTravelCost({
      lat: candidate.lat!,
      lng: candidate.lng!,
      stationId: candidate.nearestStationId || undefined,
      name: candidate.name,
    });

    if (accumulatedTime + legToCandidate.timeMinutes + visitTime + endCost <= effectiveBudgetMinutes) {
      selectedPandals.push(candidate);
      accumulatedTime += legToCandidate.timeMinutes + visitTime;
      currentLoc = {
        lat: candidate.lat!,
        lng: candidate.lng!,
        stationId: candidate.nearestStationId || undefined,
        name: candidate.name,
      };
      remainingMustVisits.splice(bestIdx, 1);
    } else {
      const distFromStart = Math.round(
        calculateHaversineDistance(startLat, startLng, candidate.lat!, candidate.lng!) / 1000
      );
      skippedMustVisits.push({
        pandalId: candidate.id,
        name: candidate.name,
        bengaliName: candidate.bengaliName,
        reason: `Located ~${distFromStart} km away. Travel & visit time (~${legToCandidate.timeMinutes + visitTime + endCost} mins with return) exceeds your ${config.timeAvailableHours}h budget.`,
      });
      remainingMustVisits.splice(bestIdx, 1);
    }
  }

  // 8. Multi-Attribute Scoring for Candidate Selection
  const pool = [...candidatePool].filter((p) => !selectedPandals.some((s) => s.id === p.id));

  while (pool.length > 0 && selectedPandals.length < maxStopsLimit) {
    let bestIdx = -1;
    let bestScore = Infinity;

    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      const leg = estimateLegTravel(
        currentLoc,
        { lat: p.lat!, lng: p.lng!, stationId: p.nearestStationId || undefined, name: p.name },
        config
      );
      const visitTime = getVisitDurationEstimate(p, config);
      const endCost = getEndTravelCost({
        lat: p.lat!,
        lng: p.lng!,
        stationId: p.nearestStationId || undefined,
        name: p.name,
      });

      // Feasibility check: Can we visit AND still make it to the endpoint in time?
      if (accumulatedTime + leg.timeMinutes + visitTime + endCost > effectiveBudgetMinutes) {
        continue;
      }

      // Preference weighting bonuses (lower score = higher priority)
      let preferenceBonus = 0;

      if (config.discoveryPreference === 'famous-first' && (p.highlighted || p.category === 'Contemporary Landmark')) {
        preferenceBonus -= 40;
      }
      if (config.discoveryPreference === 'heritage-first' && (p.category === 'Heritage Rajbari' || p.category === 'Traditional')) {
        preferenceBonus -= 40;
      }
      if (config.discoveryPreference === 'artistic-first' && p.category === 'Theme') {
        preferenceBonus -= 40;
      }
      if (config.discoveryPreference === 'max-pandals' && leg.distanceMeters < 850) {
        preferenceBonus -= 30; // prefer close clustering
      }
      if (config.includeFeatured && p.highlighted) {
        preferenceBonus -= 25;
      }
      if (config.categories.includes(p.category as any)) {
        preferenceBonus -= 15;
      }

      // Walking tolerance penalty
      let walkingPenalty = 0;
      if (config.travelPreference === 'minimal' && leg.distanceMeters > 550) {
        walkingPenalty = 35;
      } else if (config.walkingTolerance === 'low' && leg.distanceMeters > 750) {
        walkingPenalty = 25;
      }

      const score = leg.timeMinutes + walkingPenalty + preferenceBonus;

      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      const candidate = pool[bestIdx];
      const leg = estimateLegTravel(
        currentLoc,
        { lat: candidate.lat!, lng: candidate.lng!, stationId: candidate.nearestStationId || undefined, name: candidate.name },
        config
      );
      const visitTime = getVisitDurationEstimate(candidate, config);

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
      // No more candidates fit within budget
      break;
    }
  }

  // If strict filtering resulted in 0 pandals, pick the single closest match
  if (selectedPandals.length === 0 && validPandals.length > 0) {
    let nearest = validPandals[0];
    let minDist = Infinity;
    for (const p of validPandals) {
      const d = calculateHaversineDistance(startLat, startLng, p.lat!, p.lng!);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }
    selectedPandals.push(nearest);
  }

  // 9. 2-Opt Sequence Optimization (respecting fixed start and optional fixed end)
  const endCoords = hasFixedEnd ? { lat: endLat, lng: endLng } : undefined;
  const optimizedPandals = improveSequence2Opt(
    selectedPandals,
    { lat: startLat, lng: startLng },
    endCoords
  );

  // 10. Assemble complete plan
  return assembleNightPlan({
    startPoint,
    endPoint,
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
  endPoint,
  pandals,
  config,
  skippedMustVisits = [],
  status = 'generated',
}: {
  startPoint: NightPlan['startPoint'];
  endPoint?: NightPlan['endPoint'];
  pandals: Pandal[];
  config: NightPlanConfig;
  skippedMustVisits?: SkippedMustVisit[];
  status?: NightPlan['status'];
}): Promise<NightPlan> {
  const stops: NightPlanStop[] = [];

  const startTimeStr = config.startTime || '19:00';
  let runningMinutes = 0;

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
    departureTime: formatClockTime(startTimeStr, runningMinutes),
  };
  stops.push(startStop);

  let totalVisitMinutes = 0;
  let totalTravelMinutes = 0;
  let totalWalkingDistMeters = 0;

  // Add Pandal stops
  pandals.forEach((p, idx) => {
    const isMustVisit = config.mustVisitPandalIds?.includes(p.id) || false;
    const visitMin = getVisitDurationEstimate(p, config);
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

  // Calculate legs between consecutive pandal stops
  for (let i = 0; i < stops.length - 1; i++) {
    const fromStop = stops[i];
    const toStop = stops[i + 1];

    const leg = estimateLegTravel(
      {
        lat: fromStop.lat,
        lng: fromStop.lng,
        stationId: fromStop.pandal?.nearestStationId || (i === 0 ? startPoint.stationId : undefined),
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

    runningMinutes += leg.timeMinutes;
    toStop.arrivalTime = formatClockTime(startTimeStr, runningMinutes);
    runningMinutes += toStop.suggestedVisitMinutes;
    toStop.departureTime = formatClockTime(startTimeStr, runningMinutes);
  }

  // If ending point is defined and valid, append end node
  if (endPoint && endPoint.type !== 'none' && stops.length > 1) {
    const lastPandal = stops[stops.length - 1];
    const legToEnd = estimateLegTravel(
      {
        lat: lastPandal.lat,
        lng: lastPandal.lng,
        stationId: lastPandal.pandal?.nearestStationId,
        name: lastPandal.name,
      },
      {
        lat: endPoint.lat,
        lng: endPoint.lng,
        stationId: endPoint.stationId,
        name: endPoint.label,
      },
      config
    );

    lastPandal.legToNext = legToEnd;
    totalTravelMinutes += legToEnd.timeMinutes;
    if (legToEnd.mode === 'walk') {
      totalWalkingDistMeters += legToEnd.distanceMeters;
    }

    runningMinutes += legToEnd.timeMinutes;

    const endStop: NightPlanStop = {
      id: `end-node-${Date.now()}`,
      stopNumber: stops.length,
      type: 'end',
      name: endPoint.label,
      bengaliName: endPoint.bengaliLabel,
      lat: endPoint.lat,
      lng: endPoint.lng,
      isMustVisit: false,
      matchReason: 'Journey Finish Point',
      suggestedVisitMinutes: 0,
      arrivalTime: formatClockTime(startTimeStr, runningMinutes),
    };
    stops.push(endStop);
  }

  // Construct RouteStop array for map polyline routing
  const routeStops: RouteStop[] = stops.map((s, idx) => ({
    id: s.id,
    type: s.type === 'start' ? (startPoint.type === 'metro-station' ? 'station' : 'custom') : s.type === 'end' ? 'custom' : 'pandal',
    name: s.name,
    bengaliName: s.bengaliName,
    lat: s.lat,
    lng: s.lng,
    stationId: s.pandal?.nearestStationId || (idx === 0 ? startPoint.stationId : (s.type === 'end' ? endPoint?.stationId : undefined)),
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
    endPoint,
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
    endPoint: currentPlan.endPoint,
    pandals,
    config: currentPlan.config,
    skippedMustVisits: currentPlan.skippedMustVisits,
    status: 'modified',
  });
}
