---
name: flutter-saas-billing
description: Use whenever implementing in-app purchases, subscriptions, or SaaS billing in a Flutter app. Trigger on "subscription", "in-app purchase", "IAP", "billing", "RevenueCat", "Stripe", "paywall", "entitlement" — relevant for Akshara's own SaaS products specifically, not typical client service-based apps.
---

# SaaS Billing & Subscriptions — Akshara Technologies Standards

Applies specifically to Akshara's own subscription-based SaaS products built in Flutter — most client service-based apps won't need this skill.

## Platform requirement (critical, store-policy-driven)
- **Digital goods/subscription content consumed within the app** (premium features, content unlocks, ad removal) must go through **Apple IAP** on iOS and **Google Play Billing** on Android — this is a hard App Store/Play Store policy, not optional, and linking to an external checkout page for this category of purchase is a rejection/removal reason on both stores.
- **Physical goods or services consumed outside the app** (e.g., a service marketplace booking) are exempt from this requirement and can use external payment processors like Stripe directly.
- If the SaaS product also has a web app with its own billing, decide deliberately whether mobile subscribers are managed through store billing (simpler compliance, store takes a cut) or whether the product is positioned to route mobile users to the web for signup (allowed only if the app doesn't also offer in-app purchase of the same entitlement — "reader apps" have some nuance here; verify current store policy for the specific product category before assuming an exemption applies).

## Recommended tooling: RevenueCat
Use RevenueCat as the cross-platform subscription management layer over native IAP — handles receipt validation, entitlement management, and analytics across both App Store and Play Store from one API, meaningfully reducing the native IAP integration complexity versus hand-rolling `in_app_purchase` package logic directly.

- Define products/entitlements in RevenueCat dashboard, mirrored to App Store Connect and Play Console product IDs.
- Use RevenueCat's `Offerings`/`Packages` to drive paywall UI so pricing/plan changes don't require an app update.

## Entitlement checks
- Check subscription entitlement status via RevenueCat's customer info (cached + refreshed), gating feature access in the domain/provider layer (see flutter-architecture) — never gate purely in UI where a user could bypass by navigating around a screen check.
- Handle grace periods and billing retry states (a lapsed card doesn't mean instant cutoff on either platform) — RevenueCat surfaces these states; design the UI to communicate "payment issue, update your billing" rather than an abrupt feature lock.

## Receipt validation
Server-side validation is strongly recommended over client-only checks, to prevent tampering — RevenueCat handles this automatically if used; if hand-rolling, validate receipts against Apple/Google's server APIs from your backend, never trust a client-reported "purchase successful" alone for granting entitlements.

## Restore purchases
Required by both stores — implement an explicit "Restore Purchases" button (iOS in particular requires this to be discoverable, typically in settings or the paywall itself), since users reinstalling or switching devices need a way to recover an active subscription without repurchasing.

## Free trial / promotional offers
Configure trial periods and introductory pricing at the store level (App Store Connect / Play Console product config), not in app code — the stores own trial-eligibility logic (e.g., preventing a user from re-using a trial).

## Checklist
- [ ] Digital-goods entitlements purchased via Apple IAP / Google Play Billing, not external checkout
- [ ] Entitlement gating happens in domain/provider layer, not only hidden UI
- [ ] Restore Purchases implemented and discoverable
- [ ] Server-side (or RevenueCat-mediated) receipt validation, not client-trust-only
