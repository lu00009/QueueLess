import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../home/screens/home_navigation_screen.dart';
import '../providers/ticket_provider.dart';
import '../models/ticket_model.dart';

class ActiveTicketsScreen extends ConsumerWidget {
  const ActiveTicketsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeTicketsAsync = ref.watch(activeTicketsProvider);

    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.forestGreen,
          backgroundColor: AppTheme.offWhite,
          onRefresh: () async {
            ref.invalidate(activeTicketsProvider);
          },
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppTheme.margin,
                    AppTheme.space24,
                    AppTheme.margin,
                    AppTheme.space16,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('My active queue', style: AppTheme.titleLarge),
                          SizedBox(height: AppTheme.space4),
                          Text('Live status and estimated service time', style: AppTheme.caption),
                        ],
                      ),
                      IconButton(
                        onPressed: () => context.push('/scan'),
                        icon: Container(
                          padding: const EdgeInsets.all(AppTheme.space8),
                          decoration: BoxDecoration(
                            color: AppTheme.mintTint,
                            borderRadius: BorderRadius.circular(AppTheme.radiusInput),
                          ),
                          child: const Icon(Icons.qr_code_scanner, size: 20, color: AppTheme.forestGreen),
                        ),
                        tooltip: 'Scan ticket',
                      ),
                    ],
                  ),
                ),
              ),
              activeTicketsAsync.when(
                data: (tickets) {
                  if (tickets.isEmpty) {
                    return SliverFillRemaining(
                      hasScrollBody: false,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Container(
                              height: 64,
                              width: 64,
                              decoration: BoxDecoration(
                                color: AppTheme.mintTint,
                                borderRadius: BorderRadius.circular(32),
                              ),
                              child: const Icon(
                                Icons.confirmation_number_outlined,
                                size: 32,
                                color: AppTheme.forestGreen,
                              ),
                            ),
                            const SizedBox(height: AppTheme.space16),
                            const Text('No active queue tickets', style: AppTheme.titleMedium),
                            const SizedBox(height: AppTheme.space8),
                            const Text(
                              'When you join a queue, your live ticket, current position, and wait estimate will appear here.',
                              style: AppTheme.body,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: AppTheme.space24),
                            // WORKING FIND SERVICE BUTTON: Switches directly to Explore tab!
                            ElevatedButton.icon(
                              onPressed: () {
                                ref.read(homeNavigationIndexProvider.notifier).state = 0;
                              },
                              icon: const Icon(Icons.search, size: 18),
                              label: const Text('Find service centers'),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, idx) {
                          if (idx >= tickets.length) return null;
                          final ticket = tickets[idx];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: AppTheme.space16),
                            child: _buildQueueCard(context, ref, ticket),
                          );
                        },
                        childCount: tickets.length,
                      ),
                    ),
                  );
                },
                loading: () => SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space16),
                    child: Column(
                      children: List.generate(2, (_) => _buildSkeletonCard()),
                    ),
                  ),
                ),
                error: (err, _) => SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppTheme.margin),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('Unable to load active tickets', style: AppTheme.titleMedium),
                          const SizedBox(height: AppTheme.space8),
                          const Text('Check your internet connection and retry.', style: AppTheme.caption),
                          const SizedBox(height: AppTheme.space16),
                          ElevatedButton(
                            onPressed: () => ref.refresh(activeTicketsProvider),
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
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

  Widget _buildQueueCard(BuildContext context, WidgetRef ref, TicketModel ticket) {
    final isCalled = ticket.status == 'CALLED';
    final isServing = ticket.status == 'SERVING';

    return InkWell(
      onTap: () => context.push('/ticket/${ticket.id}', extra: ticket),
      borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
      child: Container(
        decoration: BoxDecoration(
          color: isCalled || isServing ? AppTheme.forestGreen : AppTheme.white,
          borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
          border: Border.all(
            color: isCalled || isServing ? AppTheme.forestGreen : AppTheme.borderLight,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(AppTheme.space20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top row: Branch & Service with Status pill
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ticket.branchName,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isCalled || isServing ? AppTheme.mintTint : AppTheme.softGrey,
                        ),
                      ),
                      const SizedBox(height: AppTheme.space4),
                      Text(
                        ticket.serviceName,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: isCalled || isServing ? AppTheme.white : AppTheme.ink,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isCalled
                        ? AppTheme.limeAccent
                        : isServing
                            ? AppTheme.limeAccent
                            : AppTheme.mintTint,
                    borderRadius: BorderRadius.circular(AppTheme.radiusBadge),
                  ),
                  child: Text(
                    isCalled
                        ? 'Now called'
                        : isServing
                            ? 'Serving now'
                            : 'Approx. ${ticket.estimatedWaitMinutes}m',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isCalled || isServing ? AppTheme.ink : AppTheme.forestGreen,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppTheme.space20),

            // Number & stats split
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
                        color: isCalled || isServing ? AppTheme.mintTint : AppTheme.softGrey,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      ticket.ticketNumber,
                      style: TextStyle(
                        fontSize: 40,
                        fontWeight: FontWeight.w700,
                        color: isCalled || isServing ? AppTheme.white : AppTheme.ink,
                        letterSpacing: -1,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      isCalled || isServing
                          ? 'Counter: ${ticket.counterNumber ?? "1"}'
                          : 'People ahead: ${ticket.currentPosition > 1 ? ticket.currentPosition - 1 : 0}',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isCalled || isServing ? AppTheme.white : AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'View full ticket →',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isCalled || isServing ? AppTheme.limeAccent : AppTheme.forestGreen,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSkeletonCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: AppTheme.space16),
      padding: const EdgeInsets.all(AppTheme.space20),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(height: 14, width: 120, color: AppTheme.mintTint),
          const SizedBox(height: 8),
          Container(height: 18, width: 200, color: AppTheme.mintTint),
          const SizedBox(height: 16),
          Container(height: 40, width: 100, color: AppTheme.mintTint),
        ],
      ),
    );
  }
}
