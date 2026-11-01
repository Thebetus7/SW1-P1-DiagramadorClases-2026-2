import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:intl/intl.dart';
import '../models/linked_diagram.dart';
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

  List<LinkedDiagram> _linkedDiagrams = [];
  bool _isLoadingList = true;

  @override
  void initState() {
    super.initState();
    _loadLinkedDiagrams();
  }

  Future<void> _loadLinkedDiagrams() async {
    try {
      final list = await _storageService.getLinkedDiagrams();
      if (mounted) {
        setState(() {
          _linkedDiagrams = list;
          _isLoadingList = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingList = false);
      }
    }
  }

  Future<void> _handleConnect(String input, {String? host}) async {
    final activeHost = host ?? _hostController.text.trim();
    final fallbackHost = activeHost.isNotEmpty ? activeHost : 'http://10.0.2.2:8080';

    await widget.controller.connectWithInput(input, fallbackHost: fallbackHost);

    if (!mounted) return;

    if (widget.controller.connectionState != ViewerConnectionState.error) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => CanvasViewerScreen(controller: widget.controller),
        ),
      ).then((_) {
        // Al regresar, refrescar la lista de lienzos vinculados
        _loadLinkedDiagrams();
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

  Future<void> _confirmAndUnlink(LinkedDiagram diagram) async {
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
        content: Text(
          '¿Estás seguro de que deseas desvincular el diagrama "${diagram.name}" (#${diagram.diagramId})? Ya no aparecerá en tu lista principal hasta que lo vuelvas a vincular.',
          style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, height: 1.4),
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
      await _storageService.removeLinkedDiagram(diagram.diagramId);
      await _loadLinkedDiagrams();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lienzo "${diagram.name}" desvinculado con éxito'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      }
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
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Hero Banner
              Container(
                padding: const EdgeInsets.all(18),
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
                      'Modelado Colaborativo en Vivo',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Sigue en tiempo real los cambios del lienzo UML desde tu móvil, con notificaciones instantáneas y persistencia multi-lienzo.',
                      style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12.5, height: 1.4),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 22),

              // Botón Principal de Escaneo QR
              ElevatedButton.icon(
                onPressed: isConnecting ? null : _openQrScanner,
                icon: const Icon(Icons.qr_code_scanner_rounded, size: 22),
                label: const Text(
                  'Escanear Código QR',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4F46E5), // Indigo 600
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 3,
                ),
              ),

              const SizedBox(height: 20),

              // Separador con texto
              Row(
                children: [
                  Expanded(child: Divider(color: Colors.white.withValues(alpha: 0.15))),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Text(
                      'O INGRESA MANUALMENTE',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.5),
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.1,
                      ),
                    ),
                  ),
                  Expanded(child: Divider(color: Colors.white.withValues(alpha: 0.15))),
                ],
              ),

              const SizedBox(height: 16),

              // Campo de entrada de URL o ID
              TextField(
                controller: _urlOrIdController,
                style: const TextStyle(color: Colors.white, fontSize: 13.5),
                decoration: InputDecoration(
                  labelText: 'URL o ID del Diagrama',
                  labelStyle: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 13),
                  hintText: 'Ej. 1 o http://.../diagrams/1',
                  hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 12),
                  prefixIcon: const Icon(Icons.link_rounded, color: Color(0xFF818CF8), size: 20),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
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

              const SizedBox(height: 10),

              // Servidor Backend Host
              TextField(
                controller: _hostController,
                style: const TextStyle(color: Colors.white, fontSize: 12.5),
                decoration: InputDecoration(
                  labelText: 'Host Backend (API / WebSocket)',
                  labelStyle: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 11.5),
                  hintText: 'http://10.0.2.2:8080 (Android) o http://localhost:8080',
                  hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 11),
                  prefixIcon: const Icon(Icons.dns_rounded, size: 18, color: Color(0xFF94A3B8)),
                  filled: true,
                  fillColor: const Color(0xFF1E293B).withValues(alpha: 0.6),
                  contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.15)),
                  ),
                ),
              ),

              const SizedBox(height: 14),

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
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.arrow_forward_rounded, size: 18),
                label: Text(isConnecting ? 'Conectando...' : 'Entrar al Lienzo'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFA5B4FC),
                  side: const BorderSide(color: Color(0xFF6366F1)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),

              const SizedBox(height: 28),

              // SECCIÓN: LIENZOS VINCULADOS (PERSISTENTES HASTA DESVINCULACIÓN MANUAL)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'LIENZOS VINCULADOS (${_linkedDiagrams.length})',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.65),
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.1,
                    ),
                  ),
                  if (_linkedDiagrams.isNotEmpty)
                    Text(
                      'Toca para abrir',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),

              if (_isLoadingList)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(20),
                    child: CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 2),
                  ),
                )
              else if (_linkedDiagrams.isEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B).withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.link_off_rounded, size: 36, color: Colors.white.withValues(alpha: 0.3)),
                      const SizedBox(height: 8),
                      Text(
                        'No tienes lienzos vinculados actualmente.',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 13),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Escanea un código QR para agregarlo a tu lista permanente.',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 11.5),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _linkedDiagrams.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final diagram = _linkedDiagrams[index];
                    final dateStr = DateFormat('dd/MM/yyyy HH:mm').format(diagram.lastAccessedAt);

                    return Card(
                      color: const Color(0xFF1E293B),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
                      ),
                      elevation: 2,
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF4F46E5).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.3)),
                          ),
                          child: const Icon(Icons.account_tree_outlined, color: Color(0xFF818CF8), size: 20),
                        ),
                        title: Text(
                          diagram.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          'ID: #${diagram.diagramId} · Último acceso: $dateStr',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFF87171), size: 20),
                              tooltip: 'Desvincular manualmente',
                              onPressed: () => _confirmAndUnlink(diagram),
                            ),
                            const Icon(Icons.chevron_right_rounded, color: Colors.white54, size: 20),
                          ],
                        ),
                        onTap: () {
                          _hostController.text = diagram.hostUrl;
                          _urlOrIdController.text = diagram.diagramId.toString();
                          _handleConnect(diagram.diagramId.toString(), host: diagram.hostUrl);
                        },
                      ),
                    );
                  },
                ),
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
  bool _hasScanned = false;

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
        backgroundColor: Colors.black,
        elevation: 0,
        title: const Text('Escanear QR de Vinculación', style: TextStyle(color: Colors.white, fontSize: 16)),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _scannerController,
            onDetect: (capture) {
              if (_hasScanned) return;
              final barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                final rawValue = barcode.rawValue;
                if (rawValue != null && rawValue.isNotEmpty) {
                  _hasScanned = true;
                  widget.onCodeScanned(rawValue);
                  break;
                }
              }
            },
          ),
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFF6366F1), width: 2.5),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
