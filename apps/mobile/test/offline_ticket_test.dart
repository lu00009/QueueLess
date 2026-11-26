import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/features/ticket/models/ticket_model.dart';
import 'package:mobile/features/ticket/services/local_ticket_storage.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('LocalTicketStorage caches and retrieves active tickets offline', () async {
    final ticket1 = TicketModel(
      id: 'ticket-offline-01',
      ticketNumber: 'GE-101',
      sequenceNumber: 101,
      status: 'WAITING',
      customerName: 'Offline Test User',
      verificationCode: 'A1B2C3',
      currentPosition: 2,
      estimatedWaitMinutes: 20,
      serviceId: 'srv-gen',
      serviceName: 'General Consultation',
      branchId: 'br-01',
      branchName: 'Main Campus',
      organizationName: 'Metro Health',
      createdAt: '2026-11-26T10:00:00Z',
    );

    // 1. Cache ticket
    await LocalTicketStorage.cacheActiveTickets([ticket1]);

    // 2. Retrieve ticket from offline storage
    final retrieved = await LocalTicketStorage.getCachedActiveTickets();
    expect(retrieved.length, 1);
    expect(retrieved.first.id, 'ticket-offline-01');
    expect(retrieved.first.ticketNumber, 'GE-101');
    expect(retrieved.first.currentPosition, 2);
    expect(retrieved.first.verificationCode, 'A1B2C3');
  });

  test('LocalTicketStorage retrieves specific ticket by ID offline', () async {
    final ticket = TicketModel(
      id: 'ticket-offline-single',
      ticketNumber: 'UR-005',
      sequenceNumber: 5,
      status: 'CALLED',
      customerName: 'Emergency User',
      verificationCode: '998877',
      currentPosition: 0,
      estimatedWaitMinutes: 0,
      serviceId: 'srv-urg',
      serviceName: 'Urgent Care',
      branchId: 'br-01',
      branchName: 'Main Campus',
      organizationName: 'Metro Health',
      counterNumber: '03',
      counterName: 'Express Desk',
      createdAt: '2026-11-26T10:00:00Z',
    );

    await LocalTicketStorage.cacheTicket(ticket);

    final retrieved = await LocalTicketStorage.getCachedTicketById('ticket-offline-single');
    expect(retrieved, isNotNull);
    expect(retrieved!.ticketNumber, 'UR-005');
    expect(retrieved.status, 'CALLED');
    expect(retrieved.counterNumber, '03');
  });
}
