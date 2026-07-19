---
name: flutter-native-integration
description: Use whenever implementing native platform features in Flutter — permissions, camera, location, platform channels, deep links, or any Android/iOS-specific configuration. Trigger on "permission", "camera", "location", "platform channel", "native", "AndroidManifest", "Info.plist".
---

# Native Platform Integration — Akshara Technologies Standards

## Permissions
- Use `permission_handler` for a unified API, but understand each platform still needs native manifest/plist declarations underneath it.
- Request permissions contextually (right before the feature that needs them), not all upfront at app launch — both a UX best practice and something App Store reviewers specifically flag.
- Handle all three outcomes explicitly: granted, denied, permanently denied (`isPermanentlyDenied` → guide user to system settings, since re-requesting won't show the dialog again).

### Required declarations
- **Android** (`AndroidManifest.xml`): declare every permission used, and for Android 13+ target SDK, `POST_NOTIFICATIONS` must be requested at runtime (see flutter-notifications).
- **iOS** (`Info.plist`): every permission needs a usage description string (`NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, etc.) — missing these causes an instant crash on permission request and are checked in App Store review.

## Platform channels
Only needed when a required native capability has no good Flutter plugin — check pub.dev thoroughly first (most common needs like camera, location, biometrics, notifications, in-app purchase already have well-maintained plugins). When a platform channel is genuinely needed:
- Keep the Dart-side API surface minimal and typed — don't pass raw untyped maps beyond the channel boundary if avoidable.
- Handle the channel being unavailable gracefully (e.g., method not implemented on one platform) rather than assuming both platforms always respond identically.

## Common native integrations
- **Camera/gallery**: `image_picker` (simple) or `camera` (custom camera UI)
- **Location**: `geolocator` — remember iOS requires explicit "when in use" vs "always" distinction with separate usage strings
- **Biometrics**: `local_auth` (see flutter-auth)
- **In-app purchase/subscriptions**: `in_app_purchase` or RevenueCat (see flutter-saas-billing)
- **Deep links**: handled via `go_router` + platform App Links/Universal Links config (see flutter-navigation)

## App icons and splash screens
Use `flutter_launcher_icons` and `flutter_native_splash` to generate all required resolutions/densities consistently — manually managing every Android density bucket and iOS size is error-prone and a common source of review rejection for missing sizes.

## Checklist
- [ ] Every requested permission has a platform usage description (iOS) and manifest entry (Android)
- [ ] Permanently-denied permission state handled with a path to system settings
- [ ] Permissions requested contextually, not all at launch
- [ ] App icons generated for all required densities/sizes on both platforms
