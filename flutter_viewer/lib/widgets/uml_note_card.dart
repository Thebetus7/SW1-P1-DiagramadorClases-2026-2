import 'package:flutter/material.dart';
import '../models/diagram_model.dart';

class UmlNoteCard extends StatelessWidget {
  final UmlNoteNode note;

  const UmlNoteCard({super.key, required this.note});

  @override
  Widget build(BuildContext context) {
    const double foldSize = 14.0;

    return Container(
      width: 200,
      decoration: const BoxDecoration(
        color: Color(0xFFFFFFE6), // Amarillo suave técnico de Enterprise Architect
        borderRadius: BorderRadius.zero,
        border: Border.fromBorderSide(
          BorderSide(color: Color(0xFFEAB308), width: 1.0), // Amber 500
        ),
        boxShadow: [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Pliegue dog-ear en la esquina superior derecha
          Positioned(
            top: 0,
            right: 0,
            child: SizedBox(
              width: foldSize,
              height: foldSize,
              child: CustomPaint(
                painter: DogEarFoldPainter(
                  foldColor: const Color(0xFFFEF08A), // Amber 200
                  borderColor: const Color(0xFFCA8A04), // Amber 600
                  cornerBackgroundColor: const Color(0xFFF8FAFC), // Slate 50 (fondo del lienzo)
                ),
              ),
            ),
          ),

          // Contenido de la nota
          Padding(
            padding: const EdgeInsets.all(10.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Cabecera de la nota
                Padding(
                  padding: const EdgeInsets.only(right: foldSize),
                  child: Row(
                    children: [
                      const Icon(Icons.sticky_note_2_outlined, size: 14, color: Color(0xFF92400E)),
                      const SizedBox(width: 4),
                      const Text(
                        'NOTA UML',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.6,
                          color: Color(0xFF92400E), // Amber 800
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                const Divider(height: 1, thickness: 1, color: Color(0xFFFDE68A)), // Amber 200
                const SizedBox(height: 6),

                // Texto explicativo con desplazamiento vertical si es extenso
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 180),
                  child: SingleChildScrollView(
                    child: Text(
                      note.content.isEmpty ? 'Escribe una nota aquí...' : note.content,
                      style: const TextStyle(
                        fontSize: 11,
                        height: 1.35,
                        color: Color(0xFF1E293B), // Slate 800
                      ),
                    ),
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

class DogEarFoldPainter extends CustomPainter {
  final Color foldColor;
  final Color borderColor;
  final Color cornerBackgroundColor;

  DogEarFoldPainter({
    required this.foldColor,
    required this.borderColor,
    required this.cornerBackgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Cubrir la esquina exterior con el fondo del lienzo
    final bgPaint = Paint()
      ..color = cornerBackgroundColor
      ..style = PaintingStyle.fill;
    final bgPath = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width, size.height)
      ..close();
    canvas.drawPath(bgPath, bgPaint);

    // 2. Dibujar la solapa doblada hacia adentro
    final foldPaint = Paint()
      ..color = foldColor
      ..style = PaintingStyle.fill;
    final foldPath = Path()
      ..moveTo(0, 0)
      ..lineTo(0, size.height)
      ..lineTo(size.width, size.height)
      ..close();
    canvas.drawPath(foldPath, foldPaint);

    // 3. Trazos delimitadores del pliegue técnico
    final linePaint = Paint()
      ..color = borderColor
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;
    canvas.drawLine(Offset.zero, Offset(size.width, size.height), linePaint);
    canvas.drawLine(Offset.zero, Offset(0, size.height), linePaint);
    canvas.drawLine(Offset(0, size.height), Offset(size.width, size.height), linePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
