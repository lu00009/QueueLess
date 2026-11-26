import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';

class QrTicketScannerScreen extends StatefulWidget {
  const QrTicketScannerScreen({super.key});

  @override
  State<QrTicketScannerScreen> createState() => _QrTicketScannerScreenState();
}

class _QrTicketScannerScreenState extends State<QrTicketScannerScreen> {
  final TextEditingController _manualCodeController = TextEditingController();
  bool _isProcessing = false;
  String? _error;

  @override
  void dispose() {
    _manualCodeController.dispose();
    super.dispose();
  }

  Future<void> _verifyTicketPayload(String rawPayload) async {
    setState(() {
      _isProcessing = true;
      _error = null;
    });

    try {
      String ticketId = rawPayload.trim();
      // If QR encodes JSON: {"ticketId": "...", "verificationCode": "..."}
      if (rawPayload.startsWith('{')) {
        final parsed = jsonDecode(rawPayload);
        ticketId = parsed['ticketId'] ?? '';
      }

      final response = await ApiClient.dio.get('/tickets/$ticketId');
      if (mounted) {
        context.push('/ticket/$ticketId');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Ticket could not be verified. Invalid QR or Ticket ID.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Scan Queue Ticket'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Scanner Viewport Mock / Camera Integration target
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF020617),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Target Viewport Frame
                      Container(
                        width: 220,
                        height: 220,
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFF38BDF8), width: 3),
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.qr_code_scanner, size: 64, color: Color(0xFF38BDF8)),
                          const SizedBox(height: 16),
                          Text(
                            _isProcessing ? 'Verifying Ticket...' : 'Align QR Code Within Frame',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Hold your device steady',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFBE123C).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFBE123C).withOpacity(0.3)),
                  ),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Color(0xFFFDA4AF), fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],

              const SizedBox(height: 24),

              // Manual Code Entry Fallback
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Having Trouble Scanning?',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _manualCodeController,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Enter Ticket ID or Verification Code',
                        hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                        filled: true,
                        fillColor: const Color(0xFF0F172A),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: _isProcessing
                          ? null
                          : () {
                              final text = _manualCodeController.text.trim();
                              if (text.isNotEmpty) {
                                _verifyTicketPayload(text);
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0284C7),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('Verify Ticket Manually', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
