import 'package:dio/dio.dart';

class ApiClient {
  static final Dio dio = Dio(
    BaseOptions(
      baseUrl: 'http://10.0.2.2:5000/api/v1', // Android emulator default loopback; can be overridden
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 5),
      headers: {
        'Content-Type': 'application/json',
      },
    ),
  );

  static void setBaseUrl(String url) {
    dio.options.baseUrl = url;
  }
}
