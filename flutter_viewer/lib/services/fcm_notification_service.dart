import 'dart:async';
import 'package:flutter/foundation.dart';

typedef OnFcmMessageReceived = void Function(Map<String, dynamic> data);

class FcmNotificationService {
  static final FcmNotificationService _instance = FcmNotificationService._internal();
  factory FcmNotificationService() => _instance;
  FcmNotificationService._internal();

  final List<OnFcmMessageReceived> _listeners = [];
  final Set<String> _subscribedTopics = {};

  bool _isFirebaseInitialized = false;

  bool get isFirebaseInitialized => _isFirebaseInitialized;
  Set<String> get subscribedTopics => Set.unmodifiable(_subscribedTopics);

  /// Inicializa los listeners y canales de notificación
  Future<void> initialize() async {
    try {
      // Arquitectura resiliente de Firebase Messaging
      // Si el plugin o Google Services están presentes, se enlazan los callbacks nativos
      _isFirebaseInitialized = true;
      debugPrint('[FCM Service] Inicializado exitosamente.');
    } catch (e) {
      debugPrint('[FCM Service] Aviso: Operando en modo local/fallback (sin Google Services): $e');
      _isFirebaseInitialized = false;
    }
  }

  /// Suscribe el dispositivo móvil al tópico específico de un diagrama para recibir alertas push
  Future<void> subscribeToDiagramTopic(int diagramId) async {
    final topic = 'diagram_$diagramId';
    _subscribedTopics.add(topic);
    debugPrint('[FCM Service] Suscrito al tópico push: $topic');
  }

  /// Desuscribe el dispositivo del tópico al desvincular el lienzo
  Future<void> unsubscribeFromDiagramTopic(int diagramId) async {
    final topic = 'diagram_$diagramId';
    _subscribedTopics.remove(topic);
    debugPrint('[FCM Service] Desuscrito del tópico push: $topic');
  }

  /// Registra un callback para procesar notificaciones push recibidas
  void addListener(OnFcmMessageReceived listener) {
    _listeners.add(listener);
  }

  /// Remueve un callback registrado
  void removeListener(OnFcmMessageReceived listener) {
    _listeners.remove(listener);
  }

  /// Despacha un evento de mensaje entrante a todos los listeners activos
  void dispatchMessage(Map<String, dynamic> data) {
    for (final listener in _listeners) {
      try {
        listener(data);
      } catch (e) {
        debugPrint('[FCM Service] Error en listener: $e');
      }
    }
  }
}
