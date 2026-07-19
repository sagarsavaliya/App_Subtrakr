---
name: flutter-architecture
description: Use whenever designing folder structure, deciding where a class or file belongs, implementing clean architecture layers, or setting up dependency injection in a Flutter app. Trigger on "architecture", "folder structure", "clean architecture", "dependency injection", "repository pattern", "where should this go" — apply proactively when generating any new feature, not only when explicitly asked about architecture.
---

# Flutter Architecture — Akshara Technologies Standards

We use a feature-first clean architecture: three layers per feature, dependencies point inward only (presentation → domain → data, never the reverse).

## Folder structure per feature

```
lib/features/<feature_name>/
├── presentation/
│   ├── screens/
│   ├── widgets/
│   └── providers/          # or bloc/, cubit/ — see flutter-state-management
├── domain/
│   ├── entities/            # plain Dart objects, no JSON/SDK knowledge
│   ├── repositories/        # abstract interfaces only
│   └── usecases/            # optional — one class per business action, for complex features only
└── data/
    ├── models/               # DTOs with fromJson/toJson (freezed + json_serializable)
    ├── datasources/          # remote (API/Firebase/Supabase) and local (cache/db)
    └── repositories/          # concrete implementation of domain/repositories
```

Rule of thumb: skip `usecases/` for simple CRUD features (repository call directly from provider is fine); add them when a business action combines multiple repository calls or has real business logic.

## Dependency injection

Use `get_it` + `injectable` for compile-time-safe DI:
- Register datasources and repositories as lazy singletons
- Register use cases as factories
- Never instantiate a repository or datasource directly inside a widget or provider — always inject

```dart
final userRepo = getIt<UserRepository>(); // not UserRepositoryImpl()
```

## Dependency rule (non-negotiable)
- `domain/` never imports anything from `data/` or `presentation/`, and never imports a third-party SDK (no `firebase_auth` import inside an entity or repository interface)
- `data/` implements `domain/` interfaces, translating SDK-specific types into domain entities at the boundary
- `presentation/` only talks to `domain/` (via providers calling repository interfaces or use cases) — never touches `data/` directly

## Shared/core code
- `lib/core/error/` — `Failure` classes, exception-to-failure mapping
- `lib/core/network/` — Dio instance, interceptors (see flutter-backend)
- `lib/core/extensions/` — Dart extensions (`BuildContext`, `String`, etc.)
- `lib/core/constants/` — app-wide constants, never scattered magic strings/numbers

## Checklist for every new feature
- [ ] Domain entities have zero SDK imports
- [ ] Repository interface defined in `domain/`, implementation in `data/`
- [ ] DI registration added (`injectable` annotations + `build_runner` run)
- [ ] No direct datasource/SDK calls from `presentation/`
