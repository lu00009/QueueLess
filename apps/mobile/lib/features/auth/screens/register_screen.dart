import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';

class CustomerRegisterScreen extends ConsumerStatefulWidget {
  const CustomerRegisterScreen({super.key});

  @override
  ConsumerState<CustomerRegisterScreen> createState() =>
      _CustomerRegisterScreenState();
}

class _CustomerRegisterScreenState
    extends ConsumerState<CustomerRegisterScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      final success = await ref
          .read(authStateProvider.notifier)
          .register(
            fullName: _nameController.text.trim(),
            email: _emailController.text.trim(),
            password: _passwordController.text,
            phone: _phoneController.text.isNotEmpty
                ? _phoneController.text.trim()
                : null,
          );
      if (success && mounted) {
        context.go('/');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.ink),
          onPressed: () => context.go('/login'),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppTheme.margin,
              vertical: AppTheme.space16,
            ),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: Column(
                          children: [
                            const Text(
                              'Create account',
                              style: AppTheme.titleLarge,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: AppTheme.space8),
                            const Text(
                              'Join QueueLess to hold your place in line remotely.',
                              style: AppTheme.caption,
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppTheme.space24),

                      if (authState.error != null) ...[
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(AppTheme.space16),
                          margin: const EdgeInsets.only(
                            bottom: AppTheme.space24,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.mintTint,
                            borderRadius: BorderRadius.circular(
                              AppTheme.radiusInput,
                            ),
                            border: Border.all(
                              color: AppTheme.forestGreen.withValues(
                                alpha: 0.3,
                              ),
                            ),
                          ),
                          child: Text(
                            authState.error!,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                              color: AppTheme.ink,
                            ),
                          ),
                        ),
                      ],

                      // Full name
                      TextFormField(
                        controller: _nameController,
                        style: AppTheme.body,
                        decoration: const InputDecoration(
                          labelText: 'Full name',
                          hintText: 'Jane Smith',
                        ),
                        validator: (val) => (val == null || val.trim().isEmpty)
                            ? 'Enter your full name'
                            : null,
                      ),
                      const SizedBox(height: AppTheme.space16),

                      // Email
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        style: AppTheme.body,
                        decoration: const InputDecoration(
                          labelText: 'Email address',
                          hintText: 'name@example.com',
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Enter your email';
                          }
                          if (!val.contains('@')) {
                            return 'Enter a valid email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppTheme.space16),

                      // Phone
                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        style: AppTheme.body,
                        decoration: const InputDecoration(
                          labelText: 'Mobile number (optional)',
                          hintText: '+1 555-0199',
                        ),
                      ),
                      const SizedBox(height: AppTheme.space16),

                      // Password
                      TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        style: AppTheme.body,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          hintText: 'At least 8 characters',
                        ),
                        validator: (val) {
                          if (val == null || val.length < 8) {
                            return 'Password must be at least 8 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppTheme.space32),

                      // One main action
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: authState.isLoading ? null : _submit,
                          child: Text(
                            authState.isLoading
                                ? 'Creating account...'
                                : 'Create account',
                          ),
                        ),
                      ),

                      const SizedBox(height: AppTheme.space24),

                      Center(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text(
                              'Already have an account? ',
                              style: AppTheme.caption,
                            ),
                            GestureDetector(
                              onTap: () => context.go('/login'),
                              child: const Text(
                                'Sign in',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.forestGreen,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
