import 'datasources/local_datasource.dart';
import 'mock/mock_data.dart';
import 'repositories/entity_repository.dart';
import 'repositories/payment_history_repository.dart';
import 'repositories/subscription_repository.dart';

/// Opens local storage and, in offline demo mode only ([seedDemo]), seeds
/// it with mock data on first run. With a real backend configured, data
/// comes from the account's server pull instead — never the demo seed.
/// Shared by `main()` and widget tests so both boot the same way.
Future<void> bootstrapLocalData({String? testPath, bool seedDemo = true}) async {
  await LocalDataSource.init(testPath: testPath);
  if (!seedDemo) return;
  await EntityRepository().seedIfEmpty(MockData.entities);
  await SubscriptionRepository().seedIfEmpty(MockData.subscriptions);
  await PaymentHistoryRepository().seedIfEmpty(MockData.paymentHistory);
}
