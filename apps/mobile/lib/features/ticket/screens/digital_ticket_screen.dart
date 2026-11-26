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
  bool _notifyFivePeopleAway = true;
  bool _notifySpeedChanges = true;

  void _handleLeaveQueue() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
        ),
        title: const Text('Leave this queue?', style: AppTheme.titleMedium),
        content: const Text(
          'You will forfeit your current spot in line. You can rejoin anytime.',
          style: AppTheme.caption,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Stay in line', style: TextStyle(color: AppTheme.forestGreen, fontWeight: FontWeight.w600)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Leave queue', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _cancelling = true);
      try {
        await ref.read(ticketActionProvider.notifier).cancelTicket(widget.ticketId);
      } catch (e) {
        // If ticket is already cancelled or expired on server, proceed gracefully
      } finally {
        ref.invalidate(activeTicketsProvider);
        if (mounted) {
          setState(() => _cancelling = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppTheme.ink,
              content: Text('You have left the queue. Spot released.', style: TextStyle(color: AppTheme.offWhite)),
            ),
          );
          if (context.canPop()) {
            context.pop();
          } else {
            context.go('/');
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticketAsync = ref.watch(ticketDetailProvider(widget.ticketId));

    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      body: SafeArea(
        child: ticketAsync.when(
          data: (ticket) => _buildTicketContent(ticket),
          loading: () => widget.initialTicket != null
              ? _buildTicketContent(widget.initialTicket!)
              : const Center(child: CircularProgressIndicator(color: AppTheme.forestGreen)),
          error: (err, _) => _buildErrorState(err.toString()),
        ),
      ),
    );
  }

  Widget _buildTicketContent(TicketModel ticket) {
    final isCalled = ticket.status == 'CALLED';
    final isServing = ticket.status == 'SERVING';
    final isWaiting = ticket.status == 'WAITING';

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Navigation Bar with Back & "Leave queue" Button matching Image 1
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: AppTheme.ink),
                onPressed: () {
                  if (context.canPop()) {
                    context.pop();
                  } else {
                    context.go('/');
                  }
                },
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ticket.branchName,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.ink),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        ticket.serviceName,
                        style: const TextStyle(fontSize: 11, color: AppTheme.softGrey),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
              if (isWaiting || isCalled)
                OutlinedButton(
                  onPressed: _cancelling ? null : _handleLeaveQueue,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    side: const BorderSide(color: AppTheme.borderLight),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusInput),
                    ),
                    backgroundColor: AppTheme.white,
                  ),
                  child: Text(
                    _cancelling ? 'Leaving...' : 'Leave queue',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.ink,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppTheme.space20),

          // Called State Banner ("It's your turn!") matching Image 2
          if (isCalled || isServing) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppTheme.space16),
              margin: const EdgeInsets.only(bottom: AppTheme.space20),
              decoration: BoxDecoration(
                color: AppTheme.limeAccent,
                borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
              ),
              child: Row(
                children: [
                  Container(
                    height: 36,
                    width: 36,
                    decoration: BoxDecoration(
                      color: AppTheme.forestGreen,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Icon(Icons.notifications_active, color: AppTheme.white, size: 20),
                  ),
                  const SizedBox(width: AppTheme.space12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "It's your turn!",
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.ink,
                          ),
                        ),
                        Text(
                          'Please proceed to Counter #${ticket.counterNumber ?? "1"}',
                          style: const TextStyle(
                            fontSize: 13,
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

          // Hero Queue Card matching Image 1 & 2
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: isCalled || isServing ? AppTheme.forestGreen : AppTheme.forestGreen,
              borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            padding: const EdgeInsets.all(AppTheme.space24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top badge: Approx. X minutes left
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.access_time, size: 12, color: AppTheme.white),
                      const SizedBox(width: 4),
                      Text(
                        isCalled
                            ? 'Now being called'
                            : isServing
                                ? 'Now being served'
                                : 'Approx. ${ticket.estimatedWaitMinutes} minutes left',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.white,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppTheme.space16),

                // Main Queue Number
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '#Queue number',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.white.withValues(alpha: 0.7),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          ticket.ticketNumber,
                          style: const TextStyle(
                            fontSize: 54,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.white,
                            letterSpacing: -1.5,
                            height: 1.1,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'People Ahead: ${ticket.currentPosition > 1 ? ticket.currentPosition - 1 : 0}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Station: Counter #${ticket.counterNumber ?? "1"}',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.white.withValues(alpha: 0.8),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.space20),
                const Divider(color: Colors.white24, height: 1),
                const SizedBox(height: AppTheme.space12),

                // Auto update note
                Row(
                  children: [
                    Icon(Icons.info_outline, size: 13, color: AppTheme.white.withValues(alpha: 0.7)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'This estimate updates automatically as the queue moves.',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppTheme.white.withValues(alpha: 0.8),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppTheme.space24),

          // PROGRESS TRACKER Section matching Image 1
          const Text(
            'PROGRESS TRACKER',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppTheme.softGrey,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: AppTheme.space12),

          Container(
            padding: const EdgeInsets.all(AppTheme.space20),
            decoration: BoxDecoration(
              color: AppTheme.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
              border: Border.all(color: AppTheme.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Milestone indicators
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildTrackerMilestone('Joined queue', true),
                    _buildTrackerMilestone('Spot #${ticket.currentPosition}', isWaiting || isCalled || isServing),
                    _buildTrackerMilestone('Served', isServing),
                  ],
                ),
                const SizedBox(height: AppTheme.space16),

                // Progress line
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: isServing ? 1.0 : isCalled ? 0.85 : 0.45,
                    backgroundColor: AppTheme.mintTint,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.forestGreen),
                    minHeight: 8,
                  ),
                ),
                const SizedBox(height: AppTheme.space16),

                // Hang tight subtitle
                Row(
                  children: [
                    const Icon(Icons.radar, size: 14, color: AppTheme.forestGreen),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        isCalled
                            ? "Please step up to the counter now."
                            : "Hang tight, we'll notify you as your turn approaches.",
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.softGrey,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppTheme.space24),

          // NOTIFICATION PREFERENCES Section matching Image 1
          const Text(
            'NOTIFICATIONS',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppTheme.softGrey,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: AppTheme.space12),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppTheme.space16, vertical: AppTheme.space8),
            decoration: BoxDecoration(
              color: AppTheme.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
              border: Border.all(color: AppTheme.borderLight),
            ),
            child: Column(
              children: [
                SwitchListTile.adaptive(
                  value: _notifyFivePeopleAway,
                  onChanged: (val) => setState(() => _notifyFivePeopleAway = val),
                  activeTrackColor: AppTheme.forestGreen,
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    "Notify me when I'm 5 people away",
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppTheme.ink),
                  ),
                ),
                const Divider(color: AppTheme.borderLight, height: 1),
                SwitchListTile.adaptive(
                  value: _notifySpeedChanges,
                  onChanged: (val) => setState(() => _notifySpeedChanges = val),
                  activeTrackColor: AppTheme.forestGreen,
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    'Notify me when queue moves faster or slower',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppTheme.ink),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppTheme.space32),
        ],
      ),
    );
  }

  Widget _buildTrackerMilestone(String label, bool isCompleted) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
          size: 14,
          color: isCompleted ? AppTheme.forestGreen : AppTheme.softGrey,
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isCompleted ? FontWeight.w600 : FontWeight.w400,
            color: isCompleted ? AppTheme.ink : AppTheme.softGrey,
          ),
        ),
      ],
    );
  }

  Widget _buildErrorState(String message) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: AppTheme.ink),
                onPressed: () {
                  if (context.canPop()) {
                    context.pop();
                  } else {
                    context.go('/');
                  }
                },
              ),
              const SizedBox(width: 8),
              const Text('Unable to load ticket', style: AppTheme.titleLarge),
            ],
          ),
          const SizedBox(height: AppTheme.space8),
          const Text('Check your network connection or return to your active queues.', style: AppTheme.body),
          const SizedBox(height: AppTheme.space24),
          Row(
            children: [
              ElevatedButton(
                onPressed: () => ref.refresh(ticketDetailProvider(widget.ticketId)),
                child: const Text('Try again'),
              ),
              const SizedBox(width: AppTheme.space12),
              OutlinedButton(
                onPressed: () => context.go('/'),
                child: const Text('Return Home'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
