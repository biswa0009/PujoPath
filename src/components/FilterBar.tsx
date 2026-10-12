import React from 'react';
import { FilterState } from '../types';
import { METRO_LINES } from '../data/metroLines';
import { METRO_STATIONS } from '../data/metroStations';
import { FilterIcon } from './Icons';

interface FilterBarProps {
  filters: FilterState;
  onChange: (updated: Partial<FilterState>) => void;
  onReset: () => void;
  activeCount: number;
}

export function FilterBar({ filters, onChange, onReset, activeCount }: FilterBarProps) {
  const zones = ['All Zones', 'North', 'Central', 'South', 'Salt Lake / East', 'South-West'];
  const categories = ['All Types', 'Traditional', 'Theme', 'Heritage Rajbari', 'Contemporary Landmark'];

  const filteredStations = METRO_STATIONS.filter(
    (s) => filters.selectedLine === 'all' || s.lineCode === filters.selectedLine
  );

  const hasActiveFilters =
    filters.selectedLine !== 'all' ||
    filters.selectedStation !== 'all' ||
    filters.selectedZone !== 'all' ||
    filters.selectedCategory !== 'all' ||
    filters.maxDistanceMeters > 0 ||
    filters.onlyVerified;

  return (
    <div className="kpn-filter-bar">
      <div className="kpn-filter-row">
        {/* Metro Line Filter Pills */}
        <div className="kpn-line-pills">
          <button
            className={`kpn-line-pill ${filters.selectedLine === 'all' ? 'active' : ''}`}
            onClick={() => onChange({ selectedLine: 'all', selectedStation: 'all' })}
          >
            All Lines
          </button>
          {METRO_LINES.map((line) => (
            <button
              key={line.code}
              className={`kpn-line-pill ${filters.selectedLine === line.code ? 'active' : ''}`}
              style={{
                borderColor: filters.selectedLine === line.code ? line.color : undefined,
                color: filters.selectedLine === line.code ? line.color : undefined,
              }}
              onClick={() =>
                onChange({
                  selectedLine: filters.selectedLine === line.code ? 'all' : line.code,
                  selectedStation: 'all',
                })
              }
            >
              <span className="kpn-pill-dot" style={{ backgroundColor: line.color }} />
              {line.name.split(' (')[0]}
            </button>
          ))}
        </div>

        {/* Reset button if active */}
        {hasActiveFilters && (
          <button onClick={onReset} className="kpn-filter-reset-btn" title="Reset all filters">
            Reset ({activeCount}) ↺
          </button>
        )}
      </div>

      <div className="kpn-filter-selects">
        {/* Specific Station Dropdown */}
        <div className="kpn-select-wrap">
          <select
            value={filters.selectedStation}
            onChange={(e) => onChange({ selectedStation: e.target.value })}
            aria-label="Filter by Metro station"
          >
            <option value="all">Any Metro Station ({filteredStations.length})</option>
            {filteredStations.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} {st.bengaliName ? `(${st.bengaliName})` : ''} · {st.line}
              </option>
            ))}
          </select>
        </div>

        {/* Zone Dropdown */}
        <div className="kpn-select-wrap">
          <select
            value={filters.selectedZone}
            onChange={(e) => onChange({ selectedZone: e.target.value })}
            aria-label="Filter by Kolkata Zone"
          >
            {zones.map((z) => (
              <option key={z} value={z === 'All Zones' ? 'all' : z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        {/* Category Dropdown */}
        <div className="kpn-select-wrap">
          <select
            value={filters.selectedCategory}
            onChange={(e) => onChange({ selectedCategory: e.target.value })}
            aria-label="Filter by Pandal Category"
          >
            {categories.map((c) => (
              <option key={c} value={c === 'All Types' ? 'all' : c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Walking Distance Limit */}
        <div className="kpn-select-wrap">
          <select
            value={filters.maxDistanceMeters}
            onChange={(e) => onChange({ maxDistanceMeters: Number(e.target.value) })}
            aria-label="Filter by walking distance"
          >
            <option value={0}>Any Walking Distance</option>
            <option value={500}>Within 500 m (≤6 min)</option>
            <option value={1000}>Within 1 km (≤12 min)</option>
            <option value={2000}>Within 2 km (≤25 min)</option>
          </select>
        </div>

        {/* Verified Only Switch */}
        <label className="kpn-verified-toggle">
          <input
            type="checkbox"
            checked={filters.onlyVerified}
            onChange={(e) => onChange({ onlyVerified: e.target.checked })}
          />
          <span>Verified GPS only</span>
        </label>
      </div>
    </div>
  );
}
