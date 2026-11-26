import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';

void main() {
  test('Flutter Dio Client communicates with live Backend API', () async {
    final dio = Dio(BaseOptions(
      baseUrl: 'http://127.0.0.1:5000/api/v1',
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 5),
    ));

    final response = await dio.get('/health');
    expect(response.statusCode, 200);
    expect(response.data['status'], 'ok');
    expect(response.data['database'], 'connected');
    expect(response.data['version'], '1.0.0');
    print('Flutter live backend test response: ${response.data}');
  });
}
