# 🔄 05. Actualizar el Proyecto en Producción (rama `main-parcial2`)

[⬅️ Volver a 04_DESPLEGAR_Y_VERIFICAR.md](./04_DESPLEGAR_Y_VERIFICAR.md) | [Siguiente: 06_APAGAR_Y_REACTIVAR.md ➡️](./06_APAGAR_Y_REACTIVAR.md)

---

Este documento describe el procedimiento estándar para desplegar nuevas versiones del código (frontend o backend) desde la rama **`main-parcial2`** del repositorio en el servidor de producción, **sin perder datos en PostgreSQL ni en Amazon DynamoDB**.

> [!IMPORTANT]
> **Contexto:** El servidor EC2 ya tiene el proyecto clonado en `/home/ec2-user/app_diagramador` y los contenedores activos. Este flujo aplica **actualizaciones incrementales** (pull + rebuild). Si es un despliegue desde cero, ver [04_DESPLEGAR_Y_VERIFICAR.md](./04_DESPLEGAR_Y_VERIFICAR.md).

---

## 🗺️ Flujo Resumen de Actualización

```
[1] Backup PostgreSQL  →  [2] git pull main-parcial2  →  [3] sudo docker compose up -d --build  →  [4] Verificar  →  [5] Prune imágenes
```

---

### 🚀 Paso 1: Conectarse al Servidor EC2

> [!NOTE]
> **Contexto de Ejecución:** `[PC LOCAL]`
> **Ruta de Trabajo:** Carpeta donde guardaste tu archivo `.pem`

```bash
# [PC LOCAL] Conectarse por SSH
ssh -i "clave-diagramador-aws.pem" ec2-user@<TU_IP_PUBLICA>
```

Una vez dentro, moverse al directorio del proyecto:

```bash
# [SSH / SERVIDOR]
cd /home/ec2-user/app_diagramador
```

---

### 🚀 Paso 2: Respaldar la Base de Datos Relacional (Backup Preventivo)

> [!NOTE]
> **Propósito:** Generar una instantánea de seguridad de PostgreSQL antes de aplicar cambios de código o migraciones de esquema JPA.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`
> **Ruta de Trabajo:** `/home/ec2-user/app_diagramador`

```bash
# [SSH / SERVIDOR] Generar un volcado SQL con marca de tiempo
docker exec -t diag_postgres pg_dump -U postgres sw1_diag_clases_2026_2 > "backup_$(date +%Y%m%d_%H%M%S).sql"
```

> [!TIP]
> **Verificación Observable:**
> Comprueba que el archivo de respaldo se haya generado con tamaño superior a 0 bytes:
> ```bash
> ls -lh backup_*.sql
> ```

---

### 🚀 Paso 3: Descargar los Últimos Cambios desde `main-parcial2`

> [!NOTE]
> **Propósito:** Actualizar el código fuente local en el servidor con los commits más recientes de la rama `main-parcial2`.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`
> **Ruta de Trabajo:** `/home/ec2-user/app_diagramador`

```bash
# [SSH / SERVIDOR] 1. Asegurarse de estar en la rama correcta
git status

# 2. Obtener la última versión de main-parcial2
git pull origin main-parcial2
```

> [!TIP]
> **Verificación Observable:**
> Git debe indicar los archivos actualizados y finalizar con algo como:
> ```text
> Updating a1b2c3d..e4f5g6h
> Fast-forward
>  front_diag_clases/services/geminiDiagramService.ts | 15 +++--
>  ...
> ```
> Si aparece `Already up to date.` el servidor ya tenía la versión más reciente.

> [!CAUTION]
> Si aparece un conflicto de merge (poco probable en un servidor de producción), descarta los cambios locales y fuerza la actualización:
> ```bash
> git fetch origin
> git reset --hard origin/main-parcial2
> ```

---

### 🚀 Paso 4: Reconstruir y Reiniciar los Contenedores

> [!NOTE]
> **Propósito:** Recompilar las imágenes de Docker con el nuevo código (JAR de Spring Boot + bundle standalone de Next.js) y reemplazar los contenedores en caliente, **sin detener PostgreSQL**.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`
> **Ruta de Trabajo:** `/home/ec2-user/app_diagramador`

```bash
# [SSH / SERVIDOR] Reconstruir y reemplazar solo los servicios modificados
# PostgreSQL (diag_postgres) queda intacto gracias a --no-deps
sudo docker compose up -d --build --no-deps backend frontend proxy
```

> [!TIP]
> **Seguimiento en tiempo real del build:**
> ```bash
> sudo docker compose logs -f backend
> ```
> El backend estará listo cuando los logs muestren:
> ```text
> INFO  Started BackDiagramadorApplication in X.XXX seconds
> ```

> [!WARNING]
> Si el build falla con `compose build requires buildx 0.17.0 or later`, ejecutar el flujo de instalación de buildx documentado en [03_INSTALAR_HERRAMIENTAS.md](./03_INSTALAR_HERRAMIENTAS.md). Como alternativa temporal:
> ```bash
> # Usar docker compose v1 (sin plugin)
> sudo docker-compose up -d --build
> ```

---

### 🚀 Paso 5: Verificar que Todos los Servicios Estén Activos

> [!NOTE]
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`

```bash
# [SSH / SERVIDOR] Estado de todos los contenedores
sudo docker compose ps
```

**Estado esperado después de la actualización:**

```text
NAME            IMAGE                         STATUS                  PORTS
diag_postgres   postgres:16-alpine            Up (healthy)            5432/tcp
diag_backend    app_diagramador-backend       Up                      8080/tcp
diag_frontend   app_diagramador-frontend      Up                      3000/tcp
diag_proxy      nginx:alpine                  Up                      0.0.0.0:80->80/tcp
```

Luego verifica la conectividad HTTP desde el servidor o desde tu PC local:

```bash
# [SSH / SERVIDOR] Verificar API REST
curl -s -o /dev/null -w "%{http_code}" http://localhost/api/diagrams
# Resultado esperado: 200

# [PC LOCAL] Verificar frontend público
curl -I http://<TU_IP_PUBLICA>
# Resultado esperado: HTTP/1.1 200 OK
```

---

### 🚀 Paso 6: Limpiar Imágenes Docker Huérfanas

> [!NOTE]
> **Propósito:** Liberar espacio en el disco EBS eliminando las capas de imagen anteriores que ya no se usan tras el rebuild.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`

```bash
# [SSH / SERVIDOR] Eliminar imágenes y capas intermedias sin uso
sudo docker image prune -f
```

---

### 🚀 Paso 7: Procedimiento de Reversión (Rollback Inmediato)

> [!WARNING]
> **Protocolo de Emergencia ante Fallos Críticos:**
> Si la nueva versión desplegada presenta errores imprevistos en producción, sigue estos pasos para volver de inmediato al commit estable anterior:

**1. Identificar el commit anterior estable:**
```bash
# [SSH / SERVIDOR]
git log --oneline -n 10
```

**2. Revertir el código fuente al commit estable:**
```bash
# [SSH / SERVIDOR]
git checkout <HASH_DEL_COMMIT_ANTERIOR>
```

**3. Reconstruir los contenedores con la versión revertida:**
```bash
# [SSH / SERVIDOR]
sudo docker compose up -d --build --no-deps backend frontend proxy
```

**4. (Solo si hubo migración de esquema SQL) Restaurar el backup:**
```bash
# [SSH / SERVIDOR]
docker exec -i diag_postgres psql -U postgres sw1_diag_clases_2026_2 < backup_XXXXXXXX_XXXXXX.sql
```

**5. Volver a apuntar a la rama correcta tras el rollback:**
```bash
# [SSH / SERVIDOR]
git checkout main-parcial2
```

---

## 🧰 Referencia Rápida de Comandos

| Acción | Comando |
| :--- | :--- |
| Ver estado de contenedores | `sudo docker compose ps` |
| Ver logs del backend | `sudo docker compose logs -f backend` |
| Ver logs del frontend | `sudo docker compose logs -f frontend` |
| Reiniciar solo el backend | `sudo docker compose restart backend` |
| Reiniciar solo el frontend | `sudo docker compose restart frontend` |
| Reconstruir todo | `sudo docker compose up -d --build` |
| Parar todos sin borrar datos | `sudo docker compose down` |
| Parar y borrar volúmenes ⚠️ | `sudo docker compose down -v` |
| Limpiar imágenes huérfanas | `sudo docker image prune -f` |
| Ver rama git actual | `git branch` |
| Ver últimos commits | `git log --oneline -n 10` |

---

[⬅️ Volver a 04_DESPLEGAR_Y_VERIFICAR.md](./04_DESPLEGAR_Y_VERIFICAR.md) | [Siguiente: 06_APAGAR_Y_REACTIVAR.md ➡️](./06_APAGAR_Y_REACTIVAR.md)

