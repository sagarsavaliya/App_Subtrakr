# Firebase — Akshara Technologies Standards

## Setup
- Use `flutterfire configure` (FlutterFire CLI) to generate `firebase_options.dart` — never hand-write Firebase config.
- One Firebase project per environment (dev/staging/prod) — never share a prod Firebase project with dev/staging traffic.

## Firestore data modeling
- Denormalize deliberately for read performance — Firestore is NoSQL, not relational; avoid trying to force SQL-style joins.
- Use subcollections for one-to-many data that's queried independently (e.g., `users/{uid}/orders/{orderId}`); use arrays/maps for small, bounded, always-fetched-together data.
- Add composite indexes proactively for any query with multiple `where` + `orderBy` clauses — test queries in dev before they fail in prod.
- Use `.withConverter<T>()` for typed reads/writes instead of manual `Map<String, dynamic>` juggling in the datasource.

## Security rules
- Never ship with test-mode rules (`allow read, write: if true`) — write explicit rules per collection before any prod release.
- Validate data shape in rules where feasible, not just auth ownership (e.g., `request.resource.data.keys().hasAll([...])`).
- Version-control `firestore.rules` and `storage.rules` in the repo, deploy via CI (see flutter-cicd), not manually from console.

## Firebase Auth
See `flutter-auth` for the full auth flow — this section only covers Firebase-specific wiring: enable only the sign-in providers actually used, and always pair with an `AuthStateChanges` stream feeding your state management layer, not manual polling.

## Cloud Functions (if used for server-side logic)
- Keep functions small and single-purpose; avoid one giant function handling many triggers.
- Use TypeScript for functions if the team has JS/TS familiarity — validate all inputs server-side even though Flutter validates client-side too (never trust the client).

## Crashlytics (also see flutter-error-handling-monitoring)
- Initialize before `runApp`, wrap `runApp` in `runZonedGuarded` to catch async errors too.
- Set `FlutterError.onError` to forward Flutter framework errors to Crashlytics.

## Common pitfalls
- Forgetting to add `google-services.json` (Android) / `GoogleService-Info.plist` (iOS) to `.gitignore` if they contain environment-specific secrets, or committing them intentionally per-flavor if that's the team's chosen pattern — be explicit either way.
- Not setting Firestore offline persistence explicitly (default is on for mobile, off for web) — confirm this matches the app's offline requirements.
