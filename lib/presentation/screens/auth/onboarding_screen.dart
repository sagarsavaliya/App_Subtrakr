import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/repositories/prefs_repository.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/aurora_background.dart';
import '../../widgets/common/glass_surface.dart';

/// PRD S2 — three swipeable slides shown once before first login.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _Slide {
  const _Slide(this.icon, this.title, this.body);
  final IconData icon;
  final String title;
  final String body;
}

const _slides = [
  _Slide(
    Icons.dashboard_customize_outlined,
    'All subs in one place',
    'Netflix to AWS, personal to business — every recurring payment on one dashboard, with what\'s due this week always in view.',
  ),
  _Slide(
    Icons.bolt_outlined,
    'Smart payment detection',
    'Share a bank SMS into SubTrakr and it matches the subscription and logs the payment — one tap, no SMS permissions ever.',
  ),
  _Slide(
    Icons.receipt_long_outlined,
    'GST reports for your CA',
    'Company subscriptions become a clean PDF or CSV with GST split out — ready to send at filing time.',
  ),
];

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    await PrefsRepository().setOnboardingSeen();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _page == _slides.length - 1;

    return AuroraBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: Padding(
                  padding: const EdgeInsets.only(
                    right: AppSpacing.lg,
                    top: AppSpacing.sm,
                  ),
                  child: TextButton(
                    onPressed: _finish,
                    child: Text(
                      'Skip',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  itemCount: _slides.length,
                  onPageChanged: (i) => setState(() => _page = i),
                  itemBuilder: (context, i) {
                    final slide = _slides[i];
                    return Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.screenPadding * 1.6,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          GlassSurface(
                            borderRadius: 32,
                            padding: const EdgeInsets.all(34),
                            child: ShaderMask(
                              shaderCallback: (rect) => const LinearGradient(
                                colors: [AppColors.accentA, AppColors.accentGlow],
                              ).createShader(rect),
                              child: Icon(
                                slide.icon,
                                size: 64,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(height: 36),
                          Text(
                            slide.title,
                            textAlign: TextAlign.center,
                            style: AppTextStyles.heading1.copyWith(fontSize: 24),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            slide.body,
                            textAlign: TextAlign.center,
                            style: AppTextStyles.body.copyWith(
                              color: AppColors.textSecondary,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < _slides.length; i++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: i == _page ? 22 : 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: i == _page
                            ? AppColors.accentGlow
                            : Colors.white.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.screenPadding),
                child: SizedBox(
                  width: double.infinity,
                  child: GradientButton(
                    label: isLast ? 'Get started' : 'Next',
                    icon: isLast ? Icons.rocket_launch_outlined : null,
                    onPressed: () {
                      if (isLast) {
                        _finish();
                      } else {
                        _controller.nextPage(
                          duration: const Duration(milliseconds: 280),
                          curve: Curves.easeOut,
                        );
                      }
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
