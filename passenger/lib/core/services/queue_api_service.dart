import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:socket_io_client/socket_io_client.dart' as sio;

// ── Data types ───────────────────────────────────────────────────────────────

class JoinResult {
  const JoinResult({
    required this.position,
    required this.estimatedWaitMinutes,
    required this.yourTurn,
    required this.queueName,
    required this.waitingCount,
  });

  final int position;
  final int estimatedWaitMinutes;
  final bool yourTurn;
  final String queueName;
  final int waitingCount;
}

class PositionUpdate {
  PositionUpdate({
    required this.position,
    required this.estimatedWaitMinutes,
    required this.yourTurn,
    required this.waitingCount,
  });

  final int position;
  final int estimatedWaitMinutes;
  final bool yourTurn;
  final int waitingCount;

  factory PositionUpdate.fromMap(Map<String, dynamic> map) {
    return PositionUpdate(
      position: (map['position'] as num?)?.toInt() ?? 0,
      estimatedWaitMinutes:
          (map['estimatedWaitMinutes'] as num?)?.toInt() ?? 0,
      yourTurn: (map['yourTurn'] as bool?) ?? false,
      waitingCount: (map['waitingCount'] as num?)?.toInt() ?? 0,
    );
  }
}

// ── Service ──────────────────────────────────────────────────────────────────

class QueueApiService {
  static String _trimTrailingSlash(String value) {
    return value.replaceFirst(RegExp(r'/+$'), '');
  }

  static String _resolveApiBase(String? configured) {
    final candidate = _trimTrailingSlash((configured ?? '').trim());
    if (candidate.isEmpty) {
      return 'http://10.0.2.2:5000/api';
    }

    final uri = Uri.tryParse(candidate);
    if (uri != null && uri.hasScheme && uri.host.isNotEmpty) {
      final hasPath = uri.pathSegments.any((segment) => segment.isNotEmpty);
      if (!hasPath) {
        return _trimTrailingSlash(uri.replace(path: '/api').toString());
      }

      return _trimTrailingSlash(uri.toString());
    }

    return candidate;
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

  QueueApiService._() {
    final base = _resolveApiBase(dotenv.env['API_BASE_URL']);
    _dio = Dio(BaseOptions(
      baseUrl: base,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 10),
    ));
    _socketUrl = _resolveSocketUrl(dotenv.env['SOCKET_URL'], base);
  }

  static final QueueApiService instance = QueueApiService._();

  late final Dio _dio;
  late final String _socketUrl;
  sio.Socket? _socket;

  // ── HTTP ─────────────────────────────────────────────────────────────────

  /// GET /api/auth/send-otp  +  POST /api/auth/verify-otp
  /// Returns {token, userId} or null if backend unreachable.
  Future<({String token, String userId})?> acquireToken(String phone) async {
    try {
      await _dio.post('/auth/send-otp', data: {'phone': phone, 'role': 'passenger'});
      final res = await _dio.post('/auth/verify-otp', data: {
        'phone': phone,
        'otp': '123456',
        'role': 'passenger',
      });
      final token = res.data['token'] as String?;
      final userId = (res.data['user']?['id'] as String?) ?? '';
      if (token == null) return null;
      return (token: token, userId: userId);
    } catch (e) {
      debugPrint('[QueueApi] acquireToken failed: $e');
      return null;
    }
  }

  Future<PositionUpdate?> getQueuePosition(String queueId, String token) async {
    try {
      final res = await _dio.get(
        '/queues/$queueId/position',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final data = Map<String, dynamic>.from(res.data as Map);
      final queue = Map<String, dynamic>.from((data['queue'] as Map?) ?? const {});
      return PositionUpdate(
        position: (data['position'] as num?)?.toInt() ?? 0,
        estimatedWaitMinutes:
            (data['estimatedWaitMinutes'] as num?)?.toInt() ?? 0,
        yourTurn: (data['yourTurn'] as bool?) ?? false,
        waitingCount: (queue['waitingCount'] as num?)?.toInt() ?? 0,
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
      final msg = (e.response?.data as Map?)?['message'] ?? e.message;
      throw Exception(msg);
    }
  }

  /// POST /api/queues/:id/join
  Future<JoinResult?> joinQueue(String queueId, String token) async {
    try {
      final res = await _dio.post(
        '/queues/$queueId/join',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final data = res.data as Map<String, dynamic>;
      final queue = data['queue'] as Map<String, dynamic>? ?? {};
      return JoinResult(
        position: (data['position'] as num?)?.toInt() ?? 1,
        estimatedWaitMinutes:
            (data['estimatedWaitMinutes'] as num?)?.toInt() ?? 0,
        yourTurn: (data['yourTurn'] as bool?) ?? false,
        queueName: queue['name'] as String? ?? '',
        waitingCount: (queue['waitingCount'] as num?)?.toInt() ?? 0,
      );
    } on DioException catch (e) {
      final msg = (e.response?.data as Map?)?['message'] ?? e.message;
      throw Exception(msg);
    }
  }

  /// POST /api/queues/:id/leave
  Future<void> leaveQueue(String queueId, String token) async {
    try {
      await _dio.post(
        '/queues/$queueId/leave',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } on DioException catch (e) {
      final msg = (e.response?.data as Map?)?['message'] ?? e.message;
      throw Exception(msg);
    }
  }

  // ── Socket.IO ─────────────────────────────────────────────────────────────

  /// Connect socket and subscribe to queue:updated for [queueId].
  /// Calls [onUpdate] with each incoming position update.
  /// Returns a cancel function.
  VoidCallback subscribeToQueue(
    String queueId,
    String token,
    void Function(PositionUpdate) onUpdate,
  ) {
    _socket ??= sio.io(
      _socketUrl,
      sio.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .build(),
    );

    if (!_socket!.connected) {
      _socket!.connect();
    }

    var active = true;

    Future<void> refreshPosition() async {
      try {
        final update = await getQueuePosition(queueId, token);
        if (active && update != null) {
          onUpdate(update);
        }
      } catch (e) {
        if (active) {
          debugPrint('[QueueApi] position refresh failed: $e');
        }
      }
    }

    _socket!.emit('queue:subscribe', queueId);
    refreshPosition();

    void queueUpdatedHandler(dynamic _) {
      refreshPosition();
    }

    void yourTurnHandler(dynamic _) {
      refreshPosition();
    }

    _socket!.on('queue:updated', queueUpdatedHandler);
    _socket!.on('queue:your-turn', yourTurnHandler);

    return () {
      active = false;
      _socket?.off('queue:updated', queueUpdatedHandler);
      _socket?.off('queue:your-turn', yourTurnHandler);
      _socket?.emit('queue:unsubscribe', queueId);
    };
  }

  void disconnectSocket() {
    _socket?.disconnect();
    _socket = null;
  }
}
