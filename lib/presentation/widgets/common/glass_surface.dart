import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

/// Frosted glass panel — the base surface primitive for the whole app.
/// `strong` uses a denser fill for surfaces that need to read above other glass.
class GlassSurface extends StatelessWidget {
  const GlassSurface({
    super.key,
    required this.child,
    this.borderRadius = 20,
    this.strong = false,
    this.padding,
    this.border,
    this.blur = 18,
    this.gradientOverlay,
  });

  final Widget child;
  final double borderRadius;
  final bool strong;
  final EdgeInsetsGeometry? padding;
  final Border? border;
  final double blur;
  final Gradient? gradientOverlay;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(borderRadius);
    return ClipRRect(
      borderRadius: radius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: strong ? AppColors.glassFillStrong : AppColors.glassFill,
            gradient: gradientOverlay,
            borderRadius: radius,
            border:
                border ?? Border.all(color: AppColors.glassBorder, width: 1),
          ),
          child: child,
        ),
      ),
    );
  }
}
