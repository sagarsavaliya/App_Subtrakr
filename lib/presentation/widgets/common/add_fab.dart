import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

/// The gradient FAB that opens the Add Subscription sheet — lives on the
/// shell's outer Scaffold so it floats correctly above the glass bottom nav.
class AddFab extends StatelessWidget {
  const AddFab({super.key, required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(20)),
      ),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            gradient: AppColors.brandGradient,
            borderRadius: BorderRadius.circular(20),
            boxShadow: AppColors.shadowGlow,
          ),
          child: const Icon(Icons.add, color: Color(0xFF08201A), size: 26),
        ),
      ),
    );
  }
}
