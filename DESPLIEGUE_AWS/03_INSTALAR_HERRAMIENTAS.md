# 🔧 03. Instalar Herramientas en Amazon Linux 2023

[⬅️ Volver a 02_CREAR_INFRAESTRUCTURA_AWS.md](./02_CREAR_INFRAESTRUCTURA_AWS.md) | [Siguiente: 04_DESPLEGAR_Y_VERIFICAR.md ➡️](./04_DESPLEGAR_Y_VERIFICAR.md)

---

Este documento detalla el aprovisionamiento del sistema operativo **Amazon Linux 2023 (AL2023)** a través de SSH, la configuración de memoria de intercambio (*Swap*) de seguridad y la instalación oficial de **Docker Engine**, **Docker Compose** y **Git**.

---

### 🚀 Paso 1: Conexión SSH Segura al Servidor

> [!NOTE]
> **Propósito:** Iniciar sesión en la consola del servidor remoto como usuario administrador predeterminado (`ec2-user`).
> **Contexto de Ejecución:** `[PC LOCAL]`
> **Ruta de Trabajo:** Carpeta donde descargaste tu archivo `clave-diagramador-aws.pem`

En sistemas Unix / macOS o terminal PowerShell / Git Bash de Windows:

```bash
# [PC LOCAL] 1. Ajustar permisos del archivo de clave privada (solo lectura para el propietario)
chmod 400 clave-diagramador-aws.pem

# [PC LOCAL] 2. Conectarse vía SSH a la IP pública de la instancia EC2
ssh -i "clave-diagramador-aws.pem" ec2-user@<TU_IP_PUBLICA>
```

> [!TIP]
> **Verificación Observable:**
> La consola debe mostrar el banner oficial de bienvenida de AWS:
> ```text
>    ,     #_
>    ~\_  ####_        Amazon Linux 2023
>   ~~  \ _#####\
>   ~~     \###|       AL2023 AMI
>   ~~       \#/ ___
>    ~~       V~' '->
>     ~~~         /
>       ~~       /
>        '--____/
> [ec2-user@ip-172-31-XX-XX ~]$
> ```

---

### 🚀 Paso 2: Actualizar el Sistema Operativo (AL2023)

> [!NOTE]
> **Propósito:** Instalar las últimas actualizaciones de seguridad y paquetes base usando el gestor `dnf` nativo de Amazon Linux 2023.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`

```bash
# [SSH / SERVIDOR] Actualizar paquetes del sistema
sudo dnf update -y
```

> [!TIP]
> **Verificación Observable:**
> El comando finalizará con el mensaje:
> ```text
> Complete!
> Nothing to do. Complete!
> ```

---

### 🚀 Paso 3: Configurar Memoria Swap de Seguridad (2 GB)

> [!IMPORTANT]
> **Prevención de Caídas por Out-Of-Memory (OOM):**
> Compilar aplicaciones Next.js y empaquetar Spring Boot consume picos de memoria RAM. En instancias con 1 GB o 2 GB de RAM (como `t2.micro` o `t3.micro`), crear un archivo Swap de 2 GB evita que el compilador sea terminado por el kernel de Linux.

> [!NOTE]
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`

```bash
# [SSH / SERVIDOR] Crear archivo de intercambio de 2GB
sudo dd if=/dev/zero of=/swapfile bs=128M count=16

# Ajustar permisos de lectura estricta
sudo chmod 600 /swapfile

# Inicializar y habilitar el espacio swap
sudo mkswap /swapfile
sudo swapon /swapfile

# Configurar persistencia tras reinicios en fstab
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

> [!TIP]
> **Verificación Observable:**
> Ejecuta `free -h` y comprueba que la línea `Swap` indique aproximadamente `2.0Gi`:
> ```bash
> free -h
> # Salida esperada:
> #               total        used        free      shared  buff/cache   available
> # Mem:          950Mi       210Mi       140Mi       1.0Mi       600Mi       610Mi
> # Swap:         2.0Gi          0B       2.0Gi
> ```

---

### 🚀 Paso 4: Instalar Docker Engine, Docker Compose Plugin y Git

> [!NOTE]
> **Propósito:** Instalar el motor de contenedores oficial distribuido en los repositorios certificados de Amazon Linux 2023.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`

En Amazon Linux 2023, Docker se encuentra optimizado en el repositorio base:

```bash
# [SSH / SERVIDOR] 1. Instalar Docker y Git mediante dnf
sudo dnf install -y docker git

# [SSH / SERVIDOR] 2. Instalar el plugin oficial Docker Compose v2
DOCKER_CONFIG=${DOCKER_CONFIG:-/usr/local/lib/docker}
sudo mkdir -p $DOCKER_CONFIG/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) -o $DOCKER_CONFIG/cli-plugins/docker-compose
sudo chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

# [SSH / SERVIDOR] 3. Iniciar y habilitar el servicio Docker para arranque automático
sudo systemctl enable --now docker

# [SSH / SERVIDOR] 4. Agregar el usuario ec2-user al grupo docker para operar sin sudo
sudo usermod -aG docker ec2-user
```

> [!CAUTION]
> **Aplicar Cambios de Grupo:**
> Para que los permisos de grupo surtan efecto sin cerrar la sesión SSH, ejecuta:
> ```bash
> newgrp docker
> ```

---

### 🚀 Paso 5: Tabla de Verificación de Herramientas Instaladas

> [!NOTE]
> **Propósito:** Confirmar de forma observable que todas las herramientas están operativas.
> **Contexto de Ejecución:** `[SSH / SERVIDOR]`

Ejecuta los siguientes comandos de auditoría:

```bash
# [SSH / SERVIDOR] Validar versiones
docker --version
docker compose version
git --version
```

| Herramienta | Comando de Auditoría | Salida Mínima Esperada |
| :--- | :--- | :--- |
| **Docker Engine** | `docker --version` | `Docker version 25.x` o superior |
| **Docker Compose** | `docker compose version` | `Docker Compose version v2.x` |
| **Git** | `git --version` | `git version 2.40.x` o superior |
| **Demonio Docker** | `docker ps` | `CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES` |

---

[⬅️ Volver a 02_CREAR_INFRAESTRUCTURA_AWS.md](./02_CREAR_INFRAESTRUCTURA_AWS.md) | [Siguiente: 04_DESPLEGAR_Y_VERIFICAR.md ➡️](./04_DESPLEGAR_Y_VERIFICAR.md)

