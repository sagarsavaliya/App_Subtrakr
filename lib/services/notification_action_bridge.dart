/// Wires notification taps back into the running app (Riverpod container +
/// router) without NotificationService needing to know about either.
/// Set once from `app.dart` on startup.
class NotificationActionBridge {
  NotificationActionBridge._();

  static void Function(String subscriptionId)? onMarkPaid;
  static void Function(String subscriptionId)? onOpenSubscription;
}
