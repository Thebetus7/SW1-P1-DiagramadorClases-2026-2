import 'dart:math';
import 'package:flutter/material.dart';

class UmlMarkerPainterUtils {
  /// Calcula la intersección entre el vector del centro [c1] hacia [c2] y el perímetro
  /// de la tarjeta rectangular centrada en [c1] con ancho [w] y alto [h].
  static Offset getNodePerimeterIntersection(
    Offset c1,
    Offset c2,
    double w,
    double h,
  ) {
    final dx = c2.dx - c1.dx;
    final dy = c2.dy - c1.dy;

    if (dx.abs() < 0.0001 && dy.abs() < 0.0001) {
      return c1;
    }

    final halfW = w / 2;
    final halfH = h / 2;

    if (dy.abs() * halfW > dx.abs() * halfH) {
      // Interseca cara superior o inferior
      if (dy > 0) {
        final ratio = halfH / dy;
        return Offset(c1.dx + dx * ratio, c1.dy + halfH);
      } else {
        final ratio = -halfH / dy;
        return Offset(c1.dx + dx * ratio, c1.dy - halfH);
      }
    } else {
      // Interseca cara izquierda o derecha
      if (dx > 0) {
        final ratio = halfW / dx;
        return Offset(c1.dx + halfW, c1.dy + dy * ratio);
      } else {
        final ratio = -halfW / dx;
        return Offset(c1.dx - halfW, c1.dy + dy * ratio);
      }
    }
  }

  /// Dibuja una flecha abierta UML apuntando hacia [tip] desde [from] (Direct Association / Dependency)
  static void drawOpenArrow(
    Canvas canvas,
    Offset tip,
    Offset from,
    Color color, {
    double arrowLength = 14.0,
    double arrowAngle = pi / 6, // 30 grados
    double strokeWidth = 1.8,
  }) {
    final angle = atan2(tip.dy - from.dy, tip.dx - from.dx);
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final p1 = Offset(
      tip.dx - arrowLength * cos(angle - arrowAngle),
      tip.dy - arrowLength * sin(angle - arrowAngle),
    );
    final p2 = Offset(
      tip.dx - arrowLength * cos(angle + arrowAngle),
      tip.dy - arrowLength * sin(angle + arrowAngle),
    );

    final path = Path()
      ..moveTo(p1.dx, p1.dy)
      ..lineTo(tip.dx, tip.dy)
      ..lineTo(p2.dx, p2.dy);

    canvas.drawPath(path, paint);
  }

  /// Dibuja un triángulo cerrado hueco con relleno blanco UML apuntando hacia [tip] (Generalization / Realization)
  static void drawClosedTriangle(
    Canvas canvas,
    Offset tip,
    Offset from,
    Color strokeColor, {
    double size = 16.0,
    double angleOffset = pi / 6,
    double strokeWidth = 1.8,
  }) {
    final angle = atan2(tip.dy - from.dy, tip.dx - from.dx);

    final p1 = Offset(
      tip.dx - size * cos(angle - angleOffset),
      tip.dy - size * sin(angle - angleOffset),
    );
    final p2 = Offset(
      tip.dx - size * cos(angle + angleOffset),
      tip.dy - size * sin(angle + angleOffset),
    );

    final path = Path()
      ..moveTo(tip.dx, tip.dy)
      ..lineTo(p1.dx, p1.dy)
      ..lineTo(p2.dx, p2.dy)
      ..close();

    // Relleno blanco sólido
    final fillPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawPath(path, fillPaint);

    // Borde stroke oscuro
    final strokePaint = Paint()
      ..color = strokeColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeJoin = StrokeJoin.miter;
    canvas.drawPath(path, strokePaint);
  }

  /// Dibuja un rombo UML en el extremo [anchor] (origen) hacia [towards]
  /// [isFilled] = false para Agregación (hueco blanco)
  /// [isFilled] = true para Composición (relleno negro/azul oscuro)
  static void drawDiamond(
    Canvas canvas,
    Offset anchor,
    Offset towards,
    Color strokeColor, {
    required bool isFilled,
    double length = 18.0,
    double width = 10.0,
    double strokeWidth = 1.8,
  }) {
    final angle = atan2(towards.dy - anchor.dy, towards.dx - anchor.dx);
    final cosA = cos(angle);
    final sinA = sin(angle);

    // Vector unitario perpendicular
    final perpX = -sinA;
    final perpY = cosA;

    final tip = anchor;
    final center = Offset(anchor.dx + (length / 2) * cosA, anchor.dy + (length / 2) * sinA);
    final base = Offset(anchor.dx + length * cosA, anchor.dy + length * sinA);

    final left = Offset(center.dx + (width / 2) * perpX, center.dy + (width / 2) * perpY);
    final right = Offset(center.dx - (width / 2) * perpX, center.dy - (width / 2) * perpY);

    final path = Path()
      ..moveTo(tip.dx, tip.dy)
      ..lineTo(left.dx, left.dy)
      ..lineTo(base.dx, base.dy)
      ..lineTo(right.dx, right.dy)
      ..close();

    final fillPaint = Paint()
      ..color = isFilled ? strokeColor : Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawPath(path, fillPaint);

    final strokePaint = Paint()
      ..color = strokeColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeJoin = StrokeJoin.miter;
    canvas.drawPath(path, strokePaint);
  }

  /// Dibuja etiqueta de texto estilizada (ej. multiplicidad o nombre)
  static void drawMultiplicityText(
    Canvas canvas,
    Offset pos,
    String text, {
    Color textColor = const Color(0xFF334155),
    Color backgroundColor = const Color(0xF2FFFFFF),
    double fontSize = 10.0,
  }) {
    final textSpan = TextSpan(
      text: text,
      style: TextStyle(
        color: textColor,
        fontSize: fontSize,
        fontFamily: 'monospace',
        fontWeight: FontWeight.bold,
      ),
    );

    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();

    final bgRect = Rect.fromCenter(
      center: pos,
      width: textPainter.width + 8,
      height: textPainter.height + 4,
    );

    final bgPaint = Paint()..color = backgroundColor;
    final borderPaint = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    canvas.drawRRect(RRect.fromRectAndRadius(bgRect, const Radius.circular(4)), bgPaint);
    canvas.drawRRect(RRect.fromRectAndRadius(bgRect, const Radius.circular(4)), borderPaint);

    textPainter.paint(
      canvas,
      Offset(pos.dx - textPainter.width / 2, pos.dy - textPainter.height / 2),
    );
  }
}
