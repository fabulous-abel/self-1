import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

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
  static const _queues = [
    _QueueItem(
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

  int _selectedTab = 0;
  late _QueueItem _selectedQueue;
  String _query = '';
  double _sheetExtent = 0.44;
  double _mapZoom = 13.4;
  LatLng _mapCenter = _queues.first.point;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
    _selectedQueue = _queues.first;
  }

  @override
  void dispose() {
    _searchController.dispose();
    _sheetController.dispose();
    _mapController.dispose();
    super.dispose();
  }

  List<_QueueItem> get _visibleQueues => _filterQueues(_query);

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

  void _onSearchChanged(String value) {
    final matches = _filterQueues(value);

    setState(() {
      _query = value.trim();
      if (matches.isNotEmpty && !matches.contains(_selectedQueue)) {
        _selectedQueue = matches.first;
      }
      if (matches.isEmpty && _selectedTab == 1) {
        _selectedTab = 0;
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

  void _selectQueue(_QueueItem queue, {int? tab}) {
    setState(() {
      _selectedQueue = queue;
      if (tab != null) {
        _selectedTab = tab;
      }
    });
  }

  void _focusQueue(_QueueItem queue, {int? tab, double zoom = 15}) {
    _selectQueue(queue, tab: tab);
    _moveMap(queue.point, zoom: zoom);
  }

  void _joinQueue(_QueueItem queue) {
    _selectQueue(queue, tab: 1);
    _showMessage('You joined ${queue.title}');
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

  double _collapsedSheetSize(bool compact) => compact ? 0.22 : 0.19;

  double _midSheetSize(bool compact) => compact ? 0.46 : 0.42;

  double _expandedSheetSize(bool compact) => compact ? 0.84 : 0.74;

  void _toggleSheet(bool compact) {
    final target = _sheetExtent > _midSheetSize(compact) + 0.04
        ? _midSheetSize(compact)
        : _collapsedSheetSize(compact);

    _sheetController.animateTo(
      target,
      duration: const Duration(milliseconds: 240),
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

    switch (_selectedTab) {
      case 1:
        return ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
          children: [
            _detailCard(compact),
            const SizedBox(height: 12),
            ...visibleQueues
                .where((queue) => queue != _selectedQueue)
                .map(
                  (queue) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _queueCard(queue, compact, 'Switch'),
                  ),
                ),
          ],
        );
      case 2:
        return ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
          children: [
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
          itemCount: visibleQueues.length,
          separatorBuilder: (context, index) => const SizedBox(height: 12),
          itemBuilder: (context, index) =>
              _queueCard(visibleQueues[index], compact, 'Join'),
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
                  style: const TextStyle(fontSize: 11, color: Color(0xFF6B7E9D)),
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
                        child: FilledButton(
                          onPressed: () => _joinQueue(_selectedQueue),
                          child: const Text('Join selected queue'),
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
                        child: FilledButton(
                          onPressed: () => _joinQueue(_selectedQueue),
                          child: const Text('Join selected queue'),
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

  Widget _queueCard(_QueueItem queue, bool compact, String action) {
    final selected = queue == _selectedQueue;
    return InkWell(
      onTap: () => _focusQueue(queue, tab: 1),
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFFFF6F0) : const Color(0xFFF8FBFF),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: selected
                ? queue.color.withValues(alpha: 0.36)
                : const Color(0xFFE6EDF5),
          ),
        ),
        child: compact
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _queueSummary(queue),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => _joinQueue(queue),
                      style: FilledButton.styleFrom(
                        backgroundColor: queue.color,
                      ),
                      child: Text(action),
                    ),
                  ),
                ],
              )
            : Row(
                children: [
                  Expanded(child: _queueSummary(queue)),
                  const SizedBox(width: 12),
                  FilledButton(
                    onPressed: () => _joinQueue(queue),
                    style: FilledButton.styleFrom(backgroundColor: queue.color),
                    child: Text(action),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _queueSummary(_QueueItem queue) {
    return Row(
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
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                queue.route,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: PassengerColors.ink,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                queue.subtitle,
                style: const TextStyle(fontSize: 11, color: Color(0xFF6B7E9D)),
              ),
            ],
          ),
        ),
      ],
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
      drawer: NavigationDrawer(
        selectedIndex: _selectedTab,
        onDestinationSelected: (index) {
          setState(() => _selectedTab = index);
          if (_query.isNotEmpty && index == 0) {
            _clearSearch();
          }
          Navigator.pop(context);
        },
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(28, 24, 28, 16),
            child: Text(
              'Menu',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: PassengerColors.ink,
              ),
            ),
          ),
          ...List.generate(
            _labels.length,
            (index) => NavigationDrawerDestination(
              icon: Icon(
                _icons[index],
                color: _selectedTab == index
                    ? PassengerColors.orange
                    : const Color(0xFF95A4BD),
              ),
              label: Text(_labels[index]),
            ),
          ),
        ],
      ),
      body: SafeArea(
        bottom: false,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact =
                constraints.maxWidth < 390 || constraints.maxHeight < 720;
            final collapsedSize = _collapsedSheetSize(compact);
            final midSize = _midSheetSize(compact);
            final expandedSize = _expandedSheetSize(compact);

            return Stack(
              children: [
                Positioned.fill(child: _buildMap(compact)),
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
                Positioned(
                  left: 16,
                  right: 16,
                  top: compact ? 12 : 16,
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Builder(
                            builder: (context) => _TopButton(
                              icon: Icons.menu_rounded,
                              onTap: () => Scaffold.of(context).openDrawer(),
                            ),
                          ),
                          const SizedBox(width: 12),
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
                                Text(
                                  'LinkEt Self',
                                  style: TextStyle(
                                    fontSize: compact ? 18 : 20,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
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
                NotificationListener<DraggableScrollableNotification>(
                  onNotification: (notification) {
                    final nextExtent = notification.extent;
                    if ((nextExtent - _sheetExtent).abs() > 0.01 && mounted) {
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
                            InkWell(
                              onTap: () => _toggleSheet(compact),
                              borderRadius: BorderRadius.circular(999),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 20,
                                  vertical: 6,
                                ),
                                child: Column(
                                  children: [
                                    Container(
                                      height: 8,
                                      width: 88,
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
                                        TextButton(
                                          onPressed: () {
                                            setState(() => _selectedTab = 0);
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
                            const SizedBox(height: 16),
                          ],
                        ),
                      );
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
            'No queue matched "$query". Try Bole, Mexico, Kazanchis, airport, or bus.',
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
