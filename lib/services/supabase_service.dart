import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Thin wrapper around the Supabase client, pointed at the self-hosted
/// stack on subtrakr.me's VPS (see subtrakr-build-status memory for the
/// full deployment — Postgres/Auth/REST/Storage/Kong via Docker Compose).
class SupabaseService {
  SupabaseService._();

  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;
    final url = dotenv.env['SUPABASE_URL'];
    final anonKey = dotenv.env['SUPABASE_ANON_KEY'];
    if (url == null || anonKey == null || url.contains('your-project')) {
      debugPrint('SupabaseService.init skipped — no real credentials in .env');
      return;
    }
    try {
      await Supabase.initialize(url: url, publishableKey: anonKey);
      _initialized = true;
    } catch (e) {
      debugPrint('SupabaseService.init failed (non-fatal): $e');
    }
  }

  static bool get isReady => _initialized;

  static SupabaseClient get client => Supabase.instance.client;
}
