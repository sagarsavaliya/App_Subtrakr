import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Type scale carried forward from PRD §8.2 unchanged — only the font source
/// changed (bundled local DM Sans/DM Mono assets instead of google_fonts).
class AppTextStyles {
  AppTextStyles._();

  static const _sans = 'DM Sans';
  static const _mono = 'DM Mono';

  static const heroAmount = TextStyle(
    fontFamily: _mono,
    fontSize: 36,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    fontFeatures: [FontFeature.tabularFigures()],
  );
  static const heading1 = TextStyle(
    fontFamily: _sans,
    fontSize: 22,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );
  static const heading2 = TextStyle(
    fontFamily: _sans,
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );
  static const heading3 = TextStyle(
    fontFamily: _sans,
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );
  static const body = TextStyle(
    fontFamily: _sans,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.textPrimary,
  );
  static const bodyMedium = TextStyle(
    fontFamily: _sans,
    fontSize: 14,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
  );
  static const label = TextStyle(
    fontFamily: _sans,
    fontSize: 11,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.8,
    color: AppColors.textSecondary,
  );
  static const hint = TextStyle(
    fontFamily: _sans,
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.textHint,
  );
  static const amount = TextStyle(
    fontFamily: _mono,
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    fontFeatures: [FontFeature.tabularFigures()],
  );
  static const amountSmall = TextStyle(
    fontFamily: _mono,
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
    fontFeatures: [FontFeature.tabularFigures()],
  );
}
