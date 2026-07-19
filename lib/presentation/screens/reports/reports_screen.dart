import 'dart:convert';
import 'dart:typed_data';

import 'package:collection/collection.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../data/models/entity_model.dart';
import '../../../data/models/subscription_model.dart';
import '../../../services/export_service.dart';
import '../../providers/entity_provider.dart';
import '../../providers/payment_history_provider.dart';
import '../../providers/subscription_provider.dart';
import '../../widgets/common/glass_surface.dart';

const _monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/// Export card's own entity/period selection — separate from the main
/// dashboard's entity filter since GST export needs actual payment_history
/// for a specific period, not the recurring-cost projection shown above.
final _exportEntityIdProvider = StateProvider<String?>((ref) => null);
final _exportPeriodProvider = StateProvider<DateTime>(
  (ref) => DateTime(DateTime.now().year, DateTime.now().month),
);

const _categoryColors = {
  SubscriptionCategory.devTools: AppColors.accentA,
  SubscriptionCategory.cloud: AppColors.accentB,
  SubscriptionCategory.entertainment: AppColors.personal,
  SubscriptionCategory.telecom: AppColors.due,
  SubscriptionCategory.saas: AppColors.trial,
};

Color _colorFor(SubscriptionCategory c) =>
    _categoryColors[c] ?? AppColors.textHint;

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subscriptions = ref
        .watch(subscriptionsProvider)
        .where((s) => s.status == SubscriptionStatus.active)
        .toList();
    final entities = ref.watch(entitiesProvider);
    final total = subscriptions.fold<double>(
      0,
      (sum, s) => sum + s.monthlyEquivalent,
    );

    final byEntity = <String, double>{};
    for (final s in subscriptions) {
      byEntity[s.entityId] = (byEntity[s.entityId] ?? 0) + s.monthlyEquivalent;
    }

    final byCategory = <SubscriptionCategory, double>{};
    for (final s in subscriptions) {
      byCategory[s.category] =
          (byCategory[s.category] ?? 0) + s.monthlyEquivalent;
    }
    final sortedCategories = byCategory.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    final now = DateTime.now();

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
              'Reports',
              style: AppTextStyles.heading1.copyWith(fontSize: 20),
            ),
            const SizedBox(height: AppSpacing.lg),
            GlassSurface(
              borderRadius: 16,
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.chevron_left,
                    color: AppColors.textSecondary,
                    size: 20,
                  ),
                  const SizedBox(width: 16),
                  Text(
                    '${_monthNames[now.month - 1]} ${now.year}',
                    style: AppTextStyles.bodyMedium,
                  ),
                  const SizedBox(width: 16),
                  const Icon(
                    Icons.chevron_right,
                    color: AppColors.textSecondary,
                    size: 20,
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sectionGap),
            GlassSurface(
              borderRadius: 20,
              strong: true,
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('TOTAL SPEND', style: AppTextStyles.label),
                  const SizedBox(height: 6),
                  Text(
                    CurrencyUtils.formatWhole(total),
                    style: AppTextStyles.heroAmount.copyWith(fontSize: 28),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      for (final e in entities) ...[
                        Expanded(
                          child: _EntitySplit(
                            entity: e,
                            amount: byEntity[e.id] ?? 0,
                            total: total,
                          ),
                        ),
                        if (e != entities.last) const SizedBox(width: 14),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sectionGap),
            GlassSurface(
              borderRadius: 20,
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              child: Row(
                children: [
                  SizedBox(
                    width: 104,
                    height: 104,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        PieChart(
                          PieChartData(
                            sectionsSpace: 3,
                            centerSpaceRadius: 32,
                            sections: [
                              for (final entry in sortedCategories)
                                PieChartSectionData(
                                  value: entry.value,
                                  color: _colorFor(entry.key),
                                  radius: 14,
                                  showTitle: false,
                                ),
                            ],
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${(total / 1000).toStringAsFixed(1)}k',
                              style: AppTextStyles.amount.copyWith(
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              'total / mo',
                              style: AppTextStyles.hint.copyWith(fontSize: 8),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 18),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (final entry in sortedCategories.take(4))
                          Padding(
                            padding: const EdgeInsets.only(bottom: 9),
                            child: Row(
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: _colorFor(entry.key),
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    entry.key.label,
                                    style: AppTextStyles.body.copyWith(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ),
                                Text(
                                  CurrencyUtils.formatWhole(entry.value),
                                  style: AppTextStyles.amountSmall.copyWith(
                                    fontSize: 11.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sectionGap),
            Text('Breakdown', style: AppTextStyles.heading3),
            const SizedBox(height: AppSpacing.md),
            for (final entry in sortedCategories)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: GlassSurface(
                  borderRadius: 14,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 9,
                        height: 9,
                        decoration: BoxDecoration(
                          color: _colorFor(entry.key),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              entry.key.label,
                              style: AppTextStyles.bodyMedium,
                            ),
                            Text(
                              '${subscriptions.where((s) => s.category == entry.key).length} subscription${subscriptions.where((s) => s.category == entry.key).length == 1 ? '' : 's'}',
                              style: AppTextStyles.hint,
                            ),
                          ],
                        ),
                      ),
                      Text(
                        CurrencyUtils.formatWhole(entry.value),
                        style: AppTextStyles.amount,
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: AppSpacing.md),
            const _ExportCard(),
          ],
        ),
      ),
    );
  }
}

class _ExportCard extends ConsumerWidget {
  const _ExportCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entities = ref.watch(entitiesProvider);
    final allSubscriptions = ref.watch(subscriptionsProvider);
    final allPayments = ref.watch(paymentHistoryProvider);

    final selectedEntityId = ref.watch(_exportEntityIdProvider) ??
        (entities.where((e) => e.isCompany).firstOrNull ?? entities.firstOrNull)?.id;
    final selectedEntity = entities.where((e) => e.id == selectedEntityId).firstOrNull;
    final period = ref.watch(_exportPeriodProvider);
    final periodLabel = '${_monthNames[period.month - 1]} ${period.year}';

    List<GstLineItem> lineItems() {
      if (selectedEntity == null) return [];
      return allPayments
          .where((p) => p.paidDate.year == period.year && p.paidDate.month == period.month)
          .map((p) {
            final sub = allSubscriptions.where((s) => s.id == p.subscriptionId).firstOrNull;
            if (sub == null || sub.entityId != selectedEntity.id) return null;
            return GstLineItem(serviceName: sub.name, vendorLabel: sub.name, amountPaid: p.amountPaid);
          })
          .whereType<GstLineItem>()
          .toList();
    }

    Future<void> export({required bool asPdf}) async {
      final entity = selectedEntity;
      if (entity == null) return;
      final items = lineItems();
      if (items.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No payments recorded for ${entity.name} in $periodLabel')),
        );
        return;
      }
      final safePeriod = periodLabel.replaceAll(' ', '_');
      try {
        if (asPdf) {
          final bytes = await ExportService.generatePdf(
            entityName: entity.name,
            gstin: entity.gstNumber,
            periodLabel: periodLabel,
            items: items,
          );
          await ExportService.shareBytes(
            bytes: bytes,
            fileName: 'SubTrakr_GST_${entity.name}_$safePeriod.pdf',
            mimeType: 'application/pdf',
          );
        } else {
          final csv = ExportService.generateCsv(
            entityName: entity.name,
            gstin: entity.gstNumber,
            periodLabel: periodLabel,
            items: items,
          );
          await ExportService.shareBytes(
            bytes: Uint8List.fromList(utf8.encode(csv)),
            fileName: 'SubTrakr_GST_${entity.name}_$safePeriod.csv',
            mimeType: 'text/csv',
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Export failed: $e')),
          );
        }
      }
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorderAccent),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.accentA.withValues(alpha: 0.1),
            Colors.white.withValues(alpha: 0.03),
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Export for CA', style: AppTextStyles.heading3),
          const SizedBox(height: 3),
          Text('GST-ready, filtered by entity and period', style: AppTextStyles.hint),
          const SizedBox(height: 14),
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: entities.isEmpty
                  ? null
                  : () => _pickEntity(context, ref, entities, selectedEntityId),
              child: _selectRow(selectedEntity?.name ?? 'Select entity'),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => ref.read(_exportPeriodProvider.notifier).state =
                        DateTime(period.year, period.month - 1),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Icon(Icons.chevron_left, size: 18, color: AppColors.textSecondary),
                    ),
                  ),
                ),
              ),
              Expanded(
                flex: 4,
                child: _selectRow(periodLabel, center: true),
              ),
              Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => ref.read(_exportPeriodProvider.notifier).state =
                        DateTime(period.year, period.month + 1),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Icon(Icons.chevron_right, size: 18, color: AppColors.textSecondary),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _ExportButton(
                  icon: Icons.picture_as_pdf_outlined,
                  label: 'PDF',
                  onTap: () => export(asPdf: true),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ExportButton(
                  icon: Icons.table_chart_outlined,
                  label: 'CSV',
                  onTap: () => export(asPdf: false),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _selectRow(String label, {bool center = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.glassBorderSoft),
      ),
      child: Text(
        label,
        textAlign: center ? TextAlign.center : TextAlign.start,
        style: AppTextStyles.bodyMedium.copyWith(fontSize: 13),
      ),
    );
  }

  Future<void> _pickEntity(
    BuildContext context,
    WidgetRef ref,
    List<EntityModel> entities,
    String? selectedId,
  ) async {
    final chosen = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppColors.bgElevated,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              for (final e in entities)
                ListTile(
                  title: Text(e.name, style: AppTextStyles.body),
                  trailing: e.id == selectedId ? const Icon(Icons.check, color: AppColors.accentGlow, size: 18) : null,
                  onTap: () => Navigator.of(sheetContext).pop(e.id),
                ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
    if (chosen != null) {
      ref.read(_exportEntityIdProvider.notifier).state = chosen;
    }
  }
}

class _EntitySplit extends StatelessWidget {
  const _EntitySplit({
    required this.entity,
    required this.amount,
    required this.total,
  });

  final EntityModel entity;
  final double amount;
  final double total;

  @override
  Widget build(BuildContext context) {
    final isPersonal = entity.type == EntityType.personal;
    final color = isPersonal ? AppColors.personal : AppColors.accentA;
    final fraction = total == 0 ? 0.0 : (amount / total).clamp(0.0, 1.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          entity.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: AppTextStyles.hint,
        ),
        const SizedBox(height: 6),
        Text(
          CurrencyUtils.formatWhole(amount),
          style: AppTextStyles.amountSmall.copyWith(fontSize: 14),
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: LinearProgressIndicator(
            value: fraction,
            minHeight: 6,
            backgroundColor: Colors.white.withValues(alpha: 0.08),
            valueColor: AlwaysStoppedAnimation(color),
          ),
        ),
      ],
    );
  }
}

class _ExportButton extends StatelessWidget {
  const _ExportButton({required this.icon, required this.label, this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: GlassSurface(
          borderRadius: 12,
          strong: true,
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 15, color: AppColors.accentGlow),
              const SizedBox(width: 7),
              Text(
                label,
                style: AppTextStyles.bodyMedium.copyWith(fontSize: 12.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
