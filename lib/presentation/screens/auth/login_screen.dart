import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/repositories/subscription_repository.dart';
import '../../../services/auth_service.dart';
import '../../../services/notification_service.dart';
import '../../../services/sync_service.dart';
import '../../providers/entity_provider.dart';
import '../../providers/payment_history_provider.dart';
import '../../providers/subscription_provider.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/aurora_background.dart';
import '../../widgets/common/glass_surface.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isSignUp = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final name = _nameController.text.trim();

    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters.');
      return;
    }
    if (_isSignUp && name.isEmpty) {
      setState(() => _error = 'Enter your name.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    final error = _isSignUp
        ? await AuthService.signUp(name: name, email: email, password: password)
        : await AuthService.signIn(email: email, password: password);

    if (!mounted) return;
    if (error != null) {
      setState(() {
        _loading = false;
        _error = error;
      });
      return;
    }

    // The account's server data is the source of truth from here on —
    // replaces any demo-mode data that may be sitting in Hive.
    await SyncService.pullAll();
    ref.invalidate(entitiesProvider);
    ref.invalidate(subscriptionsProvider);
    ref.invalidate(paymentHistoryProvider);
    await NotificationService.scheduleAll(SubscriptionRepository().getAll());

    if (!mounted) return;
    context.go('/dashboard');
  }

  @override
  Widget build(BuildContext context) {
    return AuroraBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
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
                          fontSize: 30,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _isSignUp
                          ? 'Create your account'
                          : 'Welcome back',
                      style: AppTextStyles.hint.copyWith(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 28),
                    GlassSurface(
                      borderRadius: 22,
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (_isSignUp) ...[
                            _AuthField(
                              controller: _nameController,
                              hint: 'Your name',
                              icon: Icons.person_outline,
                            ),
                            const SizedBox(height: 12),
                          ],
                          _AuthField(
                            controller: _emailController,
                            hint: 'Email',
                            icon: Icons.mail_outline,
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 12),
                          _AuthField(
                            controller: _passwordController,
                            hint: 'Password',
                            icon: Icons.lock_outline,
                            obscure: true,
                            onSubmitted: (_) => _submit(),
                          ),
                          if (_error != null) ...[
                            const SizedBox(height: 14),
                            Text(
                              _error!,
                              style: AppTextStyles.hint.copyWith(
                                color: AppColors.overdue,
                              ),
                            ),
                          ],
                          const SizedBox(height: 18),
                          _loading
                              ? const Center(
                                  child: Padding(
                                    padding: EdgeInsets.symmetric(vertical: 14),
                                    child: SizedBox(
                                      width: 22,
                                      height: 22,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.4,
                                        valueColor: AlwaysStoppedAnimation(
                                          AppColors.accentGlow,
                                        ),
                                      ),
                                    ),
                                  ),
                                )
                              : GradientButton(
                                  label: _isSignUp
                                      ? 'Create account'
                                      : 'Sign in',
                                  onPressed: _submit,
                                ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    TextButton(
                      onPressed: _loading
                          ? null
                          : () => setState(() {
                                _isSignUp = !_isSignUp;
                                _error = null;
                              }),
                      child: Text(
                        _isSignUp
                            ? 'Already have an account?  Sign in'
                            : 'New to SubTrakr?  Create account',
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.accentGlow,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AuthField extends StatelessWidget {
  const _AuthField({
    required this.controller,
    required this.hint,
    required this.icon,
    this.obscure = false,
    this.keyboardType,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final bool obscure;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      borderRadius: 14,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: TextField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboardType,
        onSubmitted: onSubmitted,
        style: AppTextStyles.body,
        decoration: InputDecoration(
          border: InputBorder.none,
          hintText: hint,
          hintStyle: const TextStyle(
            color: AppColors.textHint,
            fontFamily: 'DM Sans',
          ),
          prefixIcon: Icon(icon, size: 18, color: AppColors.textHint),
        ),
      ),
    );
  }
}
