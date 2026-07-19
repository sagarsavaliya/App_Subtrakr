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
