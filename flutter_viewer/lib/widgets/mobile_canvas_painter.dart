import 'dart:math';
import 'package:flutter/material.dart';
import '../models/diagram_model.dart';

class MobileCanvasView extends StatelessWidget {
  final DiagramCanvasData diagram;

  const MobileCanvasView({super.key, required this.diagram});

  @override
  Widget build(BuildContext context) {
    if (diagram.nodes.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.dashboard_outlined, size: 56, color: Colors.grey),
            SizedBox(height: 12),
            Text(
              'El lienzo no tiene clases aún.',
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
          ],
        ),
      );
    }

    // Calcular límites espaciales del diagrama
    double maxX = 1200, maxY = 800;
    for (final node in diagram.nodes) {
      if (node.x > maxX - 260) maxX = node.x + 300;
      if (node.y > maxY - 200) maxY = node.y + 300;
    }

    final canvasWidth = max(maxX + 200, 1500.0);
    final canvasHeight = max(maxY + 200, 1200.0);

    final nodeMap = {for (var n in diagram.nodes) n.id: n};

    return InteractiveViewer(
      boundaryMargin: const EdgeInsets.all(500),
      minScale: 0.2,
      maxScale: 3.0,
      constrained: false,
      child: Container(
        width: canvasWidth,
        height: canvasHeight,
        color: const Color(0xFFF8FAFC), // Slate 50
        child: Stack(
          children: [
            // Patrón de cuadrícula de fondo
            Positioned.fill(
              child: CustomPaint(
                painter: GridDotsPainter(),
              ),
            ),

            // Trazado de relaciones y aristas UML
            Positioned.fill(
              child: CustomPaint(
                painter: UmlEdgesPainter(edges: diagram.edges, nodesMap: nodeMap),
              ),
            ),

            // Nodos de clases UML renderizados como tarjetas interactivas
            for (final node in diagram.nodes)
              Positioned(
                left: node.x,
                top: node.y,
                child: UmlClassCard(node: node),
              ),
          ],
        ),
      ),
    );
  }
}

class GridDotsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFCBD5E1)
      ..strokeWidth = 1.2;

    const gap = 24.0;
    for (double x = 0; x < size.width; x += gap) {
      for (double y = 0; y < size.height; y += gap) {
        canvas.drawCircle(Offset(x, y), 1.0, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class UmlEdgesPainter extends CustomPainter {
  final List<UmlEdge> edges;
  final Map<String, UmlClassNode> nodesMap;

  UmlEdgesPainter({required this.edges, required this.nodesMap});

  @override
  void paint(Canvas canvas, Size size) {
    for (final edge in edges) {
      final source = nodesMap[edge.source];
      final target = nodesMap[edge.target];
      if (source == null || target == null) continue;

      // Centros aproximados de nodos (ancho aprox 220, alto aprox 120)
      final p1 = Offset(source.x + 110, source.y + 60);
      final p2 = Offset(target.x + 110, target.y + 60);

      final paint = Paint()
        ..color = const Color(0xFF475569) // Slate 600
        ..strokeWidth = 1.8
        ..style = PaintingStyle.stroke;

      if (edge.relationType == 'DEPENDENCY' || edge.relationType == 'REALIZATION') {
        _drawDashedLine(canvas, p1, p2, paint);
      } else {
        canvas.drawLine(p1, p2, paint);
      }

      // Dibujar etiqueta de tipo de relación si existe
      if (edge.relationType.isNotEmpty && edge.relationType != 'ASSOCIATION') {
        final mid = Offset((p1.dx + p2.dx) / 2, (p1.dy + p2.dy) / 2);
        _drawLabel(canvas, mid, edge.relationType);
      }
    }
  }

  void _drawDashedLine(Canvas canvas, Offset p1, Offset p2, Paint paint) {
    const dashWidth = 5.0;
    const dashSpace = 4.0;
    final dx = p2.dx - p1.dx;
    final dy = p2.dy - p1.dy;
    final count = (sqrt(dx * dx + dy * dy) / (dashWidth + dashSpace)).floor();
    for (int i = 0; i < count; i++) {
      final startFrac = (i * (dashWidth + dashSpace)) / sqrt(dx * dx + dy * dy);
      final endFrac = min(1.0, ((i * (dashWidth + dashSpace)) + dashWidth) / sqrt(dx * dx + dy * dy));
      canvas.drawLine(
        Offset(p1.dx + dx * startFrac, p1.dy + dy * startFrac),
        Offset(p1.dx + dx * endFrac, p1.dy + dy * endFrac),
        paint,
      );
    }
  }

  void _drawLabel(Canvas canvas, Offset pos, String text) {
    final textSpan = TextSpan(
      text: text,
      style: const TextStyle(
        color: Color(0xFF475569),
        fontSize: 9,
        fontWeight: FontWeight.w600,
        backgroundColor: Colors.white,
      ),
    );
    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(canvas, Offset(pos.dx - textPainter.width / 2, pos.dy - textPainter.height / 2));
  }

  @override
  bool shouldRepaint(covariant UmlEdgesPainter oldDelegate) => true;
}

class UmlClassCard extends StatelessWidget {
  final UmlClassNode node;

  const UmlClassCard({super.key, required this.node});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 220,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF94A3B8), width: 1.2), // Slate 400
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Cabecera con Nombre y Estereotipo
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: const BoxDecoration(
              color: Color(0xFFF1F5F9), // Slate 100
              borderRadius: BorderRadius.vertical(top: Radius.circular(7)),
              border: Border(bottom: BorderSide(color: Color(0xFFCBD5E1))),
            ),
            child: Column(
              children: [
                if (node.stereotype.isNotEmpty)
                  Text(
                    '<<${node.stereotype}>>',
                    style: const TextStyle(
                      fontSize: 10,
                      fontStyle: FontStyle.italic,
                      color: Color(0xFF64748B),
                    ),
                  ),
                Text(
                  node.name,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),

          // Sección de Atributos
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (node.attributes.isEmpty)
                  const Text(
                    '(sin atributos)',
                    style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontStyle: FontStyle.italic),
                  )
                else
                  for (final attr in node.attributes)
                    Text(
                      attr,
                      style: const TextStyle(
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: Color(0xFF1E293B),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
              ],
            ),
          ),

          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Sección de Métodos
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (node.methods.isEmpty)
                  const Text(
                    '(sin métodos)',
                    style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontStyle: FontStyle.italic),
                  )
                else
                  for (final m in node.methods)
                    Text(
                      m,
                      style: const TextStyle(
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: Color(0xFF334155),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
