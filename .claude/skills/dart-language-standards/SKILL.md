---
name: dart-language-standards
description: Use whenever writing or reviewing Dart code for style, null safety, code generation, or linting — applies across all Flutter work, not just when explicitly asked about "Dart style." Trigger on any .dart file edit, "lint", "null safety", "freezed", "json_serializable", "build_runner", "code style".
---

# Dart Language Standards — Akshara Technologies

## Linting
Use `flutter_lints` (or `very_good_analysis` for stricter rules) as the base `analysis_options.yaml`. Never disable a lint rule inline without a comment explaining why. Run `flutter analyze` clean before considering any task done — zero warnings, not just zero errors.

## Null safety
- No `!` (bang operator) unless truly guaranteed non-null by prior logic in the same scope — prefer `if (x != null)` narrowing or `?.`/`??`.
- Avoid `late` unless the field is genuinely initialized before first use (e.g., in `initState`) — misusing `late` just defers null errors to runtime.

## Code generation stack
- **Immutable models/entities**: `freezed` — gives `copyWith`, equality, and union types (great for `sealed` state classes) for free.
- **JSON serialization**: `json_serializable` paired with `freezed` (`@freezed` + `factory .fromJson`).
- **DI**: `injectable_generator` (see flutter-architecture).

Run `dart run build_runner build --delete-conflicting-outputs` after modifying any annotated class. Never hand-edit `.g.dart` or `.freezed.dart` files.

## Naming and style (Effective Dart, enforced)
- Files: `snake_case.dart`
- Classes/enums/typedefs: `UpperCamelCase`
- Variables/functions/parameters: `lowerCamelCase`
- Private members: prefix `_`
- Avoid abbreviations Claude might be tempted to shorten (`btn`, `usr`) — write `button`, `user` in full for readability across the team.

## Error handling pattern
Prefer a `Result<T>`/`Either<Failure, T>` return type over throwing across layer boundaries (use `fpdart` or `dartz` if the team wants a typed `Either`, otherwise a simple sealed `Result` class is fine — pick one and stay consistent project-wide).

```dart
sealed class Result<T> {}
class Success<T> extends Result<T> { final T data; Success(this.data); }
class Failure<T> extends Result<T> { final String message; Failure(this.message); }
```

## Checklist
- [ ] `flutter analyze` — zero issues
- [ ] `dart format .` run before commit
- [ ] No hand-edited generated files
- [ ] No bare `!` without a preceding null check in the same function
