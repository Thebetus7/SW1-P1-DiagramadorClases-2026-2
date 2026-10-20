import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/local_storage_service.dart';
import '../state/diagram_viewer_controller.dart';
import 'canvas_viewer_screen.dart';

class LinkEntryScreen extends StatefulWidget {
  final DiagramViewerController controller;

  const LinkEntryScreen({super.key, required this.controller});

  @override
  State<LinkEntryScreen> createState() => _LinkEntryScreenState();
}

class _LinkEntryScreenState extends State<LinkEntryScreen> {
  final TextEditingController _urlOrIdController = TextEditingController();
  final TextEditingController _hostController = TextEditingController(text: 'http://10.0.2.2:8080');
  final LocalStorageService _storageService = LocalStorageService();

  Map<String, dynamic>? _lastSession;
  bool _isLoadingRecent = true;

  @override
  void initState() {
    super.initState();
    _loadRecentSession();
  }

  Future<void> _loadRecentSession() async {
    try {
      final session = await _storageService.getLastSession();
      if (mounted) {
        setState(() {
          _lastSession = session;
          _isLoadingRecent = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingRecent = false);
      }
    }
  }

  Future<void> _handleConnect(String input) async {
    final host = _hostController.text.trim();
    final fallbackHost = host.isNotEmpty ? host : 'http://10.0.2.2:8080';

    await widget.controller.connectWithInput(input, fallbackHost: fallbackHost);

    if (!mounted) return;

    if (widget.controller.connectionState != ViewerConnectionState.error) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => CanvasViewerScreen(controller: widget.controller),
        ),
      ).then((_) {
        // Al regresar, refrescar la sesión reciente por si hubo cambios o desvinculación
        _loadRecentSession();
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.controller.errorMessage ?? 'Error al vincular con el lienzo'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  void _openQrScanner() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _QrScannerView(
          onCodeScanned: (code) {
            Navigator.pop(context);
            _urlOrIdController.text = code;
            _handleConnect(code);
          },
        ),
      ),
    );
  }

  @override
  void dispose() {
    _urlOrIdController.dispose();
    _hostController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isConnecting = widget.controller.connectionState == ViewerConnectionState.connecting;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Slate 900
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        centerTitle: true,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1), // Indigo 500
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.account_tree_rounded, size: 20, color: Colors.white),
            ),
            const SizedBox(width: 10),
            const Text(
              'Visor UML Companion',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Hero Banner
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF312E81), Color(0xFF1E1B4B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF4F46E5).withValues(alpha: 0.4)),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Sincronización en Tiempo Real',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Escanea el código QR proyectado en el lienzo web o pega el enlace del diagrama para seguir los cambios en vivo desde tu dispositivo.',
                      style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, height: 1.4),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Botón Principal de Escaneo QR
              ElevatedButton.icon(
                onPressed: isConnecting ? null : _openQrScanner,
                icon: const Icon(Icons.qr_code_scanner_rounded, size: 24),
                label: const Text(
                  'Escanear Código QR',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4F46E5), // Indigo 600
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 4,
                ),
              ),

              const SizedBox(height: 24),

              // Separador con texto
              Row(
                children: [
                  Expanded(child: Divider(color: Colors.white.withValues(alpha: 0.15))),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'O INGRESA MANUALMENTE',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.5),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.1,
                      ),
                    ),
                  ),
                  Expanded(child: Divider(color: Colors.white.withValues(alpha: 0.15))),
                ],
              ),

              const SizedBox(height: 20),

              // Campo de entrada de URL o ID
              TextField(
                controller: _urlOrIdController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: InputDecoration(
                  labelText: 'URL o ID del Diagrama',
                  labelStyle: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
                  hintText: 'Ej. 1 o http://.../diagrams/1',
                  hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3)),
                  prefixIcon: const Icon(Icons.link_rounded, color: Color(0xFF818CF8)),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.15)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2),
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Servidor Backend Host
              TextField(
                controller: _hostController,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'Host Backend (API / WebSocket)',
                  labelStyle: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 12),
                  hintText: 'http://10.0.2.2:8080 (Android) o http://localhost:8080',
                  hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3)),
                  prefixIcon: const Icon(Icons.dns_rounded, size: 20, color: Color(0xFF94A3B8)),
                  filled: true,
                  fillColor: const Color(0xFF1E293B).withValues(alpha: 0.6),
                  contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
                  ),
                ),
              ),

              const SizedBox(height: 18),

              // Botón Conectar Manual
              OutlinedButton.icon(
                onPressed: isConnecting
                    ? null
                    : () {
                        final input = _urlOrIdController.text.trim();
                        if (input.isNotEmpty) {
                          _handleConnect(input);
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Por favor escribe un ID o pega una URL'),
                              backgroundColor: Colors.amber,
                            ),
                          );
                        }
                      },
                icon: isConnecting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.arrow_forward_rounded, size: 20),
                label: Text(isConnecting ? 'Conectando...' : 'Entrar al Lienzo'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFA5B4FC),
                  side: const BorderSide(color: Color(0xFF6366F1)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),

              const SizedBox(height: 32),

              // Sesión Reciente / Caché Offline
              if (!_isLoadingRecent && _lastSession != null) ...[
                Text(
                  'ÚLTIMA SESIÓN VINCULADA',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.6),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.1,
                  ),
                ),
                const SizedBox(height: 10),
                Card(
                  color: const Color(0xFF1E293B),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
                  ),
                  child: ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFF065F46), // Emerald 800
                      child: Icon(Icons.save_as_rounded, color: Color(0xFF34D399), size: 20),
                    ),
                    title: Text(
                      _lastSession!['name']?.toString() ?? 'Diagrama Reciente',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    subtitle: Text(
                      'ID: #${_lastSession!['diagramId']} • ${_lastSession!['hostUrl']}',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    ),
                    trailing: const Icon(Icons.chevron_right_rounded, color: Colors.white70),
                    onTap: () {
                      final id = _lastSession!['diagramId'].toString();
                      final host = _lastSession!['hostUrl'].toString();
                      _hostController.text = host;
                      _urlOrIdController.text = id;
                      _handleConnect(id);
                    },
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Vista modal con cámara para escaneo de códigos QR mediante mobile_scanner
class _QrScannerView extends StatefulWidget {
  final ValueChanged<String> onCodeScanned;

  const _QrScannerView({required this.onCodeScanned});

  @override
  State<_QrScannerView> createState() => _QrScannerViewState();
}

class _QrScannerViewState extends State<_QrScannerView> {
  final MobileScannerController _scannerController = MobileScannerController();
  bool _hasDetected = false;

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Escanear QR de Vinculación', style: TextStyle(color: Colors.white, fontSize: 16)),
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on_rounded),
            onPressed: () => _scannerController.toggleTorch(),
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_ios_rounded),
            onPressed: () => _scannerController.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _scannerController,
            onDetect: (BarcodeCapture capture) {
              if (_hasDetected) return;
              final barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                final val = barcode.rawValue;
                if (val != null && val.isNotEmpty) {
                  _hasDetected = true;
                  widget.onCodeScanned(val);
                  break;
                }
              }
            },
          ),
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFF6366F1), width: 3),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          const Positioned(
            bottom: 40,
            left: 20,
            right: 20,
            child: Text(
              'Apunta al código QR generado en el lienzo web para sincronizar automáticamente.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 13, backgroundColor: Colors.black54),
            ),
          ),
        ],
      ),
    );
  }
}
