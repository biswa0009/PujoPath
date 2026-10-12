import React from 'react';
import { Pandal } from '../types';
import { METRO_STATIONS_BY_ID } from '../data/metroStations';
import { WalkIcon, VerifiedCheckIcon, HeartIcon } from './Icons';

interface PandalCardProps {
  pandal: Pandal;
  index: number;
  isSelected: boolean;
  isInPlanner: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onTogglePlanner: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export function PandalCard({
  pandal,
  index,
  isSelected,
  isInPlanner,
  isFavorite,
  onSelect,
  onTogglePlanner,
  onToggleFavorite,
}: PandalCardProps) {
  const station = pandal.nearestStationId
    ? METRO_STATIONS_BY_ID[pandal.nearestStationId]
    : null;

  return (
    <article
      className={`kpn-pandal-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="kpn-card-left">
        <span className="kpn-card-num">{String(index + 1).padStart(2, '0')}</span>
        <button
          className={`kpn-fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={onToggleFavorite}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label="Toggle favorite"
        >
          <HeartIcon filled={isFavorite} className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="kpn-card-body">
        <div className="kpn-card-header">
          <h3 className="kpn-card-name">
            {pandal.name}
            {pandal.status === 'verified' && (
              <span className="kpn-verified-badge" title="Verified Location">
                <VerifiedCheckIcon className="w-3.5 h-3.5" />
              </span>
            )}
          </h3>
          {pandal.bengaliName && (
            <span className="kpn-bengali-sub">{pandal.bengaliName}</span>
          )}
        </div>

        <div className="kpn-card-tags">
          <span className={`kpn-tag-cat cat-${pandal.category.toLowerCase().replace(/\s+/g, '-')}`}>
            {pandal.category}
          </span>
          <span className="kpn-tag-area">
            {pandal.neighbourhood} · {pandal.zone}
          </span>
        </div>

        <div className="kpn-card-meta">
          {station ? (
            <div className="kpn-card-metro">
              <span
                className="kpn-metro-badge-mini"
                style={{
                  backgroundColor:
                    station.lineCode === 'green'
                      ? '#00875A'
                      : station.lineCode === 'purple'
                      ? '#7B2CBF'
                      : station.lineCode === 'orange'
                      ? '#E8590C'
                      : '#0062B1',
                }}
              >
                M
              </span>
              <span className="kpn-station-name">{station.name}</span>
              {pandal.walkingDistanceMeters && (
                <span className="kpn-walk-dist">
                  <WalkIcon className="w-3 h-3" />
                  {pandal.walkingDistanceMeters < 1000
                    ? `${pandal.walkingDistanceMeters}m`
                    : `${(pandal.walkingDistanceMeters / 1000).toFixed(1)}km`}
                  {pandal.walkingTimeMinutes && ` (~${pandal.walkingTimeMinutes}m)`}
                </span>
              )}
            </div>
          ) : (
            <span className="kpn-unverified-tag">Area only · coordinates pending</span>
          )}
        </div>
      </div>

      <div className="kpn-card-actions">
        <button
          className={`kpn-add-hop-btn ${isInPlanner ? 'in-route' : ''}`}
          onClick={onTogglePlanner}
          title={isInPlanner ? 'Remove from Hopping Route' : 'Add to Hopping Route'}
        >
          {isInPlanner ? '✓ Stop' : '+ Hop'}
        </button>
      </div>
    </article>
  );
}
