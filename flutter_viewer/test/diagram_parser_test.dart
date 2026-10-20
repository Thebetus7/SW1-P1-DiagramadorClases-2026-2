import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_viewer/models/diagram_model.dart';

void main() {
  group('Diagram Parser Unit Tests (React Flow -> Dart Models)', () {
    test('UmlClassNode deserializa correctamente un nodo de clase UML con atributos y métodos', () {
      final jsonNode = {
        'id': 'class-1',
        'type': 'umlClass',
        'position': {'x': 150.0, 'y': 280.0},
        'data': {
          'name': 'Usuario',
          'stereotype': 'entity',
          'attributes': [
            {'visibility': '+', 'name': 'id', 'type': 'Long'},
            {'visibility': '-', 'name': 'email', 'type': 'String'}
          ],
          'methods': [
            {'visibility': '+', 'name': 'autenticar', 'parameters': 'token: String', 'returnType': 'Boolean'}
          ]
        }
      };

      final node = UmlClassNode.fromJson(jsonNode);

      expect(node.id, equals('class-1'));
      expect(node.name, equals('Usuario'));
      expect(node.stereotype, equals('entity'));
      expect(node.x, equals(150.0));
      expect(node.y, equals(280.0));
      expect(node.attributes.length, equals(2));
      expect(node.attributes[0], equals('+ id: Long'));
      expect(node.attributes[1], equals('- email: String'));
      expect(node.methods.length, equals(1));
      expect(node.methods[0], equals('+ autenticar(token: String): Boolean'));
    });

    test('UmlEdge deserializa aristas y relaciones UML correctamente', () {
      final jsonEdge = {
        'id': 'edge-1-2',
        'source': 'class-1',
        'target': 'class-2',
        'data': {
          'relationType': 'INHERITANCE',
          'sourceMultiplicity': '1',
          'targetMultiplicity': '0..*'
        }
      };

      final edge = UmlEdge.fromJson(jsonEdge);

      expect(edge.id, equals('edge-1-2'));
      expect(edge.source, equals('class-1'));
      expect(edge.target, equals('class-2'));
      expect(edge.relationType, equals('INHERITANCE'));
      expect(edge.sourceMultiplicity, equals('1'));
      expect(edge.targetMultiplicity, equals('0..*'));
    });

    test('DiagramCanvasData parsea un lienzo completo con nodos y aristas', () {
      final canvasJson = {
        'nodes': [
          {
            'id': 'class-order',
            'position': {'x': 50.0, 'y': 80.0},
            'data': {'name': 'Order', 'attributes': ['+ total: Double'], 'methods': []}
          }
        ],
        'edges': [
          {
            'id': 'e-order-user',
            'source': 'class-order',
            'target': 'class-user',
            'data': {'relationType': 'ASSOCIATION'}
          }
        ]
      };

      final diagram = DiagramCanvasData.fromJson(canvasJson, 'Sistema de Pedidos');

      expect(diagram.diagramName, equals('Sistema de Pedidos'));
      expect(diagram.nodes.length, equals(1));
      expect(diagram.nodes.first.name, equals('Order'));
      expect(diagram.edges.length, equals(1));
      expect(diagram.edges.first.relationType, equals('ASSOCIATION'));
    });

    test('Extracción robusta de ID de diagrama y resolución de host local (10.0.2.2:8080) vs online', () {
      int? extractId(String input) {
        final cleaned = input.trim().replaceAll(RegExp(r"""^['"/]+|['"/]+$"""), '').trim();
        final match = RegExp(r'/diagrams/(\d+)').firstMatch(cleaned);
        if (match != null) return int.tryParse(match.group(1)!);
        return int.tryParse(cleaned);
      }

      String resolveHost(String input, String fallback) {
        final cleaned = input.trim().replaceAll(RegExp(r"""^['"/]+|['"/]+$"""), '').trim();
        final isPureNumber = RegExp(r'^\d+$').hasMatch(cleaned);
        if (isPureNumber) return fallback;

        String urlToParse = cleaned;
        if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
          urlToParse = 'http://$urlToParse';
        }
        final uri = Uri.tryParse(urlToParse);
        if (uri != null && uri.host.isNotEmpty) {
          final host = uri.host.toLowerCase();
          if (host == 'localhost' || host == '127.0.0.1') {
            return fallback;
          }
          final portPart = uri.hasPort ? ':${uri.port}' : '';
          return '${uri.scheme}://${uri.host}$portPart';
        }
        return fallback;
      }

      // Caso 1: Input con apóstrofe/barra accidental del escáner en local
      expect(extractId("'/localhost:3000/diagrams/20?mode=viewer"), equals(20));
      expect(resolveHost("'/localhost:3000/diagrams/20?mode=viewer", "http://10.0.2.2:8080"), equals("http://10.0.2.2:8080"));

      // Caso 2: URL completa con http en local
      expect(extractId("http://localhost:3000/diagrams/20?mode=viewer"), equals(20));
      expect(resolveHost("http://localhost:3000/diagrams/20?mode=viewer", "http://10.0.2.2:8080"), equals("http://10.0.2.2:8080"));

      // Caso 3: Solo el número de ID
      expect(extractId("20"), equals(20));
      expect(resolveHost("20", "http://10.0.2.2:8080"), equals("http://10.0.2.2:8080"));

      // Caso 4: Servidor online / producción (Nginx proxy)
      expect(extractId("https://mi-dominio.com/diagrams/20?mode=viewer"), equals(20));
      expect(resolveHost("https://mi-dominio.com/diagrams/20?mode=viewer", "http://10.0.2.2:8080"), equals("https://mi-dominio.com"));
    });
  });
}
