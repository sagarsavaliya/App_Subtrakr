---
name: flutter-project-setup
description: Use whenever starting a new Flutter project, configuring build flavors (dev/staging/prod), setting up environment variables, or pinning the Flutter/Dart SDK version. Trigger on "new flutter project", "flutter setup", "build flavors", "environment config", ".env", "FVM" — even if the user just says "set up the project."
---

# Flutter Project Setup — Akshara Technologies Standards

## SDK version pinning
Always use FVM (Flutter Version Manager) to pin the SDK per project — never rely on a global Flutter install for production work.

```bash
dart pub global activate fvm
fvm install stable   # or a specific version, e.g. 3.32.0
fvm use stable
```

Commit `.fvmrc` and `.fvm/fvm_config.json` to the repo. Every teammate and CI runner then resolves the same SDK version.

## Folder structure (baseline, refined further by flutter-architecture)

```
lib/
├── main.dart              # thin entry point only — no logic
├── app/                   # app-level widget, routing, theming
├── core/                  # shared utilities, constants, extensions, error types
├── features/               # one folder per feature (see flutter-architecture)
└── env/                    # environment-specific config (not committed for secrets)
```

## Build flavors

Set up three flavors minimum: `dev`, `staging`, `prod`. Each needs:
- Distinct `applicationId`/bundle ID suffix (Android) and scheme (iOS) so all three can be installed on one device simultaneously
- Distinct app name/icon (so testers can visually tell them apart)
- Distinct backend endpoint / Firebase project

Android: configure via `android/app/build.gradle` `productFlavors`.
iOS: configure via Xcode schemes + `.xcconfig` files per flavor.

Entry points: `lib/main_dev.dart`, `lib/main_staging.dart`, `lib/main_prod.dart`, each calling a shared `bootstrap(Environment env)` in `lib/app/`.

## Environment variables and secrets

- Never commit API keys, Firebase config, or backend URLs directly in source.
- Use `--dart-define-from-file=env/dev.json` (preferred, no extra package) or `flutter_dotenv` if runtime loading is needed.
- Add `env/*.json` (except `env/example.json`) to `.gitignore`.
- CI/CD injects the real values as pipeline secrets — see `flutter-cicd`.

## Checklist before writing any feature code
- [ ] FVM pinned, `.fvmrc` committed
- [ ] Three flavors configured and each one runs
- [ ] `.gitignore` excludes env files and keystores
- [ ] `flutter analyze` and `flutter pub get` run clean on a fresh clone
