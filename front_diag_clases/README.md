This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📱 Guía de Arranque para Proyectos Flutter Exportados

Cuando exportas tu Diagrama de Clases UML como **Frontend en Flutter con IA de Voz (Vosk Offline)**, sigue estos pasos paso a paso para compilar y ejecutar la aplicación en tu celular o emulador:

### 1. Descomprimir el Proyecto
Extrae el archivo `.zip` descargado en una carpeta local de tu computadora.

### 2. Abrir la Terminal en la carpeta del proyecto
Abre la consola (Bash, PowerShell o Terminal) dentro del directorio del proyecto descomprimido.

### 3. Recrear Estructura de Plataformas Nativas
Ejecuta el siguiente comando para generar los archivos nativos de Android, iOS y Web según tu versión local del SDK de Flutter:
```bash
flutter create .
```

### 4. Descargar Dependencias
Instala los paquetes declarados en el `pubspec.yaml` (HTTP, Vosk Voice, SpinKit, etc.):
```bash
flutter pub get
```

### 5. Configurar Conexión al Backend Spring Boot (Dispositivo Físico por Cable USB)
Si vas a probar la app en un **celular Android físico conectado por cable USB** a tu computadora, redirige el puerto de comunicación mediante ADB para que la app se conecte sin problemas a tu servidor Spring Boot local:

```bash
# Redirigir puerto backend 8081 (o 8080)
adb reverse tcp:8081 tcp:8081
```

> [!NOTE]
> - **Emulador oficial de Android:** No requiere `adb reverse`; la app se conecta automáticamente mediante la IP virtual `http://10.0.2.2:8081/api`.
> - **Ngrok / Cloudflare Tunnel:** Si usas un túnel público, la app se conectará mediante la URL HTTPS asignada.

### 6. Ejecutar la Aplicación
Conecta tu dispositivo o inicia tu emulador y ejecuta:
```bash
flutter run
```

---

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

