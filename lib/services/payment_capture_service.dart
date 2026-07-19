import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:receive_sharing_intent/receive_sharing_intent.dart';
import '../data/models/subscription_model.dart';
import '../data/repositories/prefs_repository.dart';
import '../data/repositories/subscription_repository.dart';
import 'payment_parser.dart';

/// Receives text shared into the app (bank SMS, UPI notification, etc. via
/// the OS share sheet — never by reading SMS/notifications directly, see
/// the payment-detection compliance note), parses it, and matches it to a
/// tracked subscription so the UI can show the payment nudge sheet.
class PaymentCaptureService {
  PaymentCaptureService._();

  /// Set by the app shell once the widget tree/router can show a sheet.
  static void Function(SubscriptionModel matched, double detectedAmount)?
      onPaymentDetected;

  static StreamSubscription<List<SharedMediaFile>>? _streamSub;

  /// Call after the router is ready. Handles both the cold-start share
  /// (app launched by the share) and warm shares while the app lives.
  /// No-ops on web/desktop where the plugin has no implementation.
  static Future<void> init() async {
    if (kIsWeb) return;
    try {
      final initial = await ReceiveSharingIntent.instance.getInitialMedia();
      _handleShared(initial);
      await ReceiveSharingIntent.instance.reset();
      _streamSub ??= ReceiveSharingIntent.instance.getMediaStream().listen(
            _handleShared,
            onError: (Object e) => debugPrint(
              'PaymentCaptureService stream error (non-fatal): $e',
            ),
          );
    } catch (e) {
      debugPrint('PaymentCaptureService.init failed (non-fatal): $e');
    }
  }

  static void _handleShared(List<SharedMediaFile> files) {
    for (final file in files) {
      if (file.type == SharedMediaType.text || file.type == SharedMediaType.url) {
        _processText(file.path);
        return;
      }
    }
  }

  static void _processText(String text) {
    if (text.trim().isEmpty) return;
    if (!PrefsRepository().captureEnabled) return;
    final subscriptions = SubscriptionRepository().getAll();
    final amount = PaymentParser.extractAmount(text);
    final matched = PaymentParser.match(subscriptions, text, amount: amount);
    if (matched == null) {
      debugPrint('PaymentCaptureService: no subscription matched shared text');
      return;
    }
    onPaymentDetected?.call(matched, amount ?? matched.amount);
  }
}
