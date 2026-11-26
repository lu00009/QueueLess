import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

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
      if (rawPayload.startsWith('{')) {
        final parsed = jsonDecode(rawPayload);
        ticketId = parsed['ticketId'] ?? '';
      }

      await ApiClient.dio.get('/tickets/$ticketId');
      if (mounted) {
        context.push('/ticket/$ticketId');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Ticket could not be verified. Check the ID and try again.';
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
      backgroundColor: AppTheme.offWhite,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.ink),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.margin, vertical: AppTheme.space16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Scan ticket', style: AppTheme.titleLarge),
              const SizedBox(height: AppTheme.space4),
              const Text(
                'Point camera at a ticket QR code or enter ticket ID below.',
                style: AppTheme.caption,
              ),
              const SizedBox(height: AppTheme.space24),

              // Scanner Viewport Mock (16px corner radius, mint tint)
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppTheme.mintTint,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
                  ),
                  child: Center(
                    child: Container(
                      width: 200,
                      height: 200,
                      decoration: BoxDecoration(
                        color: AppTheme.offWhite,
                        borderRadius: BorderRadius.circular(AppTheme.radiusSheet),
                        border: Border.all(color: AppTheme.forestGreen, width: 2),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.qr_code_scanner, size: 56, color: AppTheme.forestGreen),
                          const SizedBox(height: AppTheme.space16),
                          Text(
                            _isProcessing ? 'Verifying...' : 'Align code inside box',
                            style: AppTheme.captionMedium,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: AppTheme.space24),

              if (_error != null) ...[
                Text(_error!, style: const TextStyle(fontSize: 13, color: AppTheme.softGrey)),
                const SizedBox(height: AppTheme.space16),
              ],

              // Manual code input
              TextFormField(
                controller: _manualCodeController,
                style: AppTheme.body,
                decoration: const InputDecoration(
                  labelText: 'Ticket ID or verification code',
                  hintText: 'e.g. 78241',
                ),
              ),

              const SizedBox(height: AppTheme.space16),

              // One main action
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isProcessing
                      ? null
                      : () {
                          if (_manualCodeController.text.trim().isNotEmpty) {
                            _verifyTicketPayload(_manualCodeController.text);
                          }
                        },
                  child: Text(_isProcessing ? 'Verifying...' : 'Verify ticket'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
