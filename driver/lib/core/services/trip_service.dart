import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:socket_io_client/socket_io_client.dart' as sio;

import 'backend_api_client.dart';

class TripService {
  TripService({BackendApiClient? client})
    : _client = client ?? BackendApiClient(),
      _socketUrl = _resolveSocketUrl(dotenv.env['SOCKET_URL'], _apiBaseUrl);

  final BackendApiClient _client;
  final String _socketUrl;
  sio.Socket? _socket;

  static String _trimTrailingSlash(String value) {
    return value.replaceFirst(RegExp(r'/+$'), '');
  }

  static String get _apiBaseUrl {
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

  static String _resolveSocketUrl(String? configured, String apiBase) {
    final candidate = _trimTrailingSlash((configured ?? '').trim());
    if (candidate.isNotEmpty) {
      return candidate;
    }

    final uri = Uri.tryParse(apiBase);
    if (uri != null && uri.hasScheme && uri.host.isNotEmpty) {
      return _trimTrailingSlash(
        uri.replace(path: '', query: null, fragment: null).toString(),
      );
    }

    return 'http://10.0.2.2:5000';
  }

  Future<Map<String, dynamic>> refreshDashboard({required String token}) {
    return _client.get('/drivers/me/dashboard', token: token);
  }

  Future<Map<String, dynamic>> setAvailability({
    required String token,
    required bool online,
  }) {
    return _client.patch(
      '/drivers/me/status',
      token: token,
      data: <String, dynamic>{'online': online},
    );
  }

  Future<Map<String, dynamic>> updateQueue({
    required String token,
    required String queueId,
  }) {
    return _client.patch(
      '/drivers/me/queue',
      token: token,
      data: <String, dynamic>{'queueId': queueId},
    );
  }

  Future<Map<String, dynamic>> acceptNextPassenger({required String token}) {
    return _client.post('/drivers/me/queue/accept-next', token: token);
  }

  Future<Map<String, dynamic>> updateRideStatus({
    required String token,
    required String rideId,
    required String status,
  }) {
    return _client.patch(
      '/drivers/me/rides/$rideId/status',
      token: token,
      data: <String, dynamic>{'status': status},
    );
  }

  Future<Map<String, dynamic>> updateVehicle({
    required String token,
    required String brand,
    required String model,
    required String licensePlate,
    required String color,
  }) {
    return _client.patch(
      '/drivers/me/vehicle',
      token: token,
      data: <String, dynamic>{
        'brand': brand,
        'model': model,
        'licensePlate': licensePlate,
        'color': color,
      },
    );
  }

  Future<Map<String, dynamic>> uploadDocument({
    required String token,
    required String documentType,
  }) {
    return _client.post(
      '/drivers/me/documents',
      token: token,
      data: <String, dynamic>{'documentType': documentType},
    );
  }

  Future<Map<String, dynamic>> fetchProfile({required String token}) {
    return _client.get('/drivers/me', token: token);
  }

  Future<Map<String, dynamic>> fetchEarnings({required String token}) {
    return _client.get('/drivers/me/earnings', token: token);
  }

  VoidCallback subscribeToDashboard({
    required String token,
    required void Function(Map<String, dynamic>) onDashboard,
  }) {
    _socket ??= sio.io(
      _socketUrl,
      sio.OptionBuilder()
          .setTransports(<String>['websocket'])
          .setAuth(<String, dynamic>{'token': token})
          .disableAutoConnect()
          .build(),
    );

    if (!_socket!.connected) {
      _socket!.connect();
    }

    void dashboardHandler(dynamic payload) {
      if (payload is Map) {
        onDashboard(Map<String, dynamic>.from(payload));
      }
    }

    _socket!.on('driver:dashboard', dashboardHandler);

    return () {
      _socket?.off('driver:dashboard', dashboardHandler);
    };
  }

  void disconnectSocket() {
    _socket?.disconnect();
    _socket = null;
  }

  Future<void> playQueueArrivalAlert() async {
    try {
      await HapticFeedback.vibrate();
      await SystemSound.play(SystemSoundType.alert);
    } catch (error) {
      debugPrint('Unable to play driver queue alert: $error');
    }
  }
}
