# 📱 Flutter UML Viewer (App Móvil de Visualización Colaborativa)

Aplicación móvil desarrollada en Flutter para la visualización e inspección en tiempo real de diagramas de clases UML generados en la plataforma web **UML Studio**.

---

## ⚡ Conexión a Producción (AWS)

La app está configurada por defecto para conectarse automáticamente al servidor de producción en AWS:
* **Host Backend / API:** `http://52.90.161.62`
* **WebSocket STOMP:** `ws://52.90.161.62/ws/websocket`

---

## 📦 Generar e Instalar la App en Modo Debug (Android APK)

Para compilar e instalar o descargar el archivo `.apk` de prueba (debug) directamente en tu dispositivo móvil o emulador, ejecuta los siguientes comandos desde la carpeta `flutter_viewer/`:

### 1. Descargar dependencias
```bash
flutter pub get
```

### 2. Compilar el APK Debug
```bash
flutter build apk --debug
```

> [!TIP]
> **Ruta del APK generado:**
> Una vez finalizada la compilación, encontrarás el archivo instalable listo para compartir o enviar a tu teléfono en:
> ```text
> build/app/outputs/flutter-apk/app-debug.apk
> ```

---

### 3. Instalar directamente en un teléfono conectado por USB o Emulador
Con la depuración USB habilitada en tu teléfono Android:
```bash
flutter install
```
*(O simplemente: `flutter run` para compilar, instalar e iniciar con Hot Reload).*

---

## 🚀 Uso Rápido
1. Abre la aplicación en tu teléfono.
2. Ingresa el **ID del diagrama** (por ejemplo: `1` o `2`) o pega la URL completa (ej. `http://52.90.161.62/diagrams/1`), o escanea el código QR desde la web.
3. Presiona **Conectar**. El diagrama se cargará y sincronizará en tiempo real con los cambios que hagas en el navegador.
