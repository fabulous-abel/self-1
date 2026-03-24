import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'features/dashboard/dashboard_screen.dart';

void main() {
  runApp(const DriverApp());
}

class DriverApp extends StatelessWidget {
  const DriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LinkEt Driver',
      debugShowCheckedModeBanner: false,
      theme: buildDriverTheme(),
      home: const DriverDashboardScreen(),
    );
  }
}
