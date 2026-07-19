import '../datasources/local_datasource.dart';
import '../models/payment_history_model.dart';

class PaymentHistoryRepository {
  List<PaymentHistoryModel> getAll() {
    return LocalDataSource.paymentHistory.values
        .map((raw) => PaymentHistoryModel.fromJson(Map<String, dynamic>.from(raw)))
        .toList();
  }

  Future<void> save(PaymentHistoryModel payment) {
    return LocalDataSource.paymentHistory.put(payment.id, payment.toJson());
  }

  Future<void> delete(String id) {
    return LocalDataSource.paymentHistory.delete(id);
  }

  Future<void> seedIfEmpty(List<PaymentHistoryModel> seed) async {
    if (LocalDataSource.paymentHistory.isNotEmpty) return;
    for (final payment in seed) {
      await save(payment);
    }
  }
}
