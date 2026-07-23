import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
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

  /// Phone step 1 of signup: sends a WhatsApp OTP via the web app's own
  /// custom challenge system (`/api/auth/send-otp`) — GoTrue has no native
  /// WhatsApp channel, so unlike email this can't be a direct GoTrue call.
  /// That route also does the "already registered" check server-side.
  ///
  /// The cooldown is keyed on the phone number across every client (this
  /// app, the web app), not just this device — retryAfterSeconds is the
  /// server's own computed remaining time, so the UI can show an accurate
  /// countdown instead of a bare "wait a moment" error even when the block
  /// came from a request made moments ago somewhere else.
  static Future<({String? error, int? retryAfterSeconds})> sendPhoneOtp(
    String phone,
  ) async {
    try {
      final res = await http
          .post(
            Uri.parse('https://subtrakr.me/api/auth/send-otp'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'phone': normalizePhone(phone)}),
          )
          .timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) return (error: null, retryAfterSeconds: null);
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      return (
        error: body['error'] as String? ?? 'Could not send the code.',
        retryAfterSeconds: body['retryAfterSeconds'] as int?,
      );
    } catch (e) {
      debugPrint('AuthService.sendPhoneOtp failed: $e');
      return (
        error: 'Could not send the code. Check your connection.',
        retryAfterSeconds: null,
      );
    }
  }

  /// Phone step 2: confirms the 6-digit OTP against the same challenge
  /// system (no session yet — the account doesn't exist until step 3).
  static Future<String?> verifyPhoneOtp({
    required String phone,
    required String otp,
  }) async {
    try {
      final res = await http
          .post(
            Uri.parse('https://subtrakr.me/api/auth/verify-otp'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'phone': normalizePhone(phone), 'code': otp}),
          )
          .timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) return null;
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      return body['error'] as String? ?? 'Incorrect code.';
    } catch (e) {
      debugPrint('AuthService.verifyPhoneOtp failed: $e');
      return 'Could not verify the code. Check your connection.';
    }
  }

  /// Phone step 3: creates the account server-side with the chosen PIN via
  /// `/api/auth/complete-signup`, then signs in on-device — that route
  /// runs as a cookie-bound web session, which does nothing for a mobile
  /// client, so the Flutter app still needs its own signInWithPhone right
  /// after to actually get a local session/token.
  static Future<String?> completePhoneSignup({
    required String name,
    required String phone,
    required String pin,
  }) async {
    try {
      final res = await http
          .post(
            Uri.parse('https://subtrakr.me/api/auth/complete-signup'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'phone': normalizePhone(phone),
              'name': name,
              'pin': pin,
            }),
          )
          .timeout(const Duration(seconds: 15));
      if (res.statusCode != 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        return body['error'] as String? ?? 'Could not create your account.';
      }
    } catch (e) {
      debugPrint('AuthService.completePhoneSignup failed: $e');
      return 'Could not create your account. Check your connection.';
    }
    return signInWithPhone(phone: phone, pin: pin);
  }

  /// Sign-in for an existing email account. Works whether that account's
  /// password is an old-style arbitrary password or a new-style 6-digit
  /// PIN — signInWithPassword doesn't care which shape it is, only the
  /// signup path enforces the PIN shape.
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

  /// Legacy arbitrary-password email signup — kept only for reference;
  /// new email signups go through [sendEmailOtp]/[verifyEmailOtp]/[setPin]
  /// instead so every account (phone or email) ends up with the same
  /// 6-digit PIN shape.
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

  /// Mirrors the phone flow's already-registered check — this specific
  /// lookup needs the service-role key, which a mobile client can never
  /// hold, so it calls out to the web app's own API route (which does
  /// have it) rather than duplicating that logic insecurely on-device.
  static Future<String?> emailPrecheck(String email) async {
    try {
      final res = await http
          .post(
            Uri.parse('https://subtrakr.me/api/auth/email/precheck'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email}),
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) return null;
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      return body['error'] as String? ?? 'Could not verify that email.';
    } catch (e) {
      debugPrint('AuthService.emailPrecheck failed: $e');
      return 'Could not verify that email. Check your connection.';
    }
  }

  /// Email step 1 of signup: sends a 6-digit OTP over email via GoTrue's
  /// native email-OTP mechanism (Brevo SMTP + a custom template render the
  /// code instead of a clickable magic link — see
  /// backend/docker-compose.yml and web/public/email-templates/otp.html).
  /// Unlike phone, no custom send/verify plumbing is needed here at all.
  static Future<String?> sendEmailOtp({
    required String name,
    required String email,
  }) async {
    try {
      await SupabaseService.client.auth.signInWithOtp(
        email: email,
        shouldCreateUser: true,
        data: {'full_name': name},
      );
      return null;
    } on AuthException catch (e) {
      return e.message;
    } catch (e) {
      debugPrint('AuthService.sendEmailOtp failed: $e');
      return 'Could not send the code. Check your connection and try again.';
    }
  }

  /// Email step 2: verifying the OTP establishes a real session (the user
  /// is technically signed in from this point — step 3, [setPin], is what
  /// actually finalizes their credential).
  static Future<String?> verifyEmailOtp({
    required String email,
    required String otp,
  }) async {
    try {
      await SupabaseService.client.auth.verifyOTP(
        type: OtpType.email,
        email: email,
        token: otp,
      );
      return null;
    } on AuthException catch (e) {
      return e.message;
    } catch (e) {
      debugPrint('AuthService.verifyEmailOtp failed: $e');
      return 'Verification failed. Try again.';
    }
  }

  /// Email step 3: sets the account's password to the chosen 6-digit PIN.
  /// Requires an active session (from [verifyEmailOtp]).
  static Future<String?> setPin(String pin) async {
    try {
      await SupabaseService.client.auth.updateUser(UserAttributes(password: pin));
      return null;
    } on AuthException catch (e) {
      return e.message;
    } catch (e) {
      debugPrint('AuthService.setPin failed: $e');
      return 'Could not save your PIN. Try again.';
    }
  }

  /// Sends a password-reset email. There's no in-app reset screen on
  /// mobile — the link opens the web app's already-built /reset-password
  /// page in the phone's browser, avoiding a deep-link setup for now.
  static Future<String?> sendPasswordReset(String email) async {
    try {
      await SupabaseService.client.auth.resetPasswordForEmail(
        email,
        redirectTo: 'https://subtrakr.me/reset-password',
      );
      return null;
    } on AuthException catch (e) {
      return e.message;
    } catch (e) {
      debugPrint('AuthService.sendPasswordReset failed: $e');
      return 'Could not send the reset email. Try again.';
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
