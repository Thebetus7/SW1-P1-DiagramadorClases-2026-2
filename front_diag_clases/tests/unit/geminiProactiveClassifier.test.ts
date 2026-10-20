import { classifyPromptIntent } from "../../services/geminiDiagramService";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

console.log("Iniciando pruebas unitarias de geminiProactiveClassifier...");

// 1. Pruebas de Modo EDITOR (Intenciones de mutación estructural)
const editPrompts = [
  "Crea la clase Factura con atributo total double",
  "Agrega un atributo fecha al pedido",
  "Añade una relación de composición entre Curso y Leccion",
  "Elimina la clase Temporal",
  "Modifica el tipo de retorno del método calcular()",
  "Conecta la clase Cliente con Pedido",
  "Nueva clase Detalle con atributos id y subtotal",
];

for (const prompt of editPrompts) {
  const mode = classifyPromptIntent(prompt);
  assert(
    mode === "EDITOR",
    `Se esperaba modo EDITOR para '${prompt}', obtenido '${mode}'`
  );
}
console.log("✔ Clasificación de intenciones en Modo EDITOR aprobada.");

// 2. Pruebas de Modo CHAT (Consultas conceptuales y de arquitectura)
const chatPrompts = [
  "¿Cómo puedo normalizar la clase Usuario para separar credenciales?",
  "Explícame qué hace este diagrama de clases",
  "Hola Copilot, ¿qué patrones de diseño me recomiendas aquí?",
  "¿Por qué es mejor usar composición en lugar de herencia en este caso?",
  "Dame una introducción a la arquitectura del proyecto para nuevos desarrolladores",
  "¿Qué atributos suelen tener las clases de una tienda virtual?",
];

for (const prompt of chatPrompts) {
  const mode = classifyPromptIntent(prompt);
  assert(
    mode === "CHAT",
    `Se esperaba modo CHAT para '${prompt}', obtenido '${mode}'`
  );
}
console.log("✔ Clasificación de intenciones en Modo CHAT aprobada.");

// 3. Casos borde (Cadenas vacías o ambiguas)
assert(classifyPromptIntent("") === "CHAT", "Cadena vacía debe ser CHAT por defecto seguro");
assert(classifyPromptIntent("   ") === "CHAT", "Espacios en blanco deben ser CHAT");
assert(classifyPromptIntent("UML 2.5") === "CHAT", "Término ambiguo debe ser CHAT");
console.log("✔ Casos borde y fallback seguro de clasificación aprobados.");

console.log("🎉 Todas las pruebas de clasificación semántica de intención pasaron con éxito.");
