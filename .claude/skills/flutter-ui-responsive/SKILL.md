---
name: flutter-ui-responsive
description: Use whenever building UI, layouts, theming, or responsive/adaptive design in a Flutter app. Trigger on "UI", "layout", "responsive", "theme", "dark mode", "adaptive", "accessibility", "widget design".
---

# UI & Responsive Design — Akshara Technologies Standards

## Responsive/adaptive layout
- Use `LayoutBuilder`/`MediaQuery` breakpoints rather than hardcoded pixel assumptions — target phone, tablet, and (if relevant) foldable/desktop-web breakpoints explicitly.
- Avoid fixed pixel widths for anything that should scale — prefer `Expanded`/`Flexible`/percentage-based sizing within constraints.
- Test on at least one small phone, one large phone, and one tablet size during development, not only the default simulator size.

## Theming
- Centralize theme in `ThemeData`/`ColorScheme` — no hardcoded `Colors.blue` or raw hex colors scattered through widgets; reference `Theme.of(context).colorScheme.primary` etc.
- Implement dark mode via `ThemeMode.system` by default (respecting OS setting), with an in-app override option if the product wants one — don't ship light-mode-only in 2026 for a consumer-facing app unless there's a specific product reason.
- Define a type scale (`TextTheme`) rather than ad-hoc `TextStyle(fontSize: 16)` calls throughout the app.

## Accessibility
- All interactive elements need a minimum 48x48dp touch target (Android) / 44x44pt (iOS) — required for both usability and store review in some categories.
- Provide `Semantics` labels for icon-only buttons and images that convey meaning — screen reader users need equivalent context.
- Verify color contrast meets WCAG AA at minimum for text against its background, especially in dark mode.
- Support system font scaling (`MediaQuery.textScaler`) — don't lock text to a fixed size that ignores the user's accessibility settings, unless a specific layout genuinely breaks and needs a capped max scale.

## Component reuse
Build a shared `widgets/` library for common elements (buttons, form fields, cards) reused across features — avoid every screen reimplementing its own button styling. Akshara's SaaS products in particular benefit from a consistent internal design-system layer, since it's reused across multiple client-facing surfaces.

## Loading/empty/error states
Every screen displaying async data needs explicit UI for all of: loading, empty (zero results, distinct from error), and error states — "just show a spinner forever" or a raw exception message are not acceptable production states.

## Checklist
- [ ] No hardcoded colors bypassing the theme
- [ ] Dark mode works and was actually tested, not just assumed to inherit correctly
- [ ] Touch targets meet minimum size on all interactive elements
- [ ] Loading/empty/error states all implemented, not just the happy path
