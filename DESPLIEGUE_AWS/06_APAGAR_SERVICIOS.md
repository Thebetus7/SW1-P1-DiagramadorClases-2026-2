# Paso 06: Apagado, Reactivación y Control de Costos en AWS

Este documento es esencial para garantizar que tu experiencia en AWS sea **completamente gratuita ($0.00 USD)**, evitando facturaciones no deseadas una vez que termines tus pruebas o concluya la presentación del examen universitario.

---

## 📊 1. Comparativa: Detener (Stop) vs. Terminar (Terminate)

| Característica | Detener Instancia (**Stop**) | Terminar Instancia (**Terminate**) |
| :--- | :--- | :--- |
| **Estado del Servidor** | Pausado / Apagado (Como apagar tu PC). | Destruido y eliminado permanentemente de AWS. |
| **Cómputo (vCPU / RAM)** | **$0.00 USD** (No consume horas de cómputo). | **$0.00 USD** (Cero recursos). |
| **Disco y Base de Datos** | Se conserva intacto en el disco EBS. | Se destruye por completo junto con la base de datos. |
| **IP Pública** | Se libera. Al volver a encender, recibirá una **nueva IP pública**. | Se libera permanentemente. |
| **¿Cuándo utilizarlo?** | Al finalizar una sesión de desarrollo, por las noches o mientras esperas el día del examen. | **Cuando el examen o semestre haya finalizado definitivamente.** |

---

## ⏸️ 2. Cómo Pausar la Instancia (Stop Instance)

Cuando no estés utilizando el servidor (por ejemplo, después de estudiar):

1. Ingresa a la **Consola de AWS > EC2 > Instances**.
2. Selecciona la casilla de verificación a la izquierda de tu instancia (`diagramador-uml-servidor`).
3. En la esquina superior derecha, haz clic en el menú desplegable **"Instance state"** (Estado de la instancia).
4. Selecciona la opción **"Stop instance"** (Detener instancia).
5. Confirma en el diálogo emergente haciendo clic en el botón naranja **"Stop"**.
6. En 30-60 segundos verás que el estado cambia a **Stopped** (rojo/gris).

---

## ▶️ 3. Cómo Reactivar la Instancia (Start Instance) y Nueva IP

El día de tu examen o cuando quieras volver a probar:

1. Ve a **Consola de AWS > EC2 > Instances**.
2. Selecciona tu instancia en estado **Stopped**.
3. Haz clic en **"Instance state" > "Start instance"** (Iniciar instancia).
4. Espera a que pase a estado **Running** (verde).
5. **Copia la nueva dirección IPv4 Pública:**  
   *(Al reiniciar una instancia sin IP elástica, AWS le asigna una nueva IP pública automáticamente).*
6. **Tus servicios se levantarán solos:**  
   Como configuramos `restart: always` en `docker-compose.yml`, Docker iniciará automáticamente los 4 contenedores (PostgreSQL, Spring Boot, Next.js y Nginx) al arrancar el sistema operativo.
7. Abre en tu navegador:
   ```
   http://<NUEVA_IP_PUBLICA>
   ```

---

## 🗑️ 4. Cómo Destruir Todo Definitivamente (Terminate Instance)

Una vez que hayas defendido tu examen universitario y ya no necesites el servidor:

1. Ve a **Consola de AWS > EC2 > Instances**.
2. Selecciona tu instancia `diagramador-uml-servidor`.
3. Haz clic en **"Instance state" > "Terminate instance"** (Terminar instancia).
4. Confirma haciendo clic en el botón rojo **"Terminate"**.
5. La instancia pasará a *Shutting-down* y luego a *Terminated*. En unos minutos desaparecerá de tu consola.

> [!CAUTION]
> La acción **Terminate** borra la máquina virtual y destruye el disco EBS asociado. Todos los diagramas y usuarios de la base de datos se eliminarán de forma irreversible.

---

## ⚠️ 5. Prevención de Costos Ocultos en AWS

Para asegurar que tu factura se mantenga en **$0.00 USD**, verifica los siguientes puntos en la consola de AWS:

### A. Elastic IPs (Direcciones IP Elásticas)
- Si creaste una "Elastic IP" (IP fija) en algún momento y tu instancia está **apagada o terminada**, AWS cobra **$0.005 USD por hora** por mantener esa IP sin usar.
- **Verificación:** En el panel izquierdo de EC2, haz clic en **"Elastic IPs"**.
- Si ves alguna IP listada que no esté asociada, selecciónala, haz clic en **"Actions" > "Release Elastic IP addresses"** (Liberar) para eliminarla.

### B. Volúmenes EBS Huérfanos
- En el panel izquierdo de EC2, haz clic en **"Volumes"** (Volúmenes).
- Revisa la columna **State**:
  - Si el volumen dice **in-use** (en uso por tu instancia activa), está bien.
  - Si terminaste tu instancia y quedó algún volumen en estado **available** (disponible), selecciónalo y haz clic en **"Actions" > "Delete volume"** para no pagar por almacenamiento innecesario.

### C. Alertas de Presupuesto (AWS Budgets)
Para tranquilidad total:
1. En el buscador superior escribe `Budgets` y selecciona **AWS Budgets**.
2. Haz clic en **"Create budget"** > Selecciona **"Cost budget"**.
3. Fija un monto de **`$1.00 USD`** al mes e ingresa tu correo electrónico.
4. AWS te enviará una notificación por correo si algún recurso genera aunque sea un centavo de cobro.

---

> **Paso Anterior:** [05_ACTUALIZAR_PRODUCCION.md](./05_ACTUALIZAR_PRODUCCION.md)  
> **Volver al Índice:** [00_RESUMEN_GENERAL.md](./00_RESUMEN_GENERAL.md)
