import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

/// PRD F1 — mobile number + 6-digit PIN is the primary credential; email +
/// password stays available as the secondary method.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _pinController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _otpController = TextEditingController();

  bool _isSignUp = false;
  bool _useEmail = false;
  bool _awaitingOtp = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _pinController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _finishSignIn() async {
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

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    String? error;
    var needsOtp = false;

    if (_useEmail) {
      final email = _emailController.text.trim();
      final password = _passwordController.text;
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
      error = _isSignUp
          ? await AuthService.signUp(name: name, email: email, password: password)
          : await AuthService.signIn(email: email, password: password);
    } else {
      final phone = _phoneController.text.trim();
      final pin = _pinController.text;
      if (!AuthService.isValidIndianMobile(phone)) {
        setState(() => _error = 'Enter a valid 10-digit mobile number.');
        return;
      }
      if (pin.length != 6) {
        setState(() => _error = 'Your PIN must be exactly 6 digits.');
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
      if (_isSignUp) {
        final result = await AuthService.signUpWithPhone(
          name: name,
          phone: phone,
          pin: pin,
        );
        error = result.error;
        needsOtp = result.needsOtp;
      } else {
        error = await AuthService.signInWithPhone(phone: phone, pin: pin);
      }
    }

    if (!mounted) return;
    if (error != null) {
      setState(() {
        _loading = false;
        _error = error;
      });
      return;
    }
    if (needsOtp) {
      setState(() {
        _loading = false;
        _awaitingOtp = true;
        _error = null;
      });
      return;
    }
    await _finishSignIn();
  }

  Future<void> _verifyOtp() async {
    if (_otpController.text.length != 6) {
      setState(() => _error = 'Enter the 6-digit code from the SMS.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    final error = await AuthService.verifyPhoneOtp(
      phone: _phoneController.text.trim(),
      otp: _otpController.text,
    );
    if (!mounted) return;
    if (error != null) {
      setState(() {
        _loading = false;
        _error = error;
      });
      return;
    }
    await _finishSignIn();
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
                      _awaitingOtp
                          ? 'Verify your number'
                          : _isSignUp
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
                      child: _awaitingOtp ? _buildOtpForm() : _buildAuthForm(),
                    ),
                    const SizedBox(height: 18),
                    if (!_awaitingOtp) ...[
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
                      TextButton(
                        onPressed: _loading
                            ? null
                            : () => setState(() {
                                  _useEmail = !_useEmail;
                                  _error = null;
                                }),
                        child: Text(
                          _useEmail
                              ? 'Use mobile number instead'
                              : 'Use email instead',
                          style: AppTextStyles.hint.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAuthForm() {
    return Column(
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
        if (_useEmail) ...[
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
        ] else ...[
          _AuthField(
            controller: _phoneController,
            hint: 'Mobile number',
            icon: Icons.smartphone,
            keyboardType: TextInputType.phone,
            prefixText: '+91 ',
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(10),
            ],
          ),
          const SizedBox(height: 12),
          _AuthField(
            controller: _pinController,
            hint: '6-digit PIN',
            icon: Icons.pin_outlined,
            obscure: true,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(6),
            ],
            onSubmitted: (_) => _submit(),
          ),
          if (_isSignUp) ...[
            const SizedBox(height: 10),
            Text(
              'You\'ll sign in with this number and PIN.',
              style: AppTextStyles.hint,
            ),
          ],
        ],
        if (_error != null) ...[
          const SizedBox(height: 14),
          Text(
            _error!,
            style: AppTextStyles.hint.copyWith(color: AppColors.overdue),
          ),
        ],
        const SizedBox(height: 18),
        _loading
            ? const _Spinner()
            : GradientButton(
                label: _isSignUp ? 'Create account' : 'Sign in',
                onPressed: _submit,
              ),
      ],
    );
  }

  Widget _buildOtpForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'We sent a 6-digit code to +91 ${_phoneController.text}',
          style: AppTextStyles.body,
        ),
        const SizedBox(height: 14),
        _AuthField(
          controller: _otpController,
          hint: '6-digit code',
          icon: Icons.sms_outlined,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(6),
          ],
          onSubmitted: (_) => _verifyOtp(),
        ),
        if (_error != null) ...[
          const SizedBox(height: 14),
          Text(
            _error!,
            style: AppTextStyles.hint.copyWith(color: AppColors.overdue),
          ),
        ],
        const SizedBox(height: 18),
        _loading
            ? const _Spinner()
            : GradientButton(label: 'Verify', onPressed: _verifyOtp),
        const SizedBox(height: 8),
        TextButton(
          onPressed: _loading
              ? null
              : () => setState(() {
                    _awaitingOtp = false;
                    _otpController.clear();
                    _error = null;
                  }),
          child: Text(
            'Change number',
            style: AppTextStyles.hint.copyWith(color: AppColors.textSecondary),
          ),
        ),
      ],
    );
  }
}

class _Spinner extends StatelessWidget {
  const _Spinner();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 14),
        child: SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(
            strokeWidth: 2.4,
            valueColor: AlwaysStoppedAnimation(AppColors.accentGlow),
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
    this.prefixText,
    this.inputFormatters,
  });

  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final bool obscure;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onSubmitted;
  final String? prefixText;
  final List<TextInputFormatter>? inputFormatters;

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
        inputFormatters: inputFormatters,
        style: AppTextStyles.body,
        decoration: InputDecoration(
          border: InputBorder.none,
          hintText: hint,
          hintStyle: const TextStyle(
            color: AppColors.textHint,
            fontFamily: 'DM Sans',
          ),
          prefixIcon: Icon(icon, size: 18, color: AppColors.textHint),
          prefixText: prefixText,
          prefixStyle: AppTextStyles.body.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
