# Constitución De Facto del Sistema

## 1. Misión y Visión del Sistema
El sistema **Diagramador de Clases UML 2.5 Colaborativo en Tiempo Real** es una solución integral orientada a la ingeniería de software y el aprendizaje académico, diseñada para permitir que docentes, estudiantes y desarrolladores modelen diagramas de clases orientados a objetos de forma síncrona en un lienzo web interactivo. Además del modelado visual, el sistema acelera el ciclo de desarrollo mediante la exportación automatizada a código ejecutable en **Spring Boot** y **Flutter**, la interoperabilidad con herramientas CASE tradicionales mediante el estándar **XMI (XML Metadata Interchange)** y la asistencia inteligente para la creación de diagramas a partir de imágenes o texto natural utilizando **Google Gemini**.

---

## 2. Actores y Roles Identificados en el Código

Según los modelos JPA, DTOs y middlewares de frontend/backend, el sistema reconoce los siguientes actores:

1. **👑 Creador / Propietario (`CREADOR`)**:
   - Usuario autenticado que crea un diagrama.
   - Tiene potestad exclusiva para:
     - Realizar el borrado lógico (*soft delete*) del diagrama.
     - Invitar colaboradores por correo electrónico (`/api/diagrams/{id}/invite`).
     - Expulsar o retirar colaboradores del diagrama (`/api/diagrams/{id}/collaborators/{userId}`).
     - Modificar el título y el estado del lienzo.
2. **👥 Colaborador (`COLABORADOR`)**:
   - Usuario autenticado invitado por el creador.
   - Tiene permisos para:
     - Abrir y visualizar el diagrama.
     - Editar nodos, atributos, métodos y relaciones en tiempo real.
     - Emitir eventos de movimiento y presencia vía STOMP WebSockets.
     - Exportar el diagrama a código o estándares externos.
     - Salir voluntariamente de la colaboración del diagrama.
3. **👤 Usuario Autenticado General**:
   - Posee cuenta en la base de datos (`users`).
   - Puede consultar el catálogo de diagramas creados por él o donde participa como colaborador.
   - Puede crear nuevos diagramas donde asumirá el rol de `CREADOR`.
4. **🌐 Visitante / No Autenticado**:
   - Puede acceder a las rutas de `/login` y `/register`.
   - Puede consultar endpoints de diagnóstico (`/api/auth/health`) y la lista rápida de usuarios de prueba (`/api/auth/quick-users`).

---

## 3. Stack Tecnológico y Dependencias Aprobadas

Queda estrictamente prohibido introducir tecnologías o librerías adicionales que dupliquen o reemplacen las siguientes capacidades activas:

### 3.1 Backend
* **Runtime**: Java 17 LTS.
* **Framework**: Spring Boot 4.1.x / 3.x (WebMVC, Data JPA, Security, WebSocket).
* **Motor de Base de Datos**: PostgreSQL 16 (producción/Docker) y H2 Database (desarrollo/testing).
* **Mensajería en Tiempo Real**: Spring WebSocket con subprotocolo STOMP y broker en memoria (`/topic`, `/queue`, prefijo `/app`).
* **Seguridad / Criptografía**: BCryptPasswordEncoder para contraseñas de usuarios.
* **Productividad**: Project Lombok (`@Data`, `@Builder`, `@RequiredArgsConstructor`).

### 3.2 Frontend
* **Runtime / Framework**: Node.js 20+ con Next.js 16 (App Router) y React 19.
* **Lenguaje**: TypeScript 5 con tipado estricto.
* **Motor de Diagramación Visual**: `@xyflow/react` (React Flow v12).
* **Estilos y Diseño**: Tailwind CSS v4 con variables CSS nativas y diseño dark/light responsivo.
* **Comunicación en Tiempo Real**: `@stomp/stompjs` v7 y `sockjs-client`.
* **Utilidades de Archivos y XML**: `jszip` para empaquetado de código y `@xmldom/xmldom` para manipulación de árboles XMI.
* **Inteligencia Artificial**: Google Gemini API (Modelos `gemini-1.5-flash` / `gemini-2.0-flash` vía REST API directo).

### 3.3 Infraestructura y DevOps
* **Contenedores**: Docker y Docker Compose multi-etapa (*multi-stage builds*).
* **Proxy Inverso**: Nginx Alpine para balanceo, terminación de encabezados HTTP/1.1 y multiplexación de WebSockets.
* **Nube**: Plantillas de despliegue modular para AWS EC2 (`DESPLIEGUE_AWS/`).

---

## 4. Invariantes Técnicas y de Entorno

1. **Mapeo de Puertos Oficiales**:
   * **Nginx Reverse Proxy**: Puerto `80` (punto de entrada público único en producción).
   * **Spring Boot Backend**: Puerto `8080` (accesible internamente vía `backend:8080` en la red Docker `diag_network`).
   * **Next.js Frontend**: Puerto `3000` (accesible internamente vía `frontend:3000`).
   * **PostgreSQL**: Puerto `5432` (accesible internamente vía `postgres_db:5432`).
2. **Variables de Entorno Críticas**:
   * `DB_PASSWORD`: Clave de PostgreSQL requerida tanto por el contenedor de base de datos como por Spring Datasource.
   * `SPRING_DATASOURCE_URL`: URL JDBC estándar (`jdbc:postgresql://postgres_db:5432/sw1_diag_clases_2026_2`).
   * `NEXT_PUBLIC_GEMINI_API_KEY`: API Key de Google AI Studio para procesamiento de visión y prompts.
   * `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_WS_URL`: Rutas relativas (`/api`, `/ws`) al pasar por Nginx.
3. **Contrato de Representación del Lienzo (Canvas JSON)**:
   * El estado de un diagrama se serializa en una cadena JSON almacenada en la columna `lienzo` (`TEXT`) de la tabla `diagrams`.
   * Estructura requerida:
     ```json
     {
       "nodes": [
         {
           "id": "node-1",
           "type": "umlClass",
           "position": { "x": 100, "y": 100 },
           "data": {
             "name": "NombreClase",
             "stereotype": "<<interface>> | <<abstract>> | <<entity>> | \"\"",
             "attributes": ["+ id: int", "- nombre: string"],
             "methods": ["+ operacion(): void"]
           }
         },
         {
           "id": "node-2",
           "type": "umlNote",
           "position": { "x": 300, "y": 100 },
           "data": { "content": "Texto de nota descriptiva" }
         }
       ],
       "edges": [
         {
           "id": "edge-1-2",
           "source": "node-1",
           "target": "node-2",
           "data": {
             "relationType": "ASSOCIATION | GENERALIZATION | COMPOSITION | AGGREGATION | DEPENDENCY | DIRECTED_ASSOCIATION | REALIZATION",
             "sourceMultiplicity": "1",
             "targetMultiplicity": "0..*"
           }
         }
       ]
     }
     ```

---

## 5. Principios de Calidad, Persistencia y Concurrencia

1. **Gestión de Transacciones**:
   * Las operaciones de escritura en `DiagramService` y `AuthService` están resguardadas por `@Transactional`.
   * Las consultas de lectura utilizan `@Transactional(readOnly = true)`.
2. **Política de Eliminación (Soft Delete)**:
   * Los diagramas NUNCA se borran físicamente de la base de datos de producción.
   * Se marca `isDeleted = true` y se registra la marca temporal `deletedAt`. Todas las consultas regulares excluyen registros eliminados (`findByIdAndIsDeletedFalse`).
3. **Sincronización en Tiempo Real y Concurrencia**:
   * El servidor Spring actúa como difusor de mensajes STOMP sin retención en memoria innecesaria.
   * Los clientes son responsables de propagar deltas de cambio y reaccionar a eventos de unión (`JOIN`), presencia (`PRESENCE`) y movimiento (`NODE_MOVE`).
4. **Respuestas HTTP Estándar**:
   * Operaciones exitosas de creación devuelven código `201 CREATED`.
   * Peticiones inválidas devuelven `400 BAD REQUEST` con objeto JSON `{"message": "detalle"}`.
   * Entidades no encontradas devuelven `404 NOT FOUND`.
   * Accesos no autorizados devuelven `401 UNAUTHORIZED` o `403 FORBIDDEN`.

---

## 6. Límites Operativos y Deuda Técnica Conocida

1. **Autenticación Basada en Sesión Ligera**:
   * El backend implementa autenticación básica por credenciales y retorno de ID de usuario. No implementa firma criptográfica JWT con caducidad en el backend actual (`SecurityConfig` tiene `permitAll()` en `/api/**`).
2. **Control de Acceso en Capa de Servicio**:
   * La validación de permisos de creador/colaborador se delega a verificaciones explícitas en `DiagramService` usando `userId` enviado en parámetros de query o cuerpo, en lugar de un token de seguridad centralizado.
3. **Ausencia de Historial de Versiones de Lienzo (Undo/Redo en BD)**:
   * El campo `lienzo` almacena únicamente la última versión enviada. No existe tabla histórica de revisiones o auditoría de deltas granulares en base de datos.
