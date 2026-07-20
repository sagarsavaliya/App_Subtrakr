import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:subtrakr/data/bootstrap.dart';
import 'package:subtrakr/data/models/subscription_model.dart';
import 'package:subtrakr/presentation/providers/subscription_provider.dart';
import 'package:subtrakr/presentation/screens/dashboard/notifications_sheet.dart';

SubscriptionModel _sub(
  String id,
  String name,
  DateTime nextDue,
) {
  return SubscriptionModel(
    id: id,
    entityId: 'e1',
    name: name,
    initials: name.substring(0, 1).toUpperCase(),
    category: SubscriptionCategory.other,
    amount: 299,
    billingCycle: BillingCycle.monthly,
    startDate: DateTime.now().subtract(const Duration(days: 30)),
    nextDueDate: nextDue,
    status: SubscriptionStatus.active,
  );
}

void main() {
  // SubscriptionTile (used inside the sheet) reads entitiesProvider, which
  // needs a real Hive box behind it. LocalDataSource's "already
  // initialized" flag is a process-wide static, so re-bootstrapping across
  // separate testWidgets blocks in one file breaks the second — both
  // scenarios run inside a single test instead.
  testWidgets('NotificationsSheet: populated and empty states', (
    tester,
  ) async {
    final tempDir = Directory.systemTemp.createTempSync('subtrakr_notif_test');
    addTearDown(() async {
      await tester.runAsync(() async {
        await Hive.close();
        tempDir.deleteSync(recursive: true);
      });
    });
    await tester.runAsync(() => bootstrapLocalData(testPath: tempDir.path));

    final overdueSub = _sub(
      'o1',
      'Overdue Service',
      DateTime.now().subtract(const Duration(days: 2)),
    );
    final dueSoonSub = _sub(
      'd1',
      'Due Soon Service',
      DateTime.now().add(const Duration(days: 3)),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          dueThisWeekProvider.overrideWithValue([overdueSub, dueSoonSub]),
        ],
        child: const MaterialApp(home: Scaffold(body: NotificationsSheet())),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Overdue'), findsOneWidget);
    expect(find.text('Due this week'), findsOneWidget);
    expect(find.text('Overdue Service'), findsOneWidget);
    expect(find.text('Due Soon Service'), findsOneWidget);
    expect(find.text("You're all caught up"), findsNothing);

    // Empty state.
    await tester.pumpWidget(
      ProviderScope(
        overrides: [dueThisWeekProvider.overrideWithValue(const [])],
        child: const MaterialApp(home: Scaffold(body: NotificationsSheet())),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text("You're all caught up"), findsOneWidget);
    expect(find.text('Overdue'), findsNothing);
  });
}
