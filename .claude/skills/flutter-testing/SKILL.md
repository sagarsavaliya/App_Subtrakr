---
name: flutter-testing
description: Use whenever writing tests, reviewing test coverage, or setting up test infrastructure for a Flutter app — unit, widget, or integration tests. Trigger on "test", "unit test", "widget test", "integration test", "mock", "coverage" — also apply proactively when finishing any new feature, since untested feature code should not be considered done.
---

# Testing — Akshara Technologies Standards

Every non-trivial feature ships with tests at the appropriate level — treat "add tests" as part of the definition of done, not a separate follow-up task.

## Test pyramid for Flutter
- **Unit tests** (most numerous): domain logic, repositories (with mocked datasources), providers/blocs/cubits, utility functions
- **Widget tests** (moderate): individual screens/components render correctly and respond to interaction, using mocked providers
- **Integration tests** (fewest, most expensive): critical end-to-end flows only — login, checkout/purchase, core feature happy path — not every possible flow

## Tooling
- `mockito` (with `build_runner` codegen) or `mocktail` (no codegen, simpler) for mocking repositories/datasources in unit and widget tests — pick one project-wide.
- `bloc_test` if the project uses Bloc/Cubit — asserts exact state sequences emitted.
- `integration_test` package (official) for end-to-end flows, run via `flutter test integration_test`.

## Unit test structure
- Mock at the repository interface boundary — test providers/blocs against mocked repositories, not real network calls.
- Test both success and failure paths for every repository method consumer — don't only test the happy path.

```dart
test('returns Failure when repository throws', () async {
  when(() => mockRepo.fetchUser()).thenThrow(NetworkException());
  final result = await useCase.execute();
  expect(result, isA<Failure>());
});
```

## Widget tests
- Wrap widgets under test with the same provider overrides pattern used in production (`ProviderScope(overrides: [...])` for Riverpod) — test the widget as it will actually run, not in isolation from its provider dependencies.
- Use `find.byKey` with explicit `Key`s for elements tests need to target — don't rely on fragile text-matching for interactive elements that might be localized later.

## Coverage
- Run `flutter test --coverage`, review via `genhtml coverage/lcov.info -o coverage/html`.
- Target meaningful coverage on `domain/` and `data/` layers (business logic, repositories) — 100% coverage on `presentation/` widget code is usually not worth the effort; prioritize logic over pixels.
- Gate CI on coverage not dropping below the project's agreed threshold (see flutter-cicd) rather than an arbitrary absolute number chosen without context.

## Checklist per feature
- [ ] Repository/provider unit tests cover success + failure paths
- [ ] Critical screens have at least a smoke widget test
- [ ] Any critical user flow (auth, purchase, core action) has an integration test
- [ ] `flutter test` passes clean in CI before merge
