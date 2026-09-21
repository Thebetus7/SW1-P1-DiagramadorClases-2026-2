# Paso 02: Creación de la Instancia EC2 en AWS (Amazon Linux 2023)

En este paso aprenderás a aprovisionar una máquina virtual en **Amazon Web Services (AWS EC2)** utilizando la imagen oficial **Amazon Linux 2023**, configurando el cortafuegos (*Security Group*) y descargando la clave SSH necesaria para acceder.

---

## 📋 Requisitos Previos

- Una cuenta activa en [AWS Console](https://aws.amazon.com/console/).
- Navegador web en tu computadora local.
- Terminal local: **PowerShell** (Windows) o **Terminal** (macOS/Linux).

---

## 🖥️ Guía Paso a Paso en la Consola Web de AWS

### 1. Navegar al Servicio EC2
1. Inicia sesión en la **Consola de Administración de AWS**.
2. En la barra superior de búsqueda, escribe `EC2` y selecciona el primer resultado (**EC2 - Virtual Servers in the Cloud**).
3. En el selector de región ubicado en la barra superior (esquina superior derecha), selecciona la región **Ohio (`us-east-2`)**.
   > [!IMPORTANT]
   > Mantén siempre seleccionada la región **EE. UU. Este (Ohio) `us-east-2`** para que tu instancia EC2, par de claves (.pem) y Security Group se creen en el mismo lugar y no se pierdan de vista en la consola.

---

### 2. Lanzar una Nueva Instancia
1. En el panel lateral izquierdo, haz clic en **"Instances"** (Instancias).
2. En la esquina superior derecha, haz clic en el botón naranja destacado que dice **"Launch instances"** (Lanzar instancias).

---

### 3. Nombre de la Instancia
- En la sección **"Name and tags"**:
  - En el campo de texto **Name**, escribe un identificador claro, por ejemplo:  
    `diagramador-uml-servidor`

---

### 4. Selección de Sistema Operativo (AMI)
En la sección **"Application and OS Images (Amazon Machine Image)"**:
1. Asegúrate de que esté seleccionada la pestaña **"Quick Start"**.
2. Haz clic sobre el recuadro **"Amazon Linux"** (icono del pingüino/logotipo de AWS).
3. En el menú desplegable **Amazon Machine Image (AMI)**, selecciona:
   - **Amazon Linux 2023 AMI** (Verifica que tenga la etiqueta verde **"Free tier eligible"** / Apto para la capa gratuita).
4. **Architecture:** Deja seleccionada la opción **64-bit (x86)**.

> [!IMPORTANT]
> Selecciona estrictamente **Amazon Linux 2023 (AL2023)**. No selecciones Amazon Linux 2 (antiguo) ni otras distribuciones, ya que los comandos de paquetes (`dnf`) y el parche de Docker Buildx están adaptados a AL2023.

---

### 5. Tipo de Instancia (Hardware)
En la sección **"Instance type"**:
- En el menú desplegable, selecciona:
  - **`t3.micro`** (o **`t2.micro`** según disponibilidad en tu región).
  - Ambas cuentan con **1 vCPU y 1 GiB de memoria RAM**, catalogadas como **"Free tier eligible"**.

---

### 6. Par de Claves SSH (Key Pair)
En la sección **"Key pair (login)"**:
1. Si no tienes una clave previa, haz clic en el enlace azul a la derecha: **"Create new key pair"** (Crear nuevo par de claves).
2. Se abrirá una ventana emergente:
   - **Key pair name:** Escribe `clave-diagramador-aws`.
   - **Key pair type:** Selecciona **RSA**.
   - **Private key file format:**
     - Selecciona **`.pem`** (Funciona nativamente en PowerShell de Windows 10/11, macOS y Linux con OpenSSH).
3. Haz clic en el botón naranja **"Create key pair"**.
4. Tu navegador descargará automáticamente el archivo `clave-diagramador-aws.pem`.

> [!CAUTION]
> **Guarda este archivo `.pem` en un lugar seguro** (ej. en tu carpeta `C:\Users\TU_USUARIO\.ssh\` o en una carpeta de tu proyecto). AWS **no te permitirá volver a descargar esta clave privada**. Si la pierdes, perderás el acceso a la máquina virtual.

---

### 7. Configuración de Red y Firewall (Security Group)
En la sección **"Network settings"**:
1. Haz clic en **"Edit"** (Editar) en la esquina superior derecha del bloque de red.
2. Selecciona **"Create security group"** (Crear grupo de seguridad).
   - **Security group name:** `sg-diagramador-uml`
   - **Description:** `Permitir SSH en puerto 22 y HTTP en puerto 80 para el diagramador`
3. Configura las siguientes dos reglas de entrada obligatorias:

| Regla | Type (Tipo) | Protocol (Protocolo) | Port Range (Puerto) | Source Type (Origen) | Source (CIDR) | Justificación |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Regla 1** | **SSH** | TCP | `22` | **Anywhere** (o My IP) | `0.0.0.0/0` | Conexión remota por consola desde tu terminal |
| **Regla 2** | **HTTP** | TCP | `80` | **Anywhere** | `0.0.0.0/0` | Acceso público de profesores y alumnos a la aplicación web |

> [!TIP]
> Gracias a que utilizaremos **Nginx como Reverse Proxy**, **NO** necesitas abrir los puertos `8080` (Spring Boot), `3000` (Next.js) ni `5432` (PostgreSQL). Todo el tráfico público ingresará limpiamente por el puerto `80`.

---

### 8. Almacenamiento (EBS / Disco)
En la sección **"Configure storage"**:
1. Por defecto aparece `1x 8 GiB gp3`.
2. Modifica el tamaño de `8` a **`15` GiB** o **`20` GiB** tipo `gp3`.
   *(La capa gratuita de AWS incluye hasta 30 GiB de almacenamiento EBS al mes sin costo).*
3. Haz clic en la flecha para desplegar opciones avanzadas y verifica que la opción **"Delete on termination"** esté marcada en **Yes** (para que el disco se elimine automáticamente si algún día terminas la instancia y no genere cobros huérfanos).

---

### 9. Lanzar la Instancia y Obtener la IP Pública
1. En el panel lateral derecho (**Summary**), revisa que todo esté correcto y haz clic en el botón naranja grande **"Launch instance"** (Lanzar instancia).
2. Espera unos segundos hasta ver el mensaje verde de éxito: *"Successfully initiated launch of instance"*.
3. Haz clic en el botón inferior **"View all instances"** (Ver todas las instancias).
4. En la tabla de instancias:
   - Espera cerca de 1 o 2 minutos hasta que la columna **Instance state** pase de *Pending* a **Running** (verde).
   - Haz clic sobre la fila de tu instancia.
   - En la pestaña inferior **"Details"**, localiza y copia el valor de:
     - **Public IPv4 address** (Dirección IPv4 pública, ej: `54.210.88.145`).

---

> **Paso Anterior:** [01_CONFIGURAR_PROYECTO.md](./01_CONFIGURAR_PROYECTO.md)  
> **Volver al Índice:** [00_RESUMEN_GENERAL.md](./00_RESUMEN_GENERAL.md)  
> **Siguiente Paso:** [03_INSTALAR_HERRAMIENTAS.md](./03_INSTALAR_HERRAMIENTAS.md)
