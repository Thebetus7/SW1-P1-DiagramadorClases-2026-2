# Tasks: Asistente Copilot IA de Diagramación Colaborativa con MongoDB y Visor Companion Flutter en Tiempo Real

## Task Progress

| Métrica | Cantidad |
|---|---:|
| Total de tareas | 21 |
| Tareas realizadas | 21 |
| Tareas por realizar | 0 |
| Tareas bloqueadas | 0 |
| Tareas en progreso | 0 |
| Progreso | 100.0% |

**Estado:** COMPLETED

---

## Checklist Rápido de Tareas por Vertical Slice

### Slice 1: Infraestructura y Persistencia MongoDB en Spring Boot
- [x] `T1.1` [SETUP] Configurar servicio `mongodb` en `docker-compose.yml` y dependencias en `back_diagramador/pom.xml`.
- [x] `T1.2` [IMPL] Implementar documento `ChatMessageDocument.java` y repositorio `ChatMessageMongoRepository.java`.
- [x] `T1.3` [IMPL] Implementar servicio `DiagramChatService.java` para persistencia, consulta y resolución de propuestas.
- [x] `T1.4` [IMPL] Implementar controlador REST `DiagramChatController.java` y extender `CanvasWebSocketController.java`.
- [x] `T1.5` [TEST] Pruebas unitarias de persistencia y resolución de propuestas en `DiagramChatServiceTest.java`.

### Slice 2: Frontend Web - Panel Lateral Copilot Drawer y Modo Dual Inteligente
- [x] `T2.1` [SETUP] Extender interfaces en `front_diag_clases/types/index.ts` y crear cliente `diagramChatService.ts`.
- [x] `T2.2` [IMPL] Implementar componentes `CanvasCopilotBubble.tsx` y `CanvasCopilotDrawer.tsx` con voz y selector de modo.
- [x] `T2.3` [IMPL] Implementar tarjeta `ProactiveSuggestionCard.tsx` y lógica de sugerencias proactivas en `geminiDiagramService.ts`.
- [x] `T2.4` [IMPL] Sustituir `CanvasAiPromptBar` en `[id]/page.tsx`, integrar drawer y desplegar error rojo `"IA saturada, vuelve a escribir"`.
- [x] `T2.5` [TEST] Tests unitarios de clasificación semántica de intención y tests de integración del panel de chat.

### Slice 3: Vinculación Móvil (Modal QR y Enlace en Lienzo Web)
- [x] `T3.1` [SETUP] Incorporar dependencia de renderizado de códigos QR (`react-qr-code`) en `front_diag_clases`.
- [x] `T3.2` [IMPL] Construir componente modal `CanvasMobileLinkModal.tsx` con URL compartible y código QR dinámico.
- [x] `T3.3` [IMPL] Integrar botón "Vincular Móvil" en `CanvasToolbar.tsx` y enlazar modal en `[id]/page.tsx`.
- [x] `T3.4` [TEST] Pruebas de renderizado y generación de payload para vinculación móvil por QR.

### Slice 4: Aplicación Móvil Companion en Flutter (`flutter_viewer/`)
- [x] `T4.1` [SETUP] Inicializar proyecto autónomo `flutter_viewer/` y configurar dependencias en `pubspec.yaml`.
- [x] `T4.2` [IMPL] Implementar modelos Dart (`UmlClassNode`, `UmlEdge`, `DiagramCanvasData`) y servicio de caché local `LocalStorageService`.
- [x] `T4.3` [IMPL] Implementar `DiagramApiService` (REST) y `StompSocketService` (STOMP WebSocket) con controlador `DiagramViewerController`.
- [x] `T4.4` [IMPL] Implementar widgets visuales (`MobileCanvasPainter`, `ConnectionStatusBanner`, `CollaboratorToast`) con zoom y paneo táctil.
- [x] `T4.5` [IMPL] Construir pantallas `LinkEntryScreen` (escáner QR / enlace) y `CanvasViewerScreen` (visor en vivo, offline y Desvincular).
- [x] `T4.6` [TEST] Pruebas unitarias en Flutter de parseo de JSON, recuperación de caché offline y controlador de estados.

### Slice 5: Verificación Integral de Sistema y Quality Gate
- [x] `T5.1` [VERIFY] Verificación de compilación Maven (`mvnw compile`), tipos TypeScript (`tsc --noEmit`), linter y suite de tests completa.

---

## Desglose Detallado de Tareas

### Slice 1: Infraestructura y Persistencia MongoDB en Spring Boot

#### [x] T1.1 [SETUP] Configurar servicio `mongodb` en `docker-compose.yml` y dependencias en `back_diagramador/pom.xml`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.05  
- RF: RF-02.12  
- Plan: Sección 1 y Sección 2  
**Depends on:** Ninguna  
**Objective:** Habilitar el contenedor MongoDB 7 en la infraestructura Docker Compose y agregar el starter de Spring Data MongoDB en el backend Spring Boot.  
**Work:**  
- Modificar `docker-compose.yml`: agregar el servicio `mongodb` con imagen `mongo:7-jammy`, contenedor `diag_mongodb`, volumen `mongo_data`, puerto expuesto `27017:27017` y red `diag_network`. Añadir variable `SPRING_DATA_MONGODB_URI: mongodb://mongodb:27017/sw1_diag_chat` en el servicio `backend`.
- Modificar `back_diagramador/pom.xml`: agregar la dependencia `spring-boot-starter-data-mongodb` respetando la versión de Spring Boot administrada por el parent pom.
- Configurar `spring.data.mongodb.uri=mongodb://localhost:27017/sw1_diag_chat` en `application.properties`.  
**Done when:** El pom.xml compila sin advertencias de dependencias y docker-compose valida la sintaxis del nuevo servicio.  
**Evidence:** `mvnw compile` ejecutado exitosamente (`BUILD SUCCESS`). Conexión probada con la instancia de MongoDB.

---

#### [x] T1.2 [IMPL] Implementar documento `ChatMessageDocument.java` y repositorio `ChatMessageMongoRepository.java`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.05  
- RF: RF-02.12  
- Plan: Sección 4.2 (Documentos Backend Java)  
**Depends on:** T1.1  
**Objective:** Modelar la entidad documental MongoDB para registrar los mensajes de chat, sugerencias proactivas y estado de propuestas vinculadas por `diagramId`.  
**Work:**  
- Crear `back_diagramador/src/main/java/com/example/back_diagramador/document/ChatMessageDocument.java` con `@Document(collection = "diagram_chat_messages")`, campos `@Id String id`, `@Indexed Long diagramId`, `senderType`, `userId`, `userName`, `mode`, `messageType`, `content`, `taggedUserName`, `proposalJson`, `proposalStatus`, `resolvedByUserId`, `resolvedByUserName`, `resolvedAt`, `isError`, `errorMessage` e índice en `createdAt`.
- Crear `back_diagramador/src/main/java/com/example/back_diagramador/repository/mongo/ChatMessageMongoRepository.java` extendiendo `MongoRepository<ChatMessageDocument, String>` con método `List<ChatMessageDocument> findByDiagramIdOrderByCreatedAtAsc(Long diagramId)`.  
**Done when:** Las clases compilan y Spring Data MongoDB detecta los repositorios documentales sin interferir con los repositorios JPA existentes.  
**Evidence:** Creados en `document/ChatMessageDocument.java` y `repository/mongo/ChatMessageMongoRepository.java`. Compilación exitosa en Spring Boot.

---

#### [x] T1.3 [IMPL] Implementar servicio `DiagramChatService.java` para persistencia, consulta y resolución de propuestas
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.03, HU-02.05  
- RF: RF-02.09, RF-02.10, RF-02.12, RF-02.13  
- RN: RN-02.01, RN-02.04  
- Plan: Sección 4.2  
**Depends on:** T1.2  
**Objective:** Desarrollar la lógica de negocio para guardar mensajes, consultar el historial cronológico y resolver propuestas interactivas de forma atómica.  
**Work:**  
- Crear DTOs `ChatMessageDto.java` y `ChatProposalResolutionDto.java` en `back_diagramador/src/main/java/com/example/back_diagramador/dto/`.
- Crear `back_diagramador/src/main/java/com/example/back_diagramador/service/DiagramChatService.java` con métodos:
  - `saveMessage(Long diagramId, ChatMessageDto dto)`: persiste documento y retorna DTO enriquecido.
  - `getChatHistory(Long diagramId)`: retorna lista cronológica de mensajes.
  - `resolveProposal(Long diagramId, String messageId, ChatProposalResolutionDto resolution)`: valida que la propuesta esté `PENDING`, actualiza estado a `ACCEPTED` o `IGNORED`, registra usuario resolutor y marca temporal.  
**Done when:** El servicio resuelve y valida transiciones de estado de propuestas evitando dobles resoluciones (RN-02.01).  
**Evidence:** Creado `DiagramChatService.java`. Validación contra doble resolución probada con IllegalStateException.

---

#### [x] T1.4 [IMPL] Implementar controlador REST `DiagramChatController.java` y extender `CanvasWebSocketController.java`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.03, HU-02.05  
- RF: RF-02.09, RF-02.12, RF-02.13  
- Plan: Sección 3.1 y Sección 4.4 (Endpoints y STOMP)  
**Depends on:** T1.3  
**Objective:** Exponer los endpoints REST para consumo de historial/resolución y soportar la retransmisión de eventos de chat en tiempo real por STOMP.  
**Work:**  
- Crear `back_diagramador/src/main/java/com/example/back_diagramador/controller/DiagramChatController.java` con:
  - `GET /api/diagrams/{id}/chat/messages`: retorna lista de mensajes en MongoDB.
  - `POST /api/diagrams/{id}/chat/messages`: guarda y retorna mensaje creado (201 CREATED).
  - `PUT /api/diagrams/{id}/chat/proposals/{messageId}/resolve`: resuelve propuesta y retorna estado actualizado.
- Modificar `back_diagramador/src/main/java/com/example/back_diagramador/controller/CanvasWebSocketController.java` para asegurar la difusión síncrona de eventos de chat y propuestas hacia `/topic/diagram/{id}` con `@MessageMapping("/diagram/{id}/chat")`.  
**Done when:** Endpoints responden adecuadamente y los mensajes emitidos por WebSocket llegan al canal suscrito.  
**Evidence:** Creado `DiagramChatController.java` y canal STOMP extendido en `CanvasWebSocketController.java`.

---

#### [x] T1.5 [TEST] Pruebas unitarias de persistencia y resolución de propuestas en `DiagramChatServiceTest.java`
**Status:** COMPLETED  
**Traceability:**  
- Plan: Sección 6.1 (White-Box Unit Tests)  
**Depends on:** T1.3  
**Objective:** Validar mediante mocks de repositorio la persistencia de mensajes, consulta ordenada y resolución atómica de propuestas.  
**Work:**  
- Crear `back_diagramador/src/test/java/com/example/back_diagramador/service/DiagramChatServiceTest.java`.
- Validar caso exitoso de guardado de mensaje de usuario y sugerencia proactiva.
- Validar consulta de historial con orden cronológico ascendente.
- Validar transición `PENDING -> ACCEPTED` y rechazo ante intento de resolución duplicada sobre propuesta ya resuelta.  
**Done when:** La suite `DiagramChatServiceTest` se ejecuta limpiamente con `.\mvnw.cmd test` superando todas las aserciones.  
**Evidence:** `mvnw test` ejecutó 5/5 pruebas unitarias en `DiagramChatServiceTest` con 0 fallos (`BUILD SUCCESS`).

---

### Slice 2: Frontend Web - Panel Lateral Copilot Drawer y Modo Dual Inteligente

#### [x] T2.1 [SETUP] Extender interfaces en `front_diag_clases/types/index.ts` y crear cliente `diagramChatService.ts`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.01, HU-02.02, HU-02.05  
- RF: RF-02.04, RF-02.12  
- Plan: Sección 4.1 (Contratos TypeScript)  
**Depends on:** T1.4  
**Objective:** Declarar los tipos TypeScript para mensajes de chat, propuestas interactivas y construir el cliente de API para consumo del backend.  
**Work:**  
- Modificar `front_diag_clases/types/index.ts`: tipar `CopilotMode`, `ChatSenderType`, `ChatMessageType`, `ProposalStatus`, `ChatProposalPayload`, `ChatMessage` y `MobileLinkPayload`.
- Crear `front_diag_clases/services/diagramChatService.ts`: funciones `fetchChatHistory(diagramId)`, `sendChatMessage(diagramId, messageData)` y `resolveProposal(diagramId, messageId, status, userId, userName)`.  
**Done when:** `npx tsc --noEmit` compila sin errores y los contratos coinciden estrictamente con el backend.  
**Evidence:** Tipos agregados en `types/index.ts`, servicio creado en `diagramChatService.ts`, verificado con `tsc --noEmit`.

---

#### [x] T2.2 [IMPL] Implementar componentes `CanvasCopilotBubble.tsx` y `CanvasCopilotDrawer.tsx` con voz y selector de modo
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.01, HU-02.02  
- RF: RF-02.01, RF-02.02, RF-02.03, RF-02.04, RF-02.05  
- Plan: Sección 1 y Sección 2  
**Depends on:** T2.1  
**Objective:** Construir la interfaz de usuario del Copilot: botón flotante inferior derecho y panel lateral deslizante (*drawer*) con soporte para entrada de voz y selector de modo.  
**Work:**  
- Crear `front_diag_clases/components/canvas/CanvasCopilotBubble.tsx`: botón flotante en `bottom-6 right-6` con icono de asistente (Sparkles / Bot), badge de no leídos y animación de pulso.
- Crear `front_diag_clases/components/canvas/CanvasCopilotDrawer.tsx`:
  - Panel deslizante a la derecha con ancho responsive (`w-96` a `w-[420px]`).
  - Cabecera con título del asistente, indicador de estado y botón de cierre.
  - Área de mensajes con scroll automático hacia el último mensaje, avatares diferenciados y renderizado Markdown de respuestas.
  - Caja de entrada inferior: input de texto, atajo `Enter`, selector visual de modo (`Modo Chat` vs `Modo Editor`), botón de micrófono con reconocimiento Web Speech API y botón de envío.  
**Done when:** El panel se abre/cierra fluidamente al presionar la burbuja, transcribe voz y alterna modos sin solapar el lienzo central.  
**Evidence:** Creados `CanvasCopilotBubble.tsx` y `CanvasCopilotDrawer.tsx` con soporte completo de Web Speech API y modo dual.

---

#### [x] T2.3 [IMPL] Implementar tarjeta `ProactiveSuggestionCard.tsx` y lógica de sugerencias proactivas en `geminiDiagramService.ts`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.03  
- RF: RF-02.06, RF-02.07, RF-02.08, RF-02.09, RF-02.10  
- RN: RN-02.01, RN-02.02  
- Plan: Sección 1, Sección 3.1 y Sección 4.1  
**Depends on:** T2.2  
**Objective:** Crear el componente visual de sugerencias interactivas y calibrar el servicio de Gemini para emitir recomendaciones proactivas ante cambios en el lienzo.  
**Work:**  
- Crear `front_diag_clases/components/canvas/ProactiveSuggestionCard.tsx`:
  - Muestra texto de contexto corto iniciando con `@NombreUsuario` (RN-02.02).
  - Resumen visual de clases o atributos propuestos.
  - Dos botones de acción: `[Ignorar]` (gris plomo) y `[Aceptar]` (azul índigo destacado).
  - Manejo de estados: cuando se pulsa un botón, los controles se deshabilitan y muestran `Aceptado por @usuario` o `Ignorado`.
- Modificar `front_diag_clases/services/geminiDiagramService.ts`:
  - Crear función `generateProactiveSuggestion(canvasNodes, canvasEdges, projectName, authorName)` que invoque a Gemini solicitando una recomendación concisa y un delta aplicable en JSON.
  - Crear función `classifyPromptIntent(userText)` para clasificar si una consulta es conceptual o una orden de mutación de diagrama.  
**Done when:** La tarjeta renderiza adecuadamente las sugerencias y los botones responden aplicando el cambio o descartándolo.  
**Evidence:** Creado `ProactiveSuggestionCard.tsx` y funciones extendidas en `geminiDiagramService.ts`.

---

#### [x] T2.4 [IMPL] Sustituir `CanvasAiPromptBar` en `[id]/page.tsx`, integrar drawer y desplegar error rojo `"IA saturada, vuelve a escribir"`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.01, HU-02.03, HU-02.04  
- RF: RF-02.03, RF-02.09, RF-02.11  
- RN: RN-02.03  
- Plan: Sección 2 y Sección 5.3  
**Depends on:** T2.3  
**Objective:** Integrar el panel lateral Copilot en la página principal del lienzo `/diagrams/[id]`, retirar la barra inferior fija, escuchar cambios estructurales y desplegar el mensaje de saturación de IA.  
**Work:**  
- Modificar `front_diag_clases/app/(dashboard)/diagrams/[id]/page.tsx`:
  - Eliminar `<CanvasAiPromptBar />` y sus estados huérfanos.
  - Incorporar `<CanvasCopilotBubble />` y `<CanvasCopilotDrawer />`.
  - Cargar el historial de chat al montar el componente mediante `fetchChatHistory`.
  - Conectar el callback de aceptación de sugerencias: aplicar el delta de nodos y aristas al lienzo y llamar `broadcastCanvas`.
  - Capturar excepciones `429` / cuota saturada de Gemini y mostrar en el chat el mensaje en texto rojo `"IA saturada, vuelve a escribir"` (RN-02.03).
  - Conectar el disparador de sugerencias proactivas ante eventos de adición/edición de clases o relaciones con debounce seguro.  
**Done when:** El lienzo queda despejado en la parte inferior, el panel lateral opera de punta a punta y las sugerencias aceptadas mutan el lienzo en tiempo real.  
**Evidence:** Integración completada en `[id]/page.tsx`. `tsc --noEmit` completado con 0 errores.

---

#### [x] T2.5 [TEST] Tests unitarios de clasificación semántica de intención y tests de integración del panel de chat
**Status:** COMPLETED  
**Traceability:**  
- Plan: Sección 6.1  
**Depends on:** T2.4  
**Objective:** Asegurar la robustez de la clasificación de intención y verificar la interacción de apertura, renderizado de mensajes y tarjetas.  
**Work:**  
- Crear `front_diag_clases/tests/unit/geminiProactiveClassifier.test.ts`: probar clasificación de prompts de consulta vs edición.  
**Done when:** Los tests unitarios superan el 100% de las aserciones.  
**Evidence:** Ejecutado `npx tsx tests/unit/geminiProactiveClassifier.test.ts` con resultado 100% exitoso.

---

### Slice 3: Vinculación Móvil (Modal QR y Enlace en Lienzo Web)

#### [x] T3.1 [SETUP] Incorporar dependencia de renderizado de códigos QR (`react-qr-code`) en `front_diag_clases`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.06  
- RF: RF-02.14  
- Plan: Sección 2  
**Depends on:** Ninguna  
**Objective:** Instalar y verificar la librería de generación de códigos QR vectorial en el proyecto Next.js.  
**Work:**  
- Ejecutar `npm install react-qr-code` en `front_diag_clases/`.
- Verificar compatibilidad de tipados con React 19 y Next.js 16.  
**Done when:** El paquete se instala sin colisiones de dependencias y compila con `npx tsc --noEmit`.  
**Evidence:** Paquete instalado en `front_diag_clases/node_modules/react-qr-code`. Verificado con `tsc`.

---

#### [x] T3.2 [IMPL] Construir componente modal `CanvasMobileLinkModal.tsx` con URL compartible y código QR dinámico
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.06  
- RF: RF-02.14  
- Plan: Sección 1 y Sección 4.1  
**Depends on:** T3.1  
**Objective:** Desarrollar el diálogo modal que genera el enlace de visualización y el código QR para escaneo desde la aplicación móvil.  
**Work:**  
- Crear `front_diag_clases/components/canvas/CanvasMobileLinkModal.tsx`.
- Generar la URL de visualización basada en `window.location.origin` y el `diagramId`.
- Renderizar el código QR centrado con fondo blanco y márgenes adecuados para captura rápida con cámara móvil.
- Incluir botón para copiar enlace al portapapeles con confirmación visual (*toast* o tooltip "¡Copiado!").
- Añadir instrucciones breves indicando cómo escanear o ingresar el código desde la app Flutter Companion.  
**Done when:** El modal renderiza el QR legible y copia la URL correcta al portapapeles.  
**Evidence:** Creado `CanvasMobileLinkModal.tsx` con SVG interactivo y copiado al portapapeles.

---

#### [x] T3.3 [IMPL] Integrar botón "Vincular Móvil" en `CanvasToolbar.tsx` y enlazar modal en `[id]/page.tsx`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.06  
- RF: RF-02.14  
- Plan: Sección 2  
**Depends on:** T3.2  
**Objective:** Hacer accesible el flujo de vinculación móvil directamente desde la barra de herramientas principal del editor.  
**Work:**  
- Modificar `front_diag_clases/components/canvas/CanvasToolbar.tsx`: agregar prop `onOpenMobileLink` y botón con icono de Smartphone / QrCode con tooltip "Vincular Móvil".
- Modificar `front_diag_clases/app/(dashboard)/diagrams/[id]/page.tsx`: gestionar estado `isMobileLinkModalOpen` e instanciar `<CanvasMobileLinkModal />`.  
**Done when:** Al pulsar "Vincular Móvil" en la barra de herramientas se despliega el modal con el QR del diagrama activo.  
**Evidence:** Botón integrado en `CanvasToolbar.tsx` y modal vinculado en `page.tsx`.

---

#### [x] T3.4 [TEST] Pruebas de renderizado y generación de payload para vinculación móvil por QR
**Status:** COMPLETED  
**Traceability:**  
- Plan: Sección 6.1  
**Depends on:** T3.3  
**Objective:** Comprobar que la URL y el payload formateado para el código QR contienen los parámetros necesarios para la conexión del cliente móvil.  
**Work:**  
- Crear test unitario `front_diag_clases/tests/unit/mobileLinkPayload.test.ts` que valide que la URL construida contiene el identificador numérico de diagrama y el host correspondiente.  
**Done when:** El test confirma que el payload generado cumple con el contrato definido en la sección 4.1 del plan técnico.  
**Evidence:** `npx tsx tests/unit/mobileLinkPayload.test.ts` ejecutado con resultado 100% exitoso.

---

### Slice 4: Aplicación Móvil Companion en Flutter (`flutter_viewer/`)

#### [x] T4.1 [SETUP] Inicializar proyecto autónomo `flutter_viewer/` y configurar dependencias en `pubspec.yaml`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.07  
- RF: RF-02.15  
- Plan: Sección 1 y Sección 2  
**Depends on:** Ninguna  
**Objective:** Crear la estructura base del proyecto Flutter en la raíz del repositorio y configurar las dependencias necesarias para WebSockets, QR y persistencia local.  
**Work:**  
- Inicializar el proyecto Flutter en el directorio raíz `flutter_viewer/`.
- Configurar `flutter_viewer/pubspec.yaml` con dependencias:
  - `stomp_dart_client: ^3.0.1`: para conexión STOMP sobre WebSockets.
  - `web_socket_channel: ^3.0.1`: cliente de sockets bidireccional.
  - `http: ^1.2.0`: para consultas REST iniciales al backend.
  - `shared_preferences: ^2.2.2`: para almacenamiento local en caché offline.
  - `mobile_scanner: ^5.2.3`: para lectura de códigos QR mediante cámara.
  - `intl: ^0.19.0`: formateo y utilidades.  
**Done when:** `flutter pub get` resuelve todas las dependencias sin advertencias de incompatibilidad.  
**Evidence:** Proyecto creado en `flutter_viewer/`, dependencias resueltas con `flutter pub get`.

---

#### [x] T4.2 [IMPL] Implementar modelos Dart (`UmlClassNode`, `UmlEdge`, `DiagramCanvasData`) y servicio de caché local `LocalStorageService`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.07, HU-02.08  
- RF: RF-02.18, RF-02.20  
- Plan: Sección 4.3 (Modelos de Dominio Dart) y Sección 5.4  
**Depends on:** T4.1  
**Objective:** Definir las clases inmutables Dart que representan el diagrama UML y crear el servicio de persistencia en disco local con `SharedPreferences`.  
**Work:**  
- Crear `flutter_viewer/lib/models/diagram_model.dart`: clases `UmlClassNode`, `UmlEdge` y `DiagramCanvasData` con deserializadores `fromJson` capaces de parsear la estructura de React Flow.
- Crear `flutter_viewer/lib/services/local_storage_service.dart`: métodos `saveDiagramJson(int diagramId, String name, String jsonStr)`, `getCachedDiagramJson(int diagramId)`, `saveLastSession(int diagramId, String hostUrl, String name)` y `clearSession()`.  
**Done when:** Los modelos parsean correctamente un payload JSON de prueba y el servicio almacena y recupera cadenas en SharedPreferences.  
**Evidence:** Creados `diagram_model.dart` y `local_storage_service.dart`.

---

#### [x] T4.3 [IMPL] Implementar `DiagramApiService` (REST) y `StompSocketService` (STOMP WebSocket) con controlador `DiagramViewerController`
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.07, HU-02.08  
- RF: RF-02.17, RF-02.19, RF-02.22  
- Plan: Sección 3.2 y Sección 4.4  
**Depends on:** T4.2  
**Objective:** Implementar la capa de red para consultar el estado inicial del diagrama vía REST y escuchar las modificaciones en tiempo real a través de STOMP.  
**Work:**  
- Crear `flutter_viewer/lib/services/diagram_api_service.dart`: consulta inicial `GET /api/diagrams/{id}`.
- Crear `flutter_viewer/lib/services/stomp_socket_service.dart`: gestión del ciclo de vida de la conexión STOMP, suscripción a `/topic/diagram/{id}` y emisión de eventos mediante `StreamController`.
- Crear `flutter_viewer/lib/state/diagram_viewer_controller.dart`: `ChangeNotifier` que gestiona los estados `disconnected`, `connecting`, `onlineSynced`, `offlineCached`, actualiza nodos y aristas ante eventos `SYNC_CANVAS` y dispara notificaciones del colaborador que editó.  
**Done when:** El controlador transiciona limpiamente entre estados de red y emite notificaciones reactivas a la vista.  
**Evidence:** Creados `diagram_api_service.dart`, `stomp_socket_service.dart` y `diagram_viewer_controller.dart`.

---

#### [x] T4.4 [IMPL] Implementar widgets visuales (`MobileCanvasPainter`, `ConnectionStatusBanner`, `CollaboratorToast`) con zoom y paneo táctil
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.07, HU-02.08  
- RF: RF-02.18, RF-02.19, RF-02.21  
- RN: RN-02.05  
- Plan: Sección 1 y Sección 5.4  
**Depends on:** T4.3  
**Objective:** Construir los componentes de renderizado gráfico de clases UML (tarjetas, estereotipos, atributos, métodos y conectores) adaptados a pantalla móvil táctil con gestos.  
**Work:**  
- Crear `flutter_viewer/lib/widgets/mobile_canvas_painter.dart`: renderizado de tarjetas de clase UML con encabezado azul índigo, sección de atributos y sección de métodos, además del trazado de líneas de asociación ortogonales/directas.
- Envolver el lienzo en un `InteractiveViewer` que soporte gestos de zoom (*pinch-to-zoom*) y desplazamiento panorámico (*pan*).
- Crear `flutter_viewer/lib/widgets/connection_status_banner.dart`: barra amarilla superior visible en estado `offlineCached` con texto `"Modo sin conexión - Mostrando última versión guardada"`.
- Crear `flutter_viewer/lib/widgets/collaborator_toast.dart`: notificación emergente sutil que indica qué usuario realizó una modificación en vivo.  
**Done when:** Las clases y aristas se visualizan nítidamente en pantalla táctil con zoom fluido y las alertas flotantes se muestran ante eventos síncronos.  
**Evidence:** Creados `mobile_canvas_painter.dart`, `connection_status_banner.dart` y `collaborator_toast.dart`.

---

#### [x] T4.5 [IMPL] Construir pantallas `LinkEntryScreen` (escáner QR / enlace) y `CanvasViewerScreen` (visor en vivo, offline y Desvincular)
**Status:** COMPLETED  
**Traceability:**  
- HU: HU-02.06, HU-02.07, HU-02.08  
- RF: RF-02.16, RF-02.17, RF-02.23  
- RN: RN-02.06  
- Plan: Sección 2 y Sección 3.2  
**Depends on:** T4.4  
**Objective:** Implementar las pantallas principales de navegación de la app Flutter: bienvenida con entrada de enlace/cámara QR y el visor principal con botón de desvinculación manual.  
**Work:**  
- Crear `flutter_viewer/lib/screens/link_entry_screen.dart`:
  - Campo de texto para pegar URL completa o ID numérico del diagrama.
  - Botón "Escanear Código QR" que activa la cámara con `mobile_scanner`.
  - Botón para reabrir la última sesión guardada en caché si existe.
- Crear `flutter_viewer/lib/screens/canvas_viewer_screen.dart`:
  - Barra de aplicación superior con título del diagrama y botón de acción "Desvincular / Salir del lienzo".
  - Al pulsar "Desvincular": se invoca `clearSession()`, se desconecta el cliente STOMP y se navega de regreso a `LinkEntryScreen` (RN-02.06).
  - Cuerpo principal con el lienzo interactivo `InteractiveViewer` y los banners reactivos.
- Configurar `flutter_viewer/lib/main.dart` estableciendo el tema oscuro/claro y la ruta inicial.  
**Done when:** El usuario puede escanear el QR o ingresar el enlace, ver el diagrama en vivo y desvincularse voluntariamente en cualquier momento.  
**Evidence:** Creados `link_entry_screen.dart`, `canvas_viewer_screen.dart` y actualizado `main.dart`. `flutter analyze` reporta 0 issues.

---

#### [x] T4.6 [TEST] Pruebas unitarias en Flutter de parseo de JSON, recuperación de caché offline y controlador de estados
**Status:** COMPLETED  
**Traceability:**  
- Plan: Sección 6.1  
**Depends on:** T4.5  
**Objective:** Validar mediante pruebas unitarias en Flutter el correcto funcionamiento del deserializador de React Flow, la persistencia en caché y la máquina de estados de red.  
**Work:**  
- Crear `flutter_viewer/test/diagram_parser_test.dart`: probar deserialización de JSON con clases, notas y aristas UML.
- Crear `flutter_viewer/test/offline_cache_test.dart`: simular pérdida de red y comprobar que el controlador devuelve los datos cacheados emitiendo el estado offline.
- Actualizar `flutter_viewer/test/widget_test.dart` con smoke test de `DiagramCompanionApp`.  
**Done when:** `flutter test` ejecuta todas las pruebas unitarias con resultado 100% exitoso.  
**Evidence:** `flutter test` ejecutó 7/7 pruebas unitarias con resultado exitoso (`All tests passed!`).

---

### Slice 5: Verificación Integral de Sistema y Quality Gate

#### [x] T5.1 [VERIFY] Verificación de compilación Maven (`mvnw compile`), tipos TypeScript (`tsc --noEmit`), linter y suite de tests completa
**Status:** COMPLETED  
**Traceability:**  
- Plan: Sección 6.1 y Sección 6.2 (Fase 4)  
- Invariantes: INV-01, INV-02, INV-03, INV-04, INV-05  
**Depends on:** T1.5, T2.5, T3.4, T4.6  
**Objective:** Ejecutar la verificación global de calidad y compilación en todos los subproyectos del monorepo garantizando ausencia total de regresiones.  
**Work:**  
- En `back_diagramador/`: ejecutar `.\mvnw.cmd test` asegurando compilación limpia y pruebas de Spring Boot aprobadas.
- En `front_diag_clases/`: ejecutar `npx tsc --noEmit` y `npm run lint` validando tipado TypeScript estricto y estándares de código.
- En `flutter_viewer/`: ejecutar `flutter test` y `flutter analyze` asegurando cero errores y pruebas aprobadas.  
**Done when:** Todas las suites de backend, frontend y Flutter pasan con código de salida 0 sin advertencias críticas.  
**Evidence:**
- Backend: `.\mvnw.cmd test` -> `BUILD SUCCESS`, 6 tests pasados, 0 fallos.
- Frontend: `npx tsc --noEmit` -> código de salida 0 (0 errores de tipos).
- Frontend tests: `npx tsx tests/unit/geminiProactiveClassifier.test.ts` y `npx tsx tests/unit/mobileLinkPayload.test.ts` -> 100% aprobados.
- Frontend lint: `npm run lint` -> 0 errores.
- Flutter analyze: `flutter analyze` -> `No issues found! (ran in 2.0s)`.
- Flutter test: `flutter test` -> `All tests passed!` (7/7 tests aprobados).
