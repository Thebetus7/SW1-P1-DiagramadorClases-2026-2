# Backend - Diagramador de Clases (Spring Boot)

Backend para la aplicación de Diagramador de Clases UML desarrollado con **Spring Boot 3 / Java 17**.

---

## 📋 Requisitos Previos

- **Java JDK**: Versión 17 o superior.
- **PostgreSQL**: Base de datos corriendo localmente en el puerto `5432` con la base de datos `sw1_diag_clases_2026_2` (o configurar en `src/main/resources/application.properties`).

---

## 🚀 Comandos de Ejecución

### 1. Ejecutar en Modo Desarrollo (Spring Boot Run)

#### En Linux / macOS / Git Bash / WSL:
```bash
./mvnw spring-boot:run
```

#### En Windows (PowerShell / Command Prompt):
```powershell
.\mvnw.cmd spring-boot:run
```

> **Nota:** Si tienes **Apache Maven** instalado globalmente en el sistema, también puedes usar:
> ```bash
> mvn spring-boot:run
> ```

---

## 🛠️ Errores Comunes de Comando

- ❌ `./nvmw springbooot:run` *(Incorrecto: typo en el wrapper `nvmw` y en `springbooot`)*
- ✅ `./mvnw spring-boot:run` *(Correcto)*

---

## ⚙️ Configuración y Puerto

Por defecto, la aplicación se ejecuta en:
- **URL Base:** `http://localhost:8080`
- **Consola H2 (si se habilita):** `http://localhost:8080/h2-console`

Para modificar el puerto, credenciales de PostgreSQL o configuración de base de datos, revisa el archivo:
[`src/main/resources/application.properties`](file:///c:/EDBERTO/ULTIMO/SW1/PARCIAL%201/PF/SW1-P1-DiagramadorClases-2026-2/back_diagramador/src/main/resources/application.properties)

---

## 📦 Compilación y Empaquetado

### Limpiar y compilar el proyecto:
```bash
./mvnw clean compile
```

### Generar el archivo JAR:
```bash
./mvnw clean package
```

### Ejecutar las pruebas unitarias:
```bash
./mvnw test
```

---

## 🗄️ Configuración Completa de DynamoDB con MinIO

Esta sección detalla la configuración y despliegue del almacenamiento NoSQL y Object Storage que complementan la base de datos relacional PostgreSQL.

### 1. Arquitectura de Almacenamiento

| Componente | Tecnología | Rol en el Sistema | Puertos por Defecto |
| :--- | :--- | :--- | :--- |
| **NoSQL Documental** | **Amazon DynamoDB Local** (AWS SDK v2 Enhanced) | Historial de chat colaborativo en tiempo real, registro de propuestas IA y eventos | `8005` (host) ➔ `8000` (contenedor) |
| **Object Storage** | **MinIO** (Compatible con AWS S3 API) | Almacenamiento de archivos binarios, imágenes exportadas (PNG/SVG), archivos XMI y snapshots | `9000` (API S3) / `9001` (Consola Web) |

---

### 2. Despliegue con Docker Compose

Para iniciar DynamoDB Local y MinIO junto a PostgreSQL, agrega o verifica los siguientes servicios en tu archivo `docker-compose.yml`:

```yaml
services:
  # ==========================================================
  # DynamoDB Local (NoSQL Documental para Chat y Propuestas)
  # ==========================================================
  dynamodb:
    image: amazon/dynamodb-local:latest
    container_name: diag_dynamodb
    restart: always
    command: "-jar DynamoDBLocal.jar -sharedDb -inMemory"
    ports:
      - "8005:8000"
    networks:
      - diag_network

  # ==========================================================
  # MinIO (Object Storage S3-Compatible)
  # ==========================================================
  minio:
    image: minio/minio:latest
    container_name: diag_minio
    restart: always
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"   # Puerto de API S3
      - "9001:9001"   # Puerto de la Consola Web
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    networks:
      - diag_network

volumes:
  dynamodb_data:
    driver: local
  minio_data:
    driver: local

networks:
  diag_network:
    driver: bridge
```

#### Iniciar los contenedores:
```bash
docker compose up -d dynamodb minio
```

---

### 3. Despliegue Individual con Docker CLI (Opcional)

Si deseas ejecutar los servicios sin Docker Compose:

```bash
# Ejecutar DynamoDB Local
docker run -d --name diag_dynamodb \
  -p 8005:8000 \
  amazon/dynamodb-local:latest \
  -jar DynamoDBLocal.jar -sharedDb -inMemory

# Ejecutar MinIO
docker run -d --name diag_minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio:latest server /data --console-address ":9001"
```

---

### 4. Configuración en Spring Boot (`application.properties`)

Añade las siguientes propiedades en [`src/main/resources/application.properties`](file:///c:/EDBERTO/ULTIMO/SW1/PARCIAL%201/PROYECTO/SW1-P1-DiagramadorClases-2026-2/back_diagramador/src/main/resources/application.properties) para conectar el backend con ambos servicios:

```properties
# ==========================================================
# Amazon DynamoDB (NoSQL Documental para Chat y Propuestas)
# ==========================================================
amazon.dynamodb.endpoint=${DYNAMODB_ENDPOINT:http://localhost:8005}
amazon.aws.region=${AWS_REGION:us-east-1}
amazon.aws.accesskey=${AWS_ACCESS_KEY_ID:dummy}
amazon.aws.secretkey=${AWS_SECRET_ACCESS_KEY:dummy}

# ==========================================================
# MinIO Object Storage (Cliente AWS S3)
# ==========================================================
minio.endpoint=${MINIO_ENDPOINT:http://localhost:9000}
minio.access-key=${MINIO_ACCESS_KEY:minioadmin}
minio.secret-key=${MINIO_SECRET_KEY:minioadmin}
minio.bucket-name=${MINIO_BUCKET_NAME:sw1-diagramador-assets}
minio.region=${AWS_REGION:us-east-1}
```

#### Variables de Entorno Disponibles:

| Variable | Valor Local por Defecto | Valor en Docker Compose | Descripción |
| :--- | :--- | :--- | :--- |
| `DYNAMODB_ENDPOINT` | `http://localhost:8005` | `http://dynamodb:8000` | Endpoint de conexión al servidor DynamoDB |
| `AWS_REGION` | `us-east-1` | `us-east-1` | Región AWS utilizada por el SDK |
| `AWS_ACCESS_KEY_ID` | `dummy` | `dummy` | Access Key (no restringida en DynamoDB Local) |
| `AWS_SECRET_ACCESS_KEY` | `dummy` | `dummy` | Secret Key (no restringida en DynamoDB Local) |
| `MINIO_ENDPOINT` | `http://localhost:9000` | `http://minio:9000` | Endpoint de la API REST compatible con S3 |
| `MINIO_ACCESS_KEY` | `minioadmin` | `minioadmin` | Clave de acceso o usuario root de MinIO |
| `MINIO_SECRET_KEY` | `minioadmin` | `minioadmin` | Clave secreta o contraseña root de MinIO |
| `MINIO_BUCKET_NAME` | `sw1-diagramador-assets` | `sw1-diagramador-assets` | Nombre del bucket para imágenes y archivos del diagrama |

---

### 5. Verificación de Funcionamiento

#### A. Verificar DynamoDB Local
Al arrancar la aplicación, el bean `DynamoDbConfig` crea automáticamente la tabla `DiagramChatMessages` con índice secundario `MessageIdIndex`. Puedes validar su estado usando la **AWS CLI**:

```bash
# Listar tablas existentes en DynamoDB Local
aws dynamodb list-tables --endpoint-url http://localhost:8005 --region us-east-1

# Consultar registros guardados en la tabla de chat
aws dynamodb scan --table-name DiagramChatMessages --endpoint-url http://localhost:8005 --region us-east-1
```

#### B. Verificar MinIO
- **Consola Web MinIO:** Accede en el navegador a [http://localhost:9001](http://localhost:9001) con:
  - **Usuario:** `minioadmin`
  - **Contraseña:** `minioadmin`
- **Operaciones vía AWS CLI:**
```bash
# Listar buckets en MinIO
aws --endpoint-url http://localhost:9000 s3 ls

# Crear el bucket principal del proyecto
aws --endpoint-url http://localhost:9000 s3 mb s3://sw1-diagramador-assets

# Subir un archivo de prueba al bucket
aws --endpoint-url http://localhost:9000 s3 cp test.txt s3://sw1-diagramador-assets/test.txt
```

---

### 6. Solución de Problemas (Troubleshooting)

- **Error `Connection refused` al arrancar el backend:**
  - Asegúrate de que el contenedor de DynamoDB Local o MinIO esté corriendo:
    ```bash
    docker ps
    ```
  - Si no están activos, inícialos con:
    ```bash
    docker compose up -d dynamodb minio
    ```
- **Aviso `ResourceInUseException` en los logs de Spring Boot:**
  - Es normal si la tabla `DiagramChatMessages` ya fue creada en una ejecución previa. El backend detecta la condición y continúa sin errores.

