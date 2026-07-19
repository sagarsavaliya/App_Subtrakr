---
name: flutter-notifications
description: Use whenever implementing push notifications, in-app notifications, or local scheduled notifications in a Flutter app. Trigger on "push notification", "FCM", "APNs", "in-app notification", "notification badge", "local notification", "reminder alert" — this is a common requirement, check for it even if not explicitly named.
---

# Notifications — Akshara Technologies Standards

Notifications span three distinct concerns — don't conflate them:
1. **Push (server-triggered)** — delivered via FCM/APNs while app may be closed
2. **Local (device-scheduled)** — reminders/alarms that don't need a server round trip
3. **In-app** — banners/inbox shown while the app is open, reflecting either of the above or app-internal events

## Push notifications (FCM)
Use `firebase_messaging` even for non-Firebase backends — it's the standard abstraction over both FCM (Android) and APNs (iOS); the custom/Supabase/MySQL backend just calls the FCM HTTP API server-side to trigger sends (see flutter-backend for which backend reference applies).

### iOS-specific requirements (often missed)
- APNs authentication key (`.p8`) uploaded to Firebase Console (if using FCM) — required even though Firebase abstracts delivery.
- Explicit permission request via `FirebaseMessaging.instance.requestPermission()` — iOS shows a native system prompt; Android 13+ (`POST_NOTIFICATIONS`) also now requires a runtime permission request, unlike earlier Android versions.
- Push Notifications + Background Modes ("Remote notifications") capability enabled in Xcode.

### App state handling — implement all three, they behave differently
- **Foreground**: `FirebaseMessaging.onMessage` — Firebase does NOT show a system notification automatically; you must display it yourself (system banner or in-app UI).
- **Background (app backgrounded, not killed)**: `FirebaseMessaging.onMessageOpenedApp` for tap handling.
- **Terminated**: `FirebaseMessaging.instance.getInitialMessage()` on app start, to handle the case where a notification tap launched the app.

### Notification channels (Android)
Create explicit channels (e.g., `chat_messages`, `promotions`, `order_updates`) rather than one default channel — users can control importance/sound per channel in system settings, and Play Store review expects sensible channel usage for apps with varied notification types.

### Deep linking from notifications
Route the notification's data payload through the same `go_router` config as regular deep links (see flutter-navigation) — don't build a separate manual navigation path for notification taps.

### Silent/data-only pushes
Use for background data sync or badge updates without showing a visible notification — set `content-available` (iOS) and omit the `notification` block (Android), sending only `data`.

## Local notifications
Use `flutter_local_notifications` for reminders, scheduled alerts, or repeating notifications that don't originate from a server event. Combine with `timezone` package for accurate scheduled-time handling across DST changes.

## In-app notifications / notification center
- Maintain a lightweight local table (via `drift`, see flutter-local-storage) of received notifications for an in-app inbox/notification-center UI, with read/unread state.
- Badge counts: update both the OS badge (`flutter_app_badger` or platform-specific APIs) and any in-app badge indicator from the same source of truth — don't let them drift out of sync.

## Testing
- Test all three app-state paths (foreground/background/terminated) on real devices — simulators/emulators have unreliable push delivery, especially iOS Simulator, which cannot receive real APNs pushes at all (test on a physical device or use Xcode's simulated push feature for basic cases only).

## Checklist
- [ ] Runtime permission requested explicitly (both iOS and Android 13+)
- [ ] All three app-state handlers implemented (foreground/background/terminated)
- [ ] Notification channels defined per category (Android)
- [ ] Notification taps deep-link through the standard router
- [ ] Tested on physical devices, not just simulator/emulator
