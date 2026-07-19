---
name: flutter-performance
description: Use whenever optimizing app performance, reducing build size, fixing jank/rebuild issues, or profiling a Flutter app. Trigger on "performance", "slow", "jank", "rebuild", "app size", "optimize", "lag" — also apply proactively as part of pre-release review.
---

# Performance — Akshara Technologies Standards

## Rebuild optimization
- Use `const` constructors wherever possible — a `const` widget never rebuilds even if its parent does.
- Split large `build()` methods into smaller widgets rather than one monolithic tree — smaller widgets mean smaller rebuild scopes.
- With Riverpod, use `.select()` to subscribe to only the specific field a widget needs (see flutter-state-management) — the single biggest avoidable cause of excess rebuilds.
- Avoid creating new closures/objects inline inside `build()` that get passed as callbacks — can defeat `const`/equality-based rebuild skipping.

## Image handling
- Use `cached_network_image` for remote images — avoids re-downloading and provides disk caching automatically.
- Specify explicit `width`/`height`/`cacheWidth`/`cacheHeight` to decode images at display size, not full resolution — decoding a 4000px image to display at 200px wastes memory and CPU.
- Use appropriately compressed formats (WebP where supported) for bundled assets.

## App size
- Run `flutter build appbundle --analyze-size` (Android) / equivalent for iOS to find size contributors before release.
- Remove unused assets/dependencies — check `pubspec.yaml` for packages added early in development but no longer used.
- Enable code shrinking/obfuscation for release builds (`--obfuscate --split-debug-info=<dir>`) — also improves reverse-engineering resistance.
- Use deferred/lazy loading for large feature modules if the app has distinct large sections not all users need immediately.

## Profiling
- Use Flutter DevTools' Performance and Widget Rebuild tabs to find actual jank sources before optimizing blindly — don't guess.
- Test on a mid-range/low-end physical device, not just a high-end simulator — simulators mask real-world performance issues.
- Watch for `ListView`/`GridView` without `itemExtent`/`prototypeItem` on long lists with variable-height items — causes expensive layout passes.

## Startup time
- Keep `main()`/`bootstrap()` lean — defer non-critical initialization (analytics, non-essential SDKs) until after first frame using `WidgetsBinding.instance.addPostFrameCallback` where safe to do so.
- Use a lightweight native splash screen (`flutter_native_splash`) rather than a Flutter-rendered splash, so something appears before the Dart VM/framework is ready.

## Checklist before release
- [ ] No obvious unnecessary rebuilds in DevTools' rebuild profiler on key screens
- [ ] Images sized/cached appropriately, not full-resolution when displayed small
- [ ] Release build obfuscated, unused dependencies removed
- [ ] Tested on a real mid-range device, not only emulator/simulator
