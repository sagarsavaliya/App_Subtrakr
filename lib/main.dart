import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'data/bootstrap.dart';
import 'data/repositories/subscription_repository.dart';
import 'services/notification_service.dart';
import 'services/supabase_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // .env carries Supabase credentials — now pointed at the live self-hosted
  // instance on the VPS (supabase.subtrakr.me).
  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // Missing/placeholder .env is fine for local UI development.
  }
  await SupabaseService.init();

  await bootstrapLocalData();

  // Never let notification setup block app boot: on web in particular, the
  // permission prompt can hang indefinitely without a user gesture (and
  // more generally, a slow/misbehaving plugin shouldn't delay first paint).
  unawaited(_setUpNotifications());

  runApp(const ProviderScope(child: SubtrakrApp()));
}

Future<void> _setUpNotifications() async {
  await NotificationService.init();
  await NotificationService.requestPermission();
  // Reminders persist on the OS side across restarts, but (re)scheduling on
  // every launch is cheap and keeps things correct after a fresh install or
  // if the OS ever drops a scheduled alarm.
  await NotificationService.scheduleAll(SubscriptionRepository().getAll());
}
