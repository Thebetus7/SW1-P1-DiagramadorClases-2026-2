abstract class UmlCanvasNode {
  final String id;
  final double x;
  final double y;
  final String type;

  UmlCanvasNode({
    required this.id,
    required this.x,
    required this.y,
    required this.type,
  });
}

class UmlClassNode extends UmlCanvasNode {
  final String name;
  final String stereotype;
  final bool isAbstract;
  final List<String> attributes;
  final List<String> methods;

  UmlClassNode({
    required super.id,
    required super.x,
    required super.y,
    super.type = 'umlClass',
    required this.name,
    this.stereotype = '',
    this.isAbstract = false,
    required this.attributes,
    required this.methods,
  });

  factory UmlClassNode.fromJson(Map<String, dynamic> json) {
    final dataRaw = json['data'];
    final data = dataRaw is Map ? Map<String, dynamic>.from(dataRaw) : <String, dynamic>{};
    final posRaw = json['position'];
    final pos = posRaw is Map ? Map<String, dynamic>.from(posRaw) : <String, dynamic>{'x': 0.0, 'y': 0.0};

    final stereotypeRaw = data['stereotype']?.toString() ?? '';
    final cleanedStereotype = stereotypeRaw
        .trim()
        .replaceAll(RegExp(r'^[<«]+'), '')
        .replaceAll(RegExp(r'[>»]+$'), '')
        .trim();

    final isAbstract = data['isAbstract'] == true ||
        stereotypeRaw.toLowerCase().contains('abstract');

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
      stereotype: cleanedStereotype,
      isAbstract: isAbstract,
      attributes: parsedAttributes,
      methods: parsedMethods,
      x: (pos['x'] as num?)?.toDouble() ?? 0.0,
      y: (pos['y'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class UmlNoteNode extends UmlCanvasNode {
  final String content;

  UmlNoteNode({
    required super.id,
    required super.x,
    required super.y,
    super.type = 'umlNote',
    required this.content,
  });

  factory UmlNoteNode.fromJson(Map<String, dynamic> json) {
    final dataRaw = json['data'];
    final data = dataRaw is Map ? Map<String, dynamic>.from(dataRaw) : <String, dynamic>{};
    final posRaw = json['position'];
    final pos = posRaw is Map ? Map<String, dynamic>.from(posRaw) : <String, dynamic>{'x': 0.0, 'y': 0.0};

    return UmlNoteNode(
      id: json['id']?.toString() ?? '',
      content: data['content']?.toString() ?? '',
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
  final bool isAssociationClass;

  UmlEdge({
    required this.id,
    required this.source,
    required this.target,
    required this.relationType,
    this.sourceMultiplicity = '',
    this.targetMultiplicity = '',
    this.isAssociationClass = false,
  });

  factory UmlEdge.fromJson(Map<String, dynamic> json) {
    final dataRaw = json['data'];
    final data = dataRaw is Map ? Map<String, dynamic>.from(dataRaw) : <String, dynamic>{};
    return UmlEdge(
      id: json['id']?.toString() ?? '',
      source: json['source']?.toString() ?? '',
      target: json['target']?.toString() ?? '',
      relationType: data['relationType']?.toString() ?? 'ASSOCIATION',
      sourceMultiplicity: data['sourceMultiplicity']?.toString() ?? '',
      targetMultiplicity: data['targetMultiplicity']?.toString() ?? '',
      isAssociationClass: data['isAssociationClass'] == true,
    );
  }
}

class DiagramCanvasData {
  final List<UmlClassNode> nodes;
  final List<UmlNoteNode> notes;
  final List<UmlEdge> edges;
  final String diagramName;

  DiagramCanvasData({
    required this.nodes,
    this.notes = const [],
    required this.edges,
    required this.diagramName,
  });

  List<UmlCanvasNode> get allNodes => [...nodes, ...notes];

  Map<String, String> get nodeNames {
    final map = <String, String>{};
    for (var n in nodes) {
      map[n.id] = n.name;
    }
    for (var n in notes) {
      final snippet = n.content.trim().replaceAll('\n', ' ');
      map[n.id] = snippet.length > 25 ? 'Nota: ${snippet.substring(0, 22)}...' : 'Nota: $snippet';
    }
    return map;
  }

  factory DiagramCanvasData.fromJson(Map<String, dynamic> json, String name) {
    final rawNodesList = json['nodes'] as List<dynamic>? ?? [];
    final List<UmlClassNode> classList = [];
    final List<UmlNoteNode> noteList = [];

    for (var n in rawNodesList) {
      if (n is Map) {
        final nodeMap = Map<String, dynamic>.from(n);
        final type = nodeMap['type']?.toString();
        if (type == 'umlNote') {
          noteList.add(UmlNoteNode.fromJson(nodeMap));
        } else {
          classList.add(UmlClassNode.fromJson(nodeMap));
        }
      }
    }

    final rawEdgesList = json['edges'] as List<dynamic>? ?? [];
    final List<UmlEdge> edgesList = [];
    for (var e in rawEdgesList) {
      if (e is Map) {
        edgesList.add(UmlEdge.fromJson(Map<String, dynamic>.from(e)));
      }
    }

    return DiagramCanvasData(
      nodes: classList,
      notes: noteList,
      edges: edgesList,
      diagramName: name,
    );
  }
}
