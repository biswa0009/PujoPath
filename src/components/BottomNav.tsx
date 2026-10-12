import React from 'react';
import { CompassIcon, MetroIcon, RouteIcon, BookmarkIcon } from './Icons';

export type MainNavTab = 'explore' | 'metro' | 'routes' | 'saved';

interface BottomNavProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  savedCount?: number;
  routesCount?: number;
}

export function BottomNav({
  activeTab,
  onTabChange,
  savedCount = 0,
  routesCount = 0,
}: BottomNavProps) {
  return (
    <nav className="kpn-bottom-nav" aria-label="Bottom Navigation">
      <button
        className={`kpn-bnav-item ${activeTab === 'explore' ? 'is-active' : ''}`}
        onClick={() => onTabChange('explore')}
        aria-label="Explore Kolkata Pandals"
        id="bnav-explore-btn"
      >
        <span className="kpn-bnav-icon-wrap">
          <CompassIcon size={20} />
        </span>
        <span className="kpn-bnav-label">Explore</span>
      </button>

      <button
        className={`kpn-bnav-item ${activeTab === 'metro' ? 'is-active' : ''}`}
        onClick={() => onTabChange('metro')}
        aria-label="Kolkata Metro Hubs & Transit"
        id="bnav-metro-btn"
      >
        <span className="kpn-bnav-icon-wrap">
          <MetroIcon size={20} />
        </span>
        <span className="kpn-bnav-label">Metro</span>
      </button>

      <button
        className={`kpn-bnav-item ${activeTab === 'routes' ? 'is-active' : ''}`}
        onClick={() => onTabChange('routes')}
        aria-label="Pandal Hopping Routes"
        id="bnav-routes-btn"
      >
        <span className="kpn-bnav-icon-wrap">
          <RouteIcon size={20} />
          {routesCount > 0 && <span className="kpn-bnav-badge">{routesCount}</span>}
        </span>
        <span className="kpn-bnav-label">Routes</span>
      </button>

      <button
        className={`kpn-bnav-item ${activeTab === 'saved' ? 'is-active' : ''}`}
        onClick={() => onTabChange('saved')}
        aria-label="Saved Pandals Bookmarks"
        id="bnav-saved-btn"
      >
        <span className="kpn-bnav-icon-wrap">
          <BookmarkIcon size={20} filled={activeTab === 'saved'} />
          {savedCount > 0 && <span className="kpn-bnav-badge">{savedCount}</span>}
        </span>
        <span className="kpn-bnav-label">Saved</span>
      </button>
    </nav>
  );
}
