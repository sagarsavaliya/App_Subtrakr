import 'package:collection/collection.dart';
import 'package:uuid/uuid.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/payment_history_model.dart';
import '../../data/models/subscription_model.dart';
import '../../data/repositories/subscription_repository.dart';
import '../../services/notification_service.dart';
import '../../services/sync_service.dart';
import 'entity_provider.dart';
import 'payment_history_provider.dart';

const _uuid = Uuid();

class SubscriptionsNotifier extends Notifier<List<SubscriptionModel>> {
  final _repo = SubscriptionRepository();

  @override
  List<SubscriptionModel> build() => _repo.getAll();

  /// Marks [id] paid, advances its next due date, and records a payment
  /// history entry. Returns the pre-mutation subscription + the new payment's
  /// id so the caller can offer a 5-second Undo.
  ///
  /// The in-memory `state` update is optimistic (immediate, for a
  /// responsive UI); `_repo.save` is awaited and its errors propagate to
  /// the caller — previously this was fire-and-forget, so a failed local
  /// write (Hive full/corrupted) was a genuinely unhandled Future
  /// rejection with zero user-visible feedback. SyncService stays
  /// fire-and-forget deliberately: it already catches+logs its own errors
  /// internally and self-heals via the next pullAll, so surfacing every
  /// transient network hiccup here would be noise, not signal.
  Future<({SubscriptionModel previous, String paymentId})?> markPaid(
    String id, {
    double? amountPaid,
    PaymentSource source = PaymentSource.manual,
  }) async {
    final previous = state.firstWhereOrNull((s) => s.id == id);
    if (previous == null) return null;

    final baseDate = previous.nextDueDate.isBefore(DateTime.now())
        ? DateTime.now()
        : previous.nextDueDate;
    final updated = previous.copyWith(
      status: SubscriptionStatus.active,
      nextDueDate: previous.computeNextDue(baseDate),
    );

    state = [for (final sub in state) if (sub.id == id) updated else sub];
    await _repo.save(updated);
    NotificationService.scheduleReminder(updated);
    SyncService.upsertSubscription(updated);

    final paymentId = _uuid.v4();
    await ref
        .read(paymentHistoryProvider.notifier)
        .add(
          PaymentHistoryModel(
            id: paymentId,
            subscriptionId: id,
            paidDate: DateTime.now(),
            amountPaid: amountPaid ?? previous.amount,
            currency: previous.currency,
            source: source,
          ),
        );

    return (previous: previous, paymentId: paymentId);
  }

  /// Reverts a markPaid call — restores the previous subscription state and
  /// removes the payment history entry it created.
  Future<void> undoMarkPaid(SubscriptionModel previous, String paymentId) async {
    state = [for (final sub in state) if (sub.id == previous.id) previous else sub];
    await _repo.save(previous);
    NotificationService.scheduleReminder(previous);
    SyncService.upsertSubscription(previous);
    await ref.read(paymentHistoryProvider.notifier).removeById(paymentId);
  }

  Future<void> setStatus(String id, SubscriptionStatus status) async {
    state = [
      for (final sub in state)
        if (sub.id == id) sub.copyWith(status: status) else sub,
    ];
    final updated = state.firstWhereOrNull((s) => s.id == id);
    if (updated != null) {
      await _repo.save(updated);
      // scheduleReminder itself cancels+no-ops for non-active statuses.
      NotificationService.scheduleReminder(updated);
      SyncService.upsertSubscription(updated);
    }
  }

  Future<void> deleteSubscription(String id) async {
    state = state.where((s) => s.id != id).toList();
    await _repo.delete(id);
    NotificationService.cancelReminder(id);
    // Its payment history goes with it, locally and on the server.
    await ref.read(paymentHistoryProvider.notifier).removeForSubscription(id);
    SyncService.deleteSubscription(id);
  }

  Future<void> addSubscription(SubscriptionModel sub) async {
    state = [...state, sub];
    await _repo.save(sub);
    NotificationService.scheduleReminder(sub);
    SyncService.upsertSubscription(sub);
  }

  /// Full-record edit (PRD S3-8) — replaces the row, reschedules its
  /// reminder, and pushes the change to the server.
  Future<void> updateSubscription(SubscriptionModel sub) async {
    state = [for (final s in state) if (s.id == sub.id) sub else s];
    await _repo.save(sub);
    NotificationService.scheduleReminder(sub);
    SyncService.upsertSubscription(sub);
  }
}

final subscriptionsProvider =
    NotifierProvider<SubscriptionsNotifier, List<SubscriptionModel>>(
      SubscriptionsNotifier.new,
    );

/// Filtered by the selected entity chip, sorted by soonest due date first.
final filteredSubscriptionsProvider = Provider<List<SubscriptionModel>>((ref) {
  final all = ref.watch(subscriptionsProvider);
  final entityId = ref.watch(selectedEntityIdProvider);
  final filtered = entityId == null
      ? all
      : all.where((s) => s.entityId == entityId).toList();
  filtered.sort((a, b) => a.nextDueDate.compareTo(b.nextDueDate));
  return filtered;
});

final dueThisWeekProvider = Provider<List<SubscriptionModel>>((ref) {
  final all = ref.watch(subscriptionsProvider);
  final list = all
      .where((s) => s.status == SubscriptionStatus.active && s.daysUntilDue <= 7)
      .toList();
  list.sort((a, b) => a.nextDueDate.compareTo(b.nextDueDate));
  return list;
});

final totalMonthlySpendProvider = Provider<double>((ref) {
  final all = ref.watch(subscriptionsProvider);
  return all
      .where((s) => s.status == SubscriptionStatus.active)
      .fold<double>(0, (sum, s) => sum + s.monthlyEquivalent);
});

final autoDebitCountProvider = Provider<int>((ref) {
  return ref
      .watch(subscriptionsProvider)
      .where((s) => s.isAutoDebit && s.status == SubscriptionStatus.active)
      .length;
});

final activeCountProvider = Provider<int>((ref) {
  return ref
      .watch(subscriptionsProvider)
      .where((s) => s.status == SubscriptionStatus.active)
      .length;
});
