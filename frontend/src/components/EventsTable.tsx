import React from 'react';
import { Event } from '../types';
import { EmptyState } from './common';

export function EventsTable({
  events,
  onInvestigate,
}: {
  events: Event[];
  onInvestigate?: (identifier: string) => void;
}) {
  if (!events.length) {
    return <EmptyState icon="📋" label="No events recorded" />;
  }

  return (
    <div className="table-wrapper" role="region" aria-label="Detection events">
      <table className="table" aria-label="Detection events table">
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Type</th>
            <th scope="col">Entity</th>
            <th scope="col">Camera</th>
            <th scope="col">Confidence</th>
            {onInvestigate && <th scope="col">Action</th>}
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const entity = e.entity_identifier || e.vehicle_number || '';
            const camCode = e.camera_code || (e.camera_id != null ? `C${String(e.camera_id).padStart(3, '0')}` : '—');
            const camName = e.camera_name;
            const confidence = Math.round(e.confidence * 100);
            const confCls = confidence >= 90 ? 'conf-high' : confidence >= 70 ? 'conf-med' : 'conf-low';

            return (
              <tr key={e.id} className="event-row">
                <td className="event-time" title={new Date(e.timestamp).toLocaleString()}>
                  {new Date(e.timestamp).toLocaleTimeString()}
                </td>
                <td>
                  <span className="event-type-tag">{e.event_type}</span>
                </td>
                <td className="entity-col">
                  {entity ? (
                    <span className="entity-id">{entity}</span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="cam-col">
                  <span className="cam-code-tag">{camCode}</span>
                  {camName && <span className="cam-subname">{camName}</span>}
                </td>
                <td>
                  <span className={`conf-tag ${confCls}`}>{confidence}%</span>
                </td>
                {onInvestigate && (
                  <td>
                    {entity ? (
                      <button
                        className="btn small trace-btn"
                        onClick={() => onInvestigate(entity)}
                        aria-label={`Trace ${entity}`}
                      >
                        Trace
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

