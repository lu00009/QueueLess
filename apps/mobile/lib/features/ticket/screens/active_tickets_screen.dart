import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
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
          onRefresh: () async => ref.refresh(activeTicketsProvider),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(AppTheme.margin, AppTheme.space24, AppTheme.margin, AppTheme.space16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Active tickets', style: AppTheme.titleLarge),
                      SizedBox(height: AppTheme.space4),
                      Text('Current queues you have joined remotely.', style: AppTheme.caption),
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
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('No Active Queue Tickets', style: AppTheme.titleMedium),
                            const SizedBox(height: AppTheme.space8),
                            const Text(
                              'When you join a queue, your live ticket and queue status will appear here.',
                              style: AppTheme.body,
                            ),
                            const SizedBox(height: AppTheme.space24),
                            ElevatedButton(
                              onPressed: () => context.go('/'),
                              child: const Text('Find service centers'),
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
                          final isLast = idx == tickets.length - 1;
                          final isFirstInLine = ticket.currentPosition == 1 || ticket.status == 'CALLED';

                          return Column(
                            children: [
                              InkWell(
                                onTap: () => context.push('/ticket/${ticket.id}', extra: ticket),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: AppTheme.space16),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Ticket number box
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                        decoration: BoxDecoration(
                                          color: AppTheme.mintTint,
                                          borderRadius: BorderRadius.circular(AppTheme.radiusInput),
                                        ),
                                        child: Text(
                                          ticket.ticketNumber,
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                            color: AppTheme.forestGreen,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: AppTheme.space16),
                                      // Ticket details
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(ticket.serviceName, style: AppTheme.bodyMedium),
                                            const SizedBox(height: AppTheme.space4),
                                            Text(ticket.branchName, style: AppTheme.caption),
                                            const SizedBox(height: AppTheme.space8),
                                            Row(
                                              children: [
                                                if (isFirstInLine)
                                                  // One lime accent for next-in-line
                                                  Container(
                                                    margin: const EdgeInsets.only(right: 8),
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                    decoration: BoxDecoration(
                                                      color: AppTheme.limeAccent,
                                                      borderRadius: BorderRadius.circular(AppTheme.radiusBadge),
                                                    ),
                                                    child: Text(
                                                      ticket.status == 'CALLED' ? 'Called now' : 'Next in line',
                                                      style: const TextStyle(
                                                        fontSize: 13,
                                                        fontWeight: FontWeight.w600,
                                                        color: AppTheme.ink,
                                                      ),
                                                    ),
                                                  )
                                                else
                                                  Text(
                                                    'Position #${ticket.currentPosition}',
                                                    style: AppTheme.captionMedium,
                                                  ),
                                                Text(
                                                  ' • ~${ticket.estimatedWaitMinutes} min wait',
                                                  style: AppTheme.caption,
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      const Icon(Icons.arrow_forward, size: 16, color: AppTheme.softGrey),
                                    ],
                                  ),
                                ),
                              ),
                              if (!isLast) const Divider(),
                            ],
                          );
                        },
                        childCount: tickets.length,
                      ),
                    ),
                  );
                },
                loading: () => SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin),
                    child: Column(
                      children: List.generate(
                        3,
                        (index) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: AppTheme.space16),
                          child: Row(
                            children: [
                              Container(height: 38, width: 60, decoration: BoxDecoration(color: AppTheme.mintTint, borderRadius: BorderRadius.circular(8))),
                              const SizedBox(width: AppTheme.space16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(height: 16, width: 140, decoration: BoxDecoration(color: AppTheme.mintTint, borderRadius: BorderRadius.circular(4))),
                                    const SizedBox(height: 6),
                                    Container(height: 12, width: 90, decoration: BoxDecoration(color: AppTheme.mintTint.withOpacity(0.5), borderRadius: BorderRadius.circular(4))),
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
                error: (err, _) => SliverFillRemaining(
                  hasScrollBody: false,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Unable to load active tickets', style: AppTheme.titleMedium),
                        const SizedBox(height: AppTheme.space8),
                        const Text('Could not reach queue servers. Pull down to refresh.', style: AppTheme.caption),
                        const SizedBox(height: AppTheme.space16),
                        ElevatedButton(
                          onPressed: () => ref.refresh(activeTicketsProvider),
                          child: const Text('Try again'),
                        ),
                      ],
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
