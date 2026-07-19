import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../providers/subscription_provider.dart';
import '../../widgets/dashboard/subscription_tile.dart';

class SubscriptionsListScreen extends ConsumerWidget {
  const SubscriptionsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subscriptions = ref.watch(filteredSubscriptionsProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenPadding,
            AppSpacing.lg,
            AppSpacing.screenPadding,
            120,
          ),
          children: [
            Text(
              'All subscriptions',
              style: AppTextStyles.heading1.copyWith(fontSize: 20),
            ),
            const SizedBox(height: 4),
            Text(
              '${subscriptions.length} tracked · swipe left to mark paid',
              style: AppTextStyles.hint,
            ),
            const SizedBox(height: AppSpacing.sectionGap),
            if (subscriptions.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 48),
                child: Center(
                  child: Text(
                    'Nothing here yet',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              )
            else
              for (final sub in subscriptions) ...[
                SubscriptionTile(
                  subscription: sub,
                  onTap: () => context.push('/subscription/${sub.id}'),
                ),
                const SizedBox(height: AppSpacing.listItemGap),
              ],
          ],
        ),
      ),
    );
  }
}
