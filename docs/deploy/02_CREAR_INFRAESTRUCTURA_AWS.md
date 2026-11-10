# ☁️ 02. Crear Infraestructura en AWS (Amazon Linux 2023 & DynamoDB)

[⬅️ Volver a 01_CONFIGURAR_PROYECTO.md](./01_CONFIGURAR_PROYECTO.md) | [Siguiente: 03_INSTALAR_HERRAMIENTAS.md ➡️](./03_INSTALAR_HERRAMIENTAS.md)

---

Este documento detalla el aprovisionamiento de los recursos en la nube de Amazon Web Services (AWS): la creación de la tabla en **Amazon DynamoDB**, la configuración de **IAM Roles** y el lanzamiento de la instancia **EC2 con Amazon Linux 2023 (AL2023)**.

---

### 🚀 Paso 1: Crear la Tabla en Amazon DynamoDB

> [!NOTE]
> **Propósito:** Alojar de manera persistente, escalable y sin servidor (Serverless) los mensajes de chat colaborativo y las propuestas de la IA.
> **Contexto de Ejecución:** `[CONSOLA WEB AWS]` o `[AWS CLI]`
> **Región:** `us-east-1` (Norte de Virginia) u otra región de tu elección

#### Opción A: Vía Consola Web de AWS
1. Ingresa a la **Consola de AWS** y busca el servicio **DynamoDB**.
2. Haz clic en **Create table** (Crear tabla) y configura:
   - **Table name (Nombre de la tabla):** `DiagramChatMessages`
   - **Partition key (Clave de partición):** `diagramId` (Tipo: **Number** / Número)
   - **Sort key (Clave de ordenación):** `createdAt` (Tipo: **String** / Cadena)
   - **Table settings (Configuración de tabla):** Selecciona **Customize settings** (Personalizar configuración).
   - **Capacity mode (Modo de capacidad):** Selecciona **On-demand** (Bajo demanda) para evitar cargos fijos o **Provisioned** con 5 RCU / 5 WCU (incluido en la Capa Gratuita).
3. **Crear el Índice Global Secundario (GSI):**
   - En la sección **Global secondary indexes** (Índices secundarios globales), haz clic en **Create index**.
   - **Partition key:** `id` (Tipo: **String**)
   - **Index name:** `MessageIdIndex`
   - **Projected attributes:** **All** (Todos los atributos)
4. Haz clic en **Create table**.

#### Opción B: Vía AWS CLI
Si tienes AWS CLI configurado en tu terminal local:

```bash
# [PC LOCAL] Crear la tabla con GSI y modo On-Demand
aws dynamodb create-table \
    --table-name DiagramChatMessages \
    --attribute-definitions \
        AttributeName=diagramId,AttributeType=N \
        AttributeName=createdAt,AttributeType=S \
        AttributeName=id,AttributeType=S \
    --key-schema \
        AttributeName=diagramId,KeyType=HASH \
        AttributeName=createdAt,KeyType=RANGE \
    --global-secondary-indexes \
        "[{\"IndexName\": \"MessageIdIndex\", \"KeySchema\": [{\"AttributeName\": \"id\", \"KeyType\": \"HASH\"}], \"Projection\": {\"ProjectionType\": \"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

> [!TIP]
> **Verificación Observable:**
> Ejecuta el comando para verificar que el estado de la tabla sea `ACTIVE`:
> ```bash
> aws dynamodb describe-table --table-name DiagramChatMessages --region us-east-1 --query "Table.TableStatus"
> # Salida esperada: "ACTIVE"
> ```

---

### 🚀 Paso 2: Crear el Rol IAM para la Instancia EC2 (Acceso Seguro a DynamoDB)

> [!NOTE]
> **Propósito:** Permitir que la instancia EC2 interactúe con DynamoDB sin almacenar claves estáticas (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) en archivos de texto.
> **Contexto de Ejecución:** `[CONSOLA WEB AWS - IAM]`

1. Ve a **IAM** > **Roles** > **Create role** (Crear rol).
2. **Trusted entity type (Tipo de entidad de confianza):** Selecciona **AWS service** (Servicio de AWS).
3. **Use case (Caso de uso):** Selecciona **EC2** y haz clic en **Next**.
4. **Permissions (Permisos):**
   - Para máxima restricción de seguridad, crea una política inline llamada `DynamoDBChatPolicy` con este JSON:
   ```json
   {
       "Version": "2012-10-17",
       "Statement": [
           {
               "Sid": "AllowDynamoDBChatTableAccess",
               "Effect": "Allow",
               "Action": [
                   "dynamodb:CreateTable",
                   "dynamodb:DescribeTable",
                   "dynamodb:GetItem",
                   "dynamodb:PutItem",
                   "dynamodb:UpdateItem",
                   "dynamodb:DeleteItem",
                   "dynamodb:Query",
                   "dynamodb:Scan"
               ],
               "Resource": [
                   "arn:aws:dynamodb:*:*:table/DiagramChatMessages",
                   "arn:aws:dynamodb:*:*:table/DiagramChatMessages/index/*"
               ]
           }
       ]
   }
   ```
   *(Alternativa rápida para laboratorio: Asignar la política administrada `AmazonDynamoDBFullAccess`)*.
5. **Role name (Nombre del rol):** Asigna `EC2-DynamoDB-Diagramador-Role` y haz clic en **Create role**.

---

### 🚀 Paso 3: Crear el Security Group (Firewall de Red)

> [!NOTE]
> **Propósito:** Proteger la máquina virtual restringiendo los accesos entrantes únicamente a los puertos requeridos.
> **Contexto de Ejecución:** `[CONSOLA WEB AWS - EC2]`

1. En la consola de **EC2**, ve a **Network & Security** > **Security Groups** > **Create security group**.
2. **Security group name:** `secgroup-diagramador-uml-prod` *(o `diagramador-uml-prod-sg`)*
   > [!NOTE]
   > AWS reserva el prefijo `sg-` para los IDs generados por el sistema (ej. `sg-0a1b2c3d4e`), por lo que no permite nombres que comiencen por `sg-`.
3. **Description:** `Permitir SSH, HTTP y HTTPS para Diagramador UML`
4. **VPC:** Deja la VPC por defecto.
5. **Inbound rules (Reglas de entrada):**
   - **Regla 1 (SSH):** Tipo: `SSH`, Puerto: `22`, Origen: `Anywhere-IPv4` (`0.0.0.0/0`) o `My IP`.
   - **Regla 2 (HTTP):** Tipo: `HTTP`, Puerto: `80`, Origen: `Anywhere-IPv4` (`0.0.0.0/0`).
   - **Regla 3 (HTTPS):** Tipo: `HTTPS`, Puerto: `443`, Origen: `Anywhere-IPv4` (`0.0.0.0/0`).
6. **Outbound rules (Reglas de salida):** Mantén la regla por defecto: `All traffic` (`0.0.0.0/0`) para que la instancia pueda comunicarse con los repositorios de paquetes y los endpoints de AWS DynamoDB.
7. Haz clic en **Create security group**.

---

### 🚀 Paso 4: Lanzar la Instancia EC2 con Amazon Linux 2023

> [!NOTE]
> **Propósito:** Desplegar el servidor anfitrión con el sistema operativo moderno optimizado de AWS.
> **Contexto de Ejecución:** `[CONSOLA WEB AWS - EC2]`

1. En el panel de **EC2**, haz clic en **Launch Instance** (Lanzar instancia).
2. **Name (Nombre):** `diagramador-uml-servidor-prod`
3. **Application and OS Images (AMI):**
   - Selecciona **Amazon Linux**.
   - En **Amazon Linux AMI**, elige estrictamente: **Amazon Linux 2023 AMI** (Kernel 6.1, compatible con Capa Gratuita).
   - **Architecture:** `64-bit (x86)`.
4. **Instance type (Tipo de instancia):**
   - `t3.small` (Recomendada: 2 vCPU, 2 GB RAM para compilar fluidamente) o `t2.micro` / `t3.micro` (Apta para Capa Gratuita, requerirá activar Swap).
5. **Key pair (Par de claves):**
   - Selecciona un par existente o haz clic en **Create new key pair**.
   - Nombre: `clave-diagramador-aws`.
   - Tipo: `RSA`, Formato: `.pem` (para OpenSSH / Linux / macOS / Windows Terminal).
   - **Descarga el archivo `.pem` y guárdalo en un lugar seguro.**
6. **Network settings (Configuración de red):**
   - Haz clic en **Edit**.
   - Selecciona el Security Group creado en el paso anterior: `secgroup-diagramador-uml-prod`.
   - **Auto-assign public IP:** Asegúrate de que esté en **Enable** (Habilitado).
7. **Configure storage (Almacenamiento):**
   - Asigna **30 GiB** de tipo **gp3** (el límite máximo mensual gratuito en EBS).
8. **Advanced details (Detalles avanzados):**
   - En **IAM instance profile**, selecciona el rol que creamos en el Paso 2: `EC2-DynamoDB-Diagramador-Role`.
9. Haz clic en **Launch Instance**.

> [!TIP]
> **Verificación Observable:**
> En la lista de instancias de EC2, espera aproximadamente 1 a 2 minutos hasta que el campo **Instance state** muestre `Running` y **Status check** muestre `2/2 checks passed`. Copia la **Public IPv4 address** asignada (ejemplo: `54.210.120.45`).

---

[⬅️ Volver a 01_CONFIGURAR_PROYECTO.md](./01_CONFIGURAR_PROYECTO.md) | [Siguiente: 03_INSTALAR_HERRAMIENTAS.md ➡️](./03_INSTALAR_HERRAMIENTAS.md)

