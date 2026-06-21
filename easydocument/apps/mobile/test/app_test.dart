import 'package:easydocument_mobile/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('shows Phase 1 mobile shell', (tester) async {
    await tester.pumpWidget(const EasyDocumentMobileApp());

    expect(find.text('EasyDocument'), findsOneWidget);
    expect(find.text('Phone OTP'), findsOneWidget);
    expect(find.text('Customer'), findsOneWidget);
    expect(find.text('Agent'), findsOneWidget);
  });
}
