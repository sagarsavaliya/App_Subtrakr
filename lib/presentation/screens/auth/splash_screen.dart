import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../widgets/common/aurora_background.dart';

/// PRD S1-1 — auto-navigates within ~1.2s. There's no auth backend wired
/// yet ([[subtrakr-build-status]]), so this always continues to the
/// dashboard rather than branching on session state.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (mounted) context.go('/dashboard');
    });
  }

  @override
  Widget build(BuildContext context) {
    return AuroraBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ShaderMask(
                shaderCallback: (rect) => const LinearGradient(
                  colors: [AppColors.accentA, AppColors.accentB],
                ).createShader(rect),
                child: Text(
                  'SubTrakr',
                  style: AppTextStyles.heading1.copyWith(
                    fontSize: 34,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'All your subscriptions. Tracked. Sorted.',
                style: AppTextStyles.hint.copyWith(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.4,
                  valueColor: AlwaysStoppedAnimation(AppColors.accentGlow),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
