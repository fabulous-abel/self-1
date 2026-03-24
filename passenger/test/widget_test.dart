import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:selfqueue_passenger/main.dart';

void main() {
  testWidgets('passenger sign in opens the queue map', (tester) async {
    await tester.pumpWidget(const PassengerApp());

    expect(find.text('Passenger Sign In'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Berna Mekonnen'),
      'Berna Mekonnen',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'passenger@example.com'),
      'berna@example.com',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, '0912 345 678'),
      '0912345678',
    );
    await tester.ensureVisible(find.text('Continue to passenger app'));
    await tester.tap(find.text('Continue to passenger app'));
    await tester.pumpAndSettle();

    expect(find.text('Nearby Queues'), findsOneWidget);
    expect(find.text('Berna Mekonnen'), findsWidgets);
  });
}
