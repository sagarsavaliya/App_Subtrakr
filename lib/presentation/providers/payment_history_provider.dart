import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/payment_history_model.dart';
import '../../data/repositories/payment_history_repository.dart';
import '../../services/sync_service.dart';

class PaymentHistoryNotifier extends Notifier<List<PaymentHistoryModel>> {
  final _repo = PaymentHistoryRepository();

  @override
  List<PaymentHistoryModel> build() => _repo.getAll();

  Future<void> add(PaymentHistoryModel payment) async {
    state = [...state, payment];
    await _repo.save(payment);
    SyncService.insertPayment(payment);
  }

  Future<void> removeById(String id) async {
    state = state.where((p) => p.id != id).toList();
    await _repo.delete(id);
    SyncService.deletePayment(id);
  }

  /// Local-only removal of a deleted subscription's history — the server
  /// side is handled in one shot by [SyncService.deleteSubscription].
  Future<void> removeForSubscription(String subscriptionId) async {
    final orphaned = state.where((p) => p.subscriptionId == subscriptionId);
    for (final p in orphaned) {
      await _repo.delete(p.id);
    }
    state = state.where((p) => p.subscriptionId != subscriptionId).toList();
  }
}

final paymentHistoryProvider =
    NotifierProvider<PaymentHistoryNotifier, List<PaymentHistoryModel>>(
      PaymentHistoryNotifier.new,
    );

final paymentHistoryForSubscriptionProvider = Provider.family<List<PaymentHistoryModel>, String>((
  ref,
  subscriptionId,
) {
  final all = ref.watch(paymentHistoryProvider);
  final list = all.where((p) => p.subscriptionId == subscriptionId).toList()
    ..sort((a, b) => b.paidDate.compareTo(a.paidDate));
  return list;
});
