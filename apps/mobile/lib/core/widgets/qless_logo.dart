import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class QLessLogo extends StatelessWidget {
  final double emblemSize;
  final bool showSubtitle;
  final String? customSubtitle;

  const QLessLogo({
    super.key,
    this.emblemSize = 64,
    this.showSubtitle = true,
    this.customSubtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // Brand Emblem Icon with stylized "Q"
        Container(
          width: emblemSize,
          height: emblemSize,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF13774C),
                Color(0xFF093E25),
              ],
            ),
            borderRadius: BorderRadius.circular(emblemSize * 0.28),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF093E25).withValues(alpha: 0.35),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.2),
              width: 1.5,
            ),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Subtle background pulse ring
              Container(
                width: emblemSize * 0.72,
                height: emblemSize * 0.72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.12),
                    width: 2,
                  ),
                ),
              ),
              // Stylized Q lettermark
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(
                    'Q',
                    style: TextStyle(
                      fontFamily: 'serif',
                      color: Colors.white,
                      fontSize: emblemSize * 0.52,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1.0,
                      height: 1.0,
                    ),
                  ),
                  Transform.translate(
                    offset: Offset(0, emblemSize * 0.12),
                    child: Container(
                      width: emblemSize * 0.14,
                      height: emblemSize * 0.14,
                      decoration: const BoxDecoration(
                        color: Color(0xFF52B788),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: AppTheme.space16),

        // Brand Typography: QLess + QueueLess tag
        Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            RichText(
              text: const TextSpan(
                children: [
                  TextSpan(
                    text: 'Q',
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.forestGreen,
                      letterSpacing: -0.8,
                    ),
                  ),
                  TextSpan(
                    text: 'Less',
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.ink,
                      letterSpacing: -0.8,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppTheme.space8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
              decoration: BoxDecoration(
                color: AppTheme.mintTint,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: AppTheme.forestGreen.withValues(alpha: 0.25),
                ),
              ),
              child: const Text(
                'QueueLess',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.forestGreen,
                  letterSpacing: 0.3,
                ),
              ),
            ),
          ],
        ),

        if (showSubtitle) ...[
          const SizedBox(height: AppTheme.space8),
          Text(
            customSubtitle ?? 'Access your remote queue tickets and saved visits.',
            style: AppTheme.caption,
            textAlign: TextAlign.center,
          ),
        ],
      ],
    );
  }
}
