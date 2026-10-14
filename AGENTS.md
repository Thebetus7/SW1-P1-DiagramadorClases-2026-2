# AGENTS.md — Reglas Operativas y Gobernanza SDD (Adopción Brownfield)

Este archivo es el **manual de operaciones maestro y gobernanza** del proyecto para agentes de inteligencia artificial y desarrolladores humanos bajo la metodología **Spec-Driven Development (SDD)**.

---

## 1. Identidad y Contexto del Proyecto

* **Proyecto**: `SW1-P1-DiagramadorClases-2026-2` (Diagramador de Clases UML Colaborativo en Tiempo Real)
* **Modalidad**: Adopción SDD en Código Existente (Brownfield)
* **Propósito**: Plataforma web colaborativa para el modelado visual de diagramas de clases UML 2.5 en tiempo real, con generación automática de código para Spring Boot y Flutter, importación/exportación de estándares XMI e interpretación inteligente mediante Google Gemini Vision/LLM.
* **Arquitectura Base**:
  * **Estructura Global**: Monorepo desacoplado / Multi-servicio orquestado con Docker Compose y Nginx Reverse Proxy.
  * **Backend**: Java 17 + Spring Boot (Arquitectura en Capas: Controller, Service, Repository, Entity, DTO, Config) con persistencia en PostgreSQL / H2 y comunicación STOMP WebSockets.
  * **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + React Flow (`@xyflow/react`) + StompJS / SockJS.
  * **Reverse Proxy**: Nginx Alpine en el puerto 80 enrutando tráfico REST (`/api/`), WebSockets (`/ws`) y SPA Frontend (`/`).

---

## 2. Comandos Operativos Verificados

El asistente y los desarrolladores DEBEN utilizar estrictamente los comandos reales configurados en este repositorio:

### 2.1 Backend (`back_diagramador/`)
Ejecutar desde el directorio `back_diagramador/`:
* **Compilación**:
  * Windows: `.\mvnw.cmd compile`
  * Linux / macOS: `./mvnw compile`
* **Ejecutar Pruebas Unitarias e Integración**:
  * Windows: `.\mvnw.cmd test`
  * Linux / macOS: `./mvnw test`
* **Empaquetado (JAR de producción)**:
  * Windows: `.\mvnw.cmd clean package -DskipTests`
  * Linux / macOS: `./mvnw clean package -DskipTests`
* **Ejecución Local**:
  * Windows: `.\mvnw.cmd spring-boot:run`
  * Linux / macOS: `./mvnw spring-boot:run`

### 2.2 Frontend (`front_diag_clases/`)
Ejecutar desde el directorio `front_diag_clases/`:
* **Servidor de Desarrollo**: `npm run dev` (puerto 3000)
* **Verificación de Tipos (TypeScript)**: `npx tsc --noEmit`
* **Linter**: `npm run lint`
* **Build de Producción**: `npm run build`
* **Inicio en Producción**: `npm run start`

### 2.3 Orquestación e Infraestructura (`/`)
Ejecutar desde la raíz del repositorio:
* **Iniciar entorno completo**: `docker compose up -d --build`
* **Ver estado de contenedores**: `docker compose ps`
* **Ver logs unificados**: `docker compose logs -f`
* **Detener servicios**: `docker compose down`

---

## 3. Reglas Innegociables para Proyectos Existentes

1. **Codebase is King (La Verdad Reside en el Código)**:
   * Todo endpoint, modelo JPA, interfaz TypeScript y canal STOMP existente representa un contrato activo.
   * Prohibido inventar frameworks o sustituir librerías existentes sin un proceso formal.
2. **Principio de No Regresión**:
   * Cualquier cambio o adición debe mantener al 100% la compatibilidad con los contratos vigentes catalogados en la Línea Base (`docs/specs/00-baseline/inventory.md`).
   * La suite de pruebas debe pasar sin fallos tras cualquier intervención.
3. **Prohibición de Refactorización Silenciosa**:
   * No alterar módulos marcados como `SEALED` a menos que exista una tarea formal y una especificación anclada aprobada (`/sdd-spec-anchored`).
4. **Respeto a las Convenciones Vigentes**:
   * Estilo backend: Nombres de paquetes en minúsculas, camelCase para métodos, PascalCase para clases y DTOs, anotaciones Lombok estándar (`@Data`, `@Builder`, `@RequiredArgsConstructor`).
   * Estilo frontend: Componentes React funcionales con TypeScript estricto, hooks nativos, Tailwind CSS modular y manejo de tipos centralizado en `types/index.ts`.
5. **Ciclo de Vida Documental SDD**:
   * **Nuevas Funcionalidades**: `/sdd-spec-high` ➔ `/sdd-planning` ➔ `/sdd-task` ➔ `/sdd-execution`
   * **Refactors y Corrección de Bugs en Código Existente**: `/sdd-spec-anchored`
   * **Auditoría y Despliegue Cloud / DevOps**: `/doc-deploy`
