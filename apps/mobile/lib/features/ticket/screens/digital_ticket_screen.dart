import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../models/ticket_model.dart';
import '../providers/ticket_provider.dart';

class DigitalTicketScreen extends ConsumerStatefulWidget {
  final String ticketId;
  final TicketModel? initialTicket;

  const DigitalTicketScreen({super.key, required this.ticketId, this.initialTicket});

  @override
  ConsumerState<DigitalTicketScreen> createState() => _DigitalTicketScreenState();
}

class _DigitalTicketScreenState extends ConsumerState<DigitalTicketScreen> {
  bool _cancelling = false;

  void _handleCancel() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.offWhite,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
        ),
        title: const Text('Cancel ticket?', style: AppTheme.titleMedium),
        content: const Text(
          'You will forfeit your current position in line.',
          style: AppTheme.caption,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep spot', style: TextStyle(color: AppTheme.forestGreen, fontWeight: FontWeight.w600)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Leave line', style: TextStyle(color: AppTheme.softGrey, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _cancelling = true);
      try {
        await ref.read(ticketActionProvider.notifier).cancelTicket(widget.ticketId);
        ref.refresh(activeTicketsProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppTheme.ink,
              content: Text('Ticket cancelled. Spot released.', style: TextStyle(color: AppTheme.offWhite)),
            ),
          );
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          setState(() => _cancelling = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppTheme.ink,
              content: Text('Could not cancel ticket. Please check connection.', style: const TextStyle(color: AppTheme.offWhite)),
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticketAsync = ref.watch(ticketDetailProvider(widget.ticketId));

    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.ink),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: ticketAsync.when(
          data: (ticket) => _buildTicketBody(ticket),
          loading: () => widget.initialTicket != null
              ? _buildTicketBody(widget.initialTicket!)
              : _buildSkeletonLoading(),
          error: (err, _) => _buildErrorState(err.toString()),
        ),
      ),
    );
  }

  Widget _buildSkeletonLoading() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(height: 32, width: 180, decoration: BoxDecoration(color: AppTheme.mintTint, borderRadius: BorderRadius.circular(4))),
          const SizedBox(height: AppTheme.space24),
          Container(
            height: 320,
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppTheme.mintTint.withOpacity(0.5),
              borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String message) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Unable to load ticket', style: AppTheme.titleLarge),
          const SizedBox(height: AppTheme.space8),
          const Text('Check your network connection and retry to view ticket status.', style: AppTheme.body),
          const SizedBox(height: AppTheme.space24),
          ElevatedButton(
            onPressed: () => ref.refresh(ticketDetailProvider(widget.ticketId)),
            child: const Text('Try again'),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketBody(TicketModel ticket) {
    final isWaiting = ticket.status == 'WAITING';
    final isCalled = ticket.status == 'CALLED';
    final isServing = ticket.status == 'SERVING';

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Digital ticket', style: AppTheme.titleLarge),
          const SizedBox(height: AppTheme.space4),
          Text('${ticket.organizationName} • ${ticket.branchName}', style: AppTheme.caption),
          const SizedBox(height: AppTheme.space24),

          // Main ticket section (16px corner radius)
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppTheme.mintTint,
              borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
            ),
            padding: const EdgeInsets.all(AppTheme.space24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Your number', style: AppTheme.captionMedium),
                        const SizedBox(height: AppTheme.space4),
                        Text(
                          ticket.ticketNumber,
                          style: const TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.ink,
                            letterSpacing: -1,
                          ),
                        ),
                      ],
                    ),
                    // Single small lime accent pill for active state
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: isCalled ? AppTheme.limeAccent : AppTheme.forestGreen,
                        borderRadius: BorderRadius.circular(AppTheme.radiusBadge),
                      ),
                      child: Text(
                        isCalled
                            ? 'Now called'
                            : isServing
                                ? 'Serving now'
                                : 'In queue',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isCalled ? AppTheme.ink : AppTheme.offWhite,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.space16),
                const Divider(),
                const SizedBox(height: AppTheme.space16),

                // Details grid
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Service', style: AppTheme.caption),
                          const SizedBox(height: AppTheme.space4),
                          Text(ticket.serviceName, style: AppTheme.bodyMedium),
                        ],
                      ),
                    ),
                    if (isWaiting) ...[
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Position in line', style: AppTheme.caption),
                          const SizedBox(height: AppTheme.space4),
                          Text('#${ticket.currentPosition}', style: AppTheme.bodyMedium),
                        ],
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: AppTheme.space16),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Estimated wait', style: AppTheme.caption),
                          const SizedBox(height: AppTheme.space4),
                          Text('~${ticket.estimatedWaitMinutes}m', style: AppTheme.bodyMedium),
                        ],
                      ),
                    ),
                    if (ticket.counterName != null) ...[
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Counter', style: AppTheme.caption),
                          const SizedBox(height: AppTheme.space4),
                          Text(ticket.counterName!, style: AppTheme.bodyMedium),
                        ],
                      ),
                    ],
                  ],
                ),

                const SizedBox(height: AppTheme.space24),

                // Pass verification box
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppTheme.space16),
                  decoration: BoxDecoration(
                    color: AppTheme.offWhite,
                    borderRadius: BorderRadius.circular(AppTheme.radiusInput),
                    border: Border.all(color: AppTheme.borderLight),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.qr_code_2, size: 40, color: AppTheme.ink),
                      const SizedBox(width: AppTheme.space16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Verification code', style: AppTheme.caption),
                            const SizedBox(height: 2),
                            Text(
                              'PASS CODE: ${ticket.verificationCode}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 2,
                                color: AppTheme.ink,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppTheme.space32),

          // Cancel or exit button
          if (isWaiting || isCalled)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _cancelling ? null : _handleCancel,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.borderLight),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusButton),
                  ),
                ),
                child: Text(
                  _cancelling ? 'Cancelling...' : 'Cancel This Ticket',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.softGrey,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
