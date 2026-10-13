export type MetroLineCode = 'blue' | 'green' | 'purple' | 'orange' | 'yellow';

export interface MetroLine {
  id: string;
  code: MetroLineCode;
  name: string;
  color: string;
  textColor: string;
  description: string;
  terminals: string;
}

export interface MetroStation {
  id: string;
  name: string;
  bengaliName?: string;
  line: string;
  lineCode: MetroLineCode;
  lat: number;
  lng: number;
  zone: 'North' | 'Central' | 'South' | 'Salt Lake / East' | 'South-West';
  operational: boolean;
  interchange?: boolean;
  source?: string;
}

export interface Pandal {
  id: string;
  name: string;
  bengaliName?: string;
  neighbourhood: string;
  zone: 'North' | 'Central' | 'South' | 'Salt Lake / East' | 'South-West';
  address: string;
  lat: number | null;
  lng: number | null;
  category: 'Traditional' | 'Theme' | 'Heritage Rajbari' | 'Contemporary Landmark';
  nearestStationId: string | null;
  alternativeStations?: Array<{
    stationId: string;
    distanceMeters: number;
    walkingTimeMinutes: number;
  }>;
  walkingDistanceMeters: number | null;
  walkingTimeMinutes: number | null;
  walkNote?: string;
  theme?: string;
  imageUrl?: string;
  knownFor: string;
  sourceUrl?: string;
  lastVerifiedDate: string;
  status: 'verified' | 'area-only';
  highlighted?: boolean;
}

export interface RouteStop {
  id: string;
  type: 'station' | 'pandal' | 'custom';
  name: string;
  bengaliName?: string;
  lat: number;
  lng: number;
  note?: string;
  stationId?: string;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] array for Leaflet Polyline
  totalDistanceMeters: number;
  totalTimeMinutes: number;
  legs: {
    fromName: string;
    toName: string;
    distanceMeters: number;
    timeMinutes: number;
    instructions: string[];
  }[];
  metroTransferAdvice?: string[];
  source: 'osrm' | 'fallback';
}

export interface FilterState {
  searchQuery: string;
  selectedLine: string; // 'all' or lineCode
  selectedStation: string; // 'all' or stationId
  selectedZone: string; // 'all' or zone
  selectedCategory: string; // 'all' or category
  selectedStyle: string; // 'all' or artistic style
  maxDistanceMeters: number; // 0 for any, or 500, 1000, 2000
  onlyVerified: boolean;
  featuredOnly?: boolean;
}

// ========================================================
// PUJO NIGHT PLANNER TYPES
// ========================================================

export type StartLocationType = 'current-location' | 'metro-station' | 'pandal';
export type EndLocationType = 'same-as-start' | 'metro-station' | 'pandal' | 'none';

export type TimeBudgetHours = 2 | 3 | 4 | 6;

export type PujoCategoryPreference =
  | 'Traditional'
  | 'Theme'
  | 'Heritage Rajbari'
  | 'Contemporary Landmark';

export type TravelPreference = 'walking-first' | 'metro-assisted' | 'balanced' | 'minimal' | 'walking-focused';

export type WalkingTolerance = 'low' | 'moderate' | 'high';

export type DiscoveryPreference =
  | 'max-pandals'
  | 'famous-first'
  | 'heritage-first'
  | 'artistic-first'
  | 'relaxed';

export interface NightPlanConfig {
  startType: StartLocationType;
  startStationId?: string;
  startPandalId?: string;
  startCoords?: { lat: number; lng: number; label: string; bengaliLabel?: string };
  endType?: EndLocationType;
  endStationId?: string;
  endPandalId?: string;
  endCoords?: { lat: number; lng: number; label: string; bengaliLabel?: string };
  timeAvailableHours: number; // 2, 3, 4, 6 or custom
  categories: PujoCategoryPreference[];
  includeFeatured?: boolean;
  travelPreference: TravelPreference;
  walkingTolerance: WalkingTolerance;
  discoveryPreference?: DiscoveryPreference;
  maxStops?: number;
  preferredDwellMinutes?: number;
  mustVisitPandalIds: string[];
  excludedPandalIds?: string[];
  startTime?: string; // e.g. "20:00"
}

export interface NightPlanLeg {
  fromName: string;
  toName: string;
  distanceMeters: number;
  timeMinutes: number;
  mode: 'walk' | 'metro';
  description: string;
  metroAdvice?: string;
}

export interface NightPlanStop {
  id: string;
  stopNumber: number; // 0 for starting node, 1, 2, 3... for pandals, last for ending node if applicable
  type: 'start' | 'pandal' | 'end';
  pandalId?: string;
  pandal?: Pandal;
  name: string;
  bengaliName?: string;
  category?: string;
  neighbourhood?: string;
  lat: number;
  lng: number;
  isMustVisit: boolean;
  matchReason: string;
  suggestedVisitMinutes: number; // planning estimate
  arrivalTime?: string;
  departureTime?: string;
  legToNext?: NightPlanLeg;
}

export interface SkippedMustVisit {
  pandalId: string;
  name: string;
  bengaliName?: string;
  reason: string;
}

export interface NightPlan {
  id: string;
  createdAt: string;
  config: NightPlanConfig;
  startPoint: {
    label: string;
    bengaliLabel?: string;
    lat: number;
    lng: number;
    type: StartLocationType;
    stationId?: string;
    pandalId?: string;
  };
  endPoint?: {
    label: string;
    bengaliLabel?: string;
    lat: number;
    lng: number;
    type: EndLocationType;
    stationId?: string;
    pandalId?: string;
  };
  stops: NightPlanStop[]; // stops including start node as stops[0] and optional end node
  totalStops: number; // number of pandal stops
  totalDurationMinutes: number; // total visit + travel minutes
  totalVisitMinutes: number;
  totalTravelMinutes: number;
  totalWalkingDistanceMeters: number;
  skippedMustVisits: SkippedMustVisit[];
  routeResult: RouteResult | null;
  status: 'draft' | 'generated' | 'modified';
}

