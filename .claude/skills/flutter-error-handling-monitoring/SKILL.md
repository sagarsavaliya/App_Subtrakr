---
name: flutter-error-handling-monitoring
description: Use whenever implementing crash reporting, error logging, or global error handling in a Flutter app. Trigger on "crashlytics", "sentry", "error handling", "logging", "crash report", "exception handling" — also apply proactively before any production release, since unmonitored crashes are a common launch mistake.
---

# Error Handling & Monitoring — Akshara Technologies Standards

A production app with no crash reporting is not release-ready — this is non-negotiable before any Play Store/App Store submission.

## Crash reporting tool
Use Firebase Crashlytics (free, well-integrated) by default, or Sentry if the project needs richer error grouping, release tracking, or is already using Sentry for a backend. Don't ship without one or the other.

## Global error capture setup

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  FlutterError.onError = (details) {
    FirebaseCrashlytics.instance.recordFlutterFatalError(details);
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    return true;
  };

  runApp(const MyApp());
}
```

Wrapping in `runZonedGuarded` is an alternative/complementary approach for catching async errors outside the Flutter framework's own error zone — use both `PlatformDispatcher.onError` and `runZonedGuarded` for full coverage, they catch slightly different error classes.

## Structured logging
- Use a logging package (`logger` or similar) with levels (debug/info/warning/error) — never bare `print()` in production code.
- Strip or reduce verbose logging in prod builds (gate behind `kDebugMode` or flavor check) — avoid leaking PII or tokens into device logs/crash reports.

## Non-fatal error tracking
Log handled exceptions (e.g., a caught API failure that's shown to the user gracefully) as non-fatal events too — `recordError(fatal: false)` — silent `catch` blocks that swallow errors with no logging are a common source of "why is this feature broken but we have no reports" situations.

## User feedback correlation
Set `Crashlytics.setUserIdentifier` (a non-PII internal user ID, not email) so crash reports can be correlated with support tickets without exposing personal data in the crash dashboard.

## Checklist before any release
- [ ] Crash reporting initialized and verified with a test crash before first prod release
- [ ] No bare `print()` statements in production code paths
- [ ] Caught/handled exceptions still logged as non-fatal events, not silently swallowed
- [ ] No tokens/PII logged, even in debug logs that could ship accidentally
