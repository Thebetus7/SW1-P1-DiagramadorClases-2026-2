import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_viewer/main.dart';

void main() {
  testWidgets('DiagramCompanionApp smoke test inicializa correctamente', (WidgetTester tester) async {
    await tester.pumpWidget(const DiagramCompanionApp());
    expect(find.text('Visor UML Companion'), findsOneWidget);
    expect(find.text('Escanear Código QR'), findsOneWidget);
  });
}
