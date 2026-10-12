import React from 'react';
import { SearchIcon, CloseIcon, CrosshairIcon, UserIcon, CompassIcon, MetroIcon, RouteIcon, BookmarkIcon } from './Icons';
import { MainNavTab } from './BottomNav';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  plannerCount: number;
  totalPandals: number;
  visibleCount: number;
  onLocateMe: () => void;
  onOpenAdmin: () => void;
  isLocating?: boolean;
}

export function Header({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  plannerCount,
  totalPandals,
  visibleCount,
  onLocateMe,
  onOpenAdmin,
  isLocating = false,
}: HeaderProps) {
  return (
    <header className="kpn-topbar" role="banner">
      <div className="kpn-topbar-inner">
        {/* Brand Logo & Emblem matching Stitch design */}
        <div className="kpn-brand-wrap">
          <button
            type="button"
            onClick={() => onTabChange('explore')}
            className="kpn-brand-link"
            aria-label="PujoPath Home"
            id="brand-home-btn"
          >
            <div className="kpn-brand-emblem" aria-hidden="true">
              <span className="kpn-emblem-motif">✿</span>
            </div>
            <div className="kpn-brand-name-wrap">
              <span className="kpn-brand-title">
                Pujo<span className="kpn-gold-accent">Path</span>
                <span className="kpn-brand-dot">.</span>
              </span>
            </div>
          </button>
        </div>

        {/* Global Pill Search Bar */}
        <div className="kpn-header-search">
          <SearchIcon className="kpn-search-icon" size={16} />
          <input
            type="text"
            placeholder="Find pandals, Metro..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search pandals, Metro stations, or neighbourhoods"
            id="global-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="kpn-search-clear"
              title="Clear search"
              aria-label="Clear search"
              id="clear-search-btn"
            >
              <CloseIcon size={13} />
            </button>
          )}
        </div>

        {/* Action Controls: GPS Locate & User Profile */}
        <div className="kpn-header-actions">
          <button
            type="button"
            className={`kpn-circle-action-btn ${isLocating ? 'is-locating' : ''}`}
            onClick={onLocateMe}
            title="Locate my position on map"
            aria-label="Locate me via GPS"
            id="header-locate-btn"
          >
            <CrosshairIcon size={17} />
          </button>

          <button
            type="button"
            className="kpn-circle-avatar-btn"
            onClick={onOpenAdmin}
            title="Admin & Data Management"
            aria-label="User Profile and Admin Portal"
            id="header-admin-btn"
          >
            <UserIcon size={16} />
          </button>
        </div>

        {/* Desktop-only Navigation Tabs (for wide screens) */}
        <nav className="kpn-desktop-nav" aria-label="Desktop Navigation">
          <button
            className={`kpn-desktop-tab ${activeTab === 'explore' ? 'is-active' : ''}`}
            onClick={() => onTabChange('explore')}
          >
            <CompassIcon size={16} />
            <span>Explore</span>
          </button>
          <button
            className={`kpn-desktop-tab ${activeTab === 'metro' ? 'is-active' : ''}`}
            onClick={() => onTabChange('metro')}
          >
            <MetroIcon size={16} />
            <span>Metro</span>
          </button>
          <button
            className={`kpn-desktop-tab ${activeTab === 'routes' ? 'is-active' : ''}`}
            onClick={() => onTabChange('routes')}
          >
            <RouteIcon size={16} />
            <span>Routes</span>
            {plannerCount > 0 && <span className="kpn-badge-tiny">{plannerCount}</span>}
          </button>
          <button
            className={`kpn-desktop-tab ${activeTab === 'saved' ? 'is-active' : ''}`}
            onClick={() => onTabChange('saved')}
          >
            <BookmarkIcon size={16} filled={activeTab === 'saved'} />
            <span>Saved</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
