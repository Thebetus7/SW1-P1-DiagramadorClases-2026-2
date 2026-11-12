# Specification: Chat IA con Edición Multimodal de Diagramas e Inserción de Imágenes

> **Estado:** APPROVED  
> **Módulo:** 07-chat-ia-edicion-multimodal-imagenes  
> **Metodología:** SDD-Spec-Clarify  

---

## 1. Objetivo y Alcance

### 1.1 Objetivo de Negocio
Potenciar el asistente inteligente Copilot UML dotándolo de capacidades multimodales nativas en la interfaz conversacional, permitiendo que los usuarios adjunten imágenes (capturas de diagramas en Enterprise Architect, fotos de pizarras o bocetos manuscritos) directamente dentro del panel de chat (`CanvasCopilotDrawer`). Esta capacidad amplía el contexto de razonamiento de la IA para realizar consultas técnicas detalladas (Modo CHAT) y generar propuestas atómicas de edición y mutación del lienzo (Modo EDITOR) mediante fusión contextual inteligente (*MERGE*), almacenando las imágenes optimizadas en formato JPG dentro de los activos del proyecto para garantizar alta eficiencia y mínimo consumo de ancho de banda.

### 1.2 In-Scope
1. **Control de Inserción de Imágenes en el Chat (`CanvasCopilotDrawer`):**
   - Incorporación de un botón interactivo de adjuntar imagen (ícono de imagen / cámara) en la barra inferior de entrada de texto del chat, junto a los controles de voz y envío.
   - Soporte para selección de archivo desde el explorador del sistema operativo y pegado directo desde el portapapeles (*clipboard paste* vía `Ctrl+V`).
   - Área de previsualización (*thumbnail chip*) con vista previa de la imagen seleccionada y botón de descarte (`X`) antes de enviar el mensaje.
2. **Optimización y Compresión en Cliente (Client-Side Compression):**
   - Procesamiento previo obligatorio en el frontend mediante Canvas API que redimensiona y comprime la imagen a formato **JPG** optimizado (resolución máxima de 1280px y calidad ~0.80), reduciendo el peso de archivos pesados (de varios megabytes a ~150KB - 350KB) antes de su transmisión.
3. **Persistencia de la Imagen en los Activos del Proyecto:**
   - Envío y almacenamiento de la imagen optimizada asociada al proyecto/diagrama en el servidor (directorio de activos de diagrama `/uploads/diagrams/{id}/` o almacenamiento de objetos compatible con MinIO/S3 ya contemplado en la arquitectura).
   - Generación de una URL accesible para que todos los colaboradores puedan visualizar el archivo adjunto.
4. **Visualización Colaborativa en el Historial de Mensajes:**
   - Renderizado de una miniatura interactiva de la imagen en la burbuja del mensaje del usuario que la envió.
   - Capacidad para hacer clic y expandir la imagen en un modal de visualización en alta resolución para cualquier colaborador conectado a la sala.
5. **Comportamiento Diferenciado por Modo:**
   - **Modo CHAT (Consultivo / Explicativo):**
     - La IA recibe la imagen en conjunto con el prompt textual y el estado serializado del lienzo actual.
     - Responde de forma técnica y conversacional en Markdown sin generar mutaciones en el diagrama.
   - **Modo EDITOR (Mutación y Co-Diseño Asistido):**
     - **Fusión Contextual Inteligente (MERGE por defecto):** La IA analiza la imagen y el diagrama actual, preservando la totalidad de las clases y relaciones preexistentes, y deduciendo únicamente las clases, atributos, métodos y asociaciones nuevas o corregidas que aparecen en la imagen.
     - Generación de una propuesta formal (`EDITOR_PROPOSAL`) en estado `PENDING` con resumen explicativo y los deltas estructurados (`nodesDelta` y `edgesDelta`).
     - Cálculo de coordenadas relativas para que los nuevos nodos no se superpongan directamente encima de las clases existentes.
6. **Ciclo de Vida de la Propuesta de Edición:**
   - Cualquier usuario con permisos de edición (`CREADOR` o `COLABORADOR`) puede pulsar el botón **Aceptar Propuesta** para aplicar atómicamente la mutación sobre el lienzo.
   - Al aceptarse, se emite el evento de sincronización en tiempo real vía WebSocket (`SYNC_CANVAS`) difundiendo los cambios a todos los clientes conectados.
   - Si se descarta, la propuesta pasa a estado `IGNORED` sin tocar el lienzo.

### 1.3 Out-of-Scope
- Procesamiento OCR en el cliente sin conexión (se delega el reconocimiento multimodal a la API de Google Gemini Vision en la nube).
- Conversión de diagramas de secuencia o casos de uso (el alcance está estrictamente delimitado a diagramas de clases UML 2.5).

---

## 2. Actores y Autorización

- **👑 Creador / Propietario (`CREADOR`)**:
  - Puede adjuntar imágenes en Modo CHAT o Modo EDITOR.
  - Puede aceptar o rechazar propuestas de mutación generadas a partir de imágenes.
- **👥 Colaborador (`COLABORADOR`)**:
  - Puede adjuntar imágenes al chat colaborativo del diagrama.
  - Visualiza las miniaturas de imágenes enviadas por otros participantes.
  - Puede aceptar o rechazar propuestas generadas en Modo EDITOR si tiene permisos activos sobre el lienzo.
- **👁️ Visor / Visitante**:
  - Solo lectura; no puede emitir mensajes con imágenes ni aplicar propuestas.

---

## 3. Modelo Funcional de Datos y Reglas de Negocio Específicas

### 3.1 Datos Conceptuales del Mensaje Multimodal
- **Extensión de `ChatMessage`**:
  - `imageUrl`: URL accesible de la imagen JPG guardada en el proyecto.
  - `attachmentMimeType`: Tipo MIME normalizado (`image/jpeg`).
  - `attachmentThumbnail`: Cadena optimizada o enlace para la miniatura en chat.
- **Extensión de `ChatProposalPayload`**:
  - `sourceImageId`: Identificador o ruta de la imagen que dio origen a la propuesta de edición.
  - `mergeStrategy`: Estrategia aplicada (`MERGE` por defecto).

### 3.2 Reglas de Negocio (RB)
- `RB-07.1 - Compresión Obligatoria a JPG`: Toda imagen seleccionada o pegada en el chat debe ser convertida y optimizada a formato JPG en el cliente antes de ser enviada al servidor o a la API de Gemini.
- `RB-07.2 - Límite de Dimensión Máxima`: La resolución de la imagen comprimida no debe exceder 1280 píxeles en su lado más largo, preservando la relación de aspecto original para no saturar memoria.
- `RB-07.3 - Persistencia en el Proyecto`: La imagen debe archivarse vinculada al identificador del diagrama (`diagramId`) para que perdure en la sesión histórica de colaboración.
- `RB-07.4 - Preservación de Clases Existentes (MERGE)`: En Modo EDITOR, la IA tiene prohibido eliminar nodos o aristas existentes en el lienzo salvo que el usuario lo solicite de manera taxativa mediante comandos explícitos como *"reemplaza todo el diagrama"* o *"borra las clases anteriores"*.
- `RB-07.5 - Prevención de Solapamiento Espacial`: Los nodos propuestos a partir de una imagen deben posicionarse automáticamente en áreas adyacentes libres del lienzo (desplazamiento en eje X o Y respecto al bounding box actual).
- `RB-07.6 - Integridad de la Propuesta`: Las propuestas de edición derivadas de imágenes no aplican cambios al lienzo hasta que un usuario autenticado haga clic explícito en `Aceptar Propuesta`.

---

## 4. Requerimientos Funcionales (Patrón EARS)

- `HU-07.1`: Como desarrollador que usa el diagrama, quiero adjuntar una captura o boceto en el chat de IA para que la herramienta entienda visualmente las clases que deseo modelar.
  - `RF-07.1.1`: **Ubiquitous:** El sistema deberá incluir un botón de adjuntar imagen y soporte de pegado directo desde el portapapeles en el panel del chat (`CanvasCopilotDrawer`).
  - `RF-07.1.2`: **Event-Driven:** Cuando el usuario seleccione o pegue una imagen, el sistema deberá comprimirla automáticamente a formato JPG ligero (máx. 1280px) y mostrar una miniatura previa con botón de eliminación.
  - `RF-07.1.3`: **Event-Driven:** Cuando el mensaje sea enviado, el sistema deberá persistir la imagen en los activos del proyecto y propagar el mensaje con la miniatura visible a todos los colaboradores en la sala.

- `HU-07.2`: Como desarrollador en Modo EDITOR, quiero que la IA extraiga los elementos de la imagen y me proponga agregarlos al diagrama sin borrar lo que ya tengo hecho.
  - `RF-07.2.1`: **Event-Driven:** Cuando se envíe una imagen con el chat en Modo EDITOR, el sistema deberá invocar el modelo Gemini Vision con la instrucción del usuario y el estado del lienzo, aplicando una estrategia de fusión (`MERGE`).
  - `RF-07.2.2`: **Ubiquitous:** El sistema deberá estructurar la respuesta en una tarjeta `EDITOR_PROPOSAL` en estado `PENDING`, detallando las clases y relaciones agregadas o modificadas.
  - `RF-07.2.3`: **Event-Driven:** Cuando un usuario con permisos pulse `Aceptar Propuesta`, el sistema deberá inyectar las nuevas clases en el lienzo sin solaparlas y emitir un evento `SYNC_CANVAS` a través del WebSocket.

- `HU-07.3`: Como desarrollador en Modo CHAT, quiero hacerle preguntas técnicas a la IA sobre un diagrama en imagen para resolver dudas de modelado sin alterar el lienzo.
  - `RF-07.3.1`: **Event-Driven:** Cuando se envíe una imagen con el chat en Modo CHAT, el sistema deberá interpretar la imagen y emitir una respuesta conversacional explicativa en Markdown sin generar propuestas de mutación.

---

## 5. Comportamiento Observable y Criterios de Aceptación (Gherkin)

### Escenario 1: Adjuntar y Enviar Imagen en Modo EDITOR con Fusión Exitosa (Happy Path)
```gherkin
Given que el usuario está en el lienzo con 2 clases existentes ("Usuario" y "Rol")
And tiene abierto el panel "CanvasCopilotDrawer" en Modo "EDITOR"
When adjunta una imagen de un boceto que contiene la clase "Permiso" y escribe "agrega este módulo"
Then el frontend comprime la imagen a formato JPG
And se muestra un mensaje en el chat con la miniatura de la imagen
And la IA genera un mensaje de tipo "EDITOR_PROPOSAL" con status "PENDING"
And la propuesta contiene las 2 clases existentes más la nueva clase "Permiso" con sus atributos
And ninguna clase previa es eliminada
```

### Escenario 2: Aceptación de la Propuesta e Impacto en el Lienzo Colaborativo
```gherkin
Given que existe una propuesta "EDITOR_PROPOSAL" en estado "PENDING" en el chat
When el usuario hace clic en el botón "Aceptar Propuesta"
Then el lienzo agrega la clase "Permiso" con sus conexiones correspondientes
And las nuevas clases se resaltan visualmente para confirmar su incorporación
And se difunde la actualización a todos los colaboradores mediante el WebSocket
And la tarjeta en el chat pasa a estado "ACCEPTED" con el nombre del usuario que la aprobó
```

### Escenario 3: Consulta Multimodal en Modo CHAT (Sin Mutación)
```gherkin
Given que el usuario tiene el chat configurado en Modo "CHAT"
When adjunta una imagen de un patrón de diseño y pregunta "¿Es adecuado este patrón para mi diagrama?"
Then la IA responde con un análisis técnico en Markdown explicando los pros y contras
And no se genera ninguna propuesta de edición ("EDITOR_PROPOSAL")
And el estado del lienzo permanece completamente inalterado
```

### Escenario 4: Manejo de Archivos Inválidos o Dañados
```gherkin
Given que el usuario intenta adjuntar un archivo que no es una imagen válida (ej. archivo .exe o .pdf)
When el usuario suelta el archivo o lo selecciona en el diálogo
Then el sistema rechaza el archivo mostrando una alerta no intrusiva "Formato no compatible. Por favor sube una imagen válida (PNG, JPG, WebP)"
And la barra de entrada de texto no se bloquea
```

---

## 6. Efectos Secundarios e Integraciones

* **Consumo de Ancho de Banda y Broker STOMP**: La compresión obligatoria previa a JPG garantiza que los mensajes transmitidos por WebSockets contengan un peso mínimo o solo referencias de URL, previniendo desconexiones por saturación de trama.
* **Integración con Persistencia No Relacional (DynamoDB)**: Los registros de chat en DynamoDB incorporan el atributo `imageUrl` sin romper la compatibilidad con mensajes históricos de texto puro.

