import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/discovery_provider.dart';
import '../models/branch_model.dart';

class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final branchesAsync = ref.watch(branchDiscoveryProvider(_searchQuery));

    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // Top Section with Left-Aligned Title and Search
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppTheme.margin,
                  AppTheme.space24,
                  AppTheme.margin,
                  AppTheme.space16,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Discover Facilities',
                                style: AppTheme.titleLarge,
                              ),
                              SizedBox(height: AppTheme.space8),
                              Text(
                                'Select a clinic or branch to check wait times and join in line.',
                                style: AppTheme.caption,
                              ),
                            ],
                          ),
                        ),
                        // Single Lime Accent (QR Scan Shortcut)
                        IconButton(
                          onPressed: () => context.push('/scan'),
                          icon: Container(
                            padding: const EdgeInsets.all(AppTheme.space8),
                            decoration: BoxDecoration(
                              color: AppTheme.limeAccent,
                              borderRadius: BorderRadius.circular(AppTheme.radiusInput),
                            ),
                            child: const Icon(Icons.qr_code_scanner, size: 20, color: AppTheme.ink),
                          ),
                          tooltip: 'Scan ticket',
                        ),
                      ],
                    ),
                    const SizedBox(height: AppTheme.space24),
                    // Search Input
                    TextField(
                      controller: _searchController,
                      onChanged: (val) => setState(() => _searchQuery = val.trim().toLowerCase()),
                      style: AppTheme.body,
                      decoration: InputDecoration(
                        hintText: 'Search by facility name or address',
                        prefixIcon: const Icon(Icons.search, size: 20, color: AppTheme.softGrey),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18, color: AppTheme.softGrey),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                },
                              )
                            : null,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Content Area: State-driven List
            branchesAsync.when(
              loading: () => SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space16),
                  child: Column(
                    children: List.generate(4, (index) => _buildSkeletonRow()),
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
                        const Text('Unable to reach server', style: AppTheme.bodyMedium),
                        const SizedBox(height: AppTheme.space8),
                        const Text(
                          'Check your internet connection and try reloading the directory.',
                          style: AppTheme.caption,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: AppTheme.space16),
                        ElevatedButton(
                          onPressed: () => ref.refresh(branchDiscoveryProvider(_searchQuery)),
                          child: const Text('Try again'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              data: (branches) {
                final filtered = branches.where((b) {
                  if (_searchQuery.isEmpty) return true;
                  return b.name.toLowerCase().contains(_searchQuery) ||
                      (b.address != null && b.address!.toLowerCase().contains(_searchQuery));
                }).toList();

                if (filtered.isEmpty) {
                  return SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(AppTheme.margin),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text('No centers match your search', style: AppTheme.bodyMedium),
                            const SizedBox(height: AppTheme.space8),
                            const Text(
                              'Try checking for spelling errors or searching by city name.',
                              style: AppTheme.caption,
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }

                // Clean list rows with dividers
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(AppTheme.margin, 0, AppTheme.margin, AppTheme.space32),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final branch = filtered[index];
                        return Column(
                          children: [
                            _buildBranchRow(context, branch),
                            if (index < filtered.length - 1)
                              const Divider(height: 1, color: AppTheme.borderLight),
                          ],
                        );
                      },
                      childCount: filtered.length,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBranchRow(BuildContext context, BranchModel branch) {
    return InkWell(
      onTap: () => context.push('/branch/${branch.id}', extra: branch),
      splashColor: AppTheme.mintTint.withOpacity(0.5),
      highlightColor: Colors.transparent,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppTheme.space16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(branch.name, style: AppTheme.bodyMedium),
                  const SizedBox(height: AppTheme.space4),
                  Text(
                    branch.address ?? 'Address not specified',
                    style: AppTheme.caption,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppTheme.space8),
                  if (branch.services.isNotEmpty) ...[
                    Text(
                      branch.services.map((s) => s.name).join(' • '),
                      style: AppTheme.captionMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: AppTheme.space4),
                  ],
                  Wrap(
                    spacing: AppTheme.space8,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: AppTheme.space8, vertical: 2.0),
                        decoration: BoxDecoration(
                          color: AppTheme.mintTint,
                          borderRadius: BorderRadius.circular(AppTheme.radiusBadge),
                        ),
                        child: Text(
                          '${branch.services.length} services',
                          style: const TextStyle(
                            fontSize: 12.0,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.forestGreen,
                          ),
                        ),
                      ),
                      if (branch.code.isNotEmpty)
                        Text('Branch ${branch.code}', style: AppTheme.caption),
                    ],
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(top: AppTheme.space8),
              child: Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.softGrey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSkeletonRow() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppTheme.space16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 16,
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppTheme.borderLight,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(height: AppTheme.space8),
          Container(
            height: 12,
            width: 200,
            decoration: BoxDecoration(
              color: AppTheme.borderLight.withOpacity(0.6),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(height: AppTheme.space16),
          const Divider(height: 1, color: AppTheme.borderLight),
        ],
      ),
    );
  }
}
