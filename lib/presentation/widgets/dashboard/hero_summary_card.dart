import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../core/utils/currency_utils.dart';

class HeroSummaryCard extends StatelessWidget {
  const HeroSummaryCard({
    super.key,
    required this.totalMonthlySpend,
    required this.activeCount,
    required this.dueThisWeek,
    required this.autoDebitCount,
  });

  final double totalMonthlySpend;
  final int activeCount;
  final int dueThisWeek;
  final int autoDebitCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.xl,
        AppSpacing.xl,
        AppSpacing.xl,
        AppSpacing.lg,
      ),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.glassBorderAccent),
        boxShadow: AppColors.shadowGlow,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.accentA.withValues(alpha: 0.22),
            AppColors.accentB.withValues(alpha: 0.12),
            Colors.white.withValues(alpha: 0.04),
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'TOTAL MONTHLY SPEND',
            style: AppTextStyles.label.copyWith(
              color: Colors.white.withValues(alpha: 0.65),
            ),
          ),
          const SizedBox(height: 8),
          ShaderMask(
            shaderCallback: (rect) => const LinearGradient(
              colors: [Colors.white, AppColors.accentGlow],
            ).createShader(rect),
            child: Text(
              CurrencyUtils.formatWhole(totalMonthlySpend),
              style: AppTextStyles.heroAmount,
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _Stat(value: '$activeCount', label: 'Active'),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _Stat(value: '$dueThisWeek', label: 'Due this week'),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _Stat(value: '$autoDebitCount', label: 'Auto-debit'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: AppTextStyles.amountSmall),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTextStyles.hint.copyWith(
              fontSize: 10.5,
              color: Colors.white.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }
}
