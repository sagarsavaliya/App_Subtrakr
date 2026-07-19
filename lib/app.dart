import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'presentation/providers/subscription_provider.dart';
import 'services/notification_action_bridge.dart';

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
