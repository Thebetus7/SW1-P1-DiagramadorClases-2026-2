# Specification: Rediseño Visual del Lienzo estilo Enterprise Architect y Conformidad UML 2.5 (Web y App Móvil)

> **Estado:** APPROVED  
> **Módulo:** 06-redisenio-lienzo-enterprise-architect  
> **Metodología:** SDD-Spec-Clarify  

---

## 1. Objetivo y Alcance

### 1.1 Objetivo de Negocio
Alinear la identidad gráfica del lienzo y de los elementos de modelado tanto en la plataforma web (Next.js / React Flow) como en la aplicación móvil de visualización y co-diseño (Flutter Viewer) con el estándar de facto de la industria establecido por **Sparx Systems Enterprise Architect (EA)** y la especificación formal **UML 2.5**. Se sustituye el aspecto informal contemporáneo de bordes curvos y esquinas redondeadas por una representación rigurosa, nítida y geométrica de clasificadores ortogonales (esquinas cuadradas vivas de 90°, líneas divisorias de compartimentos de extremo a extremo, tipografía formal, notas con pliegue técnico, soporte móvil para notas y clases-asociación, y aristas con quiebres en ángulo recto). Esta homologación integral garantiza paridad funcional y visual absoluta entre el entorno de escritorio y los dispositivos móviles sin alterar los contratos de almacenamiento JSON ni la interoperabilidad XMI.

### 1.2 In-Scope

#### 1.2.1 Lienzo Web (`front_diag_clases/`)
1. **Rediseño Geométrico y Visual de Clases UML (`UmlClassNode`):**
   - Eliminación total de bordes redondeados (`rounded-none` en el contenedor principal, la cabecera y los compartimentos inferiores).
   - Estructuración de esquinas vivas ortogonales de 90° idénticas a Enterprise Architect.
   - Borde perimetral sólido fino de 1px con paleta sobria clásica (fondo blanco `#FFFFFF` / marfil técnico `#FAFAFA`, cabecera sobria `#F1F5F9` y bordes oscuros `#334155`).
   - Líneas divisorias horizontales continuas de 1px que tocan de extremo a extremo los bordes del clasificador entre cabecera, compartimento de atributos y compartimento de operaciones.
   - Anclajes de conexión perimetrales adaptativos discretos que se integran en el perímetro del rectángulo sin romper la estética de clasificador.
2. **Conformidad Semántica y Tipográfica con UML 2.5:**
   - Visualización estandarizada de estereotipos formales (`«interface»`, `«abstract»`, `«enumeration»`, `«entity»`) utilizando guillemets tipográficos dobles angulares (`« »`).
   - Renderizado en **cursiva (*italics*)** del nombre de la clase cuando el clasificador sea abstracto (`isAbstract` o estereotipo `«abstract»`), respetando la regla notacional mandatoria de UML 2.5.
   - Formato formal estricto para atributos (`[visibilidad] [nombre]: [tipo]`) y métodos (`[visibilidad] [nombre]([parámetros]): [tipo_retorno]`).
   - Normalización de símbolos de visibilidad UML: `+` (public), `-` (private), `#` (protected), `~` (package/internal).
3. **Rediseño de Notas UML (`UmlNoteNode`):**
   - Geometría de nota clásica estilo Enterprise Architect con pliegue doblado en la esquina superior derecha (*dog-ear fold*), fondo amarillo claro suave clásico (`#FFFFE6` / `#FEFCE8`) y borde sutil continuo.
4. **Ortogonalidad Rigurosa en Aristas y Relaciones (`UmlEdge` / `UmlFloatingEdge`):**
   - Erradicación de curvaturas en los codos de las aristas (`borderRadius: 0` en `getSmoothStepPath`).
   - Quiebres limpios y directos en ángulo recto a 90° para trazos escalonados y líneas directas ortogonales perimetrales.
   - Preservación íntegra de todos los marcadores UML 2.5 (triángulo hueco de generalización/realización, rombo hueco de agregación, rombo relleno de composición, flecha abierta de asociación dirigida y línea punteada para dependencias y clases-asociación).

#### 1.2.2 Aplicación Móvil Companion (`flutter_viewer/`)
1. **Rediseño Geométrico estilo Enterprise Architect en Flutter (`UmlClassCard`):**
   - Sustitución de `BorderRadius.circular(8)` por esquinas estrictamente cuadradas vivas (`BorderRadius.zero`).
   - Cabecera y compartimentos con divisiones rectangulares ortogonales sin curvaturas internas ni externas.
   - Renderizado del nombre en cursiva (*italic*) para clases abstractas o con estereotipo `«abstract»`.
   - Borde exterior sólido de 1px (Slate 700 / Slate 400) y fondo blanco limpio.
2. **Soporte y Renderizado de Notas UML Móviles (`UmlNoteCard`):**
   - Actualización del modelo de datos (`DiagramCanvasData` / `UmlNode`) para discriminar entre nodos de tipo clase (`umlClass`) y notas explicativas (`umlNote`).
   - Renderizado de notas en Flutter con fondo amarillo pastel suave (`#FFFFE6`), borde fino y pliegue técnico superior derecho (*dog-ear painter*).
3. **Soporte Móvil para Clases-Asociación y Aristas Perimetrales Completas:**
   - Reconocimiento de aristas con `isAssociationClass: true` y trazado punteado hacia el nodo intermedio o conector correspondiente.
   - Preservación de marcadores UML 2.5 en Flutter (triángulos, rombos, flechas y textos de multiplicidad).
4. **Hoja Modal de Inspección Táctil de Clases (`ClassDetailBottomSheet`):**
   - Al tocar (*tap*) cualquier tarjeta de clase en el visor móvil, despliegue de una hoja inferior (*Modal BottomSheet*) con la ficha técnica detallada: nombre completo, estereotipo, lista expandida de atributos tipados, lista de métodos con parámetros y tipos de retorno, y relaciones conectadas.

### 1.3 Out-of-Scope
- Edición directa de texto mediante teclado en la app móvil (la app móvil actúa como visor síncrono companion y receptor de sugerencias/notificaciones; la edición estructural se realiza en la web o mediante Copilot IA).
- Cambios en el esquema de base de datos relacional de PostgreSQL ni en la estructura de endpoints REST.
- Reemplazo de librerías base de renderizado (`@xyflow/react` en web, `CustomPainter` / `InteractiveViewer` en Flutter).

---

## 2. Actores y Autorización

- **👑 Creador / Propietario (`CREADOR`)**:
  - Puede crear, mover, redimensionar y configurar clases, relaciones y notas, observando la representación formal de Enterprise Architect en escritorio y en el visor móvil.
- **👥 Colaborador (`COLABORADOR`)**:
  - Visualiza y edita de forma idéntica y síncrona el nuevo diseño geométrico formal en tiempo real en la web, e interactúa con el visor móvil para inspección táctil.
- **👁️ Visor Móvil / Visitante**:
  - Accede al lienzo desde su dispositivo móvil mediante enlace QR o token de sala, navega por el espacio delimitado de 5000x5000 px, observa las clases ortogonales y abre la hoja de inspección detallada.

---

## 3. Modelo Funcional de Datos y Reglas de Negocio Específicas

### 3.1 Datos Conceptuales
- **Clasificador UML (`UmlClassNode` en Web y Flutter)**:
  - `id`: Identificador unívoco del nodo.
  - `name`: Nombre de la clase. En clases abstractas se renderiza en cursiva.
  - `stereotype`: Cadena opcional formateada visualmente entre guillemets `« »`.
  - `attributes`: Colección de atributos normalizados con visibilidad, nombre y tipo.
  - `methods`: Colección de métodos normalizados con visibilidad, nombre, parámetros y retorno.
  - `isAbstract`: Propiedad conceptual (derivada de stereotype `«abstract»` o `isAbstract: true`).
- **Nota UML (`UmlNoteNode` / `UmlNoteCard`)**:
  - `id`: Identificador del nodo de nota.
  - `content`: Texto multilínea explicativo o regla de negocio.
  - `type`: Discrimina `"umlNote"` de `"umlClass"`.
- **Relación UML (`UmlEdge`)**:
  - `relationType`: Tipo de relación formal.
  - `isAssociationClass`: Booleano que indica vinculación con clase-asociación.
  - `edgeGeometry`: Trazo ortogonal con curvatura de radio 0 en web y trazado directo perimetral adaptativo en móvil.

### 3.2 Reglas de Negocio (RB)
- `RB-06.1 - Geometría Ortogonal Estricta en Web y Móvil`: Todo clasificador tipo clase, interfaz o entidad tanto en React Flow como en Flutter debe dibujarse sin ningún tipo de borde redondeado (`border-radius: 0px` en web, `BorderRadius.zero` en Flutter).
- `RB-06.2 - Separación Continua de Compartimentos`: La cabecera, el compartimento de atributos y el compartimento de métodos deben estar delimitados por líneas divisorias horizontales continuas de 1px que toquen exactamente los bordes laterales del clasificador.
- `RB-06.3 - Cursiva para Clasificadores Abstractos`: Cuando un clasificador posea el estereotipo `«abstract»` o esté marcado como abstracto, el texto de su nombre debe renderizarse obligatoriamente en tipografía *italic* según dicta la especificación UML 2.5 en ambas plataformas.
- `RB-06.4 - Tipografía y Guillemets`: Los estereotipos deben presentarse invariablemente con el formato `«NombreEstereotipo»`. Si el usuario o el JSON contiene caracteres `<` y `>`, deben normalizarse visualmente a guillemets tipográficos `« »`.
- `RB-06.5 - Aristas sin Curvas en Codos`: Las aristas de conexión en la plataforma web deben trazar quiebres ortogonales de 90° con radio de curvatura exactamente igual a 0 (`borderRadius: 0`), emulando las rutas de conexión técnica de Enterprise Architect.
- `RB-06.6 - Notas Técnicas con Pliegue Dog-Ear en Web y Móvil`: Los nodos de notas UML deben renderizarse con un triángulo de esquina doblada en el vértice superior derecho tanto en la versión web como en la versión móvil de Flutter.
- `RB-06.7 - Discriminación de Nodos en Móvil`: La aplicación Flutter no debe tratar los nodos `umlNote` como si fueran clases; debe parsearlos en su propio modelo visual y desplegarlos como tarjetas de notas.
- `RB-06.8 - Inspección Táctil Móvil`: Al presionar cualquier tarjeta de clase en Flutter, debe abrirse una hoja modal inferior (*BottomSheet*) con la descripción integral de sus atributos y métodos, facilitando la legibilidad en pantallas compactas sin depender del zoom manual.

---

## 4. Requerimientos Funcionales (Patrón EARS)

### 4.1 Requerimientos Plataforma Web (`front_diag_clases/`)
- `HU-06.1`: Como modelador de software, quiero que las clases del lienzo web tengan esquinas rectas y compartimentos rectangulares idénticos a Enterprise Architect.
  - `RF-06.1.1`: **Ubiquitous:** El sistema web deberá renderizar todos los nodos de clase con esquinas cuadradas vivas de 90° (`border-radius: 0px`) y líneas divisorias horizontales de 1px entre compartimentos.
  - `RF-06.1.2`: **Event-Driven:** Cuando una clase tenga el estereotipo `«abstract»` o esté definida como abstracta, el sistema deberá renderizar el nombre de dicha clase con estilo tipográfico en cursiva (*italic*).
  - `RF-06.1.3`: **Event-Driven:** Cuando se renderice un estereotipo en la cabecera de la clase, el sistema deberá envolverlo automáticamente entre caracteres guillemets `« »`.

- `HU-06.2`: Como modelador de software, quiero que las relaciones y aristas en el lienzo web tengan quiebres ortogonales rectos sin esquinas redondeadas.
  - `RF-06.2.1`: **Ubiquitous:** El sistema web deberá renderizar los caminos de las aristas ortogonales con radio de curvatura de 0 píxeles (`borderRadius: 0`).
  - `RF-06.2.2`: **Ubiquitous:** El sistema deberá conservar la totalidad de los marcadores UML 2.5 existentes (triángulos, rombos y flechas) y las etiquetas de multiplicidad en los extremos de las aristas.

- `HU-06.3`: Como modelador de software, quiero que las notas del lienzo web reflejen la forma de nota técnica con pliegue de Enterprise Architect.
  - `RF-06.3.1`: **Ubiquitous:** El sistema web deberá presentar los nodos de nota con un pliegue visible en la esquina superior derecha y fondo amarillo suave técnico.

### 4.2 Requerimientos Aplicación Móvil Companion (`flutter_viewer/`)
- `HU-06.4`: Como usuario del visor móvil, quiero que las clases en Flutter tengan la misma estética ortogonal de Enterprise Architect que la versión web.
  - `RF-06.4.1`: **Ubiquitous:** La app móvil Flutter deberá renderizar `UmlClassCard` con esquinas estrictamente rectas (`BorderRadius.zero`) y bordes sólidos de 1px.
  - `RF-06.4.2`: **Event-Driven:** Cuando una clase sea abstracta, la app móvil deberá mostrar el texto del nombre con `fontStyle: FontStyle.italic`.

- `HU-06.5`: Como usuario del visor móvil, quiero que las notas UML del lienzo se muestren correctamente en mi teléfono para no perder aclaraciones de modelado.
  - `RF-06.5.1`: **Event-Driven:** Cuando el JSON del lienzo contenga nodos de tipo `umlNote`, la app móvil deberá instanciarlos mediante `UmlNoteCard` con fondo amarillo pastel y pliegue técnico superior derecho.

- `HU-06.6`: Como usuario del visor móvil, quiero tocar una clase para ver todos sus atributos y métodos en detalle sin lidiar con texto pequeño.
  - `RF-06.6.1`: **Event-Driven:** Cuando el usuario presione una tarjeta de clase en el visor móvil, el sistema deberá desplegar un `ModalBottomSheet` con el detalle completo de visibilidad, nombre, tipos y operaciones de dicha clase.

- `HU-06.7`: Como usuario del visor móvil, quiero que las clases-asociación se visualicen conectadas con fidelidad UML 2.5.
  - `RF-06.7.1`: **Ubiquitous:** La app móvil deberá soportar aristas de clase-asociación trazando la línea punteada correspondiente hacia la relación base.

---

## 5. Comportamiento Observable y Criterios de Aceptación (Gherkin)

### Escenario 1: Renderizado de Clase Concreta estilo Enterprise Architect en Web
```gherkin
Given que el usuario abre un diagrama web con una clase concreta llamada "Factura"
When el lienzo grafica el componente visual "UmlClassNode" de dicha clase
Then el nodo debe mostrarse como un rectángulo con esquinas cuadradas de 0px de radio
And debe contener una cabecera con el nombre "Factura" en fuente sans-serif negrita
And debe exhibir una línea divisoria continua horizontal de 1px separando la cabecera del compartimento de atributos
And debe exhibir una segunda línea divisoria horizontal continua separando los atributos del compartimento de métodos
```

### Escenario 2: Renderizado de Clase Abstracta con Conformidad UML 2.5 en Web y Móvil
```gherkin
Given que existe una clase con estereotipo "«abstract»" llamada "Vehiculo"
When el usuario visualiza el diagrama en el navegador web o en la app móvil Flutter
Then el nombre "Vehiculo" debe renderizarse obligatoriamente en tipografía cursiva (italic)
And debe mostrar el estereotipo "«abstract»" centrado sobre el nombre
And las esquinas del clasificador deben mantenerse estrictamente cuadradas (sin bordes redondeados) en ambas plataformas
```

### Escenario 3: Trazado Ortogonal de Aristas sin Curvatura en Web
```gherkin
Given que existen dos clases conectadas mediante una relación de "GENERALIZATION"
When el usuario visualiza la conexión en el lienzo web
Then la arista debe trazarse con quiebres en ángulo recto a 90 grados sin esquinas redondeadas (radio de curvatura 0)
And el extremo destino debe portar el marcador de triángulo hueco cerrado conforme a UML 2.5
```

### Escenario 4: Renderizado de Notas UML en el Visor Móvil Flutter
```gherkin
Given que el diagrama contiene un nodo de tipo "umlNote" con el contenido "Regla fiscal 2026"
When el usuario abre el diagrama en la app móvil Flutter
Then la aplicación no debe confundir la nota con una clase vacía
And debe renderizar una tarjeta con fondo amarillo pastel y pliegue técnico en la esquina superior derecha
And debe exhibir el texto completo "Regla fiscal 2026" con desplazamiento vertical si es extenso
```

### Escenario 5: Inspección Táctil de Clase en Móvil mediante BottomSheet
```gherkin
Given que el usuario está visualizando el diagrama en la app móvil Flutter
When toca sobre la tarjeta de la clase "Cliente"
Then se abre inmediatamente una hoja modal inferior (BottomSheet) desde la base de la pantalla
And la hoja exhibe el nombre completo de la clase, su estereotipo, la lista de atributos con sus tipos y visibilidades, y la lista de métodos
And el usuario puede cerrar la hoja deslizando hacia abajo o tocando fuera de ella
```

---

## 6. Efectos Secundarios e Integraciones

* **Compatibilidad de Persistencia**: Cero cambios en la estructura de base de datos (`PostgreSQL`) ni en el formato del campo `lienzo`. El mismo JSON generado por la web es consumido por Flutter.
* **Compatibilidad XMI y Generadores de Código**: Los generadores de código de Spring Boot, Flutter y el exportador XMI operan directamente sobre los clasificadores y aristas existentes, preservando el 100% de la funcionalidad de negocio previa.
