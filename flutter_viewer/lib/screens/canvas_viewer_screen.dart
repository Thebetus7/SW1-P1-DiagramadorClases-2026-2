import 'package:flutter/material.dart';
import '../state/diagram_viewer_controller.dart';
import '../widgets/collaborator_toast.dart';
import '../widgets/connection_status_banner.dart';
import '../widgets/mobile_canvas_painter.dart';

class CanvasViewerScreen extends StatefulWidget {
  final DiagramViewerController controller;

  const CanvasViewerScreen({super.key, required this.controller});

  @override
  State<CanvasViewerScreen> createState() => _CanvasViewerScreenState();
}

class _CanvasViewerScreenState extends State<CanvasViewerScreen> {
  Future<void> _confirmUnlink() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.link_off_rounded, color: Colors.amberAccent, size: 24),
            SizedBox(width: 10),
            Text('Desvincular Lienzo', style: TextStyle(color: Colors.white, fontSize: 18)),
          ],
        ),
        content: const Text(
          '¿Estás seguro de que deseas desvincular este dispositivo móvil del diagrama en vivo? Se cerrará la sesión activa y la conexión en tiempo real.',
          style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444), // Red 500
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Desvincular'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await widget.controller.disconnectAndUnbind();
      if (mounted) {
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.controller,
      builder: (context, _) {
        final data = widget.controller.diagramData;
        final diagramName = data?.diagramName ?? 'Lienzo UML';
        final isConnecting = widget.controller.connectionState == ViewerConnectionState.connecting;
        final isOffline = widget.controller.isOffline;
        final isOnline = widget.controller.isOnline;

        return Scaffold(
          backgroundColor: const Color(0xFF0F172A), // Slate 900
          appBar: AppBar(
            backgroundColor: const Color(0xFF1E293B),
            elevation: 2,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  diagramName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isOnline
                            ? const Color(0xFF10B981) // Emerald
                            : (isOffline ? const Color(0xFFF59E0B) : const Color(0xFF6366F1)),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isOnline
                          ? 'Sincronizado en Vivo'
                          : (isOffline ? 'Caché Offline' : 'Conectando...'),
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.7),
                        fontSize: 11,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            actions: [
              // Botón manual de Desvinculación de sesión móvil (RN-02.06)
              TextButton.icon(
                onPressed: _confirmUnlink,
                icon: const Icon(Icons.link_off_rounded, size: 18, color: Color(0xFFF87171)),
                label: const Text(
                  'Desvincular',
                  style: TextStyle(
                    color: Color(0xFFF87171),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 8),
            ],
          ),
          body: Column(
            children: [
              // Banner superior de estado de red
              ConnectionStatusBanner(state: widget.controller.connectionState),

              // Contenido visual del diagrama
              Expanded(
                child: Stack(
                  children: [
                    if (data != null)
                      MobileCanvasView(diagram: data)
                    else if (isConnecting)
                      const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(color: Color(0xFF6366F1)),
                            SizedBox(height: 16),
                            Text(
                              'Cargando clases del diagrama...',
                              style: TextStyle(color: Colors.grey, fontSize: 13),
                            ),
                          ],
                        ),
                      )
                    else
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.cloud_off_rounded, size: 56, color: Colors.grey),
                              const SizedBox(height: 16),
                              Text(
                                widget.controller.errorMessage ?? 'No hay datos disponibles.',
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: Colors.white70, fontSize: 14),
                              ),
                              const SizedBox(height: 20),
                              ElevatedButton(
                                onPressed: () {
                                  if (widget.controller.currentDiagramId != null) {
                                    widget.controller.loadDiagram(
                                      widget.controller.currentDiagramId!,
                                      widget.controller.currentHostUrl,
                                    );
                                  }
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF4F46E5),
                                ),
                                child: const Text('Reintentar Conexión'),
                              ),
                            ],
                          ),
                        ),
                      ),

                    // Toast flotante animado de colaboradores
                    CollaboratorToast(message: widget.controller.recentToastMessage),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
