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
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Large section highlight (16px radius, mint tint)
                        Container(
                          width: double.infinity,
                          height: 200,
                          decoration: BoxDecoration(
                            color: AppTheme.mintTint,
                            borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
                          ),
                          padding: const EdgeInsets.all(AppTheme.space24),
                          alignment: Alignment.bottomLeft,
                          child: Text(
                            'Step 0${idx + 1}',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.forestGreen,
                            ),
                          ),
                        ),
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
