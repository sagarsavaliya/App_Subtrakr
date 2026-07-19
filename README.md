# SubTrakr

> All your subscriptions. Tracked. Sorted.

A mobile-first subscription manager for tracking personal and business
recurring costs, separated by entity for easy GST reconciliation. Built with
Flutter, Riverpod, and a self-hosted Supabase backend.

See [Briefs/SUBTRAKR_PRD.md](Briefs/SUBTRAKR_PRD.md) for the full product
requirements document.

## Stack

- **Flutter 3.x / Dart 3.x** — Riverpod for state, GoRouter for navigation, Hive for offline-first local persistence
- **Supabase** (self-hosted: Postgres + Auth + REST + Storage via Kong) — `https://supabase.subtrakr.me`
- **flutter_local_notifications** — renewal reminders
- `pdf` / `share_plus` — GST export (PDF/CSV) for CA filing

## Getting started

```bash
flutter pub get
flutter run
```

Copy `.env.example` to `.env` (not committed — see `.gitignore`) with your
Supabase URL and anon key to connect to a live backend; the app otherwise
falls back to local-only mock data.

## Development

```bash
flutter analyze   # must be clean
flutter test       # must pass
```

## CI/CD

GitHub Actions runs on a self-hosted runner on the project's VPS
(`subtrakr-vps`). CI runs `flutter analyze` + `flutter test` on every push/PR;
CD deploys backend infrastructure changes and the web build automatically —
see `.github/workflows/`.
