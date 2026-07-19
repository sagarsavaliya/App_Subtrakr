# Supabase — Akshara Technologies Standards

## Setup
- Initialize `Supabase.initialize(url:, anonKey:)` once in `bootstrap()`, never re-initialize per screen.
- Use the anon/public key in the Flutter app only — the service role key must never ship in client code; it belongs only in server-side/Edge Function contexts.

## Database (Postgres) and Row Level Security
- Enable RLS on every table before any prod release — a table without RLS is publicly readable/writable via the anon key.
- Write explicit policies per operation (`select`, `insert`, `update`, `delete`) rather than one broad policy — easier to audit.
- Model relational data properly (foreign keys, joins) — this is Supabase's advantage over Firestore; don't denormalize unnecessarily.
- Use generated types (`supabase gen types dart`) or hand-maintained `freezed` models matching table schema — keep them in sync when migrations change the schema.

## Auth
See `flutter-auth` for the full flow. Supabase-specific: use `supabase.auth.onAuthStateChange` stream feeding your state management layer. Enable only the providers configured in the Supabase dashboard that are actually used.

## Realtime
- Subscribe to specific tables/rows with filters — never subscribe to an entire table's changes if the UI only needs a subset.
- Always unsubscribe (`channel.unsubscribe()`) in provider/widget disposal to avoid leaking connections.

## Storage
- Set bucket policies (public vs authenticated-only) deliberately per bucket — don't default everything to public.
- Generate signed URLs for private content rather than relying on predictable paths.

## Edge Functions (server-side logic)
- Use for anything requiring the service role key or secrets (payment webhooks, admin operations) — never attempt these from the Flutter client directly.
- Validate all inputs server-side.

## Common pitfalls
- Forgetting RLS on a new table — treat "add RLS policies" as part of the definition of done for any new table, not an afterthought.
- Using the anon key for admin-style operations that should go through an Edge Function with the service role key instead.
- Not handling `PostgrestException` (constraint violations, RLS denials) distinctly from network errors in the repository layer.
