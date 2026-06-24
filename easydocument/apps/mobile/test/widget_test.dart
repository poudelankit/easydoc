import 'package:easydocument_mobile/main.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('starts the EasyDocument shell', (tester) async {
    await tester.pumpWidget(const EasyDocumentMobileApp());

    expect(find.text('EasyDocument'), findsOneWidget);
    expect(find.text('Phone OTP'), findsOneWidget);
  });
}
