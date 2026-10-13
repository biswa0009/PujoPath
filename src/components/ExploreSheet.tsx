import React, { useState, useMemo } from 'react';
import { Pandal, FilterState } from '../types';
import { PandalCard } from './PandalCard';
import { BottomSheet, SheetSnapState } from './BottomSheet';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  FilterIcon,
  MapPinIcon,
  SearchIcon,
  CloseIcon,
  ShieldCheckIcon,
  RouteIcon,
  HeartIcon,
  ExternalLinkIcon,
  InfoIcon,
} from './Icons';
import { METRO_LINES } from '../data/metroLines';
import { METRO_STATIONS, METRO_STATIONS_BY_ID } from '../data/metroStations';
import { CATEGORY_STYLES, ARTISTIC_STYLES } from '../data/categoryMeta';

interface ExploreSheetProps {
  pandals: Pandal[];
  allPandalsCount: number;
  featuredPandals: Pandal[];
  selectedPandal: Pandal | null;
  plannerStops: { id: string }[];
  favorites: string[];
  filters: FilterState;
  onUpdateFilters: (upd: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onSelectPandal: (pandal: Pandal) => void;
  onDeselectPandal?: () => void;
  onOpenFullDetails?: (pandal: Pandal) => void;
  onTogglePlanner: (pandal: Pandal, e: React.MouseEvent) => void;
  onToggleFavorite: (pandalId: string, e: React.MouseEvent) => void;
  onViewOnMap: () => void;
  isMobileSheet?: boolean;
  sheetState?: SheetSnapState;
  onSheetStateChange?: (state: SheetSnapState) => void;
}

export function ExploreSheet({
  pandals,
  allPandalsCount,
  featuredPandals,
  selectedPandal,
  plannerStops,
  favorites,
  filters,
  onUpdateFilters,
  onResetFilters,
  onSelectPandal,
  onDeselectPandal,
  onOpenFullDetails,
  onTogglePlanner,
  onToggleFavorite,
  onViewOnMap,
  isMobileSheet = false,
  sheetState = 'half',
  onSheetStateChange,
}: ExploreSheetProps) {
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Active station name
  const activeStation =
    filters.selectedStation !== 'all'
      ? METRO_STATIONS_BY_ID[filters.selectedStation]?.name
      : null;

  // Active filters count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.selectedZone !== 'all') count++;
    if (filters.selectedCategory !== 'all') count++;
    if (filters.selectedStyle && filters.selectedStyle !== 'all') count++;
    if (filters.selectedStation !== 'all') count++;
    if (filters.selectedLine !== 'all') count++;
    if (filters.onlyVerified) count++;
    if (filters.featuredOnly) count++;
    return count;
  }, [filters]);

  // Selected Category Meta
  const activeCategoryMeta =
    filters.selectedCategory !== 'all' ? CATEGORY_STYLES[filters.selectedCategory] : null;

  // Selected Style Meta
  const activeStyleMeta =
    filters.selectedStyle && filters.selectedStyle !== 'all'
      ? ARTISTIC_STYLES.find((s) => s.id === filters.selectedStyle)
      : null;

  // Render the header content
  const renderHeader = () => (
    <div className="kpn-sheet-header-row">
      <div className="kpn-sheet-title-left">
        <h2 className="kpn-sheet-main-title">Kolkata Pandals</h2>
        <span className="kpn-badge-live-count">{pandals.length} Showing</span>
        {allPandalsCount !== pandals.length && (
          <small className="kpn-sub-of-total">of {allPandalsCount}</small>
        )}
      </div>

      <button
        type="button"
        className={`kpn-btn-filter-trigger ${activeFiltersCount > 0 ? 'is-filtered' : ''}`}
        onClick={() => setShowFiltersModal(true)}
        aria-label="Open comprehensive filters"
        id="explore-open-filters-modal-btn"
      >
        <FilterIcon size={14} />
        <span>Filters</span>
        {activeFiltersCount > 0 && (
          <span className="kpn-active-filter-badge">{activeFiltersCount}</span>
        )}
      </button>
    </div>
  );

  // Render collapsed preview bar (compact state)
  const renderCollapsedPreview = () => (
    <div className="kpn-explore-collapsed-bar" onClick={() => onSheetStateChange?.('half')}>
      <div className="kpn-collapsed-title-group">
        <span className="kpn-collapsed-dot">🪔</span>
        <strong>Kolkata Pandals</strong>
        <span className="kpn-badge-live-count">{pandals.length}</span>
      </div>
      <div className="kpn-collapsed-action-hint">
        <span>Tap or swipe up to browse</span>
      </div>
    </div>
  );

  // Render Filter Controls & Quick Chips
  const renderFilterBars = () => (
    <>
      <div className="kpn-sheet-filter-bar">
        <div className="kpn-filter-quick-chips-scroll">
          {/* Quick Line filter buttons */}
          <button
            type="button"
            className={`kpn-quick-chip ${filters.selectedLine === 'all' ? 'is-active' : ''}`}
            onClick={() => onUpdateFilters({ selectedLine: 'all' })}
          >
            All Lines
          </button>
          {METRO_LINES.filter((l) => ['blue', 'green', 'purple'].includes(l.code)).map((l) => (
            <button
              key={l.code}
              type="button"
              className={`kpn-quick-chip ${filters.selectedLine === l.code ? 'is-active' : ''}`}
              onClick={() =>
                onUpdateFilters({
                  selectedLine: filters.selectedLine === l.code ? 'all' : l.code,
                })
              }
            >
              <span className="kpn-chip-dot" style={{ backgroundColor: l.color }} />
              {l.name.replace(' (Line 1)', '').replace(' (Line 2)', '').replace(' (Line 3)', '')}
            </button>
          ))}

          {/* Quick Verified GPS chip */}
          <button
            type="button"
            className={`kpn-quick-chip ${filters.onlyVerified ? 'is-verified-active' : ''}`}
            onClick={() => onUpdateFilters({ onlyVerified: !filters.onlyVerified })}
            id="filter-chip-verified-gps"
          >
            <ShieldCheckIcon size={12} />
            <span>Verified GPS</span>
          </button>

          {/* Quick Famous / Featured chip */}
          <button
            type="button"
            className={`kpn-quick-chip ${filters.featuredOnly ? 'is-featured-active' : ''}`}
            onClick={() => onUpdateFilters({ featuredOnly: !filters.featuredOnly })}
            id="filter-chip-famous-only"
          >
            <span>★ Famous Only</span>
          </button>
        </div>
      </div>

      {/* Active Filters Removable Chips Bar */}
      {(activeFiltersCount > 0 || filters.searchQuery) && (
        <div className="kpn-active-chips-container">
          <div className="kpn-active-chips-list">
            {filters.searchQuery && (
              <div className="kpn-removable-chip">
                <span>"{filters.searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ searchQuery: '' })}
                  aria-label="Clear search text"
                >
                  ✕
                </button>
              </div>
            )}

            {filters.selectedZone !== 'all' && (
              <div className="kpn-removable-chip">
                <span>📍 {filters.selectedZone}</span>
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ selectedZone: 'all' })}
                  aria-label="Remove zone filter"
                >
                  ✕
                </button>
              </div>
            )}

            {activeCategoryMeta && (
              <div className="kpn-removable-chip">
                <span>{activeCategoryMeta.icon} {activeCategoryMeta.name}</span>
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ selectedCategory: 'all' })}
                  aria-label="Remove category filter"
                >
                  ✕
                </button>
              </div>
            )}

            {activeStyleMeta && (
              <div className="kpn-removable-chip">
                <span>{activeStyleMeta.icon} {activeStyleMeta.label}</span>
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ selectedStyle: 'all' })}
                  aria-label="Remove artistic style filter"
                >
                  ✕
                </button>
              </div>
            )}

            {activeStation && (
              <div className="kpn-removable-chip">
                <span>🚇 {activeStation}</span>
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ selectedStation: 'all' })}
                  aria-label="Remove station filter"
                >
                  ✕
                </button>
              </div>
            )}

            {filters.onlyVerified && (
              <div className="kpn-removable-chip">
                <span>🛡️ Verified Only</span>
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ onlyVerified: false })}
                  aria-label="Remove verified only filter"
                >
                  ✕
                </button>
              </div>
            )}

            {filters.featuredOnly && (
              <div className="kpn-removable-chip">
                <span>★ Famous Only</span>
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ featuredOnly: false })}
                  aria-label="Remove famous only filter"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              type="button"
              className="kpn-btn-clear-all-chips"
              onClick={onResetFilters}
              id="clear-all-filters-btn"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </>
  );

  // Render Selected Pandal Spotlight Header Card
  const renderSelectedSpotlight = () => {
    if (!selectedPandal) return null;

    const isFav = favorites.includes(selectedPandal.id);
    const inRoute = plannerStops.some((s) => s.id === selectedPandal.id);
    const cat = CATEGORY_STYLES[selectedPandal.category] || { icon: '🪔', color: '#B52727', bgSoft: '#FFF5F5', border: '#F2C94C', name: selectedPandal.category };
    const st = selectedPandal.nearestStationId ? METRO_STATIONS_BY_ID[selectedPandal.nearestStationId] : null;

    return (
      <div className="kpn-spotlight-card" role="region" aria-label="Selected pandal details">
        <div className="kpn-spotlight-header">
          <div className="kpn-spotlight-badges">
            <span className="kpn-badge-cat" style={{ background: cat.bgSoft, color: cat.color, border: `1px solid ${cat.border}` }}>
              {cat.icon} {selectedPandal.category}
            </span>
            {selectedPandal.highlighted && <span className="kpn-badge-star">★ Famous Puja</span>}
            {selectedPandal.status === 'verified' && <span className="kpn-badge-verified">🛡️ Verified GPS</span>}
          </div>
          {onDeselectPandal && (
            <button
              type="button"
              onClick={onDeselectPandal}
              className="kpn-btn-spotlight-close"
              aria-label="Deselect pandal"
              title="Close details"
            >
              ✕
            </button>
          )}
        </div>

        <div className="kpn-spotlight-body">
          <h3 className="kpn-spotlight-name">{selectedPandal.name}</h3>
          {selectedPandal.bengaliName && <span className="kpn-spotlight-bn">{selectedPandal.bengaliName}</span>}
          <div className="kpn-spotlight-loc">
            <span>📍 {selectedPandal.neighbourhood} · {selectedPandal.zone}</span>
            {st && (
              <span> · 🚇 {st.name} Metro (~{selectedPandal.walkingDistanceMeters || 450}m)</span>
            )}
          </div>
          {selectedPandal.theme && <p className="kpn-spotlight-theme">{selectedPandal.theme}</p>}
        </div>

        <div className="kpn-spotlight-actions">
          <button
            type="button"
            className="kpn-btn-spotlight-action is-primary"
            onClick={onViewOnMap}
            title="Focus on Map"
          >
            <MapPinIcon size={14} />
            <span>Map</span>
          </button>

          <button
            type="button"
            className={`kpn-btn-spotlight-action ${inRoute ? 'is-added' : ''}`}
            onClick={(e) => onTogglePlanner(selectedPandal, e)}
          >
            <RouteIcon size={14} />
            <span>{inRoute ? 'In Route' : '+ Route'}</span>
          </button>

          <button
            type="button"
            className={`kpn-btn-spotlight-action ${isFav ? 'is-fav' : ''}`}
            onClick={(e) => onToggleFavorite(selectedPandal.id, e)}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <HeartIcon size={14} fill={isFav ? 'currentColor' : 'none'} />
            <span>{isFav ? 'Saved' : 'Save'}</span>
          </button>

          {selectedPandal.lat && selectedPandal.lng && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPandal.lat},${selectedPandal.lng}&travelmode=walking`}
              target="_blank"
              rel="noopener noreferrer"
              className="kpn-btn-spotlight-action is-external"
            >
              <ExternalLinkIcon size={14} />
              <span>Directions</span>
            </a>
          )}

          {onOpenFullDetails && (
            <button
              type="button"
              className="kpn-btn-spotlight-action"
              onClick={() => onOpenFullDetails(selectedPandal)}
              title="View full photos, audio & history"
            >
              <InfoIcon size={14} />
              <span>Full Info</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render Cards Body
  const renderCardsBody = () => (
    <div className="kpn-sheet-cards-scroll">
      {/* Selected Pandal Spotlight (when a pin or card is selected) */}
      {renderSelectedSpotlight()}

      {/* Featured Pandals Carousel / Pinned Section */}
      {featuredPandals.length > 0 && activeFiltersCount === 0 && !filters.searchQuery && !selectedPandal && (
        <div className="kpn-featured-section">
          <div className="kpn-featured-header">
            <div>
              <span className="kpn-featured-tag">⭐ FAMOUS & FEATURED</span>
              <h3 className="kpn-featured-title">Legendary Kolkata Pujas</h3>
            </div>
            <small className="kpn-featured-hint">{featuredPandals.length} Curated</small>
          </div>

          <div className="kpn-featured-carousel">
            {featuredPandals.slice(0, 8).map((p) => (
              <div
                key={p.id}
                className="kpn-featured-mini-card"
                onClick={() => onSelectPandal(p)}
                role="button"
                tabIndex={0}
              >
                <div className="kpn-featured-mini-img-wrap">
                  <img
                    src={p.imageUrl || 'https://images.unsplash.com/photo-1601933470096-0e34634ffcde?w=600&auto=format&fit=crop&q=80'}
                    alt={p.name}
                    className="kpn-featured-mini-img"
                    loading="lazy"
                  />
                  <span className="kpn-featured-star-badge">★ Featured</span>
                </div>
                <div className="kpn-featured-mini-content">
                  <h4 className="kpn-featured-mini-name">{p.name}</h4>
                  {p.bengaliName && <span className="kpn-featured-mini-bn">{p.bengaliName}</span>}
                  <small className="kpn-featured-mini-loc">{p.neighbourhood} · {p.zone}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pandals.length === 0 ? (
        <div className="kpn-empty-state-card" role="status">
          <div className="kpn-empty-icon">🔍</div>
          <h3>No pandals match your filters</h3>
          <p>
            Try clearing some filters or searching for another neighbourhood or Metro corridor.
          </p>
          <button
            type="button"
            className="kpn-btn-clear-empty"
            onClick={onResetFilters}
            id="empty-reset-filters-btn"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="kpn-cards-stack">
          {pandals.map((pandal) => (
            <PandalCard
              key={pandal.id}
              pandal={pandal}
              isSelected={selectedPandal?.id === pandal.id}
              isInRoute={plannerStops.some((s) => s.id === pandal.id)}
              isFavorite={favorites.includes(pandal.id)}
              onSelect={() => onSelectPandal(pandal)}
              onToggleRoute={(e) => onTogglePlanner(pandal, e)}
              onToggleFavorite={(e) => onToggleFavorite(pandal.id, e)}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Render Comprehensive Filter Drawer Modal
  const renderFilterModal = () => {
    if (!showFiltersModal) return null;

    return (
      <div className="kpn-filter-drawer-overlay" role="dialog" aria-modal="true" onClick={() => setShowFiltersModal(false)}>
        <div className="kpn-filter-drawer-card" onClick={(e) => e.stopPropagation()}>
          <div className="kpn-drawer-head">
            <div className="kpn-drawer-title-wrap">
              <h3>Filter Kolkata Pandals</h3>
              <span className="kpn-drawer-sub">Select zones, categories, and verified locations</span>
            </div>
            <button
              type="button"
              onClick={() => setShowFiltersModal(false)}
              className="kpn-drawer-close"
              aria-label="Close filter drawer"
              id="close-filter-drawer-btn"
            >
              ✕
            </button>
          </div>

          <div className="kpn-drawer-body">
            {/* Zone Filter */}
            <div className="kpn-filter-group">
              <label className="kpn-filter-label">Kolkata Zone / Region:</label>
              <div className="kpn-filter-pills-grid">
                {[
                  { id: 'all', label: 'All Kolkata Zones' },
                  { id: 'North', label: 'North Kolkata' },
                  { id: 'Central', label: 'Central Kolkata' },
                  { id: 'South', label: 'South Kolkata' },
                  { id: 'Salt Lake / East', label: 'Salt Lake / East' },
                  { id: 'South-West', label: 'South-West (Behala)' },
                ].map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    className={`kpn-pill-filter-opt ${filters.selectedZone === z.id ? 'is-selected' : ''}`}
                    onClick={() => onUpdateFilters({ selectedZone: z.id })}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pandal Category Filter */}
            <div className="kpn-filter-group">
              <label className="kpn-filter-label">Pandal Category:</label>
              <div className="kpn-filter-pills-grid">
                <button
                  type="button"
                  className={`kpn-pill-filter-opt ${filters.selectedCategory === 'all' ? 'is-selected' : ''}`}
                  onClick={() => onUpdateFilters({ selectedCategory: 'all' })}
                >
                  All Categories
                </button>
                {Object.values(CATEGORY_STYLES).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`kpn-pill-filter-opt ${filters.selectedCategory === cat.id ? 'is-selected' : ''}`}
                    onClick={() => onUpdateFilters({ selectedCategory: cat.id })}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Artistic Style Filter */}
            <div className="kpn-filter-group">
              <label className="kpn-filter-label">Artistic Style & Craft:</label>
              <div className="kpn-filter-pills-grid">
                <button
                  type="button"
                  className={`kpn-pill-filter-opt ${(!filters.selectedStyle || filters.selectedStyle === 'all') ? 'is-selected' : ''}`}
                  onClick={() => onUpdateFilters({ selectedStyle: 'all' })}
                >
                  All Styles
                </button>
                {ARTISTIC_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    className={`kpn-pill-filter-opt ${filters.selectedStyle === style.id ? 'is-selected' : ''}`}
                    onClick={() => onUpdateFilters({ selectedStyle: style.id })}
                  >
                    <span>{style.icon}</span>
                    <span>{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Metro Station Selector */}
            <div className="kpn-filter-group">
              <label className="kpn-filter-label" htmlFor="filter-metro-select">
                Nearest Metro Station:
              </label>
              <select
                id="filter-metro-select"
                value={filters.selectedStation}
                onChange={(e) => onUpdateFilters({ selectedStation: e.target.value })}
                className="kpn-filter-select"
              >
                <option value="all">Any Station / Walking Distance</option>
                {METRO_STATIONS.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.bengaliName || ''}) — {st.line}
                  </option>
                ))}
              </select>
            </div>

            {/* Verified GPS Only Switch */}
            <div className="kpn-filter-group">
              <label className="kpn-checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.onlyVerified}
                  onChange={(e) => onUpdateFilters({ onlyVerified: e.target.checked })}
                />
                <div>
                  <strong>Only Police Verified GPS Coordinates</strong>
                  <small>Show only pandals with verified coordinates on the ground</small>
                </div>
              </label>
            </div>

            {/* Featured Only Switch */}
            <div className="kpn-filter-group">
              <label className="kpn-checkbox-label">
                <input
                  type="checkbox"
                  checked={Boolean(filters.featuredOnly)}
                  onChange={(e) => onUpdateFilters({ featuredOnly: e.target.checked })}
                />
                <div>
                  <strong>Famous & Featured Pujas Only</strong>
                  <small>Filter for renowned, high-footfall Durga Puja destinations</small>
                </div>
              </label>
            </div>
          </div>

          <div className="kpn-drawer-footer">
            <button
              type="button"
              onClick={() => {
                onResetFilters();
                setShowFiltersModal(false);
              }}
              className="kpn-btn-reset-filters"
            >
              Reset All
            </button>
            <button
              type="button"
              onClick={() => setShowFiltersModal(false)}
              className="kpn-btn-apply-filters"
            >
              Apply Filters ({pandals.length} Results)
            </button>
          </div>
        </div>
      </div>
    );
  };

  // If mobile, wrap in unified gesture BottomSheet
  if (isMobileSheet) {
    return (
      <>
        <BottomSheet
          state={sheetState}
          onStateChange={onSheetStateChange || (() => {})}
          headerContent={renderHeader()}
          collapsedPreview={renderCollapsedPreview()}
          className="kpn-explore-mobile-bottom-sheet"
          id="explore-mobile-bottom-sheet"
        >
          {renderFilterBars()}
          {renderCardsBody()}
        </BottomSheet>
        {renderFilterModal()}
      </>
    );
  }

  // Desktop sidebar panel
  return (
    <section className="kpn-explore-sheet kpn-explore-desktop" aria-label="Kolkata Pandals Directory">
      {renderHeader()}
      {renderFilterBars()}
      {renderCardsBody()}
      {renderFilterModal()}
    </section>
  );
}
