import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import '../core/utils/currency_utils.dart';
import '../core/utils/date_utils.dart';
import '../data/models/subscription_model.dart';
import 'notification_action_bridge.dart';

const _markPaidActionId = 'mark_paid';
const _channelId = 'renewal_reminders';

/// Wraps flutter_local_notifications for PRD Sprint 6 — schedules a
/// reminder `remindDaysBefore` days before `nextDueDate`, with a "Mark Paid"
/// action button. Uses `inexactAllowWhileIdle` scheduling deliberately: a
/// multi-day-out reminder doesn't need exact-alarm precision, and avoiding
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

  static int _notificationId(String subscriptionId) => subscriptionId.hashCode & 0x7fffffff;

  static Future<void> scheduleReminder(SubscriptionModel sub) async {
    try {
      await cancelReminder(sub.id);
      if (sub.status != SubscriptionStatus.active) return;

      final reminderDate = sub.nextDueDate.subtract(Duration(days: sub.remindDaysBefore));
      final now = DateTime.now();
      // Past-due reminder dates still fire — a few seconds out — so a
      // subscription added with a near-term due date isn't silently skipped.
      final fireAt = reminderDate.isBefore(now) ? now.add(const Duration(seconds: 5)) : reminderDate;

      await _plugin.zonedSchedule(
        id: _notificationId(sub.id),
        title: '${sub.name} due in ${sub.remindDaysBefore} day${sub.remindDaysBefore == 1 ? '' : 's'}',
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
    } catch (e) {
      debugPrint('NotificationService.scheduleReminder failed (non-fatal): $e');
    }
  }

  static Future<void> cancelReminder(String subscriptionId) async {
    try {
      await _plugin.cancel(id: _notificationId(subscriptionId));
    } catch (e) {
      debugPrint('NotificationService.cancelReminder failed (non-fatal): $e');
    }
  }

  static Future<void> scheduleAll(List<SubscriptionModel> subscriptions) async {
    for (final sub in subscriptions) {
      await scheduleReminder(sub);
    }
  }
}
