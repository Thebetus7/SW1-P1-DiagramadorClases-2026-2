import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_viewer/services/local_storage_service.dart';

void main() {
  group('LocalStorageService Offline Cache Unit Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('saveDiagramJson y getCachedDiagramJson persisten y recuperan el JSON del lienzo', () async {
      final storage = LocalStorageService();
      const diagramId = 42;
      const sampleLienzo = '{"nodes":[{"id":"1","data":{"name":"Cliente"}}],"edges":[]}';

      await storage.saveDiagramJson(diagramId, 'Diagrama Clientes', sampleLienzo);

      final cached = await storage.getCachedDiagramJson(diagramId);
      expect(cached, isNotNull);
      expect(cached, equals(sampleLienzo));
    });

    test('saveLastSession y getLastSession guardan y devuelven la sesión activa', () async {
      final storage = LocalStorageService();
      const diagramId = 101;
      const hostUrl = 'http://192.168.1.50:8080';
      const name = 'Arquitectura Clean';

      await storage.saveLastSession(diagramId, hostUrl, name);

      final session = await storage.getLastSession();
      expect(session, isNotNull);
      expect(session!['diagramId'], equals(diagramId));
      expect(session['hostUrl'], equals(hostUrl));
      expect(session['name'], equals(name));
    });

    test('clearSession elimina las preferencias de la sesión anterior (RN-02.06)', () async {
      final storage = LocalStorageService();
      await storage.saveLastSession(77, 'http://localhost:8080', 'Sesión Temporal');

      final sessionBefore = await storage.getLastSession();
      expect(sessionBefore, isNotNull);

      await storage.clearSession();

      final sessionAfter = await storage.getLastSession();
      expect(sessionAfter, isNull);
    });
  });
}
