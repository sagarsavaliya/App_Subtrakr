import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/entity_model.dart';
import '../../../services/auth_service.dart';
import '../../../services/backup_service.dart';
import '../../../services/notification_service.dart';
import '../../../services/sync_service.dart';
import '../../providers/entity_provider.dart';
import '../../providers/payment_history_provider.dart';
import '../../providers/prefs_provider.dart';
import '../../providers/subscription_provider.dart';
import '../../widgets/common/glass_surface.dart';
import '../../widgets/common/service_logo.dart';
import 'entity_edit_sheet.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgElevated,
        title: Text('Sign out?', style: AppTextStyles.heading2),
        content: Text(
          'Your data stays safely synced to your account.',
          style: AppTextStyles.body,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('Cancel', style: AppTextStyles.bodyMedium),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(
              'Sign out',
              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.overdue),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    await AuthService.signOut();
    await NotificationService.cancelAll();
    await SyncService.clearLocal();
    ref.invalidate(entitiesProvider);
    ref.invalidate(subscriptionsProvider);
    ref.invalidate(paymentHistoryProvider);
    if (context.mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entities = ref.watch(entitiesProvider);
    final prefs = ref.watch(prefsProvider);
    final signedIn = AuthService.hasSession;

    final displayName = signedIn ? AuthService.displayName : 'Guest';
    final subtitle = signedIn ? AuthService.email : 'Offline demo mode';

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
                  ServiceLogo(
                    initials: displayName.isEmpty
                        ? '?'
                        : displayName.substring(0, 1).toUpperCase(),
                    color: AppColors.accentA,
                    size: 48,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(displayName, style: AppTextStyles.heading2),
                        const SizedBox(height: 2),
                        Text(subtitle, style: AppTextStyles.hint),
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
                  onPressed: () => showEntityEditSheet(context),
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
              _EntityRow(
                entity: e,
                onTap: () => showEntityEditSheet(context, existing: e),
              ),
              const SizedBox(height: AppSpacing.listItemGap),
            ],
            const SizedBox(height: AppSpacing.sectionGap),
            Text('Preferences', style: AppTextStyles.heading3),
            const SizedBox(height: AppSpacing.md),
            _ToggleRow(
              icon: Icons.notifications_outlined,
              label: 'Reminders',
              value: prefs.remindersEnabled,
              onChanged: (v) =>
                  ref.read(prefsProvider.notifier).setRemindersEnabled(v),
            ),
            const SizedBox(height: AppSpacing.listItemGap),
            _ToggleRow(
              icon: Icons.ios_share_outlined,
              label: 'Shared payment capture',
              value: prefs.captureEnabled,
              onChanged: (v) =>
                  ref.read(prefsProvider.notifier).setCaptureEnabled(v),
            ),
            const SizedBox(height: AppSpacing.listItemGap),
            _ActionRow(
              icon: Icons.download_outlined,
              label: 'Export full backup',
              onTap: () => BackupService.shareFullBackup(),
            ),
            if (signedIn) ...[
              const SizedBox(height: AppSpacing.listItemGap),
              _ActionRow(
                icon: Icons.logout,
                label: 'Sign out',
                labelColor: AppColors.overdue,
                onTap: () => _signOut(context, ref),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EntityRow extends StatelessWidget {
  const _EntityRow({required this.entity, required this.onTap});
  final EntityModel entity;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isPersonal = entity.type == EntityType.personal;
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: GlassSurface(
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
              const Icon(Icons.chevron_right,
                  color: AppColors.textHint, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  const _ToggleRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      borderRadius: 16,
      padding: const EdgeInsets.fromLTRB(14, 6, 8, 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: AppTextStyles.bodyMedium)),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.accentGlow,
            activeTrackColor: AppColors.accentA.withValues(alpha: 0.4),
            inactiveThumbColor: AppColors.textHint,
            inactiveTrackColor: Colors.white.withValues(alpha: 0.08),
          ),
        ],
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.labelColor,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? labelColor;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: GlassSurface(
          borderRadius: 16,
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(icon, size: 18, color: labelColor ?? AppColors.textSecondary),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: AppTextStyles.bodyMedium.copyWith(color: labelColor),
                ),
              ),
              const Icon(Icons.chevron_right,
                  color: AppColors.textHint, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}
