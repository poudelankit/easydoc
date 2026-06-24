import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app_environment.dart';

typedef JsonMap = Map<String, dynamic>;

class DemoUser {
  const DemoUser({
    required this.id,
    required this.phoneNumber,
    required this.role,
    required this.status,
    this.fullName,
  });

  factory DemoUser.fromJson(JsonMap json) {
    return DemoUser(
      id: _stringValue(json['id']),
      phoneNumber: _stringValue(json['phoneNumber']),
      fullName: _nullableString(json['fullName']),
      role: _stringValue(json['role']),
      status: _stringValue(json['status']),
    );
  }

  final String id;
  final String phoneNumber;
  final String? fullName;
  final String role;
  final String status;

  JsonMap toJson() {
    return {
      'id': id,
      'phoneNumber': phoneNumber,
      'fullName': fullName,
      'role': role,
      'status': status,
    };
  }
}

class DemoSession {
  const DemoSession({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory DemoSession.fromJson(JsonMap json) {
    return DemoSession(
      accessToken: _stringValue(json['accessToken']),
      refreshToken: _stringValue(json['refreshToken']),
      user: DemoUser.fromJson(_mapValue(json['user'])),
    );
  }

  final String accessToken;
  final String refreshToken;
  final DemoUser user;

  JsonMap toJson() {
    return {
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'user': user.toJson(),
    };
  }
}

class DemoApiException implements Exception {
  const DemoApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

class DemoApiClient {
  DemoApiClient({required AppEnvironment environment})
      : _dio = Dio(
          BaseOptions(
            baseUrl: environment.apiBaseUrl,
            connectTimeout: const Duration(seconds: 8),
            receiveTimeout: const Duration(seconds: 12),
            headers: const {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        );

  static const _sessionKey = 'easydocument.demo.session';

  final Dio _dio;
  DemoSession? _session;

  DemoSession? get session => _session;

  Future<DemoSession?> restoreSession() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_sessionKey);
    if (raw == null || raw.isEmpty) {
      return null;
    }

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) {
        await clearSession();
        return null;
      }
      _session = DemoSession.fromJson(decoded);
      return _session;
    } catch (_) {
      await clearSession();
      return null;
    }
  }

  Future<void> clearSession() async {
    _session = null;
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_sessionKey);
  }

  Future<JsonMap> sendOtp({
    required String phoneNumber,
    String purpose = 'LOGIN',
  }) async {
    final response = await _post(
      'auth/otp/send',
      data: {
        'phoneNumber': phoneNumber.trim(),
        'purpose': purpose,
      },
      authenticated: false,
    );
    return _mapValue(response.data);
  }

  Future<DemoSession> verifyOtp({
    required String phoneNumber,
    required String otp,
    String purpose = 'LOGIN',
  }) async {
    final response = await _post(
      'auth/otp/verify',
      data: {
        'phoneNumber': phoneNumber.trim(),
        'purpose': purpose,
        'otp': otp.trim(),
      },
      authenticated: false,
    );

    final session = DemoSession.fromJson(_mapValue(response.data));
    _session = session;
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_sessionKey, jsonEncode(session.toJson()));
    return session;
  }

  Future<List<JsonMap>> getMyTasks() async {
    final response = await _get('tasks/me');
    return _listValue(response.data);
  }

  Future<JsonMap> getTaskDetail(String taskId) async {
    final response = await _get('tasks/$taskId');
    return _mapValue(response.data);
  }

  Future<JsonMap> getTaskTimeline(String taskId) async {
    final response = await _get('tasks/$taskId/timeline');
    return _mapValue(response.data);
  }

  Future<List<JsonMap>> getTaskMessages(String taskId) async {
    final response = await _get('tasks/$taskId/messages');
    return _listValue(response.data);
  }

  Future<List<JsonMap>> getNotifications() async {
    final response = await _get('notifications');
    return _listValue(response.data);
  }

  Future<int> getUnreadNotificationCount() async {
    final response = await _get('notifications/unread-count');
    final payload = _mapValue(response.data);
    return _intValue(payload['unreadCount']);
  }

  Future<List<JsonMap>> getCustomerReviews() async {
    final response = await _get('customers/me/reviews');
    return _listValue(response.data);
  }

  Future<List<JsonMap>> getAgentReviews() async {
    final response = await _get('agents/me/reviews');
    return _listValue(response.data);
  }

  Future<List<JsonMap>> getAgentNearbyRequests() async {
    final response = await _get('agents/nearby-requests');
    return _listValue(response.data);
  }

  Future<Response<dynamic>> _get(String path) {
    return _request(() => _dio.get(path, options: _authOptions()));
  }

  Future<Response<dynamic>> _post(
    String path, {
    required JsonMap data,
    required bool authenticated,
  }) {
    return _request(
      () => _dio.post(
        path,
        data: data,
        options: authenticated ? _authOptions() : null,
      ),
    );
  }

  Options _authOptions() {
    final token = _session?.accessToken;
    if (token == null || token.isEmpty) {
      throw const DemoApiException(
          'Sign in with OTP before loading demo data.');
    }
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  Future<Response<dynamic>> _request(
      Future<Response<dynamic>> Function() request) async {
    try {
      return await request();
    } on DemoApiException {
      rethrow;
    } on DioException catch (error) {
      throw DemoApiException(_formatDioError(error));
    } catch (error) {
      throw DemoApiException('Unexpected demo API error: $error');
    }
  }

  String _formatDioError(DioException error) {
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      final message = data['message'];
      if (message is String && message.isNotEmpty) {
        return message;
      }
      if (message is List && message.isNotEmpty) {
        return message.join(' ');
      }
      final errorText = data['error'];
      if (errorText is String && errorText.isNotEmpty) {
        return errorText;
      }
    }

    final statusCode = error.response?.statusCode;
    if (statusCode != null) {
      return 'Request failed with HTTP $statusCode.';
    }
    return error.message ?? 'Backend is unavailable.';
  }
}

JsonMap _mapValue(Object? value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return value.map((key, mapValue) => MapEntry(key.toString(), mapValue));
  }
  return {};
}

List<JsonMap> _listValue(Object? value) {
  final direct = value;
  if (direct is List) {
    return direct.map(_mapValue).toList();
  }

  final map = _mapValue(value);
  for (final key in const ['items', 'data', 'results']) {
    final nested = map[key];
    if (nested is List) {
      return nested.map(_mapValue).toList();
    }
  }
  return [];
}

String _stringValue(Object? value) {
  if (value == null) {
    return '';
  }
  return value.toString();
}

String? _nullableString(Object? value) {
  if (value == null) {
    return null;
  }
  final text = value.toString();
  return text.isEmpty ? null : text;
}

int _intValue(Object? value) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  return int.tryParse(value.toString()) ?? 0;
}
