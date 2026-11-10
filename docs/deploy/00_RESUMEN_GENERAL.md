# 🚀 Guía de Despliegue en Producción — AWS EC2 (Amazon Linux 2023) + Amazon DynamoDB

Bienvenido a la suite de documentación técnica de despliegue para **SW1 Diagramador de Clases UML Colaborativo en Tiempo Real**.

Esta guía proporciona el procedimiento paso a paso para provisionar, configurar, desplegar, auditar y mantener la plataforma completa en una instancia **AWS EC2 con Amazon Linux 2023 (AL2023)**, integrando **Amazon DynamoDB** administrado (para chat colaborativo en tiempo real e historial de propuestas), **PostgreSQL 16**, **MinIO**, **Spring Boot 3.5**, **Next.js 16 (React 19)** y **Nginx Reverse Proxy**.

---

## 📌 Ficha Técnica del Proyecto

| Parámetro | Especificación Técnica |
| :--- | :--- |
| **Proyecto** | SW1-P1-DiagramadorClases-2026-2 |
| **Proveedor Cloud** | Amazon Web Services (AWS) |
| **Sistema Operativo Servidor** | **Amazon Linux 2023 AMI (AL2023)** x86_64 / arm64 |
| **Tipo de Instancia Recomendada** | `t3.small` (2 vCPU, 2 GB RAM) o `t2.micro` / `t3.micro` con 2 GB Swap |
| **Base de Datos Relacional** | PostgreSQL 16 Alpine (Contenedor Docker con volumen persistente) |
| **Base de Datos NoSQL Documental** | **Amazon DynamoDB** (Tabla administrada `DiagramChatMessages` con índice GSI `MessageIdIndex`) |
| **Almacenamiento de Objetos** | MinIO (Contenedor local compatible con AWS S3) |
| **Backend** | Java 17 + Spring Boot 3.5 (API REST + STOMP WebSockets) |
| **Frontend** | Next.js 16.3 + React 19 + TypeScript + Tailwind CSS v4 + React Flow |
| **Reverse Proxy & Ingress** | Nginx Alpine (Puerto `80` HTTP / `443` HTTPS) |

---

## 🏗️ Diagrama de Arquitectura en Producción (AWS)

```mermaid
flowchart TD
    subgraph Clientes["🌐 Clientes Web & Móviles"]
        UserBrowser["Navegador Web (Next.js SPA)"]
        FlutterApp["App Móvil Flutter / Visor"]
    end

    subgraph AWSCloud["☁️ Nube de AWS (Región us-east-1)"]
        subgraph EC2["🖥️ Instancia EC2 (Amazon Linux 2023)"]
            Nginx["Nginx Reverse Proxy<br/>:80 / :443"]

            subgraph DockerCompose["Docker Compose Network (diag_network)"]
                Front["Frontend Next.js 16<br/>Puerto interno :3000"]
                Back["Backend Spring Boot 3.5<br/>Puerto interno :8080"]
                Postgres[("PostgreSQL 16 Alpine<br/>Volumen: postgres_data<br/>:5432")]
                Minio[("MinIO S3 Compatible<br/>Volumen: minio_data<br/>:9000/:9001")]
            end
        end

        subgraph AWSManagedServices["🛡️ Servicios Administrados AWS"]
            IAMRole["IAM Instance Profile / Role<br/>(Politica: DynamoDBChatPolicy)"]
            DynamoDB[("Amazon DynamoDB<br/>Tabla: DiagramChatMessages<br/>GSI: MessageIdIndex")]
        end
    end

    UserBrowser -->|HTTP :80 / HTTPS :443| Nginx
    FlutterApp -->|WebSocket STOMP / REST| Nginx

    Nginx -->|/api/ & /ws| Back
    Nginx -->|/ (HTML/JS/Static)| Front

    Back -->|JPA / JDBC SQL| Postgres
    Back -->|S3 Client SDK| Minio
    Back -->|AWS SDK v2 (Enhanced Client)| DynamoDB
    EC2 -.->|Asume credenciales seguras sin secretos hardcodeados| IAMRole
    IAMRole -.->|Permisos IAM sobre tabla| DynamoDB
```

---

## 🔒 Matriz de Puertos y Seguridad de Red (Security Group)

El grupo de seguridad (**Security Group**) de la instancia EC2 debe configurarse con el principio de privilegio mínimo:

| Puerto | Protocolo | Origen (CIDR) | Servicio | Propósito y Justificación |
| :---: | :---: | :---: | :--- | :--- |
| `22` | TCP | `0.0.0.0/0` (o tu IP fija) | SSH | Administración remota de la consola Linux mediante llave privada `.pem`. |
| `80` | TCP | `0.0.0.0/0` | HTTP | Tráfico público para la aplicación web y resolución de retos Let's Encrypt Certbot. |
| `443` | TCP | `0.0.0.0/0` | HTTPS | Tráfico web cifrado seguro (SSL/TLS) con HTTP/2 y WSS. |

> [!IMPORTANT]
> **Aislamiento de Puertos Internos:**
> Los puertos `8080` (Spring Boot), `3000` (Next.js), `5432` (PostgreSQL), `8005` (DynamoDB Local) y `9000/9001` (MinIO) **NO deben abrirse en el Security Group**. Nginx actúa como intermediario seguro dentro de la red privada de Docker. La comunicación con **Amazon DynamoDB** se realiza a través de las APIs HTTPS públicas de AWS (puerto `443` de salida de la VPC).

---

## 💰 Estimación y Control de Costos Mensuales

| Recurso AWS | Nivel de Capa Gratuita (Free Tier) | Costo Estimado Fuera de Free Tier |
| :--- | :--- | :--- |
| **Instancia EC2 (t2.micro / t3.micro)** | 750 horas/mes gratis (primeros 12 meses) | ~$7.50 a $10.50 USD / mes |
| **Almacenamiento EBS (30 GB GP3)** | 30 GB gratis al mes | ~$2.40 USD / mes |
| **Amazon DynamoDB (`DiagramChatMessages`)** | **25 GB de almacenamiento + 25 WCU + 25 RCU GRATIS de por vida** (Always Free) | **$0.00 USD** (Dentro del Free Tier de por vida) |
| **Transferencia de Datos de Salida** | 100 GB gratis al mes | < $1.00 USD / mes |
| **Total Estimado Mensual** | **$0.00 USD (Durante Free Tier)** | **~$10.00 a $13.50 USD / mes** |

---

## 🗺️ Mapa de Navegación de la Documentación

Sigue el orden estructurado de los módulos para garantizar un despliegue sin errores:

| Módulo | Archivo | Descripción |
| :---: | :--- | :--- |
| **01** | [01_CONFIGURAR_PROYECTO.md](./01_CONFIGURAR_PROYECTO.md) | Preparación de Docker Compose, variables de entorno de producción y configuración de DynamoDB. |
| **02** | [02_CREAR_INFRAESTRUCTURA_AWS.md](./02_CREAR_INFRAESTRUCTURA_AWS.md) | Creación de instancia EC2 AL2023, Security Groups, IAM Roles y tabla DynamoDB. |
| **03** | [03_INSTALAR_HERRAMIENTAS.md](./03_INSTALAR_HERRAMIENTAS.md) | Conexión SSH, swap de 2 GB, Docker Engine y Git en Amazon Linux 2023. |
| **04** | [04_DESPLEGAR_Y_VERIFICAR.md](./04_DESPLEGAR_Y_VERIFICAR.md) | Clonación del repositorio, build de contenedores, validación observable y SSL Certbot. |
| **05** | [05_ACTUALIZAR_PRODUCCION.md](./05_ACTUALIZAR_PRODUCCION.md) | Flujo de actualización Zero-Downtime, respaldo preventivo y rollback. |
| **06** | [06_APAGAR_Y_REACTIVAR.md](./06_APAGAR_Y_REACTIVAR.md) | Estrategia de parada para evitar costos no deseados, backups de DynamoDB y reactivación. |
| **07** | [07_FLUJO_VISUAL_DESPLIEGUE.html](./07_FLUJO_VISUAL_DESPLIEGUE.html) | Dashboard interactivo Dark Mode con checklist paso a paso y comandos listos para copiar. |

---

**Siguiente paso recomendado:** Procede a [01_CONFIGURAR_PROYECTO.md](./01_CONFIGURAR_PROYECTO.md) para revisar las variables y los archivos de composición antes de conectarte a la consola de AWS.

