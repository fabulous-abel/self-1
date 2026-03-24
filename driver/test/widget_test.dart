import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:selfqueue_driver/main.dart';

void main() {
  testWidgets('driver dashboard toggles online status', (tester) async {
    await tester.pumpWidget(const DriverApp());

    expect(find.text('Go Online'), findsOneWidget);

    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();

    expect(find.text('You are online'), findsOneWidget);

    await tester.tap(find.text('Queue'));
    await tester.pumpAndSettle();

    expect(find.text('Queue Overview'), findsOneWidget);
  });
}
