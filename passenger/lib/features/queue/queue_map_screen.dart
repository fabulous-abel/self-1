import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter/services.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/services/queue_api_service.dart';
import '../../core/theme/app_theme.dart';
import '../auth/passenger_profile.dart';

class PassengerMapScreen extends StatefulWidget {
  const PassengerMapScreen({super.key, required this.profile});

  final PassengerProfile profile;

  @override
  State<PassengerMapScreen> createState() => _PassengerMapScreenState();
}

class _PassengerMapScreenState extends State<PassengerMapScreen> {
  static const _tabs = [
    'Nearby Queues',
    'Queue Details',
    'Recent Activity',
    'Profile',
  ];
  static const _labels = ['Map', 'Queues', 'Activity', 'Profile'];
  static const _icons = [
    Icons.map_rounded,
    Icons.format_list_bulleted_rounded,
    Icons.history_rounded,
    Icons.person_rounded,
  ];
  static const _fallbackQueues = [
    _QueueItem(
      backendId: 'bole-airport',
      title: 'Bole Airport Stand',
      subtitle: 'Taxi lane with fast turnover and airport pickups.',
      route: 'Airport Terminal to Bole Atlas',
      waitTime: '15 min',
      seatsOpen: 24,
      distance: '0.8 km away',
      pickupNote: 'Pickup gate 2, opposite the taxi marshal booth.',
      color: PassengerColors.orange,
      icon: Icons.local_taxi_rounded,
      point: LatLng(8.9897, 38.7994),
      keywords: ['airport', 'bole', 'atlas', 'taxi', 'terminal'],
    ),
    _QueueItem(
      backendId: 'mexico-square',
      title: 'Mexico Square Hub',
      subtitle: 'Bus queue with the shortest public route wait.',
      route: 'Mexico Square to Piassa',
      waitTime: '8 min',
      seatsOpen: 31,
      distance: '1.1 km away',
      pickupNote: 'North gate, next to the blue bus shelter.',
      color: PassengerColors.blue,
      icon: Icons.directions_bus_filled_rounded,
      point: LatLng(9.0106, 38.7612),
      keywords: ['mexico', 'bus', 'piassa', 'square', 'public'],
    ),
    _QueueItem(
      backendId: 'piassa-hub',
      title: 'Kazanchis Pickup',
      subtitle: 'Shared ride queue close to offices and hotels.',
      route: 'Kazanchis to Meskel Square',
      waitTime: '12 min',
      seatsOpen: 18,
      distance: '0.6 km away',
      pickupNote: 'Hotel-side layby near the main boulevard.',
      color: PassengerColors.peach,
      icon: Icons.groups_rounded,
      point: LatLng(9.0198, 38.7807),
      keywords: ['kazanchis', 'shared', 'meskel', 'hotel', 'office'],
    ),
  ];

  final MapController _mapController = MapController();
  final DraggableScrollableController _sheetController =
      DraggableScrollableController();
  late final TextEditingController _searchController;
  late List<_QueueItem> _queues;

  int _selectedTab = 0;
  late _QueueItem _selectedQueue;
  String? _expandedQueueId;
  String _query = '';
  double _sheetExtent = 0.38;
  double _mapZoom = 13.4;
  LatLng _mapCenter = _fallbackQueues.first.point;

  // ── Live queue state ───────────────────────────────────────────
  String? _activeQueueId; // backend ID of the joined queue
  int? _queuePosition; // current position (1 = next)
  int? _estimatedWaitMinutes;
  bool _yourTurn = false;
  bool _isJoining = false;
  bool _isLeaving = false;
  MatchedRide? _matchedRide;
  VoidCallback? _cancelSocketSub; // call to unsubscribe
  int _nearbyDrivers = 0;
  Timer? _nearbyTimer;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
    _queues = List<_QueueItem>.of(_fallbackQueues);
    _selectedQueue = _queues.first;
    _expandedQueueId = _selectedQueue.backendId;
    unawaited(_loadQueues());
    unawaited(_initLocation());
  }

  @override
  void dispose() {
    _nearbyTimer?.cancel();
    _cancelSocketSub?.call();
    QueueApiService.instance.disconnectSocket();
    _searchController.dispose();
    _sheetController.dispose();
    _mapController.dispose();
    super.dispose();
  }

  List<_QueueItem> get _visibleQueues => _filterQueues(_query);

  Future<void> _initLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    if (permission == LocationPermission.deniedForever) return;

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      if (!mounted) return;

      final userPoint = LatLng(position.latitude, position.longitude);
      _moveMap(userPoint, zoom: 14.5);
    } catch (e) {
      debugPrint('[PassengerMap] could not get initial position: $e');
    }

    // Start polling for nearby drivers
    _updateNearbyDrivers();
    _nearbyTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _updateNearbyDrivers();
    });
  }

  Future<void> _updateNearbyDrivers() async {
    try {
      final count = await QueueApiService.instance.getNearbyDriversCount();
      if (mounted) {
        setState(() => _nearbyDrivers = count);
      }
    } catch (_) {}
  }

  Future<void> _loadQueues() async {
    try {
      final summaries = await QueueApiService.instance.listQueues();
      if (!mounted) return;

      if (summaries.isEmpty) {
        return;
      }

      final nextQueues = summaries
          .asMap()
          .entries
          .map((entry) => _queueFromSummary(entry.value, entry.key))
          .toList();
      final selectedQueue =
          nextQueues.any((queue) => queue.backendId == _selectedQueue.backendId)
          ? nextQueues.firstWhere(
              (queue) => queue.backendId == _selectedQueue.backendId,
            )
          : nextQueues.first;
      final hasExpandedQueue =
          _expandedQueueId != null &&
          nextQueues.any((queue) => queue.backendId == _expandedQueueId);
      final hasActiveQueue =
          _activeQueueId != null &&
          nextQueues.any((queue) => queue.backendId == _activeQueueId);

      setState(() {
        _queues = nextQueues;
        _selectedQueue = selectedQueue;
        _expandedQueueId = hasExpandedQueue
            ? _expandedQueueId
            : selectedQueue.backendId;
        if (!hasActiveQueue) {
          _activeQueueId = null;
          _queuePosition = null;
          _estimatedWaitMinutes = null;
          _yourTurn = false;
        }
      });
    } catch (error) {
      debugPrint('[PassengerMap] queue sync failed: $error');
      if (!mounted) return;
    }
  }

  _QueueItem _queueFromSummary(QueueSummary summary, int index) {
    final point = (summary.latitude == 0 && summary.longitude == 0)
        ? _fallbackPoint(index)
        : LatLng(summary.latitude, summary.longitude);
    final color = <Color>[
      PassengerColors.orange,
      PassengerColors.blue,
      PassengerColors.peach,
      PassengerColors.teal,
    ][index % 4];
    final icon = _iconForQueueType(summary.type);
    final keywords = summary.name
        .toLowerCase()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();

    return _QueueItem(
      backendId: summary.id,
      title: summary.name,
      subtitle: '${summary.type} queue synced from admin places.',
      route: 'Pickup at ${summary.name}',
      waitTime: '${summary.averageWaitMinutes} min',
      seatsOpen: summary.capacity > 0 ? summary.capacity : 4,
      distance: summary.waitingCount == 0
          ? 'No one waiting'
          : '${summary.waitingCount} waiting',
      pickupNote: 'Live pickup point managed from the admin panel.',
      color: color,
      icon: icon,
      point: point,
      keywords: <String>[
        ...keywords,
        summary.type.toLowerCase(),
        'queue',
        'pickup',
        'dispatch',
      ],
    );
  }

  LatLng _fallbackPoint(int index) {
    final row = index ~/ 3;
    final column = index % 3;
    return LatLng(
      8.985 + (row * 0.014) + (column * 0.0055),
      38.755 + (column * 0.011) + (row * 0.0045),
    );
  }

  IconData _iconForQueueType(String type) {
    final normalized = type.toLowerCase();
    if (normalized.contains('bus')) {
      return Icons.directions_bus_filled_rounded;
    }
    if (normalized.contains('taxi')) {
      return Icons.local_taxi_rounded;
    }
    return Icons.groups_rounded;
  }

  List<_QueueItem> _filterQueues(String query) {
    final normalized = query.trim().toLowerCase();
    if (normalized.isEmpty) {
      return _queues;
    }

    return _queues.where((queue) => queue.matches(normalized)).toList();
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _playMatchAlert() async {
    try {
      await HapticFeedback.vibrate();
      await SystemSound.play(SystemSoundType.alert);
    } catch (_) {}
  }

  void _applyPositionUpdate(PositionUpdate update, _QueueItem queue) {
    final becameYourTurn = !_yourTurn && update.yourTurn;

    setState(() {
      _queuePosition = update.position;
      _estimatedWaitMinutes = update.estimatedWaitMinutes;
      _yourTurn = update.yourTurn;
    });

    if (becameYourTurn) {
      unawaited(_playMatchAlert());
      _showMessage('It is your turn. Head to ${queue.title}.');
    }
  }

  void _handleMatchedRide(MatchedRide ride) {
    _cancelSocketSub?.call();
    _cancelSocketSub = null;

    final matchedQueue = _queues.any((queue) => queue.backendId == ride.queueId)
        ? _queues.firstWhere((queue) => queue.backendId == ride.queueId)
        : _selectedQueue;

    setState(() {
      _matchedRide = ride;
      _selectedQueue = matchedQueue;
      _expandedQueueId = matchedQueue.backendId;
      _activeQueueId = null;
      _queuePosition = null;
      _estimatedWaitMinutes = null;
      _yourTurn = false;
      _selectedTab = 1;
    });

    unawaited(_playMatchAlert());
    _showMessage(
      'Matched with ${ride.driverName}. Pickup at ${ride.pickupLabel}.',
    );
  }

  void _onSearchChanged(String value) {
    final matches = _filterQueues(value);

    setState(() {
      _query = value.trim();
      if (matches.isNotEmpty && !matches.contains(_selectedQueue)) {
        _selectedQueue = matches.first;
        _expandedQueueId = matches.first.backendId;
      } else if (matches.isNotEmpty &&
          !matches.any((queue) => queue.backendId == _expandedQueueId)) {
        _expandedQueueId = matches.first.backendId;
      }
      if (matches.isEmpty && _selectedTab == 1) {
        _selectedTab = 0;
      }
      if (matches.isEmpty) {
        _expandedQueueId = null;
      }
    });

    if (matches.isNotEmpty) {
      _moveMap(matches.first.point, zoom: _mapZoom < 14 ? 14 : _mapZoom);
    }
  }

  void _onSearchSubmitted(String value) {
    final matches = _filterQueues(value);
    if (matches.isEmpty) {
      _showMessage('No queues matched "${value.trim()}"');
      return;
    }

    _focusQueue(matches.first, tab: 1, zoom: 15);
  }

  void _clearSearch() {
    _searchController.clear();
    _onSearchChanged('');
  }

  void _selectQueue(_QueueItem queue, {int? tab, bool expandCard = true}) {
    setState(() {
      _selectedQueue = queue;
      if (expandCard) {
        _expandedQueueId = queue.backendId;
      }
      if (tab != null) {
        _selectedTab = tab;
      }
    });
  }

  void _focusQueue(_QueueItem queue, {int? tab, double zoom = 15}) {
    _selectQueue(queue, tab: tab);
    _moveMap(queue.point, zoom: zoom);
  }

  Future<void> _joinQueue(_QueueItem queue) async {
    final token = widget.profile.token;
    if (token == null) {
      _showMessage('Server offline — cannot join queue right now.');
      return;
    }
    if (_matchedRide != null) {
      _showMessage('A driver is already assigned to you.');
      return;
    }
    if (_activeQueueId != null) {
      _showMessage('Leave your current queue first.');
      return;
    }

    setState(() => _isJoining = true);
    _selectQueue(queue, tab: 1);

    try {
      final result = await QueueApiService.instance.joinQueue(
        queue.backendId,
        token,
      );
      if (result == null) throw Exception('No response from server.');

      setState(() {
        _activeQueueId = queue.backendId;
        _queuePosition = result.position;
        _estimatedWaitMinutes = result.estimatedWaitMinutes;
        _yourTurn = result.yourTurn;
        _matchedRide = null;
      });

      if (result.yourTurn) {
        unawaited(_playMatchAlert());
      }

      // Subscribe to real-time position updates
      _cancelSocketSub?.call();
      _cancelSocketSub = QueueApiService.instance.subscribeToQueue(
        queue.backendId,
        token,
        (update) {
          if (!mounted) return;
          _applyPositionUpdate(update, queue);
        },
        _handleMatchedRide,
      );

      final pos = result.position;
      final wait = result.estimatedWaitMinutes;
      _showMessage(
        result.yourTurn
            ? '🔔 It\'s your turn! Head to ${queue.title}.'
            : 'Joined ${queue.title}. You are #$pos · ~$wait min wait.',
      );
    } catch (e) {
      _showMessage(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isJoining = false);
    }
  }

  Future<void> _leaveQueue() async {
    final queueId = _activeQueueId;
    final token = widget.profile.token;
    if (queueId == null || token == null) return;

    setState(() => _isLeaving = true);
    try {
      await QueueApiService.instance.leaveQueue(queueId, token);
      _cancelSocketSub?.call();
      _cancelSocketSub = null;
      setState(() {
        _activeQueueId = null;
        _queuePosition = null;
        _estimatedWaitMinutes = null;
        _yourTurn = false;
      });
      _showMessage('You left the queue.');
    } catch (e) {
      _showMessage(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLeaving = false);
    }
  }

  void _moveMap(LatLng center, {double? zoom}) {
    final nextZoom = zoom ?? _mapZoom;
    _mapCenter = center;
    _mapZoom = nextZoom;
    _mapController.move(center, nextZoom);
  }

  void _zoomMap(double delta) {
    final nextZoom = (_mapZoom + delta).clamp(12.0, 18.0);
    _moveMap(_mapCenter, zoom: nextZoom);
  }

  void _toggleQueueCard(_QueueItem queue, bool compact) {
    final shouldExpand = _expandedQueueId != queue.backendId;

    setState(() {
      _selectedQueue = queue;
      _expandedQueueId = shouldExpand ? queue.backendId : null;
    });

    _moveMap(queue.point, zoom: _mapZoom < 14 ? 14 : _mapZoom);

    final previewSize = _midSheetSize(compact);
    if (shouldExpand && _sheetExtent < previewSize - 0.02) {
      _sheetController.animateTo(
        previewSize,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    }
  }

  void _openQueueDetails(_QueueItem queue, bool compact) {
    _focusQueue(queue, tab: 1);

    final previewSize = _midSheetSize(compact);
    if (_sheetExtent < previewSize - 0.02) {
      _sheetController.animateTo(
        previewSize,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    }
  }

  // Bottom nav bar height in logical pixels (approx 68px).
  static const double _navBarHeight = 68.0;

  double _collapsedSheetSize(bool compact, double screenH) =>
      (_navBarHeight + (compact ? 84 : 78)) / screenH;

  double _midSheetSize(bool compact) => compact ? 0.38 : 0.34;

  double _expandedSheetSize(bool compact) => compact ? 0.90 : 0.80;

  void _toggleSheet(bool compact, double screenH) {
    final collapsed = _collapsedSheetSize(compact, screenH);
    final mid = _midSheetSize(compact);
    final expanded = _expandedSheetSize(compact);

    // Cycle: collapsed → mid → expanded → back to mid
    double target;
    if (_sheetExtent < collapsed + 0.05) {
      target = mid;
    } else if (_sheetExtent < mid + 0.08) {
      target = expanded;
    } else {
      target = mid;
    }

    _sheetController.animateTo(
      target,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
    );
  }

  Widget _buildPanelContent({
    required bool compact,
    required ScrollController scrollController,
  }) {
    final visibleQueues = _visibleQueues;

    if (visibleQueues.isEmpty) {
      return ListView(
        controller: scrollController,
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
        children: [EmptySearchState(query: _query)],
      );
    }

    // Live status card – shown at the top of every tab when in a queue
    final activeQueue = _activeQueueId == null
        ? null
        : _queues.where((q) => q.backendId == _activeQueueId).firstOrNull;

    Widget? statusCard;
    if (_matchedRide != null) {
      statusCard = _MatchedRideCard(ride: _matchedRide!);
    } else if (activeQueue != null && _queuePosition != null) {
      statusCard = _LiveStatusCard(
        queue: activeQueue,
        position: _queuePosition!,
        estimatedWait: _estimatedWaitMinutes ?? 0,
        yourTurn: _yourTurn,
        isLeaving: _isLeaving,
        onLeave: _leaveQueue,
      );
    }

    switch (_selectedTab) {
      case 1:
        return ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
          children: [
            if (statusCard != null) ...[statusCard, const SizedBox(height: 12)],
            _detailCard(compact),
            const SizedBox(height: 12),
            ...visibleQueues
                .where((queue) => queue != _selectedQueue)
                .map(
                  (queue) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _queueCard(
                      queue,
                      compact,
                      'Switch',
                      showDetailAction: false,
                    ),
                  ),
                ),
          ],
        );
      case 2:
        return ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
          children: [
            if (statusCard != null) ...[statusCard, const SizedBox(height: 12)],
            _ActivityTile(
              title: 'Queue joined',
              subtitle:
                  '${widget.profile.fullName} joined ${_selectedQueue.title} today.',
            ),
            const SizedBox(height: 12),
            const _ActivityTile(
              title: 'Search used',
              subtitle: 'Destination search is now active from the map header.',
            ),
            const SizedBox(height: 12),
            const _ActivityTile(
              title: 'Profile ready',
              subtitle:
                  'Avatar and full passenger details are visible to dispatchers.',
            ),
          ],
        );
      case 3:
        return _buildProfileTab(scrollController);
      default:
        return ListView.separated(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
          itemCount: visibleQueues.length + (statusCard != null ? 1 : 0),
          separatorBuilder: (context, index) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            if (statusCard != null && index == 0) return statusCard;
            final qIndex = statusCard != null ? index - 1 : index;
            return _queueCard(visibleQueues[qIndex], compact, 'Join');
          },
        );
    }
  }

  Widget _buildProfileTab(ScrollController scrollController) {
    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FBFF),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFE6EDF5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: PassengerColors.teal,
                    child: Text(
                      widget.profile.initials,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.profile.fullName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.profile.email,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF6B7E9D),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _ProfileLine(
                icon: Icons.phone_rounded,
                label: 'Phone',
                value: widget.profile.phoneLabel,
              ),
              const SizedBox(height: 12),
              _ProfileLine(
                icon: Icons.route_rounded,
                label: 'Preferred queue',
                value: _selectedQueue.title,
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: const [
                  Chip(label: Text('Passenger verified')),
                  Chip(label: Text('Search enabled')),
                  Chip(label: Text('Map active')),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        ListTile(
          tileColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: Color(0xFFE6EDF5)),
          ),
          leading: const Icon(
            Icons.support_agent_rounded,
            color: PassengerColors.teal,
          ),
          title: const Text('Contact support'),
          subtitle: const Text('Get help with queue access or bookings'),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => _showMessage('Support will reach out shortly'),
        ),
      ],
    );
  }

  Widget _detailCard(bool compact) {
    final isActive = _selectedQueue.backendId == _activeQueueId;
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8FBFF),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE6EDF5)),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: true,
          tilePadding: const EdgeInsets.all(18),
          childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
          title: Row(
            children: [
              Expanded(
                child: Text(
                  _selectedQueue.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: _selectedQueue.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  _selectedQueue.waitTime,
                  style: TextStyle(
                    color: _selectedQueue.color,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _selectedQueue.route,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: PassengerColors.ink,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _selectedQueue.subtitle,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF6B7E9D),
                  ),
                ),
              ],
            ),
          ),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  Chip(label: Text('Wait ${_selectedQueue.waitTime}')),
                  Chip(label: Text('${_selectedQueue.seatsOpen} seats open')),
                  Chip(label: Text(_selectedQueue.distance)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                _selectedQueue.pickupNote,
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF5F7392),
                  height: 1.4,
                ),
              ),
            ),
            const SizedBox(height: 16),
            compact
                ? Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        child: isActive
                            ? OutlinedButton.icon(
                                onPressed: _isLeaving ? null : _leaveQueue,
                                icon: _isLeaving
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Icon(Icons.exit_to_app_rounded),
                                label: Text(
                                  _isLeaving ? 'Leaving...' : 'Leave queue',
                                ),
                              )
                            : FilledButton.icon(
                                onPressed:
                                    (_isJoining ||
                                        _activeQueueId != null ||
                                        _matchedRide != null)
                                    ? null
                                    : () => _joinQueue(_selectedQueue),
                                icon: _isJoining
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Icon(Icons.add_rounded),
                                label: Text(
                                  _isJoining
                                      ? 'Joining...'
                                      : 'Join selected queue',
                                ),
                              ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () => _focusQueue(_selectedQueue),
                          child: const Text('Center on map'),
                        ),
                      ),
                    ],
                  )
                : Row(
                    children: [
                      Expanded(
                        child: isActive
                            ? OutlinedButton.icon(
                                onPressed: _isLeaving ? null : _leaveQueue,
                                icon: _isLeaving
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Icon(Icons.exit_to_app_rounded),
                                label: Text(
                                  _isLeaving ? 'Leaving...' : 'Leave queue',
                                ),
                              )
                            : FilledButton.icon(
                                onPressed:
                                    (_isJoining ||
                                        _activeQueueId != null ||
                                        _matchedRide != null)
                                    ? null
                                    : () => _joinQueue(_selectedQueue),
                                icon: _isJoining
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Icon(Icons.add_rounded),
                                label: Text(
                                  _isJoining
                                      ? 'Joining...'
                                      : 'Join selected queue',
                                ),
                              ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => _focusQueue(_selectedQueue),
                          child: const Text('Center on map'),
                        ),
                      ),
                    ],
                  ),
          ],
        ),
      ),
    );
  }

  Widget _queueMetaPill(
    String label, {
    IconData? icon,
    Color color = const Color(0xFF6B7E9D),
    bool emphasized = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: emphasized ? 0.14 : 0.09),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _queueCard(
    _QueueItem queue,
    bool compact,
    String action, {
    bool showDetailAction = true,
  }) {
    final selected = queue == _selectedQueue;
    final isThisActive = queue.backendId == _activeQueueId;
    final canJoin =
        !_isJoining && _activeQueueId == null && _matchedRide == null;
    final expanded = _expandedQueueId == queue.backendId;
    final joiningThisQueue = _isJoining && queue == _selectedQueue;
    final leavingThisQueue = _isLeaving && isThisActive;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        color: isThisActive
            ? PassengerColors.teal.withValues(alpha: 0.06)
            : selected
            ? const Color(0xFFFFF6F0)
            : const Color(0xFFF8FBFF),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isThisActive
              ? PassengerColors.teal.withValues(alpha: 0.36)
              : selected
              ? queue.color.withValues(alpha: 0.36)
              : const Color(0xFFE6EDF5),
        ),
        boxShadow: expanded
            ? [
                BoxShadow(
                  color: queue.color.withValues(alpha: 0.08),
                  blurRadius: 18,
                  offset: const Offset(0, 10),
                ),
              ]
            : const [],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _toggleQueueCard(queue, compact),
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      height: 58,
                      width: 58,
                      decoration: BoxDecoration(
                        color: queue.color.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Icon(queue.icon, color: queue.color, size: 25),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            queue.title,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            queue.route,
                            maxLines: expanded ? 2 : 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: PassengerColors.ink,
                            ),
                          ),
                          const SizedBox(height: 8),
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 180),
                            child: expanded
                                ? Text(
                                    queue.subtitle,
                                    key: ValueKey(
                                      'expanded-${queue.backendId}',
                                    ),
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: Color(0xFF6B7E9D),
                                      height: 1.45,
                                    ),
                                  )
                                : Wrap(
                                    key: ValueKey(
                                      'collapsed-${queue.backendId}',
                                    ),
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      _queueMetaPill(
                                        queue.waitTime,
                                        icon: Icons.schedule_rounded,
                                        color: queue.color,
                                      ),
                                      _queueMetaPill(
                                        queue.distance,
                                        icon: Icons.near_me_rounded,
                                      ),
                                    ],
                                  ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        _queueMetaPill(
                          isThisActive ? 'Active' : '${queue.seatsOpen} open',
                          icon: isThisActive
                              ? Icons.check_circle_rounded
                              : Icons.event_seat_rounded,
                          color: isThisActive
                              ? PassengerColors.teal
                              : queue.color,
                          emphasized: true,
                        ),
                        const SizedBox(height: 10),
                        AnimatedRotation(
                          turns: expanded ? 0.5 : 0,
                          duration: const Duration(milliseconds: 220),
                          curve: Curves.easeOutCubic,
                          child: const Icon(
                            Icons.keyboard_arrow_down_rounded,
                            color: Color(0xFF8A98B3),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                ClipRect(
                  child: AnimatedSize(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                    child: expanded
                        ? Padding(
                            padding: const EdgeInsets.only(top: 14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    _queueMetaPill(
                                      queue.waitTime,
                                      icon: Icons.schedule_rounded,
                                      color: queue.color,
                                    ),
                                    _queueMetaPill(
                                      queue.distance,
                                      icon: Icons.near_me_rounded,
                                    ),
                                    _queueMetaPill(
                                      '${queue.seatsOpen} seats open',
                                      icon: Icons.event_seat_rounded,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  queue.pickupNote,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF5F7392),
                                    height: 1.45,
                                  ),
                                ),
                                const SizedBox(height: 14),
                                OverflowBar(
                                  spacing: 10,
                                  overflowSpacing: 10,
                                  alignment: MainAxisAlignment.start,
                                  children: [
                                    if (showDetailAction)
                                      OutlinedButton.icon(
                                        onPressed: () =>
                                            _openQueueDetails(queue, compact),
                                        icon: const Icon(
                                          Icons.open_in_full_rounded,
                                          size: 18,
                                        ),
                                        label: const Text('Details'),
                                      ),
                                    isThisActive
                                        ? OutlinedButton.icon(
                                            onPressed: leavingThisQueue
                                                ? null
                                                : _leaveQueue,
                                            icon: leavingThisQueue
                                                ? const SizedBox(
                                                    width: 16,
                                                    height: 16,
                                                    child:
                                                        CircularProgressIndicator(
                                                          strokeWidth: 2,
                                                        ),
                                                  )
                                                : const Icon(
                                                    Icons.exit_to_app_rounded,
                                                    size: 18,
                                                  ),
                                            label: Text(
                                              leavingThisQueue
                                                  ? 'Leaving...'
                                                  : 'Leave queue',
                                            ),
                                          )
                                        : FilledButton.icon(
                                            onPressed: canJoin
                                                ? () => _joinQueue(queue)
                                                : null,
                                            style: FilledButton.styleFrom(
                                              backgroundColor: queue.color,
                                            ),
                                            icon: joiningThisQueue
                                                ? const SizedBox(
                                                    width: 16,
                                                    height: 16,
                                                    child:
                                                        CircularProgressIndicator(
                                                          strokeWidth: 2,
                                                          color: Colors.white,
                                                        ),
                                                  )
                                                : const Icon(
                                                    Icons.add_rounded,
                                                    size: 18,
                                                  ),
                                            label: Text(
                                              joiningThisQueue
                                                  ? 'Joining...'
                                                  : action,
                                            ),
                                          ),
                                  ],
                                ),
                              ],
                            ),
                          )
                        : const SizedBox.shrink(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMap(bool compact) {
    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: _queues.first.point,
        initialZoom: _mapZoom,
        minZoom: 11,
        maxZoom: 18,
        onPositionChanged: (camera, hasGesture) {
          _mapCenter = camera.center;
          _mapZoom = camera.zoom;
        },
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.example.selfqueue_passenger',
          maxNativeZoom: 19,
        ),
        MarkerLayer(
          markers: _visibleQueues
              .map(
                (queue) => Marker(
                  point: queue.point,
                  width: compact ? 128 : 148,
                  height: compact ? 92 : 100,
                  child: _MapMarker(
                    queue: queue,
                    selected: queue == _selectedQueue,
                    onTap: () => _focusQueue(queue, tab: 1),
                  ),
                ),
              )
              .toList(),
        ),
        RichAttributionWidget(
          attributions: const [
            TextSourceAttribution('OpenStreetMap contributors'),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PassengerColors.shell,
      // No drawer — navigation is now always visible in the bottom bar.
      body: SafeArea(
        bottom: false,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact =
                constraints.maxWidth < 390 || constraints.maxHeight < 720;
            final screenH = constraints.maxHeight;
            final collapsedSize = _collapsedSheetSize(compact, screenH);
            final midSize = _midSheetSize(compact);
            final expandedSize = _expandedSheetSize(compact);

            return Stack(
              children: [
                // ── Map layer ─────────────────────────────────────────────
                Positioned.fill(child: _buildMap(compact)),

                // ── Subtle vignette ────────────────────────────────────────
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.black.withValues(alpha: 0.16),
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.04),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        stops: const [0, 0.28, 1],
                      ),
                    ),
                  ),
                ),

                // ── Top header (avatar + search) ───────────────────────────
                Positioned(
                  left: 16,
                  right: 16,
                  top: compact ? 12 : 16,
                  child: Column(
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: compact ? 22 : 24,
                            backgroundColor: Colors.white,
                            child: Text(
                              widget.profile.initials,
                              style: const TextStyle(
                                color: PassengerColors.teal,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      'LinkEt Self',
                                      style: TextStyle(
                                        fontSize: compact ? 18 : 20,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white,
                                      ),
                                    ),
                                    if (_nearbyDrivers > 0) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.green.shade500,
                                          borderRadius:
                                              BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          '$_nearbyDrivers LIVE',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                Text(
                                  widget.profile.fullName,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xE6FFFFFF),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          _TopButton(
                            icon: Icons.notifications_rounded,
                            onTap: () => _showMessage('No new queue alerts'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Material(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        elevation: 10,
                        shadowColor: const Color(0x220B1736),
                        child: TextField(
                          controller: _searchController,
                          onChanged: _onSearchChanged,
                          onSubmitted: _onSearchSubmitted,
                          textInputAction: TextInputAction.search,
                          decoration: InputDecoration(
                            hintText: 'Search queue or destination',
                            filled: false,
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 18,
                              vertical: 16,
                            ),
                            prefixIcon: const Icon(
                              Icons.search_rounded,
                              color: PassengerColors.muted,
                            ),
                            suffixIcon: _query.isEmpty
                                ? const Icon(
                                    Icons.travel_explore_rounded,
                                    color: PassengerColors.orange,
                                  )
                                : IconButton(
                                    onPressed: _clearSearch,
                                    icon: const Icon(
                                      Icons.close_rounded,
                                      color: PassengerColors.muted,
                                    ),
                                  ),
                          ),
                        ),
                      ),
                      if (_query.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.92),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              '${_visibleQueues.length} result${_visibleQueues.length == 1 ? '' : 's'}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: PassengerColors.ink,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

                // ── Zoom controls (float above sheet) ─────────────────────
                Positioned(
                  right: 18,
                  bottom: constraints.maxHeight * _sheetExtent + 20,
                  child: Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    child: Column(
                      children: [
                        IconButton(
                          onPressed: () => _zoomMap(0.8),
                          icon: const Icon(Icons.add_rounded),
                        ),
                        const Divider(height: 1),
                        IconButton(
                          onPressed: () => _zoomMap(-0.8),
                          icon: const Icon(Icons.remove_rounded),
                        ),
                      ],
                    ),
                  ),
                ),

                // ── Draggable sheet ────────────────────────────────────────
                NotificationListener<DraggableScrollableNotification>(
                  onNotification: (notification) {
                    final nextExtent = notification.extent;
                    if ((nextExtent - _sheetExtent).abs() > 0.003 && mounted) {
                      setState(() => _sheetExtent = nextExtent);
                    }
                    return false;
                  },
                  child: DraggableScrollableSheet(
                    controller: _sheetController,
                    initialChildSize: midSize,
                    minChildSize: collapsedSize,
                    maxChildSize: expandedSize,
                    snap: true,
                    snapSizes: [collapsedSize, midSize, expandedSize],
                    builder: (context, scrollController) {
                      return Container(
                        width: double.infinity,
                        constraints: const BoxConstraints(maxWidth: 720),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.vertical(
                            top: Radius.circular(36),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Color(0x190B1736),
                              blurRadius: 28,
                              offset: Offset(0, -8),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            const SizedBox(height: 12),
                            // Drag handle + title row
                            GestureDetector(
                              onTap: () => _toggleSheet(compact, screenH),
                              behavior: HitTestBehavior.opaque,
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 20,
                                  vertical: 6,
                                ),
                                child: Column(
                                  children: [
                                    Container(
                                      height: 5,
                                      width: 44,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFD8E0EC),
                                        borderRadius: BorderRadius.circular(
                                          999,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 14),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            _tabs[_selectedTab],
                                            style: TextStyle(
                                              fontSize: compact ? 22 : 24,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                        ),
                                        _selectedTab == 0 && _query.isEmpty
                                            ? _queueMetaPill(
                                                '${_visibleQueues.length} nearby',
                                                icon: Icons.near_me_rounded,
                                                color: PassengerColors.teal,
                                                emphasized: true,
                                              )
                                            : TextButton(
                                                onPressed: () {
                                                  setState(
                                                    () => _selectedTab = 0,
                                                  );
                                                  if (_query.isNotEmpty) {
                                                    _clearSearch();
                                                  }
                                                },
                                                child: const Text('See all'),
                                              ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Expanded(
                              child: _buildPanelContent(
                                compact: compact,
                                scrollController: scrollController,
                              ),
                            ),
                            // Extra padding so content clears the nav bar
                            SizedBox(
                              height:
                                  _navBarHeight +
                                  MediaQuery.of(context).padding.bottom,
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

                // ── Bottom Navigation Bar (always on top) ─────────────────
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: _BottomNavBar(
                    selectedIndex: _selectedTab,
                    icons: _icons,
                    labels: _labels,
                    onTap: (index) {
                      setState(() => _selectedTab = index);
                      if (_query.isNotEmpty && index == 0) {
                        _clearSearch();
                      }
                      // Snap sheet to mid when switching tabs so content is visible
                      if (_sheetExtent < midSize - 0.04) {
                        _sheetController.animateTo(
                          midSize,
                          duration: const Duration(milliseconds: 280),
                          curve: Curves.easeOutCubic,
                        );
                      }
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _TopButton extends StatelessWidget {
  const _TopButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: SizedBox(height: 48, width: 48, child: Icon(icon, size: 24)),
      ),
    );
  }
}

// ── Live Status Card ──────────────────────────────────────────────────────────

class _MatchedRideCard extends StatelessWidget {
  const _MatchedRideCard({required this.ride});

  final MatchedRide ride;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PassengerColors.orange.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: PassengerColors.orange.withValues(alpha: 0.28),
        ),
      ),
      child: Row(
        children: [
          Container(
            height: 52,
            width: 52,
            decoration: BoxDecoration(
              color: PassengerColors.orange.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.local_taxi_rounded,
              color: PassengerColors.orange,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Driver matched',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: PassengerColors.orange,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '${ride.driverName} · ${ride.vehiclePlate.isEmpty ? 'Vehicle pending' : ride.vehiclePlate}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF4A6080),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  ride.pickupLabel.isEmpty
                      ? 'Pickup confirmed'
                      : 'Pickup at ${ride.pickupLabel}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF4A6080),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(
            ride.fareEtb <= 0 ? '' : 'ETB ${ride.fareEtb.toStringAsFixed(0)}',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: PassengerColors.orange,
            ),
          ),
        ],
      ),
    );
  }
}

class _LiveStatusCard extends StatelessWidget {
  const _LiveStatusCard({
    required this.queue,
    required this.position,
    required this.estimatedWait,
    required this.yourTurn,
    required this.isLeaving,
    required this.onLeave,
  });

  final _QueueItem queue;
  final int position;
  final int estimatedWait;
  final bool yourTurn;
  final bool isLeaving;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) {
    final accent = yourTurn ? PassengerColors.orange : PassengerColors.teal;
    final bg = yourTurn
        ? PassengerColors.orange.withValues(alpha: 0.08)
        : PassengerColors.teal.withValues(alpha: 0.07);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: accent.withValues(alpha: 0.28)),
      ),
      child: Row(
        children: [
          Container(
            height: 52,
            width: 52,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              yourTurn
                  ? Icons.notifications_active_rounded
                  : Icons.queue_rounded,
              color: accent,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  yourTurn ? '🔔 Your turn!' : 'You are #$position in line',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: accent,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  yourTurn
                      ? 'Head to ${queue.title} now.'
                      : '${queue.title}  ·  ~$estimatedWait min',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF4A6080),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          OutlinedButton(
            onPressed: isLeaving ? null : onLeave,
            style: OutlinedButton.styleFrom(
              foregroundColor: accent,
              side: BorderSide(color: accent.withValues(alpha: 0.4)),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
            child: isLeaving
                ? SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: accent,
                    ),
                  )
                : const Text(
                    'Leave',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                  ),
          ),
        ],
      ),
    );
  }
}

// ── Bottom Navigation Bar ────────────────────────────────────────────────────

class _BottomNavBar extends StatelessWidget {
  const _BottomNavBar({
    required this.selectedIndex,
    required this.icons,
    required this.labels,
    required this.onTap,
  });

  final int selectedIndex;
  final List<IconData> icons;
  final List<String> labels;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0B1736).withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64 + bottomPad,
          child: Row(
            children: List.generate(icons.length, (index) {
              final selected = index == selectedIndex;
              return Expanded(
                child: GestureDetector(
                  onTap: () => onTap(index),
                  behavior: HitTestBehavior.opaque,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeOutCubic,
                    padding: EdgeInsets.only(bottom: bottomPad),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          curve: Curves.easeOutCubic,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: selected
                                ? PassengerColors.teal.withValues(alpha: 0.12)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Icon(
                            icons[index],
                            size: 22,
                            color: selected
                                ? PassengerColors.teal
                                : const Color(0xFF95A4BD),
                          ),
                        ),
                        const SizedBox(height: 2),
                        AnimatedDefaultTextStyle(
                          duration: const Duration(milliseconds: 200),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: selected
                                ? FontWeight.w700
                                : FontWeight.w500,
                            color: selected
                                ? PassengerColors.teal
                                : const Color(0xFF95A4BD),
                          ),
                          child: Text(labels[index]),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      tileColor: const Color(0xFFF8FBFF),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: const BorderSide(color: Color(0xFFE6EDF5)),
      ),
      leading: const CircleAvatar(
        backgroundColor: Color(0xFFE9F2F1),
        child: Icon(Icons.check_circle_rounded, color: PassengerColors.teal),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Text(subtitle),
      ),
      trailing: const Icon(Icons.chevron_right_rounded),
    );
  }
}

class _ProfileLine extends StatelessWidget {
  const _ProfileLine({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: PassengerColors.teal),
        const SizedBox(width: 10),
        Text(
          '$label:',
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: PassengerColors.ink,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 13, color: Color(0xFF5F7392)),
          ),
        ),
      ],
    );
  }
}

class _MapMarker extends StatelessWidget {
  const _MapMarker({
    required this.queue,
    required this.selected,
    required this.onTap,
  });

  final _QueueItem queue;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x250B1736),
                  blurRadius: 12,
                  offset: Offset(0, 6),
                ),
              ],
              border: Border.all(
                color: selected
                    ? queue.color.withValues(alpha: 0.6)
                    : Colors.white,
                width: 1.5,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(queue.icon, size: 16, color: queue.color),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    queue.title,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Container(
            height: selected ? 46 : 40,
            width: selected ? 46 : 40,
            decoration: BoxDecoration(
              color: queue.color,
              shape: BoxShape.circle,
              boxShadow: const [
                BoxShadow(
                  color: Color(0x330B1736),
                  blurRadius: 10,
                  offset: Offset(0, 6),
                ),
              ],
              border: Border.all(color: Colors.white, width: selected ? 4 : 3),
            ),
            child: Icon(queue.icon, color: Colors.white, size: 20),
          ),
        ],
      ),
    );
  }
}

class EmptySearchState extends StatelessWidget {
  const EmptySearchState({super.key, required this.query});

  final String query;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FBFF),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE6EDF5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.search_off_rounded,
            color: PassengerColors.orange,
            size: 24,
          ),
          const SizedBox(height: 12),
          const Text(
            'No queues found',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(
            'No queue matched "$query". Try the place name, pickup area, or queue type.',
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF5F7392),
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _QueueItem {
  const _QueueItem({
    required this.backendId,
    required this.title,
    required this.subtitle,
    required this.route,
    required this.waitTime,
    required this.seatsOpen,
    required this.distance,
    required this.pickupNote,
    required this.color,
    required this.icon,
    required this.point,
    required this.keywords,
  });

  /// ID used by the backend API (e.g. 'bole-airport')
  final String backendId;
  final String title;
  final String subtitle;
  final String route;
  final String waitTime;
  final int seatsOpen;
  final String distance;
  final String pickupNote;
  final Color color;
  final IconData icon;
  final LatLng point;
  final List<String> keywords;

  bool matches(String query) {
    final haystack = <String>[
      title,
      subtitle,
      route,
      pickupNote,
      ...keywords,
    ].join(' ').toLowerCase();

    return haystack.contains(query);
  }
}
