import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/onboarding/screens/onboarding_screen.dart';
import 'package:mobile/features/ticket/models/ticket_model.dart';
import 'package:mobile/features/ticket/screens/digital_ticket_screen.dart';
import 'package:mobile/features/ticket/screens/active_tickets_screen.dart';
import 'package:mobile/features/ticket/providers/ticket_provider.dart';
import 'package:mobile/features/discovery/screens/discovery_screen.dart';
import 'package:mobile/features/discovery/providers/discovery_provider.dart';
import 'package:mobile/features/discovery/models/branch_model.dart';

void main() {
  testWidgets('Onboarding Screen renders all slides and buttons', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: OnboardingScreen(),
      ),
    );

    expect(find.text('Never Wait in Line Again'), findsOneWidget);
    expect(find.text('Skip'), findsOneWidget);
    expect(find.text('Next'), findsOneWidget);

    // Tap next to advance slide
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();

    expect(find.text('Track Queue in Real Time'), findsOneWidget);
  });

  testWidgets('Digital Ticket Screen displays ticket number, live position and verification code', (WidgetTester tester) async {
    final sampleTicket = TicketModel(
      id: 'tick-001',
      ticketNumber: 'GE-101',
      sequenceNumber: 101,
      status: 'WAITING',
      customerName: 'John Doe',
      verificationCode: 'A3F9B2',
      currentPosition: 1,
      estimatedWaitMinutes: 15,
      serviceId: 'serv-1',
      serviceName: 'General Consultation',
      branchId: 'branch-1',
      branchName: 'Metro Health Main Campus',
      organizationName: 'Metro Health Clinic',
      createdAt: DateTime.now().toIso8601String(),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          ticketDetailProvider('tick-001').overrideWith((ref) => Future.value(sampleTicket)),
        ],
        child: MaterialApp(
          home: DigitalTicketScreen(
            ticketId: 'tick-001',
            initialTicket: sampleTicket,
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('GE-101'), findsOneWidget);
    expect(find.text('General Consultation'), findsOneWidget);
    expect(find.text('#1'), findsOneWidget);
    expect(find.text('~15m'), findsOneWidget);
    expect(find.text('PASS CODE: A3F9B2'), findsOneWidget);
    expect(find.text('Cancel This Ticket'), findsOneWidget);
  });

  testWidgets('Discovery Screen displays facilities and search input', (WidgetTester tester) async {
    final fakeBranches = [
      BranchModel(
        id: 'b-1',
        organizationId: 'org-1',
        name: 'Metro Health Main Campus',
        code: 'MAIN',
        address: '100 Medical Center Way',
        organizationName: 'Metro Health Clinic',
        operatingHours: [],
        services: [
          BranchServiceModel(id: 's-1', name: 'General Consultation', code: 'GEN', estimatedDurationMinutes: 15),
        ],
      ),
    ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          branchDiscoveryProvider('').overrideWith((ref) => Future.value(fakeBranches)),
        ],
        child: const MaterialApp(
          home: DiscoveryScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Discover Facilities'), findsOneWidget);
    expect(find.text('Metro Health Main Campus'), findsOneWidget);
    expect(find.text('General Consultation'), findsOneWidget);
  });

  testWidgets('Active Tickets Screen shows empty state when no tickets active', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          activeTicketsProvider.overrideWith((ref) => Future.value([])),
        ],
        child: const MaterialApp(
          home: ActiveTicketsScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('No Active Queue Tickets'), findsOneWidget);
  });
}
