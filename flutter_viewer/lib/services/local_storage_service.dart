import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/linked_diagram.dart';

class LocalStorageService {
  static const String _keyPrefix = 'cached_diagram_';
  static const String _keyLinkedDiagramsList = 'linked_diagrams_list_v2';
  static const String _keyLastDiagramId = 'last_diagram_id';
  static const String _keyLastHostUrl = 'last_host_url';
  static const String _keyLastName = 'last_diagram_name';

  /// Guarda el JSON del diagrama en caché local offline
  Future<void> saveDiagramJson(int diagramId, String name, String jsonStr) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_keyPrefix$diagramId', jsonStr);
    await updateDiagramName(diagramId, name);
  }

  /// Recupera el JSON cacheado del diagrama
  Future<String?> getCachedDiagramJson(int diagramId) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('$_keyPrefix$diagramId');
  }

  /// Recupera todos los diagramas vinculados ordenados por última fecha de acceso descendente
  Future<List<LinkedDiagram>> getLinkedDiagrams() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(_keyLinkedDiagramsList);
    if (jsonString == null || jsonString.isEmpty) {
      // Migración transparente si existía una sesión previa individual
      final legacy = await getLastSession();
      if (legacy != null) {
        final migrated = LinkedDiagram(
          diagramId: legacy['diagramId'],
          name: legacy['name'],
          hostUrl: legacy['hostUrl'],
          wsEndpoint: '/ws',
          linkedAt: DateTime.now(),
          lastAccessedAt: DateTime.now(),
        );
        await prefs.setString(_keyLinkedDiagramsList, jsonEncode([migrated.toJson()]));
        return [migrated];
      }
      return [];
    }

    try {
      final List<dynamic> decoded = jsonDecode(jsonString);
      final list = decoded.map((item) => LinkedDiagram.fromJson(item as Map<String, dynamic>)).toList();
      list.sort((a, b) => b.lastAccessedAt.compareTo(a.lastAccessedAt));
      return list;
    } catch (e) {
      return [];
    }
  }

  /// Agrega o actualiza un diagrama en la lista de lienzos vinculados
  Future<void> saveLinkedDiagram(LinkedDiagram diagram) async {
    final prefs = await SharedPreferences.getInstance();
    final currentList = await getLinkedDiagrams();

    final existingIndex = currentList.indexWhere((d) => d.diagramId == diagram.diagramId);
    if (existingIndex >= 0) {
      currentList[existingIndex] = diagram.copyWith(
        name: diagram.name.isNotEmpty ? diagram.name : currentList[existingIndex].name,
        hostUrl: diagram.hostUrl.isNotEmpty ? diagram.hostUrl : currentList[existingIndex].hostUrl,
        lastAccessedAt: DateTime.now(),
      );
    } else {
      currentList.insert(0, diagram);
    }

    final encoded = jsonEncode(currentList.map((d) => d.toJson()).toList());
    await prefs.setString(_keyLinkedDiagramsList, encoded);

    // Compatibilidad legado
    await prefs.setInt(_keyLastDiagramId, diagram.diagramId);
    await prefs.setString(_keyLastHostUrl, diagram.hostUrl);
    await prefs.setString(_keyLastName, diagram.name);
  }

  /// Actualiza únicamente el nombre de un diagrama
  Future<void> updateDiagramName(int diagramId, String name) async {
    final currentList = await getLinkedDiagrams();
    final idx = currentList.indexWhere((d) => d.diagramId == diagramId);
    if (idx >= 0) {
      currentList[idx] = currentList[idx].copyWith(name: name, lastAccessedAt: DateTime.now());
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyLinkedDiagramsList, jsonEncode(currentList.map((d) => d.toJson()).toList()));
    }
  }

  /// Actualiza la última fecha de apertura del lienzo
  Future<void> updateLastAccess(int diagramId) async {
    final currentList = await getLinkedDiagrams();
    final idx = currentList.indexWhere((d) => d.diagramId == diagramId);
    if (idx >= 0) {
      currentList[idx] = currentList[idx].copyWith(lastAccessedAt: DateTime.now());
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyLinkedDiagramsList, jsonEncode(currentList.map((d) => d.toJson()).toList()));
    }
  }

  /// Desvincula manualmente un diagrama removiéndolo de la lista persistente
  Future<void> removeLinkedDiagram(int diagramId) async {
    final prefs = await SharedPreferences.getInstance();
    final currentList = await getLinkedDiagrams();
    currentList.removeWhere((d) => d.diagramId == diagramId);

    final encoded = jsonEncode(currentList.map((d) => d.toJson()).toList());
    await prefs.setString(_keyLinkedDiagramsList, encoded);

    // Remover también el caché del contenido
    await prefs.remove('$_keyPrefix$diagramId');

    // Si era el último activo, limpiar sesión activa
    final lastId = prefs.getInt(_keyLastDiagramId);
    if (lastId == diagramId) {
      await clearSession();
    }
  }

  /// Guarda la última sesión para compatibilidad retroactiva
  Future<void> saveLastSession(int diagramId, String hostUrl, String name) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyLastDiagramId, diagramId);
    await prefs.setString(_keyLastHostUrl, hostUrl);
    await prefs.setString(_keyLastName, name);
    await saveLinkedDiagram(LinkedDiagram(
      diagramId: diagramId,
      name: name,
      hostUrl: hostUrl,
      wsEndpoint: '/ws',
      linkedAt: DateTime.now(),
      lastAccessedAt: DateTime.now(),
    ));
  }

  /// Sesión previa individual (compatibilidad)
  Future<Map<String, dynamic>?> getLastSession() async {
    final prefs = await SharedPreferences.getInstance();
    final diagramId = prefs.getInt(_keyLastDiagramId);
    if (diagramId == null) return null;

    final hostUrl = prefs.getString(_keyLastHostUrl) ?? 'http://10.0.2.2:8080';
    final name = prefs.getString(_keyLastName) ?? 'Diagrama';
    final cachedJson = prefs.getString('$_keyPrefix$diagramId');

    return {
      'diagramId': diagramId,
      'hostUrl': hostUrl,
      'name': name,
      'cachedJson': cachedJson,
    };
  }

  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyLastDiagramId);
    await prefs.remove(_keyLastHostUrl);
    await prefs.remove(_keyLastName);
  }
}
