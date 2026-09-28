import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera, Movement, Alert } from '../types';

interface Props {
  cameras: Camera[];
  movement?: Movement[];
  activeAlertCameraIds?: Set<number>;
}

const statusColor = (status: string) =>
  status === 'ONLINE' ? '#19c37d' : status === 'DEGRADED' ? '#f5b942' : '#ff5c6c';

export default function MapView({ cameras, movement = [], activeAlertCameraIds }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([23.04, 72.56], 11);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update markers/polylines whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(l => l.remove());
    markersRef.current = [];

    cameras.forEach(c => {
      const hasAlert = activeAlertCameraIds?.has(c.id);
      const color = statusColor(c.status);
      const ringColor = hasAlert ? '#ff5c6c' : `${color}33`;
      const ringSize = hasAlert ? '8px' : '5px';

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:14px;height:14px;border-radius:50%;
          background:${color};border:2.5px solid white;
          box-shadow:0 0 0 ${ringSize} ${ringColor};
          ${hasAlert ? 'animation:pulse-ring 1.4s ease-out infinite;' : ''}
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const heartbeat = c.last_heartbeat
        ? `<div style="font-size:10px;color:#8fa5bf;margin-top:4px">Last seen: ${new Date(c.last_heartbeat).toLocaleTimeString()}</div>`
        : '';

      const popup = `
        <div style="font-family:Inter,sans-serif;min-width:160px;line-height:1.4">
          <div style="font-weight:700;font-size:13px">${c.camera_code}</div>
          <div style="color:#8fa5bf;font-size:11px;margin-top:2px">${c.name}</div>
          <div style="margin-top:6px;font-size:11px">
            <span style="
              padding:2px 7px;border-radius:999px;
              background:${color}22;color:${color};
              border:1px solid ${color}55;font-size:10px
            ">● ${c.status}</span>
          </div>
          ${heartbeat}
          <div style="margin-top:8px;font-size:11px;color:#7890aa">${c.zone} · ${c.department}</div>
          ${hasAlert ? '<div style="margin-top:6px;font-size:10px;color:#ff7785;font-weight:600">⚠ ACTIVE ALERT</div>' : ''}
        </div>
      `;

      const m = L.marker([c.latitude, c.longitude], { icon })
        .addTo(map)
        .bindPopup(popup, { maxWidth: 220 });
      markersRef.current.push(m);
    });

    // Movement route
    if (movement.length > 1) {
      const latlngs = movement.map(p => [p.latitude, p.longitude] as [number, number]);

      // Draw dashed line
      const line = L.polyline(latlngs, {
        color: '#38a8ff',
        weight: 3,
        opacity: 0.85,
        dashArray: '6 4',
      }).addTo(map);
      markersRef.current.push(line);

      // Waypoints
      latlngs.forEach((p, i) => {
        const m = movement[i];
        const cm = L.circleMarker(p, {
          radius: 6,
          color: '#fff',
          fillColor: '#38a8ff',
          fillOpacity: 1,
          weight: 2,
        })
          .addTo(map)
          .bindTooltip(
            `<b>${i + 1}. ${m.camera_code}</b><br>${m.camera_name}<br>${new Date(m.timestamp).toLocaleTimeString()}`,
            { permanent: false }
          );
        markersRef.current.push(cm);
      });

      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    }
  }, [cameras, movement, activeAlertCameraIds]);

  return <div ref={containerRef} className="map-view" aria-label="GIS Camera Map" />;
}
