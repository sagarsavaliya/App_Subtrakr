---
name: flutter-local-storage
description: Use whenever implementing local/offline data storage, caching, or offline-first behavior in a Flutter app. Trigger on "offline", "local database", "cache", "sqflite", "drift", "hive", "shared_preferences", "sync".
---

# Local Storage & Offline — Akshara Technologies Standards

## Choosing a local storage tool
- **Simple key-value settings** (theme, onboarding-seen flag, non-sensitive small values): `shared_preferences`
- **Structured relational local data / offline-first apps**: `drift` (type-safe SQL, code-generated, built on `sqflite`) — preferred over raw `sqflite` for anything beyond trivial reads/writes
- **Sensitive data** (tokens, PII): `flutter_secure_storage` — never the two above (see flutter-auth)
- **Simple object caching without SQL needs**: `hive`/`hive_ce` — fast, but weaker for complex queries; use `drift` if the data needs filtering/joining

## Offline-first pattern
- Repository implementation checks local cache first, returns it immediately (with a "stale" flag if applicable), then fetches remote and updates cache + emits fresh data — don't block the UI on network if a reasonable local copy exists.
- Define an explicit sync/conflict strategy for any data editable both offline and on another device (last-write-wins is simplest; only build operational-transform/CRDT-style merging if the product genuinely needs it — don't over-engineer this by default).

## Cache invalidation
- Set explicit TTLs or version tags on cached data — "cache forever" silently causes stale-data bugs.
- Clear user-specific cached data on logout (see flutter-auth).

## Migrations
`drift` and `hive` both support schema migrations — write and test migration paths whenever a local schema changes; never ship a schema change that just crashes on existing installed users' data.

## Checklist
- [ ] Sensitive data never lands in `shared_preferences` or `hive`/`drift` unencrypted
- [ ] Cache has an invalidation/TTL strategy, not indefinite staleness
- [ ] Local schema migrations tested against an app with existing local data
- [ ] User-specific local data cleared on logout
