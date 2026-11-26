import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../models/auth_state.dart';

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(AuthState(isLoading: true)) {
    _loadPersistedSession();
  }

  Future<void> _loadPersistedSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      final refreshToken = prefs.getString('refresh_token');

      if (token == null) {
        state = AuthState(isLoading: false);
        return;
      }

      ApiClient.dio.options.headers['Authorization'] = 'Bearer $token';

      final response = await ApiClient.dio.get('/auth/me');
      if (response.statusCode == 200) {
        final userData = response.data['data']['user'];
        state = AuthState(
          user: UserModel.fromJson(userData),
          accessToken: token,
          refreshToken: refreshToken,
          isLoading: false,
        );
      } else {
        await logout();
      }
    } catch (e) {
      if (e is DioException && (e.response?.statusCode == 401 || e.response?.statusCode == 403)) {
        await logout();
        return;
      }
      // Offline fallback: if token exists, keep session for offline ticket view
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      final email = prefs.getString('user_email');
      final name = prefs.getString('user_name');
      final id = prefs.getString('user_id');

      if (token != null && email != null && id != null) {
        state = AuthState(
          user: UserModel(id: id, email: email, fullName: name ?? 'Customer', role: 'CUSTOMER'),
          accessToken: token,
          isLoading: false,
        );
      } else {
        state = AuthState(isLoading: false);
      }
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await ApiClient.dio.post('/auth/login', data: {
        'email': email.trim(),
        'password': password,
      });

      final data = response.data['data'];
      final user = UserModel.fromJson(data['user']);
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;

      ApiClient.dio.options.headers['Authorization'] = 'Bearer $accessToken';

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('access_token', accessToken);
      await prefs.setString('refresh_token', refreshToken);
      await prefs.setString('user_id', user.id);
      await prefs.setString('user_email', user.email);
      await prefs.setString('user_name', user.fullName);

      state = AuthState(
        user: user,
        accessToken: accessToken,
        refreshToken: refreshToken,
        isLoading: false,
      );
      return true;
    } on DioException catch (e) {
      String msg;
      if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout || e.type == DioExceptionType.sendTimeout) {
        msg = 'Connection timed out. The backend server is waking up, please retry in a moment.';
      } else if (e.response?.statusCode == 401) {
        msg = e.response?.data?['error']?['message'] ?? 'Invalid email or password.';
      } else if (e.response?.data?['error']?['message'] != null) {
        msg = e.response!.data['error']['message'];
      } else {
        msg = 'Connection error. Please try again.';
      }
      state = state.copyWith(isLoading: false, error: msg);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> register({
    required String fullName,
    required String email,
    required String password,
    String? phone,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await ApiClient.dio.post('/auth/register', data: {
        'fullName': fullName.trim(),
        'email': email.trim(),
        'password': password,
        'phone': phone?.trim(),
      });

      final data = response.data['data'];
      final user = UserModel.fromJson(data['user']);
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;

      ApiClient.dio.options.headers['Authorization'] = 'Bearer $accessToken';

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('access_token', accessToken);
      await prefs.setString('refresh_token', refreshToken);
      await prefs.setString('user_id', user.id);
      await prefs.setString('user_email', user.email);
      await prefs.setString('user_name', user.fullName);

      state = AuthState(
        user: user,
        accessToken: accessToken,
        refreshToken: refreshToken,
        isLoading: false,
      );
      return true;
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] ?? 'Registration failed.';
      state = state.copyWith(isLoading: false, error: msg);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final refreshToken = prefs.getString('refresh_token');
      if (refreshToken != null) {
        await ApiClient.dio.post('/auth/logout', data: {'refreshToken': refreshToken});
      }
    } catch (_) {}

    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    ApiClient.dio.options.headers.remove('Authorization');

    state = AuthState(isLoading: false, user: null, accessToken: null, refreshToken: null);
  }
}
