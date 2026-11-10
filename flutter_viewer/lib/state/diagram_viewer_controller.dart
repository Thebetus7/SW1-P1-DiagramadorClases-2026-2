import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/chat_message_model.dart';
import '../models/diagram_model.dart';
import '../models/linked_diagram.dart';
import '../services/copilot_ai_service.dart';
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
  final CopilotAiService _copilotAiService = CopilotAiService();

  ViewerConnectionState _connectionState = ViewerConnectionState.disconnected;
  DiagramCanvasData? _diagramData;
  String? _errorMessage;
  String? _recentToastMessage;
  Timer? _toastDismissTimer;

  int? _currentDiagramId;
  String _currentHostUrl = 'http://52.90.161.62';

  // --- Estado de Copilot IA y Chat ---
  final List<ChatMessageModel> _chatMessages = [];
  bool _isCopilotLoading = false;
  bool _isCopilotDrawerOpen = false;
  int _unreadCount = 0;
  String? _applyingProposalId;

  ViewerConnectionState get connectionState => _connectionState;
  DiagramCanvasData? get diagramData => _diagramData;
  String? get errorMessage => _errorMessage;
  String? get recentToastMessage => _recentToastMessage;
  int? get currentDiagramId => _currentDiagramId;
  String get currentHostUrl => _currentHostUrl;

  List<ChatMessageModel> get chatMessages => List.unmodifiable(_chatMessages);
  bool get isCopilotLoading => _isCopilotLoading;
  bool get isCopilotDrawerOpen => _isCopilotDrawerOpen;
  int get unreadCount => _unreadCount;
  String? get applyingProposalId => _applyingProposalId;

  bool get isOnline => _connectionState == ViewerConnectionState.onlineSynced;
  bool get isOffline => _connectionState == ViewerConnectionState.offlineCached;

  void toggleCopilotDrawer() {
    _isCopilotDrawerOpen = !_isCopilotDrawerOpen;
    if (_isCopilotDrawerOpen) {
      _unreadCount = 0;
    }
    notifyListeners();
  }

  void closeCopilotDrawer() {
    if (_isCopilotDrawerOpen) {
      _isCopilotDrawerOpen = false;
      notifyListeners();
    }
  }

  /// Inicia el flujo de conexión a partir de una URL escaneada o un ID numérico
  Future<void> connectWithInput(String input, {String fallbackHost = 'http://52.90.161.62'}) async {
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

    final matchDiagrams = RegExp(r'/diagrams/(\d+)').firstMatch(cleaned);
    if (matchDiagrams != null) {
      diagramId = int.tryParse(matchDiagrams.group(1)!);
    } else {
      final matchQuery = RegExp(r'[?&]id=(\d+)').firstMatch(cleaned);
      if (matchQuery != null) {
        diagramId = int.tryParse(matchQuery.group(1)!);
      }
    }

    diagramId ??= int.tryParse(cleaned);

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
            hostUrl = fallbackHost;
          } else {
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

  /// Carga el diagrama mediante REST, inicializa el socket STOMP y carga el historial de chat
  Future<void> loadDiagram(int diagramId, String hostUrl) async {
    _connectionState = ViewerConnectionState.connecting;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.fetchDiagram(hostUrl, diagramId);
      final name = response['nombre']?.toString() ?? 'Diagrama #$diagramId';
      final lienzoStr = response['lienzo']?.toString() ?? '{}';

      final lienzoJson = jsonDecode(lienzoStr) as Map<String, dynamic>;
      _diagramData = DiagramCanvasData.fromJson(lienzoJson, name);
      _connectionState = ViewerConnectionState.onlineSynced;

      await _storageService.saveDiagramJson(diagramId, name, lienzoStr);
      await _storageService.saveLinkedDiagram(LinkedDiagram(
        diagramId: diagramId,
        name: name,
        hostUrl: hostUrl,
        wsEndpoint: '/ws',
        linkedAt: DateTime.now(),
        lastAccessedAt: DateTime.now(),
      ));

      _initStompConnection(diagramId, hostUrl);

      // Cargar historial de chat desde DynamoDB
      _loadChatHistory(diagramId, hostUrl);
    } catch (e) {
      debugPrint('Fallo al consultar API REST, intentando caché offline: $e');

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

  Future<void> _loadChatHistory(int diagramId, String hostUrl) async {
    try {
      final history = await _apiService.fetchChatHistory(hostUrl, diagramId);
      _chatMessages.clear();
      _chatMessages.addAll(history);
      notifyListeners();
    } catch (e) {
      debugPrint('Error cargando historial de chat en móvil: $e');
    }
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
    } else if (type == 'CHAT_MESSAGE') {
      final payloadStr = message['payload']?.toString();
      if (payloadStr != null && payloadStr.isNotEmpty) {
        try {
          final payload = jsonDecode(payloadStr) as Map<String, dynamic>;
          final chatMsg = ChatMessageModel.fromJson(payload);
          _addChatMessage(chatMsg);
        } catch (e) {
          debugPrint('Error parseando CHAT_MESSAGE en móvil: $e');
        }
      }
    } else if (type == 'PROPOSAL_RESOLVED') {
      final payloadStr = message['payload']?.toString();
      if (payloadStr != null && payloadStr.isNotEmpty) {
        try {
          final payload = jsonDecode(payloadStr) as Map<String, dynamic>;
          final messageId = payload['messageId']?.toString();
          final status = payload['status']?.toString();
          final resolvedBy = payload['resolvedByUserName']?.toString() ?? 'Colaborador';

          if (messageId != null && status != null) {
            final idx = _chatMessages.indexWhere((m) => m.id == messageId);
            if (idx != -1) {
              _chatMessages[idx] = _chatMessages[idx].copyWith(
                proposalStatus: status,
                resolvedByUserName: resolvedBy,
              );
              _showToast('$resolvedBy ${status == 'ACCEPTED' ? 'aceptó' : 'ignoró'} una propuesta');
              notifyListeners();
            }
          }
        } catch (e) {
          debugPrint('Error parseando PROPOSAL_RESOLVED en móvil: $e');
        }
      }
    }
  }

  void _addChatMessage(ChatMessageModel message) {
    final exists = _chatMessages.any((m) => m.id == message.id && m.id.isNotEmpty);
    if (!exists) {
      _chatMessages.add(message);
      if (!_isCopilotDrawerOpen) {
        _unreadCount++;
      }
      notifyListeners();
    }
  }

  // --- Enviar Mensaje a Copilot (Modo Chat o Modo Editor) ---
  Future<void> sendCopilotMessage(String text, String mode) async {
    final diagramId = _currentDiagramId;
    if (diagramId == null || text.trim().isEmpty) return;

    _isCopilotLoading = true;
    notifyListeners();

    final userMsgMap = {
      'diagramId': diagramId,
      'senderType': 'USER',
      'userName': 'Usuario Móvil',
      'userId': 999,
      'mode': mode,
      'messageType': 'CHAT_MESSAGE',
      'content': text.trim(),
      'isError': false,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
    };

    try {
      // 1. Guardar mensaje de usuario en DynamoDB (con timeout rápido de 5s para que no bloquee)
      try {
        final savedUserMsg = await _apiService
            .saveChatMessage(_currentHostUrl, diagramId, userMsgMap)
            .timeout(const Duration(seconds: 5));
        _addChatMessage(savedUserMsg);

        _stompService.sendMessage(diagramId, {
          'type': 'CHAT_MESSAGE',
          'diagramId': diagramId,
          'userId': 999,
          'userName': 'Usuario Móvil',
          'userRole': 'COLABORADOR',
          'payload': jsonEncode(savedUserMsg.toJson()),
        }, isChat: true);
      } catch (saveErr) {
        debugPrint('Aviso: guardando mensaje localmente mientras se persiste en segundo plano: $saveErr');
        // Si la red o DynamoDB demora, mostrar el mensaje de usuario de inmediato en la UI
        final localUserMsg = ChatMessageModel.fromJson(userMsgMap);
        _addChatMessage(localUserMsg);
      }

      // 2. Invocar Copilot AI con Gemini
      final aiResponse = await _copilotAiService.chatWithGemini(
        userText: text.trim(),
        mode: mode,
        currentNodes: _diagramData?.nodes ?? [],
        currentEdges: _diagramData?.edges ?? [],
        diagramName: _diagramData?.diagramName ?? 'Diagrama',
        chatHistory: _chatMessages,
      );

      final replyText = aiResponse['replyText']?.toString() ?? 'He procesado tu solicitud.';
      final proposal = aiResponse['proposal'] as Map<String, dynamic>?;

      // 3. Crear mensaje de respuesta del Copilot
      final copilotMsgMap = {
        'id': 'copilot-${DateTime.now().millisecondsSinceEpoch}',
        'diagramId': diagramId,
        'senderType': 'COPILOT',
        'userName': 'Copilot IA',
        'mode': mode,
        'messageType': proposal != null ? 'EDITOR_PROPOSAL' : 'CHAT_MESSAGE',
        'content': replyText,
        'proposalJson': proposal != null ? jsonEncode(proposal) : null,
        'proposalStatus': proposal != null ? 'PENDING' : null,
        'isError': false,
        'createdAt': DateTime.now().toUtc().toIso8601String(),
      };

      try {
        final savedCopilotMsg = await _apiService
            .saveChatMessage(_currentHostUrl, diagramId, copilotMsgMap)
            .timeout(const Duration(seconds: 5));
        _addChatMessage(savedCopilotMsg);

        _stompService.sendMessage(diagramId, {
          'type': 'CHAT_MESSAGE',
          'diagramId': diagramId,
          'userId': 0,
          'userName': 'Copilot IA',
          'userRole': 'SISTEMA',
          'payload': jsonEncode(savedCopilotMsg.toJson()),
        }, isChat: true);
      } catch (saveCopilotErr) {
        debugPrint('Aviso persistiendo Copilot en backend: $saveCopilotErr');
        final localCopilotMsg = ChatMessageModel.fromJson(copilotMsgMap);
        _addChatMessage(localCopilotMsg);
      }

    } catch (e) {
      _showToast('Error al consultar Copilot: $e');
    } finally {
      _isCopilotLoading = false;
      notifyListeners();
    }
  }

  // --- Aceptar Propuesta de Edición y Mutar el Lienzo en Vivo ---
  Future<void> acceptProposal(ChatMessageModel message) async {
    final diagramId = _currentDiagramId;
    final proposal = message.parsedProposal;
    if (diagramId == null || proposal == null) return;

    _applyingProposalId = message.id;
    notifyListeners();

    try {
      // 1. Extraer nodos y aristas de la propuesta generada
      final List<dynamic> nextNodesRaw = proposal['nodesDelta'] as List<dynamic>? ?? [];
      final List<dynamic> nextEdgesRaw = proposal['edgesDelta'] as List<dynamic>? ?? [];

      if (nextNodesRaw.isNotEmpty) {
        final newCanvasData = DiagramCanvasData.fromJson({
          'nodes': nextNodesRaw,
          'edges': nextEdgesRaw,
        }, _diagramData?.diagramName ?? 'Diagrama');

        _diagramData = newCanvasData;

        final lienzoPayload = jsonEncode({
          'nodes': nextNodesRaw,
          'edges': nextEdgesRaw,
        });

        // 2. Persistir lienzo en PostgreSQL vía API REST
        await _apiService.updateDiagramLienzo(
          baseUrl: _currentHostUrl,
          diagramId: diagramId,
          lienzoJson: lienzoPayload,
          userId: 999,
        );

        // 3. Difundir nuevo lienzo a todos los clientes web vía STOMP (SYNC_CANVAS)
        _stompService.sendMessage(diagramId, {
          'type': 'SYNC_CANVAS',
          'diagramId': diagramId,
          'userId': 999,
          'userName': 'Usuario Móvil (Copilot)',
          'userRole': 'COLABORADOR',
          'payload': lienzoPayload,
        });

        // Guardar en caché local móvil
        await _storageService.saveDiagramJson(diagramId, newCanvasData.diagramName, lienzoPayload);
      }

      // 4. Resolver propuesta como ACCEPTED en DynamoDB
      await _apiService.resolveProposal(
        baseUrl: _currentHostUrl,
        diagramId: diagramId,
        messageId: message.id,
        status: 'ACCEPTED',
        userId: 999,
        userName: 'Usuario Móvil',
      );

      // Actualizar estado en lista local
      final idx = _chatMessages.indexWhere((m) => m.id == message.id);
      if (idx != -1) {
        _chatMessages[idx] = _chatMessages[idx].copyWith(
          proposalStatus: 'ACCEPTED',
          resolvedByUserName: 'Usuario Móvil',
        );
      }

      // 5. Difundir resolución por STOMP
      _stompService.sendMessage(diagramId, {
        'type': 'PROPOSAL_RESOLVED',
        'diagramId': diagramId,
        'userId': 999,
        'userName': 'Usuario Móvil',
        'userRole': 'COLABORADOR',
        'payload': jsonEncode({
          'messageId': message.id,
          'status': 'ACCEPTED',
          'resolvedByUserName': 'Usuario Móvil',
        }),
      }, isChat: true);

      _showToast('Propuesta de Copilot aplicada al lienzo exitosamente.');
    } catch (e) {
      _showToast('Error al aplicar propuesta: $e');
    } finally {
      _applyingProposalId = null;
      notifyListeners();
    }
  }

  // --- Ignorar Propuesta ---
  Future<void> ignoreProposal(ChatMessageModel message) async {
    final diagramId = _currentDiagramId;
    if (diagramId == null) return;

    try {
      await _apiService.resolveProposal(
        baseUrl: _currentHostUrl,
        diagramId: diagramId,
        messageId: message.id,
        status: 'IGNORED',
        userId: 999,
        userName: 'Usuario Móvil',
      );

      final idx = _chatMessages.indexWhere((m) => m.id == message.id);
      if (idx != -1) {
        _chatMessages[idx] = _chatMessages[idx].copyWith(
          proposalStatus: 'IGNORED',
          resolvedByUserName: 'Usuario Móvil',
        );
      }

      _stompService.sendMessage(diagramId, {
        'type': 'PROPOSAL_RESOLVED',
        'diagramId': diagramId,
        'userId': 999,
        'userName': 'Usuario Móvil',
        'userRole': 'COLABORADOR',
        'payload': jsonEncode({
          'messageId': message.id,
          'status': 'IGNORED',
          'resolvedByUserName': 'Usuario Móvil',
        }),
      }, isChat: true);

      notifyListeners();
    } catch (e) {
      _showToast('Error al descartar propuesta: $e');
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
    _chatMessages.clear();
    _isCopilotDrawerOpen = false;
    _unreadCount = 0;

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
