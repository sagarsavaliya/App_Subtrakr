import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

/// Awaits [action], showing an error SnackBar if it throws and (optionally)
/// a success SnackBar if it completes — the Flutter-side equivalent of the
/// web app's useServerAction hook. Returns true on success, false on
/// failure, so a caller can decide whether to proceed (e.g. close a sheet
/// only once the write actually succeeded, not just because it was
/// attempted).
Future<bool> runWithFeedback(
  BuildContext context, {
  required Future<void> Function() action,
  String? successMessage,
  String errorMessage = "That didn't work. Try again.",
}) async {
  try {
    await action();
    if (context.mounted && successMessage != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(successMessage)));
    }
    return true;
  } catch (e) {
    debugPrint('Action failed: $e');
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: AppColors.overdue,
        ),
      );
    }
    return false;
  }
}
