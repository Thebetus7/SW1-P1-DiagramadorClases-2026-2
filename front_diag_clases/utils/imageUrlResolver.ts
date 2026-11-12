/**
 * Utilidad para resolver URLs de imágenes adjuntas en el lienzo y chat.
 * Garantiza que en entorno de desarrollo local (puerto 3000) las rutas relativas
 * como /api/diagrams/... o /uploads/diagrams/... se resuelvan hacia el puerto 8080 del backend Spring Boot,
 * mientras que en entornos de producción (detrás de Nginx) o URLs absolutas se mantengan intactas.
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "";

  // Data URLs en base64 o URLs absolutas (http/https) se devuelven sin cambios
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Si estamos en el navegador en entorno de desarrollo (puerto 3000) y la URL apunta a /api o /uploads
  if (typeof window !== "undefined") {
    const port = window.location.port;
    if (port === "3000" && (url.startsWith("/api") || url.startsWith("/uploads"))) {
      const hostname = window.location.hostname || "localhost";
      return `http://${hostname}:8080${url}`;
    }
  }

  return url;
}
