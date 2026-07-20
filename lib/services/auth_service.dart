import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'supabase_service.dart';

/// Wraps Supabase GoTrue auth. When no real credentials are configured
/// (`SupabaseService.isReady` false — e.g. local dev with a placeholder
/// .env), the app runs in offline demo mode and every method here is a
/// safe no-op.
class AuthService {
  AuthService._();

  static bool get isConfigured => SupabaseService.isReady;

  static User? get currentUser =>
      isConfigured ? SupabaseService.client.auth.currentUser : null;

  static bool get hasSession =>
      isConfigured && SupabaseService.client.auth.currentSession != null;

  static String get displayName {
    final user = currentUser;
    final name = user?.userMetadata?['full_name'] as String?;
    if (name != null && name.isNotEmpty) return name;
    final email = user?.email;
    if (email != null && email.isNotEmpty) return email.split('@').first;
    return 'You';
  }

  static String get email => currentUser?.email ?? '';

  /// What to show as the account line: email if present, else the phone
  /// number (phone+PIN accounts have no email at all).
  static String get identifier {
    final user = currentUser;
    final email = user?.email;
    if (email != null && email.isNotEmpty) return email;
    final phone = user?.phone;
    if (phone != null && phone.isNotEmpty) {
      return phone.startsWith('+') ? phone : '+$phone';
    }
    return '';
  }

  /// "9876543210" → "+919876543210"; already-prefixed numbers pass through.
  static String normalizePhone(String raw) {
    final digits = raw.replaceAll(RegExp(r'[^\d+]'), '');
    if (digits.startsWith('+')) return digits;
    if (digits.length == 10) return '+91$digits';
    return '+$digits';
  }

  static bool isValidIndianMobile(String raw) {
    final normalized = normalizePhone(raw);
    return RegExp(r'^\+91[6-9]\d{9}$').hasMatch(normalized);
  }

  /// Phone + 6-digit PIN sign-in (PRD F1's primary credential). Returns
  /// null on success, or a user-displayable error message.
  static Future<String?> signInWithPhone({
    required String phone,
    required String pin,
  }) async {
    try {
      await SupabaseService.client.auth.signInWithPassword(
        phone: normalizePhone(phone),
        password: pin,
      );
      return null;
    } on AuthException catch (e) {
      if (e.message.toLowerCase().contains('invalid login')) {
        return 'Wrong mobile number or PIN.';
      }
      return e.message;
    } catch (e) {
      debugPrint('AuthService.signInWithPhone failed: $e');
      return 'Could not sign in. Check your connection and try again.';
    }
  }

  /// Phone + PIN signup. Returns (error, needsOtp): with the SMS gateway
  /// not yet configured GoTrue autoconfirms and returns a session
  /// (needsOtp false); once real OTPs are live it returns no session and
  /// the caller must collect the code via [verifyPhoneOtp].
  static Future<({String? error, bool needsOtp})> signUpWithPhone({
    required String name,
    required String phone,
    required String pin,
  }) async {
    try {
      final res = await SupabaseService.client.auth.signUp(
        phone: normalizePhone(phone),
        password: pin,
        data: {'full_name': name},
      );
      return (error: null, needsOtp: res.session == null);
    } on AuthException catch (e) {
      if (e.message.toLowerCase().contains('already registered')) {
        return (
          error: 'This mobile number already has an account — sign in instead.',
          needsOtp: false,
        );
      }
      return (error: e.message, needsOtp: false);
    } catch (e) {
      debugPrint('AuthService.signUpWithPhone failed: $e');
      return (
        error: 'Could not create account. Check your connection and try again.',
        needsOtp: false,
      );
    }
  }

  /// Confirms the 6-digit OTP sent to [phone] during signup.
  static Future<String?> verifyPhoneOtp({
    required String phone,
    required String otp,
  }) async {
    try {
      await SupabaseService.client.auth.verifyOTP(
        type: OtpType.sms,
        phone: normalizePhone(phone),
        token: otp,
      );
      return null;
    } on AuthException catch (e) {
      return e.message;
    } catch (e) {
      debugPrint('AuthService.verifyPhoneOtp failed: $e');
      return 'Verification failed. Try again.';
    }
  }

  /// Returns null on success, or a user-displayable error message.
  static Future<String?> signIn({
    required String email,
    required String password,
  }) async {
    try {
      await SupabaseService.client.auth
          .signInWithPassword(email: email, password: password);
      return null;
    } on AuthException catch (e) {
      return e.message;
    } catch (e) {
      debugPrint('AuthService.signIn failed: $e');
      return 'Could not sign in. Check your connection and try again.';
    }
  }

  /// Returns null on success, or a user-displayable error message.
  /// GoTrue is configured with MAILER_AUTOCONFIRM on the VPS, so a
  /// successful sign-up returns a live session immediately — no email
  /// verification round-trip.
  static Future<String?> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      await SupabaseService.client.auth.signUp(
        email: email,
        password: password,
        data: {'full_name': name},
      );
      return null;
    } on AuthException catch (e) {
      return e.message;
    } catch (e) {
      debugPrint('AuthService.signUp failed: $e');
      return 'Could not create account. Check your connection and try again.';
    }
  }

  static Future<void> signOut() async {
    if (!isConfigured) return;
    try {
      await SupabaseService.client.auth.signOut();
    } catch (e) {
      debugPrint('AuthService.signOut failed (non-fatal): $e');
    }
  }
}
