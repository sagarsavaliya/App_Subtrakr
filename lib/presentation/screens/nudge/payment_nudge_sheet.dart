import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../core/utils/date_utils.dart';
import '../../../data/mock/mock_data.dart';
import '../../../data/models/payment_history_model.dart';
import '../../../data/models/subscription_model.dart';
import '../../providers/subscription_provider.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/glass_surface.dart';
import '../../widgets/common/service_logo.dart';

/// Triggered by a share-intent capture (user shares a bank SMS/notification
/// into the app) rather than a passive background listener — see the
/// payment-detection compliance note for why.
Future<void> showPaymentNudgeSheet(
  BuildContext context, {
  required SubscriptionModel matched,
  required double detectedAmount,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) =>
        PaymentNudgeSheet(matched: matched, detectedAmount: detectedAmount),
  );
}

class PaymentNudgeSheet extends ConsumerStatefulWidget {
  const PaymentNudgeSheet({
    super.key,
    required this.matched,
    required this.detectedAmount,
  });

  final SubscriptionModel matched;
  final double detectedAmount;

  @override
  ConsumerState<PaymentNudgeSheet> createState() => _PaymentNudgeSheetState();
}

class _PaymentNudgeSheetState extends ConsumerState<PaymentNudgeSheet>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sub = widget.matched;
    final nextDue = sub.computeNextDue(DateTime.now());

    return Padding(
      padding: const EdgeInsets.only(top: 80),
      child: ClipRRect(
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
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenPadding,
                12,
                AppSpacing.screenPadding,
                24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 36,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.dueBg,
                      borderRadius: BorderRadius.circular(
                        AppSpacing.chipRadius,
                      ),
                      border: Border.all(
                        color: AppColors.due.withValues(alpha: 0.35),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: AppColors.due,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 7),
                        Text(
                          'PAYMENT DETECTED',
                          style: AppTextStyles.label.copyWith(
                            color: AppColors.due,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),
                  SizedBox(
                    width: 84,
                    height: 84,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        AnimatedBuilder(
                          animation: _pulseController,
                          builder: (context, _) =>
                              _PulseRing(progress: _pulseController.value),
                        ),
                        AnimatedBuilder(
                          animation: _pulseController,
                          builder: (context, _) => _PulseRing(
                            progress: (_pulseController.value + 0.35) % 1.0,
                          ),
                        ),
                        ServiceLogo(
                          initials: sub.initials,
                          color: MockData.logoColor(sub.id),
                          size: 56,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Paid ${CurrencyUtils.formatWhole(widget.detectedAmount)} to ${sub.name}?',
                    textAlign: TextAlign.center,
                    style: AppTextStyles.heading1.copyWith(fontSize: 19),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Shared from bank SMS · just now',
                    style: AppTextStyles.hint,
                  ),
                  const SizedBox(height: 22),
                  GlassSurface(
                    borderRadius: 16,
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        ServiceLogo(
                          initials: sub.initials,
                          color: MockData.logoColor(sub.id),
                          size: 32,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                sub.name,
                                style: AppTextStyles.heading3.copyWith(
                                  fontSize: 13.5,
                                ),
                              ),
                              Text(
                                'Matched subscription',
                                style: AppTextStyles.hint,
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.accentA.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(
                              AppSpacing.chipRadius,
                            ),
                            border: Border.all(
                              color: AppColors.glassBorderAccent,
                            ),
                          ),
                          child: Text(
                            '92% match',
                            style: AppTextStyles.hint.copyWith(
                              fontFamily: 'DM Mono',
                              fontSize: 10.5,
                              color: AppColors.accentGlow,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  GradientButton(
                    label: 'Yes, mark paid',
                    icon: Icons.check,
                    onPressed: () {
                      ref.read(subscriptionsProvider.notifier).markPaid(
                            sub.id,
                            amountPaid: widget.detectedAmount,
                            source: PaymentSource.shareDetected,
                          );
                      Navigator.of(context).pop();
                    },
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: GlassButton(
                          label: 'Not this',
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: GlassButton(
                          label: 'Remind later',
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'If confirmed · next due ${AppDateUtils.formatDate(nextDue)}',
                    style: AppTextStyles.hint,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PulseRing extends StatelessWidget {
  const _PulseRing({required this.progress});

  final double progress;

  @override
  Widget build(BuildContext context) {
    final scale = 0.7 + progress * 0.8;
    final opacity = (1 - progress).clamp(0.0, 1.0);
    return Opacity(
      opacity: opacity * 0.7,
      child: Transform.scale(
        scale: scale,
        child: Container(
          width: 84,
          height: 84,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.accentGlow, width: 1.5),
          ),
        ),
      ),
    );
  }
}
