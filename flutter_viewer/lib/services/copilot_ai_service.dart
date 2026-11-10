import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/chat_message_model.dart';
import '../models/diagram_model.dart';

class CopilotAiService {
  static const String defaultGeminiApiKey = 'AQ.Ab8RN6I34Oy5bagEnGjof29PIZ-z-DfEAFuB3DXHkfc8qTjX0A';

  static const List<String> geminiModels = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
  ];

  /// Envía la instrucción o consulta a Gemini para generar respuesta o mutación del diagrama
  Future<Map<String, dynamic>> chatWithGemini({
    required String userText,
    required String mode, // "CHAT" | "EDITOR"
    required List<UmlClassNode> currentNodes,
    required List<UmlEdge> currentEdges,
    required String diagramName,
    String? apiKey,
    List<ChatMessageModel>? chatHistory,
  }) async {
    final key = (apiKey != null && apiKey.isNotEmpty) ? apiKey : defaultGeminiApiKey;

    if (mode == 'EDITOR') {
      return await _processDiagramMutation(
        prompt: userText,
        currentNodes: currentNodes,
        currentEdges: currentEdges,
        diagramName: diagramName,
        apiKey: key,
        chatHistory: chatHistory,
      );
    } else {
      return await _processConversationalChat(
        userText: userText,
        currentNodes: currentNodes,
        currentEdges: currentEdges,
        diagramName: diagramName,
        apiKey: key,
        chatHistory: chatHistory,
      );
    }
  }

  Future<Map<String, dynamic>> _processConversationalChat({
    required String userText,
    required List<UmlClassNode> currentNodes,
    required List<UmlEdge> currentEdges,
    required String diagramName,
    required String apiKey,
    List<ChatMessageModel>? chatHistory,
  }) async {
    const systemPrompt = '''
Eres Copilot UML, un asistente experto en ingeniería de software, arquitectura orientada a objetos, normalización y patrones de diseño UML 2.5.
DIRECTIVA ESTRICTA DE COMUNICACIÓN:
- Sé DIRECTO, conciso y técnico.
- Cero fórmulas de cortesía, presentaciones vacías o saludos ('¡Hola!', 'Soy tu asistente', 'Como IA', 'Espero te sirva').
- Inicia de inmediato con la explicación técnica, sugerencia arquitectónica o resumen de impacto.
- Responde de forma clara, profesional y formateada en texto legible.
- NO devuelvas JSON de nodos a menos que te lo pidan explícitamente.
''';

    final historyContext = (chatHistory != null && chatHistory.isNotEmpty)
        ? '\nMemoria de mensajes previos:\n${chatHistory.reversed.take(6).map((m) => '${m.isUser ? "@${m.userName}" : "Copilot IA"}: ${m.content}').join("\n")}\n'
        : '';

    final diagramContext = jsonEncode({
      'diagramName': diagramName,
      'nodes': currentNodes.map((n) => {'id': n.id, 'name': n.name, 'attributes': n.attributes, 'methods': n.methods}).toList(),
      'edges': currentEdges.map((e) => {'id': e.id, 'source': e.source, 'target': e.target, 'relationType': e.relationType}).toList(),
    });

    final prompt = '$systemPrompt\n\nContexto del diagrama:\n$diagramContext\n$historyContext\nConsulta del usuario móvil:\n"$userText"';

    for (final model in geminiModels) {
      try {
        final uri = Uri.parse('https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey');
        final res = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'contents': [
              {
                'role': 'user',
                'parts': [
                  {'text': prompt}
                ]
              }
            ],
            'generationConfig': {'temperature': 0.4},
          }),
        ).timeout(const Duration(seconds: 15));

        if (res.statusCode == 200) {
          final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
          final candidates = data['candidates'] as List?;
          if (candidates != null && candidates.isNotEmpty) {
            final parts = candidates[0]['content']['parts'] as List?;
            final text = parts?[0]['text']?.toString() ?? 'Respuesta generada.';
            return {'replyText': text};
          }
        }
      } catch (_) {}
    }

    return {'replyText': 'No se pudo obtener respuesta del modelo en este momento. Inténtalo nuevamente.'};
  }

  Future<Map<String, dynamic>> _processDiagramMutation({
    required String prompt,
    required List<UmlClassNode> currentNodes,
    required List<UmlEdge> currentEdges,
    required String diagramName,
    required String apiKey,
    List<ChatMessageModel>? chatHistory,
  }) async {
    final currentDiagramState = jsonEncode({
      'diagramName': diagramName,
      'nodes': currentNodes.map((n) => {
        'id': n.id,
        'type': 'umlClass',
        'position': {'x': n.x, 'y': n.y},
        'data': {
          'name': n.name,
          'stereotype': n.stereotype,
          'attributes': n.attributes.map((a) {
            final match = RegExp(r'^([+\-#~])?\s*([a-zA-Z0-9_$]+)\s*(?::\s*(.+))?$').firstMatch(a.trim());
            return {
              'id': 'attr-${n.id}-${a.hashCode}',
              'visibility': match?.group(1) ?? '-',
              'name': match?.group(2) ?? a,
              'type': match?.group(3) ?? 'string',
            };
          }).toList(),
          'methods': n.methods.map((m) {
            return {
              'id': 'meth-${n.id}-${m.hashCode}',
              'visibility': '+',
              'name': m,
              'parameters': '',
              'returnType': 'void',
            };
          }).toList(),
        }
      }).toList(),
      'edges': currentEdges.map((e) => {
        'id': e.id,
        'source': e.source,
        'target': e.target,
        'type': 'umlEdge',
        'data': {
          'relationType': e.relationType,
          'sourceMultiplicity': e.sourceMultiplicity,
          'targetMultiplicity': e.targetMultiplicity,
        }
      }).toList(),
    });

    const instruction = '''
Eres un Arquitecto de Software y Especialista en Modelado UML 2.5 para un Diagramador de Clases interactivo.
Tu tarea es analizar el estado actual del diagrama UML en formato JSON y modificarlo o expandirlo según la instrucción del usuario en lenguaje natural.

DEBES RESPONDER EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA:
{
  "explanation": "Explicación concisa y técnica de los cambios realizados en el diagrama",
  "nodes": [
    {
      "id": "class-timestamp-index",
      "type": "umlClass",
      "position": { "x": 100, "y": 100 },
      "data": {
        "name": "NombreClase",
        "stereotype": "",
        "attributes": [
          { "id": "attr-1", "visibility": "+", "name": "campo", "type": "string" }
        ],
        "methods": [
          { "id": "meth-1", "visibility": "+", "name": "operacion", "parameters": "", "returnType": "void" }
        ]
      }
    }
  ],
  "edges": [
    {
      "id": "edge-timestamp-index",
      "source": "idClaseOrigen",
      "target": "idClaseDestino",
      "type": "umlEdge",
      "data": {
        "relationType": "ASSOCIATION",
        "sourceMultiplicity": "1",
        "targetMultiplicity": "1..*"
      }
    }
  ]
}
NO agregues bloques de markdown ```json ni texto adicional fuera del JSON.
''';

    final fullPrompt = '$instruction\n\nEstado actual del diagrama:\n$currentDiagramState\n\nInstrucción de edición:\n"$prompt"';

    for (final model in geminiModels) {
      try {
        final uri = Uri.parse('https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey');
        final res = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'contents': [
              {
                'role': 'user',
                'parts': [
                  {'text': fullPrompt}
                ]
              }
            ],
            'generationConfig': {
              'temperature': 0.2,
              'responseMimeType': 'application/json',
            },
          }),
        ).timeout(const Duration(seconds: 25));

        if (res.statusCode == 200) {
          final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
          final candidates = data['candidates'] as List?;
          if (candidates != null && candidates.isNotEmpty) {
            String text = candidates[0]['content']['parts'][0]['text']?.toString() ?? '{}';
            text = text.replaceAll(RegExp(r'^```json\s*|```\s*$', multiLine: true), '').trim();
            final parsedJson = jsonDecode(text) as Map<String, dynamic>;

            final explanation = parsedJson['explanation']?.toString() ?? 'Propuesta de modificación generada.';
            final nodesRaw = parsedJson['nodes'] as List<dynamic>? ?? [];
            final edgesRaw = parsedJson['edges'] as List<dynamic>? ?? [];

            final proposal = {
              'summary': explanation,
              'nodesDelta': nodesRaw,
              'edgesDelta': edgesRaw,
              'status': 'PENDING',
            };

            return {
              'replyText': explanation,
              'proposal': proposal,
            };
          }
        }
      } catch (e) {
        // Fallback al siguiente modelo
      }
    }

    throw Exception('La IA no pudo generar una propuesta de edición en este momento.');
  }
}

