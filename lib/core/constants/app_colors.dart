import 'package:flutter/material.dart';

/// Dark glassmorphism token set — replaces PRD §8.1's flat light palette.
/// Status and entity hues are carried forward from the PRD, re-tinted for a dark ground.
class AppColors {
  AppColors._();

  // Ground
  static const bgVoid = Color(0xFF060B0A);
  static const bgBase = Color(0xFF0A1614);
  static const bgElevated = Color(0xFF0F1E1B);
  static const bgElevated2 = Color(0xFF122522);

  // Glass surface
  static const glassFill = Color(0x0EFFFFFF); // ~5.5%
  static const glassFillStrong = Color(0x18FFFFFF); // ~9.5%
  static const glassBorder = Color(0x1CFFFFFF); // ~11%
  static const glassBorderSoft = Color(0x12FFFFFF); // ~7%
  static const glassBorderAccent = Color(0x615EEAC5); // accentGlow ~38%

  // Brand gradient (kept from PRD gradientStart/gradientEnd)
  static const accentA = Color(0xFF2EC4A0);
  static const accentB = Color(0xFF17859E);
  static const accentGlow = Color(0xFF5EEAC5);
  static const brandGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [accentA, accentB],
  );

  // Entity colors
  static const personal = Color(0xFFA78BFA);
  static const personalBg = Color(0x24A78BFA);
  static const personalBorder = Color(0x52A78BFA);
  static const company = accentA;
  static const companyBg = Color(0x242EC4A0);

  // Status
  static const paid = accentA;
  static const due = Color(0xFFFBBF24);
  static const dueBg = Color(0x24FBBF24);
  static const overdue = Color(0xFFF87171);
  static const overdueBg = Color(0x24F87171);
  static const overdueBorder = Color(0x59F87171);
  static const trial = Color(0xFFC4B5FD);
  static const trialBg = Color(0x24C4B5FD);

  // Text
  static const textPrimary = Color(0xFFEEF5F2);
  static const textSecondary = Color(0xFF93A8A1);
  static const textHint = Color(0xFF5B6E68);

  // Shadows
  static const shadowAmbient = [
    BoxShadow(color: Color(0xA6000000), blurRadius: 40, offset: Offset(0, 16)),
  ];
  static const shadowGlow = [
    BoxShadow(color: Color(0x592EC4A0), blurRadius: 32, offset: Offset(0, 8)),
  ];

  /// Service monogram identity colors — distinct from brand accent by design.
  static const serviceNetflix = Color(0xFFE5484D);
  static const serviceSpotify = Color(0xFFA3E635);
  static const serviceClaude = Color(0xFFE8703A);
  static const serviceGithub = Color(0xFFC7D0D6);
  static const serviceAws = Color(0xFFFF9900);
  static const serviceGoogle = Color(0xFF4285F4);
  static const serviceJio = Color(0xFF8B9BFF);
}
