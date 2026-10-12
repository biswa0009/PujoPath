import React, { useState } from 'react';
import { Pandal } from '../types';
import { METRO_STATIONS_BY_ID } from '../data/metroStations';
import { TrashIcon, WalkIcon, CrosshairIcon, SparklesIcon, BookmarkIcon } from './Icons';

interface SavedPandalsViewProps {
  pandals: Pandal[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectPandal: (pandal: Pandal) => void;
  onAddAllToPlanner: () => void;
  onShowOnMap: (pandal: Pandal) => void;
  onStartWalk: (pandal: Pandal) => void;
}

export function SavedPandalsView({
  pandals,
  favorites,
  onToggleFavorite,
  onSelectPandal,
  onAddAllToPlanner,
  onShowOnMap,
  onStartWalk,
}: SavedPandalsViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Filter pandals that are favorited
  const savedPandals = pandals.filter((p) => favorites.includes(p.id));

  // Determine how many metro corridors are covered
  const corridors = new Set(
    savedPandals
      .map((p) => p.nearestStationId && METRO_STATIONS_BY_ID[p.nearestStationId]?.line)
      .filter(Boolean)
  );

  return (
    <div className="kpn-stitch-saved-view">
      {/* 1. Header Row matching Stitch design */}
      <div className="kpn-saved-header-row">
        <div className="kpn-saved-title-wrap">
          <h1 className="kpn-saved-title">Saved Pandals</h1>
          <span className="kpn-badge-saved-count">{savedPandals.length} Saved</span>
        </div>

        {/* List / Map Segmented Control */}
        <div className="kpn-segmented-control" role="tablist">
          <button
            type="button"
            className={`kpn-segment-btn ${viewMode === 'list' ? 'is-active' : ''}`}
            onClick={() => setViewMode('list')}
            role="tab"
            aria-selected={viewMode === 'list'}
          >
            <span>≣ List</span>
          </button>
          <button
            type="button"
            className={`kpn-segment-btn ${viewMode === 'map' ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode('map');
              if (savedPandals[0]) onShowOnMap(savedPandals[0]);
            }}
            role="tab"
            aria-selected={viewMode === 'map'}
          >
            <span>🗺️ Map</span>
          </button>
        </div>
      </div>

      {/* 2. Ready for Hopping Summary Card */}
      {savedPandals.length > 0 && (
        <div className="kpn-hopping-ready-card">
          <div className="kpn-hopping-ready-head">
            <div className="kpn-torch-icon-wrap">
              <span>🪔</span>
            </div>
            <div className="kpn-hopping-ready-text">
              <strong>Ready for Hopping</strong>
              <p>
                {savedPandals.length} pandal{savedPandals.length === 1 ? '' : 's'} bookmarked across{' '}
                {corridors.size || 1} Metro corridor{corridors.size === 1 ? '' : 's'} (North & South lines).
              </p>
            </div>
          </div>

          <div className="kpn-hopping-ready-actions">
            <button
              type="button"
              className="kpn-btn-add-all-planner"
              onClick={onAddAllToPlanner}
              id="add-all-saved-to-planner-btn"
            >
              <SparklesIcon size={15} />
              <span>Add All {savedPandals.length} to Route Planner</span>
            </button>
            <button
              type="button"
              className="kpn-btn-filter-icon"
              title="Filter saved list"
              aria-label="Filter saved list"
            >
              ☰
            </button>
          </div>
        </div>
      )}

      {/* 3. Feed of Saved Pandal Cards */}
      <div className="kpn-saved-cards-list">
        {savedPandals.map((pandal, idx) => {
          const station = pandal.nearestStationId
            ? METRO_STATIONS_BY_ID[pandal.nearestStationId]
            : null;

          return (
            <div
              key={pandal.id}
              className="kpn-saved-card"
              onClick={() => onSelectPandal(pandal)}
              role="button"
              tabIndex={0}
            >
              {/* Card Top: Title, Bengali & Trash button */}
              <div className="kpn-saved-card-head">
                <div>
                  <h3 className="kpn-saved-card-title">{pandal.name}</h3>
                  {pandal.bengaliName && (
                    <span className="kpn-saved-card-bengali">{pandal.bengaliName}</span>
                  )}
                </div>

                <button
                  type="button"
                  className="kpn-saved-trash-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(pandal.id);
                  }}
                  title="Remove from saved"
                  aria-label={`Remove ${pandal.name} from saved`}
                >
                  <TrashIcon size={16} />
                </button>
              </div>

              {/* Metro & Distance subline */}
              <div className="kpn-saved-metro-line">
                <span>{pandal.neighbourhood || pandal.zone}</span>
                <span className="kpn-saved-bullet">•</span>
                <span className="kpn-saved-station-dot" />
                <span>
                  {station ? `${station.name} Metro` : 'Metro Transit'}{' '}
                  ({pandal.walkingDistanceMeters || '420'}m)
                </span>
              </div>

              {/* Tag Pills */}
              <div className="kpn-saved-tags-row">
                <span className="kpn-saved-tag-theme">
                  🔥 {pandal.theme ? pandal.theme.slice(0, 38) : 'Traditional Pratima & Dhunuchi Naach'}
                </span>
                <span className="kpn-saved-tag-queue">
                  🟢 {idx % 2 === 0 ? 'Moderate Queue (15m)' : 'Fast Moving Lane'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="kpn-saved-card-actions">
                <button
                  type="button"
                  className="kpn-btn-saved-walk"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartWalk(pandal);
                  }}
                >
                  <WalkIcon size={15} />
                  <span>Start Walk</span>
                </button>

                <button
                  type="button"
                  className="kpn-btn-saved-map"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowOnMap(pandal);
                  }}
                >
                  <CrosshairIcon size={15} />
                  <span>Show on Map</span>
                </button>
              </div>
            </div>
          );
        })}

        {savedPandals.length === 0 && (
          <div className="kpn-empty-saved-state">
            <BookmarkIcon size={36} className="text-crimson" />
            <h3>No Saved Pandals Yet</h3>
            <p>Tap the bookmark ribbon on any pandal in the Explore feed to curate your festival itinerary.</p>
          </div>
        )}
      </div>

      {/* 4. Offline & GPS Resilient Feature Card */}
      <div className="kpn-offline-resilient-card">
        <div className="kpn-offline-badge-row">
          <div className="kpn-offline-icon-wrap">
            <span>📡</span>
          </div>
          <div className="kpn-offline-text-wrap">
            <div className="kpn-offline-title-row">
              <strong>Offline & GPS Resilient</strong>
              <span className="kpn-badge-active-green">ACTIVE</span>
            </div>
            <p>
              PujoPath works seamlessly with cached Kolkata pandal data, metro line blueprints, and saved notes even when cellular bands jam in crowded alleyways.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
