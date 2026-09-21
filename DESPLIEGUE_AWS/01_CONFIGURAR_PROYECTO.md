# Paso 01: Configuración de Archivos Docker para el Proyecto

En este paso se definen los archivos de configuración requeridos para empaquetar y orquestar el sistema completo en contenedores Docker antes de desplegarlo en la máquina virtual de AWS.

> [!NOTE]
> Puedes crear estos archivos en tu repositorio local y subirlos con `git push`, o bien crearlos directamente en la instancia EC2 mediante el editor `nano`.

---

## 📁 1. Estructura de Archivos a Crear

```
SW1-P1-DiagramadorClases-2026-2/
├── back_diagramador/
│   ├── Dockerfile             <-- [NUEVO] Empaquetado de Spring Boot
│   └── .dockerignore          <-- [NUEVO] Exclusiones de build Java
├── front_diag_clases/
│   ├── Dockerfile             <-- [NUEVO] Empaquetado de Next.js
│   └── .dockerignore          <-- [NUEVO] Exclusiones de build Node
├── nginx/
│   └── nginx.conf             <-- [NUEVO] Configuración del Reverse Proxy y WebSockets
└── docker-compose.yml         <-- [NUEVO] Orquestador de los 4 servicios
```

---

## ☕ 2. Dockerfile del Backend (Spring Boot + Java 17)

Crea el archivo `back_diagramador/Dockerfile`:

```dockerfile
# ==========================================
# ETAPA 1: Compilación y empaquetado Maven
# ==========================================
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /app

# Copiar archivos de Maven Wrapper y dependencias primero para cachear capas
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copiar el código fuente y empaquetar en archivo .jar omitiendo tests unitarios
COPY src ./src
RUN ./mvnw clean package -DskipTests -B

# ==========================================
# ETAPA 2: Imagen de ejecución ligera (JRE)
# ==========================================
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Crear usuario sin privilegios root por seguridad
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copiar el ejecutable generado desde la etapa de compilación
COPY --from=builder /app/target/*.jar app.jar
RUN chown -R appuser:appgroup /app

USER appuser

# Exponer el puerto interno de Spring Boot
EXPOSE 8080

# Limitar memoria Heap a 384 MB para no agotar la RAM de la instancia gratuita t2/t3.micro
ENV JAVA_OPTS="-Xms128m -Xmx384m -Djava.security.egd=file:/dev/./urandom -Dfile.encoding=UTF-8"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

Crea el archivo `back_diagramador/.dockerignore`:
```
target/
.mvn/wrapper/maven-wrapper.jar
.git/
.gitignore
*.md
.idea/
*.iml
```

---

## 🌐 3. Dockerfile del Frontend (Next.js + Node 20)

Crea el archivo `front_diag_clases/Dockerfile`:

```dockerfile
# ==========================================
# ETAPA 1: Instalación de dependencias
# ==========================================
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# ==========================================
# ETAPA 2: Construcción de la aplicación Next.js
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Argumentos de entorno para incrustar en tiempo de build
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_WS_URL=/ws
ARG NEXT_PUBLIC_GEMINI_API_KEY=""

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_GEMINI_API_KEY=$NEXT_PUBLIC_GEMINI_API_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ==========================================
# ETAPA 3: Imagen final de ejecución
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos estáticos y bundle de producción
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

> [!TIP]
> Para usar el modo `standalone` de Next.js (el cual produce un contenedor ultraligero de solo ~150 MB), verifica que tu archivo `front_diag_clases/next.config.ts` o `next.config.js` incluya `output: "standalone"`.
> Si no lo tienes, puedes agregarlo así:
> ```typescript
> const nextConfig = {
>   output: "standalone",
>   /* otras configuraciones */
> };
> export default nextConfig;
> ```

Crea el archivo `front_diag_clases/.dockerignore`:
```
node_modules/
.next/
out/
.git/
.gitignore
*.md
.env*.local
```

---

## 🛡️ 4. Configuración de Nginx Reverse Proxy (`nginx/nginx.conf`)

Nginx recibirá todas las peticiones en el puerto `80` y las enrutará internamente:
- Peticiones a `/api/` ➔ Backend Spring Boot (`http://backend:8080/api/`).
- Peticiones a `/ws` ➔ WebSockets STOMP de Spring Boot con headers de `Upgrade`.
- Peticiones a `/` ➔ Frontend Next.js (`http://frontend:3000`).

Crea la carpeta `nginx` y el archivo `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;
    client_max_body_size 25M;

    # Mapa para soporte correcto de WebSockets STOMP
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    upstream backend_upstream {
        server backend:8080;
    }

    upstream frontend_upstream {
        server frontend:3000;
    }

    server {
        listen 80;
        server_name _;

        # 1. Enrutamiento hacia API REST de Spring Boot
        location /api/ {
            proxy_pass http://backend_upstream/api/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 90s;
        }

        # 2. Enrutamiento hacia WebSockets en tiempo real (/ws)
        location /ws {
            proxy_pass http://backend_upstream/ws;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;
        }

        # 3. Enrutamiento hacia Frontend Next.js (Todo el tráfico restante)
        location / {
            proxy_pass http://frontend_upstream;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

---

## 🐳 5. Orquestador Docker Compose (`docker-compose.yml`)

Crea en la raíz del proyecto el archivo `docker-compose.yml`:

```yaml
services:
  # ==========================================================
  # 1. Base de Datos: PostgreSQL 16
  # ==========================================================
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

  # ==========================================================
  # 2. Backend: Spring Boot + Java 17 + STOMP WebSockets
  # ==========================================================
  backend:
    build:
      context: ./back_diagramador
      dockerfile: Dockerfile
    container_name: diag_backend
    restart: always
    depends_on:
      postgres_db:
        condition: service_healthy
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres_db:5432/sw1_diag_clases_2026_2
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD:-password123}
      SPRING_JPA_HIBERNATE_DDL_AUTO: update
      SPRING_JPA_SHOW_SQL: "false"
    networks:
      - diag_network

  # ==========================================================
  # 3. Frontend: Next.js + React 19 + Tailwind CSS
  # ==========================================================
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

  # ==========================================================
  # 4. Reverse Proxy: Nginx en Puerto 80
  # ==========================================================
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

# Red interna privada compartida entre los contenedores
networks:
  diag_network:
    driver: bridge

# Volumen persistente para que la base de datos no pierda información
volumes:
  postgres_data:
    driver: local
```

---

## 🔒 6. Archivo de Variables de Entorno (`.env.example`)

Crea en la raíz del proyecto el archivo `.env.example`:

```env
# Contraseña de la base de datos PostgreSQL en producción
DB_PASSWORD=TuPasswordSeguro123!

# Clave de API de Google Gemini para reconocimiento de diagramas con IA
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSy...
```

---

> **Volver al Índice:** [00_RESUMEN_GENERAL.md](./00_RESUMEN_GENERAL.md)  
> **Siguiente Paso:** [02_CREAR_INSTANCIA_AWS.md](./02_CREAR_INSTANCIA_AWS.md)
