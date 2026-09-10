# Release Notes

## SyncGrid API v1.0.1 — Security & Efficiency Hardening

Released: 2026-09-10

Tag: `v1.0.1`

GitHub Release: https://github.com/wbizmo/syncgrid-api/releases/tag/v1.0.1

SyncGrid API v1.0.1 is a patch release focused on dependency security, bounded authentication controls, lower credential exposure, safer identifiers and worker logs, and eliminating unnecessary cache work.

### Highlights

- Fastify upgraded to the patched 5.12.x line.
- Vulnerable Prisma/mysql2 transitive dependency path remediated.
- API-key rate limiting now authenticates first, uses atomic Redis counters, and has a bounded local fallback.
- Provider secret configuration is excluded from routine provider-config read queries.
- The static provider catalogue no longer performs unnecessary Redis cache round trips.
- Payment and email external identifiers now use cryptographic UUID-backed defaults.
- Worker logs no longer include arbitrary queued integration payload contents.
- Regression coverage now protects authentication, tenant isolation, provider-secret redaction, rate-limit boundaries, and generated identifiers.
- CI fails on moderate-or-higher dependency advisories.

### Compatibility

No breaking API changes are intended in v1.0.1.

### Follow-up

Provider credential encryption at rest is intentionally deferred to a migration-oriented release because it requires explicit key storage, rotation, and migration handling.

Release commit: `7ee8885d6a89a5c701e926b340779c148416f132`.

### Production Deployment

- API: https://syncgrid-api.onrender.com
- Health: https://syncgrid-api.onrender.com/health
- Swagger: https://syncgrid-api.onrender.com/docs

The Render service tracks the authoritative `main` branch.
