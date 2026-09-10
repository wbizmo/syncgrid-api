# Changelog

All notable changes to SyncGrid API are documented here. This project follows Semantic Versioning.

## [1.0.1] - 2026-09-10

### Security
- Upgraded Fastify to the patched 5.12.x line.
- Refreshed vulnerable Prisma/mysql2 transitive dependencies.
- Hardened API-key rate limiting so authentication happens before counting, Redis counters are atomic, and the local fallback remains bounded.
- Excluded provider credential configuration from routine read queries.
- Replaced predictable default payment and email identifiers with cryptographic UUID-backed identifiers.
- Removed arbitrary queued integration payload contents from routine worker logs while retaining operational identifiers.

### Performance
- Removed unnecessary Redis round trips for the static provider catalogue.
- Kept rate-limit fallback state bounded to prevent unbounded in-process growth.

### Testing and CI
- Added regression coverage for authentication failures, tenant isolation, provider-secret redaction, rate-limit boundaries, and generated external identifiers.
- Raised the dependency audit gate to fail on moderate-or-higher advisories.

### Compatibility
- This is a patch release with no intended breaking API changes.

### Deferred
- Provider credential encryption at rest remains tracked separately because it requires a migration and key-management/rotation design rather than a rushed patch-level change.

## [1.0.0]

### Added
- Initial SyncGrid API release with provider abstraction, payments, email, webhooks, API-key authentication, team workspaces, request logs/analytics, Redis integration, BullMQ jobs, Swagger/OpenAPI documentation, SDK helper, and Docker-based local setup.

[1.0.1]: https://github.com/wbizmo/syncgrid-api/releases/tag/v1.0.1

### Deployment
- Added the production Render service at https://syncgrid-api.onrender.com, tracking the authoritative `main` branch.
- Health and Swagger endpoints are available at `/health` and `/docs`.
