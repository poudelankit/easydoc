import 'package:easydocument_mobile/app_environment.dart';
import 'package:easydocument_mobile/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('shows mobile shell with onboarding and task tabs', (tester) async {
    await tester.pumpWidget(const EasyDocumentMobileApp());

    expect(find.text('EasyDocument'), findsOneWidget);
    expect(find.text('Phone OTP'), findsOneWidget);
    expect(find.text('Customer'), findsOneWidget);
    expect(find.text('Agent'), findsOneWidget);
    expect(find.text('Tasks'), findsOneWidget);
    expect(find.text('Agent Work'), findsOneWidget);
    expect(find.text('Alerts'), findsOneWidget);
  });

  test('validates mobile production environment', () {
    const validEnvironment = AppEnvironment(
      apiBaseUrl: 'https://api.easydocument.example/v1',
      socketUrl: 'https://api.easydocument.example',
      googleMapsApiKey: 'maps-key',
      production: true,
    );

    expect(validEnvironment.validate(), isEmpty);

    const invalidEnvironment = AppEnvironment(
      apiBaseUrl: 'http://localhost:3000/v1',
      socketUrl: 'http://localhost:3000',
      googleMapsApiKey: 'replace-me',
      production: true,
    );

    expect(invalidEnvironment.validate(), isNotEmpty);
  });
}
