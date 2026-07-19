import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../data/datasources/local_datasource.dart';
import '../data/models/entity_model.dart';
import '../data/models/payment_history_model.dart';
import '../data/models/subscription_model.dart';
import 'auth_service.dart';
import 'supabase_service.dart';

/// Offline-first sync between Hive and the self-hosted Supabase backend.
///
/// Model: Hive stays the read path for the whole UI. While a session is
/// active, every mutation is pushed fire-and-forget (errors logged, never
/// surfaced — a dropped push is reconciled by the next [pullAll], where the
/// server wins for rows both sides know about). [pullAll] replaces local
/// data wholesale: it runs at sign-in and app launch, when the server copy
/// is the source of truth. Invoices are deliberately not synced in v1 —
/// their bytes live only in local Hive.
class SyncService {
  SyncService._();

  static const _uuid = Uuid();
  static final _uuidPattern = RegExp(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  );

  static SupabaseClient get _db => SupabaseService.client;
  static bool get _active => AuthService.hasSession;
  static String get _uid => AuthService.currentUser!.id;

  /// Non-UUID ids belong to demo-mode seed data, which must never reach the
  /// server (Postgres columns are UUID-typed anyway).
  static bool _syncable(String id) => _active && _uuidPattern.hasMatch(id);

  static String newId() => _uuid.v4();

  // ── Pull ────────────────────────────────────────────────────────────────

  /// Replaces local data with the server copy. Creates the default Personal
  /// entity server-side for a fresh account. Returns false (leaving local
  /// data untouched) on any failure so an offline launch still boots.
  static Future<bool> pullAll() async {
    if (!_active) return false;
    try {
      var entityRows = List<Map<String, dynamic>>.from(
        await _db.from('entities').select(),
      );
      if (entityRows.isEmpty) {
        final personal = {
          'id': _uuid.v4(),
          'user_id': _uid,
          'name': 'Personal',
          'type': 'personal',
        };
        await _db.from('entities').insert(personal);
        entityRows = [personal];
      }
      final subRows = List<Map<String, dynamic>>.from(
        await _db.from('subscriptions').select(),
      );
      final payRows = List<Map<String, dynamic>>.from(
        await _db.from('payment_history').select(),
      );

      await LocalDataSource.entities.clear();
      for (final row in entityRows) {
        final e = _entityFromRow(row);
        await LocalDataSource.entities.put(e.id, e.toJson());
      }
      await LocalDataSource.subscriptions.clear();
      for (final row in subRows) {
        final s = _subscriptionFromRow(row);
        await LocalDataSource.subscriptions.put(s.id, s.toJson());
      }
      await LocalDataSource.paymentHistory.clear();
      for (final row in payRows) {
        final p = _paymentFromRow(row);
        await LocalDataSource.paymentHistory.put(p.id, p.toJson());
      }
      return true;
    } catch (e) {
      debugPrint('SyncService.pullAll failed (non-fatal): $e');
      return false;
    }
  }

  /// Wipes local data — used at sign-out so the next account (or the login
  /// screen) never sees the previous user's data.
  static Future<void> clearLocal() async {
    await LocalDataSource.entities.clear();
    await LocalDataSource.subscriptions.clear();
    await LocalDataSource.paymentHistory.clear();
    await LocalDataSource.invoices.clear();
  }

  // ── Push (fire-and-forget) ──────────────────────────────────────────────

  static Future<void> upsertEntity(EntityModel entity) async {
    if (!_syncable(entity.id)) return;
    try {
      await _db.from('entities').upsert({
        'id': entity.id,
        'user_id': _uid,
        'name': entity.name,
        'type': entity.type.name,
        'gst_number': entity.gstNumber,
      });
    } catch (e) {
      debugPrint('SyncService.upsertEntity failed (non-fatal): $e');
    }
  }

  static Future<void> upsertSubscription(SubscriptionModel sub) async {
    if (!_syncable(sub.id)) return;
    try {
      await _db.from('subscriptions').upsert({
        'id': sub.id,
        'user_id': _uid,
        'entity_id': sub.entityId,
        'name': sub.name,
        'category': sub.category.name,
        'amount': sub.amount,
        'currency': sub.currency,
        'billing_cycle': _cycleToDb(sub.billingCycle),
        'custom_cycle_days': sub.customCycleDays,
        'start_date': _dateToDb(sub.startDate),
        'next_due_date': _dateToDb(sub.nextDueDate),
        'status': sub.status.name,
        'is_auto_debit': sub.isAutoDebit,
        'remind_days_before': sub.remindDaysBefore,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      });
    } catch (e) {
      debugPrint('SyncService.upsertSubscription failed (non-fatal): $e');
    }
  }

  static Future<void> deleteSubscription(String id) async {
    if (!_syncable(id)) return;
    try {
      // No ON DELETE CASCADE on the server FKs — children go first.
      await _db.from('invoices').delete().eq('subscription_id', id);
      await _db.from('payment_history').delete().eq('subscription_id', id);
      await _db.from('subscriptions').delete().eq('id', id);
    } catch (e) {
      debugPrint('SyncService.deleteSubscription failed (non-fatal): $e');
    }
  }

  static Future<void> insertPayment(PaymentHistoryModel payment) async {
    if (!_syncable(payment.id) || !_uuidPattern.hasMatch(payment.subscriptionId)) {
      return;
    }
    try {
      await _db.from('payment_history').upsert({
        'id': payment.id,
        'user_id': _uid,
        'subscription_id': payment.subscriptionId,
        'paid_date': _dateToDb(payment.paidDate),
        'amount_paid': payment.amountPaid,
        'currency': payment.currency,
        'source': _sourceToDb(payment.source),
      });
    } catch (e) {
      debugPrint('SyncService.insertPayment failed (non-fatal): $e');
    }
  }

  static Future<void> deletePayment(String id) async {
    if (!_syncable(id)) return;
    try {
      await _db.from('payment_history').delete().eq('id', id);
    } catch (e) {
      debugPrint('SyncService.deletePayment failed (non-fatal): $e');
    }
  }

  // ── Row ↔ model mapping ─────────────────────────────────────────────────

  static String _dateToDb(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  static String _cycleToDb(BillingCycle c) =>
      c == BillingCycle.halfYearly ? 'half_yearly' : c.name;

  static BillingCycle _cycleFromDb(String raw) =>
      raw == 'half_yearly' ? BillingCycle.halfYearly : BillingCycle.values.byName(raw);

  static String _sourceToDb(PaymentSource s) =>
      s == PaymentSource.shareDetected ? 'sms_detected' : s.name;

  static PaymentSource _sourceFromDb(String raw) => raw == 'sms_detected'
      ? PaymentSource.shareDetected
      : PaymentSource.values.byName(raw);

  static String _initialsFrom(String name) {
    final words = name.trim().split(RegExp(r'\s+'));
    if (words.isEmpty || words.first.isEmpty) return '?';
    if (words.length == 1) {
      return words.first.substring(0, words.first.length >= 2 ? 2 : 1).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  static EntityModel _entityFromRow(Map<String, dynamic> row) => EntityModel(
        id: row['id'] as String,
        name: row['name'] as String,
        type: EntityType.values.byName(row['type'] as String),
        gstNumber: row['gst_number'] as String?,
      );

  static SubscriptionModel _subscriptionFromRow(Map<String, dynamic> row) {
    SubscriptionCategory category;
    try {
      category = SubscriptionCategory.values.byName(row['category'] as String);
    } catch (_) {
      category = SubscriptionCategory.other;
    }
    return SubscriptionModel(
      id: row['id'] as String,
      entityId: row['entity_id'] as String,
      name: row['name'] as String,
      initials: _initialsFrom(row['name'] as String),
      category: category,
      amount: (row['amount'] as num).toDouble(),
      currency: row['currency'] as String? ?? 'INR',
      billingCycle: _cycleFromDb(row['billing_cycle'] as String),
      customCycleDays: row['custom_cycle_days'] as int?,
      startDate: DateTime.parse(row['start_date'] as String),
      nextDueDate: DateTime.parse(row['next_due_date'] as String),
      status: SubscriptionStatus.values.byName(row['status'] as String? ?? 'active'),
      isAutoDebit: row['is_auto_debit'] as bool? ?? false,
      remindDaysBefore: row['remind_days_before'] as int? ?? 3,
    );
  }

  static PaymentHistoryModel _paymentFromRow(Map<String, dynamic> row) =>
      PaymentHistoryModel(
        id: row['id'] as String,
        subscriptionId: row['subscription_id'] as String,
        paidDate: DateTime.parse(row['paid_date'] as String),
        amountPaid: (row['amount_paid'] as num).toDouble(),
        currency: row['currency'] as String? ?? 'INR',
        source: _sourceFromDb(row['source'] as String? ?? 'manual'),
      );
}
