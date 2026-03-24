import 'package:flutter/material.dart';

abstract final class DriverColors {
  static const Color teal = Color(0xFF0D8781);
  static const Color tealDark = Color(0xFF0B716B);
  static const Color tealSoft = Color(0xFFDCE9E7);
  static const Color softBackground = Color(0xFFEEF4F3);
  static const Color ink = Color(0xFF101936);
  static const Color muted = Color(0xFF7082A0);
  static const Color line = Color(0xFFD9E6E7);
}

ThemeData buildDriverTheme() {
  const colorScheme = ColorScheme.light(
    primary: DriverColors.teal,
    secondary: DriverColors.tealDark,
    surface: Colors.white,
    onPrimary: Colors.white,
    onSurface: DriverColors.ink,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: DriverColors.softBackground,
    fontFamily: 'Public Sans',
    textTheme: const TextTheme(
      headlineMedium: TextStyle(
        fontSize: 32,
        fontWeight: FontWeight.w800,
        color: DriverColors.ink,
        letterSpacing: -1,
      ),
      titleLarge: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w800,
        color: DriverColors.ink,
      ),
      bodyLarge: TextStyle(fontSize: 17, color: DriverColors.ink),
      bodyMedium: TextStyle(fontSize: 15, color: DriverColors.muted),
    ),
  );
}
