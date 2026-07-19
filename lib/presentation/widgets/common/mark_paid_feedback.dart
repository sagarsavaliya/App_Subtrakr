import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/subscription_model.dart';
import '../../providers/subscription_provider.dart';

/// Marks [subscription] paid and shows a 5-second Undo snackbar (PRD S5-4) —
/// shared between the dashboard swipe action and the detail screen's button.
void markPaidWithUndo(
  BuildContext context,
  WidgetRef ref,
  SubscriptionModel subscription,
) {
  final result = ref.read(subscriptionsProvider.notifier).markPaid(subscription.id);
  if (result == null) return;

  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text('${subscription.name} marked paid · next due advanced'),
        duration: const Duration(seconds: 5),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () => ref
              .read(subscriptionsProvider.notifier)
              .undoMarkPaid(result.previous, result.paymentId),
        ),
      ),
    );
}
