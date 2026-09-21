# Paso 04: Despliegue y Verificación en Producción

En este paso clonarás el código fuente en tu servidor EC2, configurarás las variables de entorno de producción, compilarás y levantarás los contenedores con Docker Compose, y verificarás el funcionamiento del sistema en tu navegador web mediante la dirección IP pública.

---

## 📥 1. Clonar el Repositorio en la Instancia

Desde tu sesión SSH en la instancia (`ec2-user@...`):

```bash
# 1. Asegurarte de estar en tu directorio de inicio
cd /home/ec2-user

# 2. Clonar el repositorio del proyecto
git clone https://github.com/Thebetus7/SW1-P1-DiagramadorClases-2026-2.git

# 3. Entrar en la carpeta del proyecto
cd SW1-P1-DiagramadorClases-2026-2
```

> [!NOTE]
> Si tu repositorio en GitHub es **privado**, cuando Git te solicite la contraseña, debes ingresar un **Personal Access Token (PAT)** de GitHub con permisos `repo`, ya que GitHub no admite contraseñas de cuenta directa por HTTPS.

---

## ⚙️ 2. Crear el Archivo de Variables de Entorno (`.env`)

Crea y edita el archivo `.env` en la raíz del proyecto con el editor `nano`:

```bash
nano .env
```

Pega la siguiente configuración (ajusta la contraseña y tu clave de Gemini si la tienes):

```env
# Contraseña de la base de datos PostgreSQL en el contenedor
DB_PASSWORD=SuperPasswordSeguro2026!

# Clave de API de Google Gemini (Opcional: para funciones de visión e IA)
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSy...
```

> *Para guardar en `nano`: presiona `Ctrl + O`, presiona `Enter`, y sal con `Ctrl + X`.*

---

## 🚀 3. Compilación y Puesta en Marcha (`docker compose up`)

Ejecuta el comando para construir las imágenes y levantar los cuatro servicios en segundo plano:

```bash
docker compose up -d --build
```

### ¿Qué sucede durante este comando?
1. **Descarga de imágenes base:** Se descargan `postgres:16-alpine` y `nginx:alpine`.
2. **Construcción del Backend:** Maven descarga dependencias dentro del contenedor builder, compila el código Java 17 y genera el archivo `app.jar` que se ejecuta sobre un JRE optimizado.
3. **Construcción del Frontend:** Node 20 instala dependencias, compila Next.js en modo standalone y genera el bundle estático de producción.
4. **Inicio de servicios en orden:** PostgreSQL inicia y pasa su healthcheck; inmediatamente después arrancan el backend Spring Boot, el frontend Next.js y el proxy Nginx.

> [!TIP]
> La primera compilación tomará entre **3 y 6 minutos** debido a la descarga de paquetes y el build de Java y Next.js con el swap. Las siguientes reconstrucciones serán mucho más rápidas gracias a la caché de capas de Docker.

---

## 🔍 4. Verificación del Estado de los Contenedores

Una vez finalizado el comando, revisa que los 4 contenedores estén en estado **Up**:

```bash
docker compose ps
```

**Salida esperada:**
```
NAME            IMAGE                              COMMAND                  SERVICE       STATUS
diag_postgres   postgres:16-alpine                 "docker-entrypoint.s…"   postgres_db   Up (healthy)
diag_backend    sw1-p1-diagramador...-backend      "sh -c 'java $JAVA_O…"   backend       Up
diag_frontend   sw1-p1-diagramador...-frontend     "node server.js"         frontend      Up
diag_proxy      nginx:alpine                       "/docker-entrypoint.…"   proxy         Up
```

### Inspección de Logs en Vivo
Para observar los mensajes de arranque de Spring Boot y Next.js:

```bash
# Ver los logs de todos los servicios:
docker compose logs -f

# O ver los logs de un servicio específico (ej: backend):
docker compose logs -f backend
```
*(Presiona `Ctrl + C` para salir de la visualización de logs).*

---

## 🌐 5. Prueba de Acceso desde el Navegador Web

1. Abre tu navegador web favorito (Chrome, Edge, Firefox).
2. En la barra de direcciones, escribe la **Dirección IPv4 Pública** de tu instancia EC2 precedida de `http://`:
   ```
   http://<TU_IP_PUBLICA_EC2>
   ```
   *(Ejemplo: `http://54.210.88.145`)*

> [!IMPORTANT]
> Asegúrate de escribir estrictamente **`http://`** y **NO** `https://`, ya que la instancia está sirviendo el puerto 80 estándar sin certificado SSL configurado.

### Flujo de Prueba Rápida para el Examen Universitario:
1. **Página de Inicio / Login:** Ingresa con los usuarios de prueba o regístrate.
2. **Crear Diagrama:** Crea un nuevo diagrama de clases en el panel principal.
3. **Canvas React Flow:** Añade clases UML, relaciones y notas UML.
4. **Colaboración en Tiempo Real:** Abre una pestaña en modo incógnito (o dile a un compañero que ingrese a tu IP) y verifica que los movimientos de clases y cursores se reflejen instantáneamente mediante los WebSockets `/ws`.
5. **Exportación XMI:** Haz clic en **Previsualizar / Exportar XMI** y descarga el archivo para verificar compatibilidad con Enterprise Architect.

---

## 🩺 6. Solución de Problemas Frecuentes (Troubleshooting)

### A. "No se puede acceder a este sitio" en el navegador
- **Causa 1:** El Security Group de AWS no tiene abierto el puerto 80.  
  *Solución:* Ve a la consola de AWS > EC2 > Security Groups > Edita las reglas de entrada y agrega `HTTP` en puerto `80` con origen `0.0.0.0/0`.
- **Causa 2:** El navegador autocompleta con `https://`.  
  *Solución:* Escribe explícitamente `http://` antes de la IP.

### B. El contenedor Backend se reinicia continuamente
- Ejecuta `docker compose logs backend` para ver el error.
- Si dice `Connection refused to postgres_db:5432`, PostgreSQL aún no había terminado de inicializarse. Reinicia con:
  ```bash
  docker compose restart backend
  ```

### C. La compilación se detuvo con `Killed` o `Error 137`
- **Causa:** Se agotó la memoria RAM física.
- **Solución:** Verifica con `free -h` si configuraste la memoria SWAP de 2 GB explicada en el Paso 03. Si `Swap: 0`, vuelve al Paso 03 y activa el archivo swap.

---

> **Paso Anterior:** [03_INSTALAR_HERRAMIENTAS.md](./03_INSTALAR_HERRAMIENTAS.md)  
> **Volver al Índice:** [00_RESUMEN_GENERAL.md](./00_RESUMEN_GENERAL.md)  
> **Siguiente Paso:** [05_ACTUALIZAR_PRODUCCION.md](./05_ACTUALIZAR_PRODUCCION.md)
