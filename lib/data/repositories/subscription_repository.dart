import '../datasources/local_datasource.dart';
import '../models/subscription_model.dart';

class SubscriptionRepository {
  List<SubscriptionModel> getAll() {
    return LocalDataSource.subscriptions.values
        .map((raw) => SubscriptionModel.fromJson(Map<String, dynamic>.from(raw)))
        .toList();
  }

  Future<void> save(SubscriptionModel subscription) {
    return LocalDataSource.subscriptions.put(subscription.id, subscription.toJson());
  }

  Future<void> delete(String id) {
    return LocalDataSource.subscriptions.delete(id);
  }

  Future<void> seedIfEmpty(List<SubscriptionModel> seed) async {
    if (LocalDataSource.subscriptions.isNotEmpty) return;
    for (final sub in seed) {
      await save(sub);
    }
  }
}
