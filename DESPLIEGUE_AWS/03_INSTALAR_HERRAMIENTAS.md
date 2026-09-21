# Paso 03: Conexión SSH e Instalación de Herramientas en Amazon Linux 2023

En este paso aprenderás a conectarte remotamente a tu servidor EC2 mediante SSH, configurar **memoria SWAP** para evitar caídas por falta de memoria (Out Of Memory), e instalar **Docker**, **Docker Compose** y el complemento **Docker Buildx** requerido en Amazon Linux 2023.

---

## 🔑 1. Conexión Remota por SSH a la Instancia

Abre tu terminal en la carpeta donde descargaste tu archivo `clave-diagramador-aws.pem`.

### A. Si usas Windows (PowerShell):
En Windows, si la clave tiene permisos demasiado abiertos, OpenSSH puede arrojar un error de advertencia. Puedes conectarte directamente con:

```powershell
ssh -i "clave-diagramador-aws.pem" ec2-user@<TU_IP_PUBLICA_EC2>
```

> *Ejemplo:*  
> `ssh -i "clave-diagramador-aws.pem" ec2-user@54.210.88.145`

Si PowerShell muestra un error indicando *"Permissions for clave-diagramador-aws.pem are too open"*, ejecuta estos comandos para restringir los permisos en Windows:
```powershell
icacls "clave-diagramador-aws.pem" /inheritance:r
icacls "clave-diagramador-aws.pem" /grant:r "$($env:USERNAME):(R)"
```

### B. Si usas Linux o macOS:
Asegura permisos de solo lectura al propietario y conéctate:
```bash
chmod 400 clave-diagramador-aws.pem
ssh -i clave-diagramador-aws.pem ec2-user@<TU_IP_PUBLICA_EC2>
```

> [!TIP]
> Cuando te pregunte: `Are you sure you want to continue connecting (yes/no/[fingerprint])?`, escribe **`yes`** y presiona `Enter`. Verás el banner de bienvenida con el logotipo de **Amazon Linux 2023**.

---

## ⚡ 2. Configuración OBLIGATORIA de Memoria SWAP (2 GB)

Las instancias de la capa gratuita (`t2.micro` o `t3.micro`) cuentan únicamente con **1 GiB de memoria RAM física**. La compilación de TypeScript en Next.js y el empaquetado Maven de Spring Boot consumen más de 1 GB durante el proceso de build. Sin memoria de intercambio, el kernel de Linux activará el *OOM Killer* y cancelará la compilación.

Ejecuta los siguientes comandos en tu terminal SSH para habilitar 2 GB de memoria SWAP:

```bash
# 1. Crear un archivo de swap de 2 GB (16 bloques de 128 MB)
sudo dd if=/dev/zero of=/swapfile bs=128M count=16

# 2. Asignar permisos estrictos de lectura y escritura solo para root
sudo chmod 600 /swapfile

# 3. Formatear el archivo como espacio de intercambio SWAP
sudo mkswap /swapfile

# 4. Activar el espacio SWAP en el sistema
sudo swapon /swapfile

# 5. Registrar en fstab para que persista automáticamente ante reinicios
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# 6. Optimizar la agresividad de swap (swappiness)
sudo sysctl vm.swappiness=20
echo 'vm.swappiness=20' | sudo tee -a /etc/sysctl.conf
```

Verifica que el swap esté activo ejecutando:
```bash
free -h
```
*(Debes observar en la fila `Swap:` un total cercano a `2.0Gi`).*

---

## 📦 3. Actualización de Paquetes e Instalación de Herramientas Base

Amazon Linux 2023 utiliza el gestor de paquetes **`dnf`**. Actualiza el sistema e instala Git y Docker:

```bash
# 1. Actualizar repositorios y paquetes instalados
sudo dnf update -y

# 2. Instalar Git y Docker nativo de los repositorios de Amazon Linux 2023
sudo dnf install -y git docker
```

---

## 🐳 4. Iniciar Docker y Configurar Permisos de Usuario

```bash
# 1. Iniciar el servicio de Docker
sudo systemctl start docker

# 2. Habilitar Docker para que inicie automáticamente al encender el servidor
sudo systemctl enable docker

# 3. Agregar el usuario actual (ec2-user) al grupo docker para usar comandos sin 'sudo'
sudo usermod -aG docker ec2-user

# 4. Refrescar el grupo en la sesión actual sin necesidad de reconectarse
newgrp docker
```

---

## 🛠️ 5. Solución Crítica en Amazon Linux 2023: Instalación de Docker Compose y Buildx

> [!WARNING]
> En Amazon Linux 2023, el paquete Docker no incluye la versión moderna de **Buildx**, lo que provoca el error:  
> `compose build requires buildx 0.17.0 or later`.  
> Para evitar cualquier fallo, instalamos los complementos CLI oficiales más recientes:

Ejecuta este bloque de comandos para instalar **Docker Compose CLI** y **Docker Buildx**:

```bash
# 1. Crear directorio para complementos de Docker CLI
sudo mkdir -p /usr/local/lib/docker/cli-plugins

# 2. Descargar Docker Compose v2 (última versión estable para Linux x86_64)
sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose

# 3. Descargar Docker Buildx (última versión estable >= 0.17.0)
sudo curl -SL "https://github.com/docker/buildx/releases/latest/download/buildx-v0.21.1.linux-amd64" \
  -o /usr/local/lib/docker/cli-plugins/docker-buildx

# 4. Asignar permisos de ejecución a ambos complementos
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx

# 5. Crear enlace simbólico para que el comando clásico 'docker-compose' también funcione
sudo ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose
```

---

## ✅ 6. Checklist de Verificación de Instalación

Ejecuta los siguientes comandos para certificar que tu servidor está completamente preparado:

| Comando | Salida Esperada | Estado |
| :--- | :--- | :--- |
| `git --version` | `git version 2.4X.X` | Requerido |
| `docker --version` | `Docker version 25.X.X` o superior | Requerido |
| `docker compose version` | `Docker Compose version v2.X.X` | Requerido |
| `docker buildx version` | `github.com/docker/buildx v0.2X.X` | Requerido |
| `free -h` | `Swap: 2.0Gi` | Requerido |

```bash
# Ejecutar verificación rápida completa:
docker --version && docker compose version && docker buildx version && free -h
```

---

> **Paso Anterior:** [02_CREAR_INSTANCIA_AWS.md](./02_CREAR_INSTANCIA_AWS.md)  
> **Volver al Índice:** [00_RESUMEN_GENERAL.md](./00_RESUMEN_GENERAL.md)  
> **Siguiente Paso:** [04_DESPLEGAR_Y_VERIFICAR.md](./04_DESPLEGAR_Y_VERIFICAR.md)
