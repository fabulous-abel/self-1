import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:hive_flutter/hive_flutter.dart';

class BackendApiException implements Exception {
  BackendApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

class SessionExpiredException extends BackendApiException {
  SessionExpiredException()
    : super('Your backend session expired. Please log in again.');
}

class BackendApiClient {
  BackendApiClient({Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: _baseUrl,
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 15),
              sendTimeout: const Duration(seconds: 15),
              headers: const <String, dynamic>{
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            ),
          );

  static const String sessionBoxName = 'driver_backend_session';
  static const String sessionTokenKey = 'token';
  static const String sessionProfileKey = 'profile';

  final Dio _dio;

  static String _trimTrailingSlash(String value) {
    return value.replaceFirst(RegExp(r'/+$'), '');
  }

  static String get _baseUrl {
    final configured = _trimTrailingSlash(
      (dotenv.env['API_BASE_URL'] ?? '').trim(),
    );
    if (configured.isNotEmpty) {
      final uri = Uri.tryParse(configured);
      if (uri != null && uri.hasScheme && uri.host.isNotEmpty) {
        final hasPath = uri.pathSegments.any((segment) => segment.isNotEmpty);
        if (!hasPath) {
          return _trimTrailingSlash(uri.replace(path: '/api').toString());
        }

        return _trimTrailingSlash(uri.toString());
      }

      return configured;
    }

    return 'http://10.0.2.2:5000/api';
  }

  Future<Box<dynamic>> _sessionBox() async {
    if (!Hive.isBoxOpen(sessionBoxName)) {
      return Hive.openBox<dynamic>(sessionBoxName);
    }

    return Hive.box<dynamic>(sessionBoxName);
  }

  Future<String?> readToken() async {
    final box = await _sessionBox();
    return box.get(sessionTokenKey)?.toString().trim();
  }

  Future<Map<String, dynamic>?> readStoredProfile() async {
    final box = await _sessionBox();
    final raw = box.get(sessionProfileKey);

    if (raw is Map) {
      return Map<String, dynamic>.from(raw);
    }

    return null;
  }

  Future<void> storeSession({
    required String token,
    required Map<String, dynamic> profile,
  }) async {
    final box = await _sessionBox();
    await box.put(sessionTokenKey, token.trim());
    await box.put(sessionProfileKey, Map<String, dynamic>.from(profile));
  }

  Future<void> clearSession() async {
    final box = await _sessionBox();
    await box.delete(sessionTokenKey);
    await box.delete(sessionProfileKey);
  }

  Future<Map<String, dynamic>> get(
    String path, {
    String? token,
    Map<String, dynamic>? queryParameters,
  }) {
    return _request(
      method: 'GET',
      path: path,
      token: token,
      queryParameters: queryParameters,
    );
  }

  Future<Map<String, dynamic>> post(
    String path, {
    String? token,
    Object? data,
  }) {
    return _request(method: 'POST', path: path, token: token, data: data);
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    String? token,
    Object? data,
  }) {
    return _request(method: 'PATCH', path: path, token: token, data: data);
  }

  Future<Map<String, dynamic>> _request({
    required String method,
    required String path,
    String? token,
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final options = Options(
        headers: <String, dynamic>{
          if ((token ?? '').trim().isNotEmpty)
            'Authorization': 'Bearer ${token!.trim()}',
        },
      );

      final response = switch (method) {
        'GET' => await _dio.get<dynamic>(
          path,
          options: options,
          queryParameters: queryParameters,
        ),
        'POST' => await _dio.post<dynamic>(
          path,
          data: data,
          options: options,
          queryParameters: queryParameters,
        ),
        'PATCH' => await _dio.patch<dynamic>(
          path,
          data: data,
          options: options,
          queryParameters: queryParameters,
        ),
        _ => throw BackendApiException('Unsupported request method: $method'),
      };

      return _mapData(response.data);
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  BackendApiException _mapError(DioException error) {
    final statusCode = error.response?.statusCode;

    if (statusCode == 401) {
      return SessionExpiredException();
    }

    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return BackendApiException(
        'Unable to reach the backend at $_baseUrl. Check your network and API URL.',
      );
    }

    final responseData = error.response?.data;
    if (responseData is Map && responseData['message'] != null) {
      return BackendApiException(responseData['message'].toString());
    }

    final message = error.message?.trim();
    if (message != null && message.isNotEmpty) {
      return BackendApiException(message);
    }

    return BackendApiException('Backend request failed.');
  }

  Map<String, dynamic> _mapData(dynamic data) {
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }

    return <String, dynamic>{};
  }
}
