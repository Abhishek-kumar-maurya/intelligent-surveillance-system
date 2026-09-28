import React from 'react';

/** Spinning ring for loading states */
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="spinner"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Loading"
    >
      <circle cx="10" cy="10" r="8" stroke="#1e3d5e" strokeWidth="2.5" />
      <path d="M10 2a8 8 0 0 1 8 8" stroke="#38a8ff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Full-section loading state */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state-box">
      <Spinner size={28} />
      <span className="state-label">{label}</span>
    </div>
  );
}

/** Empty state with optional action */
export function EmptyState({
  icon = '—',
  label,
  action,
  onAction,
}: {
  icon?: string;
  label: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="state-box empty">
      <div className="state-icon">{icon}</div>
      <span className="state-label">{label}</span>
      {action && onAction && (
        <button className="btn small" onClick={onAction}>{action}</button>
      )}
    </div>
  );
}

/** Error state with retry */
export function ErrorState({
  label = 'Failed to load data',
  onRetry,
}: {
  label?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-box error-state">
      <div className="state-icon">⚠</div>
      <span className="state-label">{label}</span>
      {onRetry && (
        <button className="btn small danger" onClick={onRetry}>Retry</button>
      )}
    </div>
  );
}

/** Status badge for camera/alert status */
export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>;
}

/** Severity chip for alerts */
export function SeverityChip({ severity }: { severity: string }) {
  return <span className={`severity-chip ${severity?.toLowerCase() || 'medium'}`}>{severity || 'MEDIUM'}</span>;
}

/** Formatted relative timestamp */
export function RelativeTime({ iso }: { iso: string }) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  let label: string;
  if (sec < 60) label = `${sec}s ago`;
  else if (min < 60) label = `${min}m ago`;
  else if (hr < 24) label = `${hr}h ago`;
  else label = d.toLocaleDateString();
  return (
    <time dateTime={iso} title={d.toLocaleString()} className="rel-time">
      {label}
    </time>
  );
}

/** Confidence bar */
export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const cls = pct >= 90 ? 'high' : pct >= 70 ? 'medium' : 'low';
  return (
    <div className="conf-bar" title={`${pct}% confidence`}>
      <div className={`conf-fill ${cls}`} style={{ width: `${pct}%` }} />
      <span className="conf-label">{pct}%</span>
    </div>
  );
}

export default {};
