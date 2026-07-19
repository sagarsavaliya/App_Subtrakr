import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'presentation/providers/subscription_provider.dart';
import 'services/notification_action_bridge.dart';
import 'services/notification_service.dart';

class SubtrakrApp extends ConsumerStatefulWidget {
  const SubtrakrApp({super.key});

  @override
  ConsumerState<SubtrakrApp> createState() => _SubtrakrAppState();
}

class _SubtrakrAppState extends ConsumerState<SubtrakrApp> {
  @override
  void initState() {
    super.initState();
    // Wires notification taps (foreground/backgrounded, process alive) back
    // into the running app — see NotificationActionBridge for why this
    // indirection exists.
    NotificationActionBridge.onMarkPaid = (subscriptionId) {
      ref.read(subscriptionsProvider.notifier).markPaid(subscriptionId);
    };
    NotificationActionBridge.onOpenSubscription = (subscriptionId) {
      appRouter.push('/subscription/$subscriptionId');
    };

    // Cold-start case: app was fully killed and the user tapped a reminder
    // notification to launch it. Delayed past SplashScreen's own 1200ms
    // auto-redirect to /dashboard — that redirect uses go(), which replaces
    // the whole route stack, so pushing the subscription detail before it
    // fires would just get wiped out immediately.
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) NotificationService.checkLaunchDetails();
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'SubTrakr',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.dark,
      routerConfig: appRouter,
    );
  }
}
