---
name: cross-platform-design-consistency
description: Use whenever designing something that needs to feel consistent across the Flutter app and the Next.js web surfaces (marketing site, tenant dashboard, admin dashboard) — a shared design token, a component that exists in both, brand identity decisions. Trigger on "cross-platform", "consistent branding", "design tokens across platforms", "same look and feel", "brand consistency" — apply when a design decision on one platform has implications for the other.
---

# Cross-Platform Design Consistency — Akshara Technologies Standards

Akshara's SaaS product spans Flutter (mobile) and Next.js (marketing site, tenant dashboard, admin dashboard). A tenant's staff and customers may use both the mobile app and the web dashboard — they should recognize it as one coherent product, not two independently-designed apps that happen to share a backend. This skill sits above `frontend-design-system` (web) and `flutter-design-identity` (mobile) — it's the discipline that keeps those two skills' outputs aligned rather than independently distinctive in different directions.

## What must be shared vs what can differ

**Shared across all platforms (non-negotiable):**
- Core brand palette — primary, secondary/accent colors, at minimum. Both platforms derive from the same named hex values, not independently "inspired by" the same general feeling.
- Logo, wordmark, and any brand iconography used in headers/navigation.
- Core type personality — if the brand voice is "confident and modern" with a geometric sans headline face on web, the mobile app's headline face should carry the same character (doesn't need to be the literal same font file if a platform-native equivalent renders better, but the personality must match).
- Voice and tone in copy — button labels, empty states, error messages should sound like the same product wrote them (see the writing/UX-copy guidance in `frontend-design-system`, applied identically in Flutter).
- Iconography style — if choosing a custom or curated icon set on web, use the same set (or a deliberately matched equivalent) on mobile, not Material default icons on mobile against a different custom set on web.

**Reasonably differs by platform (expected, not a consistency failure):**
- Information density — dashboards (especially super admin) can be denser than mobile screens, which need more breathing room for touch targets.
- Navigation pattern — bottom nav / drawer on mobile vs sidebar on web dashboard is normal and expected, not an inconsistency.
- Motion — platform-idiomatic transitions (iOS/Android native-feeling gestures on mobile, web-appropriate scroll/hover interactions on desktop) rather than forcing identical animation curves cross-platform.
- Marketing site vs dashboard vs mobile app register — the marketing site can be the boldest/most expressive; the mobile app and dashboards should feel more restrained/task-focused, as already noted in both underlying design skills.

## Maintaining a single source of truth for shared tokens
Practically, avoid three independently-maintained copies of "the brand colors" (one in Tailwind config, one in Flutter's `ColorScheme`, one in a design tool) silently drifting apart over time:
- Maintain one canonical token definition (e.g., a small JSON/YAML file or a Figma/design-tool source of truth) listing the named palette, type scale, and spacing scale.
- Generate or manually sync the Tailwind theme config (web) and Flutter `ThemeData`/`ColorScheme` (mobile) from that canonical source — even a manual "update both when the source changes" discipline is far better than each platform's designer/developer picking values independently.
- When a brand color changes, treat it as one change applied to both platforms in the same work session, not a web-only or mobile-only update that leaves the other platform stale.

## Testing consistency in practice
When reviewing a new feature that touches both platforms (e.g., a notification preferences screen that exists in both the dashboard and the app), place screenshots of both side by side and check: same core colors, same type personality, same tone of copy, same iconography language — even though layout and density will differ.

## When platforms genuinely should look different — say so explicitly
Not every difference is a bug. If the marketing site takes a bolder creative risk than the dashboard (per `frontend-design-system`'s own guidance that marketing can carry more personality than dashboards), that's an intentional register difference, not an inconsistency — the point of this skill is to catch *accidental* drift (a color picked independently that's close-but-not-identical to the brand primary, an icon set that doesn't match, a tone of voice that reads differently), not to flatten every platform into identical treatment.

## Checklist for any feature spanning multiple platforms
- [ ] Palette values match the canonical brand tokens exactly, not independently eyeballed per platform
- [ ] Copy/tone reads as the same product's voice across web and mobile
- [ ] Iconography style matches or is deliberately equivalent, not mismatched icon libraries
- [ ] Any intentional register difference (density, motion, navigation pattern) is a deliberate platform-appropriate choice, not accidental drift
