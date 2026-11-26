import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/app_theme.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _controller = PageController();
  int _currentPage = 0;

  final List<Map<String, String>> _slides = [
    {
      'title': 'Never Wait in Line Again',
      'desc': 'Discover nearby branches, verify real-time queue lengths, and check service operating hours before you leave home.',
    },
    {
      'title': 'Track Queue in Real Time',
      'desc': 'Join queues with one tap and track your estimated wait time. Spend your waiting time wherever you want.',
    },
    {
      'title': 'Smart Digital Pass',
      'desc': 'Present your digital ticket pass at the counter scanner when your number is called for immediate service.',
    },
  ];

  void _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_completed', true);
    if (mounted) {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _currentPage == _slides.length - 1;

    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top row with skip
              Align(
                alignment: Alignment.topRight,
                child: TextButton(
                  onPressed: _completeOnboarding,
                  child: const Text('Skip', style: AppTheme.captionMedium),
                ),
              ),

              const SizedBox(height: AppTheme.space32),

              // Page view slides
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  itemCount: _slides.length,
                  onPageChanged: (idx) => setState(() => _currentPage = idx),
                  itemBuilder: (context, idx) {
                    final slide = _slides[idx];
                    Widget graphic;
                    if (idx == 0) {
                      graphic = const _SlideOneGraphic();
                    } else if (idx == 1) {
                      graphic = const _SlideTwoGraphic();
                    } else {
                      graphic = const _SlideThreeGraphic();
                    }

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Related illustration graphic card
                        graphic,
                        const SizedBox(height: AppTheme.space32),

                        Text(
                          slide['title']!,
                          style: AppTheme.titleLarge,
                        ),
                        const SizedBox(height: AppTheme.space16),

                        Text(
                          slide['desc']!,
                          style: AppTheme.body,
                        ),
                      ],
                    );
                  },
                ),
              ),

              // Bottom step indicators and primary action
              Row(
                children: List.generate(
                  _slides.length,
                  (i) => Container(
                    margin: const EdgeInsets.only(right: 8),
                    width: i == _currentPage ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: i == _currentPage ? AppTheme.limeAccent : AppTheme.borderLight,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: AppTheme.space24),

              // One main action per screen
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (isLast) {
                      _completeOnboarding();
                    } else {
                      _controller.nextPage(
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeOut,
                      );
                    }
                  },
                  child: Text(isLast ? 'Get started' : 'Next'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SlideOneGraphic extends StatelessWidget {
  const _SlideOneGraphic();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 220,
      decoration: BoxDecoration(
        color: AppTheme.mintTint,
        borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Road grids
            Positioned(
              left: -20,
              top: 60,
              right: -20,
              child: Container(
                height: 28,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
            Positioned(
              left: 70,
              top: -20,
              bottom: -20,
              child: Container(
                width: 24,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            // Floating branch card (CBE Bole Branch)
            Positioned(
              top: 20,
              left: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppTheme.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderLight),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppTheme.mintTint,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.account_balance, size: 16, color: AppTheme.forestGreen),
                    ),
                    const SizedBox(width: 8),
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('CBE Bole Branch', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.ink)),
                        Text('12 min wait • 1.2km away', style: TextStyle(fontSize: 10, color: AppTheme.softGrey)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            // Floating hospital pin card (Tikur Anbessa)
            Positioned(
              bottom: 20,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppTheme.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderLight),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppTheme.mintTint,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.local_hospital, size: 16, color: AppTheme.forestGreen),
                    ),
                    const SizedBox(width: 8),
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Tikur Anbessa Hospital', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.ink)),
                        Text('Fast triage • 18 in queue', style: TextStyle(fontSize: 10, color: AppTheme.softGrey)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            // Center GPS Beacon
            Center(
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppTheme.forestGreen.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Container(
                    width: 22,
                    height: 22,
                    decoration: const BoxDecoration(
                      color: AppTheme.forestGreen,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.my_location, size: 14, color: AppTheme.white),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SlideTwoGraphic extends StatelessWidget {
  const _SlideTwoGraphic();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 220,
      decoration: BoxDecoration(
        color: AppTheme.mintTint,
        borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Center(
        child: Container(
          width: 270,
          padding: const EdgeInsets.all(AppTheme.space16),
          decoration: BoxDecoration(
            color: AppTheme.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.borderLight),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.mintTint,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.radio_button_checked, size: 10, color: AppTheme.forestGreen),
                        SizedBox(width: 4),
                        Text(
                          'LIVE TRACKING',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.forestGreen),
                        ),
                      ],
                    ),
                  ),
                  const Text(
                    '~14 mins left',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.softGrey),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  const Text(
                    'VIP-042',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.forestGreen,
                      letterSpacing: -1,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.limeAccent.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      '3 ahead of you',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.ink),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: const LinearProgressIndicator(
                  value: 0.75,
                  minHeight: 6,
                  backgroundColor: AppTheme.borderLight,
                  valueColor: AlwaysStoppedAnimation<Color>(AppTheme.forestGreen),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SlideThreeGraphic extends StatelessWidget {
  const _SlideThreeGraphic();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 220,
      decoration: BoxDecoration(
        color: AppTheme.mintTint,
        borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Center(
        child: Container(
          width: 250,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: BoxDecoration(
            color: AppTheme.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.borderLight),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 84,
                height: 84,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.offWhite,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderLight),
                ),
                child: const Icon(Icons.qr_code_2, size: 68, color: AppTheme.ink),
              ),
              const SizedBox(height: 10),
              const Text(
                'Instant Counter Scan',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.ink),
              ),
              const SizedBox(height: 2),
              const Text(
                'Assigned to Station #02 (Cash Desk)',
                style: TextStyle(fontSize: 11, color: AppTheme.softGrey),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
