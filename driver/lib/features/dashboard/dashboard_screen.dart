import 'dart:async';

import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/theme/app_theme.dart';
import '../../core/services/trip_service.dart';
import '../auth/driver_profile.dart';

class DriverDashboardScreen extends StatefulWidget {
  const DriverDashboardScreen({super.key, required this.profile});

  final DriverProfile profile;

  @override
  State<DriverDashboardScreen> createState() => _DriverDashboardScreenState();
}

class _DriverDashboardScreenState extends State<DriverDashboardScreen> {
  static const _navLabels = ['Home', 'Queue', 'Earnings', 'Profile'];
  static const _navIcons = [
    Icons.home_rounded,
    Icons.format_list_bulleted_rounded,
    Icons.payments_rounded,
    Icons.person_rounded,
  ];
  static const _fallbackZones = ['Terminal A', 'Corporate Exit', 'Main Gate'];

  final TripService _tripService = TripService();
  bool _isOnline = false;
  int _selectedTab = 0;
  List<String> _zones = List<String>.from(_fallbackZones);
  String _selectedZone = _fallbackZones.first;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>?
  _locationSubscription;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>?
  _broadcastSubscription;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _tripSubscription;
  int _queuedPassengers = 0;
  String _tripStatus = 'offline';
  String _latestRequestCopy = 'No active queue request yet';
  String? _lastBroadcastVersion;

  @override
  void initState() {
    super.initState();
    _listenToLocations();
    _listenToBroadcasts();
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    _broadcastSubscription?.cancel();
    _tripSubscription?.cancel();
    super.dispose();
  }

  void _listenToLocations() {
    _locationSubscription = FirebaseFirestore.instance
        .collection('dispatch_locations')
        .snapshots()
        .listen((snapshot) {
          final dynamicZones =
              snapshot.docs
                  .map((doc) => (doc.data()['name'] ?? '').toString().trim())
                  .where((name) => name.isNotEmpty)
                  .toSet()
                  .toList()
                ..sort();

          final nextZones = dynamicZones.isEmpty
              ? List<String>.from(_fallbackZones)
              : dynamicZones;

          if (!mounted) return;
          setState(() {
            _zones = nextZones;
            if (!_isOnline && !_zones.contains(_selectedZone)) {
              _selectedZone = _zones.first;
            }
          });
        });
  }

  void _listenToBroadcasts() {
    _broadcastSubscription = FirebaseFirestore.instance
        .collection('broadcast_messages')
        .orderBy('createdAt', descending: true)
        .limit(1)
        .snapshots()
        .listen((snapshot) {
          if (snapshot.docs.isEmpty) return;
          final doc = snapshot.docs.first;
          final data = doc.data();
          final target = data['target'] as String?;

          if (target == 'both' || target == 'drivers') {
            final message = data['message'] as String?;
            if (message != null && message.isNotEmpty) {
              final version =
                  '${doc.id}:${_broadcastVersionKey(data['updatedAt'] ?? data['createdAt'])}:$message';
              if (_lastBroadcastVersion == version) return;

              _lastBroadcastVersion = version;
              _showBroadcast(message);
            }
          }
        });
  }

  void _showBroadcast(String message) {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: const [
            Icon(Icons.campaign_rounded, color: DriverColors.teal),
            SizedBox(width: 8),
            Text(
              'Admin Announcement',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              'Dismiss',
              style: TextStyle(color: DriverColors.teal),
            ),
          ),
        ],
      ),
    );
  }

  String _broadcastVersionKey(dynamic value) {
    if (value is Timestamp) {
      return value.millisecondsSinceEpoch.toString();
    }

    return value?.toString() ?? '0';
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _handleOnlineToggle(bool value) async {
    setState(() {
      _isOnline = value;
      if (value) {
        _tripStatus = 'waiting';
        _queuedPassengers = 0;
        _latestRequestCopy = 'Waiting for passengers in $_selectedZone';
      }
    });

    if (value) {
      await _tripService.goOnline(widget.profile, _selectedZone);
      _startTripListener();
      return;
    }

    await _tripSubscription?.cancel();
    _tripSubscription = null;
    await _tripService.goOffline();

    if (!mounted) return;
    setState(() {
      _tripStatus = 'offline';
      _queuedPassengers = 0;
      _latestRequestCopy = 'No active queue request yet';
    });
  }

  void _startTripListener() {
    _tripSubscription?.cancel();
    final stream = _tripService.currentTripStream;
    if (stream == null) return;

    _tripSubscription = stream.listen((snapshot) {
      if (!snapshot.exists) return;
      final data = snapshot.data() ?? <String, dynamic>{};
      final passengers = List<String>.from(data['passengers'] ?? const []);
      final latestQueueRequest = data['latestQueueRequest'];
      final latestRequestData = latestQueueRequest is Map<String, dynamic>
          ? latestQueueRequest
          : <String, dynamic>{};
      final customerName = (latestRequestData['customerName'] ?? '')
          .toString()
          .trim();
      final customerPhone = (latestRequestData['customerPhone'] ?? '')
          .toString()
          .trim();
      final zone = (data['zone'] ?? _selectedZone).toString();
      final nextCopy = passengers.isEmpty
          ? 'Waiting for passengers in $zone'
          : customerName.isNotEmpty
          ? '$customerName${customerPhone.isNotEmpty ? ' - $customerPhone' : ''}'
          : '${passengers.length} passenger${passengers.length == 1 ? '' : 's'} assigned';

      if (passengers.length > _queuedPassengers && mounted) {
        final callerLabel = customerName.isNotEmpty
            ? customerName
            : 'A customer';
        _showMessage('$callerLabel wants a driver at $zone');
      }

      if (!mounted) return;
      setState(() {
        _queuedPassengers = passengers.length;
        _tripStatus = (data['status'] ?? 'waiting').toString();
        _latestRequestCopy = nextCopy;
        _selectedZone = zone;
      });
    });
  }

  Widget _buildHome(bool compact, bool wide) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(),
        const SizedBox(height: 24),
        _statusCard(compact, wide),
        const SizedBox(height: 20),
        _queueCard(compact, wide),
        const SizedBox(height: 24),
        Row(
          children: const [
            Icon(Icons.location_on_rounded, color: DriverColors.teal),
            SizedBox(width: 8),
            Text(
              'Pickup Zone',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: _zones.map((zone) {
            final selected = zone == _selectedZone;
            return FilterChip(
              selected: selected,
              label: Text(zone),
              onSelected: (_) {
                if (_isOnline) {
                  _showMessage('Go offline before changing your pickup zone');
                  return;
                }

                setState(() => _selectedZone = zone);
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        AspectRatio(
          aspectRatio: wide ? 2.2 : 1.3,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(28),
              gradient: const LinearGradient(
                colors: [Color(0xFF9FD1CB), Color(0xFFF7FBFA)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x160B1736),
                  blurRadius: 18,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            child: Stack(
              children: [
                const Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Color(0x330D8781),
                          Color(0x000D8781),
                          Color(0x440D8781),
                        ],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 20,
                  top: 18,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      _selectedZone,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: DriverColors.ink,
                      ),
                    ),
                  ),
                ),
                const Align(
                  alignment: Alignment.center,
                  child: CircleAvatar(
                    radius: 30,
                    backgroundColor: Color(0xFFD6EFEE),
                    child: CircleAvatar(
                      radius: 10,
                      backgroundColor: DriverColors.teal,
                    ),
                  ),
                ),
                Positioned(
                  right: 16,
                  bottom: 16,
                  child: FilledButton(
                    onPressed: () =>
                        _showMessage('Centered map on $_selectedZone'),
                    child: const Text('Center map'),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 28),
        const Text(
          'Next in Queue',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 16),
        _riderCard('1', 'Samuel Karanja', 'Terminal A - 4.9 rating', true),
        const SizedBox(height: 14),
        _riderCard(
          '2',
          'Elena Rodriguez',
          'Corporate Exit - 4.8 rating',
          false,
        ),
        const SizedBox(height: 14),
        _riderCard('3', 'John D. Smith', 'Main Gate - 5.0 rating', false),
      ],
    );
  }

  Widget _buildQueueTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(),
        const SizedBox(height: 24),
        const Text(
          'Queue Overview',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 14),
        _summaryTile('Trip status', _tripStatus.replaceAll('_', ' ')),
        const SizedBox(height: 12),
        _summaryTile('Passengers assigned', '$_queuedPassengers'),
        const SizedBox(height: 12),
        _summaryTile('Active pickup zone', _selectedZone),
      ],
    );
  }

  Widget _buildEarningsTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(),
        const SizedBox(height: 24),
        const Text(
          'Earnings',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 14),
        _summaryTile('Today', 'ETB 1,840'),
        const SizedBox(height: 12),
        _summaryTile('This week', 'ETB 9,420'),
        const SizedBox(height: 12),
        _summaryTile('Completed rides', '18'),
      ],
    );
  }

  Widget _buildProfileTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            boxShadow: const [
              BoxShadow(
                color: Color(0x160B1736),
                blurRadius: 18,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.profile.fullName,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Vehicle: ${widget.profile.vehicleInfo}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              const Text('Verified and ready for queue dispatch'),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _summaryTile('Support status', 'All checks passed'),
        const SizedBox(height: 12),
        _summaryTile('Driver rating', '4.96'),
      ],
    );
  }

  Widget _sectionHeader() {
    return Row(
      children: [
        _headerButton(
          Icons.menu_rounded,
          () => _showMessage('Menu is not configured yet'),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome, ${widget.profile.fullName.split(' ').first}',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 2),
              const Text(
                'Live queue management',
                style: TextStyle(color: DriverColors.muted),
              ),
            ],
          ),
        ),
        _headerButton(
          Icons.notifications_rounded,
          () => _showMessage(
            _queuedPassengers > 0 ? _latestRequestCopy : 'No new driver alerts',
          ),
        ),
      ],
    );
  }

  Widget _statusCard(bool compact, bool wide) {
    final statusCopy = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'STATUS',
          style: TextStyle(
            color: DriverColors.teal,
            fontSize: 15,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.6,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          _isOnline ? 'You are online' : 'Go Online',
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        Text(
          _isOnline
              ? _queuedPassengers > 0
                    ? 'A customer is waiting for pickup'
                    : 'You are live and receiving requests'
              : 'Currently receiving no requests',
          style: const TextStyle(color: DriverColors.muted),
        ),
      ],
    );

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFC7E2DF)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x160B1736),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: wide
          ? Row(
              children: [
                Expanded(child: statusCopy),
                const SizedBox(width: 20),
                Switch.adaptive(
                  value: _isOnline,
                  onChanged: _handleOnlineToggle,
                  activeThumbColor: DriverColors.teal,
                  activeTrackColor: DriverColors.tealSoft,
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                statusCopy,
                const SizedBox(height: 18),
                Switch.adaptive(
                  value: _isOnline,
                  onChanged: _handleOnlineToggle,
                  activeThumbColor: DriverColors.teal,
                  activeTrackColor: DriverColors.tealSoft,
                ),
              ],
            ),
    );
  }

  Widget _queueCard(bool compact, bool wide) {
    if (!_isOnline) {
      return _buildStaticQueueCard(
        compact,
        wide,
        'Offline',
        '0/4 seats filled',
        null,
      );
    }

    if (_tripStatus == 'moving') {
      return _buildStaticQueueCard(
        compact,
        wide,
        'Ride in progress',
        _latestRequestCopy,
        () async {
          await _tripService.arrive();
          _showMessage('Ride marked as arrived');
        },
        actionLabel: 'Mark arrived',
      );
    }

    if (_queuedPassengers > 0) {
      return _buildStaticQueueCard(
        compact,
        wide,
        '$_queuedPassengers passenger${_queuedPassengers == 1 ? '' : 's'} waiting',
        _latestRequestCopy,
        _tripStatus == 'waiting'
            ? () async {
                await _tripService.startRide();
                _showMessage('Ride started for $_latestRequestCopy');
              }
            : null,
        actionLabel: 'Start ride',
      );
    }

    return _buildStaticQueueCard(
      compact,
      wide,
      'Waiting for passengers...',
      'Zone $_selectedZone is live for queue calls and app requests',
      null,
    );
  }

  Widget _buildStaticQueueCard(
    bool compact,
    bool wide,
    String title,
    String subtitle,
    VoidCallback? onAction, {
    String actionLabel = 'Refresh',
  }) {
    final queueCopy = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Active Trip State',
          style: TextStyle(color: Colors.white70, fontSize: 16),
        ),
        const SizedBox(height: 12),
        Text(
          title,
          style: TextStyle(
            fontSize: compact ? 38 : 50,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.14),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(subtitle, style: const TextStyle(color: Colors.white)),
        ),
      ],
    );

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [DriverColors.teal, Color(0xFF22877F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x220D8781),
            blurRadius: 20,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: wide
          ? Row(
              children: [
                Expanded(child: queueCopy),
                if (onAction != null) ...[
                  const SizedBox(width: 18),
                  FilledButton(
                    onPressed: onAction,
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: DriverColors.teal,
                    ),
                    child: Text(actionLabel),
                  ),
                ],
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                queueCopy,
                if (onAction != null) ...[
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: onAction,
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: DriverColors.teal,
                    ),
                    child: Text(actionLabel),
                  ),
                ],
              ],
            ),
    );
  }

  Widget _riderCard(
    String position,
    String name,
    String location,
    bool priority,
  ) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x160B1736),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: const Color(0xFFF1F5FA),
            child: Text(
              position,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: DriverColors.teal,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  location,
                  style: const TextStyle(color: DriverColors.muted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          FilledButton(
            onPressed: () => _showMessage('Assigned $name'),
            style: FilledButton.styleFrom(
              backgroundColor: priority
                  ? DriverColors.teal
                  : const Color(0xFFE9F3F2),
              foregroundColor: priority ? Colors.white : DriverColors.teal,
            ),
            child: Text(priority ? 'Priority' : 'Assign'),
          ),
        ],
      ),
    );
  }

  Widget _summaryTile(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x160B1736),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(color: DriverColors.muted),
            ),
          ),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }

  Widget _headerButton(IconData icon, VoidCallback onTap) {
    return Material(
      color: DriverColors.tealSoft,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: SizedBox(
          height: 52,
          width: 52,
          child: Icon(icon, color: DriverColors.teal, size: 28),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DriverColors.softBackground,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact = constraints.maxWidth < 390;
            final wide = constraints.maxWidth >= 760;
            final body = switch (_selectedTab) {
              1 => _buildQueueTab(),
              2 => _buildEarningsTab(),
              3 => _buildProfileTab(),
              _ => _buildHome(compact, wide),
            };
            return SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 120),
              child: body,
            );
          },
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          height: 88,
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: DriverColors.line)),
          ),
          child: Row(
            children: List.generate(
              _navLabels.length,
              (index) => Expanded(
                child: InkWell(
                  onTap: () => setState(() => _selectedTab = index),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _navIcons[index],
                        color: _selectedTab == index
                            ? DriverColors.teal
                            : const Color(0xFF97A6BE),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _navLabels[index],
                        style: TextStyle(
                          color: _selectedTab == index
                              ? DriverColors.teal
                              : const Color(0xFF97A6BE),
                          fontWeight: _selectedTab == index
                              ? FontWeight.w700
                              : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showMessage('Quick actions will be connected next'),
        backgroundColor: DriverColors.teal,
        foregroundColor: Colors.white,
        child: const Icon(Icons.add_rounded),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}
