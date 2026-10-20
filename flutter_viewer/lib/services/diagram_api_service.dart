import 'dart:convert';
import 'package:http/http.dart' as http;

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
}
