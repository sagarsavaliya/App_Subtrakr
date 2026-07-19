import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/payment_history_model.dart';
import '../../data/repositories/payment_history_repository.dart';
import '../../services/sync_service.dart';

class PaymentHistoryNotifier extends Notifier<List<PaymentHistoryModel>> {
  final _repo = PaymentHistoryRepository();

  @override
  List<PaymentHistoryModel> build() => _repo.getAll();

  void add(PaymentHistoryModel payment) {
    state = [...state, payment];
    _repo.save(payment);
    SyncService.insertPayment(payment);
  }

  void removeById(String id) {
    state = state.where((p) => p.id != id).toList();
    _repo.delete(id);
    SyncService.deletePayment(id);
  }

  /// Local-only removal of a deleted subscription's history — the server
  /// side is handled in one shot by [SyncService.deleteSubscription].
  void removeForSubscription(String subscriptionId) {
    final orphaned = state.where((p) => p.subscriptionId == subscriptionId);
    for (final p in orphaned) {
      _repo.delete(p.id);
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
