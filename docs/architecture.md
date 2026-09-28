# Architecture

## Media plane
Camera/recorded/simulator sources publish RTSP into MediaMTX. MediaMTX exposes browser-compatible WebRTC and HLS endpoints and can later be replaced/extended with ONVIF/vendor adapters.

## Intelligence/data plane
FastAPI owns camera registry, authentication, validation, event persistence, watchlist matching, alerts, audit logs and WebSocket notifications. Redis Streams is the scale-out event boundary. PostgreSQL/PostGIS stores relational and GIS-ready data. MinIO/S3 stores evidence snapshots/clips.

## End-to-end flow
Camera -> MediaMTX -> Analytics worker/simulator -> detection event -> validation/deduplication -> database -> watchlist correlation -> alert -> WebSocket -> React operator console -> investigation/map.

## Production evolution
Prototype: one API + one DB + one Redis + one MediaMTX.
Large deployment: edge gateways -> regional media/AI clusters -> durable event streaming -> horizontally scaled API/event processors -> PostgreSQL/PostGIS cluster + object storage.
