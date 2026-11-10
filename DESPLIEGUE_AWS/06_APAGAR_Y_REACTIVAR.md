# 🛑 06. Apagar y Reactivar Servicios en AWS

[⬅️ Volver a 05_ACTUALIZAR_PRODUCCION.md](./05_ACTUALIZAR_PRODUCCION.md) | [Siguiente: 07_FLUJO_VISUAL_DESPLIEGUE.html ➡️](./07_FLUJO_VISUAL_DESPLIEGUE.html)

---

Este documento detalla la gobernanza del ciclo de vida de la infraestructura en AWS, las mejores prácticas de control de costos, el apagado seguro y la reactivación completa de la plataforma sin pérdida de información.

---

### 💰 Diferencia Financiera: Detener (Stop) vs Terminar (Terminate)

> [!CAUTION]
> **COMPRENSIÓN CRÍTICA DE ACCIONES EN AWS EC2:**
> - **Detener (Stop instance):** Pone la máquina virtual en estado suspendido. **La CPU y la memoria RAM dejan de facturarse de inmediato**. El disco EBS (30 GB) y los datos en PostgreSQL se conservan intactos. La tabla de Amazon DynamoDB permanece disponible de forma serverless en su capa gratuita.
> - **Terminar (Terminate instance):** **DESTRUYE Y ELIMINA PERMANENTEMENTE** la máquina virtual y su disco EBS. Los contenedores y la base de datos PostgreSQL local se pierden para siempre a menos que tengas un snapshot.

---

### 🚀 Paso 1: Apagar la Aplicación y Detener la Instancia EC2

> [!NOTE]
> **Propósito:** Frenar la facturación de cómputo cuando el servidor no esté en uso (fines de semana, recesos o períodos de evaluación completados).
> **Contexto de Ejecución:** `[SSH / SERVIDOR]` y `[CONSOLA WEB AWS]`

1. **(Opcional pero recomendado) Detener los contenedores ordenadamente:**
   ```bash
   # [SSH / SERVIDOR]
   cd /home/ec2-user/app_diagramador
   docker compose down
   ```

2. **Detener la instancia en AWS:**
   - En la consola de **EC2**, ve a **Instances** > Selecciona tu instancia `diagramador-uml-servidor-prod`.
   - Haz clic en **Instance state** > **Stop instance**.
   - Confirma la acción. El estado cambiará de `Stopping` a `Stopped`.

---

### 🚀 Paso 2: Gobernanza y Costos de Amazon DynamoDB en Reposo

> [!TIP]
> **Ventaja de Servidor Cero (Serverless):**
> La tabla `DiagramChatMessages` de Amazon DynamoDB configurada en modo **On-demand** o con **5 RCU / 5 WCU** **NO genera costo alguno mientras no reciba tráfico**, y su almacenamiento de hasta 25 GB está cubierto por el beneficio permanente (*Always Free*) de AWS. No requieres apagar ni pausar DynamoDB.

---

### 🚀 Paso 3: Reactivar la Instancia y la Plataforma

> [!NOTE]
> **Propósito:** Encender el servidor y poner la plataforma al 100% operativa en minutos.
> **Contexto de Ejecución:** `[CONSOLA WEB AWS]` y `[SSH / SERVIDOR]`

1. **Encender la instancia:**
   - En la consola de **EC2**, selecciona tu instancia > **Instance state** > **Start instance**.
   - Espera a que el estado sea `Running` y los checks marquen `2/2 checks passed`.

2. **Verificar la Dirección IP Pública:**
   > [!IMPORTANT]
   > Al iniciar una instancia detenida en EC2 sin Elastic IP fija, AWS le asigna una **nueva dirección IPv4 pública**.
   - Anota la nueva IP pública visible en la consola (ej. `3.85.120.90`).
   - Si tienes un dominio configurado, actualiza el registro DNS tipo `A` para apuntar a la nueva IP.

3. **Verificación Automática de Contenedores:**
   Como configuramos `restart: always` en `docker-compose.yml` y el servicio `docker.service` está habilitado en `systemd`, **Docker iniciará automáticamente todos los contenedores tan pronto como arranque el sistema operativo**:
   ```bash
   # [SSH / SERVIDOR] Comprobar arranque automático
   ssh -i "clave-diagramador-aws.pem" ec2-user@<NUEVA_IP_PUBLICA>
   docker compose -f /home/ec2-user/app_diagramador/docker-compose.yml ps
   ```

4. **Verificación Observable Final:**
   Abre en tu navegador `http://<NUEVA_IP_PUBLICA>` y valida que el frontend y el chat colaborativo con DynamoDB respondan fluidamente.

---

[⬅️ Volver a 05_ACTUALIZAR_PRODUCCION.md](./05_ACTUALIZAR_PRODUCCION.md) | [Siguiente: 07_FLUJO_VISUAL_DESPLIEGUE.html ➡️](./07_FLUJO_VISUAL_DESPLIEGUE.html)
