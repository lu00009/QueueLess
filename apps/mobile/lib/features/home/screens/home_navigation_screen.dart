import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../discovery/screens/discovery_screen.dart';
import '../../ticket/screens/active_tickets_screen.dart';
import '../../ticket/screens/ticket_history_screen.dart';
import '../../profile/screens/profile_screen.dart';

final homeNavigationIndexProvider = StateProvider<int>((ref) => 0);

class HomeNavigationScreen extends ConsumerWidget {
  const HomeNavigationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = ref.watch(homeNavigationIndexProvider);

    final List<Widget> screens = const [
      DiscoveryScreen(),
      ActiveTicketsScreen(),
      TicketHistoryScreen(),
      CustomerProfileScreen(),
    ];

    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      body: IndexedStack(
        index: currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppTheme.white,
          border: Border(
            top: BorderSide(color: AppTheme.borderLight, width: 1.0),
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(ref, 0, Icons.explore_outlined, Icons.explore, 'Explore', currentIndex),
                _buildNavItem(ref, 1, Icons.confirmation_number_outlined, Icons.confirmation_number, 'My queue', currentIndex),
                _buildNavItem(ref, 2, Icons.history_outlined, Icons.history, 'History', currentIndex),
                _buildNavItem(ref, 3, Icons.person_outline, Icons.person, 'Profile', currentIndex),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(
    WidgetRef ref,
    int index,
    IconData unselectedIcon,
    IconData selectedIcon,
    String label,
    int currentIndex,
  ) {
    final isSelected = currentIndex == index;
    final color = isSelected ? AppTheme.forestGreen : AppTheme.softGrey;

    return InkWell(
      onTap: () => ref.read(homeNavigationIndexProvider.notifier).state = index,
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSelected ? selectedIcon : unselectedIcon,
              size: 22.0,
              color: color,
            ),
            const SizedBox(height: 4.0),
            Text(
              label,
              style: TextStyle(
                fontSize: 12.0,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
