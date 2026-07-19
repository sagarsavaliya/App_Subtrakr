---
name: flutter-backend
description: Use whenever implementing or reviewing backend integration in a Flutter app — database access, API calls, Firebase, Supabase, or MySQL/REST. Trigger on "database", "api", "firebase", "supabase", "mysql", "backend", "repository" in a Flutter/Dart context, even if the user doesn't name this skill explicitly. For authentication specifically, also load flutter-auth.
---

# Backend Integration — Akshara Technologies Standards

Akshara ships both service-based client apps and our own SaaS products, so the backend varies by project. Before writing code, confirm which backend this project uses — check `pubspec.yaml` for `firebase_core`, `supabase_flutter`, or a custom `dio`/`http` client, or ask if unclear.

Then read the matching reference file before implementing:

- Firebase project → read `references/firebase.md`
- Supabase project → read `references/supabase.md`
- Custom REST/MySQL backend → read `references/mysql-rest-api.md`

For push notification delivery specifically (FCM/APNs), see `flutter-notifications` — that skill covers the messaging-specific setup on top of whichever backend you're using here.

## Cross-cutting rules (apply regardless of backend)

- Never hardcode API keys, project IDs, or secrets in source — use `--dart-define-from-file` or a gitignored `.env` (see flutter-project-setup).
- All network/database calls go through a repository layer (`data/repositories/`) implementing a `domain/repositories/` interface — UI and providers never call an SDK or `Dio` instance directly (see flutter-architecture).
- Every repository method returns a typed `Result<T>`/`Either<Failure, T>` — no unguarded exceptions bubbling to UI.
- Auth tokens: use `flutter_secure_storage`, never `shared_preferences`, for anything sensitive.
- Pagination, retries, and timeouts are explicit, not left to SDK defaults, for any list/feed endpoint.
- Map backend-specific exceptions (`FirebaseException`, `PostgrestException`, `DioException`) into your own `Failure` types at the datasource boundary — domain and presentation layers should never see SDK-specific exception types.

## Choosing a backend for a new project
- **Firebase** — fastest to ship, best for real-time + generous free tier + tight Google ecosystem (FCM, Crashlytics) integration; NoSQL data modeling constraints.
- **Supabase** — Postgres under the hood (relational, SQL, row-level security), open-source, good when the client wants portability or complex relational queries.
- **Custom MySQL/REST** — required when integrating with an existing client backend/ERP, or when the SaaS product needs full backend control (custom business logic, existing MySQL infrastructure).
