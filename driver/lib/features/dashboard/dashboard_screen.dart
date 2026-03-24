import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class DriverDashboardScreen extends StatefulWidget {
  const DriverDashboardScreen({super.key});

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
  static const _zones = ['Terminal A', 'Corporate Exit', 'Main Gate'];

  bool _isOnline = false;
  int _selectedTab = 0;
  String _selectedZone = _zones.first;

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
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
              onSelected: (_) => setState(() => _selectedZone = zone),
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
        _summaryTile('Current position', '#4 in line'),
        const SizedBox(height: 12),
        _summaryTile('Estimated wait', '12 mins'),
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
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Driver Profile',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
              ),
              SizedBox(height: 8),
              Text('Vehicle verified and ready for queue dispatch'),
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
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'LinkEt Driver',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
              ),
              SizedBox(height: 2),
              Text(
                'Live queue management',
                style: TextStyle(color: DriverColors.muted),
              ),
            ],
          ),
        ),
        _headerButton(
          Icons.notifications_rounded,
          () => _showMessage('No new driver alerts'),
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
              ? 'You are live and receiving requests'
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
                  onChanged: (value) => setState(() => _isOnline = value),
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
                  onChanged: (value) => setState(() => _isOnline = value),
                  activeThumbColor: DriverColors.teal,
                  activeTrackColor: DriverColors.tealSoft,
                ),
              ],
            ),
    );
  }

  Widget _queueCard(bool compact, bool wide) {
    final queueCopy = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'FIFO Queue Position',
          style: TextStyle(color: Colors.white70, fontSize: 16),
        ),
        const SizedBox(height: 12),
        Text(
          '#4 in line',
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
          child: const Text(
            'Est. wait: 12 mins',
            style: TextStyle(color: Colors.white),
          ),
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
                const SizedBox(width: 18),
                FilledButton(
                  onPressed: () => _showMessage('Queue refresh started'),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: DriverColors.teal,
                  ),
                  child: const Text('Refresh'),
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                queueCopy,
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: () => _showMessage('Queue refresh started'),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: DriverColors.teal,
                  ),
                  child: const Text('Refresh'),
                ),
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
