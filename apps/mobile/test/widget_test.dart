import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('QueueLessCustomerApp smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          healthCheckProvider.overrideWith((ref) async => {
            'status': 'ok',
            'database': 'connected',
            'version': '1.0.0',
            'environment': 'test',
          }),
        ],
        child: const QueueLessCustomerApp(),
      ),
    );

    // Initial pump
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // Verify header and hero text exist
    expect(find.text('QueueLess'), findsWidgets);
    expect(find.text('Welcome to QueueLess'), findsOneWidget);
  });
}
