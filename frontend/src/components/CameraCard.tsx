import React, { useState } from 'react';
import { MEDIA_BASE_URL } from '../lib/api';
import { Camera } from '../types';
import { StatusBadge, RelativeTime, EmptyState } from './common';

interface Props {
  camera: Camera;
  onInvestigate?: (cam: Camera) => void;
}

export function CameraCard({ camera: c, onInvestigate }: Props) {
  const [vidError, setVidError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const streamUrl = `${MEDIA_BASE_URL}/${c.stream_reference}`;
  const isOnline = c.status === 'ONLINE';

  return (
    <article className={`cam-card ${c.status.toLowerCase()}`} aria-label={`Camera ${c.camera_code}`}>
      {/* Video / Offline area */}
      <div className="cam-video-wrapper">
        {isOnline && !vidError ? (
          <>
            <div className="live-badge" aria-label="Live">
              <span className="live-dot" aria-hidden="true" />
              LIVE
            </div>
            <iframe
              key={c.stream_reference}
              title={`${c.name} live feed`}
              src={streamUrl}
              allow="autoplay; fullscreen"
              loading="lazy"
              onError={() => setVidError(true)}
              className="cam-iframe"
            />
          </>
        ) : (
          <div className="cam-offline-overlay" role="img" aria-label="Feed offline">
            <span className="cam-offline-icon" aria-hidden="true">⬛</span>
            <span>{vidError ? 'Stream unavailable' : 'Feed offline'}</span>
            {vidError && (
              <button
                className="btn small"
                onClick={() => setVidError(false)}
                aria-label="Retry stream"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Camera metadata */}
      <div className="cam-meta">
        <div className="cam-meta-row">
          <span className="cam-code" aria-label="Camera code">{c.camera_code}</span>
          <StatusBadge status={c.status} />
        </div>
        <div className="cam-name" title={c.name}>{c.name}</div>
        <div className="cam-detail-row">
          <span className="cam-zone" aria-label="Zone">{c.zone}</span>
          {c.last_heartbeat && (
            <RelativeTime iso={c.last_heartbeat} />
          )}
        </div>
        {/* Actions */}
        <div className="cam-actions">
          {onInvestigate && (
            <button
              className="btn small"
              onClick={() => onInvestigate(c)}
              aria-label={`Investigate events for ${c.name}`}
            >
              Events
            </button>
          )}
          {isOnline && !vidError && (
            <button
              className="btn small"
              onClick={() => setFullscreen(true)}
              aria-label={`Fullscreen ${c.name}`}
            >
              ⛶ Expand
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div
          className="fullscreen-overlay"
          role="dialog"
          aria-label={`${c.name} fullscreen`}
          onClick={() => setFullscreen(false)}
        >
          <div className="fullscreen-inner" onClick={e => e.stopPropagation()}>
            <div className="fullscreen-header">
              <span>{c.camera_code} — {c.name}</span>
              <button
                className="btn small danger"
                onClick={() => setFullscreen(false)}
                aria-label="Close fullscreen"
              >
                ✕ Close
              </button>
            </div>
            <iframe
              title={`${c.name} fullscreen`}
              src={streamUrl}
              allow="autoplay; fullscreen"
              className="fullscreen-iframe"
            />
          </div>
        </div>
      )}
    </article>
  );
}

export function CameraGrid({
  cameras,
  onInvestigate,
}: {
  cameras: Camera[];
  onInvestigate?: (cam: Camera) => void;
}) {
  if (!cameras.length) {
    return <EmptyState icon="📷" label="No cameras registered" />;
  }
  return (
    <div className="camera-grid" role="list" aria-label="Camera grid">
      {cameras.map(c => (
        <div key={c.id} role="listitem">
          <CameraCard camera={c} onInvestigate={onInvestigate} />
        </div>
      ))}
    </div>
  );
}
