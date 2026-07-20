import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../providers/subscription_provider.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/dashboard/subscription_tile.dart';

/// The dashboard bell opens this instead of doing nothing — an in-app view
/// of what actually needs attention (overdue first, then due within 7
/// days), reusing the same swipe-to-mark-paid row used everywhere else.
Future<void> showNotificationsSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const NotificationsSheet(),
  );
}

class NotificationsSheet extends ConsumerWidget {
  const NotificationsSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dueOrOverdue = ref.watch(dueThisWeekProvider);
    final overdue = dueOrOverdue.where((s) => s.isOverdue).toList();
    final dueSoon = dueOrOverdue.where((s) => !s.isOverdue).toList();

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      minChildSize: 0.35,
      expand: false,
      builder: (context, scrollController) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.glassBorder),
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.bgElevated.withValues(alpha: 0.97),
                  AppColors.bgVoid.withValues(alpha: 0.99),
                ],
              ),
            ),
            child: Column(
              children: [
                const SizedBox(height: 12),
                Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.screenPadding,
                    12,
                    AppSpacing.lg,
                    12,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Notifications',
                        style: AppTextStyles.heading1.copyWith(fontSize: 17),
                      ),
                      IconGlassButton(
                        icon: Icons.close,
                        size: 32,
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: dueOrOverdue.isEmpty
                      ? _EmptyState(scrollController: scrollController)
                      : ListView(
                          controller: scrollController,
                          padding: const EdgeInsets.fromLTRB(
                            AppSpacing.screenPadding,
                            0,
                            AppSpacing.screenPadding,
                            32,
                          ),
                          children: [
                            if (overdue.isNotEmpty) ...[
                              Text(
                                'Overdue',
                                style: AppTextStyles.heading3.copyWith(
                                  color: AppColors.overdue,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.md),
                              for (final sub in overdue) ...[
                                SubscriptionTile(
                                  subscription: sub,
                                  onTap: () {
                                    Navigator.of(context).pop();
                                    context.push('/subscription/${sub.id}');
                                  },
                                ),
                                const SizedBox(height: AppSpacing.listItemGap),
                              ],
                              const SizedBox(height: AppSpacing.md),
                            ],
                            if (dueSoon.isNotEmpty) ...[
                              Text('Due this week', style: AppTextStyles.heading3),
                              const SizedBox(height: AppSpacing.md),
                              for (final sub in dueSoon) ...[
                                SubscriptionTile(
                                  subscription: sub,
                                  onTap: () {
                                    Navigator.of(context).pop();
                                    context.push('/subscription/${sub.id}');
                                  },
                                ),
                                const SizedBox(height: AppSpacing.listItemGap),
                              ],
                            ],
                          ],
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.scrollController});

  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    return ListView(
      controller: scrollController,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 56),
          child: Column(
            children: [
              const Icon(
                Icons.check_circle_outline,
                size: 40,
                color: AppColors.textHint,
              ),
              const SizedBox(height: 12),
              Text(
                'You\'re all caught up',
                style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 4),
              Text('Nothing overdue or due this week', style: AppTextStyles.hint),
            ],
          ),
        ),
      ],
    );
  }
}
