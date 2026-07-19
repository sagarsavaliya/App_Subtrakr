import 'package:hive_flutter/hive_flutter.dart';

/// Opens the local Hive boxes used for offline-first persistence.
/// Values are stored as plain JSON maps (via each model's toJson/fromJson) —
/// Hive's binary format natively supports Map/List/String/num/bool/DateTime,
/// so no generated TypeAdapters are needed.
class LocalDataSource {
  LocalDataSource._();

  static const entitiesBox = 'entities';
  static const subscriptionsBox = 'subscriptions';
  static const paymentHistoryBox = 'payment_history';
  static const invoicesBox = 'invoices';

  static bool _initialized = false;

  /// [testPath] lets tests point Hive at a plain temp directory via
  /// `Hive.init`, skipping `initFlutter`'s path_provider platform channel
  /// (unavailable in a bare widget test).
  static Future<void> init({String? testPath}) async {
    if (_initialized) return;
    if (testPath != null) {
      Hive.init(testPath);
    } else {
      await Hive.initFlutter('subtrakr');
    }
    await Hive.openBox<Map>(entitiesBox);
    await Hive.openBox<Map>(subscriptionsBox);
    await Hive.openBox<Map>(paymentHistoryBox);
    await Hive.openBox<Map>(invoicesBox);
    _initialized = true;
  }

  static Box<Map> get entities => Hive.box<Map>(entitiesBox);
  static Box<Map> get subscriptions => Hive.box<Map>(subscriptionsBox);
  static Box<Map> get paymentHistory => Hive.box<Map>(paymentHistoryBox);
  static Box<Map> get invoices => Hive.box<Map>(invoicesBox);
}
