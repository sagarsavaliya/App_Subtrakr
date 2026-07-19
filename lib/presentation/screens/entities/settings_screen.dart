import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/entity_model.dart';
import '../../providers/entity_provider.dart';
import '../../widgets/common/glass_surface.dart';
import '../../widgets/common/service_logo.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entities = ref.watch(entitiesProvider);

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
              'Settings',
              style: AppTextStyles.heading1.copyWith(fontSize: 20),
            ),
            const SizedBox(height: AppSpacing.sectionGap),
            GlassSurface(
              borderRadius: 18,
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const ServiceLogo(
                    initials: 'S',
                    color: AppColors.accentA,
                    size: 48,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Sagar', style: AppTextStyles.heading2),
                        const SizedBox(height: 2),
                        Text(
                          'savaliya.sagar07@gmail.com',
                          style: AppTextStyles.hint,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sectionGap),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('My entities', style: AppTextStyles.heading3),
                TextButton.icon(
                  onPressed: () {},
                  icon: const Icon(
                    Icons.add,
                    size: 16,
                    color: AppColors.accentGlow,
                  ),
                  label: Text(
                    'Add company',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.accentGlow,
                      fontSize: 12.5,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            for (final e in entities) ...[
              _EntityRow(entity: e),
              const SizedBox(height: AppSpacing.listItemGap),
            ],
            const SizedBox(height: AppSpacing.sectionGap),
            Text('Preferences', style: AppTextStyles.heading3),
            const SizedBox(height: AppSpacing.md),
            _PrefRow(
              icon: Icons.notifications_outlined,
              label: 'Reminders',
              trailing: 'On',
            ),
            const SizedBox(height: AppSpacing.listItemGap),
            _PrefRow(
              icon: Icons.ios_share_outlined,
              label: 'Shared payment capture',
              trailing: 'On',
            ),
            const SizedBox(height: AppSpacing.listItemGap),
            _PrefRow(
              icon: Icons.download_outlined,
              label: 'Export full backup',
              trailing: '',
            ),
          ],
        ),
      ),
    );
  }
}

class _EntityRow extends StatelessWidget {
  const _EntityRow({required this.entity});
  final EntityModel entity;

  @override
  Widget build(BuildContext context) {
    final isPersonal = entity.type == EntityType.personal;
    return GlassSurface(
      borderRadius: 16,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: (isPersonal ? AppColors.personal : AppColors.accentA)
                  .withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isPersonal ? Icons.person_outline : Icons.apartment_outlined,
              size: 19,
              color: isPersonal ? AppColors.personal : AppColors.accentGlow,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entity.name, style: AppTextStyles.bodyMedium),
                Text(
                  entity.hasGst
                      ? 'GSTIN ${entity.gstNumber}'
                      : (isPersonal ? 'Default entity' : 'No GSTIN set'),
                  style: AppTextStyles.hint,
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.textHint, size: 18),
        ],
      ),
    );
  }
}

class _PrefRow extends StatelessWidget {
  const _PrefRow({
    required this.icon,
    required this.label,
    required this.trailing,
  });
  final IconData icon;
  final String label;
  final String trailing;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      borderRadius: 16,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: AppTextStyles.bodyMedium)),
          if (trailing.isNotEmpty)
            Text(
              trailing,
              style: AppTextStyles.hint.copyWith(color: AppColors.accentGlow),
            ),
          const SizedBox(width: 6),
          const Icon(Icons.chevron_right, color: AppColors.textHint, size: 18),
        ],
      ),
    );
  }
}
