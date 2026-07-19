---
name: flutter-auth
description: Use whenever implementing or reviewing authentication in a Flutter app — login, signup, token refresh, biometric auth, session handling, social login. Trigger on "auth", "login", "signup", "token", "session", "biometric", "logout", "password reset".
---

# Authentication — Akshara Technologies Standards

## Auth state as a first-class provider
Expose a single source of truth (`authStateProvider`) that the whole app observes — router redirects (flutter-navigation), UI, and API interceptors (flutter-backend) all read from this one place. Never check "is logged in" via ad-hoc local variables scattered across screens.

## Token storage
- Access token + refresh token: `flutter_secure_storage` only — never `shared_preferences`, never plain files.
- On iOS, set appropriate `KeychainAccessibility` (e.g., `first_unlock`) so background refresh works without requiring the device to be unlocked, unless the security requirement dictates otherwise.

## Token refresh
- Implement silent refresh via the Dio auth interceptor (see flutter-backend/references/mysql-rest-api.md) or the SDK's built-in refresh (Firebase Auth and Supabase both handle this automatically via their auth state streams — don't hand-roll refresh logic for those).
- On refresh failure, force logout and clear all local state (including cached data with user-specific content) — don't leave the app in an ambiguous half-authenticated state.

## Social/SSO login
- Google Sign-In, Apple Sign-In (mandatory alongside any other social login if shipping to the App Store — Apple requires it), etc. — implement through the backend's native integration (Firebase Auth providers, Supabase OAuth, or the custom backend's OAuth flow) rather than a bespoke OAuth dance in Flutter.
- Apple Sign-In is a hard App Store requirement whenever another third-party login option (Google, Facebook, etc.) is offered — flag this to the user if it's missing and iOS release is planned.

## Biometric auth (app-lock, not identity provider)
Use `local_auth` for device-level biometric unlock (Face ID/fingerprint) as a convenience layer on top of an existing session — this is not a replacement for real authentication, only a re-entry gate.

## Session/logout
- Logout clears: secure storage tokens, any in-memory auth state, cached user-specific data (local DB rows, image cache if it contains private content).
- Handle "logged out from another device" / revoked-token scenarios gracefully — catch the resulting 401 and route to login rather than showing a raw error.

## Password reset / email verification
Route through the backend's built-in flow (Firebase Auth `sendPasswordResetEmail`, Supabase `resetPasswordForEmail`, or custom backend endpoint) — never store or compare passwords client-side.

## Checklist
- [ ] Single `authStateProvider` drives router redirects, UI, and API interceptor
- [ ] Tokens in `flutter_secure_storage`, not `shared_preferences`
- [ ] Refresh failure triggers full logout + state clear, not a stuck loading state
- [ ] Apple Sign-In present if other social logins exist and iOS release is planned
