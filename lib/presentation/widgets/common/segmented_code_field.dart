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
        return SizedBox(
          height: _boxHeight,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Row(
                // Boxes stretch to fill the full width instead of a fixed
                // size centered in the row — matches the width of whatever
                // input field sits above (e.g. the phone number field),
                // rather than leaving dead space on both sides.
                children: [
                  for (var i = 0; i < widget.length; i++) ...[
                    if (i > 0) const SizedBox(width: _gap),
                    Expanded(
                      child: _CodeBox(
                        char: i < text.length
                            ? (widget.obscure ? '•' : text[i])
                            : '',
                        isCursorBox: i == text.length && _focusNode.hasFocus,
                        height: _boxHeight,
                      ),
                    ),
                  ],
                ],
              ),
              // The real input — invisible, but on top so taps land on it
              // and focus/keyboard/paste/backspace all behave exactly like
              // a normal TextField, because it is one.
              Positioned.fill(
                child: Opacity(
                  opacity: 0,
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
          ),
        );
      },
    );
  }
}

class _CodeBox extends StatelessWidget {
  const _CodeBox({
    required this.char,
    required this.isCursorBox,
    required this.height,
  });

  final String char;
  final bool isCursorBox;
  final double height;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      borderRadius: 14,
      border: Border.all(
        color: isCursorBox ? AppColors.glassBorderAccent : AppColors.glassBorder,
        width: isCursorBox ? 1.5 : 1,
      ),
      child: SizedBox(
        height: height,
        child: Center(
          child: Text(
            char,
            style: const TextStyle(
              fontFamily: 'DM Mono',
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}
