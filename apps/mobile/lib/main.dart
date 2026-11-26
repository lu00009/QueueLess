import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/network/api_client.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/auth/screens/register_screen.dart';
import 'features/onboarding/screens/onboarding_screen.dart';
import 'features/home/screens/home_navigation_screen.dart';
import 'features/discovery/screens/branch_detail_screen.dart';
import 'features/discovery/models/branch_model.dart';
import 'features/ticket/screens/join_queue_screen.dart';
import 'features/ticket/screens/digital_ticket_screen.dart';
import 'features/ticket/screens/ticket_history_screen.dart';
import 'features/ticket/models/ticket_model.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) async {
      final prefs = await SharedPreferences.getInstance();
      final onboardingDone = prefs.getBool('onboarding_completed') ?? false;

      if (!onboardingDone && state.matchedLocation != '/onboarding') {
        return '/onboarding';
      }

      if (authState.isLoading) return null;

      final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/register';

      if (!authState.isAuthenticated && !isAuthRoute && state.matchedLocation != '/onboarding') {
        return '/login';
      }

      if (authState.isAuthenticated && (isAuthRoute || state.matchedLocation == '/onboarding')) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const CustomerLoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const CustomerRegisterScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const HomeNavigationScreen(),
      ),
      GoRoute(
        path: '/branch/:id',
        builder: (context, state) {
          final branch = state.extra as BranchModel;
          return BranchDetailScreen(branch: branch);
        },
      ),
      GoRoute(
        path: '/join/:serviceId',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>;
          return JoinQueueScreen(
            service: extra['service'] as BranchServiceModel,
            branch: extra['branch'] as BranchModel,
          );
        },
      ),
      GoRoute(
        path: '/ticket/:id',
        builder: (context, state) {
          final ticketId = state.pathParameters['id']!;
          final ticket = state.extra as TicketModel?;
          return DigitalTicketScreen(ticketId: ticketId, initialTicket: ticket);
        },
      ),
      GoRoute(
        path: '/history',
        builder: (context, state) => const TicketHistoryScreen(),
      ),
    ],
  );
});

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  ApiClient.setBaseUrl('http://127.0.0.1:5000/api/v1');

  runApp(
    const ProviderScope(
      child: QueueLessCustomerApp(),
    ),
  );
}

class QueueLessCustomerApp extends ConsumerWidget {
  const QueueLessCustomerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'QueueLess Customer',
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          elevation: 0,
          backgroundColor: Color(0xFF4F46E5),
          foregroundColor: Colors.white,
          centerTitle: true,
        ),
      ),
    );
  }
}
