import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import '../core/utils/currency_utils.dart';
import '../core/utils/date_utils.dart';
import '../data/models/subscription_model.dart';
import '../data/repositories/prefs_repository.dart';
import 'notification_action_bridge.dart';

const _markPaidActionId = 'mark_paid';
const _channelId = 'renewal_reminders';

/// A single reminder felt thin for anything that actually matters — a
/// ₹15,000/year tool deserves more runway to catch than a ₹199/month one,
/// so the cascade scales with the stakes of missing that particular
/// renewal rather than firing the same one-shot for everything.
List<int> _reminderOffsets(BillingCycle cycle) {
  switch (cycle) {
    case BillingCycle.yearly:
    case BillingCycle.halfYearly:
      return const [14, 7, 3, 1];
    case BillingCycle.quarterly:
      return const [7, 3, 1];
    case BillingCycle.monthly:
    case BillingCycle.weekly:
    case BillingCycle.custom:
      return const [3, 1];
  }
}

/// Wraps flutter_local_notifications for PRD Sprint 6 — schedules a
/// multi-stage cascade of reminders before `nextDueDate` (see
/// [_reminderOffsets]), each with a "Mark Paid" action button. Uses
/// `inexactAllowWhileIdle` scheduling deliberately: a multi-day-out
/// reminder doesn't need exact-alarm precision, and avoiding
/// `SCHEDULE_EXACT_ALARM` sidesteps another store-review-sensitive Android
/// permission (see the payment-detection compliance note for the pattern).
class NotificationService {
  NotificationService._();

  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  /// Every public method swallows its own errors — unsupported platforms
  /// (web scheduling, a bare test host with no plugin registrant) or a
  /// denied permission should never take the rest of the app down with them.
  static Future<void> init() async {
    if (_initialized) return;
    try {
      tzdata.initializeTimeZones();

      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosSettings = DarwinInitializationSettings();
      const settings = InitializationSettings(android: androidSettings, iOS: iosSettings);

      await _plugin.initialize(
        settings: settings,
        onDidReceiveNotificationResponse: _handleResponse,
      );

      const channel = AndroidNotificationChannel(
        _channelId,
        'Renewal reminders',
        description: 'Reminders before a subscription renews',
        importance: Importance.high,
      );
      await _plugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);

      _initialized = true;
    } catch (e) {
      debugPrint('NotificationService.init failed (non-fatal): $e');
    }
  }

  static Future<void> requestPermission() async {
    try {
      await _plugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
      await _plugin
          .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(alert: true, badge: true, sound: true);
    } catch (e) {
      debugPrint('NotificationService.requestPermission failed (non-fatal): $e');
    }
  }

  static void _handleResponse(NotificationResponse response) {
    final subscriptionId = response.payload;
    if (subscriptionId == null) return;
    if (response.actionId == _markPaidActionId) {
      NotificationActionBridge.onMarkPaid?.call(subscriptionId);
    } else {
      NotificationActionBridge.onOpenSubscription?.call(subscriptionId);
    }
  }

  /// Handles the case `onDidReceiveNotificationResponse` never covers: the
  /// app was fully killed (not just backgrounded) and the user tapped a
  /// reminder notification (or its Mark Paid action) to launch it. Without
  /// this, that tap is silently dropped — call once after the widget tree
  /// (and NotificationActionBridge) is ready.
  static Future<void> checkLaunchDetails() async {
    try {
      final details = await _plugin.getNotificationAppLaunchDetails();
      if (details?.didNotificationLaunchApp == true && details!.notificationResponse != null) {
        _handleResponse(details.notificationResponse!);
      }
    } catch (e) {
      debugPrint('NotificationService.checkLaunchDetails failed (non-fatal): $e');
    }
  }

  // Every id bucket scheduleReminder can possibly use — the widest cascade
  // across all billing cycles, plus 0 for the near-term fallback fire.
  // cancelReminder needs this full list, not just the offsets valid for the
  // subscription's *current* cycle, since the cycle may have changed since
  // the reminder was originally scheduled.
  static const _allPossibleOffsets = [14, 7, 3, 1, 0];

  static int _notificationId(String subscriptionId, int offsetDays) =>
      '$subscriptionId:$offsetDays'.hashCode & 0x7fffffff;

  static Future<void> scheduleReminder(SubscriptionModel sub) async {
    try {
      await cancelReminder(sub.id);
      if (sub.status != SubscriptionStatus.active) return;
      if (!PrefsRepository().remindersEnabled) return;

      final now = DateTime.now();
      var scheduledAny = false;
      for (final offset in _reminderOffsets(sub.billingCycle)) {
        final reminderDate = sub.nextDueDate.subtract(Duration(days: offset));
        // A past-due offset (e.g. the 14-day mark on a subscription added
        // 5 days out) is simply skipped — dropping one stage of a cascade
        // doesn't mean losing the reminder entirely, unlike the old
        // single-reminder version. The fallback below covers the case
        // where every stage is already past.
        if (reminderDate.isBefore(now)) continue;
        await _fire(sub, offsetLabel: offset, fireAt: reminderDate);
        scheduledAny = true;
      }

      if (!scheduledAny && sub.nextDueDate.isAfter(now)) {
        // Due soon enough that every cascade stage already passed — still
        // due in the future, so fire something rather than going silent.
        final daysLeft = sub.nextDueDate.difference(now).inDays;
        await _fire(
          sub,
          offsetLabel: daysLeft,
          fireAt: now.add(const Duration(seconds: 5)),
          idOffset: 0, // distinct id bucket from the cascade offsets above
        );
      }
    } catch (e) {
      debugPrint('NotificationService.scheduleReminder failed (non-fatal): $e');
    }
  }

  static Future<void> _fire(
    SubscriptionModel sub, {
    required int offsetLabel,
    required DateTime fireAt,
    int? idOffset,
  }) async {
    await _plugin.zonedSchedule(
      id: _notificationId(sub.id, idOffset ?? offsetLabel),
      title: offsetLabel <= 0
          ? '${sub.name} due today'
          : '${sub.name} due in $offsetLabel day${offsetLabel == 1 ? '' : 's'}',
      body: '${CurrencyUtils.formatWhole(sub.amount)} · renews ${AppDateUtils.formatDate(sub.nextDueDate)}',
      scheduledDate: tz.TZDateTime.from(fireAt, tz.local),
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          'Renewal reminders',
          channelDescription: 'Reminders before a subscription renews',
          importance: Importance.high,
          priority: Priority.high,
          actions: const [
            AndroidNotificationAction(_markPaidActionId, 'Mark Paid'),
          ],
        ),
        iOS: const DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      payload: sub.id,
    );
  }

  static Future<void> cancelReminder(String subscriptionId) async {
    try {
      for (final offset in _allPossibleOffsets) {
        await _plugin.cancel(id: _notificationId(subscriptionId, offset));
      }
    } catch (e) {
      debugPrint('NotificationService.cancelReminder failed (non-fatal): $e');
    }
  }

  static Future<void> scheduleAll(List<SubscriptionModel> subscriptions) async {
    for (final sub in subscriptions) {
      await scheduleReminder(sub);
    }
  }

  static Future<void> cancelAll() async {
    try {
      await _plugin.cancelAll();
    } catch (e) {
      debugPrint('NotificationService.cancelAll failed (non-fatal): $e');
    }
  }
}
