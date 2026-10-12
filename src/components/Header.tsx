import React from 'react';
import { SearchIcon, CloseIcon, RouteIcon, MetroIcon, SparklesIcon } from './Icons';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTab: 'explore' | 'metro' | 'planner' | 'admin';
  onTabChange: (tab: 'explore' | 'metro' | 'planner' | 'admin') => void;
  plannerCount: number;
  totalPandals: number;
  visibleCount: number;
}

export function Header({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  plannerCount,
  totalPandals,
  visibleCount,
}: HeaderProps) {
  return (
    <header className="kpn-topbar">
      <div className="kpn-topbar-inner">
        {/* Brand & Season Badge */}
        <div className="kpn-brand-wrap">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onTabChange('explore');
            }}
            className="kpn-brand"
            aria-label="Kolkata Puja Navigator Home"
          >
            <span className="kpn-brand-symbol">✿</span>
            <div className="kpn-brand-text">
              <span className="kpn-brand-title">Puja<span className="kpn-gold">Path</span></span>
              <span className="kpn-brand-subtitle">Kolkata Pandal & Metro Navigator</span>
            </div>
          </a>
          <span className="kpn-badge-live">
            <span className="kpn-live-pulse" />
            SHARODOTSAV 2026
          </span>
        </div>

        {/* Global Search Box in Header */}
        <div className="kpn-header-search">
          <SearchIcon className="kpn-search-icon" />
          <input
            type="text"
            placeholder="Search pandals, Bengali names, areas, or Metro stations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search pandals"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="kpn-search-clear"
              title="Clear search"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="kpn-search-count">
            {visibleCount}/{totalPandals}
          </span>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="kpn-nav-tabs">
          <button
            className={`kpn-tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => onTabChange('explore')}
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Directory</span>
          </button>
          <button
            className={`kpn-tab-btn ${activeTab === 'metro' ? 'active' : ''}`}
            onClick={() => onTabChange('metro')}
          >
            <MetroIcon className="w-4 h-4" />
            <span>Metro Hubs</span>
          </button>
          <button
            className={`kpn-tab-btn ${activeTab === 'planner' ? 'active' : ''}`}
            onClick={() => onTabChange('planner')}
          >
            <RouteIcon className="w-4 h-4" />
            <span>Hop Route</span>
            {plannerCount > 0 && <span className="kpn-nav-badge">{plannerCount}</span>}
          </button>
          <button
            className={`kpn-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => onTabChange('admin')}
          >
            <span>Admin & Data</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
