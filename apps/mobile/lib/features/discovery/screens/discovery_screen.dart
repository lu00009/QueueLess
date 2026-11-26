import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' hide Path;
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../home/screens/home_navigation_screen.dart';
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

  String _getTimeGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final branchesAsync = ref.watch(branchDiscoveryProvider(_searchQuery));
    final userName = authState.user?.fullName.split(' ').first ?? 'there';

    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // Top Section with Greeting and User Avatar
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
                    // Brand Badge
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.mintTint,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: AppTheme.forestGreen.withValues(alpha: 0.25),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppTheme.forestGreen,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 5),
                              const Text(
                                'QLess • QueueLess',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.forestGreen,
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppTheme.space12),

                    // Header greeting row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${_getTimeGreeting()}, $userName.',
                                style: const TextStyle(
                                  fontSize: 22.0,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.ink,
                                  letterSpacing: -0.4,
                                ),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                "Let's get you in line.",
                                style: AppTheme.caption,
                              ),
                            ],
                          ),
                        ),
                        // Avatar profile button
                        InkWell(
                          onTap: () => ref.read(homeNavigationIndexProvider.notifier).state = 3,
                          borderRadius: BorderRadius.circular(24),
                          child: Container(
                            height: 44,
                            width: 44,
                            decoration: BoxDecoration(
                              color: AppTheme.mintTint,
                              borderRadius: BorderRadius.circular(22),
                              border: Border.all(color: AppTheme.forestGreen.withValues(alpha: 0.2)),
                            ),
                            child: Center(
                              child: Text(
                                userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.forestGreen,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppTheme.space20),

                    // Search Input - Clean rounded style matching reference
                    Container(
                      decoration: BoxDecoration(
                        color: AppTheme.white,
                        borderRadius: BorderRadius.circular(AppTheme.radiusInput),
                        border: Border.all(color: AppTheme.borderLight),
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: (val) => setState(() => _searchQuery = val.trim().toLowerCase()),
                        style: AppTheme.body,
                        decoration: InputDecoration(
                          hintText: 'Search location or service',
                          hintStyle: const TextStyle(fontSize: 14, color: AppTheme.softGrey),
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
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppTheme.space20),

                    // Realistic Interactive Map Preview Card
                    const _RealisticMapPreviewCard(),
                    const SizedBox(height: AppTheme.space24),

                    // "QUEUES NEARBY" Section Header matching reference
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'QUEUES NEARBY',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.softGrey,
                            letterSpacing: 0.8,
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                          child: const Text(
                            'See all',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.forestGreen,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Directory / Queue Cards List matching Image 1
            branchesAsync.when(
              loading: () => SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin),
                  child: Column(
                    children: List.generate(3, (_) => _buildSkeletonCard()),
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
                        const Text('Unable to reach server', style: AppTheme.titleMedium),
                        const SizedBox(height: AppTheme.space8),
                        const Text('Check your network connection and retry.', style: AppTheme.caption),
                        const SizedBox(height: AppTheme.space16),
                        ElevatedButton(
                          onPressed: () => ref.refresh(branchDiscoveryProvider(_searchQuery)),
                          child: const Text('Retry'),
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
                  return const SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Padding(
                        padding: EdgeInsets.all(AppTheme.margin),
                        child: Text(
                          'No service queues match your search',
                          style: AppTheme.caption,
                        ),
                      ),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(AppTheme.margin, 0, AppTheme.margin, AppTheme.space32),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final branch = filtered[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: AppTheme.space16),
                          child: _buildQueueFacilityCard(context, branch, index),
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

  Widget _buildQueueFacilityCard(BuildContext context, BranchModel branch, int index) {
    // Generate realistic distance and queue load for Ethiopian facilities
    final distance = (1.5 + (index * 1.2)).toStringAsFixed(1);
    final inQueueCount = branch.services.length * 14 + (index * 7);
    final primaryService = branch.services.isNotEmpty ? branch.services.first.name : 'General Inquiries';

    return InkWell(
      onTap: () => context.push('/branch/${branch.id}', extra: branch),
      borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
      child: Container(
        padding: const EdgeInsets.all(AppTheme.space16),
        decoration: BoxDecoration(
          color: AppTheme.white,
          borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
          border: Border.all(color: AppTheme.borderLight),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Left Content: Distance, Branch Name, Primary Service, Action Link
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Distance chip
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 12, color: AppTheme.forestGreen),
                      const SizedBox(width: 3),
                      Text(
                        '${distance}km away',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.forestGreen,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    branch.name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.ink,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    primaryService,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.softGrey,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 10),
                  const Row(
                    children: [
                      Text(
                        'Full queue details',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.forestGreen,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward_ios, size: 9, color: AppTheme.forestGreen),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(width: 12),

            // Right side: High-contrast Queue Counter Badge matching Image 1
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.mintTint,
                borderRadius: BorderRadius.circular(AppTheme.radiusInput),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '$inQueueCount',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.forestGreen,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const Text(
                    'in queue',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.softGrey,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSkeletonCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: AppTheme.space16),
      padding: const EdgeInsets.all(AppTheme.space16),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(height: 12, width: 80, color: AppTheme.mintTint),
                const SizedBox(height: 8),
                Container(height: 16, width: 180, color: AppTheme.mintTint),
                const SizedBox(height: 6),
                Container(height: 12, width: 120, color: AppTheme.mintTint),
              ],
            ),
          ),
          Container(height: 50, width: 60, color: AppTheme.mintTint),
        ],
      ),
    );
  }
}

class _RealisticMapPreviewCard extends StatefulWidget {
  const _RealisticMapPreviewCard();

  @override
  State<_RealisticMapPreviewCard> createState() => _RealisticMapPreviewCardState();
}

class _RealisticMapPreviewCardState extends State<_RealisticMapPreviewCard> {
  final MapController _mapController = MapController();

  void _zoomIn() {
    final currentZoom = _mapController.camera.zoom;
    _mapController.move(_mapController.camera.center, (currentZoom + 0.8).clamp(10.0, 18.0));
  }

  void _zoomOut() {
    final currentZoom = _mapController.camera.zoom;
    _mapController.move(_mapController.camera.center, (currentZoom - 0.8).clamp(10.0, 18.0));
  }

  void _openFullMapOverview(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Container(
            height: MediaQuery.of(context).size.height * 0.82,
            decoration: const BoxDecoration(
              color: AppTheme.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusSheet)),
            ),
            child: Column(
              children: [
                Container(
                  height: 4,
                  width: 36,
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.borderLight,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Facility Locations & Wait Times', style: AppTheme.titleMedium),
                          Text('Addis Ababa Central Metropolitan Area (OpenStreetMap)', style: AppTheme.caption),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: AppTheme.softGrey),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: AppTheme.borderLight),
                Expanded(
                  child: Stack(
                    children: [
                      FlutterMap(
                        options: const MapOptions(
                          initialCenter: LatLng(9.0142, 38.7580),
                          initialZoom: 13.8,
                          minZoom: 10.0,
                          maxZoom: 18.0,
                          interactionOptions: InteractionOptions(
                            flags: InteractiveFlag.all,
                          ),
                        ),
                        children: [
                          TileLayer(
                            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            userAgentPackageName: 'com.queueless.mobile',
                            maxZoom: 19,
                          ),
                          MarkerLayer(
                            markers: [
                              Marker(
                                point: const LatLng(8.9985, 38.7865),
                                width: 140,
                                height: 44,
                                alignment: Alignment.topCenter,
                                child: const _TeardropMapPin(
                                  name: 'CBE Bole',
                                  inQueue: 42,
                                  icon: Icons.account_balance,
                                ),
                              ),
                              Marker(
                                point: const LatLng(9.0180, 38.7525),
                                width: 140,
                                height: 44,
                                alignment: Alignment.topCenter,
                                child: const _TeardropMapPin(
                                  name: 'CBE Finfine',
                                  inQueue: 63,
                                  icon: Icons.account_balance,
                                ),
                              ),
                              Marker(
                                point: const LatLng(9.0142, 38.7495),
                                width: 145,
                                height: 44,
                                alignment: Alignment.topCenter,
                                child: const _TeardropMapPin(
                                  name: 'Tikur Anbessa',
                                  inQueue: 91,
                                  icon: Icons.local_hospital,
                                ),
                              ),
                              Marker(
                                point: const LatLng(9.0320, 38.7610),
                                width: 140,
                                height: 44,
                                alignment: Alignment.topCenter,
                                child: const _TeardropMapPin(
                                  name: 'ICS Passport',
                                  inQueue: 77,
                                  icon: Icons.badge,
                                ),
                              ),
                              Marker(
                                point: const LatLng(9.0115, 38.7600),
                                width: 24,
                                height: 24,
                                alignment: Alignment.center,
                                child: const _UserGpsBeacon(),
                              ),
                            ],
                          ),
                        ],
                      ),
                      // Floating legend & help chip
                      Positioned(
                        top: 12,
                        left: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.white,
                            borderRadius: BorderRadius.circular(AppTheme.radiusInput),
                            border: Border.all(color: AppTheme.borderLight),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.08),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.layers_outlined, size: 14, color: AppTheme.forestGreen),
                              SizedBox(width: 5),
                              Text(
                                'Tap pin to inspect queue',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.ink),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 175,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F2),
        borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
        border: Border.all(color: AppTheme.borderLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
        child: Stack(
          children: [
            // Interactive Leaflet / OpenStreetMap Real Map
            Positioned.fill(
              child: FlutterMap(
                mapController: _mapController,
                options: const MapOptions(
                  initialCenter: LatLng(9.0142, 38.7580),
                  initialZoom: 13.5,
                  minZoom: 10.0,
                  maxZoom: 18.0,
                  interactionOptions: InteractionOptions(
                    flags: InteractiveFlag.drag | InteractiveFlag.pinchZoom | InteractiveFlag.scrollWheelZoom,
                  ),
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.queueless.mobile',
                    maxZoom: 19,
                  ),
                  MarkerLayer(
                    markers: [
                      // CBE Bole Medhanialem
                      Marker(
                        point: const LatLng(8.9985, 38.7865),
                        width: 135,
                        height: 44,
                        alignment: Alignment.topCenter,
                        child: const _TeardropMapPin(
                          name: 'CBE Bole',
                          inQueue: 42,
                          icon: Icons.account_balance,
                        ),
                      ),
                      // CBE Finfine Main
                      Marker(
                        point: const LatLng(9.0180, 38.7525),
                        width: 140,
                        height: 44,
                        alignment: Alignment.topCenter,
                        child: const _TeardropMapPin(
                          name: 'CBE Finfine',
                          inQueue: 63,
                          icon: Icons.account_balance,
                        ),
                      ),
                      // Tikur Anbessa Hospital
                      Marker(
                        point: const LatLng(9.0142, 38.7495),
                        width: 145,
                        height: 44,
                        alignment: Alignment.topCenter,
                        child: const _TeardropMapPin(
                          name: 'Tikur Anbessa',
                          inQueue: 91,
                          icon: Icons.local_hospital,
                        ),
                      ),
                      // ICS Passport
                      Marker(
                        point: const LatLng(9.0320, 38.7610),
                        width: 140,
                        height: 44,
                        alignment: Alignment.topCenter,
                        child: const _TeardropMapPin(
                          name: 'ICS Passport',
                          inQueue: 77,
                          icon: Icons.badge,
                        ),
                      ),
                      // User GPS Beacon
                      Marker(
                        point: const LatLng(9.0115, 38.7600),
                        width: 24,
                        height: 24,
                        alignment: Alignment.center,
                        child: const _UserGpsBeacon(),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Top Right Floating "Map overview" Button
            Positioned(
              top: 12,
              right: 12,
              child: InkWell(
                onTap: () => _openFullMapOverview(context),
                borderRadius: BorderRadius.circular(AppTheme.radiusInput),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.white,
                    borderRadius: BorderRadius.circular(AppTheme.radiusInput),
                    border: Border.all(color: AppTheme.borderLight),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.map_outlined, size: 14, color: AppTheme.forestGreen),
                      SizedBox(width: 5),
                      Text(
                        'Map overview',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.ink,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.open_in_full, size: 10, color: AppTheme.softGrey),
                    ],
                  ),
                ),
              ),
            ),

            // Bottom Right Zoom Controls (+ / -)
            Positioned(
              bottom: 12,
              right: 12,
              child: Container(
                decoration: BoxDecoration(
                  color: AppTheme.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.borderLight),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    InkWell(
                      onTap: _zoomIn,
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 7, vertical: 5),
                        child: Icon(Icons.add, size: 14, color: AppTheme.ink),
                      ),
                    ),
                    const Divider(height: 1, color: AppTheme.borderLight),
                    InkWell(
                      onTap: _zoomOut,
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 7, vertical: 5),
                        child: Icon(Icons.remove, size: 14, color: AppTheme.ink),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom Left Scale indicator
            Positioned(
              bottom: 10,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.white.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: AppTheme.borderLight.withValues(alpha: 0.6)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.near_me, size: 9, color: AppTheme.forestGreen),
                    SizedBox(width: 4),
                    Text(
                      'Addis Ababa • OSM Live',
                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: AppTheme.softGrey),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UserGpsBeacon extends StatelessWidget {
  const _UserGpsBeacon();

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        // Outer pulsing ring
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: const Color(0xFF3B82F6).withValues(alpha: 0.25),
            shape: BoxShape.circle,
          ),
        ),
        // White border ring
        Container(
          width: 12,
          height: 12,
          decoration: const BoxDecoration(
            color: AppTheme.white,
            shape: BoxShape.circle,
          ),
        ),
        // Blue center dot
        Container(
          width: 8,
          height: 8,
          decoration: const BoxDecoration(
            color: Color(0xFF2563EB),
            shape: BoxShape.circle,
          ),
        ),
      ],
    );
  }
}

class _TeardropMapPin extends StatelessWidget {
  final String name;
  final int inQueue;
  final IconData icon;

  const _TeardropMapPin({
    required this.name,
    required this.inQueue,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Pin speech bubble card with drop shadow
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
          decoration: BoxDecoration(
            color: AppTheme.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppTheme.borderLight),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 6,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 11, color: AppTheme.forestGreen),
              const SizedBox(width: 4),
              Text(
                name,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.ink,
                ),
              ),
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: AppTheme.mintTint,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '$inQueue ▾',
                  style: const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.forestGreen,
                  ),
                ),
              ),
            ],
          ),
        ),
        // Downward carrot pointer
        CustomPaint(
          size: const Size(8, 5),
          painter: _TrianglePointerPainter(),
        ),
      ],
    );
  }
}

class _TrianglePointerPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppTheme.white
      ..style = PaintingStyle.fill;

    final borderPaint = Paint()
      ..color = AppTheme.borderLight
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();

    canvas.drawPath(path, paint);
    canvas.drawPath(path, borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

