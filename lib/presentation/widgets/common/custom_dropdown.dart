import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_text_styles.dart';
import 'glass_surface.dart';

/// Dropdown for longer/dynamic option lists — mirrors the web app's
/// CustomSelect: glass trigger with a chevron, a solid rounded panel with
/// a checkmark on the selected row. Fixed sets of ≤6 options use a chip
/// row instead (see AppChip usage for billing cycle/entity elsewhere) —
/// this is for the case chips don't fit (Category's 10 options today).
class CustomDropdown<T> extends StatelessWidget {
  const CustomDropdown({
    super.key,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final T value;
  final List<(T value, String label)> items;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final selected = items.firstWhere(
      (i) => i.$1 == value,
      orElse: () => items.first,
    );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () async {
          final box = context.findRenderObject() as RenderBox;
          final overlay = Overlay.of(context).context.findRenderObject() as RenderBox;
          final position = RelativeRect.fromRect(
            Rect.fromPoints(
              box.localToGlobal(Offset(0, box.size.height + 6), ancestor: overlay),
              box.localToGlobal(box.size.bottomRight(Offset.zero), ancestor: overlay),
            ),
            Offset.zero & overlay.size,
          );
          final picked = await showMenu<T>(
            context: context,
            position: position,
            color: AppColors.bgElevated2,
            surfaceTintColor: Colors.transparent,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            constraints: BoxConstraints(minWidth: box.size.width, maxWidth: box.size.width),
            items: [
              for (final item in items)
                PopupMenuItem<T>(
                  value: item.$1,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        item.$2,
                        style: AppTextStyles.body.copyWith(
                          color: item.$1 == value
                              ? AppColors.accentGlow
                              : AppColors.textPrimary,
                          fontWeight: item.$1 == value ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                      if (item.$1 == value)
                        const Icon(Icons.check, size: 16, color: AppColors.accentGlow),
                    ],
                  ),
                ),
            ],
          );
          if (picked != null) onChanged(picked);
        },
        child: GlassSurface(
          borderRadius: 16,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(selected.$2, style: AppTextStyles.bodyMedium),
              const Icon(
                Icons.keyboard_arrow_down,
                size: 18,
                color: AppColors.textHint,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
