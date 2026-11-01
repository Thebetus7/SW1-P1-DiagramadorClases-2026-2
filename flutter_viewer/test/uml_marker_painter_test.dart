import 'dart:ui';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_viewer/widgets/uml_marker_painter_utils.dart';

void main() {
  group('UmlMarkerPainterUtils Tests', () {
    test('getNodePerimeterIntersection calcula intersección en bordes ortogonales', () {
      // Caja centrada en (100, 100) con w=200, h=100 -> x entre [0, 200], y entre [50, 150]
      const c1 = Offset(100, 100);

      // 1. Target al Norte (arriba en y=0)
      const cNorth = Offset(100, 0);
      final pNorth = UmlMarkerPainterUtils.getNodePerimeterIntersection(c1, cNorth, 200, 100);
      expect(pNorth.dx, closeTo(100.0, 0.01));
      expect(pNorth.dy, closeTo(50.0, 0.01)); // Borde superior: 100 - 50 = 50

      // 2. Target al Sur (abajo en y=250)
      const cSouth = Offset(100, 250);
      final pSouth = UmlMarkerPainterUtils.getNodePerimeterIntersection(c1, cSouth, 200, 100);
      expect(pSouth.dx, closeTo(100.0, 0.01));
      expect(pSouth.dy, closeTo(150.0, 0.01)); // Borde inferior: 100 + 50 = 150

      // 3. Target al Este (derecha en x=300)
      const cEast = Offset(300, 100);
      final pEast = UmlMarkerPainterUtils.getNodePerimeterIntersection(c1, cEast, 200, 100);
      expect(pEast.dx, closeTo(200.0, 0.01)); // Borde derecho: 100 + 100 = 200
      expect(pEast.dy, closeTo(100.0, 0.01));

      // 4. Target al Oeste (izquierda en x=-50)
      const cWest = Offset(-50, 100);
      final pWest = UmlMarkerPainterUtils.getNodePerimeterIntersection(c1, cWest, 200, 100);
      expect(pWest.dx, closeTo(0.0, 0.01)); // Borde izquierdo: 100 - 100 = 0
      expect(pWest.dy, closeTo(100.0, 0.01));
    });

    test('Rutinas vectoriales de dibujo sobre Canvas ejecutan sin excepciones', () {
      final recorder = PictureRecorder();
      final canvas = Canvas(recorder, const Rect.fromLTWH(0, 0, 800, 600));

      const p1 = Offset(100, 100);
      const p2 = Offset(300, 200);

      // Flecha abierta (Asociación dirigida / Dependencia)
      expect(
        () => UmlMarkerPainterUtils.drawOpenArrow(canvas, p2, p1, const Color(0xFF334155)),
        returnsNormally,
      );

      // Triángulo cerrado hueco (Generalización / Realización)
      expect(
        () => UmlMarkerPainterUtils.drawClosedTriangle(canvas, p2, p1, const Color(0xFF334155)),
        returnsNormally,
      );

      // Rombo hueco (Agregación)
      expect(
        () => UmlMarkerPainterUtils.drawDiamond(canvas, p1, p2, const Color(0xFF334155), isFilled: false),
        returnsNormally,
      );

      // Rombo relleno (Composición)
      expect(
        () => UmlMarkerPainterUtils.drawDiamond(canvas, p1, p2, const Color(0xFF334155), isFilled: true),
        returnsNormally,
      );

      // Multiplicidad textual
      expect(
        () => UmlMarkerPainterUtils.drawMultiplicityText(canvas, const Offset(120, 120), '0..*'),
        returnsNormally,
      );

      final picture = recorder.endRecording();
      expect(picture, isNotNull);
    });
  });
}
