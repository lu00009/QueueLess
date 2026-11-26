import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../models/ticket_model.dart';
import '../services/local_ticket_storage.dart';

final activeTicketsProvider = FutureProvider.autoDispose<List<TicketModel>>((ref) async {
  try {
    final response = await ApiClient.dio.get('/tickets/active');
    final list = response.data['data'] as List<dynamic>;
    final tickets = list.map((item) => TicketModel.fromJson(item as Map<String, dynamic>)).toList();
    // Cache tickets locally for offline availability
    await LocalTicketStorage.cacheActiveTickets(tickets);
    return tickets;
  } catch (e) {
    // Return cached offline tickets if network request fails
    final cached = await LocalTicketStorage.getCachedActiveTickets();
    if (cached.isNotEmpty) {
      return cached;
    }
    rethrow;
  }
});

final ticketHistoryProvider = FutureProvider.autoDispose<List<TicketModel>>((ref) async {
  final response = await ApiClient.dio.get('/tickets/history');
  final list = response.data['data'] as List<dynamic>;
  return list.map((item) => TicketModel.fromJson(item as Map<String, dynamic>)).toList();
});

final ticketDetailProvider = FutureProvider.family.autoDispose<TicketModel, String>((ref, ticketId) async {
  try {
    final response = await ApiClient.dio.get('/tickets/$ticketId');
    final ticket = TicketModel.fromJson(response.data['data'] as Map<String, dynamic>);
    await LocalTicketStorage.cacheTicket(ticket);
    return ticket;
  } catch (e) {
    // If offline, check local storage
    final cached = await LocalTicketStorage.getCachedTicketById(ticketId);
    if (cached != null) {
      return cached;
    }
    rethrow;
  }
});

class TicketActionNotifier extends StateNotifier<AsyncValue<TicketModel?>> {
  TicketActionNotifier() : super(const AsyncValue.data(null));

  Future<TicketModel?> joinQueue({
    required String serviceId,
    String? customerName,
    String? customerPhone,
  }) async {
    state = const AsyncValue.loading();
    try {
      final response = await ApiClient.dio.post('/tickets/join', data: {
        'serviceId': serviceId,
        'customerName': customerName,
        'customerPhone': customerPhone,
      });
      final ticket = TicketModel.fromJson(response.data['data'] as Map<String, dynamic>);
      state = AsyncValue.data(ticket);
      return ticket;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }

  Future<bool> cancelTicket(String ticketId, {String? reason}) async {
    try {
      await ApiClient.dio.post('/tickets/$ticketId/cancel', data: {'reason': reason});
      return true;
    } catch (e) {
      rethrow;
    }
  }
}

final ticketActionProvider = StateNotifierProvider<TicketActionNotifier, AsyncValue<TicketModel?>>((ref) {
  return TicketActionNotifier();
});
