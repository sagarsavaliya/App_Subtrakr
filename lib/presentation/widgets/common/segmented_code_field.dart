import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/constants/app_colors.dart';
import 'glass_surface.dart';

/// Individual-box code input (OTP / PIN) — modern app pattern instead of a
/// plain single text field.
///
/// Internally backed by ONE invisible [TextField] spanning the whole row,
/// not N separate focus-linked fields. That's deliberate: virtual/soft
/// keyboards on real devices don't reliably dispatch a raw backspace key
/// event, only text-delta callbacks — wiring backspace-to-previous-box
/// across multiple TextFields is a well-known Flutter footgun on-device
/// even though it works fine in a desktop simulator. A single field makes
/// backspace, paste, and autofill all "just work" for free, since Flutter's
/// own TextField already handles them correctly; the boxes are pure
/// display, driven by the one controller's current text.
class SegmentedCodeField extends StatefulWidget {
  const SegmentedCodeField({
    super.key,
    required this.value,
    required this.onChanged,
    this.onCompleted,
    this.length = 6,
    this.obscure = false,
    this.autoFocus = false,
    this.enabled = true,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final ValueChanged<String>? onCompleted;
  final int length;
  final bool obscure;
  final bool autoFocus;
  final bool enabled;

  @override
  State<SegmentedCodeField> createState() => _SegmentedCodeFieldState();
}

class _SegmentedCodeFieldState extends State<SegmentedCodeField> {
  static const _boxWidth = 46.0;
  static const _boxHeight = 54.0;
  static const _gap = 8.0;

  late final TextEditingController _controller;
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
    _focusNode = FocusNode();
    _focusNode.addListener(() => setState(() {}));
  }

  @override
  void didUpdateWidget(covariant SegmentedCodeField oldWidget) {
    super.didUpdateWidget(oldWidget);
    // External resets (e.g. clearing the wizard) need to sync back into the
    // real controller, since it's the actual source of truth on screen.
    if (widget.value != _controller.text) {
      _controller.text = widget.value;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _handleChanged(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits != _controller.text) {
      // Formatters below already cap length/digits-only, but keep this in
      // sync defensively (e.g. a paste containing non-digit characters).
      _controller.value = TextEditingValue(
        text: digits,
        selection: TextSelection.collapsed(offset: digits.length),
      );
    }
    widget.onChanged(digits);
    if (digits.length == widget.length) {
      widget.onCompleted?.call(digits);
      _focusNode.unfocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: _controller,
      builder: (context, value, _) {
        final text = value.text;
        return Stack(
          alignment: Alignment.center,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(widget.length, (i) {
                final filled = i < text.length;
                final isCursorBox = i == text.length && _focusNode.hasFocus;
                return Padding(
                  padding: EdgeInsets.only(left: i == 0 ? 0 : _gap),
                  child: GlassSurface(
                    borderRadius: 14,
                    border: Border.all(
                      color: isCursorBox
                          ? AppColors.glassBorderAccent
                          : AppColors.glassBorder,
                      width: isCursorBox ? 1.5 : 1,
                    ),
                    child: SizedBox(
                      width: _boxWidth,
                      height: _boxHeight,
                      child: Center(
                        child: Text(
                          filled ? (widget.obscure ? '•' : text[i]) : '',
                          style: const TextStyle(
                            fontFamily: 'DM Mono',
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
            // The real input — invisible, but on top so taps land on it and
            // focus/keyboard/paste/backspace all behave exactly like a
            // normal TextField, because it is one.
            Opacity(
              opacity: 0,
              child: SizedBox(
                width: widget.length * _boxWidth + (widget.length - 1) * _gap,
                height: _boxHeight,
                child: TextField(
                  controller: _controller,
                  focusNode: _focusNode,
                  autofocus: widget.autoFocus,
                  enabled: widget.enabled,
                  showCursor: false,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(widget.length),
                  ],
                  onChanged: _handleChanged,
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    counterText: '',
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
