import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/entity_model.dart';
import '../../../data/models/subscription_model.dart';

class StatusDot extends StatelessWidget {
  const StatusDot({super.key, required this.subscription});

  final SubscriptionModel subscription;

  @override
  Widget build(BuildContext context) {
    final color = switch (subscription.status) {
      SubscriptionStatus.trial => AppColors.trial,
      SubscriptionStatus.paused => AppColors.textHint,
      SubscriptionStatus.cancelled => AppColors.textHint,
      SubscriptionStatus.active =>
        subscription.isOverdue
            ? AppColors.overdue
            : subscription.isDueSoon
            ? AppColors.due
            : AppColors.paid,
    };
    return Container(
      width: 7,
      height: 7,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(color: color.withValues(alpha: 0.6), blurRadius: 6),
        ],
      ),
    );
  }
}

/// Labeled status pill (Active / Due soon / Overdue / Paused / Trial /
/// Cancelled) — used on the subscription detail screen's status card.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.subscription});

  final SubscriptionModel subscription;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (subscription.status) {
      SubscriptionStatus.trial => ('Trial', AppColors.trial),
      SubscriptionStatus.paused => ('Paused', AppColors.textSecondary),
      SubscriptionStatus.cancelled => ('Cancelled', AppColors.textHint),
      SubscriptionStatus.active => subscription.isOverdue
          ? ('Overdue', AppColors.overdue)
          : subscription.isDueSoon
          ? ('Due soon', AppColors.due)
          : ('Active', AppColors.paid),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppSpacing.chipRadius),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(
        label,
        style: AppTextStyles.label.copyWith(color: color, fontSize: 11),
      ),
    );
  }
}

class EntityTag extends StatelessWidget {
  const EntityTag({super.key, required this.entity});

  final EntityModel entity;

  @override
  Widget build(BuildContext context) {
    final isPersonal = entity.type == EntityType.personal;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1.5),
      decoration: BoxDecoration(
        color: isPersonal ? AppColors.personalBg : AppColors.companyBg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        entity.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: AppTextStyles.hint.copyWith(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: isPersonal ? AppColors.personal : AppColors.accentGlow,
        ),
      ),
    );
  }
}
