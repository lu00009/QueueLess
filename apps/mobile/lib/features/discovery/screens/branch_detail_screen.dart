import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../models/branch_model.dart';

class BranchDetailScreen extends StatelessWidget {
  final BranchModel branch;

  const BranchDetailScreen({super.key, required this.branch});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      appBar: AppBar(
        title: const Text('Facility details'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Large Left-Aligned Facility Name
              Text(branch.name, style: AppTheme.titleLarge),
              const SizedBox(height: AppTheme.space8),
              Text(branch.address ?? 'Address not specified', style: AppTheme.caption),
              if (branch.phone != null) ...[
                const SizedBox(height: AppTheme.space4),
                Text('Phone: ${branch.phone}', style: AppTheme.caption),
              ],

              const SizedBox(height: AppTheme.space32),

              // Highlight Section: Hours of Operation
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppTheme.space16),
                decoration: BoxDecoration(
                  color: AppTheme.mintTint,
                  borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Operating hours', style: AppTheme.bodyMedium),
                    const SizedBox(height: AppTheme.space8),
                    if (branch.operatingHours.isNotEmpty)
                      ...branch.operatingHours.take(3).map((h) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 2.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(_formatDay(h.dayOfWeek), style: AppTheme.caption),
                                Text(
                                  h.isClosed ? 'Closed' : '${h.openTime} – ${h.closeTime}',
                                  style: AppTheme.captionMedium,
                                ),
                              ],
                            ),
                          ))
                    else
                      const Text('Monday to Friday • 08:00 – 17:00', style: AppTheme.caption),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.space32),

              const Text('Available services', style: AppTheme.titleMedium),
              const SizedBox(height: AppTheme.space8),
              const Text('Select a department below to view wait times and enter the queue.', style: AppTheme.caption),
              const SizedBox(height: AppTheme.space16),

              if (branch.services.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppTheme.space24),
                  child: Text('No active services currently listed for this branch.', style: AppTheme.caption),
                )
              else
                ...branch.services.asMap().entries.map((entry) {
                  final index = entry.key;
                  final service = entry.value;
                  return Column(
                    children: [
                      _buildServiceRow(context, service),
                      if (index < branch.services.length - 1)
                        const Divider(height: 1, color: AppTheme.borderLight),
                    ],
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildServiceRow(BuildContext context, BranchServiceModel service) {
    return InkWell(
      onTap: () {
        context.push('/join/${service.id}', extra: {
          'service': service,
          'branch': branch,
        });
      },
      splashColor: AppTheme.mintTint.withOpacity(0.5),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppTheme.space16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(service.name, style: AppTheme.bodyMedium),
                  const SizedBox(height: AppTheme.space4),
                  Text(
                    'Average visit: ${service.estimatedDurationMinutes} minutes',
                    style: AppTheme.caption,
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.softGrey),
          ],
        ),
      ),
    );
  }

  String _formatDay(int day) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (day >= 0 && day < days.length) return days[day];
    return 'Day $day';
  }
}
