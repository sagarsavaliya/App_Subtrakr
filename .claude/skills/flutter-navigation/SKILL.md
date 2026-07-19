---
name: flutter-navigation
description: Use whenever implementing routing, navigation, deep linking, or screen transitions in a Flutter app. Trigger on "navigation", "routing", "go_router", "auto_route", "deep link", "navigate to", "push screen".
---

# Flutter Navigation — Akshara Technologies Standards

## Default choice: go_router
Use `go_router` for declarative, URL-based routing — required for web/deep-link support and Play Store/App Store deep-link review compliance.

## Structure
- Define all routes in a single `lib/app/router.dart` (or split by feature with `GoRoute` lists merged, for very large apps)
- Route paths are constants, never magic strings scattered across `context.go(...)` calls:

```dart
class AppRoutes {
  static const home = '/home';
  static const productDetail = '/product/:id';
}
```

## Auth-gated routing
Use `go_router`'s `redirect` callback tied to the auth state provider (see flutter-auth) — never manually check auth state inside every screen's `initState`.

```dart
redirect: (context, state) {
  final isLoggedIn = ref.read(authStateProvider).isAuthenticated;
  if (!isLoggedIn && state.matchedLocation != AppRoutes.login) {
    return AppRoutes.login;
  }
  return null;
}
```

## Deep linking
- Android: configure App Links (`assetlinks.json` on your domain + intent filters in `AndroidManifest.xml`)
- iOS: configure Universal Links (`apple-app-site-association` on your domain + associated domains capability)
- Route deep links through the same `go_router` config — don't build a parallel manual deep-link parser
- Test with both cold-start (app not running) and warm-start (app backgrounded) deep link taps — these are commonly missed and cause Play Store review or user-reported bugs

## Nested/tab navigation
Use `StatefulShellRoute` for bottom-nav-with-preserved-state patterns rather than `IndexedStack` + manual state juggling.

## Checklist
- [ ] Route paths are constants, not inline strings
- [ ] Auth redirect handled centrally, not per-screen
- [ ] Deep links tested cold-start and warm-start
- [ ] 404/unknown-route fallback defined
