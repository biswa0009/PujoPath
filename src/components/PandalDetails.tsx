import React from 'react';
import { Pandal } from '../types';
import { METRO_STATIONS_BY_ID } from '../data/metroStations';
import {
  CloseIcon,
  ExternalLinkIcon,
  VerifiedCheckIcon,
  WalkIcon,
  RouteIcon,
  HeartIcon,
  MapPinIcon,
} from './Icons';

interface PandalDetailsProps {
  pandal: Pandal;
  onClose: () => void;
  onCenterMap: () => void;
  onAddToPlanner: () => void;
  isInPlanner: boolean;
  onStartRouteFromMetro: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function PandalDetails({
  pandal,
  onClose,
  onCenterMap,
  onAddToPlanner,
  isInPlanner,
  onStartRouteFromMetro,
  isFavorite,
  onToggleFavorite,
}: PandalDetailsProps) {
  const station = pandal.nearestStationId
    ? METRO_STATIONS_BY_ID[pandal.nearestStationId]
    : null;

  const googleMapsUrl =
    pandal.lat && pandal.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${pandal.lat},${pandal.lng}&travelmode=walking`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${pandal.name} ${pandal.neighbourhood} Kolkata`
        )}`;

  return (
    <aside className="kpn-detail-panel" aria-label="Pandal Details">
      <div className="kpn-detail-top">
        <button
          className="kpn-detail-close-btn"
          onClick={onClose}
          aria-label="Close details panel"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Hero Image / Banner */}
      {pandal.imageUrl && (
        <div className="kpn-detail-media">
          <img
            src={pandal.imageUrl}
            alt={pandal.name}
            className="kpn-detail-img"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="kpn-detail-media-gradient" />
          <span className="kpn-media-category">{pandal.category}</span>
        </div>
      )}

      <div className="kpn-detail-content">
        <div className="kpn-detail-header">
          <div className="kpn-detail-kicker">
            <span>PANDAL SPOTLIGHT</span>
            {pandal.status === 'verified' && (
              <span className="kpn-verified-pill">
                <VerifiedCheckIcon className="w-3.5 h-3.5" />
                Verified Pin
              </span>
            )}
          </div>
          <h2 className="kpn-detail-title">{pandal.name}</h2>
          {pandal.bengaliName && (
            <div className="kpn-detail-bengali">{pandal.bengaliName}</div>
          )}
          <div className="kpn-detail-address">
            <MapPinIcon className="w-4 h-4 text-vermilion" />
            <span>{pandal.address}</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="kpn-detail-actions-row">
          <button
            className={`kpn-btn-primary ${isInPlanner ? 'btn-active' : ''}`}
            onClick={onAddToPlanner}
          >
            <RouteIcon className="w-4 h-4" />
            {isInPlanner ? 'In Hopping Route ✓' : 'Add to Hopping Route'}
          </button>

          <button
            className={`kpn-btn-secondary ${isFavorite ? 'btn-active' : ''}`}
            onClick={onToggleFavorite}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <HeartIcon filled={isFavorite} className="w-4 h-4" />
            {isFavorite ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* Nearest Metro Station Card */}
        {station ? (
          <div className="kpn-station-spotlight-card">
            <div className="kpn-station-spotlight-head">
              <span
                className="kpn-station-line-badge"
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
              <div>
                <span className="kpn-label-mini">NEAREST ACCESSIBLE METRO</span>
                <strong className="kpn-station-title">
                  {station.name} {station.bengaliName ? `(${station.bengaliName})` : ''}
                </strong>
                <span className="kpn-line-sub">{station.line}</span>
              </div>
            </div>

            <div className="kpn-station-metrics">
              <div className="kpn-metric-item">
                <WalkIcon className="w-4 h-4 text-gold" />
                <div>
                  <small>WALKING DISTANCE</small>
                  <b>
                    {pandal.walkingDistanceMeters
                      ? pandal.walkingDistanceMeters < 1000
                        ? `${pandal.walkingDistanceMeters} m`
                        : `${(pandal.walkingDistanceMeters / 1000).toFixed(1)} km`
                      : 'Nearby'}
                  </b>
                </div>
              </div>

              <div className="kpn-metric-item">
                <span className="kpn-clock-icon">⏱</span>
                <div>
                  <small>EST. WALKING TIME</small>
                  <b>
                    {pandal.walkingTimeMinutes
                      ? `~${pandal.walkingTimeMinutes} min walk`
                      : 'Accessible'}
                  </b>
                </div>
              </div>
            </div>

            {pandal.walkNote && (
              <p className="kpn-walk-note-text">
                <b>Walk note:</b> {pandal.walkNote}
              </p>
            )}

            <button
              className="kpn-route-from-metro-btn"
              onClick={onStartRouteFromMetro}
            >
              <RouteIcon className="w-4 h-4" />
              Draw Walking Route from {station.name}
            </button>
          </div>
        ) : (
          <div className="kpn-unverified-warning">
            <strong>Location Notice:</strong> This entry is cataloged from public festival
            listings. Exact GPS coordinates are currently pending field verification.
          </div>
        )}

        {/* Alternative Nearby Stations */}
        {pandal.alternativeStations && pandal.alternativeStations.length > 0 && (
          <div className="kpn-alt-stations-block">
            <h4 className="kpn-sub-heading">Alternative Nearby Metro Stops</h4>
            <div className="kpn-alt-list">
              {pandal.alternativeStations.map((alt) => {
                const altStation = METRO_STATIONS_BY_ID[alt.stationId];
                if (!altStation) return null;
                return (
                  <div key={alt.stationId} className="kpn-alt-item">
                    <span className="kpn-alt-bullet">●</span>
                    <span className="kpn-alt-name">{altStation.name}</span>
                    <span className="kpn-alt-meta">
                      {alt.distanceMeters < 1000
                        ? `${alt.distanceMeters}m`
                        : `${(alt.distanceMeters / 1000).toFixed(1)}km`}{' '}
                      · ~{alt.walkingTimeMinutes} min
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cultural Theme / Story */}
        <div className="kpn-detail-story">
          <h4 className="kpn-sub-heading">Annual Theme & Cultural Heritage</h4>
          <p className="kpn-story-body">{pandal.theme || pandal.knownFor}</p>
        </div>

        {/* Coordinates and External Links */}
        <div className="kpn-detail-footer-info">
          {pandal.lat && pandal.lng && (
            <div className="kpn-coord-row">
              <span>
                Coordinates: {pandal.lat.toFixed(5)}°N, {pandal.lng.toFixed(5)}°E
              </span>
              <button onClick={onCenterMap} className="kpn-center-btn">
                Center on Map ⌖
              </button>
            </div>
          )}

          <div className="kpn-links-row">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kpn-gmaps-link"
            >
              Google Maps Walking Directions
              <ExternalLinkIcon className="w-3.5 h-3.5" />
            </a>

            {pandal.sourceUrl && (
              <a
                href={pandal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="kpn-source-link"
              >
                Verification Record
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="kpn-verification-stamp">
            Last verified: {pandal.lastVerifiedDate} · Kolkata Puja Navigator Register
          </div>
        </div>
      </div>
    </aside>
  );
}
