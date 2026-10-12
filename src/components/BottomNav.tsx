import React from 'react';
import { CompassIcon, NightPlanIcon, MetroIcon, WalkIcon, BookmarkIcon } from './Icons';

export type MainNavTab = 'explore' | 'plan-night' | 'metro' | 'routes' | 'saved';

interface BottomNavProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  savedCount?: number;
  routesCount?: number;
  nightPlanCount?: number;
}

export function BottomNav({
  activeTab,
  onTabChange,
  savedCount = 0,
  routesCount = 0,
  nightPlanCount = 0,
}: BottomNavProps) {
  return (
    <nav className="kpn-bottom-nav" aria-label="Bottom Navigation">
      <button
        type="button"
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
        type="button"
        className={`kpn-bnav-item ${activeTab === 'plan-night' ? 'is-active' : ''}`}
        onClick={() => onTabChange('plan-night')}
        aria-label="Pujo Night Planner"
        id="bnav-plan-night-btn"
      >
        <span className="kpn-bnav-icon-wrap">
          <NightPlanIcon size={20} />
          {nightPlanCount > 0 && <span className="kpn-bnav-badge">{nightPlanCount}</span>}
        </span>
        <span className="kpn-bnav-label">Plan Night</span>
      </button>

      <button
        type="button"
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
        type="button"
        className={`kpn-bnav-item ${activeTab === 'routes' ? 'is-active' : ''}`}
        onClick={() => onTabChange('routes')}
        aria-label="Pandal Hopping Routes"
        id="bnav-routes-btn"
      >
        <span className="kpn-bnav-icon-wrap">
          <WalkIcon size={20} />
          {routesCount > 0 && <span className="kpn-bnav-badge">{routesCount}</span>}
        </span>
        <span className="kpn-bnav-label">Routes</span>
      </button>

      <button
        type="button"
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

