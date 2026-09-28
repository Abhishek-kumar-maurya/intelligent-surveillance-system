# API surface

Base path: `/api/v1`

- POST `/auth/login`
- GET `/auth/me`
- GET/POST `/cameras`
- PATCH `/cameras/{id}/status`
- POST `/cameras/{id}/heartbeat`
- GET `/stats/cameras`
- GET/POST `/watchlist`
- POST `/events/ingest`
- GET `/events`
- GET `/alerts`
- PATCH `/alerts/{id}/acknowledge`
- PATCH `/alerts/{id}/resolve`
- GET `/entities/{identifier}/movement`
- WebSocket `/ws/operations?token=<JWT>`

OpenAPI/Swagger is served by FastAPI at `/docs`.
