# Custom REST API / MySQL Backend — Akshara Technologies Standards

This applies when Flutter talks to a custom backend (PHP/Laravel, Node, .NET, etc.) backed by MySQL, over REST or GraphQL — common for Akshara's client/service projects where the backend team owns a separate stack.

## HTTP client
Use `Dio` (not the bare `http` package) for anything beyond trivial calls — interceptors, cancellation tokens, and typed error handling matter in production apps.

```dart
final dio = Dio(BaseOptions(
  baseUrl: Environment.apiBaseUrl,
  connectTimeout: const Duration(seconds: 10),
  receiveTimeout: const Duration(seconds: 15),
));
```

## Interceptors
- **Auth interceptor**: attach the bearer token from secure storage to every request; on a 401, attempt token refresh once, then force logout if refresh also fails (see flutter-auth) — never silently retry in a loop.
- **Logging interceptor**: enabled only in dev/staging flavors, stripped in prod builds (avoid logging tokens or PII).
- **Error interceptor**: map HTTP status codes and backend error payloads into your `Failure` types at this layer, not scattered through individual repository methods.

## Request/response models
- Use `freezed` + `json_serializable` DTOs in `data/models/`, distinct from `domain/entities/` — map DTO → entity in the repository implementation so backend field-naming quirks (`snake_case`, inconsistent nesting) never leak into domain/presentation.
- Handle nullable/missing fields defensively — a REST backend the team doesn't fully control can and will change response shape without notice; don't assume every field is always present.

## Pagination
Standardize on either offset-based (`?page=2&limit=20`) or cursor-based pagination project-wide — mixing patterns across endpoints of the same app creates inconsistent loading UX. Cursor-based is preferable for MySQL tables with frequent inserts, to avoid skipped/duplicated items.

## Error handling
Distinguish at minimum: network/timeout failure, 4xx client error (show validation message), 401/403 (force re-auth), 5xx server error (generic retry-able message) — the UI shouldn't show raw backend error strings to end users for 5xx errors.

## GraphQL variant (if the backend exposes GraphQL instead of REST)
Use `graphql_flutter` or `ferry` (code-generated, more type-safe). Keep queries/mutations in `.graphql` files with codegen rather than raw strings scattered through datasources, for large projects.

## Common pitfalls
- Not setting a receive timeout — a hung request can leave a loading spinner forever without one.
- Retrying non-idempotent requests (POST) automatically on failure without idempotency keys — can cause duplicate orders/records.
- Trusting client-side validation alone — the MySQL backend must re-validate everything server-side regardless of what Flutter validates.
