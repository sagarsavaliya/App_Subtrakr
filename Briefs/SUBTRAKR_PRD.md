# SubTrakr — Product Requirements Document
### Flutter Mobile Application · v1.0
**Domain:** subtrakr.me  
**Platform:** Android (primary) · iOS (secondary)  
**Stack:** Flutter 3.x · Dart · Supabase · Firebase Messaging  
**Document owner:** Akshara Technologies  
**Last updated:** May 2026  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Personas](#3-user-personas)
4. [Feature Scope — MVP](#4-feature-scope--mvp)
5. [Architecture & Tech Stack](#5-architecture--tech-stack)
6. [Data Models](#6-data-models)
7. [Screen Inventory & UX Spec](#7-screen-inventory--ux-spec)
8. [Design System](#8-design-system)
9. [Sprint Plan](#9-sprint-plan)
10. [Story Definitions](#10-story-definitions)
11. [Testing Strategy](#11-testing-strategy)
12. [Build & Release](#12-build--release)
13. [Cursor Agent Instructions](#13-cursor-agent-instructions)

---

## 1. Product Overview

### 1.1 Problem Statement

Professionals, founders, and individuals managing multiple subscriptions face three recurring problems:

1. **Forgetting renewals** — subscriptions auto-debit or lapse because there is no unified view of what is due and when.
2. **Personal vs business expense mixing** — no separation between personal (Netflix, mobile recharge) and business (Claude, AWS, Cursor) subscriptions, making GST reconciliation painful.
3. **Invoice hunting** — finding invoices for CA/GST filing requires digging through emails, SMS, and app portals across dozens of vendors.

### 1.2 Solution

**SubTrakr** is a mobile-first subscription management app that:

- Tracks all recurring costs in one place, separated by entity (personal / company)
- Passively detects payments via SMS and notification parsing and prompts one-tap confirmation
- Stores invoices per subscription per billing cycle
- Generates CA-ready GST export reports filtered by company and period
- Reminds users before renewals with actionable push notifications

### 1.3 Tagline
> *All your subscriptions. Tracked. Sorted.*

### 1.4 Platform
- **MVP:** Android APK (Play Store + direct APK distribution)
- **Phase 2:** iOS (App Store)
- **Phase 3:** Web dashboard (Flutter Web)

---

## 2. Goals & Success Metrics

| Goal | Metric | Target (90 days post-launch) |
|------|--------|------------------------------|
| Core adoption | DAU/MAU ratio | > 40% |
| Activation | Users who add ≥ 3 subscriptions | > 70% of installs |
| Retention | Day-30 retention | > 35% |
| Key feature | % users who tap "Yes" on payment nudge | > 60% |
| Monetisation | Free → Pro conversion | > 8% |
| Quality | Crash-free sessions | > 99.2% |

---

## 3. User Personas

### Persona A — "The Founder" (Primary)
- Age 28–45, runs 1–2 companies, has 15–30 subscriptions
- Mixes personal and business expenses regularly
- Has a CA who asks for GST invoices every quarter
- Uses HDFC/ICICI credit card + GPay/PhonePe

### Persona B — "The Professional"
- Age 24–35, salaried or freelancer
- 8–15 subscriptions, mostly personal
- Forgets renewal dates, frustrated by unexpected debits
- Primarily Android user

### Persona C — "The SME Finance Manager"
- Age 30–50, manages company subscriptions for a team
- Needs reports, not reminders
- B2B SaaS angle — Team plan target

---

## 4. Feature Scope — MVP

### In Scope (v1.0)

| # | Feature | Priority |
|---|---------|----------|
| F1 | User auth (email + Google SSO + Mobile with 6 digit PIN) | P0 |
| F2 | Entity management (Personal + Companies) | P0 |
| F3 | Add / edit / delete subscription | P0 |
| F4 | Dashboard — spend summary + due this week | P0 |
| F5 | Smart reminders — push notification before due | P0 |
| F6 | Mark as paid (manual + one-tap from notification) | P0 |
| F7 | SMS payment parser + confirmation nudge | P1 |
| F8 | Invoice vault — attach PDF/image per cycle | P1 |
| F9 | Reports screen — monthly spend by entity/category | P1 |
| F10 | GST export — PDF + CSV by company + period | P1 |
| F11 | Service catalogue — 100+ pre-loaded services | P1 |
| F12 | Payment method management | P2 |
| F13 | Trial end date tracking + alert | P2 |
| F14 | Multi-currency with INR conversion | P2 |
| F15 | Data export (full backup CSV) | P2 |

### Out of Scope (v1.0)
- Bank account / UPI integration (open banking)
- Team / shared workspace
- Web dashboard
- iOS build
- WhatsApp notification channel
- Receipt OCR (auto-extract invoice data)

---

## 5. Architecture & Tech Stack

### 5.1 Flutter App Architecture

```
lib/
├── main.dart
├── app.dart                         # MaterialApp, routing, theme
├── core/
│   ├── constants/
│   │   ├── app_colors.dart
│   │   ├── app_text_styles.dart
│   │   ├── app_spacing.dart
│   │   └── app_strings.dart
│   ├── theme/
│   │   └── app_theme.dart
│   ├── router/
│   │   └── app_router.dart          # GoRouter
│   ├── utils/
│   │   ├── date_utils.dart
│   │   ├── currency_utils.dart
│   │   ├── sms_parser.dart
│   │   └── notification_parser.dart
│   └── extensions/
│       ├── string_extensions.dart
│       └── datetime_extensions.dart
│
├── data/
│   ├── models/
│   │   ├── subscription_model.dart
│   │   ├── entity_model.dart
│   │   ├── invoice_model.dart
│   │   ├── payment_method_model.dart
│   │   └── payment_history_model.dart
│   ├── repositories/
│   │   ├── subscription_repository.dart
│   │   ├── entity_repository.dart
│   │   ├── invoice_repository.dart
│   │   └── auth_repository.dart
│   └── datasources/
│       ├── supabase_datasource.dart
│       └── local_datasource.dart    # Hive for offline
│
├── domain/
│   ├── entities/
│   ├── usecases/
│   │   ├── get_subscriptions.dart
│   │   ├── add_subscription.dart
│   │   ├── mark_paid.dart
│   │   ├── parse_sms.dart
│   │   └── generate_gst_report.dart
│   └── repositories/               # Abstract interfaces
│
├── presentation/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── splash_screen.dart
│   │   │   ├── onboarding_screen.dart
│   │   │   └── login_screen.dart
│   │   ├── dashboard/
│   │   │   └── dashboard_screen.dart
│   │   ├── subscriptions/
│   │   │   ├── subscriptions_list_screen.dart
│   │   │   ├── add_subscription_screen.dart
│   │   │   └── subscription_detail_screen.dart
│   │   ├── reports/
│   │   │   └── reports_screen.dart
│   │   ├── entities/
│   │   │   ├── entities_screen.dart
│   │   │   └── add_entity_screen.dart
│   │   └── settings/
│   │       └── settings_screen.dart
│   ├── widgets/
│   │   ├── common/
│   │   │   ├── app_button.dart
│   │   │   ├── app_text_field.dart
│   │   │   ├── app_bottom_sheet.dart
│   │   │   ├── status_pill.dart
│   │   │   ├── entity_chip.dart
│   │   │   └── service_logo_circle.dart
│   │   ├── dashboard/
│   │   │   ├── hero_summary_card.dart
│   │   │   ├── due_card.dart
│   │   │   └── subscription_list_tile.dart
│   │   └── subscription/
│   │       ├── service_search_field.dart
│   │       └── billing_cycle_selector.dart
│   └── providers/                  # Riverpod providers
│       ├── auth_provider.dart
│       ├── subscription_provider.dart
│       ├── entity_provider.dart
│       └── report_provider.dart
│
└── services/
    ├── notification_service.dart
    ├── sms_listener_service.dart
    ├── storage_service.dart         # Supabase Storage for invoices
    └── export_service.dart          # PDF/CSV generation
```

### 5.2 Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Flutter 3.19+ | Cross-platform, single codebase |
| Language | Dart 3.x | Null safety, modern patterns |
| State management | Riverpod 2.x | Scalable, testable, compile-safe |
| Navigation | GoRouter 12.x | Declarative, deep link ready |
| Backend | Supabase | Postgres + Auth + Storage + Realtime |
| Local cache | Hive 2.x | Offline support, fast reads |
| Notifications | flutter_local_notifications | Local scheduled alerts |
| Push | Firebase Cloud Messaging | Remote push delivery |
| SMS reading | telephony / sms_advanced | Android SMS parsing |
| PDF export | pdf (dart) | Pure Dart PDF generation |
| Charts | fl_chart | Donut + bar charts in reports |
| File picker | file_picker | Invoice attachment |
| Image/PDF viewer | flutter_pdfview | In-app invoice preview |
| Google fonts | google_fonts | DM Sans + DM Mono |
| Animations | flutter_animate | Micro-interactions |
| Icons | flutter_svg + cupertino_icons | Service logos + UI icons |
| DI | Riverpod (built-in) | No separate DI needed |
| HTTP | Supabase client (built-in) | All API via Supabase SDK |
| Env config | flutter_dotenv | .env for Supabase keys |
| Logging | logger | Debug + production logging |

### 5.3 Supabase Schema

```sql
-- Entities (personal or company)
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('personal', 'company')) NOT NULL,
  gst_number TEXT,
  default_payment_method_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Methods
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  label TEXT NOT NULL,
  type TEXT CHECK (type IN ('card', 'upi', 'netbanking', 'wallet')) NOT NULL,
  last_four TEXT,
  upi_id TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  entity_id UUID REFERENCES entities NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  billing_cycle TEXT CHECK (billing_cycle IN ('weekly','monthly','quarterly','half_yearly','yearly','custom')) NOT NULL,
  custom_cycle_days INTEGER,
  start_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  end_date DATE,
  trial_end_date DATE,
  status TEXT CHECK (status IN ('active','paused','cancelled','trial')) DEFAULT 'active',
  is_auto_debit BOOLEAN DEFAULT FALSE,
  payment_method_id UUID REFERENCES payment_methods,
  is_gst_applicable BOOLEAN DEFAULT FALSE,
  vendor_gstin TEXT,
  gst_rate DECIMAL(5,2),
  hsn_sac_code TEXT,
  website_url TEXT,
  remind_days_before INTEGER DEFAULT 3,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment History
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  paid_date DATE NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  source TEXT CHECK (source IN ('manual','sms_detected','auto')) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  payment_history_id UUID REFERENCES payment_history,
  invoice_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  invoice_number TEXT,
  file_url TEXT,
  file_name TEXT,
  is_gst_invoice BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (enable on all tables)
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies (example for subscriptions)
CREATE POLICY "Users see own subscriptions"
  ON subscriptions FOR ALL
  USING (auth.uid() = user_id);
```

---

## 6. Data Models (Dart)

### 6.1 Subscription Model

```dart
// lib/data/models/subscription_model.dart

enum BillingCycle { weekly, monthly, quarterly, halfYearly, yearly, custom }
enum SubscriptionStatus { active, paused, cancelled, trial }
enum SubscriptionCategory {
  devTools, entertainment, telecom, cloud, saas,
  utility, storage, security, productivity, other
}

class SubscriptionModel {
  final String id;
  final String userId;
  final String entityId;
  final String name;
  final String? logoUrl;
  final SubscriptionCategory category;
  final double amount;
  final String currency;
  final BillingCycle billingCycle;
  final int? customCycleDays;
  final DateTime startDate;
  final DateTime nextDueDate;
  final DateTime? endDate;
  final DateTime? trialEndDate;
  final SubscriptionStatus status;
  final bool isAutoDebit;
  final String? paymentMethodId;
  final bool isGstApplicable;
  final String? vendorGstin;
  final double? gstRate;
  final String? hsnSacCode;
  final String? websiteUrl;
  final int remindDaysBefore;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Computed
  bool get isOverdue => nextDueDate.isBefore(DateTime.now()) && status == SubscriptionStatus.active;
  bool get isDueSoon => nextDueDate.difference(DateTime.now()).inDays <= remindDaysBefore;
  double get monthlyEquivalent => _toMonthly();

  double _toMonthly() {
    switch (billingCycle) {
      case BillingCycle.weekly: return amount * 4.33;
      case BillingCycle.monthly: return amount;
      case BillingCycle.quarterly: return amount / 3;
      case BillingCycle.halfYearly: return amount / 6;
      case BillingCycle.yearly: return amount / 12;
      case BillingCycle.custom: return amount / ((customCycleDays ?? 30) / 30);
    }
  }

  DateTime computeNextDue(DateTime fromDate) {
    switch (billingCycle) {
      case BillingCycle.weekly: return fromDate.add(const Duration(days: 7));
      case BillingCycle.monthly: return DateTime(fromDate.year, fromDate.month + 1, fromDate.day);
      case BillingCycle.quarterly: return DateTime(fromDate.year, fromDate.month + 3, fromDate.day);
      case BillingCycle.halfYearly: return DateTime(fromDate.year, fromDate.month + 6, fromDate.day);
      case BillingCycle.yearly: return DateTime(fromDate.year + 1, fromDate.month, fromDate.day);
      case BillingCycle.custom: return fromDate.add(Duration(days: customCycleDays ?? 30));
    }
  }
}
```

### 6.2 Entity Model

```dart
// lib/data/models/entity_model.dart

enum EntityType { personal, company }

class EntityModel {
  final String id;
  final String userId;
  final String name;
  final EntityType type;
  final String? gstNumber;
  final String? defaultPaymentMethodId;
  final DateTime createdAt;

  bool get isCompany => type == EntityType.company;
  bool get hasGst => gstNumber != null && gstNumber!.isNotEmpty;
}
```

### 6.3 SMS Parse Result

```dart
// lib/core/utils/sms_parser.dart

class SmsParseResult {
  final String vendorName;
  final double amount;
  final String currency;
  final DateTime transactionDate;
  final String rawSms;
  final double confidenceScore; // 0.0 to 1.0
  final String? matchedSubscriptionId;
}
```

---

## 7. Screen Inventory & UX Spec

### S1 — Splash Screen
- SubTrakr logo centre, teal-green gradient bg
- Auto-navigates: unauthenticated → Onboarding, authenticated → Dashboard
- Duration: 1.5s max

### S2 — Onboarding (3 slides)
- Slide 1: "All subs in one place" — dashboard mockup
- Slide 2: "Smart payment detection" — notification nudge mockup
- Slide 3: "GST reports for your CA" — export mockup
- Skip + Get Started CTA on last slide

### S3 — Login / Register
- Google SSO button (primary)
- Email + password (secondary)
- "Continue as guest" not available (cloud sync required)

### S4 — Dashboard (Home)
**Sections:**
1. Header: greeting + month + notification bell
2. Hero summary card (gradient): total spend, active count, due this week, auto-debit count
3. Entity filter chips: All / Personal / [Company names] / + Add
4. "Due this week" horizontal scroll cards
5. "All subscriptions" vertical list with swipe actions
6. FAB: + Add subscription

**Interactions:**
- Swipe list item left → Mark Paid (green) + Edit (blue)
- Tap list item → Subscription Detail
- Tap hero card → Reports screen
- Long press list item → quick actions menu

### S5 — Add Subscription (Bottom Sheet, full height)
**Fields (in order of UX priority):**
1. Service name search (with catalogue suggestions)
2. Amount + currency selector
3. Billing cycle chips
4. First charge date picker
5. Entity chip selector
6. Payment method row (auto-filled from entity)
7. Auto-debit toggle
8. [More details ▾] — notes, website, reminder days, GST override

**Behaviour:**
- Typing "Claude" → shows suggestion with logo, pre-fills ₹1650/mo, category DevTools
- Entity selection silently fills GST number + default payment method
- Next due date auto-computed below date picker in accent colour
- CTA disabled until name + amount + date filled

### S6 — Subscription Detail
**Sections:**
1. Service logo + name + chips (entity + category)
2. Status card: next due + amount + status pill
3. Quick actions: Mark Paid / Pause / Edit / Delete
4. Payment history timeline
5. Invoices list + attach button
6. GST details (collapsible)

### S7 — Payment Nudge (Bottom Sheet)
**Triggered by:** SMS parser match OR notification parser match
**Layout:**
1. "Payment detected" pill badge
2. Service logo with pulse animation
3. "Paid ₹X to [Vendor]?" heading
4. Source info: "Detected from HDFC SMS · Just now"
5. Matched subscription row with confidence indicator
6. Three actions: ✓ Yes mark paid / ✗ Not this / Remind me later
7. Micro-text: next due date if confirmed

### S8 — Reports
**Sections:**
1. Period selector (month/year toggle + prev/next)
2. Hero summary card: total + personal/business split
3. Donut chart by category (fl_chart)
4. Entity tab filter
5. Subscription breakdown list
6. GST Export section: entity + period selector + PDF/CSV buttons

### S9 — Entities & Settings
**Sections:**
1. Profile row
2. My entities (personal card + company cards + add button)
3. Payment methods
4. Notification preferences
5. SMS detection toggle
6. Data management (export/import/backup)

---

## 8. Design System

### 8.1 Color Tokens

```dart
// lib/core/constants/app_colors.dart

class AppColors {
  // Primary
  static const primary         = Color(0xFF2EC4A0);
  static const primaryDark     = Color(0xFF1A9E82);
  static const primaryLight    = Color(0xFFE6F9F5);
  static const gradientStart   = Color(0xFF2EC4A0);
  static const gradientEnd     = Color(0xFF17859E);

  // Background
  static const bgPage          = Color(0xFFF7F8FA);
  static const bgCard          = Color(0xFFFFFFFF);
  static const bgSecondary     = Color(0xFFF2F4F6);

  // Text
  static const textPrimary     = Color(0xFF1A1D23);
  static const textSecondary   = Color(0xFF6B7280);
  static const textHint        = Color(0xFFA0A8B3);

  // Status
  static const paid            = Color(0xFF2EC4A0);
  static const paidBg          = Color(0xFFE6F9F5);
  static const due             = Color(0xFFF59E0B);
  static const dueBg           = Color(0xFFFEF3C7);
  static const overdue         = Color(0xFFEF4444);
  static const overdueBg       = Color(0xFFFEE2E2);
  static const trial           = Color(0xFF8B5CF6);
  static const trialBg         = Color(0xFFEDE9FE);

  // Entity
  static const personal        = Color(0xFF6D28D9);
  static const personalBg      = Color(0xFFEDE9FE);
  static const company         = Color(0xFF0F6E56);
  static const companyBg       = Color(0xFFE6F9F5);

  // Shadows
  static const cardShadow = [
    BoxShadow(color: Color(0x12000000), blurRadius: 16, offset: Offset(0, 2))
  ];
  static const elevatedShadow = [
    BoxShadow(color: Color(0x262EC4A0), blurRadius: 32, offset: Offset(0, 8))
  ];
}
```

### 8.2 Typography

```dart
// lib/core/constants/app_text_styles.dart
// Uses google_fonts: DM Sans + DM Mono

class AppTextStyles {
  static final heroAmount    = GoogleFonts.dmMono(fontSize: 36, fontWeight: FontWeight.w700);
  static final heading1      = GoogleFonts.dmSans(fontSize: 22, fontWeight: FontWeight.w600);
  static final heading2      = GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w600);
  static final heading3      = GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600);
  static final body          = GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w400);
  static final bodyMedium    = GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w500);
  static final label         = GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w500);
  static final hint          = GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w400);
  static final amount        = GoogleFonts.dmMono(fontSize: 15, fontWeight: FontWeight.w600);
  static final amountSmall   = GoogleFonts.dmMono(fontSize: 13, fontWeight: FontWeight.w500);
}
```

### 8.3 Spacing

```dart
// lib/core/constants/app_spacing.dart

class AppSpacing {
  static const double xs   = 4.0;
  static const double sm   = 8.0;
  static const double md   = 12.0;
  static const double lg   = 16.0;
  static const double xl   = 20.0;
  static const double xxl  = 24.0;
  static const double xxxl = 32.0;

  static const double screenPadding   = 20.0;
  static const double cardPadding     = 20.0;
  static const double sectionGap      = 24.0;
  static const double listItemGap     = 12.0;
  static const double cardRadius      = 20.0;
  static const double chipRadius      = 100.0;
  static const double buttonRadius    = 16.0;
  static const double iconButtonSize  = 44.0;
}
```

### 8.4 Service Catalogue (sample — expand to 100+)

```dart
// lib/core/constants/service_catalogue.dart

class ServiceEntry {
  final String name;
  final String logoAsset;       // assets/logos/service_name.svg
  final SubscriptionCategory category;
  final double? defaultAmount;
  final String currency;
  final BillingCycle defaultCycle;
  final String? vendorGstin;
  final String? websiteUrl;
  final List<String> smsKeywords; // For SMS parser matching
}

const serviceCatalogue = [
  ServiceEntry(name: 'Claude Pro',       category: devTools,      defaultAmount: 1650,  currency: 'INR', defaultCycle: monthly,  smsKeywords: ['ANTHROPIC', 'CLAUDE']),
  ServiceEntry(name: 'Cursor Pro',       category: devTools,      defaultAmount: 1650,  currency: 'INR', defaultCycle: monthly,  smsKeywords: ['CURSOR', 'ANYSPHERE']),
  ServiceEntry(name: 'GitHub Copilot',   category: devTools,      defaultAmount: 825,   currency: 'INR', defaultCycle: monthly,  smsKeywords: ['GITHUB', 'COPILOT']),
  ServiceEntry(name: 'ChatGPT Plus',     category: devTools,      defaultAmount: 1650,  currency: 'INR', defaultCycle: monthly,  smsKeywords: ['OPENAI', 'CHATGPT']),
  ServiceEntry(name: 'Netflix',          category: entertainment, defaultAmount: 649,   currency: 'INR', defaultCycle: monthly,  smsKeywords: ['NETFLIX']),
  ServiceEntry(name: 'Hotstar',          category: entertainment, defaultAmount: 299,   currency: 'INR', defaultCycle: monthly,  smsKeywords: ['HOTSTAR', 'DISNEY']),
  ServiceEntry(name: 'Amazon Prime',     category: entertainment, defaultAmount: 1499,  currency: 'INR', defaultCycle: yearly,   smsKeywords: ['AMAZON PRIME', 'AMAZONPRIME']),
  ServiceEntry(name: 'SonyLIV',         category: entertainment, defaultAmount: 299,   currency: 'INR', defaultCycle: monthly,  smsKeywords: ['SONYLIV', 'SONY LIV']),
  ServiceEntry(name: 'Spotify',          category: entertainment, defaultAmount: 119,   currency: 'INR', defaultCycle: monthly,  smsKeywords: ['SPOTIFY']),
  ServiceEntry(name: 'YouTube Premium',  category: entertainment, defaultAmount: 139,   currency: 'INR', defaultCycle: monthly,  smsKeywords: ['YOUTUBE', 'GOOGLE']),
  ServiceEntry(name: 'AWS',             category: cloud,         defaultAmount: null,  currency: 'USD', defaultCycle: monthly,  smsKeywords: ['AMAZON WEB', 'AWS']),
  ServiceEntry(name: 'Google Workspace', category: cloud,         defaultAmount: 840,   currency: 'INR', defaultCycle: monthly,  smsKeywords: ['GOOGLE WORKSPACE', 'GSUITE']),
  ServiceEntry(name: 'Zoho',            category: saas,          defaultAmount: 1200,  currency: 'INR', defaultCycle: monthly,  smsKeywords: ['ZOHO']),
  ServiceEntry(name: 'Jio Postpaid',    category: telecom,       defaultAmount: 399,   currency: 'INR', defaultCycle: monthly,  smsKeywords: ['JIO', 'JIOFIBER', 'RELIANCE JIO']),
  ServiceEntry(name: 'Airtel',          category: telecom,       defaultAmount: 349,   currency: 'INR', defaultCycle: monthly,  smsKeywords: ['AIRTEL', 'BHARTI AIRTEL']),
  ServiceEntry(name: 'Vi (Vodafone)',   category: telecom,       defaultAmount: 299,   currency: 'INR', defaultCycle: monthly,  smsKeywords: ['VODAFONE', 'VI ', 'IDEA']),
  ServiceEntry(name: 'Tata Play',       category: telecom,       defaultAmount: 349,   currency: 'INR', defaultCycle: monthly,  smsKeywords: ['TATA PLAY', 'TATAPLAY', 'TATA SKY']),
  ServiceEntry(name: 'DishTV',          category: telecom,       defaultAmount: 299,   currency: 'INR', defaultCycle: monthly,  smsKeywords: ['DISHTV', 'DISH TV']),
  // ... expand to 100+ services
];
```

---

## 9. Sprint Plan

> **Cadence:** 1-week sprints  
> **Team assumption:** 1 Flutter dev (Cursor Agent) + 1 tester (Tester Agent)  
> **Definition of Done:** Feature works on Android emulator, passes all tests for the sprint, no P0 crashes  

---

### Sprint 0 — Project Setup (Day 1–2)
**Goal:** Clean runnable Flutter project with all dependencies, folder structure, theme, and Supabase connected.

| Story | Description |
|-------|-------------|
| S0-1 | Create Flutter project `subtrakr` with package name `me.subtrakr.app` |
| S0-2 | Configure folder structure as defined in section 5.1 |
| S0-3 | Add all pubspec.yaml dependencies |
| S0-4 | Configure `.env` with Supabase URL + anon key |
| S0-5 | Implement AppColors, AppTextStyles, AppSpacing constants |
| S0-6 | Implement AppTheme (light theme only for MVP) |
| S0-7 | Set up GoRouter with placeholder routes for all screens |
| S0-8 | Run Supabase SQL schema (section 5.3) and confirm connection |
| S0-9 | Set up Hive local storage initialisation |
| S0-10 | Configure app icons and splash screen assets |

**Tester checklist S0:**
- [ ] `flutter run` launches without errors
- [ ] App connects to Supabase (check network logs)
- [ ] Theme colours render correctly (primary = #2EC4A0)
- [ ] All routes defined and navigable (even if empty screens)

---

### Sprint 1 — Auth & Onboarding (Days 3–7)
**Goal:** User can sign up, log in with Google, and see onboarding.

| Story | Description | Acceptance Criteria |
|-------|-------------|---------------------|
| S1-1 | Splash screen with logo + auto-navigate logic | Redirects to onboarding if no session, dashboard if session exists |
| S1-2 | Onboarding 3-slide screen with PageView | Swipeable, skip button, Get Started CTA on last slide |
| S1-3 | Login screen UI (Google SSO + email/password) | Both buttons visible, Google button primary |
| S1-4 | Implement Google SSO via Supabase Auth | Sign in works, session persisted |
| S1-5 | Implement email/password sign up + login | Validation, error handling, success → dashboard |
| S1-6 | Auth state provider (Riverpod) | App reacts to auth state changes globally |
| S1-7 | Auto-create "Personal" entity on first login | After signup, Personal entity exists in DB |
| S1-8 | Logout functionality | Clears session, navigates to login |

**Tester checklist S1:**
- [ ] New user flow: splash → onboarding → login → dashboard
- [ ] Returning user flow: splash → dashboard (skip onboarding)
- [ ] Google sign-in completes and user reaches dashboard
- [ ] Email signup with invalid email shows error
- [ ] Logout returns to login screen
- [ ] Personal entity auto-created after first login

---

### Sprint 2 — Entity & Payment Method Management (Days 8–12)
**Goal:** User can manage personal profile, add companies, and save payment methods.

| Story | Description | Acceptance Criteria |
|-------|-------------|---------------------|
| S2-1 | Entities list screen (Settings tab) | Shows Personal + any companies |
| S2-2 | Add company entity bottom sheet | Name, GST number (optional), save to Supabase |
| S2-3 | Edit / delete entity | Edit updates DB, delete removes entity (with confirmation) |
| S2-4 | Payment methods list UI | Shows saved cards/UPI with default badge |
| S2-5 | Add payment method bottom sheet | Type selector (card/UPI/netbanking), label, last-four / UPI ID |
| S2-6 | Set default payment method per entity | Toggle default, reflects in subscription add flow |
| S2-7 | Entity provider (Riverpod) | Reactive list, auto-refreshes on add/edit/delete |

**Tester checklist S2:**
- [ ] Add company "Akshara Technologies" with GST number — appears in list
- [ ] Edit company name — changes persist after app restart
- [ ] Delete company — removed from list, confirmation dialog shown
- [ ] Add HDFC credit card ending 4242 — appears in payment methods
- [ ] Set card as default for Akshara entity — default badge shows

---

### Sprint 3 — Subscription Core (Days 13–19)
**Goal:** Full add/edit/delete subscription flow with service catalogue autocomplete.

| Story | Description | Acceptance Criteria |
|-------|-------------|---------------------|
| S3-1 | Service catalogue data (100+ entries in local JSON) | All major Indian services pre-loaded |
| S3-2 | Service search field with live suggestions | Typing "Claude" shows logo + pre-fill data within 200ms |
| S3-3 | Add subscription bottom sheet — step 1 (name, amount, cycle) | All fields validate, DM Mono on amount |
| S3-4 | Add subscription — step 2 (date, entity, payment method) | Date picker works, entity chips update payment method |
| S3-5 | Add subscription — advanced section (expandable) | Notes, website, reminder days, GST override hidden by default |
| S3-6 | next_due_date auto-computation | Changes live as user adjusts start date + cycle |
| S3-7 | Save subscription to Supabase | Data persists, appears in list |
| S3-8 | Edit subscription (pre-filled form) | All fields editable, save updates record |
| S3-9 | Delete subscription with confirmation | Removed from DB, removed from list immediately |
| S3-10 | Subscription list provider (Riverpod) | Reactive, filtered by entity, sorted by next_due_date |
| S3-11 | Subscription model + repository implementation | All CRUD operations via Supabase |

**Tester checklist S3:**
- [ ] Add "Claude Pro" — catalogue suggestion appears, logo shows
- [ ] Amount field shows DM Mono font
- [ ] Select "Akshara Technologies" entity — GST number silently set
- [ ] Set start date 15 May — next due shows 15 Jun (monthly)
- [ ] Change cycle to Yearly — next due shows 15 May 2027
- [ ] Save subscription — appears in list on dashboard
- [ ] Edit subscription name — change persists
- [ ] Delete subscription — confirmation shown, then removed
- [ ] Advanced section hidden by default, expands on tap

---

### Sprint 4 — Dashboard (Days 20–26)
**Goal:** Full dashboard with hero card, due cards, subscription list, and entity filter.

| Story | Description | Acceptance Criteria |
|-------|-------------|---------------------|
| S4-1 | Dashboard screen scaffold + bottom navigation | 5 tabs: Home, Subs, Add, Reports, Settings |
| S4-2 | Hero summary card with gradient | Total spend, active count, due this week, auto-debit count |
| S4-3 | Entity filter chips (horizontal scroll) | All / Personal / [Companies] / + Add — filters list below |
| S4-4 | "Due this week" horizontal scroll section | Cards showing due subs, overdue highlighted red-left-border |
| S4-5 | Subscription list tiles | Logo circle, name, entity chip, amount (DM Mono), status dot |
| S4-6 | Swipe-to-action on list tiles | Swipe left: Mark Paid (green) + Edit (blue) |
| S4-7 | FAB — opens Add Subscription sheet | Animated FAB, sheet slides up smoothly |
| S4-8 | Empty state (no subscriptions) | Illustration + "Add your first subscription" CTA |
| S4-9 | Loading skeleton | Shimmer effect while data loads |
| S4-10 | Pull-to-refresh | Refreshes subscription data from Supabase |

**Tester checklist S4:**
- [ ] Hero card shows correct total for current month
- [ ] Entity filter "Akshara Technologies" shows only company subs
- [ ] Due this week section shows correct subscriptions
- [ ] Overdue subscription has red left border on card
- [ ] Swipe left on sub → green "Mark Paid" button appears
- [ ] FAB opens add subscription sheet
- [ ] Empty state shows when no subscriptions exist
- [ ] Shimmer shows during loading, disappears on data load
- [ ] Pull-to-refresh updates list

---

### Sprint 5 — Mark Paid & Payment History (Days 27–31)
**Goal:** Complete mark-paid flow with history tracking and next due date advancement.

| Story | Description | Acceptance Criteria |
|-------|-------------|---------------------|
| S5-1 | Mark paid action (from swipe + from detail screen) | Creates payment_history record, advances next_due_date |
| S5-2 | Paid animation on list tile | Check circle draws, item briefly shows "Paid" state |
| S5-3 | Payment history list in subscription detail | Timeline of all payments with date + amount |
| S5-4 | Undo mark paid (within 5 seconds) | Snackbar with Undo, reverts if tapped |
| S5-5 | Mark as missed (manual) | Records missed payment in history with amber state |
| S5-6 | Subscription detail screen full implementation | All sections from UX spec S6 implemented |

**Tester checklist S5:**
- [ ] Mark paid from swipe → next_due_date advances by one cycle
- [ ] Mark paid from detail screen → same behaviour
- [ ] Payment appears in history timeline
- [ ] Undo snackbar appears for 5 seconds after mark paid
- [ ] Undo tap reverts next_due_date and removes history record
- [ ] Subscription detail shows complete payment history

---

### Sprint 6 — Notifications & Reminders (Days 32–38)
**Goal:** Scheduled local reminders before due dates, working on Android.

| Story | Description | Acceptance Criteria |
|-------|-------------|---------------------|
| S6-1 | notification_service.dart implementation | Wraps flutter_local_notifications |
| S6-2 | Schedule reminder on subscription save/edit | Notification fires N days before next_due_date |
| S6-3 | Reminder notification content | "Claude Pro due in 3 days · ₹1,650" with Mark Paid action button |
| S6-4 | Mark Paid from notification action button | Tapping action button marks paid without opening app |
| S6-5 | Reschedule on mark paid | New reminder scheduled for next cycle automatically |
| S6-6 | Cancel reminder on subscription delete/pause | Removes scheduled notification |
| S6-7 | Notification settings screen | Toggle reminders globally, set default days before |
| S6-8 | Request notification permissions on first launch | Permission dialog with explanation |

**Tester checklist S6:**
- [ ] Add subscription due tomorrow → receive notification today (if remind_days = 1)
- [ ] Notification shows correct subscription name + amount
- [ ] Tap "Mark Paid" in notification → subscription marked paid in app
- [ ] After marking paid, new notification scheduled for next cycle
- [ ] Deleting subscription cancels its scheduled notification
- [ ] Disabling reminders in settings stops all notifications
- [ ] Permission request shown on first launch

---

### Sprint 7 — SMS Payment Detection (Days 39–46)
**Goal:** Android SMS listener, NLP parser, payment nudge bottom sheet.

| Story | Description | Acceptance Criteria |
|-------|-------------|---------------------|
| S7-1 | SMS READ + RECEIVE permissions request | Permission dialog with clear explanation of use |
| S7-2 | sms_listener_service.dart — background SMS listener | Listens for new SMS while app is open + in background |
| S7-3 | sms_parser.dart — regex patterns for top 10 Indian banks | HDFC, ICICI, SBI, Kotak, Axis, IDFC, Yes Bank, PNB, BOB, IndusInd |
| S7-4 | Vendor extraction + fuzzy match to service catalogue | "ANTHROPIC PBC" → Claude Pro, confidence score |
| S7-5 | Match against user's subscriptions | Find closest subscription by vendor name + amount |
| S7-6 | Payment nudge bottom sheet UI | As per UX spec S7 — logo pulse animation included |
| S7-7 | Nudge actions — Yes / Not this / Remind later | Yes → mark paid, Not this → dismiss + learn, Remind later → 1hr snooze |
| S7-8 | "New recurring detected" nudge for unknown vendors | When SMS matches no subscription → suggest adding |
| S7-9 | SMS detection toggle in settings | User can disable if not needed |
| S7-10 | Confidence threshold — only nudge if score > 0.65 | Below threshold → silent log, no nudge |

**SMS regex patterns to implement:**
```dart
// HDFC: "Rs.1650.00 debited from a/c XX1234 Info: ANTHROPIC PBC"
// ICICI: "INR 1,650.00 spent on ICICI Bank Credit Card XX1234 at ANTHROPIC"
// SBI: "Your a/c XXXX1234 is debited for Rs 1650.00 to ANTHROPIC"
// GPay: "You paid Rs1,650 to Anthropic using Google Pay"
// PhonePe: "Rs. 1,650.00 paid to ANTHROPIC PBC via PhonePe"
// KOTAK: "INR 1650.00 debited from Kotak Bank a/c XXXX on ANTHROPIC"
```

**Tester checklist S7:**
- [ ] SMS permission granted → service starts
- [ ] Inject test SMS "Rs.1650.00 debited...ANTHROPIC PBC" → nudge appears
- [ ] Nudge shows Claude Pro logo + ₹1,650 + correct subscription match
- [ ] Tap "Yes, mark paid" → subscription marked, next due advanced
- [ ] Tap "Not this" → dismissed, no record created
- [ ] Unknown vendor SMS → "New recurring detected" nudge shows
- [ ] SMS detection disabled in settings → no nudges fire
- [ ] Low confidence SMS (score < 0.65) → no nudge shown

---

### Sprint 8 — Invoice Vault (Days 47–52)
**Goal:** Attach, view, and manage invoices per subscription per billing cycle.

| Story | Description | Acceptance Criteria |
|-------|-------------|---------------------|
| S8-1 | Invoice model + repository | CRUD operations, linked to payment_history |
| S8-2 | Attach invoice UI (file picker + camera) | PDF and image support, max 10MB |
| S8-3 | Upload to Supabase Storage | Stored at `invoices/{userId}/{subscriptionId}/{filename}` |
| S8-4 | Invoice list in subscription detail | Shows all invoices with date, filename, download icon |
| S8-5 | In-app PDF/image viewer | flutter_pdfview for PDFs, Image widget for images |
| S8-6 | Delete invoice | Removes from Storage + DB |
| S8-7 | Invoice count badge on subscription list tile | Shows "3 invoices" count if > 0 |

**Tester checklist S8:**
- [ ] Attach PDF invoice to Claude Pro → appears in invoice list
- [ ] Attach image invoice → appears in invoice list
- [ ] Tap invoice → opens in-app viewer
- [ ] Download icon saves invoice to device Downloads
- [ ] Delete invoice → removed from list and storage
- [ ] Invoice count badge shows correctly on list tile

---

### Sprint 9 — Reports & GST Export (Days 53–60)
**Goal:** Monthly spend reports with donut chart and CA-ready GST export.

| Story | Description | Acceptance Criteria |
|-------|-------------|---------------------|
| S9-1 | Reports screen scaffold with period selector | Month/year navigation, defaults to current month |
| S9-2 | Hero summary card (personal + business split) | Correct totals per entity for selected period |
| S9-3 | Donut chart by category (fl_chart) | Segments for DevTools, Entertainment, Telecom, etc. |
| S9-4 | Entity tab filter on breakdown list | Filters by entity, shows per-subscription amounts |
| S9-5 | report_provider.dart — computed spend data | Aggregates payment_history by period + entity |
| S9-6 | GST export — PDF generation | Company name, period, subscription list, amounts ex-tax, GST amount, totals |
| S9-7 | GST export — CSV generation | Same data in spreadsheet format for CA tools |
| S9-8 | Share sheet for export files | System share sheet, WhatsApp/email/Drive sharing |
| S9-9 | Export filters — entity + date range selector | Dropdown for entity, date range picker |

**PDF export format:**
```
SubTrakr — GST Report
Company: Akshara Technologies
GSTIN: 24XXXXXXXXXXXXXXX
Period: April 2026

| Service       | Vendor GSTIN | Amount    | GST @18% | Total     |
|---------------|--------------|-----------|----------|-----------|
| Claude Pro    | (Anthropic)  | ₹1,398.31 | ₹251.69  | ₹1,650.00 |
| GitHub Copilot| (GitHub)     | ₹699.15   | ₹125.85  | ₹825.00   |
| AWS (Apr)     | (Amazon)     | ₹6,525.42 | ₹1,174.58| ₹7,700.00 |
|               |              |           |          |           |
| TOTAL         |              | ₹8,622.88 | ₹1,552.12| ₹10,175.00|

Generated by SubTrakr · subtrakr.me
```

**Tester checklist S9:**
- [ ] Reports shows correct total for May 2026
- [ ] Personal / Akshara split amounts are accurate
- [ ] Donut chart segments match breakdown list
- [ ] Entity filter shows only selected entity's subscriptions
- [ ] GST PDF generates with correct calculations
- [ ] GST CSV opens correctly in Excel/Sheets
- [ ] Share sheet opens with generated file
- [ ] Date range picker filters payment history correctly

---

### Sprint 10 — Polish, Performance & Edge Cases (Days 61–67)
**Goal:** Production-quality UX, no P0 bugs, performance optimised.

| Story | Description |
|-------|-------------|
| S10-1 | Staggered list entry animations (flutter_animate) |
| S10-2 | Hero widget for logo transitions (list → detail) |
| S10-3 | Error states — no internet, Supabase timeout |
| S10-4 | Form validation messages — all edge cases |
| S10-5 | Amount display — always 2 decimal places, DM Mono |
| S10-6 | Date edge cases — Feb 29, month-end dates |
| S10-7 | Large data performance — 50+ subscriptions scroll test |
| S10-8 | Haptic feedback on key actions (mark paid, swipe) |
| S10-9 | Keyboard avoidance in forms (resizeToAvoidBottomInset) |
| S10-10 | Dark status bar / light status bar per screen |
| S10-11 | Back button behaviour on Android |
| S10-12 | App lifecycle — resume refreshes data |

---

### Sprint 11 — Testing & Bug Fix (Days 68–73)
**Goal:** All automated tests pass, manual regression complete.

| Story | Description |
|-------|-------------|
| S11-1 | Unit tests — sms_parser.dart (all bank patterns) |
| S11-2 | Unit tests — subscription_model.dart (computeNextDue, monthlyEquivalent) |
| S11-3 | Unit tests — currency_utils.dart |
| S11-4 | Widget tests — add_subscription_screen |
| S11-5 | Widget tests — dashboard_screen |
| S11-6 | Integration test — full add subscription → mark paid flow |
| S11-7 | Integration test — SMS parse → nudge → confirm flow |
| S11-8 | Regression testing on Android emulator (API 30 + API 34) |
| S11-9 | Fix all P0 and P1 bugs from sprint testing |

---

### Sprint 12 — Build & Release (Days 74–77)
**Goal:** Signed APK ready for distribution.

| Story | Description |
|-------|-------------|
| S12-1 | Production .env with production Supabase project |
| S12-2 | App signing — generate keystore, configure build.gradle |
| S12-3 | Build flavors — dev / staging / production |
| S12-4 | ProGuard rules for release build |
| S12-5 | `flutter build apk --release` — clean build |
| S12-6 | `flutter build appbundle --release` — for Play Store |
| S12-7 | Internal testing track upload to Play Console |
| S12-8 | Play Store listing — screenshots, description, privacy policy |

---

## 10. Story Definitions

### Story Template (for Cursor Agent)

Every story must be implemented following this structure:

```
STORY: [Story ID] — [Story Title]
SCREEN: [Screen name or 'service']
FILE(S): [Exact file paths to create/modify]
DEPENDS ON: [Story IDs that must be complete first]

IMPLEMENTATION:
[Detailed instructions — widget structure, state management approach,
 data flow, error handling, specific UI measurements from design system]

ACCEPTANCE CRITERIA:
[ ] criterion 1
[ ] criterion 2
[ ] criterion 3

DO NOT:
- Use hardcoded colours (use AppColors)
- Use hardcoded strings (use AppStrings)
- Use magic numbers for spacing (use AppSpacing)
- Skip null safety
- Leave TODO comments
```

---

## 11. Testing Strategy

### 11.1 Test Types

| Type | Tool | Coverage target |
|------|------|----------------|
| Unit | `flutter test` | Core utils, models, use cases — 80%+ |
| Widget | `flutter_test` | All screens render without error |
| Integration | `integration_test` | Critical user flows |
| Manual | Tester Agent checklist | Every sprint |

### 11.2 Critical Test Cases

**SMS Parser — must pass all:**
```dart
test('parses HDFC debit SMS correctly', () {
  final sms = 'Rs.1650.00 debited from a/c XX1234 Info: ANTHROPIC PBC UPI Ref 123456';
  final result = SmsParser.parse(sms);
  expect(result.vendorName, equals('ANTHROPIC PBC'));
  expect(result.amount, equals(1650.00));
  expect(result.currency, equals('INR'));
});
```

**next_due_date computation — must pass all:**
```dart
test('monthly cycle advances by exactly 1 month', () {
  final sub = SubscriptionModel(startDate: DateTime(2026, 1, 31), billingCycle: BillingCycle.monthly, ...);
  final nextDue = sub.computeNextDue(DateTime(2026, 1, 31));
  expect(nextDue, equals(DateTime(2026, 2, 28))); // Handles Feb edge case
});
```

### 11.3 Tester Agent Role

After each sprint, the Tester Agent must:
1. Run `flutter test` — confirm 0 failures
2. Run the sprint's manual checklist on Android emulator (API 34)
3. Test on API 30 (Android 11) for backward compatibility
4. Log any failures as GitHub issues with: screen recording, steps to reproduce, expected vs actual
5. Mark sprint as ✅ PASSED only when all checklist items confirmed

---

## 12. Build & Release

### 12.1 pubspec.yaml (complete)

```yaml
name: subtrakr
description: All your subscriptions. Tracked. Sorted.
publish_to: none
version: 1.0.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"
  flutter: ">=3.19.0"

dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5
  go_router: ^13.2.0
  supabase_flutter: ^2.5.0
  hive_flutter: ^1.1.0
  google_fonts: ^6.2.1
  flutter_local_notifications: ^17.2.1
  firebase_core: ^2.31.0
  firebase_messaging: ^14.9.0
  flutter_animate: ^4.5.0
  fl_chart: ^0.67.0
  file_picker: ^8.0.3
  flutter_pdfview: ^1.3.2
  pdf: ^3.11.1
  share_plus: ^9.0.0
  image_picker: ^1.1.2
  intl: ^0.19.0
  flutter_svg: ^2.0.10+1
  logger: ^2.3.0
  flutter_dotenv: ^5.1.0
  path_provider: ^2.1.3
  permission_handler: ^11.3.1
  telephony: ^0.2.0
  cached_network_image: ^3.3.1
  shimmer: ^3.0.0
  uuid: ^4.4.0
  equatable: ^2.0.5
  freezed_annotation: ^2.4.1
  json_annotation: ^4.9.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter
  build_runner: ^2.4.9
  freezed: ^2.5.2
  json_serializable: ^6.8.0
  riverpod_generator: ^2.4.0
  hive_generator: ^2.0.1
  flutter_launcher_icons: ^0.13.1
  flutter_native_splash: ^2.4.0
  very_good_analysis: ^5.1.0

flutter:
  uses-material-design: true
  assets:
    - assets/logos/
    - assets/images/
    - assets/animations/
    - .env
```

### 12.2 Android Permissions (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.RECEIVE_SMS"/>
<uses-permission android:name="android.permission.READ_SMS"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.CAMERA"/>
```

### 12.3 Release Build Commands

```bash
# Clean build
flutter clean
flutter pub get

# Run code generation
dart run build_runner build --delete-conflicting-outputs

# Release APK (direct distribution)
flutter build apk --release --target-platform android-arm64

# Release App Bundle (Play Store)
flutter build appbundle --release

# Output locations
# APK:    build/app/outputs/flutter-apk/app-release.apk
# Bundle: build/app/outputs/bundle/release/app-release.aab
```

### 12.4 Keystore Setup

```bash
# Generate keystore (run once, store securely)
keytool -genkey -v \
  -keystore subtrakr-release.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias subtrakr

# Add to android/key.properties (DO NOT commit to git)
storePassword=<your-password>
keyPassword=<your-password>
keyAlias=subtrakr
storeFile=../subtrakr-release.jks
```

### 12.5 android/app/build.gradle signing config

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 13. Cursor Agent Instructions

### How to use this PRD

This document is designed to be fed to a Cursor Agent (or any agentic coding assistant) sprint by sprint. Follow these rules:

### Rule 1 — One story at a time
Pick the next incomplete story in the current sprint. Do not start the next story until the current one passes its acceptance criteria.

### Rule 2 — File discipline
Only create or modify files listed in the story. Do not refactor unrelated files. Do not change AppColors, AppTextStyles, or AppSpacing without an explicit story to do so.

### Rule 3 — No hardcoded values
Every colour → `AppColors.*`  
Every text style → `AppTextStyles.*`  
Every spacing → `AppSpacing.*`  
Every string → `AppStrings.*`  

### Rule 4 — Riverpod patterns
All state management via Riverpod providers. No setState except inside purely local UI widgets (e.g. text field focus). Use `AsyncNotifierProvider` for data that loads from Supabase.

### Rule 5 — Error handling
Every Supabase call wrapped in try/catch. Errors surfaced to UI via error state in provider. No unhandled exceptions.

### Rule 6 — After each story
Run `flutter analyze` — must show 0 errors, 0 warnings.  
Run `flutter test` — must pass all existing tests.  
Then mark story complete and notify Tester Agent.

### Rule 7 — Tester Agent handoff
After completing a full sprint, output:
```
SPRINT [N] COMPLETE
Stories completed: [list]
Files modified: [list]
Tests added: [list]
Ready for tester review: YES
```

### Rule 8 — Sprint 0 first
Never skip Sprint 0. The project structure, theme, and routing must be solid before any feature work begins. Rushing Sprint 0 causes cascading rework in every later sprint.

---

## Appendix A — .gitignore additions

```
.env
subtrakr-release.jks
android/key.properties
*.jks
*.keystore
```

## Appendix B — Environment variables (.env)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## Appendix C — Recommended VS Code extensions for Flutter dev

- Dart
- Flutter
- Flutter Riverpod Snippets
- Awesome Flutter Snippets
- Error Lens
- GitLens

---

*SubTrakr PRD v1.0 — Akshara Technologies — subtrakr.me*
*This document is the single source of truth for the Flutter MVP build.*
