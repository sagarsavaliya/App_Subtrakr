import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../core/utils/date_utils.dart';
import '../../../data/mock/mock_data.dart';
import '../../../data/models/subscription_model.dart';
import '../common/glass_surface.dart';
import '../common/service_logo.dart';

class DueCard extends StatelessWidget {
  const DueCard({super.key, required this.subscription, this.onTap});

  final SubscriptionModel subscription;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final overdue = subscription.isOverdue;
    final borderColor = overdue ? AppColors.overdue : AppColors.due;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 148,
          decoration: BoxDecoration(
            border: Border(left: BorderSide(color: borderColor, width: 3)),
            borderRadius: BorderRadius.circular(16),
          ),
          child: GlassSurface(
            borderRadius: 16,
            padding: const EdgeInsets.all(12),
            border: Border.all(color: AppColors.glassBorder),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ServiceLogo(
                  initials: subscription.initials,
                  color: MockData.logoColor(subscription.id),
                  size: 30,
                ),
                const SizedBox(height: 8),
                Text(
                  AppDateUtils.dueLabel(subscription.nextDueDate),
                  style: TextStyle(
                    fontSize: 11,
                    height: 1.2,
                    color: borderColor,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'DM Sans',
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subscription.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.2,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    fontFamily: 'DM Sans',
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  CurrencyUtils.formatWhole(subscription.amount),
                  style: const TextStyle(
                    fontFamily: 'DM Mono',
                    fontSize: 13,
                    height: 1.2,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
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
