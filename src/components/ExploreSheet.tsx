import React, { useState } from 'react';
import { Pandal, FilterState } from '../types';
import { PandalCard } from './PandalCard';
import { ChevronDownIcon, ChevronUpIcon, FilterIcon, MapPinIcon } from './Icons';
import { METRO_LINES } from '../data/metroLines';
import { METRO_STATIONS_BY_ID } from '../data/metroStations';

interface ExploreSheetProps {
  pandals: Pandal[];
  allPandalsCount: number;
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
  // Sheet states: 'collapsed' (peek), 'expanded' (full height)
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Active filter label
  const activeStation =
    filters.selectedStation !== 'all'
      ? METRO_STATIONS_BY_ID[filters.selectedStation]?.name
      : null;

  return (
    <section className={`kpn-explore-sheet ${isExpanded ? 'is-expanded' : 'is-peek'}`} aria-label="Kolkata Pandals Directory">
      {/* 1. Drag / Pull Handle */}
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
        <div className="kpn-sheet-title-left" onClick={() => setIsExpanded(!isExpanded)} role="button" tabIndex={0}>
          <h2 className="kpn-sheet-main-title">Kolkata Pandals</h2>
          <span className="kpn-badge-live-count">{pandals.length} Live</span>
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

      {/* 3. Filter Controls Bar */}
      <div className="kpn-sheet-filter-bar">
        {/* Active Station / Area chip */}
        {activeStation ? (
          <div className="kpn-chip-active-filter">
            <span>📍 Near {activeStation}</span>
            <button
              type="button"
              onClick={() => onUpdateFilters({ selectedStation: 'all' })}
              className="kpn-chip-remove-btn"
              aria-label="Remove station filter"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="kpn-chip-active-filter">
            <span>📍 Near Shyambazar & North Kolkata</span>
            <button
              type="button"
              onClick={onResetFilters}
              className="kpn-chip-remove-btn"
              aria-label="Reset location filter"
            >
              ✕
            </button>
          </div>
        )}

        <button
          type="button"
          className="kpn-btn-filter-trigger"
          onClick={() => setShowFiltersModal(!showFiltersModal)}
          aria-label="Open filter options"
        >
          <FilterIcon size={13} />
          <span>Filters</span>
        </button>
      </div>

      {/* 4. Metro Line Filter Chips */}
      <div className="kpn-sheet-line-chips">
        <button
          className={`kpn-line-chip ${filters.selectedLine === 'all' ? 'is-active' : ''}`}
          onClick={() => onUpdateFilters({ selectedLine: 'all' })}
        >
          All Lines
        </button>
        {METRO_LINES.map((line) => (
          <button
            key={line.code}
            className={`kpn-line-chip ${filters.selectedLine === line.code ? 'is-active' : ''}`}
            onClick={() => onUpdateFilters({ selectedLine: line.code })}
          >
            <span className="kpn-chip-dot" style={{ backgroundColor: line.color }} />
            {line.name}
          </button>
        ))}
      </div>

      {/* Filter Modal Drawer */}
      {showFiltersModal && (
        <div className="kpn-filter-drawer-overlay">
          <div className="kpn-filter-drawer-card">
            <div className="kpn-drawer-head">
              <h3>Filter Pandals</h3>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="kpn-drawer-close"
              >
                ✕
              </button>
            </div>

            <div className="kpn-drawer-body">
              <label>Zone / Region:</label>
              <select
                value={filters.selectedZone}
                onChange={(e) => onUpdateFilters({ selectedZone: e.target.value })}
                className="kpn-filter-select"
              >
                <option value="all">All Kolkata Zones</option>
                <option value="North">North Kolkata</option>
                <option value="Central">Central Kolkata</option>
                <option value="South">South Kolkata</option>
                <option value="Salt Lake / East">Salt Lake / East</option>
                <option value="South-West">South-West (Behala)</option>
              </select>

              <label>Category Style:</label>
              <select
                value={filters.selectedCategory}
                onChange={(e) => onUpdateFilters({ selectedCategory: e.target.value })}
                className="kpn-filter-select"
              >
                <option value="all">All Styles</option>
                <option value="Traditional">Traditional Sabeki</option>
                <option value="Theme">Artistic Theme</option>
                <option value="Heritage Rajbari">Heritage Rajbari</option>
              </select>

              <label className="kpn-checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.onlyVerified}
                  onChange={(e) => onUpdateFilters({ onlyVerified: e.target.checked })}
                />
                <span>Only Verified GPS Coordinates</span>
              </label>
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
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Scrollable Cards Feed */}
      <div className="kpn-sheet-scroll-feed">
        {pandals.map((pandal, idx) => (
          <PandalCard
            key={pandal.id}
            pandal={pandal}
            index={idx}
            isSelected={selectedPandal?.id === pandal.id}
            isInPlanner={plannerStops.some((s) => s.id === pandal.id)}
            plannerStopNumber={
              plannerStops.findIndex((s) => s.id === pandal.id) >= 0
                ? plannerStops.findIndex((s) => s.id === pandal.id) + 1
                : undefined
            }
            isFavorite={favorites.includes(pandal.id)}
            onSelect={() => onSelectPandal(pandal)}
            onTogglePlanner={(e) => onTogglePlanner(pandal, e)}
            onToggleFavorite={(e) => onToggleFavorite(pandal.id, e)}
            onDirections={() => onSelectPandal(pandal)}
          />
        ))}

        {pandals.length === 0 && (
          <div className="kpn-sheet-empty-state">
            <p>No pandals match current filters.</p>
            <button onClick={onResetFilters} className="kpn-btn-reset-filters">
              Reset Filters ↺
            </button>
          </div>
        )}
      </div>

      {/* 6. Floating Pill Button: View Selected on Map */}
      <div className="kpn-sheet-floating-pill-wrap">
        <button
          type="button"
          className="kpn-floating-map-pill"
          onClick={() => {
            setIsExpanded(false);
            onViewOnMap();
          }}
          aria-label="View Selected Pandals on Map"
        >
          <span className="kpn-pill-map-icon">🗺️</span>
          <span>View on Map ({Math.min(pandals.length, 3)})</span>
          <span className="kpn-pill-hop-tag">North Hop</span>
        </button>
      </div>
    </section>
  );
}
