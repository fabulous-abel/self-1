import 'backend_api_client.dart';
import '../../features/auth/driver_profile.dart';

class DriverLocalAuthService {
  DriverLocalAuthService({BackendApiClient? client})
      : _client = client ?? BackendApiClient();

  final BackendApiClient _client;

  Future<DriverProfile> login({
    required String phoneNumber,
    required String password,
  }) {
    return _authenticate(
      phoneNumber: phoneNumber,
      verificationCode: password,
    );
  }

  Future<DriverProfile> register({
    required String phoneNumber,
    required String password,
    required String vehicleInfo,
  }) {
    return _authenticate(
      phoneNumber: phoneNumber,
      verificationCode: password,
      vehicleInfo: vehicleInfo,
    );
  }

  Future<DriverProfile?> restoreSession() async {
    final token = await _client.readToken();
    if (token == null || token.isEmpty) {
      return null;
    }

    final storedProfile = await _client.readStoredProfile();

    try {
      final response = await _client.get('/drivers/me', token: token);
      final driver = _mapOf(response['driver'] ?? response);
      return _driverProfileFromBackend(
        driver: driver,
        token: token,
        fallbackProfile: storedProfile,
      );
    } on SessionExpiredException {
      await _client.clearSession();
      return null;
    } on BackendApiException {
      if (storedProfile == null) {
        return null;
      }

      return DriverProfile(
        fullName: _textValue(storedProfile['fullName']) ??
            _buildDisplayName(_textValue(storedProfile['phoneNumber']) ?? ''),
        phoneNumber: _textValue(storedProfile['phoneNumber']) ?? '',
        email: _textValue(storedProfile['email']) ?? '',
        vehicleInfo: _textValue(storedProfile['vehicleInfo']) ?? 'Vehicle pending',
        token: token,
        driverId: _textValue(storedProfile['driverId']) ?? '',
        userId: _textValue(storedProfile['userId']) ?? '',
        queueName: _textValue(storedProfile['queueName']) ?? '',
        status: _textValue(storedProfile['status']) ?? '',
        isOnline: storedProfile['isOnline'] == true,
      );
    }
  }

  Future<void> clearSession() {
    return _client.clearSession();
  }

  Future<DriverProfile> _authenticate({
    required String phoneNumber,
    required String verificationCode,
    String? vehicleInfo,
  }) async {
    final normalizedPhone = _normalizePhone(phoneNumber);
    final code = verificationCode.trim();

    if (normalizedPhone.isEmpty) {
      throw BackendApiException('Enter a valid Ethiopian phone number.');
    }

    if (code.length != 6) {
      throw BackendApiException('Verification code must be 6 digits.');
    }

    await _client.post(
      '/auth/send-otp',
      data: <String, dynamic>{
        'phone': normalizedPhone,
        'role': 'driver',
      },
    );

    final verifyResponse = await _client.post(
      '/auth/verify-otp',
      data: <String, dynamic>{
        'phone': normalizedPhone,
        'otp': code,
        'role': 'driver',
      },
    );

    final token = verifyResponse['token']?.toString().trim() ?? '';
    if (token.isEmpty) {
      throw BackendApiException('Backend did not return an auth token.');
    }

    final storedVehicleInfo = vehicleInfo?.trim().isNotEmpty == true
        ? vehicleInfo!.trim()
        : null;
    final profile = await _loadBackendProfile(
      token: token,
      fallbackVehicleInfo: storedVehicleInfo,
      fallbackName: _textValue(_mapOf(verifyResponse['user'])['name']) ??
          _buildDisplayName(normalizedPhone),
      fallbackPhone: _textValue(_mapOf(verifyResponse['user'])['phone']) ??
          normalizedPhone,
    );

    await _client.storeSession(
      token: token,
      profile: <String, dynamic>{
        'fullName': profile.fullName,
        'phoneNumber': profile.phoneNumber,
        'email': profile.email,
        'vehicleInfo': profile.vehicleInfo,
        'token': profile.token,
        'driverId': profile.driverId,
        'userId': profile.userId,
        'queueName': profile.queueName,
        'status': profile.status,
        'isOnline': profile.isOnline,
      },
    );

    return profile;
  }

  Future<DriverProfile> _loadBackendProfile({
    required String token,
    String? fallbackVehicleInfo,
    String? fallbackName,
    String? fallbackPhone,
  }) async {
    final response = await _client.get('/drivers/me', token: token);
    final driver = _mapOf(response['driver'] ?? response);
    final vehicle = _mapOf(driver['vehicle']);
    final storedProfile = await _client.readStoredProfile();

    return _driverProfileFromBackend(
      driver: driver,
      token: token,
      fallbackProfile: storedProfile,
      fallbackName: fallbackName,
      fallbackPhone: fallbackPhone,
      fallbackVehicleInfo: fallbackVehicleInfo,
      backendVehicleInfo: _buildVehicleSummary(vehicle),
    );
  }

  DriverProfile _driverProfileFromBackend({
    required Map<String, dynamic> driver,
    required String token,
    Map<String, dynamic>? fallbackProfile,
    String? fallbackName,
    String? fallbackPhone,
    String? fallbackVehicleInfo,
    String? backendVehicleInfo,
  }) {
    final fallbackMap = fallbackProfile ?? const <String, dynamic>{};
    final storedVehicleInfo = _textValue(fallbackMap['vehicleInfo']);
    final vehicleInfo = fallbackVehicleInfo?.trim().isNotEmpty == true
        ? fallbackVehicleInfo!.trim()
        : storedVehicleInfo ?? backendVehicleInfo ?? '';

    return DriverProfile(
      fullName: _textValue(driver['name']) ??
          _textValue(fallbackMap['fullName']) ??
          fallbackName ??
          '',
      phoneNumber: _textValue(driver['phone']) ??
          _textValue(fallbackMap['phoneNumber']) ??
          fallbackPhone ??
          '',
      email: _textValue(fallbackMap['email']) ?? '',
      vehicleInfo: vehicleInfo.isNotEmpty
          ? vehicleInfo
          : backendVehicleInfo ?? 'Vehicle pending',
      token: token,
      driverId: _textValue(driver['id']) ?? '',
      userId: _textValue(driver['userId']) ?? '',
      queueName: _textValue(driver['queueName']) ?? '',
      status: _textValue(driver['status']) ?? '',
      isOnline: driver['isOnline'] == true,
    );
  }

  Map<String, dynamic> _mapOf(dynamic value) {
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }

    return <String, dynamic>{};
  }

  String? _textValue(dynamic value) {
    final text = value?.toString().trim();
    if (text == null || text.isEmpty) {
      return null;
    }

    return text;
  }

  String _normalizePhone(String value) {
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) {
      return '';
    }

    if (digits.startsWith('251') && digits.length == 12) {
      return '+$digits';
    }

    if (digits.startsWith('0') && digits.length == 10) {
      return '+251${digits.substring(1)}';
    }

    if (digits.length == 9) {
      return '+251$digits';
    }

    return '';
  }

  String _buildDisplayName(String phoneNumber) {
    final digits = phoneNumber.replaceAll('+', '');
    if (digits.isEmpty) {
      return 'Driver';
    }

    final suffix = digits.length >= 4 ? digits.substring(digits.length - 4) : digits;
    return 'Driver $suffix';
  }

  String _buildVehicleSummary(Map<String, dynamic> vehicle) {
    final parts = <String>[
      _textValue(vehicle['brand']) ?? '',
      _textValue(vehicle['model']) ?? '',
      _textValue(vehicle['plateNumber']) ?? '',
      _textValue(vehicle['color']) ?? '',
    ].where((part) => part.isNotEmpty).toList();

    if (parts.isEmpty) {
      return 'Vehicle pending';
    }

    return parts.join(' - ');
  }
}
