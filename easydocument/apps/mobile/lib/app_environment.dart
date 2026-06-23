class AppEnvironment {
  const AppEnvironment({
    required this.apiBaseUrl,
    required this.socketUrl,
    required this.googleMapsApiKey,
    required this.production,
  });

  static const current = AppEnvironment(
    apiBaseUrl: String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://localhost:3000/v1',
    ),
    socketUrl: String.fromEnvironment(
      'SOCKET_URL',
      defaultValue: 'http://localhost:3000',
    ),
    googleMapsApiKey: String.fromEnvironment(
      'GOOGLE_MAPS_API_KEY',
      defaultValue: 'replace-me',
    ),
    production: bool.fromEnvironment('PRODUCTION'),
  );

  final String apiBaseUrl;
  final String socketUrl;
  final String googleMapsApiKey;
  final bool production;

  List<String> validate() {
    final errors = <String>[];
    _validateHttpUrl('API_BASE_URL', apiBaseUrl, errors);
    _validateHttpUrl('SOCKET_URL', socketUrl, errors);

    if (production && apiBaseUrl.contains('localhost')) {
      errors.add('API_BASE_URL must not point to localhost in production.');
    }
    if (production && socketUrl.contains('localhost')) {
      errors.add('SOCKET_URL must not point to localhost in production.');
    }
    if (production && googleMapsApiKey == 'replace-me') {
      errors.add('GOOGLE_MAPS_API_KEY must be configured in production.');
    }
    return errors;
  }
}

void validateMobileEnvironment(AppEnvironment environment) {
  final errors = environment.validate();
  if (errors.isNotEmpty) {
    throw StateError('Mobile environment validation failed: ${errors.join(' ')}');
  }
}

void _validateHttpUrl(String name, String value, List<String> errors) {
  final uri = Uri.tryParse(value);
  if (uri == null || !uri.hasScheme || !['http', 'https'].contains(uri.scheme)) {
    errors.add('$name must be a valid HTTP URL.');
  }
}
