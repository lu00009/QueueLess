import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/ticket_model.dart';

class LocalTicketStorage {
  static const String _activeTicketsKey = 'queueless_cached_active_tickets';
  static const String _ticketHistoryKey = 'queueless_cached_ticket_history';

  /// Save active tickets locally for offline access
  static Future<void> cacheActiveTickets(List<TicketModel> tickets) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = tickets.map((t) => t.toJson()).toList();
    await prefs.setString(_activeTicketsKey, jsonEncode(jsonList));
  }

  /// Retrieve cached active tickets when offline
  static Future<List<TicketModel>> getCachedActiveTickets() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString(_activeTicketsKey);
    if (cached == null || cached.isEmpty) return [];

    try {
      final list = jsonDecode(cached) as List<dynamic>;
      return list
          .map((item) => TicketModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Cache single ticket
  static Future<void> cacheTicket(TicketModel ticket) async {
    final tickets = await getCachedActiveTickets();
    final index = tickets.indexWhere((t) => t.id == ticket.id);
    if (index >= 0) {
      tickets[index] = ticket;
    } else {
      tickets.add(ticket);
    }
    await cacheActiveTickets(tickets);
  }

  /// Retrieve specific cached ticket offline
  static Future<TicketModel?> getCachedTicketById(String ticketId) async {
    final tickets = await getCachedActiveTickets();
    try {
      return tickets.firstWhere((t) => t.id == ticketId);
    } catch (_) {
      return null;
    }
  }

  /// Clear cache on logout
  static Future<void> clearCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_activeTicketsKey);
    await prefs.remove(_ticketHistoryKey);
  }
}
