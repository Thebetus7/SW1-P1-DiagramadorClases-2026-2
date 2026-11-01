class LinkedDiagram {
  final int diagramId;
  final String name;
  final String hostUrl;
  final String wsEndpoint;
  final DateTime linkedAt;
  final DateTime lastAccessedAt;

  LinkedDiagram({
    required this.diagramId,
    required this.name,
    required this.hostUrl,
    required this.wsEndpoint,
    required this.linkedAt,
    required this.lastAccessedAt,
  });

  LinkedDiagram copyWith({
    int? diagramId,
    String? name,
    String? hostUrl,
    String? wsEndpoint,
    DateTime? linkedAt,
    DateTime? lastAccessedAt,
  }) {
    return LinkedDiagram(
      diagramId: diagramId ?? this.diagramId,
      name: name ?? this.name,
      hostUrl: hostUrl ?? this.hostUrl,
      wsEndpoint: wsEndpoint ?? this.wsEndpoint,
      linkedAt: linkedAt ?? this.linkedAt,
      lastAccessedAt: lastAccessedAt ?? this.lastAccessedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'diagramId': diagramId,
      'name': name,
      'hostUrl': hostUrl,
      'wsEndpoint': wsEndpoint,
      'linkedAt': linkedAt.toIso8601String(),
      'lastAccessedAt': lastAccessedAt.toIso8601String(),
    };
  }

  factory LinkedDiagram.fromJson(Map<String, dynamic> json) {
    return LinkedDiagram(
      diagramId: (json['diagramId'] as num).toInt(),
      name: json['name']?.toString() ?? 'Diagrama UML',
      hostUrl: json['hostUrl']?.toString() ?? 'http://10.0.2.2:8080',
      wsEndpoint: json['wsEndpoint']?.toString() ?? '/ws',
      linkedAt: json['linkedAt'] != null
          ? DateTime.tryParse(json['linkedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      lastAccessedAt: json['lastAccessedAt'] != null
          ? DateTime.tryParse(json['lastAccessedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
