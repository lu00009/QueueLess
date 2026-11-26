import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';

class CustomerProfileScreen extends ConsumerWidget {
  const CustomerProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final user = auth.user;

    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Account', style: AppTheme.titleLarge),
              const SizedBox(height: AppTheme.space4),
              const Text('Manage your queue profile and past activity.', style: AppTheme.caption),
              const SizedBox(height: AppTheme.space24),

              // Large user section (16px radius, mint tint)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppTheme.space24),
                decoration: BoxDecoration(
                  color: AppTheme.mintTint,
                  borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user?.fullName ?? 'Customer',
                      style: AppTheme.titleMedium,
                    ),
                    const SizedBox(height: AppTheme.space4),
                    Text(
                      user?.email ?? '',
                      style: AppTheme.captionMedium,
                    ),
                    if (user?.phone != null && user!.phone!.isNotEmpty) ...[
                      const SizedBox(height: AppTheme.space4),
                      Text(user.phone!, style: AppTheme.caption),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.space32),

              // List rows with dividers
              const Text('Activity & settings', style: AppTheme.captionMedium),
              const SizedBox(height: AppTheme.space8),

              InkWell(
                onTap: () => context.push('/history'),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppTheme.space16),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Visit history', style: AppTheme.bodyMedium),
                            SizedBox(height: AppTheme.space4),
                            Text('View past tickets and completed services', style: AppTheme.caption),
                          ],
                        ),
                      ),
                      Icon(Icons.arrow_forward, size: 16, color: AppTheme.softGrey),
                    ],
                  ),
                ),
              ),
              const Divider(),

              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppTheme.space16),
                child: Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Account role', style: AppTheme.bodyMedium),
                          SizedBox(height: AppTheme.space4),
                          Text('Permissions for remote queue booking', style: AppTheme.caption),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.mintTint,
                        borderRadius: BorderRadius.circular(AppTheme.radiusBadge),
                      ),
                      child: Text(
                        user?.role ?? 'CUSTOMER',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.forestGreen,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(),

              const SizedBox(height: AppTheme.space32),

              // Single main sign out action
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () async {
                    await ref.read(authStateProvider.notifier).logout();
                    if (context.mounted) {
                      context.go('/login');
                    }
                  },
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppTheme.borderLight),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusButton),
                    ),
                  ),
                  child: const Text(
                    'Sign out',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.ink,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
