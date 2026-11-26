import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../discovery/models/branch_model.dart';
import '../../ticket/providers/ticket_provider.dart';

class JoinQueueScreen extends ConsumerStatefulWidget {
  final BranchServiceModel service;
  final BranchModel branch;

  const JoinQueueScreen({
    super.key,
    required this.service,
    required this.branch,
  });

  @override
  ConsumerState<JoinQueueScreen> createState() => _JoinQueueScreenState();
}

class _JoinQueueScreenState extends ConsumerState<JoinQueueScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  bool _submitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authStateProvider).user;
    if (user != null) {
      _nameController.text = user.fullName;
      if (user.phone != null) _phoneController.text = user.phone!;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submitJoin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    try {
      final ticket = await ref.read(ticketActionProvider.notifier).joinQueue(
            serviceId: widget.service.id,
            customerName: _nameController.text.trim(),
            customerPhone: _phoneController.text.trim().isNotEmpty
                ? _phoneController.text.trim()
                : null,
          );

      if (ticket != null && mounted) {
        context.go('/ticket/${ticket.id}', extra: ticket);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().contains('already have an active ticket')
              ? 'You already have an active ticket for this service.'
              : 'Could not enter queue. Please verify connection and try again.';
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      appBar: AppBar(
        title: const Text('Enter queue'),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space16),
            children: [
              // Large Title
              const Text('Your visit details', style: AppTheme.titleLarge),
              const SizedBox(height: AppTheme.space8),
              Text(
                'Confirm the department and your contact info so staff can summon you when ready.',
                style: AppTheme.caption,
              ),

              const SizedBox(height: AppTheme.space24),

              // Selected Service Summary Card (Mint surface)
              Container(
                padding: const EdgeInsets.all(AppTheme.space16),
                decoration: BoxDecoration(
                  color: AppTheme.mintTint,
                  borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.service.name, style: AppTheme.bodyMedium),
                    const SizedBox(height: AppTheme.space4),
                    Text(widget.branch.name, style: AppTheme.caption),
                    const SizedBox(height: AppTheme.space8),
                    Row(
                      children: [
                        const Icon(Icons.timer_outlined, size: 16, color: AppTheme.forestGreen),
                        const SizedBox(width: AppTheme.space4),
                        Text(
                          'Estimated wait time: ~${widget.service.estimatedDurationMinutes} min',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.forestGreen,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.space32),

              // Error notification if present
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(AppTheme.space16),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(AppTheme.radiusInput),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(fontSize: 13, color: Colors.red.shade800),
                  ),
                ),
                const SizedBox(height: AppTheme.space16),
              ],

              // Input: Customer Name
              const Text('Full name', style: AppTheme.captionMedium),
              const SizedBox(height: AppTheme.space8),
              TextFormField(
                controller: _nameController,
                style: AppTheme.body,
                decoration: const InputDecoration(
                  hintText: 'Enter your name',
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Please provide your name';
                  return null;
                },
              ),

              const SizedBox(height: AppTheme.space24),

              // Input: Phone Number (Optional)
              const Text('Phone number (optional)', style: AppTheme.captionMedium),
              const SizedBox(height: AppTheme.space8),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                style: AppTheme.body,
                decoration: const InputDecoration(
                  hintText: 'For SMS notifications when your turn approaches',
                ),
              ),

              const SizedBox(height: AppTheme.space32),

              // Single Primary Action Button
              ElevatedButton(
                onPressed: _submitting ? null : _submitJoin,
                child: _submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.white),
                      )
                    : const Text('Get digital ticket'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
