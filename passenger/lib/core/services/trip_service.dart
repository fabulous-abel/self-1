import 'package:cloud_firestore/cloud_firestore.dart';
import '../../features/auth/passenger_profile.dart';

class PassengerTripService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String? _currentZone;
  String? _passengerPhone;
  String? _assignedTripId;

  // Stream of the assigned trip
  Stream<DocumentSnapshot<Map<String, dynamic>>>? get tripStream {
    if (_assignedTripId == null) return null;
    return _firestore.collection('active_trips').doc(_assignedTripId).snapshots();
  }

  Future<void> joinQueue(PassengerProfile profile, String zone) async {
    _passengerPhone = profile.phoneNumber;
    _currentZone = zone;

    // 1. Add passenger to the zone's passenger_queue
    await _firestore
        .collection('pickup_regions')
        .doc(zone)
        .collection('passenger_queue')
        .doc(profile.phoneNumber)
        .set({
      'passengerName': profile.fullName,
      'timestamp': FieldValue.serverTimestamp(),
    });

    // 2. Log event to admin activity feed
    await _firestore.collection('passenger_events').add({
      'passengerName': profile.fullName,
      'zone': zone,
      'timestamp': FieldValue.serverTimestamp(),
    });

    // 2. Try to find an available driver trip right away (Simple Mock Matchmaking)
    final availableTrips = await _firestore
        .collection('active_trips')
        .where('zone', isEqualTo: zone)
        .where('status', isEqualTo: 'waiting')
        .get();

    if (availableTrips.docs.isNotEmpty) {
      // Find one with capacity
      for (var doc in availableTrips.docs) {
        final data = doc.data();
        final capacity = data['capacity'] ?? 4;
        final passList = List<String>.from(data['passengers'] ?? []);
        
        if (passList.length < capacity) {
          // Assign to this trip
          _assignedTripId = doc.id;
          passList.add(profile.phoneNumber);
          
          await doc.reference.update({'passengers': passList});
          
          // Remove from passenger queue since we got assigned
          await _firestore
              .collection('pickup_regions')
              .doc(zone)
              .collection('passenger_queue')
              .doc(profile.phoneNumber)
              .delete();
          break;
        }
      }
    }
  }

  Future<void> leaveQueue() async {
    if (_currentZone != null && _passengerPhone != null) {
      await _firestore
          .collection('pickup_regions')
          .doc(_currentZone)
          .collection('passenger_queue')
          .doc(_passengerPhone)
          .delete();
    }
    
    // If assigned, we could technically leave the trip here, but omitted for simplicity
    _currentZone = null;
    _assignedTripId = null;
  }
}
