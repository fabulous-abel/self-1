import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/services/backend_api_client.dart';
import '../../core/services/local_auth_service.dart';
import '../../core/services/trip_service.dart';
import '../../core/theme/app_theme.dart';
import '../auth/driver_login_screen.dart';
import '../auth/driver_profile.dart';

class DriverDashboardScreen extends StatefulWidget {
  const DriverDashboardScreen({super.key, required this.profile});

  final DriverProfile profile;

  @override
  State<DriverDashboardScreen> createState() => _DriverDashboardScreenState();
}

class _DriverDashboardScreenState extends State<DriverDashboardScreen> {
  final TripService _tripService = TripService();
  final DriverLocalAuthService _authService = DriverLocalAuthService();

  late DriverProfile _profile;
  Map<String, dynamic>? _dashboard;
  Timer? _timer;
  Set<String> _knownQueueEntryIds = <String>{};
  int _tab = 0;
  bool _loading = true;
  bool _refreshing = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _profile = widget.profile;
    Future<void>.microtask(_bootstrap);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    await _loadDashboard(showLoading: true);
    if (!mounted) return;
    _timer = Timer.periodic(
      const Duration(seconds: 8),
      (_) => _loadDashboard(),
    );
  }

  Map<String, dynamic> get _driver => _map(_dashboard?['driver']);
  Map<String, dynamic> get _queue => _map(_dashboard?['queue']);
  Map<String, dynamic> get _ride => _map(_dashboard?['activeRide']);
  Map<String, dynamic> get _earnings => _map(_dashboard?['earnings']);
  List<Map<String, dynamic>> get _entries => _list(_dashboard?['entries']);

  bool get _online =>
      _bool(_driver['isOnline']) || _text(_driver['status']) == 'online';

  String get _queueName {
    return _text(_profile.queueName) ??
        _text(_queue['name']) ??
        'Assigned queue';
  }

  Future<void> _loadDashboard({bool showLoading = false}) async {
    if (_refreshing || _busy) return;
    if (!mounted) return;

    setState(() {
      _refreshing = true;
      if (showLoading) _loading = true;
    });

    try {
      final dashboard = await _tripService.refreshDashboard(
        token: _profile.token,
      );
      _applyDashboard(dashboard);
    } on SessionExpiredException {
      await _logout();
    } on BackendApiException {
      if (!mounted) return;
      setState(() {
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
      });
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  void _applyDashboard(Map<String, dynamic> dashboard) {
    final driver = _map(dashboard['driver']);
    final queue = _map(driver['queue'] ?? dashboard['queue']);
    final vehicle = _map(driver['vehicle']);
    final nextEntries = _list(dashboard['entries']);
    final nextEntryIds = _entryIds(nextEntries);
    final wasOnline = _online;
    final nextOnline =
        _bool(driver['isOnline']) || _text(driver['status']) == 'online';
    final addedEntryIds = _dashboard == null
        ? const <String>{}
        : nextEntryIds.difference(_knownQueueEntryIds);
    final vehicleInfo =
        _profile.vehicleInfo.isNotEmpty &&
            _profile.vehicleInfo != 'Vehicle pending'
        ? _profile.vehicleInfo
        : _vehicleSummary(vehicle);

    if (!mounted) return;
    setState(() {
      _profile = _profile.copyWith(
        fullName: _text(driver['name']) ?? _profile.fullName,
        phoneNumber: _text(driver['phone']) ?? _profile.phoneNumber,
        vehicleInfo: vehicleInfo,
        queueName: _text(queue['name']) ?? _profile.queueName,
        status: _text(driver['status']) ?? _profile.status,
        isOnline: nextOnline,
        driverId: _text(driver['id']) ?? _profile.driverId,
        userId: _text(driver['userId']) ?? _profile.userId,
      );
      _dashboard = dashboard;
      _knownQueueEntryIds = nextEntryIds;
      _loading = false;
    });

    if (wasOnline && nextOnline && addedEntryIds.isNotEmpty) {
      unawaited(_tripService.playQueueArrivalAlert());
    }
  }

  Future<void> _setOnline(bool value) async {
    if (_busy) return;
    setState(() => _busy = true);

    try {
      final dashboard = await _tripService.setAvailability(
        token: _profile.token,
        online: value,
      );
      _applyDashboard(dashboard);
    } on SessionExpiredException {
      await _logout();
    } on BackendApiException catch (error) {
      if (mounted) _message(error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _acceptNext() async {
    if (_busy || !_online || _entries.isEmpty || _ride.isNotEmpty) return;
    setState(() => _busy = true);

    try {
      final result = await _tripService.acceptNextPassenger(
        token: _profile.token,
      );
      final dashboard = _map(result['dashboard']);
      if (dashboard.isNotEmpty) _applyDashboard(dashboard);
      if (mounted) {
        final ride = _map(result['ride']);
        _message(
          ride.isEmpty
              ? 'No passengers are waiting right now'
              : 'Accepted ${_text(ride['passengerName']) ?? 'next passenger'}',
        );
      }
    } on SessionExpiredException {
      await _logout();
    } on BackendApiException catch (error) {
      if (mounted) _message(error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _updateRide(String status) async {
    final rideId = _text(_ride['id']);
    if (_busy || rideId == null || rideId.isEmpty) return;
    setState(() => _busy = true);

    try {
      final result = await _tripService.updateRideStatus(
        token: _profile.token,
        rideId: rideId,
        status: status,
      );
      final dashboard = _map(result['dashboard']);
      if (dashboard.isNotEmpty) _applyDashboard(dashboard);
      if (mounted) {
        _message(
          status == 'arrived' ? 'Ride marked as arrived' : 'Ride completed',
        );
      }
    } on SessionExpiredException {
      await _logout();
    } on BackendApiException catch (error) {
      if (mounted) _message(error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _logout() async {
    _timer?.cancel();
    await _authService.clearSession();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => const DriverLoginScreen()),
    );
  }

  void _message(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Map<String, dynamic> _map(dynamic value) {
    if (value is Map) return Map<String, dynamic>.from(value);
    return <String, dynamic>{};
  }

  List<Map<String, dynamic>> _list(dynamic value) {
    if (value is! List) return <Map<String, dynamic>>[];
    return value
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  Set<String> _entryIds(List<Map<String, dynamic>> entries) {
    return entries
        .map(
          (entry) =>
              _text(entry['id']) ??
              _text(entry['passengerId']) ??
              '${_text(entry['passengerName']) ?? 'passenger'}-${_text(entry['joinedAt']) ?? _text(entry['pickupLabel']) ?? ''}',
        )
        .toSet();
  }

  String? _text(dynamic value) {
    final text = value?.toString().trim();
    if (text == null || text.isEmpty) return null;
    return text;
  }

  bool _bool(dynamic value) {
    if (value is bool) return value;
    if (value is String) return value.toLowerCase() == 'true';
    return false;
  }

  int _int(dynamic value, {int fallback = 0}) {
    if (value is num) return value.round();
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }

  double _double(dynamic value, {double fallback = 0}) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? fallback;
  }

  String _titleCase(String value) {
    return value
        .replaceAll('_', ' ')
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .map((p) => p[0].toUpperCase() + p.substring(1))
        .join(' ');
  }

  String _firstName(String value) {
    final parts = value.trim().split(RegExp(r'\s+'));
    return parts.isNotEmpty && parts.first.isNotEmpty ? parts.first : 'Driver';
  }

  String _vehicleSummary(Map<String, dynamic> vehicle) {
    final parts = [
      _text(vehicle['brand']),
      _text(vehicle['model']),
      _text(vehicle['plateNumber']),
      _text(vehicle['color']),
    ].whereType<String>().toList();
    return parts.isEmpty ? 'Vehicle pending' : parts.join(' - ');
  }

  String _money(dynamic value) {
    final amount = _double(value);
    return 'ETB ${amount % 1 == 0 ? amount.toStringAsFixed(0) : amount.toStringAsFixed(2)}';
  }

  Widget _tile(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF5FBFB),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFD7ECE9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: DriverColors.muted, fontSize: 13),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }

  Widget _statusCard() {
    final subtitle = _ride.isNotEmpty
        ? 'A ride is active'
        : _entries.isNotEmpty
        ? 'Passengers are waiting in $_queueName'
        : 'No passengers are waiting right now';

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: _online
              ? const LinearGradient(
                  colors: [DriverColors.teal, Color(0xFF22877F)],
                )
              : const LinearGradient(
                  colors: [Color(0xFF29415A), Color(0xFF364C67)],
                ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'STATUS',
                    style: TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _online ? 'You are online' : 'Go online',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(subtitle, style: const TextStyle(color: Colors.white70)),
                ],
              ),
            ),
            Switch.adaptive(
              value: _online,
              onChanged: _busy
                  ? null
                  : (value) {
                      _setOnline(value);
                    },
              activeThumbColor: DriverColors.teal,
              activeTrackColor: Colors.white70,
            ),
          ],
        ),
      ),
    );
  }

  Widget _rideCard() {
    if (_ride.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            _online
                ? 'No active ride. Accept the next passenger when ready.'
                : 'Go online to start receiving rides.',
          ),
        ),
      );
    }

    final status = _text(_ride['status']) ?? 'accepted';
    final actionStatus = status == 'arrived' ? 'completed' : 'arrived';
    final actionLabel = status == 'arrived' ? 'Complete ride' : 'Mark arrived';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Active ride',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                ),
                Chip(label: Text(_titleCase(status))),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              _text(_ride['passengerName']) ?? 'Passenger',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            ),
            Text(
              _text(_ride['pickupLabel']) ?? 'Pickup pending',
              style: const TextStyle(color: DriverColors.muted),
            ),
            Text(
              _text(_ride['destinationLabel']) ?? 'Destination pending',
              style: const TextStyle(color: DriverColors.muted),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _tile('Fare', _money(_ride['fareEtb'])),
                _tile(
                  'Passengers',
                  '${_int(_ride['passengers'], fallback: 1)}',
                ),
                _tile('Vehicle', _text(_ride['vehiclePlate']) ?? 'Pending'),
              ],
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _busy
                  ? null
                  : () {
                      _updateRide(actionStatus);
                    },
              child: Text(actionLabel),
            ),
          ],
        ),
      ),
    );
  }

  Widget _entryCard(Map<String, dynamic> entry, {required bool highlight}) {
    return Card(
      color: highlight ? const Color(0xFFF5FBFB) : null,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFFEAF5F4),
          child: Text(
            '${_int(entry['position'])}',
            style: const TextStyle(
              color: DriverColors.teal,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        title: Text(_text(entry['passengerName']) ?? 'Passenger'),
        subtitle: Text(
          '${_text(entry['pickupLabel']) ?? 'Pickup pending'}\n${_text(entry['destinationLabel']) ?? 'Destination pending'}',
        ),
        isThreeLine: true,
        trailing: highlight && _online && _ride.isEmpty
            ? TextButton(
                onPressed: _busy
                    ? null
                    : () {
                        _acceptNext();
                      },
                child: const Text('Accept'),
              )
            : null,
      ),
    );
  }

  Widget _homeTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _statusCard(),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _tile('Queue', _queueName),
            _tile('Waiting', '${_entries.length}'),
            _tile('Completed today', '${_int(_dashboard?['completedToday'])}'),
          ],
        ),
        const SizedBox(height: 16),
        _rideCard(),
        const SizedBox(height: 16),
        const Text(
          'Next in queue',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 10),
        if (_entries.isEmpty)
          const Text('No riders are waiting right now.')
        else
          ..._entries.asMap().entries.map(
            (entry) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _entryCard(entry.value, highlight: entry.key == 0),
            ),
          ),
      ],
    );
  }

  Widget _queueTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _tile('Queue', _queueName),
            _tile('Average wait', '${_int(_queue['averageWaitMinutes'])} min'),
            _tile('Status', _titleCase(_text(_driver['status']) ?? 'offline')),
            _tile('Capacity', '${_int(_queue['capacity'])}'),
          ],
        ),
        const SizedBox(height: 16),
        if (_online && _entries.isNotEmpty && _ride.isEmpty)
          FilledButton(
            onPressed: _busy
                ? null
                : () {
                    _acceptNext();
                  },
            child: const Text('Accept next passenger'),
          ),
        const SizedBox(height: 12),
        ..._entries.asMap().entries.map(
          (entry) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _entryCard(entry.value, highlight: entry.key == 0),
          ),
        ),
      ],
    );
  }

  Widget _earningsTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Today',
                  style: TextStyle(color: DriverColors.muted),
                ),
                const SizedBox(height: 6),
                Text(
                  _money(_earnings['today']),
                  style: const TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                const Text('Backend revenue snapshot'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _tile('Today', _money(_earnings['today'])),
            _tile('Week', _money(_earnings['week'])),
            _tile('Month', _money(_earnings['month'])),
            _tile('Total', _money(_earnings['total'])),
          ],
        ),
      ],
    );
  }

  Widget _profileTab() {
    final vehicle = _map(_driver['vehicle']);
    final documents = _map(_driver['documents']);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _profile.fullName,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _profile.phoneNumber,
                  style: const TextStyle(color: DriverColors.muted),
                ),
                const SizedBox(height: 12),
                _tile('Queue', _queueName),
                const SizedBox(height: 10),
                _tile(
                  'Vehicle',
                  _profile.vehicleInfo.isNotEmpty
                      ? _profile.vehicleInfo
                      : _vehicleSummary(vehicle),
                ),
                const SizedBox(height: 10),
                _tile(
                  'Documents',
                  _text(documents['lastUploadedDocumentType']) ??
                      'None uploaded',
                ),
                const SizedBox(height: 10),
                _tile(
                  'Driver ID',
                  _profile.driverId.isNotEmpty
                      ? _profile.driverId
                      : _text(_driver['id']) ?? 'Pending',
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.tonalIcon(
          onPressed: () {
            _logout();
          },
          icon: const Icon(Icons.logout_rounded),
          label: const Text('Log out'),
        ),
      ],
    );
  }

  Widget _loadingView() {
    return const Center(child: CircularProgressIndicator());
  }

  Widget _body() {
    if (_loading && _dashboard == null) return _loadingView();

    return RefreshIndicator(
      onRefresh: () => _loadDashboard(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
        child: switch (_tab) {
          1 => _queueTab(),
          2 => _earningsTab(),
          3 => _profileTab(),
          _ => _homeTab(),
        },
      ),
    );
  }

  Widget _bottomNav() {
    return BottomNavigationBar(
      currentIndex: _tab,
      onTap: (index) => setState(() => _tab = index),
      type: BottomNavigationBarType.fixed,
      selectedItemColor: DriverColors.teal,
      unselectedItemColor: const Color(0xFF97A6BE),
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.home_rounded), label: 'Home'),
        BottomNavigationBarItem(
          icon: Icon(Icons.format_list_bulleted_rounded),
          label: 'Queue',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.payments_rounded),
          label: 'Earnings',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person_rounded),
          label: 'Profile',
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DriverColors.softBackground,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: DriverColors.ink,
        elevation: 0,
        title: Text('Welcome, ${_firstName(_profile.fullName)}'),
        actions: [
          IconButton(
            onPressed: _refreshing
                ? null
                : () {
                    _loadDashboard();
                  },
            icon: const Icon(Icons.refresh_rounded),
          ),
          IconButton(
            onPressed: () {
              _logout();
            },
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: _body(),
      bottomNavigationBar: _bottomNav(),
    );
  }
}
