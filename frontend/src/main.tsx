import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { api, getToken, tokenKey, websocketUrl } from './lib/api';
import { Alert, Camera, CameraStats, Event, Movement, User } from './types';
import MapView from './components/MapView';
import { CameraGrid } from './components/CameraCard';
import { AlertPanel } from './components/AlertPanel';
import { EventsTable } from './components/EventsTable';
import { Topbar, Sidebar } from './components/Layout';
import { LoadingState, ErrorState, EmptyState } from './components/common';
import './styles.css';

// ─── Types ──────────────────────────────────────────────────────────────────
type Page = 'dashboard' | 'cameras' | 'investigate' | 'watchlist' | 'events';

// ─── Login ───────────────────────────────────────────────────────────────────
function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('admin@example.com');
  const [pw, setPw] = useState('Admin@123');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPw(userPass);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.login(email.trim().toLowerCase(), pw);
      localStorage.setItem(tokenKey, r.access_token);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" role="main">
        <div className="login-brand">
          <div className="brandmark" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="login-title">okDriver</div>
            <div className="login-subtitle">INTELLIGENCE CONSOLE</div>
          </div>
        </div>

        <p className="login-desc">
          Automated CCTV monitoring, computer vision telemetry, and real-time ANPR correlation platform.
        </p>

        {/* Quick fill demo credentials */}
        <div className="demo-credentials-box">
          <span className="demo-label">Quick Demo Access:</span>
          <div className="demo-buttons">
            <button
              type="button"
              className={`demo-chip ${email === 'admin@example.com' ? 'active' : ''}`}
              onClick={() => fillCredentials('admin@example.com', 'Admin@123')}
            >
              🛡️ Admin
            </button>
            <button
              type="button"
              className={`demo-chip ${email === 'operator@example.com' ? 'active' : ''}`}
              onClick={() => fillCredentials('operator@example.com', 'Operator@123')}
            >
              👁️ Operator
            </button>
          </div>
        </div>

        <form className="form" onSubmit={handleSubmit} aria-label="Login form">
          <div className="form-field">
            <label htmlFor="email" className="form-label">Operator Email</label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@okdriver.internal"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-field">
            <div className="form-label-row">
              <label htmlFor="password" className="form-label">Access Token / Password</label>
              <button
                type="button"
                className="show-pw-btn"
                onClick={() => setShowPw(!showPw)}
                tabIndex={-1}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="password"
              className="input"
              type={showPw ? 'text' : 'password'}
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="form-error" role="alert">
              <span>⚠ {error}</span>
            </div>
          )}

          <button className="btn primary login-btn" disabled={busy} type="submit">
            {busy ? (
              <span className="btn-loading-content">
                <span className="btn-spinner" />
                <span>Verifying Access…</span>
              </span>
            ) : (
              'Enter Intelligence Console'
            )}
          </button>
        </form>

        <div className="login-security-notice">
          <span>🔒 Secured via Argon2id · Session JWT · Role-based RBAC</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: any;
  sub: string;
  accent?: 'ok' | 'warn' | 'critical' | 'info';
}) {
  return (
    <div className={`stat-card${accent ? ` accent-${accent}` : ''}`} aria-label={`${label}: ${value}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({
  cameras,
  stats,
  alerts,
  events,
  openAlerts,
  newAlertIds,
  onAck,
  onResolve,
  onInvestigate,
  loading,
  loadError,
  onReload,
}: {
  cameras: Camera[];
  stats?: CameraStats;
  alerts: Alert[];
  events: Event[];
  openAlerts: Alert[];
  newAlertIds: Set<number>;
  onAck: (id: number) => void;
  onResolve: (id: number) => void;
  onInvestigate: (identifier: string) => void;
  loading: boolean;
  loadError: string;
  onReload: () => void;
}) {
  const criticalAlerts = openAlerts.filter(a => a.severity === 'CRITICAL');
  const alertCameraIds = new Set(
    alerts
      .filter(a => a.status === 'OPEN')
      .map(a => cameras.find(c => c.camera_code === a.camera_code)?.id)
      .filter((id): id is number => id !== undefined)
  );

  const handleCamInvestigate = (cam: Camera) => {
    onInvestigate(cam.camera_code);
  };

  if (loading) return <LoadingState label="Synchronizing operations telemetry…" />;
  if (loadError) return <ErrorState label={loadError} onRetry={onReload} />;

  return (
    <div className="page-content">
      {/* Page heading */}
      <div className="page-head">
        <div>
          <h1 className="page-title">Operations Command Center</h1>
          <p className="page-desc">Unified real-time CCTV surveillance, AI ANPR detection, and alert correlation.</p>
        </div>
        <button className="btn secondary refresh-btn" onClick={onReload} aria-label="Refresh telemetry">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Critical alert banner */}
      {criticalAlerts.length > 0 && (
        <div className="critical-banner" role="alert" aria-live="assertive">
          <div className="critical-banner-content">
            <span className="critical-banner-icon" aria-hidden="true">⚠</span>
            <span>
              <strong>{criticalAlerts.length} CRITICAL INCIDENT{criticalAlerts.length > 1 ? 'S' : ''} DETECTED</strong>
              {' '}— Blacklisted / Wanted target identified in live stream
            </span>
          </div>
          {criticalAlerts[0]?.vehicle_number && (
            <button
              className="btn small danger-contrast-btn"
              onClick={() => onInvestigate(criticalAlerts[0].vehicle_number!)}
            >
              Trace {criticalAlerts[0].vehicle_number} →
            </button>
          )}
        </div>
      )}

      {/* System metrics row */}
      <div className="stats-row">
        <StatCard label="Total Cameras" value={stats?.total ?? cameras.length} sub="Registered RTSP feeds" />
        <StatCard label="Online Feeds" value={stats?.online ?? cameras.filter(c => c.status === 'ONLINE').length} sub="Active streaming" accent="ok" />
        <StatCard label="Degraded" value={stats?.degraded ?? 0} sub="Heartbeat delayed" accent={stats?.degraded ? 'warn' : undefined} />
        <StatCard label="Offline" value={stats?.offline ?? 0} sub="Signal disconnected" accent={stats?.offline ? 'critical' : undefined} />
        <StatCard label="Active Alerts" value={openAlerts.length} sub="Pending dispatch" accent={openAlerts.length > 0 ? 'critical' : 'info'} />
      </div>

      {/* Main content: camera grid + alert panel */}
      <div className="dashboard-main">
        <section className="dashboard-left" aria-labelledby="camera-section">
          <div className="section-header">
            <div className="section-title-wrap">
              <h2 id="camera-section" className="section-title">Live Video Feeds</h2>
              <span className="live-status-pill">● ACTIVE SENSORS</span>
            </div>
            <span className="section-count">{cameras.filter(c => c.status === 'ONLINE').length} / {cameras.length} Online</span>
          </div>
          <CameraGrid cameras={cameras} onInvestigate={handleCamInvestigate} />
        </section>

        <aside className="dashboard-right" aria-labelledby="alerts-section">
          <div className="section-header">
            <div className="section-title-wrap">
              <h2 id="alerts-section" className="section-title">Real-Time Alerts</h2>
              {openAlerts.length > 0 && (
                <span className="section-badge critical" aria-label={`${openAlerts.length} open`}>
                  {openAlerts.length} PENDING
                </span>
              )}
            </div>
          </div>
          <AlertPanel
            alerts={alerts}
            onAck={onAck}
            onResolve={onResolve}
            onInvestigate={onInvestigate}
            newAlertIds={newAlertIds}
            maxVisible={8}
          />
        </aside>
      </div>

      {/* GIS Map */}
      <section className="card" aria-labelledby="map-section">
        <div className="section-header">
          <div className="section-title-wrap">
            <h2 id="map-section" className="section-title">GIS Spatial Telemetry &amp; Camera Overlay</h2>
          </div>
          <span className="section-meta-text">Real-time GPS coordinate mapping</span>
        </div>
        <MapView cameras={cameras} activeAlertCameraIds={alertCameraIds} />
      </section>

      {/* Recent detections */}
      <section className="card" aria-labelledby="events-section">
        <div className="section-header">
          <div className="section-title-wrap">
            <h2 id="events-section" className="section-title">Recent AI Detection Ingestion</h2>
            <span className="section-count">{Math.min(10, events.length)} of {events.length}</span>
          </div>
        </div>
        <EventsTable events={events.slice(0, 10)} onInvestigate={onInvestigate} />
      </section>
    </div>
  );
}

// ─── Cameras Page ─────────────────────────────────────────────────────────────
function CamerasPage({ cameras, onReload }: { cameras: Camera[]; onReload: () => void }) {
  const getNextCode = (list: Camera[]) => {
    const num = list.length + 1;
    return `C${String(num).padStart(3, '0')}`;
  };

  const [form, setForm] = useState({
    camera_code: getNextCode(cameras),
    name: '',
    department: 'Traffic Enforcement',
    latitude: '23.0450',
    longitude: '72.5620',
    camera_type: 'traffic',
    source_protocol: 'RTSP',
    stream_reference: `traffic/00${cameras.length + 1}`,
    zone: 'Ahmedabad North',
  });
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync camera_code if list updates
  useEffect(() => {
    if (!form.name) {
      const code = getNextCode(cameras);
      setForm(f => ({ ...f, camera_code: code, stream_reference: `traffic/00${cameras.length + 1}` }));
    }
  }, [cameras.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setIsError(false);
    setSubmitting(true);
    try {
      await api.createCamera({
        ...form,
        camera_code: form.camera_code.trim().toUpperCase(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude)
      });
      await onReload();
      setMsg(`Camera ${form.camera_code} registered successfully.`);
      const nextCode = `C${String(cameras.length + 2).padStart(3, '0')}`;
      setForm({
        camera_code: nextCode,
        name: '',
        department: 'Traffic Enforcement',
        latitude: '23.0450',
        longitude: '72.5620',
        camera_type: 'traffic',
        source_protocol: 'RTSP',
        stream_reference: `traffic/00${cameras.length + 2}`,
        zone: 'Ahmedabad North',
      });
    } catch (err) {
      setIsError(true);
      setMsg(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Camera Registry</h1>
          <p className="page-desc">Manage CCTV ingestion sources, RTSP endpoints, and GIS spatial coordinates.</p>
        </div>
      </div>

      <div className="two-col">
        {/* Camera table */}
        <section className="card" aria-labelledby="cameras-table-heading">
          <div className="section-header">
            <h2 id="cameras-table-heading" className="section-title">Registered Video Sources</h2>
            <span className="section-count">{cameras.length} total feeds</span>
          </div>
          {cameras.length === 0 ? (
            <EmptyState icon="🎥" label="No cameras registered" />
          ) : (
            <div className="table-wrapper">
              <table className="table" aria-label="Registered cameras">
                <thead>
                  <tr>
                    <th scope="col">Code &amp; Name</th>
                    <th scope="col">Location Coordinates</th>
                    <th scope="col">Protocol</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cameras.map(c => (
                    <tr key={c.id}>
                      <td>
                        <span className="table-code">{c.camera_code}</span>
                        <div className="table-cam-name">{c.name}</div>
                        <div className="muted font-mono">{c.zone} · {c.department}</div>
                      </td>
                      <td className="muted font-mono">
                        {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                      </td>
                      <td>
                        <span className="proto-tag">{c.source_protocol}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${c.status.toLowerCase()}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Add camera form */}
        <section className="card" aria-labelledby="add-camera-heading">
          <div className="section-header">
            <h2 id="add-camera-heading" className="section-title">Onboard New Camera</h2>
          </div>
          <form className="form" onSubmit={handleSubmit} aria-label="Add new camera">
            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="cam-code" className="form-label">Camera Code</label>
                <input
                  id="cam-code"
                  className="input"
                  placeholder="e.g. C004"
                  value={form.camera_code}
                  onChange={e => setForm({ ...form, camera_code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="cam-name" className="form-label">Location / Landmark Name</label>
                <input
                  id="cam-name"
                  className="input"
                  placeholder="e.g. Paldi Crossroads"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="cam-lat" className="form-label">Latitude</label>
                <input
                  id="cam-lat"
                  type="number"
                  step="any"
                  className="input"
                  placeholder="23.0450"
                  value={form.latitude}
                  onChange={e => setForm({ ...form, latitude: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="cam-lon" className="form-label">Longitude</label>
                <input
                  id="cam-lon"
                  type="number"
                  step="any"
                  className="input"
                  placeholder="72.5620"
                  value={form.longitude}
                  onChange={e => setForm({ ...form, longitude: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="cam-zone" className="form-label">Zone</label>
                <input
                  id="cam-zone"
                  className="input"
                  placeholder="e.g. Ahmedabad East"
                  value={form.zone}
                  onChange={e => setForm({ ...form, zone: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label htmlFor="cam-dept" className="form-label">Department</label>
                <input
                  id="cam-dept"
                  className="input"
                  placeholder="Traffic"
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="cam-stream" className="form-label">Stream Path / URI</label>
              <input
                id="cam-stream"
                className="input font-mono"
                placeholder="traffic/004"
                value={form.stream_reference}
                onChange={e => setForm({ ...form, stream_reference: e.target.value })}
              />
            </div>

            {msg && (
              <div className={isError ? 'form-error' : 'form-success'} role="status">
                {isError ? `⚠ ${msg}` : `✓ ${msg}`}
              </div>
            )}

            <button className="btn primary" disabled={submitting} type="submit">
              {submitting ? 'Registering Camera…' : 'Register Camera Feed'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

// ─── Investigate Page ─────────────────────────────────────────────────────────
function InvestigatePage({
  initialIdentifier,
  cameras,
}: {
  initialIdentifier: string;
  cameras: Camera[];
}) {
  const [search, setSearch] = useState(initialIdentifier);
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [movement, setMovement] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doSearch = useCallback(async (idToSearch: string) => {
    const clean = idToSearch.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError('');
    try {
      const m = await api.movement(clean);
      setMovement(m);
      setIdentifier(clean);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
      setMovement([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialIdentifier) {
      setSearch(initialIdentifier);
      doSearch(initialIdentifier);
    }
  }, [initialIdentifier, doSearch]);

  const firstSeen = movement.length ? new Date(movement[0].timestamp) : null;
  const lastSeen = movement.length ? new Date(movement[movement.length - 1].timestamp) : null;

  return (
    <div className="page-content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Entity Route Investigation</h1>
          <p className="page-desc">Reconstruct spatial trajectory, chronological camera detections, and speed timeline.</p>
        </div>
      </div>

      {/* Search bar with quick demo target buttons */}
      <div className="search-bar-container">
        <div className="search-bar">
          <input
            id="entity-search"
            className="input font-mono"
            value={search}
            onChange={e => setSearch(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && doSearch(search)}
            placeholder="Vehicle Plate / Entity ID (e.g. GJ01XX0001)"
            aria-label="Entity identifier search"
          />
          {search && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
          <button
            className="btn primary"
            onClick={() => doSearch(search)}
            aria-label="Search entity"
            disabled={loading || !search.trim()}
          >
            {loading ? 'Tracing Route…' : 'Trace Movement'}
          </button>
        </div>

        <div className="quick-targets-row">
          <span className="qt-label">Sample Targets:</span>
          <button
            type="button"
            className={`qt-chip ${identifier === 'GJ01XX0001' ? 'active' : ''}`}
            onClick={() => { setSearch('GJ01XX0001'); doSearch('GJ01XX0001'); }}
          >
            🚨 GJ01XX0001 (Multi-point Track)
          </button>
          <button
            type="button"
            className={`qt-chip ${identifier === 'GJ01XX0002' ? 'active' : ''}`}
            onClick={() => { setSearch('GJ01XX0002'); doSearch('GJ01XX0002'); }}
          >
            📋 GJ01XX0002
          </button>
        </div>
      </div>

      {/* Entity profile summary */}
      {identifier && movement.length > 0 && (
        <div className="entity-profile" aria-label="Entity profile">
          <div className="entity-profile-header">
            <span className="entity-tag-badge">TARGET IDENTIFIED</span>
            <div className="entity-profile-id">{identifier}</div>
          </div>
          <div className="entity-profile-stats">
            <div className="ep-stat">
              <span className="ep-key">Detections</span>
              <span className="ep-val">{movement.length}</span>
            </div>
            <div className="ep-stat">
              <span className="ep-key">First Sighting</span>
              <span className="ep-val">{firstSeen?.toLocaleTimeString()}</span>
            </div>
            <div className="ep-stat">
              <span className="ep-key">Latest Sighting</span>
              <span className="ep-val">{lastSeen?.toLocaleTimeString()}</span>
            </div>
            <div className="ep-stat">
              <span className="ep-key">Unique Sensors</span>
              <span className="ep-val">{new Set(movement.map(m => m.camera_code)).size}</span>
            </div>
          </div>
        </div>
      )}

      <div className="two-col">
        {/* Movement timeline */}
        <section className="card" aria-labelledby="timeline-heading">
          <div className="section-header">
            <h2 id="timeline-heading" className="section-title">
              Chronological Path {identifier ? `— ${identifier}` : ''}
            </h2>
            {movement.length > 0 && (
              <span className="section-count">{movement.length} waypoints</span>
            )}
          </div>

          {loading && <LoadingState label="Reconstructing spatial path from sensor telemetry…" />}
          {error && <ErrorState label={error} onRetry={() => doSearch(search)} />}
          {!loading && !error && movement.length === 0 && (
            <EmptyState
              icon="🔍"
              label={`No sightings recorded for entity "${identifier || search}".`}
              action="Try Sample Target (GJ01XX0001)"
              onAction={() => { setSearch('GJ01XX0001'); doSearch('GJ01XX0001'); }}
            />
          )}

          {!loading && movement.length > 0 && (
            <ol className="movement-timeline" aria-label="Movement timeline">
              {movement.map((m, i) => (
                <li key={`${m.camera_id}-${m.timestamp}-${i}`} className="movement-step">
                  <div className="movement-step-dot" aria-hidden="true">{i + 1}</div>
                  <div className="movement-step-body">
                    <div className="movement-step-header">
                      <span className="movement-cam-code">{m.camera_code}</span>
                      <span className="movement-cam-name">{m.camera_name}</span>
                      <span className="movement-conf">{Math.round(m.confidence * 100)}% match</span>
                    </div>
                    <div className="movement-step-meta">
                      <time dateTime={m.timestamp} className="font-mono">
                        {new Date(m.timestamp).toLocaleString()}
                      </time>
                      <span className="movement-coords font-mono">
                        GPS: {m.latitude.toFixed(5)}, {m.longitude.toFixed(5)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Route map */}
        <section className="card" aria-labelledby="route-map-heading">
          <div className="section-header">
            <h2 id="route-map-heading" className="section-title">Spatial Route Trajectory</h2>
            {movement.length > 1 && (
              <span className="section-count">Connected Vector Path</span>
            )}
          </div>
          <MapView cameras={cameras} movement={movement} />
        </section>
      </div>
    </div>
  );
}

// ─── Watchlist Page ───────────────────────────────────────────────────────────
function WatchlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [id, setId] = useState('');
  const [category, setCategory] = useState('blacklisted');
  const [desc, setDesc] = useState('');
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setItems(await api.watchlist());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = id.trim().toUpperCase();
    if (!cleanId) return;

    setMsg('');
    setIsError(false);
    setSubmitting(true);
    try {
      await api.createWatchlist({
        entity_type: 'vehicle',
        identifier: cleanId,
        category,
        status: 'ACTIVE',
        description: desc || 'Manual security watchlist entry'
      });
      await load();
      setMsg(`Target "${cleanId}" successfully added to ${category} watchlist.`);
      setId('');
      setDesc('');
    } catch (err) {
      setIsError(true);
      setMsg(err instanceof Error ? err.message : 'Failed to add watchlist record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Watchlist &amp; Hotlist Management</h1>
          <p className="page-desc">Maintain blacklists, wanted vehicle registries, and automatic alarm triggers.</p>
        </div>
      </div>

      <div className="two-col">
        {/* Add watchlist record */}
        <section className="card" aria-labelledby="add-watchlist-heading">
          <div className="section-header">
            <h2 id="add-watchlist-heading" className="section-title">Enroll Hotlist Target</h2>
          </div>
          <form className="form" onSubmit={handleAdd} aria-label="Add watchlist entry">
            <div className="form-field">
              <label htmlFor="wl-id" className="form-label">Vehicle Registration / Identifier</label>
              <input
                id="wl-id"
                className="input font-mono"
                value={id}
                onChange={e => setId(e.target.value.toUpperCase())}
                placeholder="e.g. GJ01XX9999"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="wl-cat" className="form-label">Alarm Classification</label>
              <select
                id="wl-cat"
                className="input select"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="blacklisted">Blacklisted (General Alert)</option>
                <option value="wanted">Wanted (Critical Alert)</option>
                <option value="stolen">Stolen Vehicle (Critical Alert)</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="wl-desc" className="form-label">Reason / Case Reference</label>
              <input
                id="wl-desc"
                className="input"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="e.g. Case #2026-481 - Intercept vehicle"
              />
            </div>

            {msg && (
              <div className={isError ? 'form-error' : 'form-success'} role="status">
                {isError ? `⚠ ${msg}` : `✓ ${msg}`}
              </div>
            )}

            <button className="btn primary" disabled={submitting || !id.trim()} type="submit">
              {submitting ? 'Registering Target…' : 'Enroll Target'}
            </button>
          </form>
        </section>

        {/* Watchlist table */}
        <section className="card" aria-labelledby="watchlist-table-heading">
          <div className="section-header">
            <h2 id="watchlist-table-heading" className="section-title">Active Hotlist Records</h2>
            <span className="section-count">{items.length} records</span>
          </div>
          {loading ? (
            <LoadingState label="Loading hotlist records…" />
          ) : items.length === 0 ? (
            <EmptyState icon="📋" label="No active watchlist records enrolled" />
          ) : (
            <div className="table-wrapper">
              <table className="table" aria-label="Watchlist entries">
                <thead>
                  <tr>
                    <th scope="col">Identifier</th>
                    <th scope="col">Classification</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(i => (
                    <tr key={i.id}>
                      <td>
                        <span className="entity-id font-mono">{i.identifier}</span>
                        {i.description && (
                          <div className="table-sub-desc">{i.description}</div>
                        )}
                      </td>
                      <td>
                        <span className={`category-tag ${i.category}`}>
                          {i.category.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${i.status.toLowerCase()}`}>
                          {i.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Events Page ──────────────────────────────────────────────────────────────
function EventsPage({
  events,
  onInvestigate,
}: {
  events: Event[];
  onInvestigate: (identifier: string) => void;
}) {
  const [filter, setFilter] = useState('');

  const filteredEvents = events.filter(e => {
    if (!filter.trim()) return true;
    const term = filter.trim().toUpperCase();
    const entity = (e.entity_identifier || e.vehicle_number || '').toUpperCase();
    const camCode = (e.camera_code || '').toUpperCase();
    const camName = (e.camera_name || '').toUpperCase();
    return entity.includes(term) || camCode.includes(term) || camName.includes(term) || e.event_type.toUpperCase().includes(term);
  });

  return (
    <div className="page-content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Detection Audit Log</h1>
          <p className="page-desc">Comprehensive chronological log of AI ANPR detections across all camera streams.</p>
        </div>

        <div className="table-filter-wrap">
          <input
            className="input small font-mono"
            placeholder="Filter by plate, camera, or sensor…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            aria-label="Filter events"
          />
          {filter && (
            <button
              className="clear-search-btn"
              onClick={() => setFilter('')}
              aria-label="Clear filter"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <section className="card">
        <div className="section-header">
          <h2 className="section-title">Detection Events</h2>
          <span className="section-count">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
          </span>
        </div>
        <EventsTable events={filteredEvents} onInvestigate={onInvestigate} />
      </section>
    </div>
  );
}

// ─── App Root ────────────────────────────────────────────────────────────────
function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<CameraStats | undefined>();
  const [investigateId, setInvestigateId] = useState('GJ01XX0001');
  const [toast, setToast] = useState('');
  const [toastTarget, setToastTarget] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [newAlertIds, setNewAlertIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [c, s, a, e, u] = await Promise.all([
        api.cameras(),
        api.stats(),
        api.alerts(),
        api.events(),
        api.me().catch(() => null),
      ]);
      setCameras(c);
      setStats(s);
      setAlerts(a);
      setEvents(e);
      if (u) setUser(u as User);
    } catch (err) {
      const msg = String(err);
      if (msg.includes('Authentication') || msg.includes('401')) {
        localStorage.removeItem(tokenKey);
        setAuthed(false);
      } else {
        setLoadError('Failed to synchronize operations telemetry with backend.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket setup
  useEffect(() => {
    if (!authed) return;
    void load();

    const connect = () => {
      const ws = new WebSocket(websocketUrl());
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        // Auto-reconnect after 3s
        setTimeout(() => { if (wsRef.current === ws) connect(); }, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (m) => {
        try {
          const msg = JSON.parse(m.data);
          if (msg.type === 'alert.created') {
            setAlerts(x => [msg.data, ...x]);
            setNewAlertIds(s => new Set([...s, msg.data.id]));
            const targetId = msg.data.vehicle_number || null;
            setToastTarget(targetId);
            setToast(`🚨 CRITICAL ALARM: ${targetId || 'Target'} detected at ${msg.data.camera_code || 'sensor'}`);
            setTimeout(() => setNewAlertIds(s => { const n = new Set(s); n.delete(msg.data.id); return n; }), 5000);
          } else if (msg.type === 'alert.updated') {
            setAlerts(x => x.map(a => a.id === msg.data.id ? { ...a, status: msg.data.status } : a));
          } else if (msg.type === 'detection.created') {
            setEvents(x => [msg.data, ...x]);
          } else if (msg.type === 'camera.status.changed') {
            setCameras(x => x.map(c => c.id === msg.data.id ? { ...c, status: msg.data.status } : c));
          }
        } catch {
          // ignore malformed ws messages
        }
      };
    };

    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [authed]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => {
      setToast('');
      setToastTarget(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  const openAlerts = alerts.filter(a => a.status === 'OPEN');

  const ack = async (id: number) => {
    try {
      await api.ack(id);
      setAlerts(x => x.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a));
    } catch {
      // ignore
    }
  };

  const resolve = async (id: number) => {
    try {
      await api.resolve(id);
      setAlerts(x => x.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a));
    } catch {
      // ignore
    }
  };

  const goInvestigate = (identifier: string) => {
    setInvestigateId(identifier);
    setPage('investigate');
    setMobileOpen(false);
  };

  return (
    <div className="app">
      <Topbar
        wsConnected={wsConnected}
        openAlertCount={openAlerts.length}
        user={user}
        onLogout={() => {
          localStorage.removeItem(tokenKey);
          setAuthed(false);
        }}
        onToggleMobileMenu={() => setMobileOpen(!mobileOpen)}
      />

      <div className="shell">
        <Sidebar
          page={page}
          onNavigate={(p) => {
            setPage(p);
            setMobileOpen(false);
          }}
          stats={stats}
          openAlertCount={openAlerts.length}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <main className="main" id="main-content" role="main">
          {page === 'dashboard' && (
            <Dashboard
              cameras={cameras}
              stats={stats}
              alerts={alerts}
              events={events}
              openAlerts={openAlerts}
              newAlertIds={newAlertIds}
              onAck={ack}
              onResolve={resolve}
              onInvestigate={goInvestigate}
              loading={loading}
              loadError={loadError}
              onReload={load}
            />
          )}
          {page === 'cameras' && <CamerasPage cameras={cameras} onReload={load} />}
          {page === 'investigate' && (
            <InvestigatePage initialIdentifier={investigateId} cameras={cameras} />
          )}
          {page === 'watchlist' && <WatchlistPage />}
          {page === 'events' && (
            <EventsPage events={events} onInvestigate={goInvestigate} />
          )}
        </main>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="toast" role="alert" aria-live="assertive">
          <div className="toast-header-row">
            <span className="toast-title">Live Alarm Broadcast</span>
            <button
              className="toast-close"
              onClick={() => {
                setToast('');
                setToastTarget(null);
              }}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
          <div className="toast-body">{toast}</div>
          {toastTarget && (
            <button
              className="btn small trace-btn toast-action"
              onClick={() => {
                goInvestigate(toastTarget);
                setToast('');
                setToastTarget(null);
              }}
            >
              Trace Route Map →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
