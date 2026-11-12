import { CreateWebWorkerMLCEngine, MLCEngineInterface } from "@mlc-ai/web-llm";
import { Node, Edge } from "@xyflow/react";
import { ChatMessage, CopilotMode, LocalModelChoice, LocalModelStatus } from "@/types";
import { normalizeExtractedDiagram } from "./geminiDiagramService";

let globalEngine: MLCEngineInterface | null = null;
let currentLoadedModel: string | null = null;

export async function isWebGpuSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !("navigator" in window)) {
    return false;
  }
  const nav = navigator as any;
  if (!nav.gpu) {
    return false;
  }
  try {
    const adapter = await nav.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

export async function initLocalLlmEngine(
  modelId: LocalModelChoice,
  onProgress?: (progress: { progress: number; text: string }) => void
): Promise<MLCEngineInterface> {
  if (globalEngine && currentLoadedModel === modelId) {
    return globalEngine;
  }

  const supported = await isWebGpuSupported();
  if (!supported) {
    throw new Error("Tu navegador o tarjeta gráfica no soportan WebGPU para aceleración de IA local.");
  }

  // Si ya había otro modelo cargado, descargarlo
  if (globalEngine) {
    try {
      await globalEngine.unload();
    } catch (e) {
      console.warn("Aviso al descargar modelo anterior:", e);
    }
    globalEngine = null;
    currentLoadedModel = null;
  }

  // Instanciar Web Worker
  const worker = new Worker(
    new URL("../workers/webllm.worker.ts", import.meta.url),
    { type: "module" }
  );

  globalEngine = await CreateWebWorkerMLCEngine(worker, modelId, {
    initProgressCallback: (report) => {
      if (onProgress) {
        onProgress({
          progress: Math.round(report.progress * 100),
          text: report.text,
        });
      }
    },
  });

  currentLoadedModel = modelId;
  return globalEngine;
}

export async function unloadLocalLlmEngine(): Promise<void> {
  if (globalEngine) {
    try {
      await globalEngine.unload();
    } finally {
      globalEngine = null;
      currentLoadedModel = null;
    }
  }
}

export function isLocalLlmReady(): boolean {
  return globalEngine !== null;
}

export function getCurrentLoadedModel(): string | null {
  return currentLoadedModel;
}

export function extractJsonFromLlmOutput(rawOutput: string): any {
  if (!rawOutput) return {};
  const trimmed = rawOutput.trim();

  // 1. Intento directo
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Extracción de bloques de código markdown ```json ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 3. Extracción por delimitadores { y }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Limpieza de trailing commas comunes en LLMs antes de cerrar llaves/corchetes
      try {
        const withoutTrailingCommas = candidate.replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(withoutTrailingCommas);
      } catch {}
    }
  }

  return {};
}

/**
 * Garantiza que la directiva de tiempo futuro ("Voy a...") se cumpla estrictamente
 * evitando que el modelo local use tiempo pasado ("Se agregaron", "He creado").
 */
export function enforceFutureTenseExplanation(text: string, userInstruction: string): string {
  let cleaned = (text || "").trim();

  // Reemplazar patrones comunes de tiempo pasado emitidos por modelos locales
  cleaned = cleaned.replace(
    /^(?:he agregado|he creado|se ha agregado|se han agregado|se ha creado|se crearon|se modificaron|he modificado|se actualizaron|he actualizado)\s+/i,
    "Voy a aplicar en el diagrama: "
  );

  // Si no inicia con un verbo en futuro de primera persona
  if (!/^(?:voy a|procederé a|añadiré|crearé|modificaré|actualizaré|conectaré|estableceré)/i.test(cleaned)) {
    if (cleaned.length > 0) {
      cleaned = `Voy a modificar el diagrama: ${cleaned}`;
    } else {
      cleaned = `Voy a aplicar los cambios solicitados para: "${userInstruction}"`;
    }
  }

  return cleaned;
}

/**
 * Fusiona de manera inteligente la propuesta del modelo local con el estado previo del lienzo,
 * garantizando que ninguna clase o arista previa se pierda si el modelo solo devolvió la novedad.
 */
export function mergeProposalWithCanvas(
  proposedNodes: Node[],
  proposedEdges: Edge[],
  canvasNodes: Node[],
  canvasEdges: Edge[]
): { mergedNodes: Node[]; mergedEdges: Edge[]; affectedIds: string[] } {
  const affectedIds: string[] = [];

  // Mapeo de nodos existentes por nombre (minúsculas) y por ID
  const existingByName = new Map<string, Node>();
  const existingById = new Map<string, Node>();
  canvasNodes.forEach((n) => {
    existingById.set(n.id, n);
    const name = String((n.data as any)?.name || "").trim().toLowerCase();
    if (name) existingByName.set(name, n);
  });

  const mergedNodesMap = new Map<string, Node>();
  // Inicialmente incluimos todos los nodos previos
  canvasNodes.forEach((n) => mergedNodesMap.set(n.id, { ...n }));

  // Aplicar o agregar los nodos propuestos
  proposedNodes.forEach((pNode, idx) => {
    const pName = String((pNode.data as any)?.name || "").trim().toLowerCase();
    const matchExisting = existingByName.get(pName) || existingById.get(pNode.id);

    if (matchExisting) {
      // Es una actualización de una clase existente: preservamos ID y posición espacial original
      const updatedNode: Node = {
        ...matchExisting,
        data: {
          ...matchExisting.data,
          ...pNode.data,
        },
      };
      mergedNodesMap.set(matchExisting.id, updatedNode);
      affectedIds.push(matchExisting.id);
    } else {
      // Es una clase totalmente nueva
      const newNodeId = pNode.id || `class-local-${Date.now()}-${idx}`;
      const newNode: Node = {
        ...pNode,
        id: newNodeId,
        position: pNode.position?.x !== undefined ? pNode.position : {
          x: 100 + (canvasNodes.length % 3) * 320,
          y: 100 + Math.floor(canvasNodes.length / 3) * 260,
        },
      };
      mergedNodesMap.set(newNodeId, newNode);
      affectedIds.push(newNodeId);
    }
  });

  const mergedNodes = Array.from(mergedNodesMap.values());

  // Fusión de aristas (Edges): preservar existentes y sumar nuevas evitando duplicados
  const edgePairKey = (e: Edge) => `${e.source}->${e.target}:${(e.data as any)?.relationType || ""}`;
  const existingEdgePairs = new Set(canvasEdges.map(edgePairKey));
  const mergedEdges: Edge[] = [...canvasEdges];

  proposedEdges.forEach((pEdge, idx) => {
    const key = edgePairKey(pEdge);
    if (!existingEdgePairs.has(key)) {
      existingEdgePairs.add(key);
      mergedEdges.push({
        ...pEdge,
        id: pEdge.id || `edge-local-${Date.now()}-${idx}`,
      });
    }
  });

  return {
    mergedNodes,
    mergedEdges,
    affectedIds,
  };
}

export async function chatWithLocalLlm(
  userText: string,
  mode: CopilotMode,
  canvasNodes: Node[],
  canvasEdges: Edge[],
  projectName: string,
  chatHistory?: ChatMessage[]
): Promise<{ replyText: string; proposal?: any; newNodes?: Node[]; newEdges?: Edge[] }> {
  if (!globalEngine) {
    throw new Error("El motor de IA local WebLLM no ha sido inicializado en el navegador.");
  }

  const historyContext =
    chatHistory && chatHistory.length > 0
      ? "\nMemoria conversacional previa (últimos mensajes):\n" +
        chatHistory
          .slice(-8)
          .map((m) => `${m.senderType === "USER" ? "Usuario" : "Copilot"}: ${m.proposal?.summary || m.content}`)
          .join("\n") +
        "\n"
      : "";

  if (mode === "EDITOR") {
    const systemPrompt = `Eres un Arquitecto de Software y Especialista en Modelado UML 2.5 para el proyecto '${projectName}'.
Tu tarea es modificar o expandir el diagrama según la instrucción del usuario.
DIRECTIVA CRÍTICA:
1. En 'explanation', redacta obligatoriamente en tiempo futuro qué vas a hacer antes de que se confirme (ej: 'Voy a agregar la clase Factura con atributos id y fecha, y la conectaré con Pedido...'). NUNCA uses tiempo pasado ni digas que ya se crearon.
2. Devuelve ÚNICAMENTE un JSON válido con la siguiente estructura:
{
  "explanation": "Propuesta técnica redactada en tiempo futuro ('Voy a...')",
  "nodes": [
    {
      "name": "NombreClase",
      "stereotype": "entity",
      "attributes": ["+ id: Long", "- estado: String"],
      "methods": ["+ procesar(): void"]
    }
  ],
  "edges": [
    {
      "source": "NombreClaseOrigen",
      "target": "NombreClaseDestino",
      "relationType": "ASSOCIATION",
      "sourceMultiplicity": "1",
      "targetMultiplicity": "*"
    }
  ]
}`;

    const userPrompt = `Diagrama actual:
${JSON.stringify({
  nodes: canvasNodes.map((n) => ({ id: n.id, name: n.data?.name, attributes: n.data?.attributes, methods: n.data?.methods })),
  edges: canvasEdges.map((e) => ({ source: e.source, target: e.target, relationType: e.data?.relationType })),
})}
${historyContext}
Instrucción del usuario: "${userText}"`;

    console.log(`⚡ [WebLLM Local] Ejecutando inferencia WebGPU con modelo '${currentLoadedModel}'...`);
    const localStart = performance.now();
    const response = await globalEngine.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const localDuration = ((performance.now() - localStart) / 1000).toFixed(2);
    console.log(`✨ [WebLLM Local] Inferencia completada en ${localDuration}s`);
    const rawContent = response.choices[0]?.message?.content || "{}";

    // Extracción tolerante y robusta de JSON
    const parsed = extractJsonFromLlmOutput(rawContent);
    const normalized = normalizeExtractedDiagram(parsed, canvasNodes, canvasEdges);

    // Fusión segura con los nodos actuales para no perder clases previas
    const { mergedNodes, mergedEdges, affectedIds } = mergeProposalWithCanvas(
      normalized.nodes,
      normalized.edges,
      canvasNodes,
      canvasEdges
    );

    const futureExplanation = enforceFutureTenseExplanation(
      parsed.explanation || normalized.explanation,
      userText
    );

    return {
      replyText: futureExplanation,
      proposal: {
        summary: futureExplanation,
        nodesDelta: mergedNodes,
        edgesDelta: mergedEdges,
        affectedNodeIds: affectedIds,
        status: "PENDING",
      },
      newNodes: mergedNodes,
      newEdges: mergedEdges,
    };
  }

  // Modo CHAT
  const systemPrompt = `Eres Copilot UML, un asistente experto en ingeniería de software, arquitectura orientada a objetos y patrones de diseño UML 2.5 para el proyecto '${projectName}'.
DIRECTIVAS:
- Responde en español directo, conciso y técnico.
- Sin introducciones vacías, ve directo al grano.
- Formatea con Markdown limpio.`;

  const userPrompt = `Diagrama actual:
${JSON.stringify({
  nodes: canvasNodes.map((n) => ({ name: n.data?.name, attributes: n.data?.attributes })),
  edges: canvasEdges.map((e) => ({ source: e.source, target: e.target, type: e.data?.relationType })),
})}
${historyContext}
Consulta: "${userText}"`;

  const response = await globalEngine.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
  });

  const replyText = response.choices[0]?.message?.content || "No se pudo generar respuesta local.";
  return { replyText };
}
