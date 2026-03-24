import 'package:flutter/material.dart';

abstract final class PassengerColors {
  static const Color teal = Color(0xFF058C8A);
  static const Color tealDark = Color(0xFF047876);
  static const Color shell = Color(0xFFF7F2EE);
  static const Color card = Colors.white;
  static const Color ink = Color(0xFF101936);
  static const Color muted = Color(0xFF8FA0BD);
  static const Color line = Color(0xFFE4EBF3);
  static const Color orange = Color(0xFFFF5B0A);
  static const Color blue = Color(0xFF2E68F2);
  static const Color peach = Color(0xFFF8A068);
}

ThemeData buildPassengerTheme() {
  const colorScheme = ColorScheme.light(
    primary: PassengerColors.teal,
    secondary: PassengerColors.orange,
    surface: PassengerColors.card,
    onPrimary: Colors.white,
    onSecondary: Colors.white,
    onSurface: PassengerColors.ink,
  );

  final baseTheme = ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: PassengerColors.shell,
    fontFamily: 'Public Sans',
  );

  return baseTheme.copyWith(
    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        fontSize: 34,
        fontWeight: FontWeight.w800,
        color: PassengerColors.ink,
        letterSpacing: -1.1,
      ),
      headlineMedium: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w800,
        color: PassengerColors.ink,
        letterSpacing: -0.8,
      ),
      titleLarge: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        color: PassengerColors.ink,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: PassengerColors.ink,
      ),
      bodyLarge: TextStyle(
        fontSize: 15,
        color: PassengerColors.ink,
        height: 1.4,
      ),
      bodyMedium: TextStyle(
        fontSize: 13,
        color: PassengerColors.muted,
        height: 1.35,
      ),
      labelLarge: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: PassengerColors.ink,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      hintStyle: const TextStyle(
        color: Color(0xFF7B89A4),
        fontSize: 15,
        fontWeight: FontWeight.w500,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: PassengerColors.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: PassengerColors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: PassengerColors.teal, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: PassengerColors.orange),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: PassengerColors.orange, width: 1.5),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: PassengerColors.orange,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 56),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: PassengerColors.ink,
        minimumSize: const Size(0, 50),
        side: const BorderSide(color: PassengerColors.line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
      ),
    ),
    chipTheme: baseTheme.chipTheme.copyWith(
      backgroundColor: const Color(0xFFF4F8FD),
      selectedColor: const Color(0xFFEAF7F6),
      side: const BorderSide(color: Color(0xFFE2EBF4)),
      labelStyle: const TextStyle(
        color: PassengerColors.ink,
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: PassengerColors.ink,
      contentTextStyle: TextStyle(color: Colors.white),
    ),
    dividerTheme: const DividerThemeData(
      color: PassengerColors.line,
      thickness: 1,
    ),
  );
}
