# SubTrakr Local Development Guide (SQLite / Minimal Setup)

This guide provides instructions for setting up and running **SubTrakr** locally with zero heavy infrastructure (no Docker, no cloud Supabase required).

---

## 1. Quickstart Options

SubTrakr supports two lightweight local development modes:

| Mode | Backend | Setup Requirements |
|---|---|---|
| **Option A: Pure Standalone (Default)** | Hive (Embedded key-value store) | Flutter SDK only (seeding mock demo data automatically) |
| **Option B: Local SQLite Backend** | Express + SQLite Server | Node.js + Flutter SDK |

---

## 2. Option A: Pure Standalone Local Mode

In standalone mode, SubTrakr uses local embedded **Hive** storage. UI reads and writes are 100% instant and offline.

1. Ensure `.env` is absent or contains placeholder keys.
2. Install Flutter dependencies and start the app:
   ```bash
   flutter pub get
   flutter run
   ```
3. The app will automatically populate mock data (`MockData.entities`, `MockData.subscriptions`, etc.).

---

## 3. Option B: Local SQLite Backend Setup

To test sync workflows against a real relational database locally using **SQLite**:

### 3.1 Start the Local SQLite Backend Server

1. Navigate to the local backend directory:
   ```bash
   cd backend/sqlite
   ```
2. Install minimal Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   The server initializes `subtrakr.db` with SQLite schemas (`schema_sqlite.sql`) and listens on `http://localhost:3001`.

### 3.2 Configure `.env` in App Root

Create or update `.env` in the root project directory:
```env
SUPABASE_URL=http://localhost:3001
SUPABASE_ANON_KEY=local-sqlite-key
```

### 3.3 Launch the Flutter App

From the root directory:
```bash
flutter pub get
flutter run
```

---

## 4. Verification & Testing

To verify code quality and local functionality:
```bash
flutter analyze   # Verify clean static analysis
flutter test       # Run unit and widget tests
```
