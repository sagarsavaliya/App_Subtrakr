---
name: flutter-cicd
description: Use whenever setting up or modifying CI/CD pipelines for a Flutter app — automated testing, building, or deployment. Trigger on "CI/CD", "GitHub Actions", "Codemagic", "pipeline", "automated build", "automated deploy".
---

# CI/CD — Akshara Technologies Standards

## Tool choice
- **Codemagic** — purpose-built for Flutter, handles iOS signing complexity (certificates/provisioning) with the least friction; good default when the team wants to minimize pipeline maintenance.
- **GitHub Actions** — good default when the team already lives in GitHub and wants full control/no vendor lock-in; more manual signing setup, especially for iOS.
- Either is acceptable; pick one per project and don't mix without a reason (e.g., a client mandating a specific platform).

## Pipeline stages (minimum for any project)
1. **Analyze**: `flutter analyze` — fail the build on any issue
2. **Format check**: `dart format --set-exit-if-changed .`
3. **Test**: `flutter test --coverage` — fail on test failure; optionally gate on coverage threshold
4. **Build**: platform-specific build (see flutter-android-release / flutter-ios-release)
5. **Deploy**: to internal testers (Firebase App Distribution/TestFlight internal) on every merge to a develop/staging branch; to store tracks (Play Console internal/beta, TestFlight external) on tagged releases only

## Secrets management
- Never commit signing keys, service account JSON, or API keys to the repo, even in a "private" repo.
- Store as encrypted CI secrets (GitHub Actions Secrets, Codemagic environment variables marked secure).
- Android keystore and iOS certificates: base64-encode and store as secrets, decode at build time — don't check the binary files in anywhere, including in a "secrets" branch.

## Branch strategy driving the pipeline
- `develop`/`staging` branch → auto-deploy to internal testers on every merge
- `main`/`release` branch or version tags → build for store submission, but require manual "release" approval step before actually publishing — don't auto-publish to production store listings without a human gate, even if internal builds are fully automated.

## Version bumping
Automate `pubspec.yaml` version/build-number bumping as a pipeline step (or a pre-release script) tied to git tags, so version numbers aren't manually edited and forgotten before a release — a common cause of failed store uploads (duplicate version code).

## Caching
Cache `~/.pub-cache` and the Flutter SDK (if not using FVM's own caching) between pipeline runs to keep build times reasonable — a from-scratch Flutter CI build without caching is significantly slower.

## Checklist
- [ ] Analyze + format + test gate every PR before merge
- [ ] No secrets committed anywhere in repo history
- [ ] Store publishing has a manual approval gate, not fully automatic
- [ ] Version/build number bumped automatically, not manually tracked
