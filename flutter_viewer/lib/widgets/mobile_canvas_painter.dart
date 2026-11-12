import 'dart:math';
import 'package:flutter/material.dart';
import '../models/diagram_model.dart';
import 'class_detail_bottom_sheet.dart';
import 'uml_marker_painter_utils.dart';
import 'uml_note_card.dart';

class MobileCanvasView extends StatelessWidget {
  final DiagramCanvasData diagram;

  const MobileCanvasView({super.key, required this.diagram});

  @override
  Widget build(BuildContext context) {
    if (diagram.nodes.isEmpty && diagram.notes.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.dashboard_outlined, size: 56, color: Colors.grey),
            SizedBox(height: 12),
            Text(
              'El lienzo no tiene elementos aún.',
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
          ],
        ),
      );
    }

    // Área delimitada estándar de 5000 x 5000 px según especificación (RF-06.4, RB-10)
    const double canvasWidth = 5000.0;
    const double canvasHeight = 5000.0;

    final nodeMap = {for (var n in diagram.allNodes) n.id: n};

    return InteractiveViewer(
      boundaryMargin: const EdgeInsets.all(800),
      minScale: 0.1,
      maxScale: 3.5,
      constrained: false,
      child: Container(
        width: canvasWidth,
        height: canvasHeight,
        color: const Color(0xFFF8FAFC), // Slate 50
        child: Stack(
          children: [
            // Patrón de cuadrícula de fondo y marco delimitador perimetral
            Positioned.fill(
              child: CustomPaint(
                painter: GridDotsPainter(),
              ),
            ),

            // Trazado de relaciones y aristas UML con fidelidad gráfica completa
            Positioned.fill(
              child: CustomPaint(
                painter: UmlEdgesPainter(edges: diagram.edges, nodesMap: nodeMap),
              ),
            ),

            // Nodos de clases UML renderizados como tarjetas interactivas ortogonales
            for (final node in diagram.nodes)
              Positioned(
                left: node.x,
                top: node.y,
                child: UmlClassCard(
                  node: node,
                  edges: diagram.edges,
                  nodeNames: diagram.nodeNames,
                ),
              ),

            // Nodos de notas UML renderizados con pliegue dog-ear
            for (final note in diagram.notes)
              Positioned(
                left: note.x,
                top: note.y,
                child: UmlNoteCard(note: note),
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
    // 1. Puntos de cuadrícula sutiles
    final dotPaint = Paint()
      ..color = const Color(0xFFCBD5E1)
      ..strokeWidth = 1.2;

    const gap = 24.0;
    for (double x = 0; x < size.width; x += gap) {
      for (double y = 0; y < size.height; y += gap) {
        canvas.drawCircle(Offset(x, y), 1.0, dotPaint);
      }
    }

    // 2. Marco perimetral punteado delimitando los 5000 x 5000 px
    final borderPaint = Paint()
      ..color = const Color(0xFF94A3B8)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    _drawDashedRect(canvas, Rect.fromLTWH(4, 4, size.width - 8, size.height - 8), borderPaint);

    // 3. Texto indicador de límites espaciales
    final textSpan = const TextSpan(
      text: 'Espacio Delimitado UML 5000 x 5000 px · Visor Móvil Companion',
      style: TextStyle(
        color: Color(0xFF64748B),
        fontSize: 13,
        fontWeight: FontWeight.bold,
      ),
    );
    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(canvas, const Offset(20, 20));
  }

  void _drawDashedRect(Canvas canvas, Rect rect, Paint paint) {
    _drawDashedSegment(canvas, rect.topLeft, rect.topRight, paint);
    _drawDashedSegment(canvas, rect.topRight, rect.bottomRight, paint);
    _drawDashedSegment(canvas, rect.bottomRight, rect.bottomLeft, paint);
    _drawDashedSegment(canvas, rect.bottomLeft, rect.topLeft, paint);
  }

  void _drawDashedSegment(Canvas canvas, Offset p1, Offset p2, Paint paint) {
    const dashLength = 8.0;
    const dashSpace = 6.0;
    final totalDistance = (p2 - p1).distance;
    final count = (totalDistance / (dashLength + dashSpace)).floor();
    final unitVector = (p2 - p1) / totalDistance;

    for (int i = 0; i < count; i++) {
      final start = p1 + unitVector * (i * (dashLength + dashSpace));
      final end = start + unitVector * dashLength;
      canvas.drawLine(start, end, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class UmlEdgesPainter extends CustomPainter {
  final List<UmlEdge> edges;
  final Map<String, UmlCanvasNode> nodesMap;

  UmlEdgesPainter({required this.edges, required this.nodesMap});

  @override
  void paint(Canvas canvas, Size size) {
    const strokeColor = Color(0xFF334155); // Slate 700

    for (final edge in edges) {
      final source = nodesMap[edge.source];
      final target = nodesMap[edge.target];
      if (source == null || target == null) continue;

      // Estimación del tamaño de cada clasificador o nota
      final double cardW1 = source is UmlNoteNode ? 200.0 : 220.0;
      final double sourceH = source is UmlClassNode
          ? max(110.0, 70.0 + (source.attributes.length + source.methods.length) * 16.0)
          : 110.0;

      final double cardW2 = target is UmlNoteNode ? 200.0 : 220.0;
      final double targetH = target is UmlClassNode
          ? max(110.0, 70.0 + (target.attributes.length + target.methods.length) * 16.0)
          : 110.0;

      final c1 = Offset(source.x + cardW1 / 2, source.y + sourceH / 2);
      final c2 = Offset(target.x + cardW2 / 2, target.y + targetH / 2);

      // Calcular puntos de intersección perimetral directa centro-a-borde
      final p1 = UmlMarkerPainterUtils.getNodePerimeterIntersection(c1, c2, cardW1, sourceH);
      final p2 = UmlMarkerPainterUtils.getNodePerimeterIntersection(c2, c1, cardW2, targetH);

      final linePaint = Paint()
        ..color = strokeColor
        ..strokeWidth = 1.8
        ..style = PaintingStyle.stroke;

      final relType = edge.relationType.toUpperCase();

      // 1. Trazado del cuerpo de la línea (punteada vs continua)
      // Soporta clases-asociación, dependencias y realizaciones
      if (relType == 'DEPENDENCY' || relType == 'REALIZATION' || edge.isAssociationClass) {
        _drawDashedLine(canvas, p1, p2, linePaint);
      } else {
        canvas.drawLine(p1, p2, linePaint);
      }

      // 2. Renderizado de marcadores gráficos UML 2.5 orientados
      switch (relType) {
        case 'GENERALIZATION':
        case 'REALIZATION':
          UmlMarkerPainterUtils.drawClosedTriangle(canvas, p2, p1, strokeColor);
          break;

        case 'DIRECTED_ASSOCIATION':
        case 'DEPENDENCY':
          UmlMarkerPainterUtils.drawOpenArrow(canvas, p2, p1, strokeColor);
          break;

        case 'AGGREGATION':
          UmlMarkerPainterUtils.drawDiamond(canvas, p1, p2, strokeColor, isFilled: false);
          break;

        case 'COMPOSITION':
          UmlMarkerPainterUtils.drawDiamond(canvas, p1, p2, strokeColor, isFilled: true);
          break;

        case 'ASSOCIATION':
        default:
          break;
      }

      // 3. Multiplicidades de Origen y Destino
      final dist = (p2 - p1).distance;
      if (dist > 30) {
        final ux = (p2.dx - p1.dx) / dist;
        final uy = (p2.dy - p1.dy) / dist;
        final perpX = -uy;
        final perpY = ux;

        if (edge.sourceMultiplicity.isNotEmpty) {
          final sourcePos = Offset(p1.dx + ux * 26 + perpX * 14, p1.dy + uy * 26 + perpY * 14);
          UmlMarkerPainterUtils.drawMultiplicityText(canvas, sourcePos, edge.sourceMultiplicity);
        }

        if (edge.targetMultiplicity.isNotEmpty) {
          final targetPos = Offset(p2.dx - ux * 26 + perpX * 14, p2.dy - uy * 26 + perpY * 14);
          UmlMarkerPainterUtils.drawMultiplicityText(canvas, targetPos, edge.targetMultiplicity);
        }
      }
    }
  }

  void _drawDashedLine(Canvas canvas, Offset p1, Offset p2, Paint paint) {
    const dashWidth = 6.0;
    const dashSpace = 4.0;
    final dist = (p2 - p1).distance;
    if (dist <= 0) return;

    final count = (dist / (dashWidth + dashSpace)).floor();
    final unit = (p2 - p1) / dist;

    for (int i = 0; i < count; i++) {
      final start = p1 + unit * (i * (dashWidth + dashSpace));
      final end = start + unit * dashWidth;
      canvas.drawLine(start, end, paint);
    }
  }

  @override
  bool shouldRepaint(covariant UmlEdgesPainter oldDelegate) => true;
}

class UmlClassCard extends StatelessWidget {
  final UmlClassNode node;
  final List<UmlEdge> edges;
  final Map<String, String>? nodeNames;

  const UmlClassCard({
    super.key,
    required this.node,
    this.edges = const [],
    this.nodeNames,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => ClassDetailBottomSheet.show(context, node, edges, nodeNames),
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        child: Container(
          width: 220,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.zero,
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
                  borderRadius: BorderRadius.zero,
                  border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
                ),
                child: Column(
                  children: [
                    if (node.stereotype.isNotEmpty)
                      Text(
                        '«${node.stereotype}»',
                        style: const TextStyle(
                          fontSize: 10,
                          fontStyle: FontStyle.italic,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    Text(
                      node.name,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        fontStyle: node.isAbstract ? FontStyle.italic : FontStyle.normal,
                        color: const Color(0xFF0F172A), // Slate 900
                      ),
                    ),
                  ],
                ),
              ),

              // Compartimento de Atributos
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.zero,
                  border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
                ),
                child: node.attributes.isEmpty
                    ? const Text(
                        'sin atributos',
                        style: TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: Color(0xFF94A3B8)),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: node.attributes
                            .map(
                              (attr) => Padding(
                                padding: const EdgeInsets.symmetric(vertical: 1.5),
                                child: Text(
                                  attr,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    color: Color(0xFF334155),
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                      ),
              ),

              // Compartimento de Métodos
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.zero,
                ),
                child: node.methods.isEmpty
                    ? const Text(
                        'sin métodos',
                        style: TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: Color(0xFF94A3B8)),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: node.methods
                            .map(
                              (m) => Padding(
                                padding: const EdgeInsets.symmetric(vertical: 1.5),
                                child: Text(
                                  m,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    color: Color(0xFF334155),
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
