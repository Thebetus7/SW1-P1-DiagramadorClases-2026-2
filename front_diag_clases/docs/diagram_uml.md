# Especificación Técnica del Diagramador de Clases UML 2.5

Este documento describe la especificación y capacidades de los componentes UML 2.5 implementados en el lienzo interactivo del sistema.

---

## 1. Componentes UML Disponibles en el Lienzo

### A. Clase UML (`UmlClassNode`)
Representa una entidad u objeto dentro del modelo del sistema con la estructura clásica de 3 compartimentos de la especificación UML 2.5:

1. **Cabecera (Header)**:
   - **Nombre de la Clase**: Texto editable (ej. `Usuario`, `Diagrama`, `Colaborador`).
   - **Estereotipo (Opcional)**: Indicador de tipo especial como `<<interface>>`, `<<abstract>>` o `<<entity>>`.

2. **Compartimento de Atributos**:
   - Soporta lista dinámica de atributos con notación estándar de visibilidad:
     - `+` : Público (`public`)
     - `-` : Privado (`private`)
     - `#` : Protegido (`protected`)
     - `~` : Paquete (`package`)
   - Formato estándar: `[visibilidad] [nombre]: [tipo]` (ej. `- correo: string`, `+ id: int`).
   - Acciones: Agregar atributo, modificar texto, eliminar atributo.

3. **Compartimento de Operaciones / Métodos**:
   - Soporta lista dinámica de métodos con notación de visibilidad y argumentos:
     - Formato estándar: `[visibilidad] [nombre]([parámetros]): [tipoRetorno]` (ej. `+ login(): boolean`, `+ softdelete(): void`).
     - Acciones: Agregar método, modificar firma, eliminar método.

4. **Puertos de Conexión (Handles)**:
   - 4 puntos magnéticos de conexión ubicados en los bordes **Superior (Top)**, **Inferior (Bottom)**, **Izquierdo (Left)** y **Derecho (Right)** para conectar relaciones con otras clases o notas.

---

### B. Nota UML (`UmlNoteNode`)
Representa un comentario, aclaración o regla de negocio dentro del diagrama:
- Estilo visual de nota adhesiva con esquina doblada característica de UML.
- Contenido de texto multilínea editable.
- Puerto de conexión para enlazar la nota a cualquier clase mediante una línea de dependencia punteada.

---

### C. Conexiones y Relaciones UML Soportadas
El lienzo permite establecer los siguientes tipos de aristas/relaciones:

| Tipo de Relación | Representación Visual | Significado |
| :--- | :--- | :--- |
| **Asociación Simple** | Línea sólida continua | Conexión general entre dos clases |
| **Asociación Dirigida** | Línea sólida con flecha abierta (`-->`) | Navegabilidad unidireccional |
| **Herencia / Generalización**| Línea sólida con triángulo hueco cerrado (`--▷`) | Relación de subclase / superclase |
| **Agregación** | Línea sólida con rombo hueco (`--◇`) | Relación "todo-parte" débil (independiente) |
| **Composición** | Línea sólida con rombo relleno (`--◆`) | Relación "todo-parte" fuerte (dependencia del ciclo de vida) |
| **Dependencia** | Línea discontinua / punteada con flecha abierta (`..>`) | Uso o referencia temporal |

---

## 2. Interactividad del Lienzo (Canvas)

- **Manipulación con el Mouse**:
  - Arrastrar y soltar nodos (*Drag & Drop*) para reorganizar el diagrama.
  - Selección individual y múltiple con cuadro de selección.
  - Conexión intuitiva haciendo clic y arrastrando desde cualquier puerto (*Handle*) hacia otro.
- **Navegación**:
  - Zoom interactivo (rueda del mouse o botones de control +/-).
  - Paneo / desplazamiento libre por el lienzo (*Pan*).
  - Ajuste de vista al contenido (*Fit View*).
  - Cuadrícula de fondo (*Grid*) personalizable.

---

## 3. Funcionalidades Colaborativas y de Sesión

- **Identificación de Roles**:
  - **👑 Creador / Propietario**: Usuario que generó el diagrama; cuenta con permisos completos de edición, eliminación e invitación.
  - **👥 Colaborador**: Usuario invitado al diagrama con capacidad de edición colaborativa en tiempo real.
- **Presencia en Tiempo Real**:
  - Barra de colaboradores conectados con avatares, nombres e indicadores de estado en vivo.
- **Sincronización WebSocket (STOMP)**:
  - Difusión instantánea de adición, movimiento, modificación o eliminación de clases y relaciones a todos los clientes conectados a la sala del diagrama (`/topic/diagrams/{id}`).
