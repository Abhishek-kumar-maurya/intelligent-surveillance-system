import React from 'react';
import { Alert } from '../types';
import { SeverityChip, RelativeTime, EmptyState } from './common';

interface AlertItemProps {
  alert: Alert;
  onAck: (id: number) => void;
  onResolve: (id: number) => void;
  onInvestigate?: (identifier: string) => void;
  isNew?: boolean;
}

export function AlertItem({ alert: a, onAck, onResolve, onInvestigate, isNew }: AlertItemProps) {
  const statusCls =
    a.status === 'ACKNOWLEDGED' ? 'ack' :
    a.status === 'RESOLVED' ? 'resolved' : 'open';

  const entity = a.vehicle_number;

  return (
    <article
      className={`alert-item ${statusCls}${isNew ? ' alert-new' : ''}`}
      aria-label={`Alert: ${a.message}`}
    >
      <div className="alert-header">
        <SeverityChip severity={a.severity} />
        <span className={`alert-status-label status-label-${statusCls}`}>{a.status}</span>
      </div>

      <div className="alert-body">
        <div className="alert-message">{a.message}</div>
        <div className="alert-detail-grid">
          {entity && (
            <div className="alert-detail-item">
              <span className="detail-key">Entity</span>
              <span className="detail-val entity-id">{entity}</span>
            </div>
          )}
          {a.camera_code && (
            <div className="alert-detail-item">
              <span className="detail-key">Camera</span>
              <span className="detail-val">{a.camera_code}</span>
            </div>
          )}
          {a.camera_name && (
            <div className="alert-detail-item">
              <span className="detail-key">Location</span>
              <span className="detail-val">{a.camera_name}</span>
            </div>
          )}
          {a.confidence != null && (
            <div className="alert-detail-item">
              <span className="detail-key">Confidence</span>
              <span className="detail-val conf-val">{Math.round(a.confidence * 100)}%</span>
            </div>
          )}
        </div>
        <div className="alert-footer">
          <RelativeTime iso={a.created_at} />
          <div className="alert-actions">
            {entity && onInvestigate && (
              <button
                className="btn small trace-btn"
                onClick={() => onInvestigate(entity)}
                aria-label={`Trace route for ${entity}`}
              >
                Track Route
              </button>
            )}
            {a.status === 'OPEN' && (
              <button
                className="btn small"
                onClick={() => onAck(a.id)}
                aria-label="Acknowledge alert"
              >
                Ack
              </button>
            )}
            {a.status !== 'RESOLVED' && (
              <button
                className="btn small"
                onClick={() => onResolve(a.id)}
                aria-label="Resolve alert"
              >
                Resolve
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

interface AlertPanelProps {
  alerts: Alert[];
  onAck: (id: number) => void;
  onResolve: (id: number) => void;
  onInvestigate?: (identifier: string) => void;
  newAlertIds?: Set<number>;
  maxVisible?: number;
}

export function AlertPanel({ alerts, onAck, onResolve, onInvestigate, newAlertIds, maxVisible }: AlertPanelProps) {
  const visible = maxVisible ? alerts.slice(0, maxVisible) : alerts;

  if (!alerts.length) {
    return <EmptyState icon="✓" label="No active alerts" />;
  }

  return (
    <div className="alert-panel" role="list" aria-label="Alerts">
      {visible.map(a => (
        <div key={a.id} role="listitem">
          <AlertItem
            alert={a}
            onAck={onAck}
            onResolve={onResolve}
            onInvestigate={onInvestigate}
            isNew={newAlertIds?.has(a.id)}
          />
        </div>
      ))}
      {maxVisible && alerts.length > maxVisible && (
        <div className="alert-overflow-note">
          +{alerts.length - maxVisible} more alerts
        </div>
      )}
    </div>
  );
}

