import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import 'glass_surface.dart';

/// Primary gradient CTA — full-width by default, matches the approved mockup.
class GradientButton extends StatelessWidget {
  const GradientButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
        child: Ink(
          decoration: BoxDecoration(
            gradient: AppColors.brandGradient,
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
            boxShadow: AppColors.shadowGlow,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 17, color: const Color(0xFF08201A)),
                  const SizedBox(width: 8),
                ],
                Text(
                  label,
                  style: AppTextStyles.bodyMedium.copyWith(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF08201A),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Secondary glass button — used for the two-across ghost row (e.g. nudge actions).
class GlassButton extends StatelessWidget {
  const GlassButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
        child: GlassSurface(
          borderRadius: AppSpacing.buttonRadius,
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 15, color: AppColors.textPrimary),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: AppTextStyles.bodyMedium.copyWith(fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class IconGlassButton extends StatelessWidget {
  const IconGlassButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.showBadge = false,
    this.size = AppSpacing.iconButtonSize,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final bool showBadge;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Material(
            color: Colors.transparent,
            shape: const CircleBorder(),
            child: InkWell(
              onTap: onPressed,
              customBorder: const CircleBorder(),
              child: GlassSurface(
                borderRadius: size / 2,
                child: SizedBox(
                  width: size,
                  height: size,
                  child: Icon(
                    icon,
                    size: size * 0.42,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ),
          ),
          if (showBadge)
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: AppColors.overdue,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.bgVoid, width: 2),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
