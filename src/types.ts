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
  maxDistanceMeters: number; // 0 for any, or 500, 1000, 2000
  onlyVerified: boolean;
}
