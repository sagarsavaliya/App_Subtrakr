import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/repositories/prefs_repository.dart';
import '../../../services/auth_service.dart';
import '../../../services/sync_service.dart';
import '../../providers/entity_provider.dart';
import '../../providers/payment_history_provider.dart';
import '../../providers/subscription_provider.dart';
import '../../widgets/common/aurora_background.dart';

/// PRD S1-1. Branches on auth state: unconfigured backend → straight to the
/// dashboard in offline demo mode; configured + signed in → refresh from
/// the server, then dashboard; configured + signed out → login.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  static const _minSplash = Duration(milliseconds: 1200);

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final started = DateTime.now();

    var pulled = false;
    if (AuthService.hasSession) {
      // Capped so a dead network can't hold the splash hostage — local Hive
      // data is already there and stays authoritative until a pull succeeds.
      pulled = await SyncService.pullAll()
          .timeout(const Duration(seconds: 6), onTimeout: () => false);
    }

    final elapsed = DateTime.now().difference(started);
    if (elapsed < _minSplash) {
      await Future.delayed(_minSplash - elapsed);
    }
    if (!mounted) return;

    if (pulled) {
      ref.invalidate(entitiesProvider);
      ref.invalidate(subscriptionsProvider);
      ref.invalidate(paymentHistoryProvider);
    }

    final needsLogin = AuthService.isConfigured && !AuthService.hasSession;
    if (!needsLogin) {
      context.go('/dashboard');
    } else if (PrefsRepository().onboardingSeen) {
      context.go('/login');
    } else {
      // PRD S1 — first launch goes through onboarding before login.
      context.go('/onboarding');
    }
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
