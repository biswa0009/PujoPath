import React, { useState } from 'react';
import { Pandal } from '../types';
import { METRO_STATIONS } from '../data/metroStations';
import { CloseIcon, VerifiedCheckIcon } from './Icons';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  pandals: Pandal[];
  onSavePandals: (updated: Pandal[]) => void;
  onResetDefault: () => void;
}

export function AdminModal({
  isOpen,
  onClose,
  pandals,
  onSavePandals,
  onResetDefault,
}: AdminModalProps) {
  const [activeTab, setActiveTab] = useState<'validate' | 'add' | 'export'>('validate');

  // Form state for adding a new pandal
  const [name, setName] = useState('');
  const [bengaliName, setBengaliName] = useState('');
  const [neighbourhood, setNeighbourhood] = useState('');
  const [zone, setZone] = useState<Pandal['zone']>('North');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [category, setCategory] = useState<Pandal['category']>('Traditional');
  const [nearestStationId, setNearestStationId] = useState(METRO_STATIONS[0].id);
  const [theme, setTheme] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [formMsg, setFormMsg] = useState('');

  if (!isOpen) return null;

  // Validation: Find missing coordinates
  const missingCoords = pandals.filter((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lng));

  // Validation: Find potential duplicates (normalized name match)
  const duplicatePairs: { name1: string; name2: string; id1: string; id2: string }[] = [];
  const normalizedMap = new Map<string, Pandal>();

  for (const p of pandals) {
    const norm = p.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/sarbojanin|durgotsav|club|samity|durga|puja|pally/g, '');

    if (norm.length > 3 && normalizedMap.has(norm)) {
      const prev = normalizedMap.get(norm)!;
      duplicatePairs.push({
        name1: prev.name,
        name2: p.name,
        id1: prev.id,
        id2: p.id,
      });
    } else if (norm.length > 3) {
      normalizedMap.set(norm, p);
    }
  }

  // Handle adding new pandal
  const handleAddNewPandal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormMsg('Please enter a pandal name.');
      return;
    }

    const parsedLat = lat ? parseFloat(lat) : null;
    const parsedLng = lng ? parseFloat(lng) : null;

    if (parsedLat && (parsedLat < 22.3 || parsedLat > 22.8)) {
      setFormMsg('Latitude should be around Kolkata coordinates (22.4° - 22.7°N).');
      return;
    }
    if (parsedLng && (parsedLng < 88.2 || parsedLng > 88.6)) {
      setFormMsg('Longitude should be around Kolkata coordinates (88.3° - 88.5°E).');
      return;
    }

    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 36);

    const newPandal: Pandal = {
      id: `${id}-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      bengaliName: bengaliName.trim() || undefined,
      neighbourhood: neighbourhood.trim() || 'Kolkata',
      zone,
      address: address.trim() || `${neighbourhood}, Kolkata`,
      lat: parsedLat,
      lng: parsedLng,
      category,
      nearestStationId: nearestStationId || null,
      walkingDistanceMeters: parsedLat && parsedLng ? 600 : null,
      walkingTimeMinutes: parsedLat && parsedLng ? 8 : null,
      theme: theme.trim() || undefined,
      knownFor: theme.trim() || 'Verified community Durga Puja.',
      sourceUrl: sourceUrl.trim() || undefined,
      lastVerifiedDate: new Date().toISOString().split('T')[0],
      status: parsedLat && parsedLng ? 'verified' : 'area-only',
    };

    onSavePandals([newPandal, ...pandals]);
    setFormMsg(`Successfully added "${newPandal.name}" to directory!`);
    setName('');
    setBengaliName('');
    setAddress('');
    setLat('');
    setLng('');
    setTheme('');
    setSourceUrl('');
  };

  // Export JSON file download
  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pandals, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'kolkata_pandals_directory.json');
    dlAnchor.click();
  };

  return (
    <div className="kpn-modal-backdrop" onClick={onClose}>
      <div
        className="kpn-modal-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="kpn-modal-header">
          <div>
            <h2 className="kpn-modal-title">Data Integrity & Contributor Admin</h2>
            <p className="kpn-modal-sub">
              Manage Kolkata Puja Navigator directory records, audit GPS coordinates, and export
              seed data.
            </p>
          </div>
          <button onClick={onClose} className="kpn-modal-close" aria-label="Close modal">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="kpn-modal-tabs">
          <button
            className={`kpn-modal-tab-btn ${activeTab === 'validate' ? 'active' : ''}`}
            onClick={() => setActiveTab('validate')}
          >
            Audit & Validation ({missingCoords.length} Unverified)
          </button>
          <button
            className={`kpn-modal-tab-btn ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            + Add New Pandal
          </button>
          <button
            className={`kpn-modal-tab-btn ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            Export & Persistence
          </button>
        </div>

        <div className="kpn-modal-body">
          {/* TAB 1: AUDIT & VALIDATION */}
          {activeTab === 'validate' && (
            <div className="kpn-audit-tab">
              <div className="kpn-audit-stats">
                <div className="kpn-audit-card">
                  <small>TOTAL REGISTERED PANDALS</small>
                  <strong>{pandals.length}</strong>
                </div>
                <div className="kpn-audit-card">
                  <small>VERIFIED MAP COORDINATES</small>
                  <strong className="text-emerald">
                    {pandals.filter((p) => Number.isFinite(p.lat)).length}
                  </strong>
                </div>
                <div className="kpn-audit-card">
                  <small>PENDING GPS VERIFICATION</small>
                  <strong className="text-amber">{missingCoords.length}</strong>
                </div>
                <div className="kpn-audit-card">
                  <small>SIMILAR DUPLICATE ALERTS</small>
                  <strong className="text-blue">{duplicatePairs.length}</strong>
                </div>
              </div>

              {/* Duplicate check results */}
              {duplicatePairs.length > 0 && (
                <div className="kpn-audit-section">
                  <h4 className="kpn-audit-subhead">Potential Duplicate Entries Detected:</h4>
                  <div className="kpn-audit-list">
                    {duplicatePairs.map((pair, idx) => (
                      <div key={idx} className="kpn-dup-item">
                        <span>⚠️ Similar match:</span>
                        <strong>"{pair.name1}"</strong> &amp; <strong>"{pair.name2}"</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Coordinates List */}
              <div className="kpn-audit-section">
                <h4 className="kpn-audit-subhead">
                  Records Pending Field Geocoding ({missingCoords.length}):
                </h4>
                {missingCoords.length === 0 ? (
                  <div className="kpn-all-verified">
                    <VerifiedCheckIcon className="w-5 h-5 text-emerald" />
                    All records in active directory possess verified geographic coordinates!
                  </div>
                ) : (
                  <div className="kpn-missing-list">
                    {missingCoords.map((p) => (
                      <div key={p.id} className="kpn-missing-item">
                        <div>
                          <strong>{p.name}</strong>
                          <small>
                            Area: {p.neighbourhood} · Status: {p.status}
                          </small>
                        </div>
                        <span className="kpn-pending-tag">GPS Pending</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ADD NEW PANDAL */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddNewPandal} className="kpn-add-form">
              {formMsg && <div className="kpn-form-msg">{formMsg}</div>}

              <div className="kpn-form-grid">
                <div className="kpn-field">
                  <label>Pandal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maddox Square Durgotsav"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="kpn-field">
                  <label>Bengali Name (বাংলা নাম)</label>
                  <input
                    type="text"
                    placeholder="e.g. ম্যাডক্স স্কোয়ার"
                    value={bengaliName}
                    onChange={(e) => setBengaliName(e.target.value)}
                  />
                </div>

                <div className="kpn-field">
                  <label>Neighbourhood / Area *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ballygunge / Hatibagan"
                    value={neighbourhood}
                    onChange={(e) => setNeighbourhood(e.target.value)}
                  />
                </div>

                <div className="kpn-field">
                  <label>Kolkata Zone</label>
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value as Pandal['zone'])}
                  >
                    <option value="North">North Kolkata</option>
                    <option value="Central">Central Kolkata</option>
                    <option value="South">South Kolkata</option>
                    <option value="Salt Lake / East">Salt Lake / East</option>
                    <option value="South-West">South-West (Behala / Kidderpore)</option>
                  </select>
                </div>

                <div className="kpn-field">
                  <label>Latitude (e.g. 22.5265)</label>
                  <input
                    type="text"
                    placeholder="22.5265"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                </div>

                <div className="kpn-field">
                  <label>Longitude (e.g. 88.3548)</label>
                  <input
                    type="text"
                    placeholder="88.3548"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                  />
                </div>

                <div className="kpn-field">
                  <label>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Pandal['category'])}
                  >
                    <option value="Traditional">Traditional (Sabeki)</option>
                    <option value="Theme">Contemporary Theme</option>
                    <option value="Heritage Rajbari">Heritage Bonedi Bari</option>
                    <option value="Contemporary Landmark">Contemporary Landmark</option>
                  </select>
                </div>

                <div className="kpn-field">
                  <label>Nearest Metro Station</label>
                  <select
                    value={nearestStationId}
                    onChange={(e) => setNearestStationId(e.target.value)}
                  >
                    {METRO_STATIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.line})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="kpn-field full-width">
                  <label>Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Ritchie Rd, Ballygunge, Kolkata 700019"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="kpn-field full-width">
                  <label>Annual Theme / Significance Note</label>
                  <textarea
                    rows={2}
                    placeholder="Describe known artistic theme, centenary history, or Pratima style..."
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  />
                </div>

                <div className="kpn-field full-width">
                  <label>Verification Source URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="kpn-form-actions">
                <button type="submit" className="kpn-btn-primary">
                  Save Pandal to Directory
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: EXPORT & PERSISTENCE */}
          {activeTab === 'export' && (
            <div className="kpn-export-tab">
              <div className="kpn-export-card">
                <h3>Export Directory as Structured JSON</h3>
                <p>
                  Download the complete seed dataset including verified GPS coordinates, Bengali
                  names, and Metro associations for use in PostgreSQL/Supabase or offline backups.
                </p>
                <button onClick={handleExportJSON} className="kpn-btn-primary">
                  Download JSON ({pandals.length} records)
                </button>
              </div>

              <div className="kpn-export-card danger">
                <h3>Reset to Official Default Seed</h3>
                <p>
                  Revert all custom added pandals and restore the original verified starter
                  directory.
                </p>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to restore defaults?')) {
                      onResetDefault();
                      alert('Restored default verified pandal catalogue.');
                    }
                  }}
                  className="kpn-btn-danger"
                >
                  Restore Defaults
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
