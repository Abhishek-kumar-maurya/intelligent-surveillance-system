# Verification checklist

1. Python syntax compile (`compileall`).
2. Backend tests with an isolated SQLite database.
3. Frontend TypeScript compile and Vite production build.
4. API smoke test: seed -> login -> camera list -> watchlist -> event ingest -> alert -> movement.
5. Duplicate event test: same event_id must not create another detection/alert.
6. Authentication/RBAC test: operator cannot create cameras/watchlist entries.
7. Docker configuration is included for PostgreSQL/PostGIS, Redis, MediaMTX and MinIO. Docker was not available in the build environment, so container startup cannot be executed here; all application code is independently verified without Docker.
