import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../core/constants/service_catalogue.dart';
import '../../../core/utils/date_utils.dart';
import '../../../data/models/subscription_model.dart';
import '../../../services/sync_service.dart';
import '../../providers/entity_provider.dart';
import '../../providers/subscription_provider.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_chip.dart';
import '../../widgets/common/glass_surface.dart';
import '../../widgets/common/service_logo.dart';

/// Pass [existing] to edit instead of add (PRD S3-8) — the form opens
/// pre-filled and submit updates in place.
Future<void> showAddSubscriptionSheet(
  BuildContext context, {
  SubscriptionModel? existing,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => AddSubscriptionSheet(existing: existing),
  );
}

class AddSubscriptionSheet extends ConsumerStatefulWidget {
  const AddSubscriptionSheet({super.key, this.existing});

  final SubscriptionModel? existing;

  @override
  ConsumerState<AddSubscriptionSheet> createState() =>
      _AddSubscriptionSheetState();
}

class _AddSubscriptionSheetState extends ConsumerState<AddSubscriptionSheet> {
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();
  ServiceEntry? _selected;
  BillingCycle _cycle = BillingCycle.monthly;
  DateTime _startDate = DateTime.now();
  String? _entityId;
  bool _autoDebit = false;
  bool _showAdvanced = false;
  final _notesController = TextEditingController();

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    if (existing != null) {
      _nameController.text = existing.name;
      _amountController.text = existing.amount % 1 == 0
          ? existing.amount.toStringAsFixed(0)
          : existing.amount.toString();
      _cycle = existing.billingCycle;
      _startDate = existing.startDate;
      _entityId = existing.entityId;
      _autoDebit = existing.isAutoDebit;
    }
  }

  List<ServiceEntry> get _suggestions {
    // Suggestions are an add-flow affordance; when editing, the name is
    // already settled.
    if (_isEdit) return const [];
    final q = _nameController.text.trim().toLowerCase();
    if (q.isEmpty) return const [];
    return serviceCatalogue
        .where((c) => c.name.toLowerCase().contains(q))
        .take(4)
        .toList();
  }

  DateTime get _nextDue {
    switch (_cycle) {
      case BillingCycle.weekly:
        return _startDate.add(const Duration(days: 7));
      case BillingCycle.monthly:
        return DateTime(_startDate.year, _startDate.month + 1, _startDate.day);
      case BillingCycle.quarterly:
        return DateTime(_startDate.year, _startDate.month + 3, _startDate.day);
      case BillingCycle.halfYearly:
        return DateTime(_startDate.year, _startDate.month + 6, _startDate.day);
      case BillingCycle.yearly:
        return DateTime(_startDate.year + 1, _startDate.month, _startDate.day);
      case BillingCycle.custom:
        return _startDate.add(const Duration(days: 30));
    }
  }

  bool get _canSubmit =>
      _nameController.text.trim().isNotEmpty &&
      (double.tryParse(_amountController.text) ?? 0) > 0 &&
      _entityId != null;

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _pickSuggestion(ServiceEntry entry) {
    setState(() {
      _selected = entry;
      _nameController.text = entry.name;
      _cycle = entry.cycle;
      if (entry.defaultAmount > 0) {
        _amountController.text = entry.defaultAmount.toStringAsFixed(0);
      }
    });
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
    if (picked != null) setState(() => _startDate = picked);
  }

  void _submit() {
    final entities = ref.read(entitiesProvider);
    final entity = entities.firstWhere((e) => e.id == _entityId);
    final existing = widget.existing;

    if (existing != null) {
      // Keep the already-advanced next due date unless the schedule inputs
      // actually changed — editing the name/amount must not reset progress.
      final scheduleChanged = _cycle != existing.billingCycle ||
          !_startDate.isAtSameMomentAs(existing.startDate);
      final updated = SubscriptionModel(
        id: existing.id,
        entityId: entity.id,
        name: _nameController.text.trim(),
        initials: existing.initials,
        category: existing.category,
        amount: double.parse(_amountController.text),
        currency: existing.currency,
        billingCycle: _cycle,
        customCycleDays: existing.customCycleDays,
        startDate: _startDate,
        nextDueDate: scheduleChanged ? _nextDue : existing.nextDueDate,
        status: existing.status,
        isAutoDebit: _autoDebit,
        remindDaysBefore: existing.remindDaysBefore,
        invoiceCount: existing.invoiceCount,
      );
      ref.read(subscriptionsProvider.notifier).updateSubscription(updated);
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${updated.name} updated')),
      );
      return;
    }

    final sub = SubscriptionModel(
      // Server columns are UUID-typed — non-UUID ids would never sync.
      id: SyncService.newId(),
      entityId: entity.id,
      name: _nameController.text.trim(),
      initials:
          _selected?.initials ??
          _nameController.text.trim().substring(0, 1).toUpperCase(),
      category: _selected?.category ?? SubscriptionCategory.other,
      amount: double.parse(_amountController.text),
      billingCycle: _cycle,
      startDate: _startDate,
      nextDueDate: _nextDue,
      isAutoDebit: _autoDebit,
    );
    ref.read(subscriptionsProvider.notifier).addSubscription(sub);
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '${sub.name} added · next due ${AppDateUtils.formatDate(sub.nextDueDate)}',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final entities = ref.watch(entitiesProvider);
    // Preselect the first (Personal) entity — with a single entity there's
    // nothing to choose, and submit should not sit disabled for it.
    _entityId ??= entities.isNotEmpty ? entities.first.id : null;
    final viewInsets = MediaQuery.of(context).viewInsets;

    return AnimatedPadding(
      duration: const Duration(milliseconds: 150),
      padding: EdgeInsets.only(bottom: viewInsets.bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.88,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) {
          return ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(28),
                ),
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
                          _isEdit ? 'Edit subscription' : 'Add subscription',
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
                  const Divider(height: 1),
                  Expanded(
                    child: ListView(
                      controller: scrollController,
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.screenPadding,
                        AppSpacing.lg,
                        AppSpacing.screenPadding,
                        32,
                      ),
                      children: [
                        _FieldLabel('Service'),
                        const SizedBox(height: 8),
                        GlassSurface(
                          borderRadius: 16,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 4,
                          ),
                          child: TextField(
                            controller: _nameController,
                            style: AppTextStyles.body,
                            onChanged: (_) => setState(() {}),
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                              hintText: 'Search services…',
                              hintStyle: TextStyle(
                                color: AppColors.textHint,
                                fontFamily: 'DM Sans',
                              ),
                              prefixIcon: Icon(
                                Icons.search,
                                size: 18,
                                color: AppColors.textHint,
                              ),
                            ),
                          ),
                        ),
                        for (final s in _suggestions)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(14),
                                onTap: () => _pickSuggestion(s),
                                child: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.accentA.withValues(
                                      alpha: 0.08,
                                    ),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: AppColors.glassBorderAccent,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      ServiceLogo(
                                        initials: s.initials,
                                        color: s.color,
                                        size: 32,
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              s.name,
                                              style: AppTextStyles.heading3
                                                  .copyWith(fontSize: 13.5),
                                            ),
                                            Text(
                                              '${s.category.label}${s.defaultAmount > 0 ? ' · suggested ₹${s.defaultAmount.toStringAsFixed(0)}/${s.cycle == BillingCycle.yearly ? 'yr' : 'mo'}' : ''}',
                                              style: AppTextStyles.hint,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        const SizedBox(height: 18),
                        _FieldLabel('Amount'),
                        const SizedBox(height: 8),
                        GlassSurface(
                          borderRadius: 16,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 4,
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              const Text(
                                '₹',
                                style: TextStyle(
                                  fontFamily: 'DM Mono',
                                  fontSize: 20,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextField(
                                  controller: _amountController,
                                  keyboardType:
                                      const TextInputType.numberWithOptions(
                                        decimal: true,
                                      ),
                                  onChanged: (_) => setState(() {}),
                                  style: const TextStyle(
                                    fontFamily: 'DM Mono',
                                    fontSize: 26,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                  decoration: const InputDecoration(
                                    border: InputBorder.none,
                                    hintText: '0',
                                  ),
                                ),
                              ),
                              const AppChip(
                                label: 'INR',
                                variant: ChipVariant.glass,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        _FieldLabel('Billing cycle'),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final c in BillingCycle.values)
                              AppChip(
                                label: c.label,
                                variant: _cycle == c
                                    ? ChipVariant.active
                                    : ChipVariant.glass,
                                onTap: () => setState(() => _cycle = c),
                              ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        _FieldLabel('First charge date'),
                        const SizedBox(height: 8),
                        Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: _pickDate,
                            child: GlassSurface(
                              borderRadius: 16,
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.calendar_today_outlined,
                                    size: 17,
                                    color: AppColors.textSecondary,
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    AppDateUtils.formatDate(_startDate),
                                    style: AppTextStyles.bodyMedium,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.only(top: 8, left: 2),
                          child: Text(
                            'Next due · ${AppDateUtils.formatDate(_nextDue)}',
                            style: AppTextStyles.hint.copyWith(
                              color: AppColors.accentGlow,
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        _FieldLabel('Entity'),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final e in entities)
                              AppChip(
                                label: e.name,
                                variant: _entityId == e.id
                                    ? ChipVariant.active
                                    : ChipVariant.glass,
                                onTap: () => setState(() => _entityId = e.id),
                              ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        GlassSurface(
                          borderRadius: 16,
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Auto-debit',
                                      style: AppTextStyles.bodyMedium,
                                    ),
                                    Text(
                                      'Charged automatically each cycle',
                                      style: AppTextStyles.hint,
                                    ),
                                  ],
                                ),
                              ),
                              Switch(
                                value: _autoDebit,
                                onChanged: (v) =>
                                    setState(() => _autoDebit = v),
                                activeThumbColor: Colors.white,
                                activeTrackColor: AppColors.accentA,
                              ),
                            ],
                          ),
                        ),
                        InkWell(
                          onTap: () =>
                              setState(() => _showAdvanced = !_showAdvanced),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'More details · notes, GST, reminders',
                                  style: AppTextStyles.bodyMedium.copyWith(
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                                Icon(
                                  _showAdvanced
                                      ? Icons.keyboard_arrow_up
                                      : Icons.keyboard_arrow_down,
                                  color: AppColors.textSecondary,
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_showAdvanced)
                          GlassSurface(
                            borderRadius: 16,
                            padding: const EdgeInsets.all(14),
                            child: TextField(
                              controller: _notesController,
                              maxLines: 3,
                              style: AppTextStyles.body,
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                hintText: 'Notes…',
                                hintStyle: TextStyle(color: AppColors.textHint),
                              ),
                            ),
                          ),
                        const SizedBox(height: 22),
                        GradientButton(
                          label: _isEdit ? 'Save changes' : 'Add subscription',
                          onPressed: _canSubmit ? _submit : null,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(text, style: AppTextStyles.label);
}
