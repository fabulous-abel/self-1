import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';
import '../../features/auth/driver_profile.dart';

class TripService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final AudioPlayer _audioPlayer = AudioPlayer();

  String? _currentZone;
  String? _currentTripId;
  String? _driverPhone;

  int _passengerCount = 0;
  final int _maxCapacity = 4;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _tripSubscription;

  // Stream of the current trip document
  Stream<DocumentSnapshot<Map<String, dynamic>>>? get currentTripStream {
    if (_currentTripId == null) return null;
    return _firestore
        .collection('active_trips')
        .doc(_currentTripId)
        .snapshots();
  }

  Future<void> goOnline(DriverProfile profile, String zone) async {
    await _tripSubscription?.cancel();
    _driverPhone = profile.phoneNumber;
    _currentZone = zone;

    // 1. Add driver to the zone's driver_queue
    await _firestore
        .collection('pickup_regions')
        .doc(zone)
        .collection('driver_queue')
        .doc(profile.phoneNumber)
        .set({
          'driverName': profile.fullName,
          'vehicleInfo': profile.vehicleInfo,
          'timestamp': FieldValue.serverTimestamp(),
          'status': 'waiting',
        });

    // 2. Create an active_trip document for this driver
    final tripRef = _firestore
        .collection('active_trips')
        .doc(profile.phoneNumber);
    _currentTripId = profile.phoneNumber;

    await tripRef.set({
      'driverPhone': profile.phoneNumber,
      'driverName': profile.fullName,
      'vehicleInfo': profile.vehicleInfo,
      'zone': zone,
      'status': 'waiting',
      'passengers': [],
      'capacity': _maxCapacity,
      'createdAt': FieldValue.serverTimestamp(),
    });

    // 3. Listen for changes to play sound on new passenger
    _listenForPassengers();
  }

  Future<void> goOffline() async {
    await _tripSubscription?.cancel();
    _tripSubscription = null;

    if (_currentZone != null && _driverPhone != null) {
      await _firestore
          .collection('pickup_regions')
          .doc(_currentZone)
          .collection('driver_queue')
          .doc(_driverPhone)
          .delete();

      if (_currentTripId != null) {
        await _firestore
            .collection('active_trips')
            .doc(_currentTripId)
            .delete();
      }
    }
    _currentZone = null;
    _currentTripId = null;
    _passengerCount = 0;
  }

  void _listenForPassengers() {
    if (_currentTripId == null) return;

    _tripSubscription = _firestore
        .collection('active_trips')
        .doc(_currentTripId)
        .snapshots()
        .listen((snapshot) {
          if (!snapshot.exists) return;
          final data = snapshot.data()!;

          final passengers = List<String>.from(data['passengers'] ?? []);
          final currentStatus = data['status'] as String;

          if (passengers.length > _passengerCount) {
            _playSound();

            // Auto-update to seats_full if hit capacity
            if (passengers.length >= _maxCapacity &&
                currentStatus == 'waiting') {
              _firestore.collection('active_trips').doc(_currentTripId).update({
                'status': 'seats_full',
              });
            }
          }

          _passengerCount = passengers.length;
        });
  }

  Future<void> _playSound() async {
    try {
      await SystemSound.play(SystemSoundType.alert);
      await _audioPlayer.play(AssetSource('notification.mp3'));
    } catch (e) {
      debugPrint(
        'Error playing driver alert sound, system alert was attempted first: $e',
      );
    }
  }

  Future<void> startRide() async {
    if (_currentTripId == null) return;
    await _firestore.collection('active_trips').doc(_currentTripId).update({
      'status': 'moving',
    });
  }

  Future<void> arrive() async {
    if (_currentTripId == null) return;
    await _firestore.collection('active_trips').doc(_currentTripId).update({
      'status': 'arrived',
    });
  }
}
