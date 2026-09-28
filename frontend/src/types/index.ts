export type Camera = {
  id: number;
  camera_code: string;
  name: string;
  department: string;
  latitude: number;
  longitude: number;
  camera_type: string;
  source_protocol: string;
  stream_reference: string;
  status: string;
  zone: string;
  last_heartbeat: string | null;
  enabled: boolean;
};

export type Alert = {
  id: number;
  detection_event_id: number;
  watchlist_entry_id: number;
  severity: string;
  status: string;
  message: string;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  camera_code?: string;
  camera_name?: string;
  vehicle_number?: string;
  latitude?: number;
  longitude?: number;
  confidence?: number;
};

export type Event = {
  id: number;
  event_id: string;
  camera_id: number;
  camera_code?: string | null;
  camera_name?: string | null;
  event_type: string;
  vehicle_number: string | null;
  entity_identifier: string | null;
  confidence: number;
  latitude: number;
  longitude: number;
  timestamp: string;
};

export type User = {
  id: number;
  email: string;
  role: string;
};

export type Movement = {
  camera_id: number;
  camera_code: string;
  camera_name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  confidence: number;
};

export type CameraStats = {
  total: number;
  online: number;
  degraded: number;
  offline: number;
};
