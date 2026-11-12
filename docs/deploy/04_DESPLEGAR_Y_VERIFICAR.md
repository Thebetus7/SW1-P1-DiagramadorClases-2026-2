# 🚀 04. Desplegar y Verificar en Producción con DynamoDB

[⬅️ Volver a 03_INSTALAR_HERRAMIENTAS.md](./03_INSTALAR_HERRAMIENTAS.md) | [Siguiente: 05_ACTUALIZAR_PRODUCCION.md ➡️](./05_ACTUALIZAR_PRODUCCION.md)

---

Este documento detalla la clonación del proyecto en el servidor Amazon Linux 2023, la configuración de variables de producción, la compilación de imágenes Docker, el arranque de los servicios y la batería de pruebas de verificación física (REST, WebSockets y conexión a DynamoDB).

---

### 🚀 Paso 1: Clonar el Repositorio en el Servidor EC2

> [!NOTE]
> **Propósito:** Descargar el código fuente en el directorio de trabajo del usuario `ec2-user`.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`
> **Ruta de Trabajo:** `/home/ec2-user`

```bash
# [SSH / SERVIDOR] Clonar el repositorio (rama específica main-parcial2)
cd /home/ec2-user
git clone -b main-parcial2 https://github.com/Thebetus7/SW1-P1-DiagramadorClases-2026-2.git app_diagramador

# Ingresar al directorio del proyecto
cd app_diagramador
```

> [!TIP]
> **Verificación Observable:**
> Ejecuta `ls -la` y confirma la presencia de `docker-compose.yml`, `back_diagramador`, `front_diag_clases` y `nginx`.

---

### 🚀 Paso 2: Crear el Archivo de Producción `.env`

> [!NOTE]
> **Propósito:** Configurar las variables con contraseñas seguras y la conexión hacia DynamoDB en la nube.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`
> **Ruta de Trabajo:** `/home/ec2-user/app_diagramador`

Crea el archivo `.env` utilizando el editor `nano`:

```bash
nano .env
```

Pega la siguiente configuración reemplazando los placeholders:

```bash
# --- 1. Base de Datos Relacional PostgreSQL ---
DB_PASSWORD=<TU_DB_PASSWORD_PRODUCCION>

# --- 2. Amazon DynamoDB Administrado en AWS ---
AWS_REGION=us-east-1

# IMPORTANTE: Dejar DYNAMODB_ENDPOINT vacío para conectar a DynamoDB en AWS
DYNAMODB_ENDPOINT=

# Si la instancia EC2 tiene asignado el IAM Role (EC2-DynamoDB-Diagramador-Role),
# estas credenciales NO son necesarias y pueden omitirse:
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# --- 3. MinIO S3 Compatible ---
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<TU_MINIO_SECRET_PASSWORD>
MINIO_BUCKET_NAME=sw1-diagramador-assets

# --- 4. Google Gemini Copilot ---
NEXT_PUBLIC_GEMINI_API_KEY=<TU_GEMINI_API_KEY>
```

Presiona `Ctrl + O` seguido de `Enter` para guardar, y luego `Ctrl + X` para salir.

---

### 🚀 Paso 3: Construir y Levantar los Contenedores con Docker Compose

> [!NOTE]
> **Propósito:** Construir las imágenes de producción optimizadas (JAR empaquetado de Spring Boot y standalone bundle de Next.js) e iniciar todos los contenedores en segundo plano.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`
> **Ruta de Trabajo:** `/home/ec2-user/app_diagramador`

```bash
# [SSH / SERVIDOR] Construcción y arranque en segundo plano
docker compose up -d --build
```

> [!TIP]
> **Verificación Observable:**
> Una vez completado el build, inspecciona el estado de los contenedores:
> ```bash
> docker compose ps
> ```
> Todos los contenedores deben mostrar estado `Up` o `Up (healthy)`:
> ```text
> NAME            IMAGE                         STATUS                  PORTS
> diag_postgres   postgres:16-alpine            Up (healthy)            5432/tcp
> diag_minio      minio/minio:latest            Up                      127.0.0.1:9000->9000/tcp
> diag_backend    app_diagramador-backend       Up                      8080/tcp
> diag_frontend   app_diagramador-frontend      Up                      3000/tcp
> diag_proxy      nginx:alpine                  Up                      0.0.0.0:80->80/tcp
> ```

---

### 🚀 Paso 4: Verificar la Conexión con Amazon DynamoDB en los Logs

> [!NOTE]
> **Propósito:** Comprobar que el backend de Spring Boot se comunicó exitosamente con la tabla de DynamoDB en AWS.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`

```bash
# [SSH / SERVIDOR] Inspeccionar logs de inicialización del backend
docker compose logs backend | grep -i "DynamoDB"
```

> [!TIP]
> **Salida Esperada Confirmada:**
> ```text
> INFO  --- [back_diagramador] : Inicializando DynamoDbClient hacia endpoint: , region: us-east-1
> INFO  --- [back_diagramador] : Verificando existencia de tabla DynamoDB: DiagramChatMessages
> INFO  --- [back_diagramador] : La tabla DynamoDB DiagramChatMessages ya existe y está lista para operar.
> ```

---

### 🚀 Paso 5: Batería de Pruebas de Verificación Física

> [!NOTE]
> **Propósito:** Probar de punta a punta la disponibilidad de la plataforma en la red pública.
> **Contexto de Ejecución:** `[PC LOCAL / NAVEGADOR WEB]`

Realiza las siguientes 3 pruebas observables:

1. **Prueba de Frontend (Next.js):**
   - Abre en tu navegador web: `http://<TU_IP_PUBLICA>`
   - **Resultado Esperado:** Carga inmediata de la pantalla principal del editor de diagramas UML con React Flow y la barra superior de herramientas.

2. **Prueba de API REST (Spring Boot):**
   - Ejecuta desde tu terminal local:
     ```bash
     curl -i http://<TU_IP_PUBLICA>/api/diagrams
     ```
   - **Resultado Esperado:** Respuesta HTTP `200 OK` con un array JSON `[]` o la lista de diagramas registrados.

3. **Prueba de WebSockets STOMP (/ws):**
   - Abre la consola del navegador (`F12` > pestaña *Console* / *Red* > *WS*).
   - Observa la conexión exitosa hacia `ws://<TU_IP_PUBLICA>/ws`:
     ```text
     [StompClient] Connected to STOMP broker!
     ```

---

### 🚀 Paso 6: Configurar Cifrado HTTPS con Let's Encrypt y Certbot (Opcional si tienes Dominio)

> [!NOTE]
> **Propósito:** Cifrar todo el tráfico entre los usuarios y el servidor con un certificado SSL gratuito reconocido mundialmente.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`
> **Prerrequisito:** Apuntar un registro DNS tipo `A` de tu dominio (ej. `diagramador.tudominio.com`) hacia `<TU_IP_PUBLICA>`.

```bash
# [SSH / SERVIDOR] 1. Instalar Certbot en Amazon Linux 2023
sudo dnf install -y python3-certbot-nginx

# [SSH / SERVIDOR] 2. Generar certificado (Detener Nginx temporalmente si se usa modo standalone)
sudo certbot certonly --standalone -d <TU_DOMINIO> --agree-tos -m <TU_EMAIL> --non-interactive
```

---

## 🛠️ Solución de Problemas Frecuentes (Troubleshooting)

### 1. `DynamoDbException: User: arn:aws:sts:... is not authorized to perform: dynamodb:DescribeTable`
* **Causa:** El IAM Role asignado a la instancia EC2 carece de permisos sobre la tabla `DiagramChatMessages`.
* **Solución:** Revisa la política IAM creada en el Paso 02 (`02_CREAR_INFRAESTRUCTURA_AWS.md`) y asegúrate de que el ARN apunte a `arn:aws:dynamodb:*:*:table/DiagramChatMessages`.

### 2. `Connection refused to postgres_db:5432`
* **Causa:** El backend intentó conectarse antes de que PostgreSQL estuviera completamente listo para aceptar conexiones.
* **Solución:** Gracias a la directiva `condition: service_healthy` en `docker-compose.yml`, Docker maneja la espera automáticamente. Si persiste, reinicia con:
  ```bash
  docker compose restart backend
  ```

### 3. Peticiones WebSocket fallan con `400 Bad Request` o `Upgrade Required`
* **Causa:** El proxy inverso no está transmitiendo los encabezados de actualización de protocolo.
* **Solución:** Verifica que `nginx/nginx.conf` incluya el bloque `map $http_upgrade $connection_upgrade` y las directivas `proxy_set_header Upgrade $http_upgrade` en el bloque `/ws`.

---

[⬅️ Volver a 03_INSTALAR_HERRAMIENTAS.md](./03_INSTALAR_HERRAMIENTAS.md) | [Siguiente: 05_ACTUALIZAR_PRODUCCION.md ➡️](./05_ACTUALIZAR_PRODUCCION.md)
