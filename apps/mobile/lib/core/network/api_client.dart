import 'package:dio/dio.dart';

const String defaultBackendUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://queueless-swh4.onrender.com/api/v1',
);

class ApiClient {
  static final Dio dio = Dio(
    BaseOptions(
      baseUrl: defaultBackendUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
      },
    ),
  );

  static void setBaseUrl(String url) {
    dio.options.baseUrl = url;
  }
}
