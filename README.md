# okDriver CCTV Intelligence Platform

A working prototype for the okDriver full-stack hiring assignment: camera registry, live/near-live video integration, AI event ingestion, watchlist correlation, real-time alerts, entity movement history, GIS visualization, authentication/RBAC, audit logs, and a scalable architecture.

## Stack
- Frontend: React + TypeScript + Vite, Tailwind CSS, Leaflet
- Backend: FastAPI + SQLAlchemy + Pydantic + Alembic
- Database: PostgreSQL + PostGIS in production; SQLite is supported for local verification
- Real-time: Redis Streams + WebSocket
- Video: MediaMTX (RTSP -> WebRTC/HLS)
- AI: pluggable Python analytics worker; deterministic simulator included
- Evidence: MinIO/S3-compatible object storage
- Deployment: Docker Compose

## Quick start without Docker
Requirements: Python 3.11+, Node 20+, npm.

### Backend
```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/macOS
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

The backend uses SQLite by default so the project can be verified without infrastructure. For the intended deployment, set `DATABASE_URL` to PostgreSQL.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

Demo credentials:
- admin@example.com / Admin@123
- operator@example.com / Operator@123

## Docker deployment
```bash
docker compose up --build
```
Services: frontend, API, worker, PostgreSQL/PostGIS, Redis, MediaMTX and MinIO.

## End-to-end demo
1. Log in as admin.
2. View seeded cameras on the dashboard/map.
3. Open a camera and use the HLS/WebRTC stream URL if MediaMTX is running.
4. Generate a simulated ANPR event from the simulator.
5. The backend validates and persists the event.
6. The watchlist service matches the synthetic plate `GJ01XX0001`.
7. An alert is created and pushed over WebSocket without refreshing the page.
8. Search `GJ01XX0001` to view its chronological camera history and route.

## Production notes
The prototype deliberately separates the media plane from the intelligence/data plane. MediaMTX handles stream protocols while FastAPI handles metadata, events, correlation, alerts and operator APIs. Redis Streams provides ordered event delivery and consumer groups; PostgreSQL/PostGIS provides relational and GIS-ready persistence.

See `docs/architecture.md`, `docs/scalability.md`, `docs/api.md`, and `docs/verification.md`.
