import React from 'react';
import { CameraStats, User } from '../types';

type Page = 'dashboard' | 'cameras' | 'investigate' | 'watchlist' | 'events';

interface SidebarProps {
  page: Page;
  onNavigate: (page: Page) => void;
  stats?: CameraStats;
  openAlertCount: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      {
        id: 'dashboard' as Page,
        label: 'Dashboard',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        id: 'investigate' as Page,
        label: 'Entity Investigation',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        ),
      },
      {
        id: 'watchlist' as Page,
        label: 'Watchlist',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
        ),
      },
      {
        id: 'events' as Page,
        label: 'Event History',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      {
        id: 'cameras' as Page,
        label: 'Camera Registry',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        ),
      },
    ],
  },
];

export function Sidebar({ page, onNavigate, stats, openAlertCount, mobileOpen, onCloseMobile }: SidebarProps) {
  const handleItemClick = (id: Page) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`} role="navigation" aria-label="Main navigation">
        {/* Mobile close button */}
        <div className="sidebar-mobile-header">
          <span className="sidebar-mobile-title">Navigation</span>
          <button
            className="mobile-close-btn"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        {/* System status panel */}
        {stats && (
          <div className="sidebar-status" aria-label="System status">
            <div className="sidebar-status-row">
              <span className="ss-label">Cameras</span>
              <span className="ss-val">
                <span className="ss-online">{stats.online}</span>
                <span className="ss-sep">/</span>
                <span>{stats.total}</span>
              </span>
            </div>
            {stats.degraded > 0 && (
              <div className="sidebar-status-row warn">
                <span className="ss-label">Degraded</span>
                <span className="ss-val warn">{stats.degraded}</span>
              </div>
            )}
            {stats.offline > 0 && (
              <div className="sidebar-status-row crit">
                <span className="ss-label">Offline</span>
                <span className="ss-val crit">{stats.offline}</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation groups */}
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="nav-group">
            <div className="nav-group-label">{group.label}</div>
            <nav className="nav" role="list">
              {group.items.map(item => (
                <button
                  key={item.id}
                  role="listitem"
                  className={`nav-item${page === item.id ? ' active' : ''}`}
                  onClick={() => handleItemClick(item.id)}
                  aria-current={page === item.id ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.id === 'dashboard' && openAlertCount > 0 && (
                    <span className="nav-badge" aria-label={`${openAlertCount} open alerts`}>
                      {openAlertCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="sidebar-build-info">
            <span className="system-indicator"></span>
            <span>Surveillance Engine v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}

interface TopbarProps {
  wsConnected: boolean;
  openAlertCount: number;
  user?: User | null;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
}

export function Topbar({ wsConnected, openAlertCount, user, onLogout, onToggleMobileMenu }: TopbarProps) {
  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <button
          className="mobile-hamburger"
          onClick={onToggleMobileMenu}
          aria-label="Open navigation menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="brand" aria-label="okDriver Intelligence Console">
          <div className="brandmark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </div>
          <div>
            <span className="brand-name">okDriver</span>
            <span className="brand-sub">INTELLIGENCE</span>
          </div>
        </div>
      </div>

      <div className="topbar-status" role="status" aria-label="System status">
        <span className={`status-pill ${wsConnected ? 'online' : 'offline'}`}>
          <span className="pulse-dot" aria-hidden="true" />
          {wsConnected ? 'LIVE FEED' : 'RECONNECTING'}
        </span>
        {openAlertCount > 0 && (
          <span className="status-pill critical" aria-label={`${openAlertCount} open alerts`}>
            ⚠ {openAlertCount} ALERT{openAlertCount > 1 ? 'S' : ''}
          </span>
        )}
      </div>

      <div className="topbar-actions">
        {user && (
          <div className="user-profile-badge" title={`Signed in as ${user.email}`}>
            <span className="user-role-tag">{user.role}</span>
            <span className="user-email">{user.email}</span>
          </div>
        )}
        <button
          className="btn small logout-btn"
          onClick={onLogout}
          aria-label="Logout"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Exit</span>
        </button>
      </div>
    </header>
  );
}

