import 'backend_api_client.dart';

class TripService {
  TripService({BackendApiClient? client})
      : _client = client ?? BackendApiClient();

  final BackendApiClient _client;

  Future<Map<String, dynamic>> refreshDashboard({
    required String token,
  }) {
    return _client.get('/drivers/me/dashboard', token: token);
  }

  Future<Map<String, dynamic>> setAvailability({
    required String token,
    required bool online,
  }) {
    return _client.patch(
      '/drivers/me/status',
      token: token,
      data: <String, dynamic>{
        'online': online,
      },
    );
  }

  Future<Map<String, dynamic>> acceptNextPassenger({
    required String token,
  }) {
    return _client.post(
      '/drivers/me/queue/accept-next',
      token: token,
    );
  }

  Future<Map<String, dynamic>> updateRideStatus({
    required String token,
    required String rideId,
    required String status,
  }) {
    return _client.patch(
      '/drivers/me/rides/$rideId/status',
      token: token,
      data: <String, dynamic>{
        'status': status,
      },
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
      data: <String, dynamic>{
        'documentType': documentType,
      },
    );
  }

  Future<Map<String, dynamic>> fetchProfile({
    required String token,
  }) {
    return _client.get('/drivers/me', token: token);
  }

  Future<Map<String, dynamic>> fetchEarnings({
    required String token,
  }) {
    return _client.get('/drivers/me/earnings', token: token);
  }
}
