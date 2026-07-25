import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_text_styles.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get dark {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: AppColors.bgBase,
      colorScheme: base.colorScheme.copyWith(
        surface: AppColors.bgElevated,
        primary: AppColors.accentA,
        secondary: AppColors.accentB,
        error: AppColors.overdue,
      ),
      textTheme: base.textTheme.apply(
        bodyColor: AppColors.textPrimary,
        displayColor: AppColors.textPrimary,
        fontFamily: 'DM Sans',
      ),
      splashFactory: InkRipple.splashFactory,
      highlightColor: AppColors.glassFill,
      dividerColor: AppColors.glassBorderSoft,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: AppTextStyles.heading1,
        iconTheme: IconThemeData(color: AppColors.textPrimary),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.transparent,
        modalBackgroundColor: Colors.transparent,
        elevation: 0,
      ),
      textSelectionTheme: const TextSelectionThemeData(
        cursorColor: AppColors.accentGlow,
        selectionColor: Color(0x475EEAC5),
        selectionHandleColor: AppColors.accentGlow,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.bgElevated2,
        contentTextStyle: AppTextStyles.body,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: ZoomPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      // showDatePicker's stock Material dialog defaults to Material blue —
      // themed here so it matches the web app's custom dark-glass date
      // picker instead of looking like a different product mid-flow.
      datePickerTheme: DatePickerThemeData(
        backgroundColor: AppColors.bgElevated2,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        headerBackgroundColor: Colors.transparent,
        headerForegroundColor: AppColors.textPrimary,
        headerHeadlineStyle: AppTextStyles.heading2,
        weekdayStyle: AppTextStyles.label.copyWith(color: AppColors.textHint),
        dayStyle: AppTextStyles.body,
        todayForegroundColor: const WidgetStatePropertyAll(AppColors.accentGlow),
        todayBorder: const BorderSide(color: AppColors.accentGlow, width: 1.5),
        dayForegroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return const Color(0xFF08201A);
          if (states.contains(WidgetState.disabled)) return AppColors.textHint;
          return AppColors.textSecondary;
        }),
        dayBackgroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return AppColors.accentA;
          return Colors.transparent;
        }),
        dayOverlayColor: const WidgetStatePropertyAll(AppColors.glassFill),
        yearForegroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return const Color(0xFF08201A);
          return AppColors.textSecondary;
        }),
        yearBackgroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return AppColors.accentA;
          return Colors.transparent;
        }),
        confirmButtonStyle: TextButton.styleFrom(foregroundColor: AppColors.accentGlow),
        cancelButtonStyle: TextButton.styleFrom(foregroundColor: AppColors.textSecondary),
      ),
    );
  }
}
