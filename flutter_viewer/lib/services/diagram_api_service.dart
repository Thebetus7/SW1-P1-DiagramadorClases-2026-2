import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/chat_message_model.dart';

class DiagramApiService {
  Future<Map<String, dynamic>> fetchDiagram(String baseUrl, int diagramId) async {
    final cleanBase = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    final uri = Uri.parse('$cleanBase/api/diagrams/$diagramId');

    final response = await http.get(uri).timeout(
      const Duration(seconds: 7),
      onTimeout: () => throw Exception('Tiempo de espera agotado al conectar con el servidor.'),
    );

    if (response.statusCode == 200) {
      return jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    } else {
      throw Exception('Error del servidor: ${response.statusCode} - ${response.reasonPhrase}');
    }
  }

  /// Actualiza el JSON del lienzo en PostgreSQL
  Future<void> updateDiagramLienzo({
    required String baseUrl,
    required int diagramId,
    required String lienzoJson,
    int? userId,
  }) async {
    final cleanBase = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    final uri = Uri.parse('$cleanBase/api/diagrams/$diagramId');

    final response = await http.put(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'lienzo': lienzoJson,
        'usuarioId': userId ?? 1,
      }),
    ).timeout(const Duration(seconds: 8));

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Error al actualizar lienzo: ${response.statusCode}');
    }
  }

  /// Obtiene el historial de mensajes de DynamoDB para el diagrama
  Future<List<ChatMessageModel>> fetchChatHistory(String baseUrl, int diagramId) async {
    final cleanBase = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    final uri = Uri.parse('$cleanBase/api/diagrams/$diagramId/chat/messages');

    try {
      final response = await http.get(uri).timeout(const Duration(seconds: 7));
      if (response.statusCode == 200) {
        final List<dynamic> list = jsonDecode(utf8.decode(response.bodyBytes)) as List<dynamic>;
        return list.map((item) => ChatMessageModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Guarda un mensaje en DynamoDB
  Future<ChatMessageModel> saveChatMessage(String baseUrl, int diagramId, Map<String, dynamic> msgJson) async {
    final cleanBase = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    final uri = Uri.parse('$cleanBase/api/diagrams/$diagramId/chat/messages');

    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(msgJson),
    ).timeout(const Duration(seconds: 10));

    if (response.statusCode == 200 || response.statusCode == 201) {
      return ChatMessageModel.fromJson(jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>);
    } else {
      throw Exception('Error al persistir mensaje: ${response.statusCode}');
    }
  }

  /// Resuelve una propuesta (ACCEPTED o IGNORED) en DynamoDB
  Future<ChatMessageModel> resolveProposal({
    required String baseUrl,
    required int diagramId,
    required String messageId,
    required String status,
    int? userId,
    String? userName,
  }) async {
    final cleanBase = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    final uri = Uri.parse('$cleanBase/api/diagrams/$diagramId/chat/proposals/$messageId/resolve');

    final response = await http.put(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'status': status,
        'resolvedByUserId': userId,
        'resolvedByUserName': userName ?? 'Usuario Móvil',
      }),
    ).timeout(const Duration(seconds: 8));

    if (response.statusCode == 200) {
      return ChatMessageModel.fromJson(jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>);
    } else {
      throw Exception('Error al resolver propuesta: ${response.statusCode}');
    }
  }
}
