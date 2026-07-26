import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/payment_history_model.dart';
import '../../../data/models/subscription_model.dart';
import '../../providers/subscription_provider.dart';

/// Marks [subscription] paid and shows a 5-second Undo snackbar (PRD S5-4) —
/// shared between the dashboard swipe action and the detail screen's button.
Future<void> markPaidWithUndo(
  BuildContext context,
  WidgetRef ref,
  SubscriptionModel subscription, {
  double? amountPaid,
  PaymentSource source = PaymentSource.manual,
}) async {
  final ({SubscriptionModel previous, String paymentId})? result;
  try {
    result = await ref
        .read(subscriptionsProvider.notifier)
        .markPaid(subscription.id, amountPaid: amountPaid, source: source);
  } catch (e) {
    debugPrint('markPaid failed: $e');
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text("Couldn't mark that paid. Try again."),
          backgroundColor: AppColors.overdue,
        ),
      );
    }
    return;
  }
  if (result == null || !context.mounted) return;

  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text('${subscription.name} marked paid · next due advanced'),
        duration: const Duration(seconds: 5),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () async {
            try {
              await ref
                  .read(subscriptionsProvider.notifier)
                  .undoMarkPaid(result!.previous, result.paymentId);
            } catch (e) {
              debugPrint('undoMarkPaid failed: $e');
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text("Couldn't undo — try marking it back manually."),
                    backgroundColor: AppColors.overdue,
                  ),
                );
              }
            }
          },
        ),
      ),
    );
}
