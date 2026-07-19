import 'package:equatable/equatable.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/prefs_repository.dart';
import '../../data/repositories/subscription_repository.dart';
import '../../services/notification_service.dart';

class AppPrefs extends Equatable {
  const AppPrefs({
    required this.remindersEnabled,
    required this.captureEnabled,
  });

  final bool remindersEnabled;
  final bool captureEnabled;

  @override
  List<Object?> get props => [remindersEnabled, captureEnabled];
}

class PrefsNotifier extends Notifier<AppPrefs> {
  final _repo = PrefsRepository();

  @override
  AppPrefs build() => AppPrefs(
        remindersEnabled: _repo.remindersEnabled,
        captureEnabled: _repo.captureEnabled,
      );

  Future<void> setRemindersEnabled(bool value) async {
    await _repo.setRemindersEnabled(value);
    state = AppPrefs(remindersEnabled: value, captureEnabled: state.captureEnabled);
    if (value) {
      await NotificationService.scheduleAll(SubscriptionRepository().getAll());
    } else {
      await NotificationService.cancelAll();
    }
  }

  Future<void> setCaptureEnabled(bool value) async {
    await _repo.setCaptureEnabled(value);
    state = AppPrefs(remindersEnabled: state.remindersEnabled, captureEnabled: value);
  }
}

final prefsProvider =
    NotifierProvider<PrefsNotifier, AppPrefs>(PrefsNotifier.new);
