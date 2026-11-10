# ⚙️ 01. Configurar el Proyecto para Producción con DynamoDB

[⬅️ Volver a 00_RESUMEN_GENERAL.md](./00_RESUMEN_GENERAL.md) | [Siguiente: 02_CREAR_INFRAESTRUCTURA_AWS.md ➡️](./02_CREAR_INFRAESTRUCTURA_AWS.md)

---

Este documento detalla la estructura del entorno de producción, las variables requeridas en `.env` y el archivo de orquestación `docker-compose.yml` para operar fluidamente con **Amazon DynamoDB en AWS** o en modo de contingencia local.

---

### 🚀 Paso 1: Configurar las Variables de Entorno de Producción (`.env`)

> [!NOTE]
> **Propósito:** Definir los secretos y parámetros de conexión para PostgreSQL, Amazon DynamoDB, MinIO y Next.js sin exponer credenciales en el código fuente ni en repositorios públicos.
> **Contexto de Ejecución:** `[PC LOCAL]` / `[SSH / SERVIDOR]`
> **Ruta de Trabajo:** Raíz del proyecto (`/`)

Crea el archivo `.env` en la raíz de tu proyecto tomando como base esta plantilla estructurada:

```bash
# ==============================================================================
# ARCHIVO DE VARIABLES DE PRODUCCIÓN (.env)
# ==============================================================================

# --- 1. SEGURIDAD DE BASE DE DATOS RELACIONAL (PostgreSQL 16) ---
# Contraseña de alta entropía para el usuario 'postgres' en el contenedor Docker
DB_PASSWORD=<TU_DB_PASSWORD_PRODUCCION>

# --- 2. CONFIGURACIÓN DE AMAZON DYNAMODB (AWS) ---
# Región de AWS donde se aloja la tabla DynamoDB 'DiagramChatMessages'
AWS_REGION=us-east-1

# Para usar Amazon DynamoDB administrado en AWS: DEJAR VACÍO o eliminar DYNAMODB_ENDPOINT.
# Si el valor está vacío, el AWS SDK v2 se conectará automáticamente a DynamoDB en AWS.
# (Solo si se requiere DynamoDB local en pruebas, colocar: http://dynamodb:8000)
DYNAMODB_ENDPOINT=

# Credenciales IAM de AWS (Solo requeridas si no se utiliza un IAM Role en la instancia EC2)
AWS_ACCESS_KEY_ID=<TU_AWS_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<TU_AWS_SECRET_ACCESS_KEY>

# --- 3. ALMACENAMIENTO DE ARCHIVOS (MinIO / S3) ---
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<TU_MINIO_SECRET_PASSWORD>
MINIO_BUCKET_NAME=sw1-diagramador-assets

# --- 4. INTEGRACIÓN IA Y GEMINI ---
# Clave API para el asistente Copilot de Google Gemini (opcional en frontend/backend)
NEXT_PUBLIC_GEMINI_API_KEY=<TU_GEMINI_API_KEY>
```

> [!TIP]
> **Verificación Observable:**
> Asegúrate de que el archivo `.env` no tenga espacios alrededor del signo igual (`=`) y que esté incluido en el archivo `.gitignore` para evitar filtraciones accidentales:
> ```bash
> git check-ignore -v .env
> # Salida esperada: .gitignore:XX:.env
> ```

---

### 🚀 Paso 2: Orquestación de Contenedores (`docker-compose.yml`)

> [!NOTE]
> **Propósito:** Orquestar los servicios de la aplicación con red privada, límites de memoria y reinicio automático ante caídas del servidor.
> **Contexto de Ejecución:** `[PC LOCAL]` / `[SSH / SERVIDOR]`
> **Ruta de Trabajo:** `docker-compose.yml`

El archivo `docker-compose.yml` de la raíz del proyecto está preparado para el ecosistema de producción:

```yaml
services:
  # 1. Base de Datos Relacional: PostgreSQL 16
  postgres_db:
    image: postgres:16-alpine
    container_name: diag_postgres
    restart: always
    environment:
      POSTGRES_DB: sw1_diag_clases_2026_2
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password123}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - diag_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # 2. MinIO (S3 Compatible para Archivos y Assets)
  minio:
    image: minio/minio:latest
    container_name: diag_minio
    restart: always
    command: server /data --console-address ":9001"
    ports:
      - "127.0.0.1:9000:9000"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    volumes:
      - minio_data:/data
    networks:
      - diag_network

  # 3. Backend: Spring Boot 3.5 + STOMP WebSockets + AWS SDK DynamoDB
  backend:
    build:
      context: ./back_diagramador
      dockerfile: Dockerfile
    container_name: diag_backend
    restart: always
    depends_on:
      postgres_db:
        condition: service_healthy
      minio:
        condition: service_started
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres_db:5432/sw1_diag_clases_2026_2
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      # Conexión a AWS DynamoDB administrado
      DYNAMODB_ENDPOINT: ${DYNAMODB_ENDPOINT:-}
      AWS_REGION: ${AWS_REGION:-us-east-1}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:-}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY:-}
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD:-minioadmin}
      MINIO_BUCKET_NAME: ${MINIO_BUCKET_NAME:-sw1-diagramador-assets}
      SPRING_JPA_HIBERNATE_DDL_AUTO: update
      SPRING_JPA_SHOW_SQL: "false"
    networks:
      - diag_network

  # 4. Frontend: Next.js 16 + React 19 + Tailwind v4
  frontend:
    build:
      context: ./front_diag_clases
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: /api
        NEXT_PUBLIC_WS_URL: /ws
        NEXT_PUBLIC_GEMINI_API_KEY: ${NEXT_PUBLIC_GEMINI_API_KEY:-}
    container_name: diag_frontend
    restart: always
    depends_on:
      - backend
    networks:
      - diag_network

  # 5. Reverse Proxy: Nginx en Puerto 80
  proxy:
    image: nginx:alpine
    container_name: diag_proxy
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
    networks:
      - diag_network

networks:
  diag_network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  minio_data:
    driver: local
```

> [!TIP]
> **Verificación Observable:**
> Realiza una validación de sintaxis del archivo `docker-compose.yml` ejecutando:
> ```bash
> docker compose config
> ```
> La salida debe imprimir la configuración renderizada sin emitir ningún error de sintaxis YAML.

---

### 🚀 Paso 3: Compatibilidad de DynamoDB en el Código Backend

> [!NOTE]
> **Propósito:** Comprender cómo Spring Boot gestiona el endpoint y las credenciales hacia Amazon DynamoDB.
> **Contexto de Inspección:** `back_diagramador/src/main/java/com/example/back_diagramador/config/DynamoDbConfig.java`

El código Java utiliza el **AWS SDK v2 (Enhanced Client)** con la siguiente lógica de inicialización:
1. Si la variable `DYNAMODB_ENDPOINT` está vacía o ausente, el cliente **no** aplica sobreescritura de URL y se conecta automáticamente al servicio administrado de DynamoDB en la región definida (`AWS_REGION=us-east-1`).
2. Al arrancar, el bean `initDynamoDbTables` ejecuta automáticamente un chequeo:
   - Si la tabla `DiagramChatMessages` ya existe en AWS, el backend continuará sin alterarla.
   - Si la tabla aún no existe, intentará crearla con el índice global secundario `MessageIdIndex`.
   - Sin embargo, para mayor seguridad y control de cuotas en AWS, crearemos la tabla explícitamente en el **Paso 02**.

---

[⬅️ Volver a 00_RESUMEN_GENERAL.md](./00_RESUMEN_GENERAL.md) | [Siguiente: 02_CREAR_INFRAESTRUCTURA_AWS.md ➡️](./02_CREAR_INFRAESTRUCTURA_AWS.md)

