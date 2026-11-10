import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/diagram_model.dart';
import '../models/linked_diagram.dart';
import '../services/diagram_api_service.dart';
import '../services/local_storage_service.dart';
import '../services/stomp_socket_service.dart';

enum ViewerConnectionState {
  disconnected,
  connecting,
  onlineSynced,
  offlineCached,
  error,
}

class DiagramViewerController extends ChangeNotifier {
  final DiagramApiService _apiService = DiagramApiService();
  final StompSocketService _stompService = StompSocketService();
  final LocalStorageService _storageService = LocalStorageService();

  ViewerConnectionState _connectionState = ViewerConnectionState.disconnected;
  DiagramCanvasData? _diagramData;
  String? _errorMessage;
  String? _recentToastMessage;
  Timer? _toastDismissTimer;

  int? _currentDiagramId;
  String _currentHostUrl = 'http://52.90.161.62';

  ViewerConnectionState get connectionState => _connectionState;
  DiagramCanvasData? get diagramData => _diagramData;
  String? get errorMessage => _errorMessage;
  String? get recentToastMessage => _recentToastMessage;
  int? get currentDiagramId => _currentDiagramId;
  String get currentHostUrl => _currentHostUrl;

  bool get isOnline => _connectionState == ViewerConnectionState.onlineSynced;
  bool get isOffline => _connectionState == ViewerConnectionState.offlineCached;

  /// Inicia el flujo de conexión a partir de una URL escaneada o un ID numérico
  Future<void> connectWithInput(String input, {String fallbackHost = 'http://52.90.161.62'}) async {
    // 1. Sanitizar comillas simples, dobles o barras accidentales al inicio/fin
    final cleaned = input.trim().replaceAll(RegExp(r"""^['"/]+|['"/]+$"""), '').trim();
    if (cleaned.isEmpty) {
      _errorMessage = 'Por favor ingresa una URL válida o el ID del diagrama.';
      _connectionState = ViewerConnectionState.error;
      notifyListeners();
      return;
    }

    int? diagramId;
    String hostUrl = fallbackHost.trim();
    if (hostUrl.isEmpty) {
      hostUrl = 'http://52.90.161.62';
    }

    // 2. Extraer ID del diagrama mediante Regex (/diagrams/20 o ?id=20 o número directo)
    final matchDiagrams = RegExp(r'/diagrams/(\d+)').firstMatch(cleaned);
    if (matchDiagrams != null) {
      diagramId = int.tryParse(matchDiagrams.group(1)!);
    } else {
      final matchQuery = RegExp(r'[?&]id=(\d+)').firstMatch(cleaned);
      if (matchQuery != null) {
        diagramId = int.tryParse(matchQuery.group(1)!);
      }
    }

    // Si aún no se encontró, probar si el input completo es un número de ID
    diagramId ??= int.tryParse(cleaned);

    // 3. Determinar el Host del Backend inteligentemente (Local vs Producción Online)
    final isPureNumber = RegExp(r'^\d+$').hasMatch(cleaned);
    if (!isPureNumber) {
      try {
        String urlToParse = cleaned;
        if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
          urlToParse = 'http://$urlToParse';
        }
        final uri = Uri.tryParse(urlToParse);

        if (uri != null && uri.host.isNotEmpty) {
          final host = uri.host.toLowerCase();
          final isLocalHost = host == 'localhost' || host == '127.0.0.1';

          if (isLocalHost) {
            // En entorno local (emulador Android), usar el fallbackHost configurado (ej: http://10.0.2.2:8080)
            // para no apuntar erróneamente al puerto del frontend (3000) ni al loopback del teléfono
            hostUrl = fallbackHost;
          } else {
            // En entorno online / producción, el backend suele estar bajo el mismo dominio (vía Nginx)
            final portPart = uri.hasPort ? ':${uri.port}' : '';
            hostUrl = '${uri.scheme}://${uri.host}$portPart';
          }
        }
      } catch (_) {}
    }

    if (diagramId == null) {
      _errorMessage = 'No se pudo extraer el ID del diagrama del enlace ingresado.';
      _connectionState = ViewerConnectionState.error;
      notifyListeners();
      return;
    }

    _currentDiagramId = diagramId;
    _currentHostUrl = hostUrl;
    await loadDiagram(diagramId, hostUrl);
  }

  /// Carga el diagrama mediante REST, inicializa el socket STOMP y guarda en caché
  Future<void> loadDiagram(int diagramId, String hostUrl) async {
    _connectionState = ViewerConnectionState.connecting;
    _errorMessage = null;
    notifyListeners();

    try {
      // 1. Intentar consulta REST inicial
      final response = await _apiService.fetchDiagram(hostUrl, diagramId);
      final name = response['nombre']?.toString() ?? 'Diagrama #$diagramId';
      final lienzoStr = response['lienzo']?.toString() ?? '{}';

      final lienzoJson = jsonDecode(lienzoStr) as Map<String, dynamic>;
      _diagramData = DiagramCanvasData.fromJson(lienzoJson, name);
      _connectionState = ViewerConnectionState.onlineSynced;

      // 2. Guardar en almacenamiento local persistente (multi-lienzo)
      await _storageService.saveDiagramJson(diagramId, name, lienzoStr);
      await _storageService.saveLinkedDiagram(LinkedDiagram(
        diagramId: diagramId,
        name: name,
        hostUrl: hostUrl,
        wsEndpoint: '/ws',
        linkedAt: DateTime.now(),
        lastAccessedAt: DateTime.now(),
      ));

      // 3. Conectar STOMP WebSockets
      _initStompConnection(diagramId, hostUrl);
    } catch (e) {
      debugPrint('Fallo al consultar API REST, intentando caché offline: $e');

      // Intentar cargar desde caché local
      final cachedJson = await _storageService.getCachedDiagramJson(diagramId);
      if (cachedJson != null && cachedJson.isNotEmpty) {
        try {
          final parsed = jsonDecode(cachedJson) as Map<String, dynamic>;
          _diagramData = DiagramCanvasData.fromJson(parsed, 'Diagrama (Caché Offline)');
          _connectionState = ViewerConnectionState.offlineCached;
          _showToast('Modo sin conexión: Mostrando última versión guardada.');
          _initStompConnection(diagramId, hostUrl);
        } catch (_) {
          _setFailedState('Caché local corrupto o ilegible.');
        }
      } else {
        _setFailedState('Sin conexión al servidor y no existe copia en caché local.');
      }
    }

    notifyListeners();
  }

  void _initStompConnection(int diagramId, String hostUrl) {
    _stompService.connect(
      wsUrl: hostUrl,
      diagramId: diagramId,
      onMessage: _handleWebSocketMessage,
      onStatusChange: (bool isConnected) {
        if (isConnected) {
          if (_connectionState == ViewerConnectionState.offlineCached ||
              _connectionState == ViewerConnectionState.connecting) {
            _connectionState = ViewerConnectionState.onlineSynced;
            _showToast('Conectado en tiempo real');
            notifyListeners();
          }
        } else {
          if (_connectionState == ViewerConnectionState.onlineSynced) {
            _connectionState = ViewerConnectionState.offlineCached;
            _showToast('Conexión perdida. Mostrando versión local.');
            notifyListeners();
          }
        }
      },
    );
  }

  void _handleWebSocketMessage(Map<String, dynamic> message) {
    final type = message['type']?.toString();
    final author = message['userName']?.toString() ?? 'Un colaborador';

    if (type == 'SYNC_CANVAS') {
      final payloadStr = message['payload']?.toString();
      if (payloadStr != null && payloadStr.isNotEmpty) {
        try {
          final payload = jsonDecode(payloadStr) as Map<String, dynamic>;
          _diagramData = DiagramCanvasData.fromJson(
            payload,
            _diagramData?.diagramName ?? 'Diagrama',
          );
          if (_currentDiagramId != null) {
            _storageService.saveDiagramJson(
              _currentDiagramId!,
              _diagramData!.diagramName,
              payloadStr,
            );
          }
          _showToast('$author ha modificado el lienzo');
          notifyListeners();
        } catch (e) {
          debugPrint('Error parseando SYNC_CANVAS en móvil: $e');
        }
      }
    }
  }

  void _showToast(String message) {
    _recentToastMessage = message;
    _toastDismissTimer?.cancel();
    _toastDismissTimer = Timer(const Duration(seconds: 4), () {
      _recentToastMessage = null;
      notifyListeners();
    });
    notifyListeners();
  }

  void _setFailedState(String msg) {
    _errorMessage = msg;
    _connectionState = ViewerConnectionState.error;
    notifyListeners();
  }

  /// Desvincula la sesión móvil voluntariamente, cierra sockets y limpia
  Future<void> disconnectAndUnbind({bool removePermanently = false}) async {
    final diagramId = _currentDiagramId;
    _stompService.disconnect();
    _toastDismissTimer?.cancel();
    _connectionState = ViewerConnectionState.disconnected;
    _diagramData = null;
    _currentDiagramId = null;
    _recentToastMessage = null;
    if (removePermanently && diagramId != null) {
      await _storageService.removeLinkedDiagram(diagramId);
    } else {
      await _storageService.clearSession();
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _stompService.disconnect();
    _toastDismissTimer?.cancel();
    super.dispose();
  }
}
