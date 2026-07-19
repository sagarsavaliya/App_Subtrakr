import 'package:flutter/material.dart';
import '../../../core/constants/app_text_styles.dart';

/// Monogram avatar standing in for a service's brand logo.
/// Colors are content-identity markers, deliberately distinct from the UI accent hue.
class ServiceLogo extends StatelessWidget {
  const ServiceLogo({
    super.key,
    required this.initials,
    required this.color,
    this.size = 36,
    this.small = false,
  });

  final String initials;
  final Color color;
  final double size;
  final bool small;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(size * 0.3),
      ),
      child: Text(
        initials,
        style: AppTextStyles.heading3.copyWith(
          color: color,
          fontSize: size * 0.36,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
