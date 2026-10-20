function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

console.log("Iniciando pruebas unitarias de mobileLinkPayload...");

function generateMobileViewerLink(origin: string, diagramId: number): string {
  const cleanOrigin = origin.replace(/\/+$/, "");
  return `${cleanOrigin}/diagrams/${diagramId}?mode=viewer`;
}

// 1. Prueba de Construcción de URL para Código QR
const url = generateMobileViewerLink("http://192.168.1.50:3000", 12);
assert(
  url === "http://192.168.1.50:3000/diagrams/12?mode=viewer",
  `URL inesperada: ${url}`
);
console.log("✔ Construcción de URL para código QR aprobada.");

// 2. Prueba con origen con barra diagonal final
const urlTrailing = generateMobileViewerLink("http://localhost:3000/", 45);
assert(
  urlTrailing === "http://localhost:3000/diagrams/45?mode=viewer",
  `URL con barra final inesperada: ${urlTrailing}`
);
console.log("✔ Normalización de barra final aprobada.");

// 3. Prueba de extracción de ID de diagrama a partir de URL escaneada
function parseDiagramIdFromUrl(scannedUrl: string): number | null {
  try {
    const parsed = new URL(scannedUrl);
    const match = parsed.pathname.match(/\/diagrams\/(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  } catch {
    // Si se pasa directamente el ID numérico
    const num = parseInt(scannedUrl.trim(), 10);
    return isNaN(num) ? null : num;
  }
}

assert(parseDiagramIdFromUrl("http://192.168.1.50:3000/diagrams/12?mode=viewer") === 12, "Debe extraer ID 12");
assert(parseDiagramIdFromUrl("http://localhost:3000/diagrams/99") === 99, "Debe extraer ID 99");
assert(parseDiagramIdFromUrl("123") === 123, "Debe soportar ID directo como texto '123'");
assert(parseDiagramIdFromUrl("invalido") === null, "Texto no numérico debe retornar null");
console.log("✔ Parser de entrada móvil por URL / ID directo aprobado.");

console.log("🎉 Todas las pruebas de mobileLinkPayload pasaron con éxito.");
