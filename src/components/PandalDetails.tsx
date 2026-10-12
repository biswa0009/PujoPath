import React, { useState, useEffect } from 'react';
import { Pandal } from '../types';
import { METRO_STATIONS_BY_ID } from '../data/metroStations';
import {
  BackIcon,
  ShareIcon,
  BookmarkIcon,
  ShieldCheckIcon,
  MapPinIcon,
  VolumeIcon,
  VolumeMuteIcon,
  WalkIcon,
  DirectionsIcon,
} from './Icons';
import { dhakPlayer } from '../services/audioService';

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
  const [isDhakPlaying, setIsDhakPlaying] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  useEffect(() => {
    const unsub = dhakPlayer.subscribe((playing) => setIsDhakPlaying(playing));
    return () => {
      unsub();
      dhakPlayer.stop();
    };
  }, []);

  const station = pandal.nearestStationId
    ? METRO_STATIONS_BY_ID[pandal.nearestStationId]
    : null;

  const altStation = pandal.alternativeStations?.[0]
    ? METRO_STATIONS_BY_ID[pandal.alternativeStations[0].stationId]
    : null;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${pandal.name} — Kolkata Puja Navigator`,
        text: `Visit ${pandal.name} (${pandal.bengaliName || ''}) near ${station?.name || 'Kolkata'} Metro.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2500);
    }
  };

  const handleToggleAudio = () => {
    dhakPlayer.toggle();
  };

  const googleMapsUrl =
    pandal.lat && pandal.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${pandal.lat},${pandal.lng}&travelmode=walking`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${pandal.name} ${pandal.neighbourhood} Kolkata`
        )}`;

  return (
    <div className="kpn-stitch-details-modal" role="dialog" aria-modal="true" aria-label="Pandal Details">
      {/* Top Navigation Bar */}
      <div className="kpn-details-topbar">
        <button
          type="button"
          className="kpn-details-back-btn"
          onClick={onClose}
          aria-label="Back to Map"
          id="details-back-btn"
        >
          <BackIcon size={18} />
          <span>Back to Map</span>
        </button>

        <span className="kpn-details-heading-label">Pandal Detail</span>

        <div className="kpn-details-top-actions">
          <button
            type="button"
            className="kpn-details-icon-btn"
            onClick={handleShare}
            title="Share Pandal"
            aria-label="Share Pandal"
          >
            <ShareIcon size={16} />
          </button>
          <button
            type="button"
            className={`kpn-details-icon-btn ${isFavorite ? 'is-fav' : ''}`}
            onClick={onToggleFavorite}
            title={isFavorite ? 'Remove from saved' : 'Save pandal'}
            aria-label="Save Pandal"
          >
            <BookmarkIcon size={16} filled={isFavorite} />
          </button>
        </div>
      </div>

      {shareFeedback && (
        <div className="kpn-share-toast" role="status">
          Link copied to clipboard! 📋
        </div>
      )}

      {/* Scrollable Content Container */}
      <div className="kpn-details-scroll-body">
        {/* Hero Photo Media */}
        <div className="kpn-details-hero">
          <img
            src={pandal.imageUrl || 'https://images.unsplash.com/photo-1601933470096-0e34634ffcde?w=800&auto=format&fit=crop&q=80'}
            alt={pandal.name}
            className="kpn-details-hero-img"
          />
          <div className="kpn-details-hero-overlay" />

          {/* Top Badges over image */}
          <div className="kpn-hero-badge-topleft">
            <span>⭐ HERITAGE GRADE A</span>
          </div>
          <div className="kpn-hero-badge-topright">
            <span>📸 14 Photos</span>
          </div>

          {/* Interactive Dhak Ambience Sound Button */}
          <button
            type="button"
            className={`kpn-hero-audio-pill ${isDhakPlaying ? 'is-playing' : ''}`}
            onClick={handleToggleAudio}
            aria-label={isDhakPlaying ? 'Pause Dhak Ambience' : 'Play Traditional Dhak Ambience'}
          >
            {isDhakPlaying ? <VolumeIcon size={15} /> : <VolumeMuteIcon size={15} />}
            <span>{isDhakPlaying ? 'Playing Dhak Beats 🎵' : 'Traditional Dhak Ambience'}</span>
            <span className="kpn-audio-wave">{isDhakPlaying ? '🔊' : '▶'}</span>
          </button>
        </div>

        {/* Title, Bengali Name & Heritage Tags */}
        <div className="kpn-details-intro-card">
          <div className="kpn-intro-header-row">
            <div>
              <h1 className="kpn-intro-title">{pandal.name}</h1>
              {pandal.bengaliName && (
                <div className="kpn-intro-bengali">{pandal.bengaliName}</div>
              )}
            </div>
            <span className="kpn-intro-year-badge">106th Year</span>
          </div>

          <div className="kpn-intro-pills-row">
            <span className="kpn-pill-tag">📜 Est. 1919</span>
            <span className="kpn-pill-tag">🛕 Traditional Ekchala</span>
            <span className="kpn-pill-tag kpn-pill-verified">
              <ShieldCheckIcon size={13} />
              <span>Police Verified GPS</span>
            </span>
          </div>

          <div className="kpn-intro-address">
            <MapPinIcon size={15} className="text-crimson" />
            <span>{pandal.address}</span>
          </div>
        </div>

        {/* Live Crowd Advisory Card */}
        <div className="kpn-advisory-card">
          <div className="kpn-advisory-head">
            <span className="kpn-advisory-label">
              <span className="kpn-advisory-dot" /> Live Crowd Advisory
            </span>
            <span className="kpn-advisory-queue-tag">Moderate Queue</span>
          </div>
          <div className="kpn-advisory-stat-box">
            <span className="kpn-stat-timer">⏳ ~25 min current wait time</span>
            <p className="kpn-stat-rush">Peak rush anticipated between 7:00 PM – 11:30 PM</p>
          </div>
          <div className="kpn-advisory-slot">
            <span className="kpn-slot-sun">☀️</span>
            <p>
              <strong>Recommended slot:</strong> Morning 8:00 AM – 11:30 AM or late night post 12:30 AM for peaceful darshan with zero barricade halt.
            </p>
          </div>
        </div>

        {/* Metro & Transit Spotlight */}
        <div className="kpn-transit-spotlight">
          <div className="kpn-transit-head">
            <h3>🚇 Metro & Transit Spotlight</h3>
            <span className="kpn-fastest-tag">FASTEST WAY</span>
          </div>

          {station && (
            <div className="kpn-station-spotlight-card">
              <div className="kpn-spotlight-title-row">
                <div className="kpn-spotlight-left">
                  <span className="kpn-spotlight-dot" />
                  <strong>{station.name} Metro</strong>
                </div>
                <span className="kpn-spotlight-time">
                  {pandal.walkingDistanceMeters || '420'}m · ~{pandal.walkingTimeMinutes || '6'} min walk
                </span>
              </div>
              <div className="kpn-spotlight-gate">
                🚪 Exit via <strong>Gate No. 1</strong>
              </div>
              <p className="kpn-spotlight-walk-note">
                Exit Gate 1 onto Bidhan Sarani, proceed north towards Girish Avenue, turn left directly onto historic {pandal.neighbourhood || 'Bagbazar'} Street.
              </p>
            </div>
          )}

          {altStation && (
            <div className="kpn-alt-station-card">
              <div className="kpn-spotlight-left">
                <span className="kpn-alt-dot" />
                <strong>{altStation.name} Metro</strong>
              </div>
              <span className="kpn-alt-time">
                {pandal.alternativeStations?.[0].distanceMeters || '780'}m · ~{pandal.alternativeStations?.[0].walkingTimeMinutes || '10'} min
              </span>
            </div>
          )}

          {/* Mini Static Map Thumbnail */}
          <div className="kpn-mini-map-preview" onClick={onCenterMap} role="button" tabIndex={0}>
            <div className="kpn-mini-map-overlay">
              <span>📍 {pandal.walkingDistanceMeters || '420'}m from current transit node</span>
            </div>
          </div>
        </div>

        {/* Cultural Story & Heritage */}
        <div className="kpn-heritage-card">
          <div className="kpn-heritage-head">
            <h3>📖 Cultural Story & Heritage</h3>
          </div>
          <p className="kpn-heritage-text">
            {pandal.theme ||
              "One of Kolkata's oldest community pujas, renowned for preserving pure traditional Bengali 'Ekchala' pratima crafted with shimmering silver and gold daker saaj, resonating with thunderous traditional Dhaki beats and sacred evening Sandhi Aarti."}
          </p>

          <div className="kpn-heritage-highlights">
            <div className="kpn-highlight-box">
              <span className="kpn-hl-icon">🎨</span>
              <div>
                <strong>CRAFT STYLE</strong>
                <p>Classic Daker Saaj (Silver & foil filigree)</p>
              </div>
            </div>
            <div className="kpn-highlight-box">
              <span className="kpn-hl-icon">🌺</span>
              <div>
                <strong>SIGNATURE EVENT</strong>
                <p>Sindoor Khela (Dashami morning ritual)</p>
              </div>
            </div>
          </div>
        </div>

        {/* On-Ground Facilities Grid */}
        <div className="kpn-facilities-section">
          <h3 className="kpn-facilities-title">On-Ground Facilities</h3>
          <div className="kpn-facilities-grid">
            <div className="kpn-facility-item">
              <span className="kpn-fac-icon">♿</span>
              <strong>Wheelchair</strong>
              <small>Ramp Open</small>
            </div>
            <div className="kpn-facility-item">
              <span className="kpn-fac-icon">➕</span>
              <strong>Medical</strong>
              <small>Camp Gate 3</small>
            </div>
            <div className="kpn-facility-item">
              <span className="kpn-fac-icon">💧</span>
              <strong>Drinking</strong>
              <small>Free Kiosk</small>
            </div>
            <div className="kpn-facility-item">
              <span className="kpn-fac-icon">🛡️</span>
              <strong>Helpdesk</strong>
              <small>KP Booth 1</small>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="kpn-details-fixed-bottom">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="kpn-btn-bottom-nav-primary"
          id="details-start-nav-btn"
        >
          <WalkIcon size={16} />
          <span>Start Walking Nav</span>
        </a>

        <button
          type="button"
          className={`kpn-btn-bottom-nav-secondary ${isInPlanner ? 'is-active' : ''}`}
          onClick={onAddToPlanner}
          id="details-add-route-btn"
        >
          <span>{isInPlanner ? '✓ In Hopping Route' : '+ Add Route'}</span>
        </button>
      </div>
    </div>
  );
}
