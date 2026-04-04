import 'package:flutter/foundation.dart';

@immutable
class DriverProfile {
  const DriverProfile({
    required this.fullName,
    required this.phoneNumber,
    this.email = '',
    this.vehicleInfo = '',
  });

  final String fullName;
  final String phoneNumber;
  final String email;
  final String vehicleInfo;
}
