---
name: flutter-android-release
description: Use whenever preparing an Android release, app signing, or Play Store submission for a Flutter app. Trigger on "play store", "android release", "app bundle", "keystore", "signing", "play console", "aab".
---

# Android Release — Akshara Technologies Standards

## App signing
- Generate a release keystore once per app (`keytool -genkey -v -keystore ...`) — losing it means losing the ability to update the app under the same listing, so back it up securely (password manager / secure company vault), never only on one developer's machine.
- Configure `key.properties` (gitignored) referenced from `android/app/build.gradle` — never hardcode keystore passwords in the gradle file itself.
- Prefer **Play App Signing** (Google manages the final signing key, you keep an upload key) — reduces blast radius if your local upload key is ever compromised, since Google can help recover/rotate it; the upload key itself still needs safekeeping.

## Build command
```bash
flutter build appbundle --release --flavor prod -t lib/main_prod.dart
```
Android App Bundle (`.aab`), not APK, is required for new Play Store submissions — Google Play generates optimized APKs per device from the bundle.

## Versioning
- `pubspec.yaml` version format: `1.2.3+45` — `1.2.3` is the user-facing version name, `45` is the build number (`versionCode`), which must strictly increase on every Play Store upload, even for the same version name.
- Never reuse or decrease a `versionCode` — Play Console will reject the upload.

## Play Console setup checklist
- App content ratings questionnaire completed accurately
- Data safety section filled out matching what the app actually collects/transmits (mismatches here are a common rejection/removal reason)
- Privacy policy URL live and accessible (required even for apps that collect minimal data)
- Target API level meets Google Play's current minimum requirement — check Play Console's current policy, as this minimum increases periodically
- Content rating and target audience/age declared correctly, especially if the app targets children (triggers additional Play Families policy requirements)

## Release tracks
Use Play Console's staged rollout: **Internal testing** → **Closed testing (beta)** → **Open testing** (optional) → **Production**, with staged percentage rollout (e.g., 10% → 50% → 100%) on production releases rather than 100% immediately, so a bad release can be halted before reaching all users.

## Common rejection reasons to check proactively
- Missing/incorrect privacy policy or data safety mismatch
- Broken core functionality on review (test the exact build being submitted, not an older dev build)
- Permissions requested without clear in-app justification
- Ads/content not matching declared content rating

## Checklist
- [ ] Keystore backed up securely, not only on one machine
- [ ] `versionCode` incremented from last published version
- [ ] Data safety form matches actual app behavior
- [ ] Staged rollout used for production releases, not instant 100%
