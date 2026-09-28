const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const MEDIA_BASE_URL = (import.meta.env.VITE_MEDIA_BASE_URL || 'http://localhost:8889').replace(/\/$/, '');

export const tokenKey = 'okdriver_token';
export function getToken() { return localStorage.getItem(tokenKey) || ''; }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.status === 204 ? undefined as T : res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),
  cameras: () => request<any[]>('/cameras'),
  stats: () => request<any>('/stats/cameras'),
  alerts: (status?: string) => request<any[]>(status ? `/alerts?status=${status}` : '/alerts'),
  events: (identifier?: string) =>
    request<any[]>(identifier ? `/events?identifier=${encodeURIComponent(identifier)}` : '/events'),
  movement: (identifier: string) =>
    request<any[]>(`/entities/${encodeURIComponent(identifier)}/movement`),
  watchlist: () => request<any[]>('/watchlist'),
  ack: (id: number) => request(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
  resolve: (id: number) => request(`/alerts/${id}/resolve`, { method: 'PATCH' }),
  ingest: (payload: any) => request('/events/ingest', { method: 'POST', body: JSON.stringify(payload) }),
  createCamera: (payload: any) => request('/cameras', { method: 'POST', body: JSON.stringify(payload) }),
  createWatchlist: (payload: any) => request('/watchlist', { method: 'POST', body: JSON.stringify(payload) }),
  health: () => request<{ status: string; service: string }>('/health'),
};

export const websocketUrl = () => {
  const base = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000').replace(/\/$/, '');
  return `${base}/api/v1/ws/operations?token=${encodeURIComponent(getToken())}`;
};
