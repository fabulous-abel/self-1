import 'package:hive_flutter/hive_flutter.dart';

import '../../features/auth/passenger_profile.dart';

class PassengerLocalAuthService {
  static const _boxName = 'passenger_local_auth';
  static const _usersKey = 'users';

  Future<PassengerProfile> login({
    required String phoneNumber,
    required String password,
  }) async {
    final box = await _openBox();
    final users = _readUsers(box);
    final user = users[phoneNumber];

    if (user == null || user['password'] != password) {
      throw Exception(
        'Account not found or password is incorrect. Use the demo account or sign up first.',
      );
    }

    return _toProfile(phoneNumber, user);
  }

  Future<PassengerProfile> register({
    required String phoneNumber,
    required String password,
  }) async {
    final box = await _openBox();
    final users = _readUsers(box);

    if (users.containsKey(phoneNumber)) {
      throw Exception(
        'This passenger account already exists. Switch to Login.',
      );
    }

    users[phoneNumber] = {
      'password': password,
      'fullName': _buildDisplayName(phoneNumber),
      'email': _buildEmail(phoneNumber),
    };
    await box.put(_usersKey, users);

    return _toProfile(phoneNumber, users[phoneNumber]!);
  }

  Future<Box<dynamic>> _openBox() async {
    if (!Hive.isBoxOpen(_boxName)) {
      final box = await Hive.openBox(_boxName);
      await _ensureSeedData(box);
      return box;
    }

    final box = Hive.box(_boxName);
    await _ensureSeedData(box);
    return box;
  }

  Future<void> _ensureSeedData(Box<dynamic> box) async {
    final users = _readUsers(box);
    if (users.isNotEmpty) return;

    users['+251913269909'] = {
      'password': '123456',
      'fullName': 'Passenger Demo',
      'email': _buildEmail('+251913269909'),
    };
    await box.put(_usersKey, users);
  }

  Map<String, Map<String, dynamic>> _readUsers(Box<dynamic> box) {
    final rawUsers = Map<dynamic, dynamic>.from(
      box.get(_usersKey, defaultValue: <String, dynamic>{}) as Map,
    );

    return rawUsers.map(
      (key, value) =>
          MapEntry(key.toString(), Map<String, dynamic>.from(value as Map)),
    );
  }

  PassengerProfile _toProfile(String phoneNumber, Map<String, dynamic> user) {
    return PassengerProfile(
      fullName: user['fullName']?.toString() ?? _buildDisplayName(phoneNumber),
      email: user['email']?.toString() ?? _buildEmail(phoneNumber),
      phoneNumber: phoneNumber,
    );
  }

  String _buildEmail(String phoneNumber) {
    final digits = phoneNumber.replaceAll('+', '');
    return '$digits@linket.passenger.local';
  }

  String _buildDisplayName(String phoneNumber) {
    final digits = phoneNumber.replaceAll('+', '');
    final suffix = digits.length >= 4
        ? digits.substring(digits.length - 4)
        : digits;
    return 'Passenger $suffix';
  }
}
