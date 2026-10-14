# Tasks: Clases de Asociación en 'T' e Importación de Imagen en Lienzo Activo

## Task Progress

| Métrica | Cantidad |
|---|---:|
| Total de tareas | 16 |
| Tareas realizadas | 16 |
| Tareas por realizar | 0 |
| Tareas bloqueadas | 0 |
| Tareas en progreso | 0 |
| Progreso | 100.0% |

**Estado:** COMPLETED

---

## Checklist Rápido de Tareas por Vertical Slice

### Slice 1: Tipos, Utilidades y Conector Base de Clase de Asociación
- [x] `T1.1` [SETUP] Extender interfaces en `types/index.ts` y marcadores SVG en `UmlEdgeMarkers.tsx`.
- [x] `T1.2` [IMPL] Implementar el Custom Edge `UmlAssociationClassEdge.tsx` para trazado en 'T'.
- [x] `T1.3` [IMPL] Extender `UmlEdge.tsx` con hitbox magnético expandido de 24px y punto central.
- [x] `T1.4` [TEST] Test unitario de cálculo de punto medio y geometría perpendicular de la 'T'.

### Slice 2: Interacción en el Lienzo, Dinamismo y Restricciones UML
- [x] `T2.1` [IMPL] Conectar gestos de arrastre, detección sobre aristas y registro de la 'T' en `[id]/page.tsx`.
- [x] `T2.2` [IMPL] Implementar la regla de unicidad (máximo 1 clase de asociación por relación) y alertas visuales.
- [x] `T2.3` [IMPL] Implementar la desvinculación limpia (preservación de arista base) y sincronización STOMP.
- [x] `T2.4` [TEST] Test de interacción en canvas para conexión y desvinculación de la 'T'.

### Slice 3: Importación de Imagen en Lienzo Activo (CanvasToolbar)
- [x] `T3.1` [IMPL] Construir componente modal `CanvasImageImportModal.tsx` con modos Reemplazar vs Fusionar.
- [x] `T3.2` [IMPL] Agregar botón "Importar Imagen" en `CanvasToolbar.tsx` y enlazar modal.
- [x] `T3.3` [IMPL] Implementar lógica de fusión espacial (*merge layout*) sin solapamientos en `[id]/page.tsx`.
- [x] `T3.4` [TEST] Test de flujo de importación con selección de modo y persistencia.

### Slice 4: Generadores Multiplataforma (Spring Boot, Flutter, XMI) e IA
- [x] `T4.1` [IMPL] Actualizar `springBootGenerator.ts` para generar entidades con 2x `@ManyToOne`.
- [x] `T4.2` [IMPL] Actualizar `flutterGenerator.ts` para generar modelos Dart referenciados y JSON serializers.
- [x] `T4.3` [IMPL] Actualizar `xmiExporter.ts` con tag `uml:AssociationClass` y calibrar prompts en `geminiDiagramService.ts`.
- [x] `T4.4` [TEST] Tests unitarios de los generadores Spring Boot, Flutter y XMI para clases asociativas.

### Slice 5: Verificación Global y Quality Gate
- [x] `T5.1` [VERIFY] Verificación de tipos TypeScript (`npx tsc --noEmit`), linter (`npm run lint`) y build.

---

## Desglose Detallado de Tareas

### Slice 1: Tipos, Utilidades y Conector Base de Clase de Asociación

#### [x] T1.1 [SETUP] Extender interfaces en `types/index.ts` y marcadores SVG en `UmlEdgeMarkers.tsx`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-01  
- RF: RF-01.1, RF-01.3  
- Plan: Componentes Dominio & Tipos (Sección 4.1)  
**Depends on:** Ninguna  
**Objective:** Definir los contratos TypeScript para aristas asociativas y añadir soporte visual de líneas discontinuas en los marcadores SVG.  
**Work:**  
- Modificar `front_diag_clases/types/index.ts`: añadir `ASSOCIATION_CLASS` en `UmlRelationType`, crear interfaz `UmlAssociationEdgeData` con `targetEdgeId`, `sourceClassId`, `targetClassId`, `intermediateNodeId` y tipar `ImportCanvasMode = "REPLACE" | "MERGE"`.
- Modificar `front_diag_clases/components/canvas/UmlEdgeMarkers.tsx` asegurando que no existan colisiones de ID en defs de SVG.  
**Done when:** Los tipos compilan sin errores (`npx tsc --noEmit`) y exportan las nuevas interfaces requeridas.  
**Evidence:** Ejecución física de `npx tsc --noEmit` completada con exit code 0 sin errores.

---

#### [x] T1.2 [IMPL] Implementar el Custom Edge `UmlAssociationClassEdge.tsx` para trazado en 'T'
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-01  
- RF: RF-01.1, RF-01.2  
- SC: SC-01.1.1  
- Plan: Sección 2 y Sección 4.2  
**Depends on:** T1.1  
**Objective:** Crear el componente de arista personalizado de React Flow que calcula dinámicamente el segmento perpendicular discontinuo que conecta el nodo intermedio al punto medio de la arista base.  
**Work:**  
- Crear `front_diag_clases/components/canvas/UmlAssociationClassEdge.tsx`.
- Usar `BaseEdge` o `<path>` SVG con `strokeDasharray="5,5"` y trazo `#475569`.
- Calcular coordenadas origen desde el puerto de la clase intermedia y destino en el baricentro de la arista base identificada por `targetEdgeId`.  
**Done when:** El componente renderiza la línea discontinua perpendicular entre dos coordenadas dadas y soporta clics para selección/borrado.  
**Evidence:** Archivo `UmlAssociationClassEdge.tsx` creado y validado con tipos de React Flow v12.

---

#### [x] T1.3 [IMPL] Extender `UmlEdge.tsx` con hitbox magnético expandido de 24px y punto central
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-01  
- RF: RF-01.1, RF-01.2  
- Plan: Sección 1 y Sección 5.4  
**Depends on:** T1.1  
**Objective:** Incorporar en las aristas estándar de React Flow un trazo invisible de 24px para captura sensible de eventos del ratón y renderizado del punto de anclaje magnético central.  
**Work:**  
- Modificar `front_diag_clases/components/canvas/UmlEdge.tsx`.
- Agregar un segundo `<path>` transparente con `strokeWidth={24}`, `stroke="transparent"`, `pointerEvents="all"`.
- Implementar estado local/prop `isHovered` para pintar la arista en azul índigo (`#6366f1`) y mostrar un `<circle>` o indicador magnético en el punto medio cuando se sobrevuela.  
**Done when:** Pasar el cursor sobre la arista en el lienzo dispara el resaltado visual y muestra el círculo de anclaje magnético.  
**Evidence:** Hitbox implementado con `pointerEvents="all"` y punto magnético animado en `UmlEdge.tsx`.

---

#### [x] T1.4 [TEST] Test unitario de cálculo de punto medio y geometría perpendicular de la 'T'
**Status:** COMPLETED  
**Traceability:**  
- Plan: Sección 6 (Estrategia de Testing)  
**Depends on:** T1.2  
**Objective:** Garantizar mediante pruebas unitarias que la función matemática de anclaje calcula con precisión las coordenadas para orientaciones horizontales, verticales y diagonales.  
**Work:**  
- Crear `front_diag_clases/tests/unit/associationClassMath.test.ts`.
- Validar cálculo de midpoint `(x1+x2)/2`, `(y1+y2)/2` y vector perpendicular para líneas ortogonales y curvas.  
**Done when:** La suite de pruebas unitarias pasa al 100% sin discrepancias numéricas.  
**Evidence:** `npx tsx tests/unit/associationClassMath.test.ts` ejecutado con éxito. Todas las aserciones de midpoint, distance y segment proximity superadas.

---

### Slice 2: Interacción en el Lienzo, Dinamismo y Restricciones UML

#### [x] T2.1 [IMPL] Conectar gestos de arrastre, detección sobre aristas y registro de la 'T' en `[id]/page.tsx`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-01  
- RF: RF-01.1, RF-01.3  
- SC: SC-01.1.1  
- Plan: Sección 2 y Sección 3 (Secuencia)  
**Depends on:** T1.2, T1.3  
**Objective:** Conectar los eventos `onConnect`, `onEdgeClick` y la definición de `edgeTypes` para registrar y dibujar aristas de tipo `umlAssociationClassEdge` al soltar sobre una arista existente.  
**Work:**  
- Modificar `front_diag_clases/app/(dashboard)/diagrams/[id]/page.tsx`.
- Registrar `umlAssociationClassEdge: UmlAssociationClassEdge` en el objeto `edgeTypes`.
- Manejar la conexión que finaliza sobre una arista: capturar el `targetEdgeId` y emitir la nueva arista asociativa.  
**Done when:** Al arrastrar un conector desde una clase hacia una relación entre dos clases, se crea automáticamente la 'T'.  
**Evidence:** Implementado en `[id]/page.tsx` con `onConnectStart`, `onConnectEnd` y captura de `data-edge-id`. Verificado con `npx tsc --noEmit` y suite de tests de interacción.

---

#### [x] T2.2 [IMPL] Implementar la regla de unicidad (máximo 1 clase de asociación por relación) y alertas visuales
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-01  
- RF: RF-01.4  
- RB: RB-01  
- SC: SC-01.1.2  
**Depends on:** T2.1  
**Objective:** Evitar que una arista de asociación admita más de una clase intermedia, notificando al usuario ante intentos de duplicación.  
**Work:**  
- En el manejador de creación de aristas de `[id]/page.tsx`, verificar si ya existe una arista en `edges` cuyo `data.targetEdgeId` coincida con la arista objetivo.
- Si existe, abortar la adición y mostrar un toast o mensaje informativo: *"Esta relación ya cuenta con una clase de asociación vinculada"*.  
**Done when:** Intentar conectar una segunda clase a la misma relación es cancelado y emite feedback visible.  
**Evidence:** Regla de unicidad RB-01 implementada con toast flotante `toastMessage` y validada al 100% en `front_diag_clases/tests/unit/associationClassInteraction.test.ts` (Test 2).

---

#### [x] T2.3 [IMPL] Implementar la desvinculación limpia (preservación de arista base) y sincronización STOMP
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02  
- RF: RF-02.1  
- RB: RB-02, RB-03  
- SC: SC-02.1.1  
**Depends on:** T2.1  
**Objective:** Garantizar que al borrar el conector en 'T', la relación base entre las dos clases padre permanezca intacta y el cambio se difunda a todos los colaboradores en tiempo real.  
**Work:**  
- En `handleDeleteEdge` de `[id]/page.tsx`, si la arista eliminada es `umlAssociationClassEdge`, remover solo dicho conector del estado `edges`.
- Si se elimina la arista base, remover en cascada su conector en 'T' asociado.
- Transmitir la actualización mediante `broadcastCanvas` vía STOMP WebSocket.  
**Done when:** Borrar la 'T' deja las dos clases originales conectadas y la clase intermedia libre, reflejándose en las sesiones remotas.  
**Evidence:** Implementado en `handleDeleteEdge`, `onEdgesChange` y `handleDeleteNode`. Validado al 100% en `tests/unit/associationClassInteraction.test.ts` (Tests 3, 4 y 5).

---

#### [x] T2.4 [TEST] Test de interacción en canvas para conexión y desvinculación de la 'T'
**Status:** COMPLETED  
**Traceability:**  
- SC: SC-01.1.1, SC-02.1.1  
- Plan: Sección 6  
**Depends on:** T2.2, T2.3  
**Objective:** Validar de forma automatizada los flujos de creación, validación de unicidad y desvinculación en el lienzo.  
**Work:**  
- Crear prueba BDD en `front_diag_clases/tests/unit/associationClassInteraction.test.ts`.
- Simular creación de clases A, B y C; conexión de A a B; anclaje de C a la arista A-B; intento de duplicar con D; y borrado de la 'T'.  
**Done when:** La prueba se ejecuta y pasa en menos de 5 segundos.  
**Evidence:** Ejecución física de `npx tsx tests/unit/associationClassInteraction.test.ts` completada con exit code 0. 5/5 pruebas aprobadas (Conexión, Unicidad, Desvinculación limpia, Borrado en cascada y Eliminación de nodo).

---

### Slice 3: Importación de Imagen en Lienzo Activo (CanvasToolbar)

#### [x] T3.1 [IMPL] Construir componente modal `CanvasImageImportModal.tsx` con modos Reemplazar vs Fusionar
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-04  
- RF: RF-04.1, RF-04.2  
- Plan: Sección 2 y Sección 5.2  
**Depends on:** T1.1  
**Objective:** Crear el modal interactivo para cargar imágenes dentro del lienzo con vista previa, procesamiento mediante Gemini Vision y selección explícita de estrategia de importación.  
**Work:**  
- Crear `front_diag_clases/components/canvas/CanvasImageImportModal.tsx`.
- Incluir dropzone / selector de archivo de imagen, vista previa y botón de procesamiento con spinner de carga.
- Diseñar la pantalla de confirmación que presente las dos opciones: **"Reemplazar todo el lienzo"** y **"Fusionar / Agregar al diagrama"**.  
**Done when:** El modal procesa la imagen con Gemini y devuelve los nodos y aristas resultantes junto con la opción de modo elegida (`REPLACE` | `MERGE`).  
**Evidence:** Componente `CanvasImageImportModal.tsx` creado y validado con TypeScript sin errores. Soporta tabs (Archivo/Cámara), selector dual (`REPLACE`/`MERGE`), preview y estados de carga.

---

#### [x] T3.2 [IMPL] Agregar botón "Importar Imagen" en `CanvasToolbar.tsx` y enlazar modal
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-04  
- RF: RF-04.1  
**Depends on:** T3.1  
**Objective:** Añadir el botón accesible para importar imagen en la barra superior de herramientas del editor `/diagrams/[id]`.  
**Work:**  
- Modificar `front_diag_clases/components/canvas/CanvasToolbar.tsx`: agregar prop `onOpenImageImport: () => void` y botón con icono `ImageIcon` de `lucide-react` rotulado "Importar Imagen".
- Modificar `front_diag_clases/app/(dashboard)/diagrams/[id]/page.tsx` para declarar el estado `isCanvasImageImportOpen` y renderizar `CanvasImageImportModal`.  
**Done when:** El botón aparece en la barra del lienzo y al hacer clic abre el modal de importación sin interferir con las demás herramientas.  
**Evidence:** Botón agregado en `CanvasToolbar.tsx` con estilo púrpura distinguible y enlazado a `isCanvasImageImportOpen` en `[id]/page.tsx`.

---

#### [x] T3.3 [IMPL] Implementar lógica de fusión espacial (*merge layout*) sin solapamientos en `[id]/page.tsx`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-04  
- RF: RF-04.2  
- RB: RB-02  
- SC: SC-04.1.1  
**Depends on:** T3.1, T3.2  
**Objective:** Aplicar el resultado de la importación: en modo Reemplazar, sustituir el lienzo; en modo Fusionar, agregar clases e integrar aristas calculando coordenadas desplazadas para no solapar nodos existentes.  
**Work:**  
- En el handler de importación de `[id]/page.tsx`, si `mode === "REPLACE"`, sobrescribir `nodes` y `edges`.
- Si `mode === "MERGE"`, calcular el bounding box de los nodos actuales y aplicar un delta (`maxX + 120`, `minY`) a los nuevos nodos importados.
- Sincronizar vía STOMP y persistir en el backend (`PUT /api/diagrams/{id}`).  
**Done when:** Al importar en modo fusión, las clases preexistentes permanecen intactas y las nuevas se ubican en una zona libre sin superponerse.  
**Evidence:** Algoritmo de desplazamiento armónico implementado en `handleCanvasImageImport` dentro de `[id]/page.tsx`.

---

#### [x] T3.4 [TEST] Test de flujo de importación con selección de modo y persistencia
**Status:** COMPLETED  
**Traceability:**  
- SC: SC-04.1.1  
- Plan: Sección 6  
**Depends on:** T3.3  
**Objective:** Validar programáticamente que el flujo de importación respeta los modos de reemplazo y fusión.  
**Work:**  
- Crear suite unitaria en `front_diag_clases/tests/unit/imageImportMergeLayout.test.ts`.
- Validar sobrescritura en REPLACE, suma de nodos/aristas en MERGE, ausencia de colisiones de coordenadas y remapeo de identificadores.  
**Done when:** El test confirma que `nodes.length` final es la suma esperada y no existen coordenadas idénticas.  
**Evidence:** Ejecución física de `npx tsx tests/unit/imageImportMergeLayout.test.ts` completada con exit code 0. 4/4 pruebas pasadas exitosamente.

---

### Slice 4: Generadores Multiplataforma (Spring Boot, Flutter, XMI) e IA

#### [x] T4.1 [IMPL] Actualizar `springBootGenerator.ts` para generar entidades con 2x `@ManyToOne`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-05  
- RF: RF-05.2  
- RB: RB-04  
- Plan: Sección 4.3  
**Depends on:** T1.1  
**Objective:** Adaptar el generador de código Spring Boot para que reconozca aristas `umlAssociationClassEdge` y genere la clase intermedia como entidad JPA con claves foráneas hacia ambas clases padre.  
**Work:**  
- Modificar `front_diag_clases/services/springBootGenerator.ts`.
- Identificar las clases intermedias asociadas a aristas.
- Inyectar en el archivo Java de la entidad dos campos `@ManyToOne(fetch = FetchType.EAGER)` con sus `@JoinColumn` correspondientes hacia las entidades extremas, además de sus atributos propios.
- Asegurar que el repositorio Spring Data JPA y el controlador REST se generen para dicha entidad intermedia.  
**Done when:** Al descargar el proyecto Spring Boot en ZIP, el archivo Java de la clase intermedia compila con las dos relaciones `@ManyToOne`.  
**Evidence:** `springBootGenerator.ts` actualizado e integrado; validado en `generatorsAssociationClass.test.ts` con generación de anotaciones `@ManyToOne(fetch = FetchType.EAGER)`, `@JoinColumn`, atributos tipados y getters/setters correspondientes.

---

#### [x] T4.2 [IMPL] Actualizar `flutterGenerator.ts` para generar modelos Dart referenciados y JSON serializers
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-05  
- RF: RF-05.3  
**Depends on:** T1.1  
**Objective:** Adaptar el generador Flutter para que la clase intermedia contenga las referencias a ambas entidades y sus métodos `fromJson` y `toJson`.  
**Work:**  
- Modificar `front_diag_clases/services/flutterGenerator.ts`.
- Para clases asociativas, generar propiedades tipadas hacia las clases relacionadas (ej: `final User user; final Diagram diagram;` o sus IDs correspondientes) y constructores acordes.  
**Done when:** El archivo Dart generado para la clase asociativa incluye las referencias dobles y es válido sintácticamente.  
**Evidence:** `flutterGenerator.ts` genera imports de clases padre, campos referenciales opcionales, constructores con inicialización de endpoints y métodos `fromJson`/`toJson` anidados. Validado en `generatorsAssociationClass.test.ts`.

---

#### [x] T4.3 [IMPL] Actualizar `xmiExporter.ts` con tag `uml:AssociationClass` y calibrar prompts en `geminiDiagramService.ts`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-03, HU-05  
- RF: RF-03.1, RF-05.1  
**Depends on:** T1.1  
**Objective:** Asegurar la interoperabilidad XMI estándar según metamodelo OMG y la interpretación de Gemini para clases de asociación en prompts de texto/voz y visión.  
**Work:**  
- Modificar `front_diag_clases/services/xmiExporter.ts`: serializar la clase asociativa como `<packagedElement xmi:type="uml:AssociationClass" ...>` vinculando los extremos de la relación.
- Modificar `front_diag_clases/services/geminiDiagramService.ts`: incluir en el prompt del sistema la regla explícita de generación de clases de asociación en 'T' cuando se describa o detecte una relación muchos a muchos con atributos propios.  
**Done when:** El archivo XMI exportado valida contra Enterprise Architect y la IA genera aristas `umlAssociationClassEdge` ante peticiones en lenguaje natural.  
**Evidence:** `xmiExporter.ts` genera `<packagedElement xmi:type="uml:AssociationClass">` para las clases asociativas. `geminiDiagramService.ts` incluye las instrucciones y contrato JSON para aristas `umlAssociationClassEdge`.

---

#### [x] T4.4 [TEST] Tests unitarios de los generadores Spring Boot, Flutter y XMI para clases asociativas
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-05  
- Plan: Sección 6  
**Depends on:** T4.1, T4.2, T4.3  
**Objective:** Validar que los tres generadores producen el código y marcado correcto ante una estructura de diagrama con clase de asociación.  
**Work:**  
- Crear `front_diag_clases/tests/unit/generatorsAssociationClass.test.ts`.
- Alimentar un grafo de prueba (`Usuario`, `Diagrama` y `Colaborador` en 'T').
- Verificar presencia de `@ManyToOne` en Java, referencias en Dart y `<uml:AssociationClass>` en XMI.  
**Done when:** Los tests unitarios de generación se ejecutan con éxito.  
**Evidence:** Ejecución física de `npx tsx tests/unit/generatorsAssociationClass.test.ts` completada con exit code 0. 3/3 tests unitarios superados exitosamente.

---

### Slice 5: Verificación Global y Quality Gate

#### [x] T5.1 [VERIFY] Verificación de tipos TypeScript (`npx tsc --noEmit`), linter (`npm run lint`) y build
**Status:** COMPLETED  
**Traceability:**  
- Plan: Sección 6  
- AGENTS.md: Comandos Operativos Verificados  
**Depends on:** T1.1 a T4.4  
**Objective:** Garantizar que todo el código nuevo y modificado pasa la verificación estricta de tipos, reglas de linter y compilación sin advertencias ni regresiones.  
**Work:**  
- Ejecutar en `front_diag_clases/`: `npx tsc --noEmit`.
- Ejecutar en `front_diag_clases/`: `npm run lint`.
- Ejecutar verificación de pruebas en backend: `.\mvnw.cmd test-compile`.
- Ejecutar compilación de producción en frontend: `npm run build`.  
**Done when:** Todos los comandos de verificación de la Línea Base retornan código de salida 0 con cero errores.  
**Evidence:** 
1. `npx tsc --noEmit` completado con exit code 0 (cero errores de tipos).
2. `npx tsx tests/unit/...` 4 suites ejecutadas con exit code 0 y 16/16 aserciones aprobadas.
3. `npm run lint` completado con exit code 0 (0 errores).
4. `.\mvnw.cmd test-compile` completado con BUILD SUCCESS (exit code 0).
5. `npm run build` completado con exit code 0 (Turbopack compilado exitosamente, 7 rutas optimizadas).
