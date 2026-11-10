# 🔄 05. Actualizar el Proyecto en Producción

[⬅️ Volver a 04_DESPLEGAR_Y_VERIFICAR.md](./04_DESPLEGAR_Y_VERIFICAR.md) | [Siguiente: 06_APAGAR_Y_REACTIVAR.md ➡️](./06_APAGAR_Y_REACTIVAR.md)

---

Este documento describe el procedimiento estándar para desplegar nuevas versiones de código (frontend o backend) en el servidor de producción **sin perder datos en PostgreSQL ni en Amazon DynamoDB**.

---

### 🚀 Paso 1: Respaldar la Base de Datos Relacional (Backup Preventivo)

> [!NOTE]
> **Propósito:** Generar una instantánea de seguridad de la base de datos PostgreSQL antes de aplicar cambios de código o migraciones de esquema JPA.
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

### 🚀 Paso 2: Descargar los Últimos Cambios de Git

> [!NOTE]
> **Propósito:** Actualizar el código fuente local en el servidor con los cambios confirmados en la rama principal (`main`).
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`
> **Ruta de Trabajo:** `/home/ec2-user/app_diagramador`

```bash
# [SSH / SERVIDOR] Obtener la última versión del repositorio
git pull origin main
```

> [!TIP]
> **Verificación Observable:**
> Git indicará los archivos actualizados y finalizará con:
> ```text
> Updating XXXXXXX..YYYYYYY
> Fast-forward
> ```

---

### 🚀 Paso 3: Reconstruir y Reiniciar los Servicios Afectados

> [!NOTE]
> **Propósito:** Reconstruir únicamente los contenedores modificados y reemplazarlos en caliente sin detener la base de datos ni afectar DynamoDB.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`
> **Ruta de Trabajo:** `/home/ec2-user/app_diagramador`

```bash
# [SSH / SERVIDOR] Recompilar e iniciar sin detener la base de datos
docker compose up -d --build --no-deps backend frontend proxy
```

> [!TIP]
> **Verificación Observable:**
> Comprueba el estado con `docker compose ps`. Los servicios `diag_backend` y `diag_frontend` deben mostrar tiempo de actividad reciente (`Up 10 seconds`), mientras que `diag_postgres` debe permanecer ininterrumpido.

---

### 🚀 Paso 4: Limpieza de Imágenes Huérfanas de Docker

> [!NOTE]
> **Propósito:** Liberar espacio en el disco EBS eliminando las capas previas no utilizadas tras la compilación.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`

```bash
# [SSH / SERVIDOR] Eliminar imágenes y capas intermedias sin uso
docker image prune -f
```

---

### 🚀 Paso 5: Procedimiento de Reversión (Rollback Inmediato)

> [!WARNING]
> **Protocolo de Emergencia ante Fallos Críticos:**
> Si la nueva versión desplegada presenta errores imprevistos en producción, sigue estos pasos para volver de inmediato a la versión estable anterior:

1. **Revertir el código fuente:**
   ```bash
   git log --oneline -n 5
   # Identifica el commit previo estable y regresa a él
   git checkout <HASH_DEL_COMMIT_ANTERIOR>
   ```
2. **Reconstruir los contenedores estables:**
   ```bash
   docker compose up -d --build
   ```
3. **Restaurar el respaldo SQL (si hubo alteración de datos):**
   ```bash
   docker exec -i diag_postgres psql -U postgres sw1_diag_clases_2026_2 < backup_XXXXXXXX_XXXXXX.sql
   ```

---

[⬅️ Volver a 04_DESPLEGAR_Y_VERIFICAR.md](./04_DESPLEGAR_Y_VERIFICAR.md) | [Siguiente: 06_APAGAR_Y_REACTIVAR.md ➡️](./06_APAGAR_Y_REACTIVAR.md)

