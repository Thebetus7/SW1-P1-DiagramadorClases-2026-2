import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';

typedef OnMessageCallback = void Function(Map<String, dynamic> message);
typedef OnStatusCallback = void Function(bool isConnected);

class StompSocketService {
  StompClient? _client;
  bool _isConnected = false;

  bool get isConnected => _isConnected;

  void connect({
    required String wsUrl,
    required int diagramId,
    required OnMessageCallback onMessage,
    required OnStatusCallback onStatusChange,
  }) {
    disconnect();

    // Convertir http/https a ws/wss o endpoint directo /ws/websocket
    String formattedUrl = wsUrl;
    if (formattedUrl.startsWith('http://')) {
      formattedUrl = formattedUrl.replaceFirst('http://', 'ws://');
    } else if (formattedUrl.startsWith('https://')) {
      formattedUrl = formattedUrl.replaceFirst('https://', 'wss://');
    }

    if (!formattedUrl.endsWith('/ws/websocket') && !formattedUrl.endsWith('/ws')) {
      formattedUrl = '$formattedUrl/ws/websocket';
    } else if (formattedUrl.endsWith('/ws')) {
      formattedUrl = '$formattedUrl/websocket';
    }

    _client = StompClient(
      config: StompConfig(
        url: formattedUrl,
        onConnect: (StompFrame frame) {
          _isConnected = true;
          onStatusChange(true);
          debugPrint('STOMP conectado a $formattedUrl');

          // Suscribirse al tópico del diagrama
          _client?.subscribe(
            destination: '/topic/diagram/$diagramId',
            callback: (StompFrame frame) {
              if (frame.body != null) {
                try {
                  final data = jsonDecode(frame.body!) as Map<String, dynamic>;
                  onMessage(data);
                } catch (e) {
                  debugPrint('Error parseando frame STOMP: $e');
                }
              }
            },
          );
        },
        onWebSocketError: (dynamic error) {
          debugPrint('Error WebSocket STOMP: $error');
          _isConnected = false;
          onStatusChange(false);
        },
        onDisconnect: (StompFrame frame) {
          debugPrint('STOMP desconectado');
          _isConnected = false;
          onStatusChange(false);
        },
        reconnectDelay: const Duration(seconds: 4),
      ),
    );

    _client?.activate();
  }

  void disconnect() {
    _client?.deactivate();
    _client = null;
    _isConnected = false;
  }
}
