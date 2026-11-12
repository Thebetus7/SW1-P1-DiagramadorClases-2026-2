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
      expect(node.isAbstract, isFalse);
      expect(node.x, equals(150.0));
      expect(node.y, equals(280.0));
      expect(node.attributes.length, equals(2));
      expect(node.attributes[0], equals('+ id: Long'));
      expect(node.attributes[1], equals('- email: String'));
      expect(node.methods.length, equals(1));
      expect(node.methods[0], equals('+ autenticar(token: String): Boolean'));
    });

    test('UmlClassNode detecta clase abstracta mediante stereotype o isAbstract flag (Spec 06, UML 2.5)', () {
      final jsonAbstract = {
        'id': 'class-abs-1',
        'type': 'umlClass',
        'position': {'x': 100.0, 'y': 100.0},
        'data': {
          'name': 'Vehiculo',
          'stereotype': '<<abstract>>',
          'attributes': ['+ placa: String'],
          'methods': ['+ acelerar(): void']
        }
      };

      final node = UmlClassNode.fromJson(jsonAbstract);
      expect(node.name, equals('Vehiculo'));
      expect(node.stereotype, equals('abstract'));
      expect(node.isAbstract, isTrue);

      // Verificación de tolerancia a corchete simple < > y guillemets « » (RB-06.4)
      final jsonSimpleBracket = {
        'id': 'class-single-bracket',
        'type': 'umlClass',
        'position': {'x': 100.0, 'y': 100.0},
        'data': {
          'name': 'Repositorio',
          'stereotype': '<interface>',
          'attributes': [],
          'methods': []
        }
      };
      final nodeSimple = UmlClassNode.fromJson(jsonSimpleBracket);
      expect(nodeSimple.stereotype, equals('interface'));

      final jsonGuillemets = {
        'id': 'class-guill',
        'type': 'umlClass',
        'position': {'x': 100.0, 'y': 100.0},
        'data': {
          'name': 'EntidadBase',
          'stereotype': '«entity»',
          'attributes': [],
          'methods': []
        }
      };
      final nodeGuill = UmlClassNode.fromJson(jsonGuillemets);
      expect(nodeGuill.stereotype, equals('entity'));

      final jsonAbstractFlag = {
        'id': 'class-abs-2',
        'type': 'umlClass',
        'position': {'x': 100.0, 'y': 100.0},
        'data': {
          'name': 'FiguraGeometrica',
          'isAbstract': true,
          'attributes': [],
          'methods': ['+ calcularArea(): Double']
        }
      };

      final node2 = UmlClassNode.fromJson(jsonAbstractFlag);
      expect(node2.name, equals('FiguraGeometrica'));
      expect(node2.isAbstract, isTrue);
    });

    test('UmlNoteNode deserializa correctamente notas explicativas (Spec 06, RF-06.5.1)', () {
      final jsonNote = {
        'id': 'note-1',
        'type': 'umlNote',
        'position': {'x': 320.0, 'y': 140.0},
        'data': {
          'content': 'Regla de negocio: la factura debe incluir IVA.'
        }
      };

      final note = UmlNoteNode.fromJson(jsonNote);
      expect(note.id, equals('note-1'));
      expect(note.type, equals('umlNote'));
      expect(note.x, equals(320.0));
      expect(note.y, equals(140.0));
      expect(note.content, equals('Regla de negocio: la factura debe incluir IVA.'));
    });

    test('UmlEdge deserializa aristas, relaciones y clase-asociacion UML correctamente', () {
      final jsonEdge = {
        'id': 'edge-1-2',
        'source': 'class-1',
        'target': 'class-2',
        'data': {
          'relationType': 'INHERITANCE',
          'sourceMultiplicity': '1',
          'targetMultiplicity': '0..*',
          'isAssociationClass': true,
        }
      };

      final edge = UmlEdge.fromJson(jsonEdge);

      expect(edge.id, equals('edge-1-2'));
      expect(edge.source, equals('class-1'));
      expect(edge.target, equals('class-2'));
      expect(edge.relationType, equals('INHERITANCE'));
      expect(edge.sourceMultiplicity, equals('1'));
      expect(edge.targetMultiplicity, equals('0..*'));
      expect(edge.isAssociationClass, isTrue);
    });

    test('DiagramCanvasData segrega polimorficamente clases y notas (Spec 06, RB-06.7)', () {
      final canvasJson = {
        'nodes': [
          {
            'id': 'class-order',
            'type': 'umlClass',
            'position': {'x': 50.0, 'y': 80.0},
            'data': {'name': 'Order', 'attributes': ['+ total: Double'], 'methods': []}
          },
          {
            'id': 'note-tax',
            'type': 'umlNote',
            'position': {'x': 300.0, 'y': 80.0},
            'data': {'content': 'Tarifa impositiva 2026'}
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
      expect(diagram.notes.length, equals(1));
      expect(diagram.notes.first.content, equals('Tarifa impositiva 2026'));
      expect(diagram.allNodes.length, equals(2));
      expect(diagram.edges.length, equals(1));
      expect(diagram.edges.first.relationType, equals('ASSOCIATION'));

      // Comprobar mapa de nombres legibles para inspección táctil (ClassDetailBottomSheet)
      expect(diagram.nodeNames['class-order'], equals('Order'));
      expect(diagram.nodeNames['note-tax'], contains('Nota: Tarifa impositiva'));
    });

    test('DiagramCanvasData soporta mapas dinámicos Map<dynamic, dynamic> sin descartar nodos', () {
      final dynamicJson = <dynamic, dynamic>{
        'nodes': <dynamic>[
          <dynamic, dynamic>{
            'id': 'c1',
            'type': 'umlClass',
            'position': <dynamic, dynamic>{'x': 10, 'y': 20},
            'data': <dynamic, dynamic>{'name': 'Dinamico', 'attributes': <dynamic>[], 'methods': <dynamic>[]}
          }
        ],
        'edges': <dynamic>[
          <dynamic, dynamic>{
            'id': 'e1',
            'source': 'c1',
            'target': 'c2',
            'data': <dynamic, dynamic>{'relationType': 'ASSOCIATION'}
          }
        ]
      };

      final parsed = DiagramCanvasData.fromJson(Map<String, dynamic>.from(dynamicJson), 'Test Dinamico');
      expect(parsed.nodes.length, equals(1));
      expect(parsed.nodes.first.name, equals('Dinamico'));
      expect(parsed.edges.length, equals(1));
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
