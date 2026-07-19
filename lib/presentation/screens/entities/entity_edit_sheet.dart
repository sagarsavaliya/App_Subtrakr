import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/entity_model.dart';
import '../../../services/sync_service.dart';
import '../../providers/entity_provider.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/glass_surface.dart';

/// Add a new company entity ([existing] null) or edit an existing entity's
/// name/GSTIN.
Future<void> showEntityEditSheet(BuildContext context, {EntityModel? existing}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => EntityEditSheet(existing: existing),
  );
}

class EntityEditSheet extends ConsumerStatefulWidget {
  const EntityEditSheet({super.key, this.existing});

  final EntityModel? existing;

  @override
  ConsumerState<EntityEditSheet> createState() => _EntityEditSheetState();
}

class _EntityEditSheetState extends ConsumerState<EntityEditSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _gstController;
  String? _error;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.existing?.name ?? '');
    _gstController =
        TextEditingController(text: widget.existing?.gstNumber ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _gstController.dispose();
    super.dispose();
  }

  void _submit() {
    final name = _nameController.text.trim();
    final gst = _gstController.text.trim().toUpperCase();

    if (name.isEmpty) {
      setState(() => _error = 'Enter a name.');
      return;
    }
    // GSTIN format: 2-digit state code + PAN + entity code + Z + checksum.
    if (gst.isNotEmpty &&
        !RegExp(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$')
            .hasMatch(gst)) {
      setState(() => _error = 'That GSTIN doesn\'t look valid (15 characters).');
      return;
    }

    final notifier = ref.read(entitiesProvider.notifier);
    if (_isEdit) {
      notifier.update(EntityModel(
        id: widget.existing!.id,
        name: name,
        type: widget.existing!.type,
        gstNumber: gst.isEmpty ? null : gst,
      ));
    } else {
      notifier.add(EntityModel(
        id: SyncService.newId(),
        name: name,
        type: EntityType.company,
        gstNumber: gst.isEmpty ? null : gst,
      ));
    }
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets;
    final isPersonal = widget.existing?.type == EntityType.personal;

    return AnimatedPadding(
      duration: const Duration(milliseconds: 150),
      padding: EdgeInsets.only(bottom: viewInsets.bottom),
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
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 20),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                  Text(
                    _isEdit
                        ? 'Edit ${isPersonal ? 'entity' : 'company'}'
                        : 'Add company',
                    style: AppTextStyles.heading1.copyWith(fontSize: 17),
                  ),
                  const SizedBox(height: 18),
                  GlassSurface(
                    borderRadius: 14,
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: TextField(
                      controller: _nameController,
                      style: AppTextStyles.body,
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        hintText: 'Name',
                        hintStyle: TextStyle(
                          color: AppColors.textHint,
                          fontFamily: 'DM Sans',
                        ),
                        prefixIcon: Icon(
                          Icons.apartment_outlined,
                          size: 18,
                          color: AppColors.textHint,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  GlassSurface(
                    borderRadius: 14,
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: TextField(
                      controller: _gstController,
                      style: AppTextStyles.body.copyWith(fontFamily: 'DM Mono'),
                      textCapitalization: TextCapitalization.characters,
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        hintText: 'GSTIN (optional)',
                        hintStyle: TextStyle(
                          color: AppColors.textHint,
                          fontFamily: 'DM Sans',
                        ),
                        prefixIcon: Icon(
                          Icons.receipt_long_outlined,
                          size: 18,
                          color: AppColors.textHint,
                        ),
                      ),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style:
                          AppTextStyles.hint.copyWith(color: AppColors.overdue),
                    ),
                  ],
                  const SizedBox(height: 20),
                  GradientButton(
                    label: _isEdit ? 'Save changes' : 'Add company',
                    icon: _isEdit ? Icons.check : Icons.add,
                    onPressed: _submit,
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
