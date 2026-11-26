import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/ticket_provider.dart';

class TicketHistoryScreen extends ConsumerWidget {
  const TicketHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(ticketHistoryProvider);

    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.ink),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.forestGreen,
          onRefresh: () async => ref.refresh(ticketHistoryProvider),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(AppTheme.margin, AppTheme.space8, AppTheme.margin, AppTheme.space16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Visit history', style: AppTheme.titleLarge),
                      SizedBox(height: AppTheme.space4),
                      Text('Past services completed or tickets cancelled.', style: AppTheme.caption),
                    ],
                  ),
                ),
              ),
              historyAsync.when(
                data: (tickets) {
                  if (tickets.isEmpty) {
                    return const SliverFillRemaining(
                      hasScrollBody: false,
                      child: Padding(
                        padding: EdgeInsets.symmetric(horizontal: AppTheme.margin),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('No past visits yet', style: AppTheme.titleMedium),
                            SizedBox(height: AppTheme.space8),
                            Text('Completed visits and cancelled tickets will appear here for your records.', style: AppTheme.body),
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
                          final t = tickets[idx];
                          final isLast = idx == tickets.length - 1;
                          final isCompleted = t.status == 'COMPLETED';

                          return Column(
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: AppTheme.space16),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: isCompleted ? AppTheme.mintTint : AppTheme.borderLight,
                                        borderRadius: BorderRadius.circular(AppTheme.radiusBadge),
                                      ),
                                      child: Text(
                                        t.ticketNumber,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: isCompleted ? AppTheme.forestGreen : AppTheme.softGrey,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: AppTheme.space16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(t.serviceName, style: AppTheme.bodyMedium),
                                          const SizedBox(height: AppTheme.space4),
                                          Text(
                                            '${t.branchName} • ${t.createdAt.split('T')[0]}',
                                            style: AppTheme.caption,
                                          ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      isCompleted ? 'Completed' : 'Cancelled',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: isCompleted ? AppTheme.forestGreen : AppTheme.softGrey,
                                      ),
                                    ),
                                  ],
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
                        4,
                        (index) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: AppTheme.space16),
                          child: Row(
                            children: [
                              Container(height: 30, width: 50, decoration: BoxDecoration(color: AppTheme.mintTint, borderRadius: BorderRadius.circular(6))),
                              const SizedBox(width: AppTheme.space16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(height: 14, width: 120, decoration: BoxDecoration(color: AppTheme.mintTint, borderRadius: BorderRadius.circular(4))),
                                    const SizedBox(height: 6),
                                    Container(height: 12, width: 80, decoration: BoxDecoration(color: AppTheme.mintTint.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(4))),
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
                        const Text('Unable to load history', style: AppTheme.titleMedium),
                        const SizedBox(height: AppTheme.space8),
                        const Text('Check your network connection and retry.', style: AppTheme.body),
                        const SizedBox(height: AppTheme.space16),
                        ElevatedButton(
                          onPressed: () => ref.refresh(ticketHistoryProvider),
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
