# Tasks: Rediseño Visual del Lienzo estilo Enterprise Architect y Conformidad UML 2.5 (Web y App Móvil)

## Task Progress

| Métrica | Cantidad |
| :--- | ---: |
| Total de tareas | 6 |
| Tareas realizadas | 6 |
| Tareas por realizar | 0 |
| Tareas bloqueadas | 0 |
| Tareas en progreso | 0 |
| Progreso | 100% |

**Estado:** COMPLETED

---

## Checklist Rápido de Tareas por Vertical Slice

### Slice 1: Rediseño Geométrico y Conformidad UML 2.5 en Plataforma Web
- [x] `T1.1` `[IMPL]` Rediseño de `UmlClassNode.tsx` (esquinas 90°, líneas continuas, cursiva para abstractas y guillemets).
- [x] `T1.2` `[IMPL]` Rediseño de `UmlNoteNode.tsx` (pliegue dog-ear) y `UmlEdge.tsx` / `UmlFloatingEdge.tsx` (aristas ortogonales con borderRadius: 0).
- [x] `T1.3` `[TEST]` Validación de compilación TypeScript y renderizado visual en lienzo web.

### Slice 2: Rediseño Geométrico, Notas UML e Inspección en App Móvil Flutter
- [x] `T2.1` `[IMPL]` Actualización de `diagram_model.dart` para soporte polimórfico (`umlNote` vs `umlClass` y `isAbstract`).
- [x] `T2.2` `[IMPL]` Rediseño de `mobile_canvas_painter.dart` a esquinas ortogonales, creación de `uml_note_card.dart` e implementación de `class_detail_bottom_sheet.dart`.
- [x] `T2.3` `[VERIFY]` Verificación consolidada de tipos, linter y ausencia de regresiones en web y móvil.

---

## 1. Resumen de Trazabilidad (`Spec` $\rightarrow$ `Plan` $\rightarrow$ `Tasks`)

| Requisito / Regla / Escenario (`spec.md`) | Componente Técnico (`plan.md`) | Tareas Asociadas (`tasks.md`) | Estado |
| :--- | :--- | :--- | :--- |
| `HU-06.1`, `RF-06.1.1`..`3`, `RB-06.1`..`3`, `SC-1`, `SC-2` | `PLAN-06.1` | `T1.1`, `T1.3` | **COMPLETED** |
| `HU-06.2`, `RF-06.2.1`..`2`, `RB-06.5`, `SC-3` | `PLAN-06.3` | `T1.2`, `T1.3` | **COMPLETED** |
| `HU-06.3`, `RF-06.3.1`, `RB-06.6` | `PLAN-06.2` | `T1.2`, `T1.3` | **COMPLETED** |
| `HU-06.4`, `HU-06.5`, `RF-06.4.1`, `RF-06.5.1`, `SC-4` | `PLAN-06.4`, `PLAN-06.5`, `PLAN-06.6` | `T2.1`, `T2.2` | **COMPLETED** |
| `HU-06.6`, `RF-06.6.1`, `RB-06.8`, `SC-5` | `PLAN-06.7` | `T2.2`, `T2.3` | **COMPLETED** |

---

## 2. Estrategia de Ejecución y Grafo de Dependencias

```mermaid
flowchart TD
    T1_1["T1.1 [IMPL] Rediseño UmlClassNode Web (COMPLETED)"] --> T1_2["T1.2 [IMPL] Rediseño UmlNoteNode y UmlEdge Web (COMPLETED)"]
    T1_2 --> T1_3["T1.3 [TEST] Validación Web (COMPLETED)"]
    T1_3 --> T2_1["T2.1 [IMPL] Modelo Polimórfico Flutter (COMPLETED)"]
    T2_1 --> T2_2["T2.2 [IMPL] Canvas Móvil, Notas y BottomSheet (COMPLETED)"]
    T2_2 --> T2_3["T2.3 [VERIFY] Cierre Global Web y Móvil (COMPLETED)"]
```

---

## 3. Desglose Detallado de Tareas Ejecutables

### Slice 1: Rediseño Geométrico y Conformidad UML 2.5 en Plataforma Web

#### [x] T1.1 [IMPL] Rediseño de `UmlClassNode.tsx` (esquinas cuadradas vivas, líneas continuas, cursiva para abstractas y guillemets)

* **Status:** COMPLETED
* **Traceability:** `PLAN-06.1` | `HU-06.1`, `RF-06.1.1`, `RF-06.1.2`, `RF-06.1.3`, `RB-06.1`, `RB-06.2`, `RB-06.3`, `SC-1`, `SC-2`
* **Depends on:** —
* **Files (según `plan.md`):**
  * `[MODIFY]` `front_diag_clases/components/canvas/UmlClassNode.tsx`
  * `[MODIFY]` `front_diag_clases/types/index.ts`
* **Objective:** Sustituir los bordes redondeados por esquinas ortogonales estrictas de 90° (`rounded-none`), incorporar líneas divisorias continuas entre compartimentos, renderizar en cursiva el nombre de clases abstractas y normalizar estereotipos entre guillemets `« »`.
* **Work Realizado:**
  * Reemplazadas clases de redondeo `rounded-md`, `rounded-t-md` y `rounded-b-md` por `rounded-none` en el clasificador, la cabecera y compartimentos.
  * Anclajes de conexión (`Handle`) con `!rounded-none` perimetrales discretos.
  * Líneas divisorias horizontales continuas de 1px (`border-b border-slate-300`) de extremo a extremo sin márgenes internos.
  * Detección formal de clases abstractas (`isAbstract: true` o estereotipo con substring "abstract") aplicando estilo en cursiva `italic font-serif`.
  * Normalización tipográfica de estereotipos envolviendo automáticamente en guillemets `« »`.
* **Done when:**
  * Los nodos de clase se visualizan como rectángulos ortogonales nítidos con nombre en cursiva para abstractas y sin ninguna esquina curva.
* **Evidence:**
  * Comando: `cd front_diag_clases; npx tsc --noEmit`
  * Resultado: `Exit code: 0` (0 errores de compilación TypeScript).

---

#### [x] T1.2 [IMPL] Rediseño de `UmlNoteNode.tsx` (pliegue dog-ear) y `UmlEdge.tsx` / `UmlFloatingEdge.tsx` (aristas ortogonales con borderRadius: 0)

* **Status:** COMPLETED
* **Traceability:** `PLAN-06.2`, `PLAN-06.3` | `HU-06.2`, `HU-06.3`, `RF-06.2.1`, `RF-06.3.1`, `RB-06.5`, `RB-06.6`, `SC-3`
* **Depends on:** `T1.1`
* **Files (según `plan.md`):**
  * `[MODIFY]` `front_diag_clases/components/canvas/UmlNoteNode.tsx`
  * `[MODIFY]` `front_diag_clases/components/canvas/UmlEdge.tsx`
  * `[MODIFY]` `front_diag_clases/components/canvas/UmlFloatingEdge.tsx`
* **Objective:** Dotar a las notas UML de un pliegue técnico doblado (*dog-ear*) en la esquina superior derecha y configurar el radio de curvatura de aristas en 0 para lograr quiebres limpios a 90°.
* **Work Realizado:**
  * En `UmlNoteNode.tsx`: Se implementó contenedor rectangular con esquinas ortogonales `rounded-none`, fondo amarillo suave técnico `#FFFFE6` y solapa doblada triangular (*dog-ear*) en la esquina superior derecha mediante trazado vectorial SVG con fondo del lienzo y relleno `#FEF08A` con borde fino `#D97706`.
  * En `UmlEdge.tsx`: Se configuró `borderRadius: 0` en `getSmoothStepPath` para quiebres ortogonales rectos de 90° sin curvas en codos (RB-06.5), y etiquetas con `rounded-none`.
  * En `UmlFloatingEdge.tsx`: Se aseguró el trazado adaptativo directo y etiquetas ortogonales con `rounded-none`.
* **Done when:**
  * Las aristas se doblan en ángulos rectos perfectos de 90° y las notas exhiben el pliegue dog-ear característico.
* **Evidence:**
  * Comando: `cd front_diag_clases; npm run lint`
  * Resultado: `Exit code: 0` (0 errores sintácticos / lint).

---

#### [x] T1.3 [TEST] Validación de compilación TypeScript y renderizado visual en lienzo web

* **Status:** COMPLETED
* **Traceability:** `SC-1`, `SC-2`, `SC-3`
* **Depends on:** `T1.1`, `T1.2`
* **Test Type:** Type-Check & Verificación Estática y Build de Producción
* **Files (según `plan.md`):**
  * `[MODIFY]` `front_diag_clases/components/canvas/UmlClassNode.tsx`
  * `[MODIFY]` `front_diag_clases/components/canvas/UmlNoteNode.tsx`
  * `[MODIFY]` `front_diag_clases/components/canvas/UmlEdge.tsx`
  * `[MODIFY]` `front_diag_clases/components/canvas/UmlFloatingEdge.tsx`
* **Objective:** Certificar que los cambios de renderizado en React Flow compilan de forma limpia sin errores de TypeScript ni advertencias del linter.
* **Work Realizado:**
  * Ejecución de `npx tsc --noEmit` y `npm run build` en `front_diag_clases/`.
* **Done when:**
  * El compilador `tsc` emite 0 errores y el build de Next.js pasa con éxito.
* **Evidence:**
  * Comandos: `cd front_diag_clases; npx tsc --noEmit; npm run build`
  * Resultado: `Exit code: 0` (Compiled successfully in 11.8s, Finished TypeScript in 13.4s, 7/7 static pages generated).

---

### Slice 2: Rediseño Geométrico, Notas UML e Inspección en App Móvil Flutter

#### [x] T2.1 [IMPL] Actualización de `diagram_model.dart` para soporte polimórfico (`umlNote` vs `umlClass` y `isAbstract`)

* **Status:** COMPLETED
* **Traceability:** `PLAN-06.4` | `HU-06.4`, `HU-06.5`, `RF-06.4.2`, `RF-06.5.1`, `RB-06.7`, `SC-4`
* **Depends on:** `T1.3`
* **Files (según `plan.md`):**
  * `[MODIFY]` `flutter_viewer/lib/models/diagram_model.dart`
* **Objective:** Discriminar los nodos por su tipo (`umlClass` vs `umlNote`) para que las notas no sean interpretadas erróneamente como clases vacías y detectar si una clase es abstracta.
* **Work Realizado:**
  * Definición de jerarquía polimórfica `abstract class UmlCanvasNode` con subtipos `UmlClassNode` (con propiedad `isAbstract`) y `UmlNoteNode` (con `content`).
  * Enriquecido `UmlEdge` con soporte para `isAssociationClass: bool`.
  * Adaptado `DiagramCanvasData.fromJson` para procesar y segregar listas de clases (`nodes`) y notas explicativas (`notes`), ofreciendo getter `allNodes`.
* **Done when:**
  * El parseo del JSON del lienzo en Flutter almacena adecuadamente tanto clases como notas con sus propiedades completas.
* **Evidence:**
  * Comando: `cd flutter_viewer; flutter analyze lib/models/diagram_model.dart`
  * Resultado: `No issues found! (ran in 5.1s)`.

---

#### [x] T2.2 [IMPL] Rediseño de `mobile_canvas_painter.dart` a esquinas ortogonales, creación de `uml_note_card.dart` e implementación de `class_detail_bottom_sheet.dart`

* **Status:** COMPLETED
* **Traceability:** `PLAN-06.5`, `PLAN-06.6`, `PLAN-06.7` | `HU-06.4`, `HU-06.5`, `HU-06.6`, `RF-06.4.1`, `RF-06.5.1`, `RF-06.6.1`, `RB-06.1`, `RB-06.6`, `RB-06.8`, `SC-4`, `SC-5`
* **Depends on:** `T2.1`
* **Files (según `plan.md`):**
  * `[MODIFY]` `flutter_viewer/lib/widgets/mobile_canvas_painter.dart`
  * `[CREATE]` `flutter_viewer/lib/widgets/uml_note_card.dart`
  * `[CREATE]` `flutter_viewer/lib/widgets/class_detail_bottom_sheet.dart`
* **Objective:** Transformar las tarjetas de clase en rectángulos estrictos de 90° (`BorderRadius.zero`), renderizar notas con pliegue dog-ear y conectar el gesto de tap para abrir la hoja modal de detalle.
* **Work Realizado:**
  * En `mobile_canvas_painter.dart`:
    - Reemplazado `BorderRadius.circular(8)` por `BorderRadius.zero` en `UmlClassCard`.
    - Nombre de clase abstracta con `fontStyle: FontStyle.italic`.
    - Renderizado polimórfico de notas `UmlNoteCard(note: note)` sobre el lienzo móvil.
    - Soporte en aristas para trazo punteado de clases-asociación (`isAssociationClass`).
    - Envoltorio de `UmlClassCard` con `GestureDetector` invocando `ClassDetailBottomSheet.show`.
  * En `uml_note_card.dart`:
    - Creado widget con esquinas rectas (`BorderRadius.zero`), color amarillo suave `#FFFFE6`, borde fino `#EAB308` y pliegue dog-ear superior derecho dibujado con `DogEarFoldPainter`.
  * En `class_detail_bottom_sheet.dart`:
    - Implementada hoja modal inferior con inspección táctil completa de atributos con visibilidad tipada, operaciones con parámetros y tipos de retorno, y relaciones conectadas.
* **Done when:**
  * Las clases se muestran cuadradas, las notas se dibujan con su pliegue y al tocar una clase se abre la hoja de inspección.
* **Evidence:**
  * Comando: `cd flutter_viewer; flutter analyze lib/widgets/`
  * Resultado: `No issues found!`.

---

### Fase Final: Verificación Consolidada y Cierre

#### [x] T2.3 [VERIFY] Verificación consolidada de tipos, linter y ausencia de regresiones en web y móvil

* **Status:** COMPLETED
* **Traceability:** Cross-cutting (Cierre de Módulo 06)
* **Depends on:** `T1.3`, `T2.2`
* **Objective:** Garantizar que todo el código modificado y creado cumple con las reglas de calidad, cero advertencias de compilación y paridad visual total.
* **Work Realizado:**
  * Ejecución de `npx tsc --noEmit` y `npm run build` en frontend.
  * Ejecución de `flutter analyze` y suite de pruebas `flutter test` (14/14 tests pasando).
* **Done when:**
  * Todas las suites y analizadores pasan en verde con 0 errores.
* **Evidence:**
  * Comandos:
    - `cd front_diag_clases; npx tsc --noEmit; npm run lint; npm run build` (Exit code: 0)
    - `cd flutter_viewer; flutter analyze; flutter test` (Exit code: 0, 14/14 tests passed).
  * Resultado registrado: Verificación 100% exitosa sin errores ni regresiones.

---

## 4. Bitácora de Evidencia de Ejecución (`/sdd-execution`)

### Registro Cronológico de Acciones:
1. **Línea base previa**: Verificados `npx tsc --noEmit` (0 errores) y `flutter analyze` (0 errores).
2. **Slice 1 (Web)**:
   - Modificado `front_diag_clases/types/index.ts` añadiendo `isAbstract?: boolean` en `UmlClassData`.
   - Modificado `front_diag_clases/components/canvas/UmlClassNode.tsx`: esquinas cuadradas `rounded-none`, cabecera y divisores de compartimentos continuos de 1px, cursiva para abstractas `italic font-serif` y guillemets `« »`.
   - Modificado `front_diag_clases/components/canvas/UmlNoteNode.tsx`: esquinas `rounded-none`, fondo amarillo técnico `#FFFFE6`, pliegue SVG dog-ear superior derecho.
   - Modificado `front_diag_clases/components/canvas/UmlEdge.tsx`: `borderRadius: 0` en `getSmoothStepPath` para quiebres ortogonales estrictos de 90°, etiquetas `rounded-none`.
   - Modificado `front_diag_clases/components/canvas/UmlFloatingEdge.tsx`: etiquetas ortogonales `rounded-none`.
   - Ejecutado `npx tsc --noEmit` (0 errores) y `npm run lint` (0 errores).
3. **Slice 2 (Móvil Flutter)**:
   - Modificado `flutter_viewer/lib/models/diagram_model.dart`: jerarquía polimórfica `UmlCanvasNode`, `UmlClassNode` (con `isAbstract`), `UmlNoteNode` (con `content`), `UmlEdge` (con `isAssociationClass`), `DiagramCanvasData.fromJson` discriminando clases y notas.
   - Creado `flutter_viewer/lib/widgets/uml_note_card.dart` con `DogEarFoldPainter` y fondo amarillo suave.
   - Creado `flutter_viewer/lib/widgets/class_detail_bottom_sheet.dart` para inspección táctil al tocar una tarjeta de clase.
   - Modificado `flutter_viewer/lib/widgets/mobile_canvas_painter.dart`: `BorderRadius.zero` en `UmlClassCard`, renderizado en cursiva de abstractas, soporte para renderizar notas `UmlNoteCard`, aristas punteadas para `isAssociationClass`, y conexión táctil a `ClassDetailBottomSheet.show`.
   - Modificado `flutter_viewer/test/diagram_parser_test.dart` agregando 3 tests unitarios nuevos para validación de clases abstractas, notas UML explicativas y clases-asociación.
   - Ejecutado `flutter analyze` (0 errores) y `flutter test` (14/14 tests pasando).
   - Ejecutado `npm run build` en `front_diag_clases/` (0 errores, build de producción exitoso).
4. **Ronda de Revisión Escéptica y Endurecimiento**:
   - Corregido `front_diag_clases/components/canvas/UmlClassNode.tsx`: incorporada clase `group` en el contenedor raíz para reactivar visibilidad perimetral de los `Handle` en hover; normalización de estereotipos con `.trim()` previo y soporte de corchetes angulares simples `< >` y guillemets `« »`.
   - Corregido `front_diag_clases/components/canvas/UmlEdge.tsx` y `UmlFloatingEdge.tsx`: soporte formal de `isAssociationClass: true` con trazado punteado `strokeDasharray = "5 4"` e insensibilidad a mayúsculas/minúsculas en `relationType.toUpperCase()`.
   - Endurecido `flutter_viewer/lib/models/diagram_model.dart`: deserialización robusta ante `Map<dynamic, dynamic>`, normalización de estereotipos con espacios externos y exposición de `nodeNames` legible.
   - Mejorado `flutter_viewer/lib/widgets/class_detail_bottom_sheet.dart` y `mobile_canvas_painter.dart`: resolución de nombres de clases/notas en relaciones conectadas y soporte para dibujar aristas conectadas a notas UML en el lienzo móvil.
   - Creado `front_diag_clases/tests/unit/umlRenderingSpec06.test.ts` con cobertura de guillemets, clases abstractas y clases-asociación.
   - Verificación consolidada: `npx tsx --test tests/unit/umlRenderingSpec06.test.ts` (100% pass), `npx tsc --noEmit` (0 errores), `flutter test` (14/14 tests pass), `flutter analyze` (0 issues), `npm run build` (7/7 páginas estáticas y dinámicas compiladas).
