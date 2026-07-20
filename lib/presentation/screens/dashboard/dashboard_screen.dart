import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../core/utils/date_utils.dart';
import '../../../data/models/entity_model.dart';
import '../../../services/auth_service.dart';
import '../../../services/notification_service.dart';
import '../../../services/sync_service.dart';
import '../../providers/entity_provider.dart';
import '../../providers/payment_history_provider.dart';
import '../../providers/subscription_provider.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_chip.dart';
import '../../widgets/dashboard/due_card.dart';
import '../../widgets/dashboard/hero_summary_card.dart';
import '../../widgets/dashboard/subscription_tile.dart';
import '../entities/entity_edit_sheet.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  /// PRD S4-10 — re-pulls from the server so a second device's changes
  /// show up here too. No-ops (resolves immediately) in offline demo mode.
  Future<void> _refresh(WidgetRef ref) async {
    final pulled = await SyncService.pullAll();
    if (!pulled) return;
    ref.invalidate(entitiesProvider);
    ref.invalidate(subscriptionsProvider);
    ref.invalidate(paymentHistoryProvider);
    await NotificationService.scheduleAll(ref.read(subscriptionsProvider));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entities = ref.watch(entitiesProvider);
    final selectedEntityId = ref.watch(selectedEntityIdProvider);
    final subscriptions = ref.watch(filteredSubscriptionsProvider);
    final dueThisWeek = ref.watch(dueThisWeekProvider);
    final totalSpend = ref.watch(totalMonthlySpendProvider);
    final activeCount = ref.watch(activeCountProvider);
    final autoDebitCount = ref.watch(autoDebitCountProvider);
    final now = DateTime.now();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.accentGlow,
          backgroundColor: AppColors.bgElevated,
          onRefresh: () => _refresh(ref),
          child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenPadding,
            AppSpacing.lg,
            AppSpacing.screenPadding,
            120,
          ),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        AppDateUtils.greetingDate(now),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.hint,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${AppDateUtils.timeOfDayGreeting(now)}, ${AuthService.hasSession ? AuthService.displayName : 'there'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.heading1.copyWith(fontSize: 19),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                IconGlassButton(
                  icon: Icons.notifications_outlined,
                  showBadge: true,
                  onPressed: () {},
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            HeroSummaryCard(
              totalMonthlySpend: totalSpend,
              activeCount: activeCount,
              dueThisWeek: dueThisWeek.length,
              autoDebitCount: autoDebitCount,
            ),
            const SizedBox(height: AppSpacing.sectionGap),
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  AppChip(
                    label: 'All',
                    variant: selectedEntityId == null
                        ? ChipVariant.active
                        : ChipVariant.glass,
                    onTap: () =>
                        ref.read(selectedEntityIdProvider.notifier).state =
                            null,
                  ),
                  const SizedBox(width: 8),
                  for (final entity in entities) ...[
                    AppChip(
                      label: entity.name,
                      variant: selectedEntityId == entity.id
                          ? ChipVariant.active
                          : entity.type == EntityType.personal
                          ? ChipVariant.personal
                          : ChipVariant.company,
                      onTap: () =>
                          ref.read(selectedEntityIdProvider.notifier).state =
                              entity.id,
                    ),
                    const SizedBox(width: 8),
                  ],
                  AppChip(
                    label: '+ Add',
                    variant: ChipVariant.ghost,
                    onTap: () => showEntityEditSheet(context),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sectionGap),
            if (dueThisWeek.isNotEmpty) ...[
              Text('Due this week', style: AppTextStyles.heading3),
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                height: 150,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: dueThisWeek.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(width: AppSpacing.md),
                  itemBuilder: (context, i) => DueCard(
                    subscription: dueThisWeek[i],
                    onTap: () => context.push('/subscription/${dueThisWeek[i].id}'),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.sectionGap),
            ],
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('All subscriptions', style: AppTextStyles.heading3),
                Text(
                  '${subscriptions.length} total',
                  style: AppTextStyles.hint,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            if (subscriptions.isEmpty)
              const _EmptyState()
            else
              Column(
                children: [
                  for (final sub in subscriptions) ...[
                    SubscriptionTile(
                      subscription: sub,
                      onTap: () => context.push('/subscription/${sub.id}'),
                    ),
                    const SizedBox(height: AppSpacing.listItemGap),
                  ],
                ],
              ),
          ],
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          Icon(Icons.inventory_2_outlined, size: 40, color: AppColors.textHint),
          const SizedBox(height: 12),
          Text(
            'No subscriptions in this entity yet',
            style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}
