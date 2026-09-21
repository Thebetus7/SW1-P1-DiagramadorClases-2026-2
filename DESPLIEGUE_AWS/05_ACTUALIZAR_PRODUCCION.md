# Paso 05: Procedimiento de Actualización ante Nuevos Cambios

Cada vez que agregues nuevas funciones, corrijas errores o realices ajustes en tu computadora local, debes aplicar este procedimiento estructurado para desplegar la última versión en tu servidor de AWS sin interrumpir la persistencia de datos de PostgreSQL.

---

## 💻 1. En tu Computadora Local (Desarrollo)

Una vez que hayas probado tus cambios localmente y estén listos para subir a GitHub:

```bash
# 1. Verificar los archivos modificados
git status

# 2. Agregar todos los cambios al área de preparación
git add .

# 3. Crear el commit con un mensaje descriptivo
git commit -m "feat: correcciones y mejoras en el editor de notas y diagramas"

# 4. Enviar los cambios a la rama principal de GitHub
git push origin main
```

---

## ☁️ 2. En el Servidor Cloud AWS (Sesión SSH)

Conéctate por SSH a tu instancia EC2 y ejecuta la secuencia de actualización:

```bash
# 1. Navegar a la carpeta del proyecto
cd /home/ec2-user/SW1-P1-DiagramadorClases-2026-2

# 2. Descargar los últimos cambios desde GitHub
git pull origin main

# 3. Reconstruir las imágenes con el nuevo código y reiniciar los contenedores
docker compose up -d --build

# 4. Verificar que todos los servicios sigan en ejecución
docker compose ps
```

> [!NOTE]
> La base de datos PostgreSQL **no pierde ninguna información** durante este proceso, ya que los datos están almacenados en el volumen externo `postgres_data`, el cual se mantiene intacto entre reconstrucciones.

---

## 🧹 3. Limpieza de Disco (Evitar que la Instancia se Llene)

Cada vez que Docker recompila imágenes, almacena capas antiguas e imágenes intermedias sin etiqueta (*dangling images*). En una máquina de 15-20 GB de disco, estas imágenes acumuladas pueden consumir varios gigabytes con el paso de los días.

Para mantener el disco limpio y optimizado, ejecuta periódicamente:

```bash
# Eliminar imágenes intermedias y contenedores detenidos que ya no se usan:
docker system prune -f
```

*(Este comando liberará de inmediato espacio en disco sin tocar tus contenedores activos ni tus datos de PostgreSQL).*

---

## ⚡ 4. Hoja de Atajos Rápida (Cheat Sheet para la Terminal SSH)

Copia y pega este único bloque en tu terminal SSH cada vez que hagas `git push` desde tu computadora:

```bash
cd /home/ec2-user/SW1-P1-DiagramadorClases-2026-2 && \
git pull origin main && \
docker compose up -d --build && \
docker system prune -f && \
docker compose logs --tail=30
```

---

> **Paso Anterior:** [04_DESPLEGAR_Y_VERIFICAR.md](./04_DESPLEGAR_Y_VERIFICAR.md)  
> **Volver al Índice:** [00_RESUMEN_GENERAL.md](./00_RESUMEN_GENERAL.md)  
> **Siguiente Paso:** [06_APAGAR_SERVICIOS.md](./06_APAGAR_SERVICIOS.md)
