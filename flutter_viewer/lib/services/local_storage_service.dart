import 'package:shared_preferences/shared_preferences.dart';

class LocalStorageService {
  static const String _keyPrefix = 'cached_diagram_';
  static const String _keyLastDiagramId = 'last_diagram_id';
  static const String _keyLastHostUrl = 'last_host_url';
  static const String _keyLastName = 'last_diagram_name';

  Future<void> saveDiagramJson(int diagramId, String name, String jsonStr) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_keyPrefix$diagramId', jsonStr);
    await prefs.setInt(_keyLastDiagramId, diagramId);
    await prefs.setString(_keyLastName, name);
  }

  Future<String?> getCachedDiagramJson(int diagramId) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('$_keyPrefix$diagramId');
  }

  Future<void> saveLastSession(int diagramId, String hostUrl, String name) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyLastDiagramId, diagramId);
    await prefs.setString(_keyLastHostUrl, hostUrl);
    await prefs.setString(_keyLastName, name);
  }

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
