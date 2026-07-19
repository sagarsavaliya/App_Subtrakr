---
name: flutter-ios-release
description: Use whenever preparing an iOS release, code signing, or App Store submission for a Flutter app. Trigger on "app store", "ios release", "testflight", "provisioning profile", "certificate", "app store connect", "xcode archive".
---

# iOS Release — Akshara Technologies Standards

## Apple Developer Program
Requires an active Apple Developer Program membership (paid, annual) under the company's Apple ID — use an organization account (not an individual developer's personal account) so access isn't tied to one person leaving.

## Certificates and provisioning profiles
- Use **Automatic Signing** in Xcode for simpler projects, or manual signing with explicit provisioning profiles for CI/CD reproducibility — automatic signing can be fragile in CI environments without a logged-in Xcode session.
- Distribution certificate + App Store provisioning profile needed for store builds; a separate Ad Hoc or Development profile for internal/TestFlight-only builds if not going through the App Store distribution path.
- Store certificates as encrypted CI secrets (see flutter-cicd) — never commit `.p12`/`.mobileprovision` files to the repo.

## Build command
```bash
flutter build ipa --release --flavor prod -t lib/main_prod.dart
```
Produces an `.xcarchive`-derived `.ipa` ready for upload via Xcode Transporter or `xcrun altool`/`xcrun notarytool` in CI.

## Versioning
- `CFBundleShortVersionString` (user-facing version) and `CFBundleVersion` (build number) — both driven from `pubspec.yaml`'s `version` field by default (`flutter build ipa` maps `1.2.3+45` the same way as Android).
- Build number must increase for every new upload to App Store Connect, even within the same version name (same rule as Android's versionCode).

## App Store Connect setup checklist
- App privacy "nutrition label" (data collection disclosure) filled out accurately — Apple checks this against actual app behavior via review and later audits.
- Export compliance (encryption usage) declaration — most apps using standard HTTPS qualify for the standard exemption, but this must be answered on every submission.
- Screenshots for all required device sizes (varies by supported device classes) — missing a required size blocks submission.
- Age rating questionnaire completed.

## Apple-specific review requirements (common rejection causes)
- **Sign in with Apple required** if any other third-party/social login is offered (see flutter-auth) — this is one of the most common rejection reasons for apps porting from Android-first development.
- No placeholder/Lorem Ipsum content, broken links, or "Coming Soon" features visible in the submitted build.
- Full app functionality must be testable by the reviewer — provide demo account credentials in App Store Connect's review notes if login is required.
- In-app purchases must use Apple's IAP system for digital goods/subscriptions (see flutter-saas-billing) — linking out to an external payment page for digital content is a guideline violation.

## TestFlight
Use internal testing (up to 100 users, no review needed, fast iteration) before external testing (requires a lightweight Beta App Review) — internal testing is the fast feedback loop equivalent of Android's internal testing track.

## Checklist
- [ ] Sign in with Apple present if other social logins exist
- [ ] Build number incremented from last App Store Connect upload
- [ ] Privacy nutrition label matches actual data collection
- [ ] Demo account provided in review notes if the app requires login
- [ ] Digital goods/subscriptions use Apple IAP, not external payment links
