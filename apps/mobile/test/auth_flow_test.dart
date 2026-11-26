import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/main.dart';
import 'package:mobile/features/auth/providers/auth_provider.dart';
import 'package:mobile/features/auth/models/auth_state.dart';
import 'package:mobile/features/discovery/providers/discovery_provider.dart';
import 'package:mobile/features/ticket/providers/ticket_provider.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({'onboarding_completed': true});
  });

  testWidgets('Customer sees Login Screen when unauthenticated', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authStateProvider.overrideWith((ref) => AuthNotifierFake(
            AuthState(isLoading: false, user: null, accessToken: null),
          )),
        ],
        child: const QueueLessCustomerApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('QueueLess'), findsWidgets);
    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('Fill Demo Customer'), findsOneWidget);
  });

  testWidgets('Customer sees Explore & Discovery when authenticated', (WidgetTester tester) async {
    final fakeUser = UserModel(
      id: 'cust-123',
      email: 'customer@example.com',
      fullName: 'Alice Walker',
      role: 'CUSTOMER',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authStateProvider.overrideWith((ref) => AuthNotifierFake(
            AuthState(isLoading: false, user: fakeUser, accessToken: 'dummy_token'),
          )),
          branchDiscoveryProvider('').overrideWith((ref) => Future.value([])),
          activeTicketsProvider.overrideWith((ref) => Future.value([])),
        ],
        child: const QueueLessCustomerApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Discover Facilities'), findsOneWidget);
    expect(find.text('Explore'), findsOneWidget);
    expect(find.text('My Tickets'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
  });
}

class AuthNotifierFake extends StateNotifier<AuthState> implements AuthNotifier {
  AuthNotifierFake(super.state);

  @override
  Future<bool> login(String email, String password) async => true;

  @override
  Future<bool> register({required String fullName, required String email, required String password, String? phone}) async => true;

  @override
  Future<void> logout() async {
    state = AuthState(isLoading: false, user: null, accessToken: null, refreshToken: null);
  }
}
