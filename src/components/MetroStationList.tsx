import React from 'react';
import { MetroStation, Pandal } from '../types';
import { METRO_STATIONS } from '../data/metroStations';
import { METRO_LINES } from '../data/metroLines';
import { MetroIcon } from './Icons';

interface MetroStationListProps {
  pandals: Pandal[];
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  onSelectPandal: (pandal: Pandal) => void;
}

export function MetroStationList({
  pandals,
  selectedStationId,
  onSelectStation,
  onSelectPandal,
}: MetroStationListProps) {
  // Count pandals per station
  const countByStation = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of pandals) {
      if (p.nearestStationId) {
        map[p.nearestStationId] = (map[p.nearestStationId] || 0) + 1;
      }
    }
    return map;
  }, [pandals]);

  // Group stations by line
  const stationsByLine = React.useMemo(() => {
    const groups: Record<string, MetroStation[]> = {};
    for (const s of METRO_STATIONS) {
      if (!groups[s.line]) groups[s.line] = [];
      groups[s.line].push(s);
    }
    return groups;
  }, []);

  return (
    <div className="kpn-metro-hubs-view">
      <div className="kpn-metro-intro">
        <h2 className="kpn-section-title">Explore by Kolkata Metro Hubs</h2>
        <p className="kpn-section-desc">
          Select any Metro station to instantly discover pandals within walking distance.
        </p>
      </div>

      {/* Show All Stations button */}
      <button
        className={`kpn-station-all-btn ${selectedStationId === 'all' ? 'active' : ''}`}
        onClick={() => onSelectStation('all')}
      >
        <span className="kpn-station-icon-round">✦</span>
        <div className="kpn-station-info-text">
          <strong>All Kolkata Metro Hubs</strong>
          <small>Show pandals across all operational corridors</small>
        </div>
        <span className="kpn-station-count-pill">{pandals.length}</span>
      </button>

      {/* Stations grouped by Line */}
      {METRO_LINES.map((line) => {
        const lineStations = stationsByLine[line.name] || [];
        if (lineStations.length === 0) return null;

        return (
          <div key={line.code} className="kpn-line-group">
            <div className="kpn-line-header" style={{ borderLeftColor: line.color }}>
              <div className="kpn-line-title">
                <span className="kpn-line-swatch" style={{ backgroundColor: line.color }} />
                <h3>{line.name}</h3>
              </div>
              <span className="kpn-line-terminals">{line.terminals}</span>
            </div>

            <div className="kpn-stations-grid">
              {lineStations.map((st) => {
                const count = countByStation[st.id] || 0;
                const isSelected = selectedStationId === st.id;

                return (
                  <div
                    key={st.id}
                    className={`kpn-station-item-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectStation(st.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="kpn-station-item-head">
                      <span
                        className="kpn-metro-badge-tiny"
                        style={{ backgroundColor: line.color }}
                      >
                        M
                      </span>
                      <div className="kpn-station-names">
                        <strong>{st.name}</strong>
                        {st.bengaliName && <small>{st.bengaliName}</small>}
                      </div>
                      <span
                        className={`kpn-station-count-badge ${count > 0 ? 'has-pandals' : ''}`}
                      >
                        {count} {count === 1 ? 'pandal' : 'pandals'}
                      </span>
                    </div>

                    {/* If selected and has pandals, display quick list */}
                    {isSelected && count > 0 && (
                      <div className="kpn-station-quick-pandals">
                        <small className="kpn-nearby-label">Nearby Pandals:</small>
                        <div className="kpn-quick-chips">
                          {pandals
                            .filter((p) => p.nearestStationId === st.id)
                            .map((p) => (
                              <button
                                key={p.id}
                                className="kpn-quick-chip"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPandal(p);
                                }}
                              >
                                {p.name}
                                {p.walkingDistanceMeters && (
                                  <span className="kpn-chip-dist">
                                    ({p.walkingDistanceMeters}m)
                                  </span>
                                )}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
