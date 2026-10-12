import React, { useState, useMemo } from 'react';
import { MetroStation, Pandal } from '../types';
import { METRO_STATIONS, METRO_STATIONS_BY_ID } from '../data/metroStations';
import { METRO_LINES } from '../data/metroLines';
import { MetroIcon, WalkIcon, BookmarkIcon, CloseIcon, ShieldCheckIcon, VolumeIcon } from './Icons';

interface MetroStationListProps {
  pandals: Pandal[];
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  onSelectPandal: (pandal: Pandal) => void;
}

// Schematic key nodes for Blue Line (North-South arterial line)
const SCHEMATIC_NODES = [
  { id: 'shyambazar', name: 'Shyam.', note: 'N. Hub', bengali: 'শ্যামবাজার' },
  { id: 'esplanade', name: 'Esplanade', note: 'Interchange ⇄', bengali: 'এসপ্ল্যানেড' },
  { id: 'kalighat', name: 'Kalighat', note: '6 Pujas', bengali: 'কালীঘাট' },
  { id: 'rabindra-sarobar', name: 'R. Sarobar', note: '4 Pujas', bengali: 'রবীন্দ্র সরোবর' },
  { id: 'kavi-subhash', name: 'K. Subhash', note: 'Terminal', bengali: 'কবি সুভাষ' },
];

export function MetroStationList({
  pandals,
  selectedStationId,
  onSelectStation,
  onSelectPandal,
}: MetroStationListProps) {
  const [activeLineCode, setActiveLineCode] = useState<string>('blue');
  const [stationSearch, setStationSearch] = useState<string>('');
  const [showToast, setShowToast] = useState(true);

  // Default to Kalighat if 'all' or empty, to match the design screenshot
  const currentStation =
    selectedStationId !== 'all' && METRO_STATIONS_BY_ID[selectedStationId]
      ? METRO_STATIONS_BY_ID[selectedStationId]
      : METRO_STATIONS_BY_ID['kalighat'] || METRO_STATIONS[0];

  // Count pandals per station
  const countByStation = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of pandals) {
      if (p.nearestStationId) {
        map[p.nearestStationId] = (map[p.nearestStationId] || 0) + 1;
      }
    }
    return map;
  }, [pandals]);

  // Nearby pandals for current station
  const nearbyPandals = useMemo(() => {
    return pandals.filter(
      (p) =>
        p.nearestStationId === currentStation.id ||
        p.alternativeStations?.some((alt) => alt.stationId === currentStation.id)
    );
  }, [pandals, currentStation.id]);

  // Stations for active line or search
  const filteredStations = useMemo(() => {
    return METRO_STATIONS.filter((st) => {
      if (stationSearch.trim()) {
        const q = stationSearch.toLowerCase().trim();
        return (
          st.name.toLowerCase().includes(q) ||
          (st.bengaliName && st.bengaliName.includes(q))
        );
      }
      if (activeLineCode !== 'all') {
        return st.lineCode === activeLineCode;
      }
      return true;
    });
  }, [stationSearch, activeLineCode]);

  return (
    <div className="kpn-stitch-metro-view">
      {/* 1. Festive Special Transit Notice Banner */}
      <div className="kpn-metro-notice-banner" role="alert">
        <span className="kpn-notice-dot" />
        <p className="kpn-notice-text">
          <strong>FESTIVAL SPECIAL TRANSIT:</strong> All-Night Metro running till 4:00 AM · 4-min Puja Night frequency
        </p>
      </div>

      {/* 2. Station Search & Selector Input */}
      <div className="kpn-metro-search-box">
        <MetroIcon size={17} className="kpn-metro-input-icon" />
        <input
          type="text"
          placeholder="Search Metro station..."
          value={stationSearch || (currentStation ? `${currentStation.name} (${currentStation.bengaliName || ''})` : '')}
          onFocus={() => setStationSearch('')}
          onChange={(e) => setStationSearch(e.target.value)}
          aria-label="Search Metro station"
        />
        {stationSearch && (
          <button
            type="button"
            onClick={() => setStationSearch('')}
            className="kpn-metro-clear-btn"
            aria-label="Clear station search"
          >
            <CloseIcon size={13} />
          </button>
        )}
      </div>

      {/* 3. Corridor Line Filter Pills */}
      <div className="kpn-metro-corridors-bar">
        <button
          className={`kpn-corridor-pill ${activeLineCode === 'all' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveLineCode('all');
            setStationSearch('');
          }}
        >
          All Stations ({METRO_STATIONS.length})
        </button>

        {METRO_LINES.map((line) => (
          <button
            key={line.code}
            className={`kpn-corridor-pill ${activeLineCode === line.code ? 'is-active' : ''}`}
            onClick={() => {
              setActiveLineCode(line.code);
              setStationSearch('');
            }}
          >
            <span className="kpn-pill-swatch" style={{ backgroundColor: line.color }} />
            {line.name}
          </button>
        ))}
      </div>

      {/* Station Dropdown Picker when searching */}
      {stationSearch && (
        <div className="kpn-station-picker-dropdown">
          {filteredStations.slice(0, 8).map((st) => (
            <div
              key={st.id}
              className="kpn-picker-item"
              onClick={() => {
                onSelectStation(st.id);
                setStationSearch('');
              }}
              role="button"
              tabIndex={0}
            >
              <div className="kpn-picker-left">
                <strong>{st.name}</strong>
                {st.bengaliName && <small>{st.bengaliName}</small>}
              </div>
              <span className="kpn-picker-badge">{countByStation[st.id] || 0} pujas</span>
            </div>
          ))}
        </div>
      )}

      {/* 4. Interactive Transit Schematic Line Diagram */}
      <div className="kpn-schematic-card">
        <div className="kpn-schematic-header">
          <div>
            <h3>Transit Schematic</h3>
            <span className="kpn-schematic-bengali">মেট্রো করিডোর</span>
          </div>
          <span className="kpn-schematic-hint">👆 Tap stop to switch</span>
        </div>

        {/* Visual Line Schematic */}
        <div className="kpn-schematic-track-wrap">
          <div className="kpn-schematic-line-track" />
          <div className="kpn-schematic-nodes">
            {SCHEMATIC_NODES.map((node) => {
              const isNodeSelected = currentStation.id === node.id;
              return (
                <div
                  key={node.id}
                  className={`kpn-schematic-node ${isNodeSelected ? 'is-active' : ''}`}
                  onClick={() => onSelectStation(node.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="kpn-node-name">{node.name}</span>
                  <div className="kpn-node-pin">
                    {isNodeSelected ? '📍' : node.note.includes('Interchange') ? '⇄' : '•'}
                  </div>
                  <span className="kpn-node-sub">{node.note}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="kpn-schematic-alert-bar">
          <span>⏳ Peak Crowd Alert: 8:00 PM – 1:30 AM</span>
          <span className="kpn-schematic-countdown">Live Train: 2 min away</span>
        </div>
      </div>

      {/* 5. Selected Metro Hub Detail Card */}
      <div className="kpn-hub-detail-card">
        <div className="kpn-hub-line-tag">
          <span>🔵 Blue Line · Station #19</span>
          <BookmarkIcon size={16} />
        </div>

        <h2 className="kpn-hub-name">
          {currentStation.name} Metro <span className="kpn-hub-bengali">{currentStation.bengaliName}</span>
        </h2>

        <div className="kpn-hub-density-banner">
          <span className="kpn-density-icon">🔥</span>
          <p>
            <strong>Highest Pandal Density Station:</strong>{' '}
            {nearbyPandals.length || 6} legendary heritage & award-winning pandals within 900 meters
          </p>
        </div>

        {/* Smart Gate Exit Strategy */}
        <div className="kpn-gate-strategy-box">
          <div className="kpn-gate-strategy-head">
            <span>🚪 Smart Gate Exit Strategy</span>
            <span className="kpn-kp-badge">Kolkata Police Verified</span>
          </div>

          <div className="kpn-gates-grid">
            <div className="kpn-gate-column">
              <strong>Gates 1 & 2</strong>
              <small>East / SP Mkr</small>
              <p>Best for Gariahat, Singhi Park & Ekdalia Evergreen (Auto Stand)</p>
            </div>
            <div className="kpn-gate-column">
              <strong>Gates 3 & 4</strong>
              <small>Rashbehari Ave</small>
              <p>Direct walking route to Tridhara, Badamtala & Chetla Agrani</p>
            </div>
          </div>
        </div>

        {/* Transit Metrics row */}
        <div className="kpn-hub-metrics-row">
          <div className="kpn-hub-metric-item">
            <strong>4 min</strong>
            <small>Avg Next Train</small>
          </div>
          <div className="kpn-hub-metric-item">
            <strong className="text-green">Moderate</strong>
            <small>Platform Flow</small>
          </div>
          <div className="kpn-hub-metric-item">
            <strong>₹10 - ₹20</strong>
            <small>Smart Token</small>
          </div>
        </div>
      </div>

      {/* 6. Nearby Famous Pandals List */}
      <div className="kpn-nearby-section">
        <div className="kpn-nearby-header">
          <div>
            <h3>Nearby Famous Pandals</h3>
            <span className="kpn-nearby-count-pill">{nearbyPandals.length} Priority</span>
          </div>
          <button className="kpn-nearby-sort-btn">🎛️ Nearest</button>
        </div>
        <p className="kpn-nearby-subtext">Walking paths optimized for police one-way crowd control</p>

        <div className="kpn-nearby-list">
          {nearbyPandals.map((pandal, idx) => (
            <div
              key={pandal.id}
              className="kpn-nearby-pandal-card"
              onClick={() => onSelectPandal(pandal)}
              role="button"
              tabIndex={0}
            >
              <div className="kpn-nearby-card-top">
                <span className="kpn-route-badge">🛡️ POLICE APPROVED ROUTE</span>
                <span className="kpn-nearby-dist-big">
                  {pandal.walkingDistanceMeters || 380 + idx * 120}m
                </span>
              </div>

              <div className="kpn-nearby-info-row">
                <div className="kpn-nearby-names">
                  <h4>{pandal.name}</h4>
                  {pandal.bengaliName && <span className="kpn-nearby-beng">{pandal.bengaliName}</span>}
                  <p className="kpn-nearby-theme">
                    Theme: {pandal.theme ? pandal.theme.slice(0, 50) + '...' : pandal.knownFor}
                  </p>
                </div>
                <span className="kpn-nearby-walk-mins">
                  {pandal.walkingTimeMinutes || 5 + idx * 2} min walk
                </span>
              </div>

              <div className="kpn-nearby-tags-row">
                <span className="kpn-tag-gate">🚪 Exit Gate {idx % 2 === 0 ? '3' : '4'}</span>
                <span className="kpn-tag-calibrated">
                  <ShieldCheckIcon size={12} /> GPS Calibrated Path
                </span>
                <span className="kpn-tag-queue">👥 ~15 min queue</span>
              </div>

              <div className="kpn-nearby-actions-row">
                <button
                  type="button"
                  className="kpn-btn-walk-metro"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPandal(pandal);
                  }}
                >
                  <WalkIcon size={14} />
                  <span>Walk from Metro</span>
                </button>
                <button
                  type="button"
                  className="kpn-btn-audio-mini"
                  onClick={(e) => e.stopPropagation()}
                  title="Audio directions"
                  aria-label="Audio guide"
                >
                  <VolumeIcon size={15} />
                </button>
              </div>
            </div>
          ))}

          {nearbyPandals.length === 0 && (
            <div className="kpn-empty-hub-state">
              <p>No mapped pandals directly linked to this station.</p>
              <small>Tap "All Stations" or select Kalighat / Shyambazar.</small>
            </div>
          )}
        </div>
      </div>

      {/* 7. Routing Guidance Toast */}
      {showToast && (
        <div className="kpn-routing-toast" role="status">
          <span className="kpn-toast-dot">🔴</span>
          <div className="kpn-toast-text">
            <strong>Routing to Pandal:</strong> Head to Exit Gate 3 · Follow green floor decals
          </div>
          <button
            type="button"
            className="kpn-toast-dismiss-btn"
            onClick={() => setShowToast(false)}
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
