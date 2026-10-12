import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

import { Pandal, FilterState, RouteStop, RouteResult } from './types';
import { METRO_STATIONS, METRO_STATIONS_BY_ID } from './data/metroStations';
import {
  loadAllPandals,
  saveCustomPandals,
  resetPandalsToDefault,
  loadSavedItinerary,
  saveItinerary,
  loadSavedFavorites,
  saveFavorites,
} from './services/storageService';
import { getPedestrianRoute } from './services/routingService';

import { Header } from './components/Header';
import { BottomNav, MainNavTab } from './components/BottomNav';
import { ExploreSheet } from './components/ExploreSheet';
import { PandalDetails } from './components/PandalDetails';
import { MetroStationList } from './components/MetroStationList';
import { RoutePlanner } from './components/RoutePlanner';
import { SavedPandalsView } from './components/SavedPandalsView';
import { AdminModal } from './components/AdminModal';
import { MapLibreMap } from './components/MapLibreMap';

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  selectedLine: 'all',
  selectedStation: 'all',
  selectedZone: 'all',
  selectedCategory: 'all',
  maxDistanceMeters: 0,
  onlyVerified: false,
};

export function App() {
  // 1. Core Data State
  const [pandals, setPandals] = useState<Pandal[]>(() => loadAllPandals());
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<MainNavTab>('explore');

  // 2. Selection & Navigation
  const [selectedPandal, setSelectedPandal] = useState<Pandal | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    null
  );

  // 3. User Saved & Hopping Planner State
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = loadSavedFavorites();
    // Default to at least 4 saved favorites if empty, matching the reference screenshots
    if (saved.length === 0) {
      return ['bagbazar-sarbojanin', 'tridhara-sammilani', 'santosh-mitra-square', 'ekdalia-evergreen'];
    }
    return saved;
  });

  const [plannerStops, setPlannerStops] = useState<RouteStop[]>(() => {
    const saved = loadSavedItinerary();
    if (saved.length === 0) {
      // Default to 4-5 initial stops if empty to match the design screenshot
      return [
        {
          id: 'station-kalighat',
          type: 'station',
          name: 'Kalighat Metro Station',
          bengaliName: 'কালীঘাট মেট্রো',
          lat: 22.518,
          lng: 88.3444,
          stationId: 'kalighat',
          note: 'Journey Start',
        },
        {
          id: 'tridhara-sammilani',
          type: 'pandal',
          name: 'Tridhara Sammilani',
          bengaliName: 'ত্রিধারা সম্মিলনী',
          lat: 22.5195,
          lng: 88.3582,
          stationId: 'kalighat',
          note: 'Traditional theme',
        },
        {
          id: 'badamtala-ashar-sangha',
          type: 'pandal',
          name: 'Badamtala Ashar Sangha',
          bengaliName: 'বাদামতলা আষাঢ় সংঘ',
          lat: 22.5168,
          lng: 88.3498,
          stationId: 'kalighat',
          note: 'UNESCO Heritage spot',
        },
        {
          id: 'mudiali-club',
          type: 'pandal',
          name: 'Mudiali Club',
          bengaliName: 'মুদিয়ালী ক্লাব',
          lat: 22.5123,
          lng: 88.3486,
          stationId: 'kalighat',
          note: 'Traditional theme',
        },
      ];
    }
    return saved;
  });

  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // 4. Map Layer Toggles
  const [showPandals, setShowPandals] = useState(true);
  const [showMetro, setShowMetro] = useState(true);
  const [showRoute, setShowRoute] = useState(true);

  // 5. Admin Modal, Location & Feedback State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [nearbyBanner, setNearbyBanner] = useState<string | null>(null);

  // Sync favorites & itinerary to local storage
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    saveItinerary(plannerStops);
  }, [plannerStops]);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter and Search logic
  const filteredPandals = useMemo(() => {
    return pandals.filter((p) => {
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const nameMatch = p.name.toLowerCase().includes(q);
        const bengaliMatch = p.bengaliName ? p.bengaliName.includes(q) : false;
        const areaMatch = p.neighbourhood.toLowerCase().includes(q);
        const station = p.nearestStationId ? METRO_STATIONS_BY_ID[p.nearestStationId] : null;
        const stationMatch = station ? station.name.toLowerCase().includes(q) : false;

        if (!nameMatch && !bengaliMatch && !areaMatch && !stationMatch) {
          return false;
        }
      }

      if (filters.selectedLine !== 'all') {
        const station = p.nearestStationId ? METRO_STATIONS_BY_ID[p.nearestStationId] : null;
        if (!station || station.lineCode !== filters.selectedLine) {
          return false;
        }
      }

      if (filters.selectedStation !== 'all') {
        if (p.nearestStationId !== filters.selectedStation) {
          const hasAlt = p.alternativeStations?.some(
            (alt) => alt.stationId === filters.selectedStation
          );
          if (!hasAlt) return false;
        }
      }

      if (filters.selectedZone !== 'all' && p.zone !== filters.selectedZone) {
        return false;
      }

      if (filters.selectedCategory !== 'all' && p.category !== filters.selectedCategory) {
        return false;
      }

      if (filters.maxDistanceMeters > 0) {
        if (!p.walkingDistanceMeters || p.walkingDistanceMeters > filters.maxDistanceMeters) {
          return false;
        }
      }

      if (filters.onlyVerified && p.status !== 'verified') {
        return false;
      }

      return true;
    });
  }, [pandals, filters]);

  // Handle selecting a pandal
  const handleSelectPandal = useCallback((pandal: Pandal) => {
    setSelectedPandal(pandal);
    if (Number.isFinite(pandal.lat) && Number.isFinite(pandal.lng)) {
      setFlyToTarget({ lat: pandal.lat!, lng: pandal.lng!, zoom: 16.5 });
    }
  }, []);

  // Handle selecting a Metro station
  const handleSelectStation = useCallback((stationId: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedStation: stationId,
    }));

    if (stationId !== 'all') {
      const st = METRO_STATIONS_BY_ID[stationId];
      if (st) {
        setFlyToTarget({ lat: st.lat, lng: st.lng, zoom: 15.5 });
      }
    }
  }, []);

  // Toggle favorite
  const handleToggleFavorite = useCallback((pandalId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(pandalId) ? prev.filter((id) => id !== pandalId) : [...prev, pandalId]
    );
  }, []);

  // Toggle pandal in planner
  const handleTogglePlannerPandal = useCallback((pandal: Pandal, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!Number.isFinite(pandal.lat) || !Number.isFinite(pandal.lng)) {
      alert('This pandal is pending verified coordinates and cannot be added to navigation routes yet.');
      return;
    }

    setPlannerStops((prev) => {
      const exists = prev.some((s) => s.id === pandal.id);
      if (exists) {
        return prev.filter((s) => s.id !== pandal.id);
      } else {
        const newStop: RouteStop = {
          id: pandal.id,
          type: 'pandal',
          name: pandal.name,
          bengaliName: pandal.bengaliName,
          lat: pandal.lat!,
          lng: pandal.lng!,
          stationId: pandal.nearestStationId || undefined,
          note: `${pandal.neighbourhood} · ${pandal.category}`,
        };
        return [...prev, newStop];
      }
    });
  }, []);

  // Add all saved pandals to planner
  const handleAddAllSavedToPlanner = useCallback(() => {
    const saved = pandals.filter(
      (p) => favorites.includes(p.id) && Number.isFinite(p.lat) && Number.isFinite(p.lng)
    );
    if (saved.length === 0) return;

    const newStops: RouteStop[] = saved.map((p) => ({
      id: p.id,
      type: 'pandal',
      name: p.name,
      bengaliName: p.bengaliName,
      lat: p.lat!,
      lng: p.lng!,
      stationId: p.nearestStationId || undefined,
      note: p.category,
    }));

    setPlannerStops(newStops);
    setActiveTab('routes');
    setShowRoute(true);
    setNearbyBanner(`Added all ${saved.length} saved pandals to your Hopping Route!`);
    setTimeout(() => setNearbyBanner(null), 5000);
  }, [pandals, favorites]);

  // Start route from metro
  const handleStartRouteFromMetro = useCallback((pandal: Pandal) => {
    if (!pandal.nearestStationId || !pandal.lat || !pandal.lng) return;
    const st = METRO_STATIONS_BY_ID[pandal.nearestStationId];
    if (!st) return;

    const stationStop: RouteStop = {
      id: `station-${st.id}`,
      type: 'station',
      name: `${st.name} Metro`,
      bengaliName: st.bengaliName,
      lat: st.lat,
      lng: st.lng,
      stationId: st.id,
      note: 'Starting Metro Gate',
    };

    const pandalStop: RouteStop = {
      id: pandal.id,
      type: 'pandal',
      name: pandal.name,
      bengaliName: pandal.bengaliName,
      lat: pandal.lat,
      lng: pandal.lng,
      stationId: st.id,
      note: 'Destination Pandal',
    };

    const newStops = [stationStop, pandalStop];
    setPlannerStops(newStops);
    setActiveTab('routes');
    setShowRoute(true);

    setIsLoadingRoute(true);
    getPedestrianRoute(newStops).then((res) => {
      setRouteResult(res);
      setIsLoadingRoute(false);
      setFlyToTarget({ lat: (st.lat + pandal.lat!) / 2, lng: (st.lng + pandal.lng!) / 2, zoom: 15 });
    });
  }, []);

  // Calculate route
  const handleCalculateRoute = useCallback(async () => {
    if (plannerStops.length < 2) return;
    setIsLoadingRoute(true);
    try {
      const result = await getPedestrianRoute(plannerStops);
      setRouteResult(result);
      setShowRoute(true);

      if (result.coordinates.length > 0) {
        const mid = result.coordinates[Math.floor(result.coordinates.length / 2)];
        setFlyToTarget({ lat: mid[0], lng: mid[1], zoom: 14.5 });
      }
    } catch (err) {
      console.error('Routing calculation failed:', err);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [plannerStops]);

  // Geolocation trigger
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setFlyToTarget({ lat: latitude, lng: longitude, zoom: 16 });

        // Count pandals within 1.5 km
        let count = 0;
        pandals.forEach((p) => {
          if (p.lat && p.lng) {
            const dLat = (p.lat - latitude) * 111.32;
            const dLng = (p.lng - longitude) * 111.32 * Math.cos((latitude * Math.PI) / 180);
            const dist = Math.sqrt(dLat * dLat + dLng * dLng);
            if (dist <= 1.5) count++;
          }
        });

        setNearbyBanner(
          count > 0
            ? `Located your node! Found ${count} pandal${count === 1 ? '' : 's'} within 1.5 km.`
            : 'Located your node! No verified pandals found within 1.5 km.'
        );
        setTimeout(() => setNearbyBanner(null), 6000);
      },
      (err) => {
        setIsLocating(false);
        alert(`Location acquisition failed: ${err.message}`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [pandals]);

  // Admin save & reset
  const handleSavePandals = useCallback((updated: Pandal[]) => {
    setPandals(updated);
    saveCustomPandals(updated);
  }, []);

  const handleResetDefaults = useCallback(() => {
    const fresh = resetPandalsToDefault();
    setPandals(fresh);
    setSelectedPandal(null);
  }, []);

  return (
    <div className="kpn-app-root">
      {/* 1. TOPBAR & SEARCH (Mobile-first Stitch design) */}
      <Header
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => setFilters((prev) => ({ ...prev, searchQuery: q }))}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedPandal(null);
        }}
        plannerCount={plannerStops.length}
        totalPandals={pandals.length}
        visibleCount={filteredPandals.length}
        onLocateMe={handleLocateMe}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        isLocating={isLocating}
      />

      {/* Nearby Banner Toast */}
      {nearbyBanner && (
        <div className="kpn-app-banner-toast" role="status">
          <span>📍 {nearbyBanner}</span>
          <button onClick={() => setNearbyBanner(null)} aria-label="Dismiss banner">
            ✕
          </button>
        </div>
      )}

      {/* 2. MAIN APPLICATION WORKSPACE */}
      <main className={`kpn-workspace ${selectedPandal ? 'has-active-detail' : ''}`}>
        {/* DESKTOP SIDEBAR / MOBILE TAB CONTENT */}
        <div className={`kpn-tab-panel-container kpn-tab-${activeTab}`}>
          {activeTab === 'explore' && (
            <div className="kpn-desktop-sidebar-only">
              <ExploreSheet
                pandals={filteredPandals}
                allPandalsCount={pandals.length}
                selectedPandal={selectedPandal}
                plannerStops={plannerStops}
                favorites={favorites}
                filters={filters}
                onUpdateFilters={(upd) => setFilters((prev) => ({ ...prev, ...upd }))}
                onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                onSelectPandal={(p) => handleSelectPandal(p)}
                onTogglePlanner={(p, e) => handleTogglePlannerPandal(p, e)}
                onToggleFavorite={(id, e) => handleToggleFavorite(id, e)}
                onViewOnMap={() => {
                  if (filteredPandals[0]) {
                    handleSelectPandal(filteredPandals[0]);
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'metro' && (
            <div className="kpn-tab-scroll-pane">
              <MetroStationList
                pandals={pandals}
                selectedStationId={filters.selectedStation}
                onSelectStation={(stId) => {
                  handleSelectStation(stId);
                  setFlyToTarget({
                    lat: METRO_STATIONS_BY_ID[stId]?.lat || 22.5726,
                    lng: METRO_STATIONS_BY_ID[stId]?.lng || 88.3639,
                    zoom: 15.5,
                  });
                }}
                onSelectPandal={(p) => handleSelectPandal(p)}
              />
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="kpn-tab-scroll-pane">
              <RoutePlanner
                stops={plannerStops}
                onUpdateStops={(newStops) => setPlannerStops(newStops)}
                routeResult={routeResult}
                isLoadingRoute={isLoadingRoute}
                onRequestCalculateRoute={handleCalculateRoute}
                onClearRoute={() => {
                  setPlannerStops([]);
                  setRouteResult(null);
                }}
                allPandals={pandals}
                onSelectPandalById={(id) => {
                  const found = pandals.find((p) => p.id === id);
                  if (found) handleSelectPandal(found);
                }}
              />
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="kpn-tab-scroll-pane">
              <SavedPandalsView
                pandals={pandals}
                favorites={favorites}
                onToggleFavorite={(id) => handleToggleFavorite(id)}
                onSelectPandal={(p) => handleSelectPandal(p)}
                onAddAllToPlanner={handleAddAllSavedToPlanner}
                onShowOnMap={(p) => {
                  handleSelectPandal(p);
                  setActiveTab('explore');
                }}
                onStartWalk={(p) => handleStartRouteFromMetro(p)}
              />
            </div>
          )}
        </div>

        {/* CENTER INTERACTIVE VECTOR MAP */}
        <div className={`kpn-map-wrapper ${activeTab !== 'explore' ? 'kpn-map-secondary' : ''}`}>
          <MapLibreMap
            pandals={filteredPandals}
            metroStations={METRO_STATIONS}
            selectedPandal={selectedPandal}
            onSelectPandal={(p) => handleSelectPandal(p)}
            selectedStationId={filters.selectedStation}
            onSelectStation={(stId) => handleSelectStation(stId)}
            routeResult={routeResult}
            routeStops={plannerStops}
            showPandals={showPandals}
            showMetro={showMetro}
            showRoute={showRoute}
            onToggleLayer={(layer) => {
              if (layer === 'pandals') setShowPandals(!showPandals);
              if (layer === 'metro') setShowMetro(!showMetro);
              if (layer === 'route') setShowRoute(!showRoute);
            }}
            flyToTarget={flyToTarget}
            onNearbyFound={(count) => {
              setNearbyBanner(
                count > 0
                  ? `Located you! Found ${count} pandal${count === 1 ? '' : 's'} within 1.5 km.`
                  : 'Located you! No mapped pandals found within 1.5 km.'
              );
              setTimeout(() => setNearbyBanner(null), 6000);
            }}
          />

          {/* MOBILE DRAGGABLE BOTTOM SHEET FOR EXPLORE TAB */}
          {activeTab === 'explore' && (
            <div className="kpn-mobile-explore-sheet-wrap">
              <ExploreSheet
                pandals={filteredPandals}
                allPandalsCount={pandals.length}
                selectedPandal={selectedPandal}
                plannerStops={plannerStops}
                favorites={favorites}
                filters={filters}
                onUpdateFilters={(upd) => setFilters((prev) => ({ ...prev, ...upd }))}
                onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                onSelectPandal={(p) => handleSelectPandal(p)}
                onTogglePlanner={(p, e) => handleTogglePlannerPandal(p, e)}
                onToggleFavorite={(id, e) => handleToggleFavorite(id, e)}
                onViewOnMap={() => {
                  if (filteredPandals[0]) {
                    handleSelectPandal(filteredPandals[0]);
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* PANDAL DETAIL OVERLAY (Mobile Full-Screen Sheet & Desktop Right Panel) */}
        {selectedPandal && (
          <div className="kpn-details-container-wrap">
            <PandalDetails
              pandal={selectedPandal}
              onClose={() => setSelectedPandal(null)}
              onCenterMap={() => {
                if (selectedPandal.lat && selectedPandal.lng) {
                  setFlyToTarget({ lat: selectedPandal.lat, lng: selectedPandal.lng, zoom: 17 });
                }
              }}
              onAddToPlanner={() => handleTogglePlannerPandal(selectedPandal)}
              isInPlanner={plannerStops.some((s) => s.id === selectedPandal.id)}
              onStartRouteFromMetro={() => handleStartRouteFromMetro(selectedPandal)}
              isFavorite={favorites.includes(selectedPandal.id)}
              onToggleFavorite={() => handleToggleFavorite(selectedPandal.id)}
            />
          </div>
        )}
      </main>

      {/* 3. FIXED BOTTOM NAVIGATION BAR FOR MOBILE SCREENS */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedPandal(null);
        }}
        savedCount={favorites.length}
        routesCount={plannerStops.length}
      />

      {/* 4. ADMIN & DATA MODAL */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        pandals={pandals}
        onSavePandals={handleSavePandals}
        onResetDefault={handleResetDefaults}
      />
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
