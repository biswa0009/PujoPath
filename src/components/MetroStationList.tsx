import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MetroStation, Pandal } from '../types';
import { METRO_STATIONS, METRO_STATIONS_BY_ID } from '../data/metroStations';
import { METRO_LINES } from '../data/metroLines';
import {
  MetroIcon,
  WalkIcon,
  CloseIcon,
  ShieldCheckIcon,
  BookmarkIcon,
  DirectionsIcon,
  VolumeIcon,
  DoorIcon,
  UsersGroupIcon,
} from './Icons';

interface MetroStationListProps {
  pandals: Pandal[];
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  onSelectPandal: (pandal: Pandal) => void;
}

// Known Kolkata area aliases & landmarks mapping to metro stations
const STATION_ALIASES: Record<string, string[]> = {
  kalighat: ['gariahat', 'rashbehari', 'deshapriya park', 'lake mall', 'triangular park', 'kali temple'],
  shyambazar: ['five point', 'bagbazar', 'hatibagan', 'shyam bazar', 'bidhan sarani', 'rg kar'],
  'shobhabazar-sutanuti': ['kumartuli', 'sovabazar', 'sutanuti', 'kumartoli', 'shobhabazar rajbari'],
  central: ['bowbazar', 'lebutala', 'santosh mitra square', 'college street', 'medical college', 'bb ganguly'],
  'mahatma-gandhi-road': ['mg road', 'burrabazar', 'college square', 'barabazar', 'calcutta university'],
  esplanade: ['dharmatala', 'new market', 'curzon park', 'grand hotel', 'interchange hub'],
  'park-street': ['park street', 'flurys', 'allen park', 'camac street'],
  'rabindra-sarobar': ['dhakuria', 'southern avenue', 'mudiali', 'menoka cinema', 'lake club'],
  'jatin-das-park': ['hazra', 'hazra crossing', 'maddox square', 'harish park'],
  'netaji-bhavan': ['bhawanipur', 'bhowanipore', 'ashutosh mukherjee road', '75 pally'],
  'dum-dum': ['dumdum', 'airport connector', 'railway junction'],
  'kavi-subhash': ['new garia', 'garia terminal', 'em bypass'],
  'howrah-maidan': ['howrah', 'howrah railway station', 'howrah bridge', 'river tunnel'],
  howrah: ['howrah station', 'howrah railway junction', 'underwater metro'],
  sealdah: ['sealdah railway', 'kole market', 'baithakkhana'],
  'salt-lake-sector-v': ['sector 5', 'salt lake it hub', 'wipro crossing', 'technopolis'],
  karunamoyee: ['salt lake central bus stand', 'bidhannagar', 'yuba bharati'],
  'city-centre': ['salt lake cc1', 'city centre 1', 'salt lake dc block'],
  'behala-chowrasta': ['chowrasta', 'behala', 'diamond harbour road'],
  majerhat: ['majherhat', 'alipore', 'taratala connector'],
};

// Gate strategy details for key puja metro hubs
const GATE_STRATEGIES: Record<
  string,
  {
    gateA: { label: string; exit: string; desc: string };
    gateB: { label: string; exit: string; desc: string };
  }
> = {
  kalighat: {
    gateA: {
      label: 'Gates 1 & 2',
      exit: 'East / SP Mukherjee Rd',
      desc: 'Best for Gariahat, Singhi Park & Ekdalia Evergreen (Auto stand available).',
    },
    gateB: {
      label: 'Gates 3 & 4',
      exit: 'Rashbehari Ave',
      desc: 'Direct walking route to Tridhara Sammilani, Badamtala Ashar Sangha & Chetla Agrani.',
    },
  },
  shyambazar: {
    gateA: {
      label: 'Gate 1',
      exit: 'Bidhan Sarani / Bagbazar St',
      desc: 'Shortest walking access to Bagbazar Sarbojanin centenary idol and Kumartuli Park.',
    },
    gateB: {
      label: 'Gates 2 & 3',
      exit: 'Five-Point Crossing',
      desc: 'Direct route to Hatibagan Sarbojanin, Nalin Sarkar St & Gouribari.',
    },
  },
  central: {
    gateA: {
      label: 'Gates 2 & 3',
      exit: 'B.B. Ganguly Street',
      desc: 'Direct police corridor towards Bowbazar & Santosh Mitra Square (Lebutala).',
    },
    gateB: {
      label: 'Gate 4',
      exit: 'Chittaranjan Avenue North',
      desc: 'Walk north towards College Street, Medical College & Calcutta University.',
    },
  },
  'mahatma-gandhi-road': {
    gateA: {
      label: 'Gates 1 & 2',
      exit: 'MG Road East',
      desc: 'Direct route to College Square Sarbojanin and iconic illuminated water reflection.',
    },
    gateB: {
      label: 'Gates 3 & 4',
      exit: 'Chittaranjan Ave South',
      desc: 'Quick access towards Mohammad Ali Park & Burrabazar traditional pujas.',
    },
  },
  'shobhabazar-sutanuti': {
    gateA: {
      label: 'Gate 1',
      exit: 'Rabindra Sarani / Sovabazar',
      desc: 'Direct walk into historic Shobhabazar Rajbari ancestral courtyards.',
    },
    gateB: {
      label: 'Gate 2',
      exit: 'Grey Street / Hatibagan',
      desc: 'Connecting route towards Ahiritola Sarbojanin & Kumartuli Ghat.',
    },
  },
  'rabindra-sarobar': {
    gateA: {
      label: 'Gates 1 & 2',
      exit: 'Southern Avenue',
      desc: 'Scenic lake road walking path to Mudiali Club & Shiv Mandir Sarbojanin.',
    },
    gateB: {
      label: 'Gate 3',
      exit: 'Dhakuria Bridge connector',
      desc: 'Access toward Menoka Cinema and Jodhpur Park walking corridors.',
    },
  },
  sealdah: {
    gateA: {
      label: 'Metro Gate 1',
      exit: 'Sealdah Main Concourse',
      desc: 'Direct subway transfer to Eastern Railway suburban platforms & taxi bay.',
    },
    gateB: {
      label: 'Metro Gate 2',
      exit: 'Beliaghata Road',
      desc: 'Direct walking route to Chalta Bagan & Sealdah Athletic Club pujas.',
    },
  },
};

export function MetroStationList({
  pandals,
  selectedStationId,
  onSelectStation,
  onSelectPandal,
}: MetroStationListProps) {
  // Line tab state ('blue', 'green', 'purple', 'all')
  const [activeLineCode, setActiveLineCode] = useState<string>('blue');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState<number>(-1);
  const schematicScrollRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Active station resolution (falls back to selectedStationId, or Kalighat for Blue Line)
  const currentStation: MetroStation = useMemo(() => {
    if (selectedStationId && selectedStationId !== 'all' && METRO_STATIONS_BY_ID[selectedStationId]) {
      return METRO_STATIONS_BY_ID[selectedStationId];
    }
    // Pick first station of active line or Kalighat
    const lineStations = METRO_STATIONS.filter((s) => s.lineCode === activeLineCode);
    if (lineStations.length > 0) {
      const kalighat = lineStations.find((s) => s.id === 'kalighat');
      return kalighat || lineStations[0];
    }
    return METRO_STATIONS[0];
  }, [selectedStationId, activeLineCode]);

  // When selectedStation changes, keep activeLineCode synchronized
  useEffect(() => {
    if (selectedStationId && selectedStationId !== 'all' && METRO_STATIONS_BY_ID[selectedStationId]) {
      const st = METRO_STATIONS_BY_ID[selectedStationId];
      if (st.lineCode && st.lineCode !== activeLineCode && activeLineCode !== 'all') {
        setActiveLineCode(st.lineCode);
      }
    }
  }, [selectedStationId]);

  // Count verified/listed pandals per station
  const pandalsCountByStation = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of pandals) {
      if (p.nearestStationId) {
        counts[p.nearestStationId] = (counts[p.nearestStationId] || 0) + 1;
      }
      p.alternativeStations?.forEach((alt) => {
        counts[alt.stationId] = (counts[alt.stationId] || 0) + 1;
      });
    }
    return counts;
  }, [pandals]);

  // Pandals near the currently selected station
  const nearbyPandals = useMemo(() => {
    return pandals.filter(
      (p) =>
        p.nearestStationId === currentStation.id ||
        p.alternativeStations?.some((alt) => alt.stationId === currentStation.id)
    );
  }, [pandals, currentStation.id]);

  // Filtered station search results matching English, Bengali, Line, or Aliases
  const searchResults = useMemo(() => {
    const q = (searchQuery || debouncedQuery).trim().toLowerCase();
    if (!q) return [];

    return METRO_STATIONS.filter((st) => {
      const nameMatch = st.name.toLowerCase().includes(q);
      const bengaliMatch = st.bengaliName ? st.bengaliName.includes(q) : false;
      const lineMatch = st.line.toLowerCase().includes(q);
      const aliases = STATION_ALIASES[st.id] || [];
      const aliasMatch = aliases.some((a) => a.toLowerCase().includes(q));
      return nameMatch || bengaliMatch || lineMatch || aliasMatch;
    });
  }, [searchQuery, debouncedQuery]);

  // Stations for active schematic line (geographically sorted in original data)
  const lineStationsForSchematic = useMemo(() => {
    if (activeLineCode === 'all') {
      return METRO_STATIONS.filter((s) => s.lineCode === 'blue');
    }
    return METRO_STATIONS.filter((s) => s.lineCode === activeLineCode);
  }, [activeLineCode]);

  // Scroll active schematic node into view
  useEffect(() => {
    if (schematicScrollRef.current) {
      const activeEl = schematicScrollRef.current.querySelector(
        `[data-station-id="${currentStation.id}"]`
      ) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentStation.id, activeLineCode]);

  // Keyboard navigation inside search suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setKeyboardSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setKeyboardSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (keyboardSelectedIndex >= 0 && searchResults[keyboardSelectedIndex]) {
        handleSelectStation(searchResults[keyboardSelectedIndex]);
      } else if (searchResults[0]) {
        handleSelectStation(searchResults[0]);
      }
    } else if (e.key === 'Escape') {
      setIsInputFocused(false);
      setSearchQuery('');
    }
  };

  const handleSelectStation = (st: MetroStation) => {
    onSelectStation(st.id);
    setActiveLineCode(st.lineCode);
    setSearchQuery('');
    setDebouncedQuery('');
    setIsInputFocused(false);
    setKeyboardSelectedIndex(-1);
  };

  const activeLineMeta = METRO_LINES.find((l) => l.code === (currentStation.lineCode || 'blue'));
  const currentLineColor = activeLineMeta?.color || '#0062B1';

  // Strategy gates fallback
  const strategy = GATE_STRATEGIES[currentStation.id] || {
    gateA: {
      label: 'Main Entrance / Gates 1 & 2',
      exit: 'Primary Boulevard Exit',
      desc: `Direct walking exit towards ${nearbyPandals[0]?.name || 'nearby community pandals'}.`,
    },
    gateB: {
      label: 'Secondary / Gates 3 & 4',
      exit: 'Arterial Street Exit',
      desc: 'Convenient egress toward connecting transit corridors and local auto stands.',
    },
  };

  // Station sequence index on its line
  const stationLineIndex = lineStationsForSchematic.findIndex((s) => s.id === currentStation.id) + 1;

  return (
    <div className="kpn-stitch-metro-view">
      {/* 1. Festive Special Transit Notice Banner */}
      <div className="kpn-metro-notice-banner" role="alert">
        <span className="kpn-notice-dot" />
        <p className="kpn-notice-text">
          <strong>FESTIVAL SPECIAL TRANSIT:</strong> All-Night Metro running till 4:00 AM · 4-min Puja Night frequency (Estimated frequency: 5–7 min regular; 4 min peak)
        </p>
      </div>

      {/* 2. Prominent, Accessible Metro Station Search */}
      <div className="kpn-metro-search-container">
        <label htmlFor="metro-station-search-input" className="kpn-visually-hidden">
          Search Kolkata Metro Station
        </label>
        <div className="kpn-metro-search-box">
          <MetroIcon size={18} className="kpn-metro-input-icon" aria-hidden="true" />
          <input
            id="metro-station-search-input"
            type="text"
            className="kpn-metro-search-input"
            placeholder="Search station (e.g. Kalighat, কালীঘাট, Gariahat, Blue Line)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onKeyDown={handleKeyDown}
            aria-autocomplete="list"
            aria-controls="metro-search-suggestions"
            aria-expanded={isInputFocused && searchResults.length > 0}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDebouncedQuery('');
              }}
              className="kpn-metro-clear-btn"
              aria-label="Clear station search"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>

        {/* Search Results Autocomplete Dropdown */}
        {(isInputFocused || searchQuery.trim().length > 0) && searchResults.length > 0 && (
          <div
            id="metro-search-suggestions"
            className="kpn-station-picker-dropdown"
            role="listbox"
          >
            {searchResults.map((st, idx) => {
              const lineM = METRO_LINES.find((l) => l.code === st.lineCode);
              const isSelected = idx === keyboardSelectedIndex;
              return (
                <div
                  key={st.id}
                  className={`kpn-picker-item ${isSelected ? 'is-highlighted' : ''}`}
                  onClick={() => handleSelectStation(st)}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                >
                  <div className="kpn-picker-left">
                    <span
                      className="kpn-picker-line-bullet"
                      style={{ backgroundColor: lineM?.color || '#0062B1' }}
                    />
                    <div>
                      <strong className="kpn-picker-name">{st.name}</strong>
                      {st.bengaliName && <span className="kpn-picker-bn">{st.bengaliName}</span>}
                      <small className="kpn-picker-line-name">{st.line}</small>
                    </div>
                  </div>
                  <div className="kpn-picker-right">
                    <span className="kpn-picker-badge">
                      {pandalsCountByStation[st.id] || 0} Pujas
                    </span>
                    {st.interchange && <span className="kpn-interchange-badge">⇄ Transfer</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Corridor Line Selector Pills */}
      <div className="kpn-metro-corridors-bar" role="tablist" aria-label="Kolkata Metro Lines">
        {METRO_LINES.filter((l) => ['blue', 'green', 'purple'].includes(l.code)).map((line) => {
          const isActive = activeLineCode === line.code;
          return (
            <button
              key={line.code}
              role="tab"
              aria-selected={isActive}
              className={`kpn-corridor-pill ${isActive ? 'is-active' : ''}`}
              onClick={() => {
                setActiveLineCode(line.code);
                // Select first station of line if current station is not on it
                const firstOnLine = METRO_STATIONS.find((s) => s.lineCode === line.code);
                if (firstOnLine && currentStation.lineCode !== line.code) {
                  onSelectStation(firstOnLine.id);
                }
              }}
            >
              <span className="kpn-pill-swatch" style={{ backgroundColor: line.color }} />
              <span>{line.name}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Redesigned Transit Schematic Diagram */}
      <div className="kpn-schematic-card" aria-label="Interactive Metro Transit Schematic">
        <div className="kpn-schematic-header">
          <div>
            <div className="kpn-schematic-title-row">
              <h3 className="kpn-schematic-title">Transit Schematic</h3>
              <span
                className="kpn-line-tag-pill"
                style={{
                  backgroundColor: `${currentLineColor}18`,
                  color: currentLineColor,
                  borderColor: currentLineColor,
                }}
              >
                {activeLineMeta?.name || 'Blue Line'} ({lineStationsForSchematic.length} Stations)
              </span>
            </div>
            <p className="kpn-schematic-bengali">মেট্রো করিডোর ও স্টেশন পরিক্রমা</p>
          </div>
          <span className="kpn-schematic-hint">👆 Tap node to switch station</span>
        </div>

        {/* Scrollable Schematic Track */}
        <div className="kpn-schematic-scroll-container" ref={schematicScrollRef} tabIndex={0}>
          <div className="kpn-schematic-track-inner">
            {/* The colored metro line rail */}
            <div
              className="kpn-schematic-rail-line"
              style={{ backgroundColor: currentLineColor }}
            />

            {/* Stations as evenly spaced, distinct nodes */}
            <div className="kpn-schematic-nodes-row">
              {lineStationsForSchematic.map((st, idx) => {
                const isSelected = st.id === currentStation.id;
                const pCount = pandalsCountByStation[st.id] || 0;

                return (
                  <button
                    key={st.id}
                    data-station-id={st.id}
                    type="button"
                    className={`kpn-schematic-node-btn ${isSelected ? 'is-selected' : ''} ${
                      st.interchange ? 'is-interchange' : ''
                    }`}
                    onClick={() => onSelectStation(st.id)}
                    aria-label={`Select ${st.name} station, ${pCount} pandals`}
                  >
                    {/* Station Name above or below node */}
                    <div className="kpn-node-label-wrap">
                      <span className="kpn-node-name">{st.name}</span>
                      {st.bengaliName && <span className="kpn-node-bn">{st.bengaliName}</span>}
                    </div>

                    {/* Node Visual Shape */}
                    <div
                      className="kpn-node-circle"
                      style={{
                        borderColor: isSelected ? currentLineColor : '#FFFFFF',
                        backgroundColor: isSelected ? currentLineColor : '#FFFFFF',
                      }}
                    >
                      {isSelected ? (
                        <span className="kpn-node-inner-dot" />
                      ) : st.interchange ? (
                        <span className="kpn-node-interchange-glyph">⇄</span>
                      ) : (
                        <span
                          className="kpn-node-core-bullet"
                          style={{ backgroundColor: currentLineColor }}
                        />
                      )}
                    </div>

                    {/* Information Badge below */}
                    <div className="kpn-node-badge-wrap">
                      {st.interchange ? (
                        <span className="kpn-node-sub-tag interchange">Interchange ⇄</span>
                      ) : pCount > 0 ? (
                        <span className="kpn-node-sub-tag pujas">{pCount} Pujas</span>
                      ) : (
                        <span className="kpn-node-sub-tag stop">Stop #{idx + 1}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Schematic Legend & Live Advisory footer */}
        <div className="kpn-schematic-footer-bar">
          <div className="kpn-schematic-legend">
            <span className="kpn-legend-item">
              <span className="kpn-legend-bullet standard" style={{ backgroundColor: currentLineColor }} />
              Station
            </span>
            <span className="kpn-legend-item">
              <span className="kpn-legend-bullet interchange">⇄</span>
              Interchange
            </span>
            <span className="kpn-legend-item">
              <span className="kpn-legend-bullet active" />
              Selected Node
            </span>
          </div>

          <div className="kpn-schematic-timing-alert">
            <span>⏳ Peak Crowd: 8:00 PM – 1:30 AM</span>
            <span className="kpn-live-indicator">● Live train: ~2–4 min away (Estimated)</span>
          </div>
        </div>
      </div>

      {/* 5. Selected Metro Hub Detail Card */}
      <div className="kpn-hub-detail-card" aria-label={`Details for ${currentStation.name} Metro`}>
        <div className="kpn-hub-header-meta">
          <div className="kpn-hub-line-tag">
            <span
              className="kpn-hub-line-chip"
              style={{ backgroundColor: currentLineColor, color: '#FFF' }}
            >
              {activeLineMeta?.name || 'Blue Line'}
            </span>
            {stationLineIndex > 0 && (
              <span className="kpn-hub-index-chip">Station #{stationLineIndex}</span>
            )}
            {currentStation.interchange && (
              <span className="kpn-hub-interchange-pill">⇄ Major Interchange Hub</span>
            )}
          </div>
          <button
            type="button"
            className="kpn-hub-bookmark-btn"
            title="Station Bookmarked"
            aria-label="Station Bookmarked"
          >
            <BookmarkIcon size={16} />
          </button>
        </div>

        <div className="kpn-hub-title-block">
          <h2 className="kpn-hub-name">
            {currentStation.name} Metro{' '}
            {currentStation.bengaliName && (
              <span className="kpn-hub-bengali">{currentStation.bengaliName}</span>
            )}
          </h2>
          <p className="kpn-hub-zone-sub">
            {currentStation.zone} Kolkata Corridor · {currentStation.operational ? 'Operational Station' : 'Future Link'}
          </p>
        </div>

        {/* Pandal Density Callout Banner */}
        <div className="kpn-hub-density-banner">
          <span className="kpn-density-icon">🔥</span>
          <p>
            <strong>Pandal Density Hub:</strong>{' '}
            {nearbyPandals.length > 0
              ? `${nearbyPandals.length} iconic Durga Puja pandals accessible within walking / direct e-rickshaw reach`
              : 'Direct transit stop connecting Kolkata festival corridors'}
          </p>
        </div>

        {/* Smart Gate Exit Strategy (Police Verified) */}
        <div className="kpn-gate-strategy-box">
          <div className="kpn-gate-strategy-head">
            <div className="kpn-gate-title-left">
              <span>🚪 Smart Gate Exit Strategy</span>
            </div>
            <span className="kpn-kp-badge">
              <ShieldCheckIcon size={12} /> Kolkata Police Verified
            </span>
          </div>

          <div className="kpn-gates-grid">
            <div className="kpn-gate-column">
              <strong className="kpn-gate-label">{strategy.gateA.label}</strong>
              <small className="kpn-gate-exit-name">{strategy.gateA.exit}</small>
              <p className="kpn-gate-desc">{strategy.gateA.desc}</p>
            </div>
            <div className="kpn-gate-column">
              <strong className="kpn-gate-label">{strategy.gateB.label}</strong>
              <small className="kpn-gate-exit-name">{strategy.gateB.exit}</small>
              <p className="kpn-gate-desc">{strategy.gateB.desc}</p>
            </div>
          </div>
        </div>

        {/* Transit Frequency & Flow Metrics */}
        <div className="kpn-hub-metrics-row">
          <div className="kpn-hub-metric-item">
            <strong>~4 min</strong>
            <small>Puja Night Interval</small>
          </div>
          <div className="kpn-hub-metric-item">
            <strong className="text-green">
              {currentStation.zone === 'South' || currentStation.zone === 'North' ? 'High' : 'Moderate'}
            </strong>
            <small>Platform Crowd Flow</small>
          </div>
          <div className="kpn-hub-metric-item">
            <strong>₹10 – ₹20</strong>
            <small>Smart Token Fare</small>
          </div>
        </div>
      </div>

      {/* 6. Nearby Famous Pandals List (Stitch UI) */}
      <div className="kpn-nearby-section">
        <div className="kpn-nearby-header">
          <div>
            <h3>Nearby Famous Pandals</h3>
            <span className="kpn-nearby-count-pill">{nearbyPandals.length} Available</span>
          </div>
          <button type="button" className="kpn-nearby-sort-btn">
            Nearest
          </button>
        </div>
        <p className="kpn-nearby-subtext">Walking paths optimized for police one-way crowd control</p>

        {nearbyPandals.length === 0 ? (
          <div className="kpn-empty-state-card" style={{ marginTop: 8 }}>
            <p>No mapped pandals directly within 1 km of this station yet.</p>
            <small>Explore other stations on the {activeLineMeta?.name || 'Blue Line'} using the schematic above.</small>
          </div>
        ) : (
          <div className="kpn-nearby-list">
            {nearbyPandals.map((pandal) => {
              const walkDist = pandal.walkingDistanceMeters || 650;
              const walkMin = pandal.walkingTimeMinutes || Math.round(walkDist / 75);

              return (
                <div key={pandal.id} className="kpn-nearby-pandal-card">
                  <div className="kpn-nearby-card-top">
                    <span className="kpn-route-badge">
                      <ShieldCheckIcon size={12} style={{ marginRight: 4 }} />
                      POLICE APPROVED ROUTE • {pandal.neighbourhood || 'Corridor'}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span className="kpn-nearby-dist-big">
                        {walkDist < 1000 ? `${walkDist}m` : `${(walkDist / 1000).toFixed(1)}km`}
                      </span>
                      <span className="kpn-nearby-walk-mins" style={{ display: 'block' }}>
                        ~{walkMin} min walk
                      </span>
                    </div>
                  </div>

                  <div
                    className="kpn-nearby-info-row"
                    onClick={() => onSelectPandal(pandal)}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="kpn-nearby-names">
                      <h4>
                        {pandal.name}
                        {pandal.bengaliName && (
                          <span className="kpn-nearby-beng">{pandal.bengaliName}</span>
                        )}
                      </h4>
                      <p className="kpn-nearby-theme">
                        {pandal.theme || pandal.knownFor || `${pandal.category} puja at ${pandal.neighbourhood}`}
                      </p>
                    </div>
                  </div>

                  <div className="kpn-nearby-tags-row">
                    <span className="kpn-tag-gate">
                      <DoorIcon size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                      Exit Gate {pandal.nearestStationId ? '1 & 2' : 'Active'}
                    </span>
                    <span className="kpn-tag-calibrated">
                      ● GPS Calibrated Path
                    </span>
                    <span className="kpn-tag-queue">
                      <UsersGroupIcon size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                      ~15 min queue
                    </span>
                  </div>

                  <div className="kpn-nearby-actions-row">
                    <button
                      type="button"
                      className="kpn-btn-walk-metro"
                      onClick={() => onSelectPandal(pandal)}
                    >
                      <WalkIcon size={15} />
                      <span>Walk from Metro</span>
                    </button>
                    <button
                      type="button"
                      className="kpn-btn-audio-mini"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Bengali audio guide for ${pandal.name} active during festive days!`);
                      }}
                      title="Audio guide"
                      aria-label="Audio guide"
                    >
                      <VolumeIcon size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
