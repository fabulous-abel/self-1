class PassengerProfile {
  const PassengerProfile({
    required this.fullName,
    required this.email,
    required this.phoneNumber,
    this.token,
    this.userId,
  });

  final String fullName;
  final String email;
  final String phoneNumber;
  /// JWT from the backend — null if backend is unreachable.
  final String? token;
  /// Backend user ID — null if backend is unreachable.
  final String? userId;

  String get initials {
    final parts = fullName
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();

    if (parts.isEmpty) {
      return 'PA';
    }
    if (parts.length == 1) {
      final value = parts.first;
      return value.length == 1
          ? value.toUpperCase()
          : value.substring(0, 2).toUpperCase();
    }

    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  String get phoneLabel =>
      phoneNumber.isEmpty ? 'Phone not added yet' : phoneNumber;
}
