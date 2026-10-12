import React, { useState, useMemo } from 'react';
import { Pandal, FilterState } from '../types';
import { PandalCard } from './PandalCard';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  FilterIcon,
  MapPinIcon,
  SearchIcon,
  CloseIcon,
  ShieldCheckIcon,
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
  onTogglePlanner: (pandal: Pandal, e: React.MouseEvent) => void;
  onToggleFavorite: (pandalId: string, e: React.MouseEvent) => void;
  onViewOnMap: () => void;
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
  onTogglePlanner,
  onToggleFavorite,
  onViewOnMap,
}: ExploreSheetProps) {
  // Mobile sheet states: 'collapsed' (peek), 'expanded' (full height)
  const [isExpanded, setIsExpanded] = useState(false);
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

  return (
    <section
      className={`kpn-explore-sheet ${isExpanded ? 'is-expanded' : 'is-peek'}`}
      aria-label="Kolkata Pandals Directory"
    >
      {/* 1. Mobile Drag / Pull Handle */}
      <div
        className="kpn-sheet-drag-handle"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        aria-label={isExpanded ? 'Collapse bottom sheet' : 'Expand bottom sheet'}
      >
        <span className="kpn-drag-bar" />
      </div>

      {/* 2. Sheet Header Title Row */}
      <div className="kpn-sheet-header-row">
        <div
          className="kpn-sheet-title-left"
          onClick={() => setIsExpanded(!isExpanded)}
          role="button"
          tabIndex={0}
        >
          <h2 className="kpn-sheet-main-title">Kolkata Pandals</h2>
          <span className="kpn-badge-live-count">{pandals.length} Showing</span>
          {allPandalsCount !== pandals.length && (
            <small className="kpn-sub-of-total">of {allPandalsCount}</small>
          )}
        </div>

        <button
          type="button"
          className="kpn-sheet-chevron-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Collapse list' : 'Expand list'}
        >
          {isExpanded ? <ChevronDownIcon size={18} /> : <ChevronUpIcon size={18} />}
        </button>
      </div>

      {/* 3. Filter Controls Bar with Filter Button and Trigger */}
      <div className="kpn-sheet-filter-bar">
        {/* Quick horizontal filter chips */}
        <div className="kpn-filter-quick-chips-scroll">
          <button
            type="button"
            className={`kpn-btn-filter-trigger ${activeFiltersCount > 0 ? 'is-filtered' : ''}`}
            onClick={() => setShowFiltersModal(true)}
            aria-label="Open comprehensive filters"
          >
            <FilterIcon size={13} />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="kpn-active-filter-badge">{activeFiltersCount}</span>
            )}
          </button>

          {/* Quick Line filter button */}
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

          {/* Quick Verified Only chip */}
          <button
            type="button"
            className={`kpn-quick-chip ${filters.onlyVerified ? 'is-verified-active' : ''}`}
            onClick={() => onUpdateFilters({ onlyVerified: !filters.onlyVerified })}
          >
            <ShieldCheckIcon size={12} />
            <span>Verified GPS</span>
          </button>
        </div>
      </div>

      {/* 4. Active Filters Removable Chips Bar */}
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

            <button
              type="button"
              className="kpn-btn-clear-all-chips"
              onClick={onResetFilters}
            >
              Reset All
            </button>
          </div>
        </div>
      )}

      {/* 5. Comprehensive Filter Modal / Drawer */}
      {showFiltersModal && (
        <div className="kpn-filter-drawer-overlay" role="dialog" aria-modal="true">
          <div className="kpn-filter-drawer-card">
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
                    <small>Show only pandals whose location coordinates have been verified on the ground</small>
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
      )}

      {/* 6. Scrollable Content Area */}
      <div className="kpn-sheet-cards-scroll">
        {/* Featured Pandals Carousel / Pinned Section */}
        {featuredPandals.length > 0 && activeFiltersCount === 0 && !filters.searchQuery && (
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

      {/* 7. Floating Action Pill on Explore */}
      {pandals.length > 0 && (
        <div className="kpn-floating-sheet-action">
          <button
            type="button"
            className="kpn-btn-view-map-pill"
            onClick={onViewOnMap}
            aria-label="View selected pandals on interactive map"
          >
            <MapPinIcon size={16} />
            <span>View on Map ({pandals.length})</span>
            <span className="kpn-pill-zone-tag">
              {filters.selectedZone !== 'all' ? filters.selectedZone : 'Kolkata'}
            </span>
          </button>
        </div>
      )}
    </section>
  );
}
