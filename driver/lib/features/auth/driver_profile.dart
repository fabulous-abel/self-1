import 'package:flutter/foundation.dart';

@immutable
class DriverProfile {
  const DriverProfile({
    required this.fullName,
    required this.phoneNumber,
    this.email = '',
    this.vehicleInfo = '',
    this.token = '',
    this.driverId = '',
    this.userId = '',
    this.queueName = '',
    this.status = '',
    this.isOnline = false,
  });

  final String fullName;
  final String phoneNumber;
  final String email;
  final String vehicleInfo;
  final String token;
  final String driverId;
  final String userId;
  final String queueName;
  final String status;
  final bool isOnline;

  DriverProfile copyWith({
    String? fullName,
    String? phoneNumber,
    String? email,
    String? vehicleInfo,
    String? token,
    String? driverId,
    String? userId,
    String? queueName,
    String? status,
    bool? isOnline,
  }) {
    return DriverProfile(
      fullName: fullName ?? this.fullName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      email: email ?? this.email,
      vehicleInfo: vehicleInfo ?? this.vehicleInfo,
      token: token ?? this.token,
      driverId: driverId ?? this.driverId,
      userId: userId ?? this.userId,
      queueName: queueName ?? this.queueName,
      status: status ?? this.status,
      isOnline: isOnline ?? this.isOnline,
    );
  }
}
