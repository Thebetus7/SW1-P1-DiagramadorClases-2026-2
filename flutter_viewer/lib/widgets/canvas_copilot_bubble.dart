import 'package:flutter/material.dart';

class CanvasCopilotBubble extends StatelessWidget {
  final bool isOpen;
  final VoidCallback onToggle;
  final int unreadCount;
  final bool isThinking;

  const CanvasCopilotBubble({
    super.key,
    required this.isOpen,
    required this.onToggle,
    this.unreadCount = 0,
    this.isThinking = false,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      bottom: 24,
      right: 20,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Píldora "Pensando..." flotante cuando está cerrado y la IA procesa
          if (isThinking && !isOpen) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: const Color(0xE60F172A), // Slate 900 con 90% opacidad
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0x66818CF8)), // Indigo 400
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x33000000),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 10,
                    height: 10,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF818CF8)),
                    ),
                  ),
                  SizedBox(width: 8),
                  Text(
                    'Copilot pensando...',
                    style: TextStyle(
                      color: Color(0xFFC7D2FE),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Botón circular principal con gradiente
          GestureDetector(
            onTap: onToggle,
            child: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: isOpen
                      ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                      : isThinking
                          ? [const Color(0xFF4F46E5), const Color(0xFF9333EA), const Color(0xFFDB2777)]
                          : [const Color(0xFF4F46E5), const Color(0xFF6366F1), const Color(0xFF9333EA)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: isOpen
                        ? Colors.black26
                        : const Color(0x666366F1), // Glow Indigo
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
                border: Border.all(
                  color: isOpen ? const Color(0xFF475569) : Colors.white.withValues(alpha: 0.2),
                  width: 1.5,
                ),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Icon(
                    isOpen
                        ? Icons.close_rounded
                        : (isThinking ? Icons.auto_awesome : Icons.smart_toy_rounded),
                    color: Colors.white,
                    size: 26,
                  ),

                  // Badge de mensajes no leídos
                  if (unreadCount > 0 && !isOpen)
                    Positioned(
                      top: 4,
                      right: 4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF43F5E), // Rose 500
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                        constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                        child: Center(
                          child: Text(
                            unreadCount > 9 ? '9+' : '$unreadCount',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

