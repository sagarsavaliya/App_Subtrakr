---
name: flutter-state-management
description: Use whenever implementing or reviewing state management in a Flutter app — Riverpod, Bloc, Provider, or flutter_hooks. Trigger on "state management", "provider", "riverpod", "bloc", "cubit", "hooks", "setState", or whenever a widget needs to hold or react to changing data, even if not explicitly requested.
---

# State Management — Akshara Technologies Standards

## Default choice: Riverpod 2.x with code generation
Use `riverpod_generator` (`@riverpod` annotations) as the project default unless the client/project explicitly requires Bloc (common in larger enterprise teams that standardize on event-driven architecture).

## Riverpod conventions
- One provider file per feature-relevant concern, in `presentation/providers/`
- Use `AsyncNotifier`/`@riverpod class Foo extends _$Foo` for anything async — never manual `isLoading`/`error` booleans scattered in a plain `StateNotifier`
- Expose `AsyncValue<T>` to the UI and handle it with `.when(data:, loading:, error:)` — never unwrap with `.value!` in the widget tree
- Use `ref.watch(provider.select((s) => s.field))` when a widget only needs one field, to avoid unnecessary rebuilds
- Keep providers free of `BuildContext` — pass what's needed as parameters instead

## Bloc conventions (when the project uses Bloc instead)
- One `Bloc`/`Cubit` per feature, events as sealed classes, states as sealed classes (via `freezed`)
- Business logic lives in the Bloc, not in the widget's `BlocListener`/`BlocBuilder` callbacks
- Use `bloc_test` for testing (see flutter-testing)

## flutter_hooks
Allowed only for local, ephemeral UI state (animation controllers, text controllers, scroll controllers) — never for business/domain state. If you're tempted to put API data in a hook, that's a sign it belongs in a provider/bloc instead.

```dart
// OK — local UI concern
final controller = useTextEditingController();

// NOT OK — this is business state, belongs in a provider
final userData = useState<User?>(null);
```

## Things to avoid
- `setState` in any widget beyond trivial local toggles (e.g., expanding a card) — never for anything that touches a repository or API
- `Provider` (the older package) mixed into new code once a project has standardized on Riverpod — pick one and stay consistent
- Business logic inside `build()` methods — providers/blocs own logic, widgets only render

## Checklist
- [ ] Async state uses `AsyncValue`/equivalent, not manual booleans
- [ ] No API/repository calls directly inside a widget's `build()`
- [ ] Providers are unit-testable without a widget tree
- [ ] `.select()` used where a widget needs only part of the state
