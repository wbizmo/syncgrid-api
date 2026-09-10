## Release Notes

SyncGrid API v1.0.1 is a security and efficiency hardening release for the integration gateway API.

### Security

- Upgraded Fastify to the patched 5.12.x line.
- Remediated the vulnerable Prisma/mysql2 transitive dependency path.
- Hardened API-key rate limiting with authenticated keys, atomic Redis counters, and a bounded local fallback.
- Excluded provider credential configuration from routine read queries.
- Replaced predictable default payment and email identifiers with cryptographic UUID-backed IDs.
- Removed arbitrary queued integration payload contents from routine worker logs while preserving operational identifiers.

### Performance

- Removed unnecessary Redis round trips for the static provider catalogue.
- Kept the in-process rate-limit fallback bounded to prevent unbounded memory growth.

### CI and Regression Coverage

- Added regression coverage for authentication failures, tenant isolation, provider-secret redaction, rate-limit boundaries, and generated identifiers.
- The dependency audit gate fails on moderate-or-higher advisories.

### Compatibility

This is a patch release with no intended breaking API changes.

### Follow-up

Provider credential encryption at rest remains tracked separately because it requires explicit migration, key-management, and rotation handling.
