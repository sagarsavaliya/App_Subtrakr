import 'dart:convert';

import 'package:collection/collection.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../core/utils/date_utils.dart';
import '../../../data/mock/mock_data.dart';
import '../../../data/models/invoice_model.dart';
import '../../../data/models/payment_history_model.dart';
import '../../../data/models/subscription_model.dart';
import '../../providers/entity_provider.dart';
import '../../providers/invoice_provider.dart';
import '../../providers/payment_history_provider.dart';
import '../../providers/subscription_provider.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/aurora_background.dart';
import '../../widgets/common/glass_surface.dart';
import '../../widgets/common/mark_paid_feedback.dart';
import '../../widgets/common/service_logo.dart';
import '../../widgets/common/status_pill.dart';

const _uuid = Uuid();

class SubscriptionDetailScreen extends ConsumerWidget {
  const SubscriptionDetailScreen({super.key, required this.subscriptionId});

  final String subscriptionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subscriptions = ref.watch(subscriptionsProvider);
    final sub = subscriptions.firstWhereOrNull((s) => s.id == subscriptionId);

    if (sub == null) {
      return AuroraBackground(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          body: SafeArea(
            child: Center(
              child: Text('Subscription not found', style: AppTextStyles.body),
            ),
          ),
        ),
      );
    }

    final entities = ref.watch(entitiesProvider);
    final entity = entities.firstWhere(
      (e) => e.id == sub.entityId,
      orElse: () => entities.first,
    );
    final history = ref.watch(paymentHistoryForSubscriptionProvider(sub.id));

    return AuroraBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.lg,
              AppSpacing.screenPadding,
              40,
            ),
            children: [
              Row(
                children: [
                  IconGlassButton(
                    icon: Icons.arrow_back,
                    size: 38,
                    onPressed: () => context.pop(),
                  ),
                  const SizedBox(width: 12),
                  ServiceLogo(
                    initials: sub.initials,
                    color: MockData.logoColor(sub.id),
                    size: 44,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          sub.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.heading1.copyWith(fontSize: 18),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            EntityTag(entity: entity),
                            const SizedBox(width: 6),
                            Text(sub.category.label, style: AppTextStyles.hint),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sectionGap),
              GlassSurface(
                borderRadius: AppSpacing.cardRadius,
                strong: true,
                padding: const EdgeInsets.all(AppSpacing.cardPadding),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('NEXT DUE', style: AppTextStyles.label),
                        StatusBadge(subscription: sub),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      AppDateUtils.formatDate(sub.nextDueDate),
                      style: AppTextStyles.heading1.copyWith(fontSize: 20),
                    ),
                    const SizedBox(height: 2),
                    Text(AppDateUtils.dueLabel(sub.nextDueDate), style: AppTextStyles.hint),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Text(
                          CurrencyUtils.formatWhole(sub.amount),
                          style: AppTextStyles.heroAmount.copyWith(fontSize: 26),
                        ),
                        const SizedBox(width: 6),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text('/ ${sub.billingCycle.label.toLowerCase()}', style: AppTextStyles.hint),
                        ),
                      ],
                    ),
                    if (sub.isAutoDebit) ...[
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Icon(Icons.autorenew, size: 14, color: AppColors.accentGlow),
                          const SizedBox(width: 6),
                          Text('Auto-debit enabled', style: AppTextStyles.hint.copyWith(color: AppColors.accentGlow)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sectionGap),
              Row(
                children: [
                  Expanded(
                    child: GradientButton(
                      label: 'Mark paid',
                      icon: Icons.check,
                      onPressed: sub.status == SubscriptionStatus.cancelled
                          ? null
                          : () => markPaidWithUndo(context, ref, sub),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: GlassButton(
                      label: sub.status == SubscriptionStatus.paused ? 'Resume' : 'Pause',
                      icon: sub.status == SubscriptionStatus.paused
                          ? Icons.play_arrow
                          : Icons.pause,
                      onPressed: () {
                        ref
                            .read(subscriptionsProvider.notifier)
                            .setStatus(
                              sub.id,
                              sub.status == SubscriptionStatus.paused
                                  ? SubscriptionStatus.active
                                  : SubscriptionStatus.paused,
                            );
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: GlassButton(
                      label: 'Delete',
                      icon: Icons.delete_outline,
                      onPressed: () => _confirmDelete(context, ref, sub),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sectionGap),
              Text('Payment history', style: AppTextStyles.heading3),
              const SizedBox(height: AppSpacing.md),
              if (history.isEmpty)
                GlassSurface(
                  borderRadius: 14,
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'No payments recorded yet',
                    style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
                  ),
                )
              else
                for (final payment in history)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: GlassSurface(
                      borderRadius: 14,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      child: Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(color: AppColors.paid, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(AppDateUtils.formatDate(payment.paidDate), style: AppTextStyles.bodyMedium),
                                Text(
                                  payment.source == PaymentSource.shareDetected ? 'Detected from shared SMS' : 'Marked paid manually',
                                  style: AppTextStyles.hint,
                                ),
                              ],
                            ),
                          ),
                          Text(CurrencyUtils.formatWhole(payment.amountPaid), style: AppTextStyles.amount),
                        ],
                      ),
                    ),
                  ),
              const SizedBox(height: AppSpacing.sectionGap),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Invoices', style: AppTextStyles.heading3),
                  TextButton.icon(
                    onPressed: () => _attachInvoice(context, ref, sub.id),
                    icon: const Icon(Icons.attach_file, size: 15, color: AppColors.accentGlow),
                    label: Text(
                      'Attach',
                      style: AppTextStyles.bodyMedium.copyWith(color: AppColors.accentGlow, fontSize: 12.5),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Consumer(
                builder: (context, ref, _) {
                  final invoices = ref.watch(invoicesForSubscriptionProvider(sub.id));
                  if (invoices.isEmpty) {
                    return GlassSurface(
                      borderRadius: 14,
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        'No invoices attached yet · PDF or image, up to 10MB',
                        style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
                      ),
                    );
                  }
                  return Column(
                    children: [
                      for (final invoice in invoices)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: GlassSurface(
                            borderRadius: 14,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            child: Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: AppColors.accentA.withValues(alpha: 0.14),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    invoice.fileName.toLowerCase().endsWith('.pdf')
                                        ? Icons.picture_as_pdf_outlined
                                        : Icons.image_outlined,
                                    size: 17,
                                    color: AppColors.accentGlow,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        invoice.fileName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: AppTextStyles.bodyMedium.copyWith(fontSize: 13),
                                      ),
                                      Text(
                                        '${AppDateUtils.formatDate(invoice.invoiceDate)} · ${invoice.sizeLabel}',
                                        style: AppTextStyles.hint,
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  onPressed: () => ref.read(invoicesProvider.notifier).removeById(invoice.id),
                                  icon: const Icon(Icons.close, size: 17, color: AppColors.textHint),
                                  visualDensity: VisualDensity.compact,
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  );
                },
              ),
              if (entity.hasGst) ...[
                const SizedBox(height: AppSpacing.sectionGap),
                Text('GST details', style: AppTextStyles.heading3),
                const SizedBox(height: AppSpacing.md),
                GlassSurface(
                  borderRadius: 14,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _kv('Entity GSTIN', entity.gstNumber ?? '—'),
                      const SizedBox(height: 8),
                      _kv('Billed to', entity.name),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _kv(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTextStyles.hint),
        Text(value, style: AppTextStyles.bodyMedium.copyWith(fontFamily: 'DM Mono', fontSize: 12.5)),
      ],
    );
  }

  Future<void> _attachInvoice(BuildContext context, WidgetRef ref, String subscriptionId) async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg'],
      withData: true,
    );
    final file = result?.files.singleOrNull;
    if (file?.bytes == null) return;

    ref.read(invoicesProvider.notifier).add(
      InvoiceModel(
        id: _uuid.v4(),
        subscriptionId: subscriptionId,
        fileName: file!.name,
        invoiceDate: DateTime.now(),
        sizeBytes: file.bytes!.length,
        base64Data: base64Encode(file.bytes!),
      ),
    );

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${file.name} attached')),
      );
    }
  }

  void _confirmDelete(BuildContext context, WidgetRef ref, SubscriptionModel sub) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.bgElevated,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Delete ${sub.name}?', style: AppTextStyles.heading2),
        content: Text(
          'This removes the subscription and its history. This can\'t be undone.',
          style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text('Cancel', style: AppTextStyles.bodyMedium),
          ),
          TextButton(
            onPressed: () {
              ref.read(subscriptionsProvider.notifier).deleteSubscription(sub.id);
              Navigator.of(dialogContext).pop();
              context.pop();
            },
            child: Text('Delete', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.overdue)),
          ),
        ],
      ),
    );
  }
}
