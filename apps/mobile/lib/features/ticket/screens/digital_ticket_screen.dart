import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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
        title: const Text('Cancel Ticket?'),
        content: const Text('Are you sure you want to cancel this ticket? You will lose your spot in line.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep Ticket')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Yes, Cancel'),
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
            const SnackBar(content: Text('Ticket cancelled successfully')),
          );
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          setState(() => _cancelling = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to cancel ticket: $e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticketAsync = ref.watch(ticketDetailProvider(widget.ticketId));

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Digital Ticket Pass', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => context.pop(),
        ),
      ),
      body: ticketAsync.when(
        data: (ticket) => _buildTicketBody(ticket),
        loading: () => widget.initialTicket != null
            ? _buildTicketBody(widget.initialTicket!)
            : const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Text('Error: $err', style: const TextStyle(color: Colors.red)),
        ),
      ),
    );
  }

  Widget _buildTicketBody(TicketModel ticket) {
    final isWaiting = ticket.status == 'WAITING';
    final isCalled = ticket.status == 'CALLED';
    final isServing = ticket.status == 'SERVING';

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
      child: Column(
        children: [
          // Boarding Pass Ticket Card
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              children: [
                // Top Header Portion
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isCalled
                        ? const Color(0xFF0284C7)
                        : isServing
                        ? const Color(0xFF059669)
                        : const Color(0xFF4F46E5),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            ticket.organizationName.toUpperCase(),
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white70),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            ticket.branchName,
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          ticket.status,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),

                // Main Ticket Body
                Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    children: [
                      const Text(
                        'YOUR TICKET NUMBER',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8), letterSpacing: 1),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        ticket.ticketNumber,
                        style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w900, color: Color(0xFF0F172A), letterSpacing: 2),
                      ),
                      const SizedBox(height: 16),

                      // Service info
                      Text(
                        ticket.serviceName,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                      ),
                      const SizedBox(height: 20),

                      // Live Position & Wait Time Highlights
                      if (isWaiting) ...[
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEEF2FF),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Column(
                                  children: [
                                    const Text('POSITION IN LINE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF6366F1))),
                                    const SizedBox(height: 4),
                                    Text(
                                      '#${ticket.currentPosition}',
                                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF4F46E5)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Column(
                                  children: [
                                    const Text('EST. WAIT TIME', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                                    const SizedBox(height: 4),
                                    Text(
                                      '~${ticket.estimatedWaitMinutes}m',
                                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ] else if (isCalled) ...[
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0F9FF),
                            border: Border.all(color: const Color(0xFFBAE6FD)),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            children: [
                              const Icon(Icons.volume_up_rounded, color: Color(0xFF0284C7), size: 28),
                              const SizedBox(height: 6),
                              const Text('NOW CALLING', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
                              const SizedBox(height: 2),
                              Text(
                                'Please proceed to ${ticket.counterName ?? 'Assigned Counter'}',
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0369A1)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

                // Perforated Tear Line
                Row(
                  children: [
                    Container(
                      height: 24,
                      width: 12,
                      decoration: const BoxDecoration(
                        color: Color(0xFF0F172A),
                        borderRadius: BorderRadius.horizontal(right: Radius.circular(12)),
                      ),
                    ),
                    Expanded(
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          return Flex(
                            direction: Axis.horizontal,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: List.generate(
                              (constraints.constrainWidth() / 10).floor(),
                              (_) => const SizedBox(
                                width: 5,
                                height: 1.5,
                                child: DecoratedBox(decoration: BoxDecoration(color: Color(0xFFCBD5E1))),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    Container(
                      height: 24,
                      width: 12,
                      decoration: const BoxDecoration(
                        color: Color(0xFF0F172A),
                        borderRadius: BorderRadius.horizontal(left: Radius.circular(12)),
                      ),
                    ),
                  ],
                ),

                // Bottom QR Code & Verification Portion
                Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            const Icon(Icons.qr_code_2_rounded, size: 90, color: Color(0xFF1E293B)),
                            const SizedBox(height: 8),
                            Text(
                              'PASS CODE: ${ticket.verificationCode}',
                              style: const TextStyle(
                                fontFamily: 'monospace',
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 3,
                                color: Color(0xFF334155),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Present this pass at the counter scanner upon arrival',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Cancel button
          if (isWaiting || isCalled)
            OutlinedButton.icon(
              onPressed: _cancelling ? null : _handleCancel,
              icon: const Icon(Icons.cancel_outlined, size: 16),
              label: Text(_cancelling ? 'Cancelling...' : 'Cancel This Ticket'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFF87171),
                side: const BorderSide(color: Color(0xFF7F1D1D)),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
        ],
      ),
    );
  }
}
