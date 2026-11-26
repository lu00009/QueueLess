import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';

class CustomerLoginScreen extends ConsumerStatefulWidget {
  const CustomerLoginScreen({super.key});

  @override
  ConsumerState<CustomerLoginScreen> createState() => _CustomerLoginScreenState();
}

class _CustomerLoginScreenState extends ConsumerState<CustomerLoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      final success = await ref.read(authStateProvider.notifier).login(
            _emailController.text.trim(),
            _passwordController.text,
          );
      if (success && mounted) {
        context.go('/');
      }
    }
  }

  void _quickFill() {
    _emailController.text = 'customer@example.com';
    _passwordController.text = 'Password@123456';
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space32),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('QueueLess', style: AppTheme.titleLarge),
                  const SizedBox(height: AppTheme.space8),
                  const Text(
                    'Access your remote queue tickets and saved visits.',
                    style: AppTheme.caption,
                  ),
                  const SizedBox(height: AppTheme.space32),

                  if (authState.error != null) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(AppTheme.space16),
                      margin: const EdgeInsets.only(bottom: AppTheme.space24),
                      decoration: BoxDecoration(
                        color: AppTheme.mintTint,
                        borderRadius: BorderRadius.circular(AppTheme.radiusInput),
                        border: Border.all(color: AppTheme.forestGreen.withOpacity(0.3)),
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
                      if (val == null || val.trim().isEmpty) return 'Enter your email';
                      if (!val.contains('@')) return 'Enter a valid email';
                      return null;
                    },
                  ),
                  const SizedBox(height: AppTheme.space16),

                  // Password
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    style: AppTheme.body,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      hintText: '••••••••',
                    ),
                    validator: (val) {
                      if (val == null || val.isEmpty) return 'Enter your password';
                      return null;
                    },
                  ),
                  const SizedBox(height: AppTheme.space8),

                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: _quickFill,
                      child: const Text(
                        'Fill Demo Customer',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w400,
                          color: AppTheme.softGrey,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: AppTheme.space24),

                  // One main action per screen
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: authState.isLoading ? null : _submit,
                      child: Text(
                        authState.isLoading ? 'Signing In...' : 'Sign In',
                      ),
                    ),
                  ),

                  const SizedBox(height: AppTheme.space24),

                  Center(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text("Don't have an account? ", style: AppTheme.caption),
                        GestureDetector(
                          onTap: () => context.go('/register'),
                          child: const Text(
                            'Create one',
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
    );
  }
}
