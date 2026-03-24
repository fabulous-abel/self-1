import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'features/auth/login_screen.dart';

void main() {
  runApp(const PassengerApp());
}

class PassengerApp extends StatelessWidget {
  const PassengerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Self Ride',
      debugShowCheckedModeBanner: false,
      theme: buildPassengerTheme(),
      builder: (context, child) {
        final mediaQuery = MediaQuery.of(context);
        return MediaQuery(
          data: mediaQuery.copyWith(textScaler: const TextScaler.linear(0.92)),
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: const LoginScreen(),
    );
  }
}
