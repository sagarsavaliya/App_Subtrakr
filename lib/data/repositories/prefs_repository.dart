import '../datasources/local_datasource.dart';

class PrefsRepository {
  static const _key = 'app_prefs';

  Map get _raw => LocalDataSource.prefs.get(_key) ?? const {};

  bool get remindersEnabled => _raw['remindersEnabled'] as bool? ?? true;
  bool get captureEnabled => _raw['captureEnabled'] as bool? ?? true;

  Future<void> setRemindersEnabled(bool value) =>
      _put('remindersEnabled', value);
  Future<void> setCaptureEnabled(bool value) => _put('captureEnabled', value);

  Future<void> _put(String field, bool value) {
    final updated = Map<String, dynamic>.from(_raw)..[field] = value;
    return LocalDataSource.prefs.put(_key, updated);
  }
}
