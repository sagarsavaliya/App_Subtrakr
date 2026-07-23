import 'dart:async';

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
import '../../widgets/common/segmented_code_field.dart';

/// PRD F1 — mobile number + 6-digit PIN is the primary credential; email +
/// PIN is the secondary method, using the same shape (verify identity via
/// OTP first, THEN set the PIN). Phone uses a custom WhatsApp-delivered
/// OTP; email uses GoTrue's own native email-OTP (Brevo SMTP + a custom
/// template render the code instead of a magic link) — see
/// AuthService.sendEmailOtp for why that needs no custom plumbing.
///
/// Existing email accounts made before this (arbitrary-length password)
/// still sign in fine — the sign-in password field has no digit/length-6
/// restriction, only signup enforces the new PIN shape.
enum _WizardStep { details, otp, pin }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  // Plain String state rather than TextEditingControllers — these three are
  // rendered via SegmentedCodeField, which is backed by its own internal
  // controller, not a visible TextField bound to one of these directly.
  String _pin = '';
  String _confirmPin = '';
  String _otp = '';

  bool _isSignUp = false;
  bool _useEmail = false;
  _WizardStep _step = _WizardStep.details;
  bool _forgotMode = false;
  bool _resetSent = false;
  bool _loading = false;
  // Seconds remaining before another phone OTP can be requested — the
  // cooldown is keyed on the phone number across every client (this app,
  // the web app), so retryAfterSeconds from the server drives an accurate
  // countdown even when the block came from a request made moments ago on
  // a different device. 0 means no cooldown active.
  int _cooldownSeconds = 0;
  Timer? _cooldownTimer;
  String? _error;

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _startCooldown(int seconds) {
    _cooldownTimer?.cancel();
    setState(() => _cooldownSeconds = seconds);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_cooldownSeconds <= 1) {
        timer.cancel();
        setState(() => _cooldownSeconds = 0);
      } else {
        setState(() => _cooldownSeconds--);
      }
    });
  }

  void _resetWizard() {
    _cooldownTimer?.cancel();
    setState(() {
      _step = _WizardStep.details;
      _forgotMode = false;
      _resetSent = false;
      _cooldownSeconds = 0;
      _otp = '';
      _pin = '';
      _confirmPin = '';
      _error = null;
    });
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

  Future<void> _submitForgot() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Enter a valid email address.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    final error = await AuthService.sendPasswordReset(email);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (error != null) {
        _error = error;
      } else {
        _resetSent = true;
      }
    });
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();

    if (_useEmail) {
      final email = _emailController.text.trim();
      if (email.isEmpty || !email.contains('@')) {
        setState(() => _error = 'Enter a valid email address.');
        return;
      }

      if (!_isSignUp) {
        final password = _passwordController.text;
        if (password.length < 6) {
          setState(() => _error = 'Password must be at least 6 characters.');
          return;
        }
        setState(() {
          _loading = true;
          _error = null;
        });
        final error = await AuthService.signIn(email: email, password: password);
        if (!mounted) return;
        if (error != null) {
          setState(() {
            _loading = false;
            _error = error;
          });
          return;
        }
        return _finishSignIn();
      }

      // Signup step 1: precheck, then send the email OTP.
      if (name.isEmpty) {
        setState(() => _error = 'Enter your name.');
        return;
      }
      setState(() {
        _loading = true;
        _error = null;
      });
      final precheckError = await AuthService.emailPrecheck(email);
      if (!mounted) return;
      if (precheckError != null) {
        setState(() {
          _loading = false;
          _error = precheckError;
        });
        return;
      }
      final error = await AuthService.sendEmailOtp(name: name, email: email);
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (error != null) {
          _error = error;
        } else {
          _step = _WizardStep.otp;
        }
      });
      return;
    }

    final phone = _phoneController.text.trim();
    if (!AuthService.isValidIndianMobile(phone)) {
      setState(() => _error = 'Enter a valid 10-digit mobile number.');
      return;
    }

    if (!_isSignUp) {
      final pin = _pin;
      if (pin.length != 6) {
        setState(() => _error = 'Your PIN must be exactly 6 digits.');
        return;
      }
      setState(() {
        _loading = true;
        _error = null;
      });
      final error = await AuthService.signInWithPhone(phone: phone, pin: pin);
      if (!mounted) return;
      if (error != null) {
        setState(() {
          _loading = false;
          _error = error;
        });
        return;
      }
      return _finishSignIn();
    }

    if (name.isEmpty) {
      setState(() => _error = 'Enter your name.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    final result = await AuthService.sendPhoneOtp(phone);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (result.error != null) {
        _error = result.error;
      } else {
        _step = _WizardStep.otp;
      }
    });
    if (result.error == null) {
      _startCooldown(60);
    } else if (result.retryAfterSeconds != null) {
      _startCooldown(result.retryAfterSeconds!);
    }
  }

  Future<void> _verifyOtp() async {
    if (_otp.length != 6) {
      setState(() => _error = 'Enter the 6-digit code.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });

    if (_useEmail) {
      final error = await AuthService.verifyEmailOtp(
        email: _emailController.text.trim(),
        otp: _otp,
      );
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (error != null) {
          _error = error;
        } else {
          _step = _WizardStep.pin;
        }
      });
      return;
    }

    final error = await AuthService.verifyPhoneOtp(
      phone: _phoneController.text.trim(),
      otp: _otp,
    );
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (error != null) {
        _error = error;
      } else {
        _step = _WizardStep.pin;
      }
    });
  }

  Future<void> _resendOtp() async {
    if (_cooldownSeconds > 0) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    if (_useEmail) {
      final error = await AuthService.sendEmailOtp(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error;
      });
      if (error == null) _startCooldown(60);
      return;
    }

    final result = await AuthService.sendPhoneOtp(_phoneController.text.trim());
    if (!mounted) return;
    setState(() {
      _loading = false;
      _error = result.error;
    });
    if (result.error == null) {
      _startCooldown(60);
    } else if (result.retryAfterSeconds != null) {
      _startCooldown(result.retryAfterSeconds!);
    }
  }

  Future<void> _setPinAndFinish() async {
    final pin = _pin;
    if (pin.length != 6) {
      setState(() => _error = 'Your PIN must be exactly 6 digits.');
      return;
    }
    if (pin != _confirmPin) {
      setState(() => _error = 'PINs don\'t match.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });

    final error = _useEmail
        ? await AuthService.setPin(pin)
        : await AuthService.completePhoneSignup(
            name: _nameController.text.trim(),
            phone: _phoneController.text.trim(),
            pin: pin,
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
    final title = _forgotMode
        ? 'Reset your password'
        : _isSignUp && _step == _WizardStep.otp
            ? (_useEmail ? 'Verify your email' : 'Verify your number')
            : _isSignUp && _step == _WizardStep.pin
                ? 'Set your PIN'
                : _isSignUp
                    ? 'Create your account'
                    : 'Welcome back';

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
                      title,
                      style: AppTextStyles.hint.copyWith(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 28),
                    GlassSurface(
                      borderRadius: 22,
                      padding: const EdgeInsets.all(20),
                      child: _forgotMode
                          ? _buildForgotForm()
                          : _step == _WizardStep.otp
                              ? _buildOtpForm()
                              : _step == _WizardStep.pin
                                  ? _buildPinForm()
                                  : _buildAuthForm(),
                    ),
                    const SizedBox(height: 18),
                    if (_step == _WizardStep.details && !_forgotMode) ...[
                      TextButton(
                        onPressed: _loading
                            ? null
                            : () {
                                _resetWizard();
                                setState(() => _isSignUp = !_isSignUp);
                              },
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
                            : () {
                                _resetWizard();
                                setState(() => _useEmail = !_useEmail);
                              },
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

  Widget _buildForgotForm() {
    if (_resetSent) {
      return Text(
        'If an account exists for ${_emailController.text.trim()}, a reset link has been sent. Open it in your browser to set a new password.',
        style: AppTextStyles.body,
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Enter your email and we\'ll send a reset link.',
          style: AppTextStyles.body,
        ),
        const SizedBox(height: 14),
        _AuthField(
          controller: _emailController,
          hint: 'Email',
          icon: Icons.mail_outline,
          keyboardType: TextInputType.emailAddress,
          onSubmitted: (_) => _submitForgot(),
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
            : GradientButton(label: 'Send reset link', onPressed: _submitForgot),
        const SizedBox(height: 8),
        TextButton(
          onPressed: _loading ? null : _resetWizard,
          child: Text(
            'Back to sign in',
            style: AppTextStyles.hint.copyWith(color: AppColors.textSecondary),
          ),
        ),
      ],
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
          if (!_isSignUp) ...[
            const SizedBox(height: 12),
            _AuthField(
              controller: _passwordController,
              hint: 'Password',
              icon: Icons.lock_outline,
              obscure: true,
              onSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => setState(() {
                  _forgotMode = true;
                  _error = null;
                }),
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 0),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  'Forgot password?',
                  style: AppTextStyles.hint.copyWith(color: AppColors.textSecondary),
                ),
              ),
            ),
          ],
          if (_isSignUp) ...[
            const SizedBox(height: 10),
            Text(
              'We\'ll email you a verification code, then you\'ll set a 6-digit PIN.',
              style: AppTextStyles.hint,
            ),
          ],
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
          if (!_isSignUp) ...[
            const SizedBox(height: 16),
            SegmentedCodeField(
              value: _pin,
              onChanged: (v) => setState(() => _pin = v),
              onCompleted: (_) => _submit(),
              obscure: true,
              enabled: !_loading,
            ),
          ],
          if (_isSignUp) ...[
            const SizedBox(height: 10),
            Text(
              'We\'ll verify this number over WhatsApp, then you\'ll set a PIN.',
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
                label: _cooldownSeconds > 0
                    ? 'Try again in ${_cooldownSeconds}s'
                    : _isSignUp
                        ? 'Send verification code'
                        : 'Sign in',
                onPressed: _cooldownSeconds > 0 ? null : _submit,
              ),
      ],
    );
  }

  Widget _buildOtpForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          _useEmail
              ? 'We sent a 6-digit code to ${_emailController.text.trim()}'
              : 'We sent a 6-digit code over WhatsApp to +91 ${_phoneController.text}',
          style: AppTextStyles.body,
        ),
        const SizedBox(height: 18),
        SegmentedCodeField(
          value: _otp,
          onChanged: (v) => setState(() => _otp = v),
          onCompleted: (_) => _verifyOtp(),
          autoFocus: true,
          enabled: !_loading,
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
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton(
              onPressed: _loading ? null : _resetWizard,
              child: Text(
                _useEmail ? 'Change email' : 'Change number',
                style: AppTextStyles.hint.copyWith(color: AppColors.textSecondary),
              ),
            ),
            TextButton(
              onPressed: _loading || _cooldownSeconds > 0 ? null : _resendOtp,
              child: Text(
                _cooldownSeconds > 0
                    ? 'Resend in ${_cooldownSeconds}s'
                    : 'Resend code',
                style: AppTextStyles.hint.copyWith(
                  color: _cooldownSeconds > 0
                      ? AppColors.textHint
                      : AppColors.accentGlow,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPinForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '${_useEmail ? 'Email' : 'Number'} verified. Choose the 6-digit PIN you\'ll use to sign in from now on.',
          style: AppTextStyles.body,
        ),
        const SizedBox(height: 18),
        Text('6-digit PIN', textAlign: TextAlign.center, style: AppTextStyles.hint),
        const SizedBox(height: 8),
        SegmentedCodeField(
          value: _pin,
          onChanged: (v) => setState(() => _pin = v),
          obscure: true,
          autoFocus: true,
          enabled: !_loading,
        ),
        const SizedBox(height: 16),
        Text('Confirm PIN', textAlign: TextAlign.center, style: AppTextStyles.hint),
        const SizedBox(height: 8),
        SegmentedCodeField(
          value: _confirmPin,
          onChanged: (v) => setState(() => _confirmPin = v),
          onCompleted: (_) => _setPinAndFinish(),
          obscure: true,
          enabled: !_loading,
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
            : GradientButton(label: 'Create account', onPressed: _setPinAndFinish),
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
