import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_viewer/models/linked_diagram.dart';
import 'package:flutter_viewer/services/local_storage_service.dart';

void main() {
  group('Multi-Canvas Persistent Storage Tests (T5.6)', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('Guardar múltiples lienzos, listar y desvincular selectivamente', () async {
      final storage = LocalStorageService();

      // 1. Verificar lista vacía al inicio
      final initial = await storage.getLinkedDiagrams();
      expect(initial, isEmpty);

      // 2. Agregar 3 diagramas distintos
      final now = DateTime.now();
      final d1 = LinkedDiagram(
        diagramId: 101,
        name: 'Sistema Contable',
        hostUrl: 'http://10.0.2.2:8080',
        wsEndpoint: '/ws',
        linkedAt: now.subtract(const Duration(minutes: 30)),
        lastAccessedAt: now.subtract(const Duration(minutes: 30)),
      );

      final d2 = LinkedDiagram(
        diagramId: 202,
        name: 'Plataforma E-Commerce',
        hostUrl: 'http://10.0.2.2:8080',
        wsEndpoint: '/ws',
        linkedAt: now.subtract(const Duration(minutes: 10)),
        lastAccessedAt: now.subtract(const Duration(minutes: 10)),
      );

      final d3 = LinkedDiagram(
        diagramId: 303,
        name: 'Gestor Hospitalario',
        hostUrl: 'http://192.168.1.50:8080',
        wsEndpoint: '/ws',
        linkedAt: now,
        lastAccessedAt: now,
      );

      await storage.saveLinkedDiagram(d1);
      await storage.saveLinkedDiagram(d2);
      await storage.saveLinkedDiagram(d3);

      // 3. Verificar que se recuperan los 3 diagramas
      final listAfterSave = await storage.getLinkedDiagrams();
      expect(listAfterSave.length, equals(3));
      expect(listAfterSave.any((d) => d.diagramId == 101), isTrue);
      expect(listAfterSave.any((d) => d.diagramId == 202), isTrue);
      expect(listAfterSave.any((d) => d.diagramId == 303), isTrue);

      // 4. Desvincular manualmente el diagrama #202
      await storage.removeLinkedDiagram(202);

      // 5. Verificar que quedan exactamente 2 diagramas (101 y 303)
      final listAfterRemove = await storage.getLinkedDiagrams();
      expect(listAfterRemove.length, equals(2));
      expect(listAfterRemove.any((d) => d.diagramId == 202), isFalse, reason: 'El diagrama 202 debe haberse eliminado');
      expect(listAfterRemove.any((d) => d.diagramId == 101), isTrue);
      expect(listAfterRemove.any((d) => d.diagramId == 303), isTrue);

      // 6. Actualizar fecha de último acceso del diagrama #101 y comprobar ordenación
      await storage.updateLastAccess(101);
      final updatedList = await storage.getLinkedDiagrams();
      expect(updatedList.first.diagramId, equals(101), reason: 'El más recientemente accedido debe quedar primero');
    });
  });
}
