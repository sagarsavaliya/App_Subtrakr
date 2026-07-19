import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../data/mock/mock_data.dart';
import '../../../data/models/subscription_model.dart';
import '../../providers/entity_provider.dart';
import '../common/glass_surface.dart';
import '../common/mark_paid_feedback.dart';
import '../common/service_logo.dart';
import '../common/status_pill.dart';

const double _revealWidth = 76;

/// A dashboard list row with a swipe-left "Mark Paid" reveal action,
/// matching the approved mockup's swipe-to-pay interaction.
class SubscriptionTile extends ConsumerStatefulWidget {
  const SubscriptionTile({super.key, required this.subscription, this.onTap});

  final SubscriptionModel subscription;
  final VoidCallback? onTap;

  @override
  ConsumerState<SubscriptionTile> createState() => _SubscriptionTileState();
}

class _SubscriptionTileState extends ConsumerState<SubscriptionTile> {
  double _drag = 0;

  @override
  Widget build(BuildContext context) {
    final sub = widget.subscription;
    final entities = ref.watch(entitiesProvider);
    final entity = entities.firstWhere(
      (e) => e.id == sub.entityId,
      orElse: () => entities.first,
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Stack(
        children: [
          Positioned.fill(
            child: Align(
              alignment: Alignment.centerRight,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () {
                    setState(() => _drag = 0);
                    markPaidWithUndo(context, ref, sub);
                  },
                  child: Container(
                    width: _revealWidth,
                    height: double.infinity,
                    decoration: const BoxDecoration(
                      gradient: AppColors.brandGradient,
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      'Mark\nPaid',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF08201A),
                        fontFamily: 'DM Sans',
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: widget.onTap,
            onHorizontalDragUpdate: (details) {
              setState(
                () =>
                    _drag = (_drag + details.delta.dx).clamp(-_revealWidth, 0),
              );
            },
            onHorizontalDragEnd: (details) {
              setState(
                () => _drag = _drag < -_revealWidth / 2 ? -_revealWidth : 0,
              );
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOut,
              transform: Matrix4.translationValues(_drag, 0, 0),
              child: GlassSurface(
                borderRadius: 16,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md + 2,
                  vertical: AppSpacing.md,
                ),
                child: Row(
                  children: [
                    ServiceLogo(
                      initials: sub.initials,
                      color: MockData.logoColor(sub.id),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            sub.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                              fontFamily: 'DM Sans',
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Flexible(child: EntityTag(entity: entity)),
                              const SizedBox(width: 6),
                              StatusDot(subscription: sub),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          CurrencyUtils.formatWhole(sub.amount),
                          style: const TextStyle(
                            fontFamily: 'DM Mono',
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          '/mo',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textHint,
                            fontFamily: 'DM Sans',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
