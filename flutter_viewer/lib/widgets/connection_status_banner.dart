import 'package:flutter/material.dart';
import '../state/diagram_viewer_controller.dart';

class ConnectionStatusBanner extends StatelessWidget {
  final ViewerConnectionState state;

  const ConnectionStatusBanner({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    if (state == ViewerConnectionState.offlineCached) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        color: const Color(0xFFD97706), // Amber 600
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wifi_off_rounded, color: Colors.white, size: 16),
            SizedBox(width: 8),
            Text(
              'Modo sin conexión - Mostrando última versión guardada',
              style: TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );
    }

    if (state == ViewerConnectionState.connecting) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        color: const Color(0xFF4F46E5), // Indigo 600
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 12,
              height: 12,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
            SizedBox(width: 8),
            Text(
              'Sincronizando con el lienzo en vivo...',
              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }
}
