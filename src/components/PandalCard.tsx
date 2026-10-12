import React from 'react';
import { Pandal } from '../types';
import { METRO_STATIONS_BY_ID } from '../data/metroStations';
import { BookmarkIcon, ShieldCheckIcon, DirectionsIcon, WalkIcon } from './Icons';

interface PandalCardProps {
  pandal: Pandal;
  index: number;
  isSelected: boolean;
  isInPlanner: boolean;
  plannerStopNumber?: number;
  isFavorite: boolean;
  onSelect: () => void;
  onTogglePlanner: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onDirections?: (e: React.MouseEvent) => void;
}

// Fallback high quality Durga Puja imagery
const FALLBACK_PUJO_IMAGES = [
  'https://images.unsplash.com/photo-1601933470096-0e34634ffcde?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
];

export function PandalCard({
  pandal,
  index,
  isSelected,
  isInPlanner,
  plannerStopNumber,
  isFavorite,
  onSelect,
  onTogglePlanner,
  onToggleFavorite,
  onDirections,
}: PandalCardProps) {
  const station = pandal.nearestStationId
    ? METRO_STATIONS_BY_ID[pandal.nearestStationId]
    : null;

  // Derive smart line accent color
  const lineAccent =
    station?.lineCode === 'green'
      ? '#00875A'
      : station?.lineCode === 'purple'
      ? '#7B2CBF'
      : station?.lineCode === 'orange'
      ? '#E8590C'
      : '#0062B1';

  // Fallback image based on index
  const displayImage =
    pandal.imageUrl || FALLBACK_PUJO_IMAGES[index % FALLBACK_PUJO_IMAGES.length];

  // Derive wait time / queue tag
  const isHighFootfall = index % 3 === 1;
  const isQuickQueue = index % 3 === 2;

  return (
    <article
      className={`kpn-stitch-card ${isSelected ? 'is-selected' : ''}`}
      onClick={onSelect}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${pandal.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Top Meta Badges & Bookmark */}
      <div className="kpn-scard-topbar">
        <div className="kpn-scard-badges">
          {pandal.category === 'Traditional' ? (
            <span className="kpn-chip-soft kpn-chip-heritage">Since 1919</span>
          ) : pandal.category === 'Heritage Rajbari' ? (
            <span className="kpn-chip-soft kpn-chip-rajbari">Heritage Rajbari</span>
          ) : (
            <span className="kpn-chip-soft kpn-chip-theme">{pandal.category}</span>
          )}
          <span className="kpn-chip-soft kpn-chip-zone">{pandal.neighbourhood || pandal.zone}</span>
        </div>

        <button
          type="button"
          className={`kpn-scard-bookmark-btn ${isFavorite ? 'is-bookmarked' : ''}`}
          onClick={onToggleFavorite}
          title={isFavorite ? 'Remove from saved' : 'Save pandal'}
          aria-label={isFavorite ? 'Remove from saved' : 'Save pandal'}
        >
          <BookmarkIcon size={16} filled={isFavorite} />
        </button>
      </div>

      {/* Hero Media Banner */}
      <div className="kpn-scard-media">
        <img
          src={displayImage}
          alt={pandal.name}
          className="kpn-scard-img"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = FALLBACK_PUJO_IMAGES[0];
          }}
        />
        <div className="kpn-scard-media-overlay">
          <span className="kpn-scard-media-tag">
            🛕 {pandal.theme ? pandal.theme.slice(0, 42) + '...' : pandal.knownFor || 'Durga Puja Celebrations'}
          </span>
        </div>
      </div>

      {/* Pandal Titles */}
      <div className="kpn-scard-body">
        <div className="kpn-scard-heading">
          <h3 className="kpn-scard-title">{pandal.name}</h3>
          {pandal.bengaliName && (
            <span className="kpn-scard-bengali">{pandal.bengaliName}</span>
          )}
        </div>

        {/* Nearest Metro Corridor Indicator */}
        {station && (
          <div className="kpn-scard-metro-row">
            <span className="kpn-scard-metro-dot" style={{ backgroundColor: lineAccent }} />
            <span className="kpn-scard-metro-text">
              <strong>{station.name} Metro</strong> (Gate 1)
            </span>
            <span className="kpn-scard-metro-dist">
              {pandal.walkingDistanceMeters ? `${pandal.walkingDistanceMeters}m` : '400m'} ·{' '}
              {pandal.walkingTimeMinutes ? `~${pandal.walkingTimeMinutes} min walk` : '~6 min walk'}
            </span>
          </div>
        )}

        {/* Status Indicators Pill Row */}
        <div className="kpn-scard-status-row">
          <span className="kpn-status-pill kpn-status-verified">
            <ShieldCheckIcon size={13} />
            <span>Police Verified GPS</span>
          </span>

          {isInPlanner ? (
            <span className="kpn-status-pill kpn-status-planner">
              ✓ In Hopping Route
            </span>
          ) : isHighFootfall ? (
            <span className="kpn-status-pill kpn-status-crowd">
              ⏳ Wait time: ~25 mins
            </span>
          ) : isQuickQueue ? (
            <span className="kpn-status-pill kpn-status-quick">
              🟢 Fast Queue (10m)
            </span>
          ) : (
            <span className="kpn-status-pill kpn-status-mod">
              🟡 Crowd: Moderate
            </span>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="kpn-scard-actions">
          <button
            type="button"
            className="kpn-btn-card-primary"
            onClick={(e) => {
              e.stopPropagation();
              if (onDirections) {
                onDirections(e);
              } else {
                onSelect();
              }
            }}
            aria-label={`Get directions to ${pandal.name}`}
          >
            <DirectionsIcon size={14} />
            <span>Directions</span>
          </button>

          <button
            type="button"
            className={`kpn-btn-card-secondary ${isInPlanner ? 'is-in-route' : ''}`}
            onClick={onTogglePlanner}
            aria-label={isInPlanner ? 'In Hopping Route' : 'Add to route planner'}
          >
            <span>
              {isInPlanner
                ? `✓ Stop ${plannerStopNumber ? `#${plannerStopNumber}` : ''} in Route`
                : '+ Add Route'}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
