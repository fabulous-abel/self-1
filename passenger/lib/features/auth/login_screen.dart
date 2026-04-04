import 'package:flutter/material.dart';

import '../../core/services/local_auth_service.dart';
import '../../core/services/queue_api_service.dart';
import '../../core/theme/app_theme.dart';
import '../queue/queue_map_screen.dart';
import 'passenger_profile.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();

  bool _isLogin = true;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  late final TextEditingController _phoneController;
  late final TextEditingController _passwordController;
  late final TextEditingController _confirmPasswordController;

  bool _isLoading = false;
  final PassengerLocalAuthService _authService = PassengerLocalAuthService();

  @override
  void initState() {
    super.initState();
    _phoneController = TextEditingController(text: '0913269909');
    _passwordController = TextEditingController(text: '123456');
    _confirmPasswordController = TextEditingController();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String _normalizePhone(String value) {
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) {
      return '';
    }
    if (digits.startsWith('251') && digits.length == 12) {
      return '+$digits';
    }
    if (digits.startsWith('0') && digits.length == 10) {
      return '+251${digits.substring(1)}';
    }
    if (digits.length == 9) {
      return '+251$digits';
    }
    return '';
  }

  String? _validatePhone(String? value) {
    final rawValue = (value ?? '').trim();
    if (rawValue.isEmpty) {
      return 'Enter a valid phone number';
    }
    if (_normalizePhone(rawValue).isEmpty) {
      return 'Use a valid Ethiopian phone number';
    }
    return null;
  }

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Enter your password';
    }
    if (!_isLogin && value.length < 6) {
      return 'Use at least 6 characters';
    }
    return null;
  }

  String? _validateConfirmPassword(String? value) {
    if (_isLogin) return null;
    if (value == null || value.isEmpty) {
      return 'Confirm your password';
    }
    if (value != _passwordController.text) {
      return 'Passwords do not match';
    }
    return null;
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!_formKey.currentState!.validate()) return;

    final normalizedPhone = _normalizePhone(_phoneController.text);
    final pass = _passwordController.text;

    setState(() => _isLoading = true);

    try {
      PassengerProfile profile;
      if (_isLogin) {
        profile = await _authService.login(
          phoneNumber: normalizedPhone,
          password: pass,
        );
      } else {
        profile = await _authService.register(
          phoneNumber: normalizedPhone,
          password: pass,
        );
      }

      // Silently obtain a backend JWT so the Join button can make real API calls.
      // If the backend is offline this is skipped and the app still works
      // (Join will show an "offline" message instead of failing silently).
      final credentials = await QueueApiService.instance.acquireToken(
        normalizedPhone,
      );
      if (credentials != null) {
        profile = PassengerProfile(
          fullName: profile.fullName,
          email: profile.email,
          phoneNumber: profile.phoneNumber,
          token: credentials.token,
          userId: credentials.userId,
        );
      }

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => PassengerMapScreen(profile: profile),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Widget _buildHeroSection({
    required ThemeData theme,
    required bool compact,
    required bool wide,
    required double contentPadding,
  }) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        contentPadding,
        compact ? 20 : 28,
        contentPadding,
        compact ? 18 : 24,
      ),
      child: Column(
        crossAxisAlignment: wide
            ? CrossAxisAlignment.start
            : CrossAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
            ),
            child: const Text(
              'Passenger app',
              style: TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.3,
              ),
            ),
          ),
          SizedBox(height: compact ? 22 : 30),
          Text(
            _isLogin
                ? 'Welcome back to the queue.'
                : 'Join the passenger queue.',
            style: theme.textTheme.headlineLarge?.copyWith(
              color: Colors.white,
              fontSize: compact ? 24 : 28,
              height: 1.05,
            ),
            textAlign: wide ? TextAlign.left : TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            _isLogin
                ? 'Login instantly and open the queue map.'
                : 'Create an account and start finding available seats.',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: Colors.white.withValues(alpha: 0.84),
            ),
            textAlign: wide ? TextAlign.left : TextAlign.center,
          ),
          SizedBox(height: compact ? 24 : 30),
        ],
      ),
    );
  }

  Widget _buildFormPanel({
    required ThemeData theme,
    required bool compact,
    required double contentPadding,
    required BorderRadiusGeometry borderRadius,
  }) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
        contentPadding,
        compact ? 24 : 30,
        contentPadding,
        compact ? 22 : 26,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: borderRadius,
        boxShadow: const [
          BoxShadow(
            blurRadius: 30,
            offset: Offset(0, -10),
            color: Color(0x1A0B1736),
          ),
        ],
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _isLogin ? 'Passenger Login' : 'Passenger Sign Up',
              style: theme.textTheme.headlineMedium?.copyWith(
                fontSize: compact ? 22 : 24,
              ),
            ),
            SizedBox(height: compact ? 22 : 26),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FBFF),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE6EDF5)),
              ),
              child: const Text(
                'Quick access: 0913 269 909 / 123456',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: PassengerColors.ink,
                ),
              ),
            ),
            const SizedBox(height: 18),
            _FieldLabel(label: 'Phone number', trailing: 'Required'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              validator: _validatePhone,
              decoration: const InputDecoration(
                hintText: '0913 269 909',
                prefixIcon: Icon(Icons.phone_rounded),
              ),
            ),
            const SizedBox(height: 16),
            _FieldLabel(label: 'Password', trailing: 'Required'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              textInputAction: _isLogin
                  ? TextInputAction.done
                  : TextInputAction.next,
              validator: _validatePassword,
              onFieldSubmitted: _isLogin ? (_) => _submit() : null,
              decoration: InputDecoration(
                hintText: 'Enter your password',
                prefixIcon: const Icon(Icons.lock_rounded),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_rounded
                        : Icons.visibility_off_rounded,
                  ),
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
            ),
            if (!_isLogin) ...[
              const SizedBox(height: 16),
              _FieldLabel(label: 'Confirm Password', trailing: 'Required'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _confirmPasswordController,
                obscureText: _obscureConfirmPassword,
                textInputAction: TextInputAction.done,
                validator: _validateConfirmPassword,
                onFieldSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  hintText: 'Re-enter your password',
                  prefixIcon: const Icon(Icons.lock_rounded),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureConfirmPassword
                          ? Icons.visibility_rounded
                          : Icons.visibility_off_rounded,
                    ),
                    onPressed: () => setState(
                      () => _obscureConfirmPassword = !_obscureConfirmPassword,
                    ),
                  ),
                ),
              ),
            ],
            SizedBox(height: compact ? 22 : 26),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _isLoading ? null : _submit,
                icon: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Icon(
                        _isLogin
                            ? Icons.login_rounded
                            : Icons.person_add_rounded,
                        size: 20,
                      ),
                label: Text(_isLogin ? 'Login to app' : 'Create Account'),
              ),
            ),
            const SizedBox(height: 20),
            Center(
              child: TextButton(
                onPressed: () {
                  setState(() {
                    _isLogin = !_isLogin;
                    _formKey.currentState?.reset();
                    if (_isLogin) {
                      _phoneController.text = '0913269909';
                      _passwordController.text = '123456';
                    } else {
                      _phoneController.clear();
                      _passwordController.clear();
                      _confirmPasswordController.clear();
                    }
                  });
                },
                child: Text(
                  _isLogin
                      ? "Don't have an account? Sign up"
                      : "Already have an account? Log in",
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final viewInsets = MediaQuery.viewInsetsOf(context);

    return Scaffold(
      backgroundColor: PassengerColors.teal,
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [PassengerColors.teal, PassengerColors.tealDark],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final compact =
                  constraints.maxWidth < 390 || constraints.maxHeight < 760;
              final wide = constraints.maxWidth >= 860;
              final contentPadding = compact ? 20.0 : 24.0;
              final panelRadius = compact ? 30.0 : 40.0;
              final heroSection = _buildHeroSection(
                theme: theme,
                compact: compact,
                wide: wide,
                contentPadding: contentPadding,
              );
              final formPanel = _buildFormPanel(
                theme: theme,
                compact: compact,
                contentPadding: contentPadding,
                borderRadius: wide
                    ? BorderRadius.circular(panelRadius)
                    : BorderRadius.vertical(top: Radius.circular(panelRadius)),
              );

              return SingleChildScrollView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                padding: EdgeInsets.only(bottom: viewInsets.bottom),
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: wide ? 1080 : 560),
                    child: wide
                        ? Padding(
                            padding: const EdgeInsets.all(24),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Expanded(child: heroSection),
                                const SizedBox(width: 24),
                                Expanded(child: formPanel),
                              ],
                            ),
                          )
                        : Column(children: [heroSection, formPanel]),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel({required this.label, required this.trailing});

  final String label;
  final String trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Expanded(child: Text(label, style: theme.textTheme.titleMedium)),
        Text(
          trailing,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _HighlightCard extends StatelessWidget {
  const _HighlightCard({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
      ),
      child: Row(
        children: [
          Container(
            height: 46,
            width: 46,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.35,
                    color: Color(0xD9FFFFFF),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatBadge extends StatelessWidget {
  const _StatBadge({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: PassengerColors.ink,
            ),
          ),
        ],
      ),
    );
  }
}
