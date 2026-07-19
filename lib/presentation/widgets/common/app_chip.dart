import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import 'glass_surface.dart';

enum ChipVariant { glass, active, personal, company, ghost }

class AppChip extends StatelessWidget {
  const AppChip({
    super.key,
    required this.label,
    this.variant = ChipVariant.glass,
    this.onTap,
    this.icon,
  });

  final String label;
  final ChipVariant variant;
  final VoidCallback? onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final content = Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.sm + 1,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: _fg()),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: AppTextStyles.bodyMedium.copyWith(
              fontSize: 12.5,
              color: _fg(),
            ),
          ),
        ],
      ),
    );

    Widget child;
    switch (variant) {
      case ChipVariant.active:
        child = Container(
          decoration: BoxDecoration(
            gradient: AppColors.brandGradient,
            borderRadius: BorderRadius.circular(AppSpacing.chipRadius),
          ),
          child: content,
        );
      case ChipVariant.personal:
        child = Container(
          decoration: BoxDecoration(
            color: AppColors.personalBg,
            borderRadius: BorderRadius.circular(AppSpacing.chipRadius),
            border: Border.all(color: AppColors.personalBorder),
          ),
          child: content,
        );
      case ChipVariant.company:
        child = Container(
          decoration: BoxDecoration(
            color: AppColors.companyBg,
            borderRadius: BorderRadius.circular(AppSpacing.chipRadius),
            border: Border.all(color: AppColors.glassBorderAccent),
          ),
          child: content,
        );
      case ChipVariant.ghost:
        child = Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppSpacing.chipRadius),
            border: Border.all(
              color: AppColors.glassBorder,
              style: BorderStyle.solid,
            ),
          ),
          child: content,
        );
      case ChipVariant.glass:
        child = GlassSurface(
          borderRadius: AppSpacing.chipRadius,
          blur: 12,
          child: content,
        );
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.chipRadius),
        child: child,
      ),
    );
  }

  Color _fg() {
    switch (variant) {
      case ChipVariant.active:
        return const Color(0xFF08201A);
      case ChipVariant.personal:
        return AppColors.personal;
      case ChipVariant.company:
        return AppColors.accentGlow;
      case ChipVariant.ghost:
        return AppColors.textSecondary;
      case ChipVariant.glass:
        return AppColors.textPrimary;
    }
  }
}
