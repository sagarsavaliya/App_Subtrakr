# SubTrakr Project Memory & Architecture Overview

> **Last Updated:** August 4, 2026  
> **Status:** Active Development / Production VPS Backend Connected

SubTrakr is a mobile-first subscription manager designed for personal and business cost tracking with entity-level separation for GST reconciliation. Built with Flutter, Riverpod, Hive (offline-first local persistence), and a self-hosted Supabase backend (`supabase.subtrakr.me`).

---

## 1. Executive Summary & Core Value Proposition

- **Entity Separation:** Track personal vs. business expenses separately with GSTIN tracking for Indian tax filing (ITR / GST reconciliation).
- **Offline-First Storage:** Local Hive storage powers instant UI reads; background fire-and-forget sync syncs with the self-hosted Supabase backend.
- **Smart Reminders:** Multi-stage notification cascade scaled by billing cycle (e.g., 14/7/3/1 days for yearly; 3/1 days for monthly) using `flutter_local_notifications` with direct "Mark Paid" actions.
- **Privacy-First Payment Capture:** Share-intent-based payment detection via `receive_sharing_intent` (processes shared bank SMS/UPI notifications without intrusive runtime SMS/Notification listener permissions).
- **GST Exporting:** Generates PDF & CSV reports (with embedded DM Sans font for proper `₹` currency rendering) for CA filing.

---

## 2. Technical Stack9

| Area | Technology / Library |
|---|---|
| **Framework & Language** | Flutter 3.x / Dart 3.x |
| **State Management** | `flutter_riverpod` (`ConsumerStatefulWidget`, `StateNotifier` / `Provider`) |
| **Routing** | `go_router` (with `StatefulShellRoute.indexedStack` for persistent shell navigation) |
| **Local Database** | `hive` / `hive_flutter` (Key-value boxes: `entities`, `subscriptions`, `paymentHistory`, `invoices`, `prefs`) |
| **Backend & Cloud DB** | Self-hosted Supabase (Postgres 15+, GoTrue Auth, PostgREST, Storage, Kong API Gateway on VPS) |
| **Notifications** | `flutter_local_notifications` + `timezone` (inexact alarms to avoid Android `SCHEDULE_EXACT_ALARM` restriction) |
| **Share Intent Capture** | `receive_sharing_intent` (pinned to 1.8.1 for Kotlin Gradle compatibility) |
| **PDF & Exports** | `pdf` + `share_plus` (base14 PDF fallback avoided by embedding local DM Sans font) |
| **Visuals & Charts** | `fl_chart`, `flutter_animate`, `shimmer`, custom DM Sans & DM Mono typography |

---

## 3. Repository Directory Structure

```
App_Subtrakr-main/
├── MEMORY.md                 # System memory & architectural reference (this file)
├── pubspec.yaml              # Dependencies & asset declarations
├── README.md                 # Project quickstart guide
├── Briefs/
│   └── SUBTRAKR_PRD.md       # Complete Product Requirements Document
├── docs/
│   ├── DEPLOYMENT.md         # Production VPS infrastructure & CI/CD deployment guide
│   ├── LOCAL_SETUP.md        # Local development & SQLite setup guide
│   └── PLAY_STORE_LISTING.md # Play Store copy & metadata
├── backend/
│   ├── sqlite/               # Minimal zero-docker SQLite backend (server.js, schema_sqlite.sql)
│   ├── docker-compose.yml    # Supabase self-hosted stack configuration
│   ├── kong.yml.template     # API Gateway route definitions template
│   ├── schema.sql            # Core database tables (entities, subscriptions, payment_history, invoices) + RLS
│   ├── schema_billing.sql    # SaaS subscription plans, Razorpay transactions, admin tables + RLS
│   └── nginx/                # VPS reverse proxy configurations
├── lib/
│   ├── main.dart             # App entry point (Dotenv, Supabase, Hive bootstrap, Notifications)
│   ├── app.dart              # Root MaterialApp.router, NotificationActionBridge & PaymentCapture wiring
│   ├── core/
│   │   ├── constants/        # Colors (`AppColors`), spacing (`AppSpacing`), text styles (`AppTextStyles`), service logos catalog
│   │   ├── router/           # `appRouter` (`GoRouter`) setup & `rootNavigatorKey`
│   │   ├── theme/            # Dark mode theme definition (`AppTheme`)
│   │   └── utils/            # `action_feedback.dart`, `currency_utils.dart`, `date_utils.dart`
│   ├── data/
│   │   ├── bootstrap.dart    # Initial Hive box initialization & mock data seeding logic
│   │   ├── datasources/      # `LocalDataSource` (Hive boxes manager)
│   │   ├── mock/             # `MockData` seed data for demo mode
│   │   ├── models/           # `EntityModel`, `SubscriptionModel`, `PaymentHistoryModel`, `InvoiceModel`
│   │   └── repositories/     # Data abstraction wrappers (`EntityRepository`, `SubscriptionRepository`, etc.)
│   ├── presentation/
│   │   ├── providers/        # Riverpod providers (`entity_provider`, `subscription_provider`, etc.)
│   │   ├── screens/          # Application views: auth, dashboard, entities, nudge, reports, subscriptions
│   │   └── widgets/          # Custom UI components (buttons, chips, aurora background, tiles, sheets)
│   └── services/
│       ├── auth_service.dart               # Supabase GoTrue Auth wrapper (Phone+PIN, Email+PIN)
│       ├── backup_service.dart             # Full local JSON backup exporter
│       ├── export_service.dart             # PDF and CSV report generators
│       ├── notification_action_bridge.dart # Decoupled notification callback handler
│       ├── notification_service.dart        # Multi-stage renewal reminder scheduler
│       ├── payment_capture_service.dart    # OS share intent listener for SMS/UPI text
│       ├── payment_parser.dart             # Regex parser & fuzzy match logic for share intent
│       ├── supabase_service.dart           # Supabase client initializer
│       └── sync_service.dart               # Bi-directional Hive ↔ Supabase sync engine
└── test/                     # Unit & widget tests (`auth_service_test`, `payment_parser_test`, etc.)
```

---

## 4. Key Architectural Patterns & Data Flow

### 4.1 Local-First State & Synchronization Engine (`SyncService`)
- **Read Path:** UI always reads directly from local Hive boxes (`LocalDataSource`) via Riverpod providers for instant rendering without loading spinners.
- **Write/Push Path:** Mutations (create/update/delete subscription, entity, or payment) update local Hive state immediately and trigger an unawaited background push to Supabase (`SyncService.upsert*`).
- **Pull Path:** Upon user login or app boot with an active session, `SyncService.pullAll()` fetches remote rows and updates Hive. Demo seed data uses non-UUID IDs, ensuring it never gets pushed to Postgres (which expects UUID PKs).

### 4.2 Authentication Flow (`AuthService`)
- **Phone + 6-digit PIN (Primary):**
  1. Phone OTP sent via custom Web API (`https://subtrakr.me/api/auth/send-otp`) over WhatsApp.
  2. OTP verified (`/api/auth/verify-otp`).
  3. Account finalized (`/api/auth/complete-signup`) and authenticated via `signInWithPassword(phone, pin)`.
- **Email + 6-digit PIN:**
  1. Precheck via Web API (`/api/auth/email/precheck`).
  2. Native Supabase email OTP sent via Brevo SMTP.
  3. OTP verified via `verifyOTP`, then `updateUser(password: pin)` sets the PIN credential.

### 4.3 Notification Cascade & Action Bridge (`NotificationService` & `NotificationActionBridge`)
- Reminder offsets dynamically scale by billing cycle:
  - **Yearly / Half-Yearly:** 14, 7, 3, and 1 days before due date.
  - **Quarterly:** 7, 3, and 1 days before due date.
  - **Monthly / Weekly / Custom:** 3 and 1 days before due date.
- Employs `androidScheduleMode: inexactAllowWhileIdle` to comply with Google Play policies without requiring `SCHEDULE_EXACT_ALARM`.
- Direct action button **"Mark Paid"** on notifications communicates back into Riverpod via `NotificationActionBridge.onMarkPaid`, pushing state updates to both Hive and Supabase without forcing full app navigation.

### 4.4 Payment Capture via OS Share Sheet (`PaymentCaptureService` & `PaymentParser`)
- Listens for shared text streams (e.g., user selects bank SMS / UPI text and taps "Share to SubTrakr").
- `PaymentParser.extractAmount` isolates currency figures using regex (`₹`, `INR`, `Rs.`, or verb patterns `debited|paid|charged`).
- `PaymentParser.match` scores active subscriptions based on name presence (+2) and amount match within 2% tolerance (+1). Triggers `PaymentNudgeSheet` for confirmation.

### 4.5 Data Models & Schema Overview
- **`entities`**: Represents tax/expense boundaries (`personal` or `company`). `gst_number` stored for business entities.
- **`subscriptions`**: Represents recurring costs with attributes: `billing_cycle`, `amount`, `currency`, `start_date`, `next_due_date`, `status` (`active`, `paused`, `cancelled`, `trial`), `is_auto_debit`, `remind_days_before`.
- **`payment_history`**: Records individual payment transactions linked to a subscription (`manual`, `sms_detected`, or `auto`).
- **`invoices`**: Locally managed receipt attachments linked to subscriptions/payments.

---

## 5. Development & Maintenance Guidelines

### 5.1 Verification Commands
Before submitting PRs or finalizing major additions, run:
```bash
flutter analyze   # Must pass clean with zero issues
flutter test       # All unit & widget tests must pass
```

### 5.2 Guidelines for Updating Memory File
- Whenever new services, data models, routes, or backend schemas are added or updated, update this `MEMORY.md` file accordingly.
- Keep security-sensitive variables out of this document (`.env` handles environment variables).
