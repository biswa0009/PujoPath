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
import { FilterBar } from './components/FilterBar';
import { PandalCard } from './components/PandalCard';
import { PandalDetails } from './components/PandalDetails';
import { MetroStationList } from './components/MetroStationList';
import { RoutePlanner } from './components/RoutePlanner';
import { AdminModal } from './components/AdminModal';
import { MapLibreMap } from './components/MapLibreMap';
import { BottomSheet } from './components/BottomSheet';

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
  const [activeTab, setActiveTab] = useState<'explore' | 'metro' | 'planner' | 'admin'>('explore');

  // 2. Selection & Navigation
  const [selectedPandal, setSelectedPandal] = useState<Pandal | null>(() => pandals[0] || null);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    null
  );

  // 3. User Saved & Hopping Planner State
  const [favorites, setFavorites] = useState<string[]>(() => loadSavedFavorites());
  const [plannerStops, setPlannerStops] = useState<RouteStop[]>(() => loadSavedItinerary());
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // 4. Map Layer Toggles
  const [showPandals, setShowPandals] = useState(true);
  const [showMetro, setShowMetro] = useState(true);
  const [showRoute, setShowRoute] = useState(true);

  // 5. Admin Modal & Nearby Discovery
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [nearbyBanner, setNearbyBanner] = useState<string | null>(null);

  // Sync favorites to storage
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  // Sync itinerary to storage
  useEffect(() => {
    saveItinerary(plannerStops);
  }, [plannerStops]);

  // Handle keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.kpn-header-search input') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter and Search logic
  const filteredPandals = useMemo(() => {
    return pandals.filter((p) => {
      // Search term
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

      // Metro Line
      if (filters.selectedLine !== 'all') {
        const station = p.nearestStationId ? METRO_STATIONS_BY_ID[p.nearestStationId] : null;
        if (!station || station.lineCode !== filters.selectedLine) {
          return false;
        }
      }

      // Metro Station
      if (filters.selectedStation !== 'all') {
        if (p.nearestStationId !== filters.selectedStation) {
          // Check alternative stations too
          const hasAlt = p.alternativeStations?.some(
            (alt) => alt.stationId === filters.selectedStation
          );
          if (!hasAlt) return false;
        }
      }

      // Zone
      if (filters.selectedZone !== 'all' && p.zone !== filters.selectedZone) {
        return false;
      }

      // Category
      if (filters.selectedCategory !== 'all' && p.category !== filters.selectedCategory) {
        return false;
      }

      // Max walking distance
      if (filters.maxDistanceMeters > 0) {
        if (!p.walkingDistanceMeters || p.walkingDistanceMeters > filters.maxDistanceMeters) {
          return false;
        }
      }

      // Only Verified GPS
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
      setFlyToTarget({ lat: pandal.lat!, lng: pandal.lng!, zoom: 16 });
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
        setFlyToTarget({ lat: st.lat, lng: st.lng, zoom: 15 });
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

  // Add / remove pandal from hopping planner
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

  // Start walking route directly from nearest Metro station to this pandal
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
    setActiveTab('planner');
    setShowRoute(true);

    // Automatically trigger calculation
    setIsLoadingRoute(true);
    getPedestrianRoute(newStops).then((res) => {
      setRouteResult(res);
      setIsLoadingRoute(false);
      setFlyToTarget({ lat: (st.lat + pandal.lat!) / 2, lng: (st.lng + pandal.lng!) / 2, zoom: 15 });
    });
  }, []);

  // Calculate route for all stops in planner
  const handleCalculateRoute = useCallback(async () => {
    if (plannerStops.length < 2) return;
    setIsLoadingRoute(true);
    try {
      const result = await getPedestrianRoute(plannerStops);
      setRouteResult(result);
      setShowRoute(true);

      // Fit center on middle of route
      if (result.coordinates.length > 0) {
        const mid = result.coordinates[Math.floor(result.coordinates.length / 2)];
        setFlyToTarget({ lat: mid[0], lng: mid[1], zoom: 14 });
      }
    } catch (err) {
      console.error('Routing calculation failed:', err);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [plannerStops]);

  // Admin Data Save & Reset
  const handleSavePandals = useCallback((updated: Pandal[]) => {
    setPandals(updated);
    saveCustomPandals(updated);
  }, []);

  const handleResetDefaults = useCallback(() => {
    const fresh = resetPandalsToDefault();
    setPandals(fresh);
    setSelectedPandal(fresh[0] || null);
  }, []);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.selectedLine !== 'all') count++;
    if (filters.selectedStation !== 'all') count++;
    if (filters.selectedZone !== 'all') count++;
    if (filters.selectedCategory !== 'all') count++;
    if (filters.maxDistanceMeters > 0) count++;
    if (filters.onlyVerified) count++;
    return count;
  }, [filters]);

  return (
    <div className="kpn-app">
      {/* 1. TOPBAR & NAVIGATION */}
      <Header
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => setFilters((prev) => ({ ...prev, searchQuery: q }))}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'admin') {
            setIsAdminModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        plannerCount={plannerStops.length}
        totalPandals={pandals.length}
        visibleCount={filteredPandals.length}
      />

      {/* 2. MAIN APPLICATION WORKSPACE */}
      <div className={`kpn-app-layout ${selectedPandal ? 'with-details' : ''}`}>
        {/* LEFT SIDEBAR */}
        <aside className="kpn-sidebar">
          {activeTab === 'explore' && (
            <>
              <FilterBar
                filters={filters}
                onChange={(upd) => setFilters((prev) => ({ ...prev, ...upd }))}
                onReset={() => setFilters(DEFAULT_FILTERS)}
                activeCount={activeFilterCount}
              />

              <div className="kpn-directory-meta">
                <span>
                  Showing <strong>{filteredPandals.length}</strong> of {pandals.length} pandals
                </span>
                {filters.selectedStation !== 'all' && (
                  <span>
                    Near <strong>{METRO_STATIONS_BY_ID[filters.selectedStation]?.name}</strong>
                  </span>
                )}
              </div>

              <div className="kpn-sidebar-scroll">
                {filteredPandals.map((pandal, idx) => (
                  <PandalCard
                    key={pandal.id}
                    pandal={pandal}
                    index={idx}
                    isSelected={selectedPandal?.id === pandal.id}
                    isInPlanner={plannerStops.some((s) => s.id === pandal.id)}
                    isFavorite={favorites.includes(pandal.id)}
                    onSelect={() => handleSelectPandal(pandal)}
                    onTogglePlanner={(e) => handleTogglePlannerPandal(pandal, e)}
                    onToggleFavorite={(e) => handleToggleFavorite(pandal.id, e)}
                  />
                ))}

                {filteredPandals.length === 0 && (
                  <div className="kpn-empty-planner">
                    <span className="kpn-empty-glyph">🔍</span>
                    <p>No pandals match current filters.</p>
                    <small>Try selecting "All Lines" or resetting filter criteria.</small>
                    <button
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      className="kpn-filter-reset-btn"
                      style={{ marginTop: 10 }}
                    >
                      Reset All Filters ↺
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'metro' && (
            <MetroStationList
              pandals={pandals}
              selectedStationId={filters.selectedStation}
              onSelectStation={(stId) => {
                handleSelectStation(stId);
                setActiveTab('explore');
              }}
              onSelectPandal={(p) => handleSelectPandal(p)}
            />
          )}

          {activeTab === 'planner' && (
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
          )}
        </aside>

        {/* CENTER INTERACTIVE VECTOR MAP POWERED BY OPENFREEMAP & OPENMAPTILES */}
        <main className="kpn-map-section">
          {nearbyBanner && (
            <div
              style={{
                position: 'absolute',
                top: '56px',
                left: '14px',
                zIndex: 600,
                background: '#ECFDF5',
                border: '1px solid #6EE7B7',
                color: '#065F46',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>📍 {nearbyBanner}</span>
              <button
                onClick={() => setNearbyBanner(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#065F46',
                }}
              >
                ×
              </button>
            </div>
          )}

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
                  ? `Located you! Found ${count} pandal${count === 1 ? '' : 's'} within 1.5 km of your position.`
                  : 'Located you! No mapped pandals found within 1.5 km of this position.'
              );
              setTimeout(() => setNearbyBanner(null), 7000);
            }}
          />
        </main>

        {/* RIGHT PANDAL DETAILS PANEL */}
        {selectedPandal && (
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
        )}
      </div>

      {/* MOBILE BOTTOM SHEET FOR DIRECTORY ON PHONES */}
      <BottomSheet
        title={activeTab === 'planner' ? 'Hopping Itinerary' : 'Nearby Pandals'}
        count={activeTab === 'planner' ? plannerStops.length : filteredPandals.length}
      >
        {activeTab === 'planner' ? (
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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredPandals.slice(0, 30).map((pandal, idx) => (
              <PandalCard
                key={pandal.id}
                pandal={pandal}
                index={idx}
                isSelected={selectedPandal?.id === pandal.id}
                isInPlanner={plannerStops.some((s) => s.id === pandal.id)}
                isFavorite={favorites.includes(pandal.id)}
                onSelect={() => handleSelectPandal(pandal)}
                onTogglePlanner={(e) => handleTogglePlannerPandal(pandal, e)}
                onToggleFavorite={(e) => handleToggleFavorite(pandal.id, e)}
              />
            ))}
          </div>
        )}
      </BottomSheet>

      {/* ADMIN & DATA MODAL */}
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
