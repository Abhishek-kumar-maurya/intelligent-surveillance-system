# Scalability and production thinking

- Edge processing reduces raw video bandwidth by extracting metadata/events close to cameras.
- Regional media gateways terminate many camera connections and relay only required streams.
- AI workers scale horizontally by camera/region and GPU pool.
- Redis Streams is appropriate for the prototype/moderate workload; Kafka or a managed streaming platform is a later migration when retention, partitioning and cross-region throughput justify it.
- PostgreSQL indexes camera/time/entity fields. PostGIS can add a geometry column and GiST index for spatial queries.
- Object storage uses hot/warm/cold lifecycle policies for evidence and recordings.
- Load balancers distribute API/WebSocket traffic; WebSocket fan-out should use shared event infrastructure.
- Prometheus/Grafana/OpenTelemetry provide operational visibility.
- Backups, multi-AZ database replicas, object-storage versioning and disaster-recovery runbooks are required for production.
- Network segmentation separates camera networks, media gateways, application services and operator access.
