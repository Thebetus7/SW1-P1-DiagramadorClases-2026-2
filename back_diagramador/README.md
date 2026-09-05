# Backend - Diagramador de Clases (Spring Boot)

Backend para la aplicación de Diagramador de Clases UML desarrollado con **Spring Boot 3 / Java 17**.

---

## 📋 Requisitos Previos

- **Java JDK**: Versión 17 o superior.
- **PostgreSQL**: Base de datos corriendo localmente en el puerto `5432` con la base de datos `sw1_diag_clases_2026_2` (o configurar en `src/main/resources/application.properties`).

---

## 🚀 Comandos de Ejecución

### 1. Ejecutar en Modo Desarrollo (Spring Boot Run)

#### En Linux / macOS / Git Bash / WSL:
```bash
./mvnw spring-boot:run
```

#### En Windows (PowerShell / Command Prompt):
```powershell
.\mvnw.cmd spring-boot:run
```

> **Nota:** Si tienes **Apache Maven** instalado globalmente en el sistema, también puedes usar:
> ```bash
> mvn spring-boot:run
> ```

---

## 🛠️ Errores Comunes de Comando

- ❌ `./nvmw springbooot:run` *(Incorrecto: typo en el wrapper `nvmw` y en `springbooot`)*
- ✅ `./mvnw spring-boot:run` *(Correcto)*

---

## ⚙️ Configuración y Puerto

Por defecto, la aplicación se ejecuta en:
- **URL Base:** `http://localhost:8080`
- **Consola H2 (si se habilita):** `http://localhost:8080/h2-console`

Para modificar el puerto, credenciales de PostgreSQL o configuración de base de datos, revisa el archivo:
[`src/main/resources/application.properties`](file:///c:/EDBERTO/ULTIMO/SW1/PARCIAL%201/PF/SW1-P1-DiagramadorClases-2026-2/back_diagramador/src/main/resources/application.properties)

---

## 📦 Compilación y Empaquetado

### Limpiar y compilar el proyecto:
```bash
./mvnw clean compile
```

### Generar el archivo JAR:
```bash
./mvnw clean package
```

### Ejecutar las pruebas unitarias:
```bash
./mvnw test
```
