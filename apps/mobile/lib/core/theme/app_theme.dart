import 'package:flutter/material.dart';

/// QueueLess Calm, Human-Made Design System Tokens
class AppTheme {
  // Palette (strictly specified):
  static const Color forestGreen = Color(0xFF1F5C3A); // Primary buttons, active states
  static const Color mintTint = Color(0xFFE8F3EC);    // Secondary surfaces, selected states
  static const Color offWhite = Color(0xFFFAFAF7);    // Background
  static const Color ink = Color(0xFF14201A);         // Text
  static const Color softGrey = Color(0xFF6B7A72);    // Secondary text
  static const Color limeAccent = Color(0xFFB7E36B);  // Used at most once per screen

  // Structural neutral borders & dividers
  static const Color borderLight = Color(0xFFE5E7EB);
  static const Color white = Colors.white;

  // Spacing grid (8px grid, 20px screen margins)
  static const double margin = 20.0;
  static const double space4 = 4.0;
  static const double space8 = 8.0;
  static const double space12 = 12.0;
  static const double space16 = 16.0;
  static const double space20 = 20.0;
  static const double space24 = 24.0;
  static const double space32 = 32.0;

  // Radii: 12px for buttons and inputs, 16px for sheets/large sections, 8px for small tags
  static const double radiusInput = 12.0;
  static const double radiusButton = 12.0;
  static const double radiusSheet = 16.0;
  static const double radiusBadge = 8.0;

  // Typography: Three sizes (28px Title, 16px Body, 13px Caption/Meta), Two weights (w400 Regular, w600 SemiBold)
  static const TextStyle titleLarge = TextStyle(
    fontSize: 28.0,
    fontWeight: FontWeight.w600,
    color: ink,
    height: 1.25,
    letterSpacing: -0.5,
  );

  static const TextStyle titleMedium = TextStyle(
    fontSize: 20.0,
    fontWeight: FontWeight.w600,
    color: ink,
    height: 1.3,
    letterSpacing: -0.3,
  );

  static const TextStyle body = TextStyle(
    fontSize: 16.0,
    fontWeight: FontWeight.w400,
    color: ink,
    height: 1.5,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontSize: 16.0,
    fontWeight: FontWeight.w600,
    color: ink,
    height: 1.5,
  );

  static const TextStyle caption = TextStyle(
    fontSize: 13.0,
    fontWeight: FontWeight.w400,
    color: softGrey,
    height: 1.4,
  );

  static const TextStyle captionMedium = TextStyle(
    fontSize: 13.0,
    fontWeight: FontWeight.w600,
    color: softGrey,
    height: 1.4,
  );

  static ThemeData get themeData {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: offWhite,
      fontFamily: 'Inter',
      colorScheme: const ColorScheme.light(
        primary: forestGreen,
        onPrimary: white,
        surface: offWhite,
        onSurface: ink,
        secondary: mintTint,
        onSecondary: forestGreen,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: offWhite,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: ink),
        titleTextStyle: TextStyle(
          fontSize: 18.0,
          fontWeight: FontWeight.w600,
          color: ink,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: forestGreen,
          foregroundColor: white,
          elevation: 0,
          shadowColor: Colors.transparent,
          textStyle: const TextStyle(
            fontSize: 16.0,
            fontWeight: FontWeight.w600,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusButton),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 20.0),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        hintStyle: const TextStyle(
          fontSize: 16.0,
          fontWeight: FontWeight.w400,
          color: softGrey,
        ),
        labelStyle: const TextStyle(
          fontSize: 13.0,
          fontWeight: FontWeight.w600,
          color: softGrey,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusInput),
          borderSide: const BorderSide(color: borderLight, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusInput),
          borderSide: const BorderSide(color: borderLight, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusInput),
          borderSide: const BorderSide(color: forestGreen, width: 1.5),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: borderLight,
        thickness: 1.0,
        space: 1.0,
      ),
    );
  }
}
