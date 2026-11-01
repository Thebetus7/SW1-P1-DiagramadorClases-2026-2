/**
 * Pruebas unitarias de compatibilidad, fallback a Gemini y parsing estructurado para WebLLM (T3.4)
 */

import assert from "node:assert";
import { AiEngineConfig, AiProvider, LocalModelChoice } from "../../types";

console.log("Iniciando pruebas unitarias de WebLLM, fallback y parsing local (T3.4)...");

// 1. Simulación de detección de WebGPU y fallback automático a Gemini Cloud
function resolveActiveAiProvider(
  requestedProvider: AiProvider,
  hasWebGpu: boolean
): { provider: AiProvider; fallbackApplied: boolean; reason?: string } {
  if (requestedProvider === "WEBLLM_LOCAL" && !hasWebGpu) {
    return {
      provider: "GEMINI_CLOUD",
      fallbackApplied: true,
      reason: "WebGPU no soportado en este entorno",
    };
  }
  return {
    provider: requestedProvider,
    fallbackApplied: false,
  };
}

// Escenario: Usuario solicita motor local pero el navegador/dispositivo carece de WebGPU
const fallbackResult = resolveActiveAiProvider("WEBLLM_LOCAL", false);
assert.strictEqual(fallbackResult.provider, "GEMINI_CLOUD", "Debe degradar a GEMINI_CLOUD");
assert.strictEqual(fallbackResult.fallbackApplied, true, "Debe marcar fallbackApplied como true");
assert.ok(fallbackResult.reason?.includes("WebGPU"), "Debe especificar la razón del fallback");
console.log("✔ Fallback automático a Gemini Cloud cuando WebGPU no está disponible aprobado.");

// Escenario: Dispositivo cuenta con WebGPU
const supportedResult = resolveActiveAiProvider("WEBLLM_LOCAL", true);
assert.strictEqual(supportedResult.provider, "WEBLLM_LOCAL", "Debe permitir WEBLLM_LOCAL si WebGPU está soportado");
assert.strictEqual(supportedResult.fallbackApplied, false);
console.log("✔ Detección positiva de WebGPU y selección de WebLLM local aprobada.");

// 2. Simulación de mapeo de progreso de descarga de pesos (0.0 - 1.0 -> 0% - 100%)
function mapDownloadProgress(rawReport: { progress: number; text: string }) {
  const percent = Math.min(100, Math.max(0, Math.round(rawReport.progress * 100)));
  let status: "DOWNLOADING" | "READY" = "DOWNLOADING";
  if (percent >= 100) {
    status = "READY";
  }
  return {
    percent,
    text: rawReport.text,
    status,
  };
}

const p1 = mapDownloadProgress({ progress: 0.254, text: "Loading model params [25%]..." });
assert.strictEqual(p1.percent, 25);
assert.strictEqual(p1.status, "DOWNLOADING");

const p2 = mapDownloadProgress({ progress: 1.0, text: "Model weights loaded successfully." });
assert.strictEqual(p2.percent, 100);
assert.strictEqual(p2.status, "READY");
console.log("✔ Mapeo de progreso de descarga y transiciones de estado aprobadas.");

// 3. Simulación de extracción y normalización de JSON emitido por Llama 3.2
function parseLlmRawResponse(rawOutput: string): { replyText: string; proposal?: any } {
  // Llama 3.2 local puede incluir markdown envolvente o texto libre
  const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawOutput.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { replyText: rawOutput.trim() };
  }

  const jsonString = jsonMatch[1] || jsonMatch[0];
  try {
    const parsed = JSON.parse(jsonString);
    const explanation = parsed.explanation || "Voy a aplicar los cambios solicitados.";
    return {
      replyText: explanation,
      proposal: {
        summary: explanation,
        nodesDelta: parsed.classes || parsed.nodesDelta || [],
        edgesDelta: parsed.relationships || parsed.edgesDelta || [],
      },
    };
  } catch (err) {
    return { replyText: rawOutput.trim() };
  }
}

const rawLlamaOutput = `
He analizado el diseño. Voy a crear la clase Factura y la conectaré con Pedido.

\`\`\`json
{
  "explanation": "Voy a agregar la clase Factura con atributos id y montoTotal, y crear una relación de asociación con Pedido.",
  "classes": [
    {
      "name": "Factura",
      "attributes": ["+ id: Long", "+ montoTotal: Double"],
      "methods": ["+ emitir(): void"]
    }
  ],
  "relationships": [
    {
      "from": "Pedido",
      "to": "Factura",
      "type": "association",
      "multiplicitySource": "1",
      "multiplicityTarget": "1"
    }
  ]
}
\`\`\`
`;

const parsedLlamaResult = parseLlmRawResponse(rawLlamaOutput);
assert.ok(parsedLlamaResult.proposal, "Debe extraer la propuesta estructural");
assert.strictEqual(parsedLlamaResult.proposal.nodesDelta.length, 1);
assert.strictEqual(parsedLlamaResult.proposal.nodesDelta[0].name, "Factura");
assert.strictEqual(parsedLlamaResult.proposal.edgesDelta.length, 1);
assert.ok(parsedLlamaResult.replyText.startsWith("Voy a"), "La explicación debe estar en tiempo futuro");
console.log("✔ Parsing y normalización de respuestas locales Llama 3.2 aprobados.");

// 4. Verificación de configuración inicial del motor dual
const initialConfig: AiEngineConfig = {
  provider: "GEMINI_CLOUD",
  localModelId: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
  status: "NOT_DOWNLOADED",
  progressPercent: 0,
  webGpuSupported: true,
};

assert.strictEqual(initialConfig.provider, "GEMINI_CLOUD", "Proveedor por defecto debe ser GEMINI_CLOUD");
assert.strictEqual(initialConfig.status, "NOT_DOWNLOADED", "Estado inicial debe ser NOT_DOWNLOADED");
console.log("✔ Configuración inicial del motor dual verificada.");

console.log("🎉 Todas las pruebas unitarias de WebLLM, fallback y parsing pasaron exitosamente.");
