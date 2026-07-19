import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

/// Slow-drifting blurred blobs behind the glass surfaces — the aurora ground
/// from the approved mockup. Freezes under reduced-motion accessibility settings.
class AuroraBackground extends StatefulWidget {
  const AuroraBackground({super.key, required this.child});

  final Widget child;

  @override
  State<AuroraBackground> createState() => _AuroraBackgroundState();
}

class _AuroraBackgroundState extends State<AuroraBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 34),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    return Container(
      color: AppColors.bgBase,
      child: Stack(
        children: [
          Positioned.fill(
            child: reduceMotion
                ? const _BlobLayer(t: 0)
                : AnimatedBuilder(
                    animation: _controller,
                    builder: (context, _) => _BlobLayer(t: _controller.value),
                  ),
          ),
          widget.child,
        ],
      ),
    );
  }
}

class _BlobLayer extends StatelessWidget {
  const _BlobLayer({required this.t});

  final double t;

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final w = size.width;
    final h = size.height;
    final a1 = math.sin(t * 2 * math.pi);
    final a2 = math.cos(t * 2 * math.pi);

    return Stack(
      children: [
        Positioned(
          left: -w * 0.35 + a1 * w * 0.08,
          top: -h * 0.2 + a2 * h * 0.05,
          child: _blob(w * 1.1, AppColors.accentA),
        ),
        Positioned(
          right: -w * 0.35 - a1 * w * 0.08,
          top: h * 0.05 + a2 * h * 0.04,
          child: _blob(w * 0.95, AppColors.accentB),
        ),
        Positioned(
          left: w * 0.15 + a2 * w * 0.05,
          bottom: -h * 0.25 - a1 * h * 0.04,
          child: _blob(w * 0.85, AppColors.personal, opacity: 0.28),
        ),
      ],
    );
  }

  Widget _blob(double size, Color color, {double opacity = 0.4}) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              color.withValues(alpha: opacity),
              color.withValues(alpha: 0),
            ],
          ),
        ),
      ),
    );
  }
}
