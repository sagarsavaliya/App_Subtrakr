import 'datasources/local_datasource.dart';
import 'mock/mock_data.dart';
import 'repositories/entity_repository.dart';
import 'repositories/payment_history_repository.dart';
import 'repositories/subscription_repository.dart';

/// Opens local storage and seeds it with mock data on first run.
/// Shared by `main()` and widget tests so both boot the same way.
Future<void> bootstrapLocalData({String? testPath}) async {
  await LocalDataSource.init(testPath: testPath);
  await EntityRepository().seedIfEmpty(MockData.entities);
  await SubscriptionRepository().seedIfEmpty(MockData.subscriptions);
  await PaymentHistoryRepository().seedIfEmpty(MockData.paymentHistory);
}
