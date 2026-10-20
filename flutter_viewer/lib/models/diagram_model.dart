class UmlClassNode {
  final String id;
  final String name;
  final String stereotype;
  final List<String> attributes;
  final List<String> methods;
  final double x;
  final double y;

  UmlClassNode({
    required this.id,
    required this.name,
    this.stereotype = '',
    required this.attributes,
    required this.methods,
    required this.x,
    required this.y,
  });

  factory UmlClassNode.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? {};
    final pos = json['position'] as Map<String, dynamic>? ?? {'x': 0.0, 'y': 0.0};

    List<String> parsedAttributes = [];
    if (data['attributes'] is List) {
      for (var a in (data['attributes'] as List)) {
        if (a is String) {
          parsedAttributes.add(a);
        } else if (a is Map) {
          final vis = a['visibility'] ?? '+';
          final name = a['name'] ?? '';
          final type = a['type'] ?? '';
          parsedAttributes.add('$vis $name: $type');
        }
      }
    }

    List<String> parsedMethods = [];
    if (data['methods'] is List) {
      for (var m in (data['methods'] as List)) {
        if (m is String) {
          parsedMethods.add(m);
        } else if (m is Map) {
          final vis = m['visibility'] ?? '+';
          final name = m['name'] ?? '';
          final params = m['parameters'] ?? '';
          final ret = m['returnType'] ?? 'void';
          parsedMethods.add('$vis $name($params): $ret');
        }
      }
    }

    return UmlClassNode(
      id: json['id']?.toString() ?? '',
      name: data['name']?.toString() ?? 'Clase',
      stereotype: data['stereotype']?.toString() ?? '',
      attributes: parsedAttributes,
      methods: parsedMethods,
      x: (pos['x'] as num?)?.toDouble() ?? 0.0,
      y: (pos['y'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class UmlEdge {
  final String id;
  final String source;
  final String target;
  final String relationType;
  final String sourceMultiplicity;
  final String targetMultiplicity;

  UmlEdge({
    required this.id,
    required this.source,
    required this.target,
    required this.relationType,
    this.sourceMultiplicity = '',
    this.targetMultiplicity = '',
  });

  factory UmlEdge.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? {};
    return UmlEdge(
      id: json['id']?.toString() ?? '',
      source: json['source']?.toString() ?? '',
      target: json['target']?.toString() ?? '',
      relationType: data['relationType']?.toString() ?? 'ASSOCIATION',
      sourceMultiplicity: data['sourceMultiplicity']?.toString() ?? '',
      targetMultiplicity: data['targetMultiplicity']?.toString() ?? '',
    );
  }
}

class DiagramCanvasData {
  final List<UmlClassNode> nodes;
  final List<UmlEdge> edges;
  final String diagramName;

  DiagramCanvasData({
    required this.nodes,
    required this.edges,
    required this.diagramName,
  });

  factory DiagramCanvasData.fromJson(Map<String, dynamic> json, String name) {
    final nodesList = (json['nodes'] as List<dynamic>? ?? [])
        .where((n) => n is Map<String, dynamic> && (n['type'] == null || n['type'] == 'umlClass' || n['type'] == 'classNode'))
        .map((n) => UmlClassNode.fromJson(n as Map<String, dynamic>))
        .toList();

    final edgesList = (json['edges'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map((e) => UmlEdge.fromJson(e))
        .toList();

    return DiagramCanvasData(
      nodes: nodesList,
      edges: edgesList,
      diagramName: name,
    );
  }
}
