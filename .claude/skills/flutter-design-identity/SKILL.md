---
name: flutter-design-identity
description: Use whenever designing or building any visible UI in the Flutter app — screens, components, theming, onboarding, empty/error states. Trigger on "design", "UI", "screen design", "theme", "make it look good", "onboarding flow" — apply proactively on ANY visual work in the Flutter app, alongside flutter-ui-responsive, since Akshara's standard is a distinctive product identity, never a generic Material-default or AI-template look.
---

# Flutter Design Identity — Akshara Technologies Standards

This is the mobile counterpart to `frontend-design-system` (the web design skill) — same mandate: a deliberate, premium, recognizable product identity, never a generic AI-generated or unmodified-framework-default look. `flutter-ui-responsive` covers the engineering side (theming mechanics, accessibility, responsive layout); this skill covers the aesthetic judgment layered on top of it.

## The core mandate: avoid the recognizable "generic Flutter AI app" look
Be actively aware of patterns that make a Flutter app read as templated or AI-scaffolded, and avoid them unless a specific brief calls for one:
- Unmodified Material 3 defaults — the out-of-the-box `ColorScheme.fromSeed()` purple, default `Card` elevation/shadow, default `ElevatedButton` styling used everywhere with zero customization
- The generic "purple-to-blue gradient hero + white rounded cards + soft drop shadows" look that shows up across countless template apps and AI-generated mockups
- Bottom nav with exactly 4-5 icons in the default Material icon set, no custom iconography, no distinct selected-state treatment beyond a color change
- Onboarding screens that are 3 generic slides of "illustration + headline + body text + skip/next" with stock-style flat illustrations that could belong to any app
- Every card, button, and input using the same single border-radius and the same single shadow value with no hierarchy between primary and secondary surfaces

## Design process — plan before building
Same discipline as the web design skill, adapted for mobile:
1. **Ground it in the actual product** — is this screen for a tenant's staff user (task-focused, information-dense) or their end customer (should feel lighter, more consumer-facing)? Akshara's Flutter app likely serves both tiers with different needs — don't apply one visual register uniformly if the audiences genuinely differ.
2. **Define a token system**: named color palette (not just Material's default seed-color derivation used blindly), 2 type roles minimum (display/headline face, body face — Flutter's default type scale via `GoogleFonts` or a custom font, not left at the system default), a spacing/radius scale that's consistent but distinct to this product, and one signature interaction or visual element this app will be remembered by.
3. **Self-critique against the generic patterns above** before implementing.

## Theming in Flutter — going beyond `ColorScheme.fromSeed()`
`ColorScheme.fromSeed()` is a fast starting point, not a finished palette — it algorithmically derives tones and is exactly why so many Flutter apps end up looking similar. Define the full `ColorScheme` deliberately, or at minimum override the seed-derived values that matter most (primary, surface, error) with intentional choices tied to the brand.

```dart
final colorScheme = ColorScheme(
  brightness: Brightness.light,
  primary: const Color(0xFF...), // deliberate, not seed-derived
  // ...define surface, error, and tonal variants deliberately
);
```

## Typography
- Pick a real typeface pairing via `google_fonts` or bundled custom fonts — the default system font (Roboto on Android, San Francisco on iOS) is fine as a neutral body face, but a headline/display face with actual character differentiates the app from default Material apps.
- Define a real `TextTheme` with intentional weight and size choices (see `flutter-ui-responsive` for the mechanics) — don't leave `displayLarge`/`headlineMedium`/etc. at Flutter's defaults.

## Iconography and illustration
- Prefer a consistent custom icon set (or a carefully curated subset of an icon library like Phosphor/Lucide with consistent stroke width) over mixing default Material icons ad hoc — visual consistency in iconography is a strong, cheap signal of design intentionality.
- If illustrations are used (empty states, onboarding), commission or select a style with a distinct point of view — avoid the generic flat-vector-people-with-oversized-heads style that's extremely common in template apps and instantly reads as stock.

## Motion
Flutter's animation system (implicit animations, `Hero` transitions, custom `AnimationController` sequences) is a genuine differentiator when used deliberately:
- A well-crafted screen transition or a signature micro-interaction (e.g., a distinctive success-state animation on completing a key action) is worth the investment — it's often the most memorable part of a mobile app's feel.
- Avoid decorative animation with no purpose (things wiggling/pulsing with no state meaning) — same principle as the web skill: motion should communicate, not decorate, especially in task-focused dashboard-style screens.
- Respect reduced-motion accessibility settings (`MediaQuery.disableAnimations`) — same quality floor as web.

## Empty, loading, and error states as design opportunities
Generic apps show a spinner or a gray box. A well-designed app treats these as moments to reinforce identity — a custom empty-state illustration matching the app's visual language, a loading skeleton shaped like the actual content (not a generic spinner) reduces perceived wait and looks considerably more polished.

## Consistency across staff-facing and customer-facing surfaces
If the Flutter app serves both a tenant's staff and their end customers (per Akshara's SaaS model), both surfaces should share the same core design tokens (palette, type, iconography) while allowing appropriate register differences — staff/admin screens can be denser and more utilitarian, customer-facing screens more spacious and consumer-friendly — without feeling like two unrelated apps.

## Checklist for any new screen
- [ ] Checked against the generic-Flutter-app patterns list — actively avoided unless deliberately chosen
- [ ] `ColorScheme` deliberately defined, not left as an unexamined `fromSeed()` default
- [ ] Custom or curated typography, not Flutter's default system type scale untouched
- [ ] Empty/loading/error states designed intentionally, not generic spinners/gray boxes
- [ ] Motion used to communicate state, not purely decorative, and respects reduced-motion settings
