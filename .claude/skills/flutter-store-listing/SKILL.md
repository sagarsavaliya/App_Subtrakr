---
name: flutter-store-listing
description: Use whenever preparing store listing content, ASO (app store optimization), screenshots, or store metadata for Play Store or App Store submission. Trigger on "store listing", "ASO", "app description", "screenshots", "keywords", "app icon design".
---

# Store Listing & ASO — Akshara Technologies Standards

This is non-code deliverable prep, but part of the release checklist — flag these as needed even in code-focused sessions when a release is approaching.

## App name and description
- **Play Store**: title (30 chars), short description (80 chars), full description (4000 chars) — front-load key terms in the short description, since it's what shows in search results before "read more."
- **App Store**: name (30 chars), subtitle (30 chars), keyword field (100 chars, comma-separated, not shown to users but indexed for search) — App Store keyword strategy is meaningfully different from Play Store's natural-language description indexing.
- Research keywords via each store's own search suggestions and competitor listings rather than guessing — actual search behavior differs between the two stores.

## Screenshots and preview video
- Required sizes vary by device class on each store — check current requirements before generating assets, as required sizes have changed over time on both platforms.
- Show actual app UI, not purely marketing graphics — both stores' guidelines require screenshots to represent real app functionality.
- First 2-3 screenshots matter most (visible before scrolling) — lead with the core value proposition, not settings/onboarding screens.
- A short preview video (15-30s) meaningfully improves conversion on both stores if the product/budget allows for one.

## App icon
- Design for both platforms' shape conventions (Android adaptive icon with separate foreground/background layers; iOS square with the system applying corner rounding) — a single icon asset naively reused across both often looks wrong on one platform.
- Test legibility at the smallest displayed size (e.g., home screen on older/lower-DPI devices), not just at the large App Store preview size.

## Privacy policy
Required by both stores regardless of how much data the app actually collects — host a real, accurate, accessible privacy policy page before submission; this blocks submission entirely if missing.

## Localization (if targeting multiple markets)
Both stores support localized store listings per market — prioritize localizing the listing itself even before fully localizing the app UI, if targeting non-English-primary markets, since it directly affects discovery/conversion.

## Checklist
- [ ] Description keyword strategy researched per-store, not copy-pasted between Play Store and App Store
- [ ] Screenshots show real app UI at all required sizes
- [ ] Icon tested for legibility at small sizes on both platforms' shape conventions
- [ ] Privacy policy live and linked before submission
