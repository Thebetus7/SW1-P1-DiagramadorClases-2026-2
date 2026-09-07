import { Edge, Node } from "@xyflow/react";
import { UmlAttribute, UmlClassData, UmlEdgeData, UmlMethod, UmlRelationType, UmlVisibility } from "@/types";
import { cleanSpecialCharacters } from "./xmiEncodingHelper";

export interface AiDiagramResult {
  nodes: Node[];
  edges: Edge[];
  explanation: string;
}

const DEFAULT_GEMINI_API_KEY =
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  "";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Modelos activos y vigentes en la API de Google Gemini (2.5 Flash como principal con alta capacidad de visión)
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
];

/**
 * Normaliza visibilidad UML (+, -, #, ~)
 */
export function normalizeVisibility(vis: any): UmlVisibility {
  if (vis === "+" || vis === "-" || vis === "#" || vis === "~") {
    return vis;
  }
  if (typeof vis === "string") {
    const lower = vis.toLowerCase().trim();
    if (lower.startsWith("+") || lower.includes("pub")) return "+";
    if (lower.startsWith("-") || lower.includes("priv")) return "-";
    if (lower.startsWith("#") || lower.includes("prot")) return "#";
    if (lower.startsWith("~") || lower.includes("pack")) return "~";
  }
  return "+";
}

/**
 * Normaliza tipo de relación UML 2.5 al catálogo soportado por el diagramador
 */
export function normalizeRelationType(rel: any): UmlRelationType {
  const map: Record<string, UmlRelationType> = {
    ASSOCIATION: "ASSOCIATION",
    ASOCIACION: "ASSOCIATION",
    DIRECTED_ASSOCIATION: "DIRECTED_ASSOCIATION",
    ASOCIACION_DIRIGIDA: "DIRECTED_ASSOCIATION",
    GENERALIZATION: "GENERALIZATION",
    GENERALIZACION: "GENERALIZATION",
    HERENCIA: "GENERALIZATION",
    INHERITANCE: "GENERALIZATION",
    REALIZATION: "REALIZATION",
    REALIZACION: "REALIZATION",
    IMPLEMENTATION: "REALIZATION",
    IMPLEMENTACION: "REALIZATION",
    AGGREGATION: "AGGREGATION",
    AGREGACION: "AGGREGATION",
    COMPOSITION: "COMPOSITION",
    COMPOSICION: "COMPOSITION",
    DEPENDENCY: "DEPENDENCY",
    DEPENDENCIA: "DEPENDENCY",
    USO: "DEPENDENCY",
  };
  if (typeof rel === "string") {
    const upper = rel.toUpperCase().replace(/[\s-]+/g, "_").trim();
    if (map[upper]) return map[upper];
  }
  return "ASSOCIATION";
}

/**
 * Parsea un atributo extraído por la IA (sea string o objeto con formato diverso)
 * asegurando la separación estricta de visibilidad, nombre y tipo conforme al estándar UML / EA.
 */
export function parseAttributeElement(
  rawAttr: any,
  idx: number,
  nodePrefix: string
): UmlAttribute {
  const fallbackId = `attr-${nodePrefix}-${Date.now()}-${idx}`;

  if (typeof rawAttr === "string") {
    const trimmed = rawAttr.trim();
    // Expresión regular para captar: [visibilidad] nombre [: tipo]
    // Ejemplos: "- id: Long", "+ nombre: String", "# saldo", "email: string"
    const match = trimmed.match(/^([+\-#~])?\s*([a-zA-Z0-9_$]+)\s*(?::\s*(.+))?$/);
    if (match) {
      const vis = normalizeVisibility(match[1] || "-");
      const name = cleanSpecialCharacters(match[2]);
      const type = cleanSpecialCharacters(match[3] || "string");
      return { id: fallbackId, visibility: vis, name, type };
    }

    // Si tiene dos puntos sin coincidir totalmente
    if (trimmed.includes(":")) {
      const parts = trimmed.split(":");
      const rawLeft = parts[0].trim();
      const rawType = parts.slice(1).join(":").trim();
      const visMatch = rawLeft.match(/^([+\-#~])/);
      const vis = normalizeVisibility(visMatch ? visMatch[1] : "-");
      const cleanName = rawLeft.replace(/^[+\-#~]\s*/, "").trim();
      return {
        id: fallbackId,
        visibility: vis,
        name: cleanSpecialCharacters(cleanName || `attr_${idx + 1}`),
        type: cleanSpecialCharacters(rawType || "string"),
      };
    }

    return {
      id: fallbackId,
      visibility: "-",
      name: cleanSpecialCharacters(trimmed.replace(/^[+\-#~]\s*/, "") || `attr_${idx + 1}`),
      type: "string",
    };
  }

  if (typeof rawAttr === "object" && rawAttr !== null) {
    let rawName = String(rawAttr.name || rawAttr.nombre || rawAttr.title || "").trim();
    let rawType = String(rawAttr.type || rawAttr.tipo || rawAttr.dataType || "string").trim();
    let rawVis = rawAttr.visibility || rawAttr.visibilidad || rawAttr.scope;

    // Si el nombre aún contiene visibilidad o tipo embebido (ej: "- id: int")
    if (rawName.includes(":") || /^[+\-#~]/.test(rawName)) {
      const parsedFromString = parseAttributeElement(rawName, idx, nodePrefix);
      if (parsedFromString.name) {
        return {
          id: rawAttr.id || fallbackId,
          visibility: rawVis ? normalizeVisibility(rawVis) : parsedFromString.visibility,
          name: parsedFromString.name,
          type: rawType !== "string" ? cleanSpecialCharacters(rawType) : parsedFromString.type,
        };
      }
    }

    const cleanName = cleanSpecialCharacters(rawName.replace(/^[+\-#~]\s*/, "") || `attr_${idx + 1}`);
    const cleanType = cleanSpecialCharacters(rawType || "string");

    return {
      id: rawAttr.id || fallbackId,
      visibility: normalizeVisibility(rawVis || "-"),
      name: cleanName,
      type: cleanType,
    };
  }

  return {
    id: fallbackId,
    visibility: "-",
    name: `attr_${idx + 1}`,
    type: "string",
  };
}

/**
 * Parsea un método u operación extraído por la IA (sea string o objeto con formato diverso)
 * asegurando la separación estricta de visibilidad, nombre, parámetros y tipo de retorno.
 */
export function parseMethodElement(
  rawMethod: any,
  idx: number,
  nodePrefix: string
): UmlMethod {
  const fallbackId = `meth-${nodePrefix}-${Date.now()}-${idx}`;

  if (typeof rawMethod === "string") {
    const trimmed = rawMethod.trim();
    // Expresión regular para captar: [visibilidad] nombre ( [parámetros] ) [: tipoRetorno]
    // Ejemplos: "+ calcularTotal(desc: double): double", "- validar(): boolean", "guardar()"
    const match = trimmed.match(
      /^([+\-#~])?\s*([a-zA-Z0-9_$]+)\s*\((.*?)\)\s*(?::\s*(.+))?$/
    );
    if (match) {
      const vis = normalizeVisibility(match[1] || "+");
      const name = cleanSpecialCharacters(match[2]);
      const parameters = cleanSpecialCharacters(match[3] || "");
      const returnType = cleanSpecialCharacters(match[4] || "void");
      return { id: fallbackId, visibility: vis, name, parameters, returnType };
    }

    // Si tiene paréntesis pero sin dos puntos
    if (trimmed.includes("(") && trimmed.includes(")")) {
      const namePart = trimmed.substring(0, trimmed.indexOf("(")).trim();
      const paramsPart = trimmed.substring(trimmed.indexOf("(") + 1, trimmed.lastIndexOf(")")).trim();
      const rest = trimmed.substring(trimmed.lastIndexOf(")") + 1).replace(/^[:\s]+/, "").trim();
      const visMatch = namePart.match(/^([+\-#~])/);
      const vis = normalizeVisibility(visMatch ? visMatch[1] : "+");
      const cleanName = namePart.replace(/^[+\-#~]\s*/, "").trim();

      return {
        id: fallbackId,
        visibility: vis,
        name: cleanSpecialCharacters(cleanName || `metodo_${idx + 1}`),
        parameters: cleanSpecialCharacters(paramsPart),
        returnType: cleanSpecialCharacters(rest || "void"),
      };
    }

    return {
      id: fallbackId,
      visibility: "+",
      name: cleanSpecialCharacters(trimmed.replace(/^[+\-#~]\s*/, "") || `metodo_${idx + 1}`),
      parameters: "",
      returnType: "void",
    };
  }

  if (typeof rawMethod === "object" && rawMethod !== null) {
    let rawName = String(rawMethod.name || rawMethod.nombre || "").trim();
    let rawParams = String(rawMethod.parameters || rawMethod.parametros || rawMethod.params || "").trim();
    let rawReturn = String(rawMethod.returnType || rawMethod.tipoRetorno || rawMethod.type || "void").trim();
    let rawVis = rawMethod.visibility || rawMethod.visibilidad || rawMethod.scope;

    // Si el nombre contiene signatura completa (ej: "+ login(user: String): boolean")
    if (rawName.includes("(") || /^[+\-#~]/.test(rawName)) {
      const parsedFromString = parseMethodElement(rawName, idx, nodePrefix);
      if (parsedFromString.name) {
        return {
          id: rawMethod.id || fallbackId,
          visibility: rawVis ? normalizeVisibility(rawVis) : parsedFromString.visibility,
          name: parsedFromString.name,
          parameters: rawParams ? cleanSpecialCharacters(rawParams) : parsedFromString.parameters,
          returnType: rawReturn !== "void" ? cleanSpecialCharacters(rawReturn) : parsedFromString.returnType,
        };
      }
    }

    const cleanName = cleanSpecialCharacters(rawName.replace(/^[+\-#~]\s*/, "") || `metodo_${idx + 1}`);

    return {
      id: rawMethod.id || fallbackId,
      visibility: normalizeVisibility(rawVis || "+"),
      name: cleanName,
      parameters: cleanSpecialCharacters(rawParams),
      returnType: cleanSpecialCharacters(rawReturn || "void"),
    };
  }

  return {
    id: fallbackId,
    visibility: "+",
    name: `metodo_${idx + 1}`,
    parameters: "",
    returnType: "void",
  };
}

/**
 * Determina los Handles ideales (top, bottom, left, right) para unir source y target
 * según su posición relativa en el canvas, evitando que las líneas se crucen o atraviesen las cajas.
 */
export function calculateBestHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number }
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  // Si la separación vertical es predominante
  if (Math.abs(dy) >= Math.abs(dx)) {
    if (dy > 0) {
      // Origen arriba, Destino abajo
      return { sourceHandle: "bottom-source", targetHandle: "top-target" };
    } else {
      // Origen abajo, Destino arriba
      return { sourceHandle: "top-source", targetHandle: "bottom-target" };
    }
  } else {
    // Si la separación horizontal es predominante
    if (dx > 0) {
      // Origen a la izquierda, Destino a la derecha
      return { sourceHandle: "right-source", targetHandle: "left-target" };
    } else {
      // Origen a la derecha, Destino a la izquierda
      return { sourceHandle: "left-source", targetHandle: "right-target" };
    }
  }
}

/**
 * Calcula posición no colisionante para nuevos nodos en una cuadrícula ordenada
 */
function calculateGridPosition(index: number): { x: number; y: number } {
  const cols = 3;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: 80 + col * 320,
    y: 80 + row * 260,
  };
}

/**
 * Normaliza y enriquece cualquier resultado de nodos y aristas generado por Gemini IA,
 * garantizando el cumplimiento estricto del modelo de datos de React Flow y de los criterios XMI de Enterprise Architect.
 */
export function normalizeExtractedDiagram(
  rawResult: any,
  existingNodes: Node[] = []
): { nodes: Node[]; edges: Edge[]; explanation: string } {
  const rawNodes = Array.isArray(rawResult?.nodes) ? rawResult.nodes : [];
  const rawEdges = Array.isArray(rawResult?.edges) ? rawResult.edges : [];
  const explanation =
    rawResult?.explanation ||
    "Diagrama UML 2.5 procesado y reconocido correctamente.";

  const now = Date.now();

  // Mapeo flexible de identificadores (permite resolver tanto por ID como por nombre de clase)
  const nodeLookup = new Map<string, string>(); // token normalizado -> nodeId real
  const nodePositions = new Map<string, { x: number; y: number }>();

  // 1. Procesar Nodos (Clases y Notas)
  const finalNodes: Node[] = rawNodes.map((n: any, idx: number) => {
    const isNote = n.type === "umlNote" || Boolean(n.data?.content || n.content);
    const generatedId = isNote ? `note-${now}-${idx}` : `class-${now}-${idx}`;
    const rawId = String(n.id || generatedId);
    const nodeId = rawId.startsWith("node-") || rawId.startsWith("class-") || rawId.startsWith("note-")
      ? rawId
      : `${isNote ? "note" : "class"}-${rawId}`;

    // Posición espacial
    let pos = n.position;
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
      pos = calculateGridPosition(existingNodes.length + idx);
    }
    nodePositions.set(nodeId, pos);

    // Registrar en el diccionario de búsqueda por ID
    nodeLookup.set(nodeId.toLowerCase(), nodeId);
    nodeLookup.set(rawId.toLowerCase(), nodeId);

    if (isNote) {
      const noteContent = cleanSpecialCharacters(
        n.data?.content || n.content || n.text || "Nota importada"
      );
      return {
        id: nodeId,
        type: "umlNote",
        position: pos,
        data: {
          content: noteContent,
        },
      };
    }

    // Extracción tolerante de propiedades de la clase (soporta tanto n.data.* como n.*)
    const rawName = String(
      n.data?.name || n.name || n.title || n.label || `Clase_${idx + 1}`
    ).trim();
    const className = cleanSpecialCharacters(rawName);

    // Registrar en el diccionario por nombre de clase para conectar aristas que usen el nombre en source/target
    nodeLookup.set(className.toLowerCase(), nodeId);
    nodeLookup.set(cleanSpecialCharacters(rawName).toLowerCase(), nodeId);

    const stereotype = cleanSpecialCharacters(
      String(n.data?.stereotype || n.stereotype || "").replace(/[«»<>]/g, "").trim()
    );

    // Atributos
    const rawAttrs = Array.isArray(n.data?.attributes)
      ? n.data.attributes
      : Array.isArray(n.attributes)
      ? n.attributes
      : Array.isArray(n.fields)
      ? n.fields
      : [];

    const attributes: UmlAttribute[] = rawAttrs.map((attr: any, aIdx: number) =>
      parseAttributeElement(attr, aIdx, `${idx}`)
    );

    // Métodos / Operaciones
    const rawMethods = Array.isArray(n.data?.methods)
      ? n.data.methods
      : Array.isArray(n.methods)
      ? n.methods
      : Array.isArray(n.operations)
      ? n.operations
      : [];

    const methods: UmlMethod[] = rawMethods.map((m: any, mIdx: number) =>
      parseMethodElement(m, mIdx, `${idx}`)
    );

    return {
      id: nodeId,
      type: "umlClass",
      position: pos,
      data: {
        name: className,
        stereotype,
        attributes,
        methods,
      },
    };
  });

  // 2. Procesar Relaciones / Aristas (Edges)
  const validNodeIds = new Set(finalNodes.map((n) => n.id));

  const resolveNodeId = (ref: any): string | null => {
    if (!ref) return null;
    const str = String(ref).trim().toLowerCase();
    if (nodeLookup.has(str)) return nodeLookup.get(str)!;
    // Búsqueda por subcadena
    for (const [key, val] of nodeLookup.entries()) {
      if (key === str || key.includes(str) || str.includes(key)) {
        return val;
      }
    }
    return null;
  };

  const finalEdges: Edge[] = [];
  const processedPairs = new Set<string>();

  rawEdges.forEach((e: any, eIdx: number) => {
    const rawSource = e.source || e.from || e.origen;
    const rawTarget = e.target || e.to || e.destino;

    const sourceId = resolveNodeId(rawSource);
    const targetId = resolveNodeId(rawTarget);

    if (sourceId && targetId && validNodeIds.has(sourceId) && validNodeIds.has(targetId)) {
      const pairKey = `${sourceId}->${targetId}`;
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const sourcePos = nodePositions.get(sourceId) || { x: 0, y: 0 };
      const targetPos = nodePositions.get(targetId) || { x: 300, y: 300 };
      const { sourceHandle, targetHandle } = calculateBestHandles(sourcePos, targetPos);

      const relationType = normalizeRelationType(
        e.data?.relationType || e.relationType || e.type || e.relationship
      );

      const sourceMultiplicity = cleanSpecialCharacters(
        String(e.data?.sourceMultiplicity || e.sourceMultiplicity || "").trim()
      );
      const targetMultiplicity = cleanSpecialCharacters(
        String(e.data?.targetMultiplicity || e.targetMultiplicity || "").trim()
      );
      const edgeName = cleanSpecialCharacters(
        String(e.data?.name || e.name || e.data?.label || e.label || "").trim()
      );

      finalEdges.push({
        id: e.id || `edge-${now}-${eIdx}`,
        source: sourceId,
        target: targetId,
        sourceHandle: e.sourceHandle || sourceHandle,
        targetHandle: e.targetHandle || targetHandle,
        type: "umlEdge",
        data: {
          relationType,
          sourceMultiplicity,
          targetMultiplicity,
          name: edgeName,
        },
      });
    }
  });

  return {
    nodes: finalNodes,
    edges: finalEdges,
    explanation,
  };
}

/**
 * Procesa instrucciones en lenguaje natural para modificar el diagrama activo con Gemini IA.
 */
export async function processDiagramWithGemini(
  prompt: string,
  currentNodes: Node[],
  currentEdges: Edge[],
  diagramName: string = "diagrama",
  apiKey: string = DEFAULT_GEMINI_API_KEY
): Promise<AiDiagramResult> {
  if (!apiKey) {
    throw new Error("No se ha configurado la API Key de Gemini.");
  }

  const currentDiagramState = {
    diagramName,
    nodes: currentNodes.map((n) => ({
      id: n.id,
      type: n.type || "umlClass",
      position: n.position,
      data: {
        name: (n.data as any)?.name || "",
        stereotype: (n.data as any)?.stereotype || "",
        attributes: (n.data as any)?.attributes || [],
        methods: (n.data as any)?.methods || [],
        content: (n.data as any)?.content || "",
      },
    })),
    edges: currentEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || "bottom-source",
      targetHandle: e.targetHandle || "top-target",
      type: "umlEdge",
      data: {
        relationType: (e.data as any)?.relationType || "ASSOCIATION",
        sourceMultiplicity: (e.data as any)?.sourceMultiplicity || "",
        targetMultiplicity: (e.data as any)?.targetMultiplicity || "",
        name: (e.data as any)?.name || (e.data as any)?.label || "",
      },
    })),
  };

  const systemInstruction = `
Eres un Arquitecto de Software y Especialista en Modelado UML 2.5 para un Diagramador de Clases interactivo.
Tu tarea es analizar el estado actual del diagrama UML en formato JSON y modificarlo o expandirlo según la instrucción del usuario en lenguaje natural.

### Reglas del Estándar UML 2.5 y Estructura de Datos:
1. NODOS DE CLASE (type: "umlClass"):
   - id: string único ("class-\${timestamp}-\${index}")
   - name: string en PascalCase (ej: "Usuario", "Factura", "PedidoDetalle")
   - stereotype: string opcional (ej: "interface", "abstract", "service", "entity")
   - attributes: array de objetos { id: string, visibility: "+" | "-" | "#" | "~", name: string, type: string }
     * Visibilidades: "+" = public, "-" = private, "#" = protected, "~" = package
     * Tipos comunes: string, int, Long, double, boolean, Date, List<Tipo>, etc.
   - methods: array de objetos { id: string, visibility: "+" | "-" | "#" | "~", name: string, parameters: string, returnType: string }

2. NODOS DE NOTA (type: "umlNote"):
   - id: string único ("note-\${timestamp}-\${index}")
   - data: { content: string }

3. ARISTAS / RELACIONES UML (type: "umlEdge"):
   - source: ID de la clase/nota origen
   - target: ID de la clase/nota destino
   - data:
     * relationType: "ASSOCIATION" | "DIRECTED_ASSOCIATION" | "GENERALIZATION" | "REALIZATION" | "AGGREGATION" | "COMPOSITION" | "DEPENDENCY"
     * sourceMultiplicity: string opcional ("1", "0..1", "1..*", "*")
     * targetMultiplicity: string opcional ("1", "0..1", "1..*", "*")
     * name: string opcional (verbo o rol de la relación)

### FORMATO JSON REQUERIDO DE RESPUESTA:
{
  "explanation": "Breve resumen en español de lo que se añadió o modificó.",
  "nodes": [ ...todos los nodos actualizados... ],
  "edges": [ ...todas las aristas actualizadas... ]
}
`;

  const userContent = `
Estado actual del diagrama UML:
${JSON.stringify(currentDiagramState, null, 2)}

Instrucción del usuario:
"${prompt}"

Genera el JSON resultante con la estructura solicitada.`;

  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${systemInstruction}\n\n${userContent}` }],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          if ((response.status === 503 || response.status === 429) && attempt < 3) {
            console.warn(`Aviso: Modelo ${model} respondió ${response.status} (intento ${attempt}/3). Reintentando en ${attempt * 800}ms...`);
            await sleep(attempt * 800);
            continue;
          }
          console.warn(`Aviso: Modelo ${model} respondió ${response.status}, probando siguiente modelo...`, errorText);
          lastError = new Error(`Error (${model}): ${response.statusText} - ${errorText}`);
          break;
        }

        const responseData = await response.json();
        const rawText =
          responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        let parsed: any;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          const cleaned = rawText
            .replace(/```json/gi, "")
            .replace(/```/gi, "")
            .trim();
          parsed = JSON.parse(cleaned);
        }

        if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
          throw new Error("La respuesta de la IA no contiene una lista de nodos válida.");
        }

        return normalizeExtractedDiagram(parsed, currentNodes);
      } catch (err: any) {
        if (attempt < 3) {
          await sleep(attempt * 800);
          continue;
        }
        console.warn(`Error procesando con modelo ${model}:`, err);
        lastError = err;
      }
    }
  }

  throw lastError || new Error("No se pudo procesar la solicitud con Gemini AI.");
}

/**
 * Convierte una imagen de un diagrama de clases UML (digital, captura de pantalla, foto de pizarra o boceto a mano)
 * en un diagrama UML 2.5 completo con nodos y aristas normalizados conforme al estándar XMI de Enterprise Architect.
 */
export async function convertImageToDiagramWithGemini(
  base64Data: string,
  mimeType: string,
  apiKey: string = DEFAULT_GEMINI_API_KEY
): Promise<AiDiagramResult> {
  if (!apiKey) {
    throw new Error("No se ha configurado la API Key de Gemini.");
  }

  const promptText = `
Eres un Sistema Experto de Visión por Computadora especializado en reconocimiento y digitalización de Diagramas de Clases UML 2.5.
Tu misión es analizar exhaustivamente la imagen proporcionada (que puede ser un diagrama digital, captura de pantalla de Enterprise Architect / StarUML, foto de pizarra o boceto a mano alzada) y extraer con la más alta fidelidad y rigor:

1. TODAS LAS CLASES UML:
   - Identifica cada caja o rectángulo que represente una clase.
   - Extrae el NOMBRE DE LA CLASE en PascalCase (ej: "Cliente", "Pedido", "DetalleFactura"). ¡NUNCA dejes nombres genéricos ni vacíos!
   - Extrae el ESTEREOTIPO si existe entre << >> (ej: "interface", "abstract", "entity", "service").
   - Extrae TODOS los ATRIBUTOS de la clase en su compartimento:
     * Interpreta la visibilidad: "+" (public), "-" (private), "#" (protected), "~" (package). Si no tiene signo, asume "-".
     * Extrae el nombre del atributo limpio (ej: "id", "fechaCreacion", "total").
     * Extrae el tipo de dato (ej: "int", "Long", "String", "boolean", "double", "Date", "List<Item>"). Si no tiene tipo, asume "string".
     * Estructura requerida: { "visibility": "+"|"-"|"#"|"~", "name": "nombre", "type": "tipo" }
   - Extrae TODOS los MÉTODOS / OPERACIONES de la clase en su compartimento:
     * Interpreta la visibilidad: "+" (public), "-" (private), "#" (protected), "~" (package). Si no tiene signo, asume "+".
     * Extrae el nombre del método (ej: "calcularTotal", "autenticar", "obtenerDetalles").
     * Extrae los parámetros (ej: "id: Long, estado: String" o "" si no tiene).
     * Extrae el tipo de retorno (ej: "void", "boolean", "String", "Usuario"). Si no especifica, asume "void".
     * Estructura requerida: { "visibility": "+"|"-"|"#"|"~", "name": "nombre", "parameters": "...", "returnType": "..." }

2. NOTAS Y COMENTARIOS UML:
   - Identifica cajas de notas (esquina doblada) y extrae su texto en { "type": "umlNote", "content": "..." }.

3. TODAS LAS RELACIONES ENTRE CLASES (ARISTAS):
   - Reconoce las líneas que conectan clases y su semántica UML exacta:
     * "ASSOCIATION": Línea sólida simple sin flecha.
     * "DIRECTED_ASSOCIATION": Línea sólida con flecha abierta en la punta (►).
     * "GENERALIZATION": Herencia con triángulo cerrado hueco (▷).
     * "REALIZATION": Implementación con línea punteada y triángulo hueco ( - - ▷).
     * "AGGREGATION": Agregación con rombo hueco blanco (◇).
     * "COMPOSITION": Composición con rombo relleno negro (◆).
     * "DEPENDENCY": Dependencia con línea punteada y flecha abierta (- - ►).
   - "source": Nombre o ID de la clase origen.
   - "target": Nombre o ID de la clase destino.
   - "sourceMultiplicity": Multiplicidad cerca del origen (ej: "1", "0..1", "1..*", "*").
   - "targetMultiplicity": Multiplicidad cerca del destino (ej: "1", "0..1", "1..*", "*").
   - "name": Nombre o verbo de la relación si aparece sobre o junto a la línea (ej: "contiene", "genera", "pertenece").

4. REGLAS CRÍTICAS DE CALIDAD:
   - Haz tu máximo esfuerzo para leer los textos manuscritos o pequeños.
   - No omitas ningún atributo ni método legible.
   - Devuelve ÚNICAMENTE un JSON estrictamente válido según la estructura requerida.

### FORMATO JSON REQUERIDO:
{
  "explanation": "Resumen en español del diagrama detectado en la imagen.",
  "nodes": [
    {
      "id": "class-1",
      "type": "umlClass",
      "name": "NombreClase",
      "stereotype": "",
      "attributes": [
        { "visibility": "-", "name": "id", "type": "Long" },
        { "visibility": "-", "name": "nombre", "type": "String" }
      ],
      "methods": [
        { "visibility": "+", "name": "calcularTotal", "parameters": "descuento: double", "returnType": "double" }
      ]
    }
  ],
  "edges": [
    {
      "source": "NombreClaseOrigen",
      "target": "NombreClaseDestino",
      "relationType": "ASSOCIATION",
      "sourceMultiplicity": "1",
      "targetMultiplicity": "1..*",
      "name": "contiene"
    }
  ]
}
`;

  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: promptText },
                    {
                      inlineData: {
                        mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          if ((response.status === 503 || response.status === 429) && attempt < 3) {
            console.warn(`Aviso: Modelo ${model} respondió ${response.status} para visión (intento ${attempt}/3). Reintentando en ${attempt * 1000}ms...`);
            await sleep(attempt * 1000);
            continue;
          }
          console.warn(`Aviso: Modelo ${model} respondió ${response.status} para visión, probando siguiente modelo...`, errorText);
          lastError = new Error(`Error (${model}): ${response.statusText}`);
          break;
        }

        const responseData = await response.json();
        const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        let parsed: any;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          const cleaned = rawText.replace(/```json/gi, "").replace(/```/gi, "").trim();
          parsed = JSON.parse(cleaned);
        }

        if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
          throw new Error("La IA no pudo extraer clases o nodos del diagrama de la imagen.");
        }

        // Normalización integral con los criterios de Enterprise Architect
        return normalizeExtractedDiagram(parsed);
      } catch (err: any) {
        if (attempt < 3) {
          await sleep(attempt * 1000);
          continue;
        }
        console.warn(`Error procesando imagen con modelo ${model}:`, err);
        lastError = err;
      }
    }
  }

  throw lastError || new Error("No se pudo procesar la imagen con Gemini Vision AI.");
}

