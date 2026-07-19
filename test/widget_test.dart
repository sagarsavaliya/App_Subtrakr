import 'dart:io';
import 'dart:ui';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:subtrakr/app.dart';
import 'package:subtrakr/data/bootstrap.dart';

void main() {
  testWidgets('Dashboard renders with hero summary card', (
    WidgetTester tester,
  ) async {
    // A tall phone-sized surface so the dashboard's scrollable content
    // mounts within the sliver's viewport + cache extent.
    await tester.binding.setSurfaceSize(const Size(400, 2400));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final tempDir = Directory.systemTemp.createTempSync('subtrakr_test');
    addTearDown(() async {
      await tester.runAsync(() async {
        await Hive.close();
        tempDir.deleteSync(recursive: true);
      });
    });
    // Hive's box-opening uses real file IO/locking — run it outside the
    // fake-async test zone via runAsync, or it hangs waiting on real timers
    // that pump() never advances.
    await tester.runAsync(() => bootstrapLocalData(testPath: tempDir.path));

    await tester.pumpWidget(const ProviderScope(child: SubtrakrApp()));
    // The aurora background runs a perpetual animation, so pumpAndSettle
    // would never resolve — pump fixed-duration frames instead, long enough
    // to clear the splash screen's 1200ms auto-navigate delay.
    for (var i = 0; i < 15; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }

    expect(find.text('TOTAL MONTHLY SPEND'), findsOneWidget);
    expect(find.text('All subscriptions'), findsOneWidget);
  });
}
