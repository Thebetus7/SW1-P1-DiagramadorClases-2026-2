import { Edge, Node } from "@xyflow/react";
import { UmlClassData, UmlEdgeData, UmlRelationType, UmlVisibility } from "@/types";

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

// Modelos activos y vigentes en la API de Google Gemini (2.5 Flash como principal, y modelos modernos de fallback)
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.6-flash",
  "gemini-3.1-pro-preview",
  "gemini-2.5-flash-lite",
];

/**
 * Normaliza visibilidad UML
 */
function normalizeVisibility(vis: any): UmlVisibility {
  if (vis === "+" || vis === "-" || vis === "#" || vis === "~") {
    return vis;
  }
  if (typeof vis === "string") {
    const lower = vis.toLowerCase();
    if (lower.includes("pub") || lower === "+") return "+";
    if (lower.includes("priv") || lower === "-") return "-";
    if (lower.includes("prot") || lower === "#") return "#";
    if (lower.includes("pack") || lower === "~") return "~";
  }
  return "+";
}

/**
 * Normaliza tipo de relación UML 2.5
 */
function normalizeRelationType(rel: any): UmlRelationType {
  const map: Record<string, UmlRelationType> = {
    ASSOCIATION: "ASSOCIATION",
    DIRECTED_ASSOCIATION: "DIRECTED_ASSOCIATION",
    GENERALIZATION: "GENERALIZATION",
    HERENCIA: "GENERALIZATION",
    REALIZATION: "REALIZATION",
    IMPLEMENTATION: "REALIZATION",
    AGGREGATION: "AGGREGATION",
    AGREGACION: "AGGREGATION",
    COMPOSITION: "COMPOSITION",
    COMPOSICION: "COMPOSITION",
    DEPENDENCY: "DEPENDENCY",
    DEPENDENCIA: "DEPENDENCY",
  };
  if (typeof rel === "string") {
    const upper = rel.toUpperCase().replace(/\s+/g, "_");
    if (map[upper]) return map[upper];
  }
  return "ASSOCIATION";
}

/**
 * Calcula posición no colisionante para un nuevo nodo
 */
function calculateNextPosition(existingNodes: Node[], indexOffset: number = 0): { x: number; y: number } {
  if (existingNodes.length === 0) {
    return { x: 140 + indexOffset * 280, y: 140 };
  }

  const cols = 3;
  const col = (existingNodes.length + indexOffset) % cols;
  const row = Math.floor((existingNodes.length + indexOffset) / cols);

  return {
    x: 100 + col * 320,
    y: 100 + row * 260,
  };
}

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

  // Preparar estado limpio del diagrama actual para enviar a la IA
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
   - id: string único (mantén los existentes si solo se modifican; para nuevos usa formato "class-\${timestamp}-\${index}")
   - type: "umlClass"
   - position: { x: number, y: number } (ubica las nuevas clases de forma ordenada sin superponer con las existentes)
   - data:
     - name: string en PascalCase (ej: "Usuario", "Factura", "PedidoDetalle")
     - stereotype: string opcional (ej: "interface", "abstract", "service", "entity", "repository", "controller")
     - attributes: array de objetos con estructura:
       { id: string, visibility: "+" | "-" | "#" | "~", name: string, type: string }
       - Visibilidades: "+" = public, "-" = private, "#" = protected, "~" = package
       - Tipos comunes: string, int, Long, double, boolean, Date, List<Tipo>, etc.
     - methods: array de objetos con estructura:
       { id: string, visibility: "+" | "-" | "#" | "~", name: string, parameters: string, returnType: string }
       - Parámetros: ej. "id: Long, total: double" o vacío ""
       - returnType: ej. "void", "String", "boolean", "List<Usuario>", etc.

2. NODOS DE NOTA (type: "umlNote"):
   - id: string único (ej: "note-\${timestamp}-\${index}")
   - type: "umlNote"
   - position: { x: number, y: number }
   - data: { content: string }

3. ARISTAS / RELACIONES UML (type: "umlEdge"):
   - id: string único (ej: "edge-\${timestamp}-\${index}")
   - source: ID de la clase/nota origen
   - target: ID de la clase/nota destino
   - sourceHandle: uno de ["top-source", "bottom-source", "left-source", "right-source"]
   - targetHandle: uno de ["top-target", "bottom-target", "left-target", "right-target"]
   - type: "umlEdge"
   - data:
     - relationType: uno de:
       - "ASSOCIATION" (Asociación simple)
       - "DIRECTED_ASSOCIATION" (Asociación dirigida / navegación)
       - "GENERALIZATION" (Herencia: de subclase a superclase)
       - "REALIZATION" (Implementación de interfaz: de clase a interfaz)
       - "AGGREGATION" (Agregación: rombo blanco en source, relación todo-parte)
       - "COMPOSITION" (Composición: rombo negro en source, dependencia existencial fuerte)
       - "DEPENDENCY" (Dependencia / uso: flecha punteada)
     - sourceMultiplicity: string opcional (ej: "1", "0..1", "1..*", "*", "")
     - targetMultiplicity: string opcional (ej: "1", "0..1", "1..*", "*", "")
     - name: string opcional (nombre, verbo o rol de la relación, ej: "contiene", "actualiza", "es", "depende", "administra", "pertenece a", "genera", "compra")

4. COMPORTAMIENTO ESPERADO:
   - NOMBRAMIENTO DE RELACIONES: Si el usuario dice frases como:
     * "esta clase X conecta/relaciona con clase Y y diga 'depende'"
     * "relaciona Factura con Cliente diciendo 'pertenece a'"
     * "conecta A con B con nombre 'contiene'"
     * "relación con verbo 'actualiza'"
     asigna obligatoriamente ese texto en el campo 'name' del objeto data del edge (ej: data: { relationType: "DEPENDENCY", name: "depende" }).
   - Si el usuario pide añadir clases o atributos, conserva las clases y relaciones previas intactas e incorpora las nuevas.
   - Si el usuario pide "añade una clase X con atributos A, B y operaciones C", créala con las visibilidades y tipos adecuados.
   - Si pide "incluir interfaz I a la clase C", crea la interfaz si no existe (stereotype: "interface") y crea la relación REALIZATION desde C hacia I.
   - Si pide "relaciona la clase A con la clase B con [tipo de relación]", resuelve los IDs de A y B y añade el edge con el relationType, name y multiplicidades correspondientes.
   - Si pide "añade una nota para la clase X", crea el nodo umlNote y puedes agregar una relación DEPENDENCY hacia X.
   - Devuelve SIEMPRE una respuesta JSON válida que contenga el diagrama completo actualizado y una explicación en español de lo realizado.

### FORMATO JSON REQUERIDO DE RESPUESTA:
{
  "explanation": "Breve resumen en español de lo que se añadió o modificó en el diagrama.",
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
    // Reintentar hasta 3 veces si hay error 503 (alta demanda momentánea)
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
          break; // Pasar al siguiente modelo
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

        const now = Date.now();

        // Normalizar y enriquecer nodos
        const finalNodes: Node[] = parsed.nodes.map((n: any, idx: number) => {
          const isNote = n.type === "umlNote";
          const nodeId = n.id || `${isNote ? "note" : "class"}-${now}-${idx}`;

          let pos = n.position;
          if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
            pos = calculateNextPosition(currentNodes, idx);
          }

          if (isNote) {
            return {
              id: nodeId,
              type: "umlNote",
              position: pos,
              data: {
                content: n.data?.content || "Nota UML",
              },
            };
          }

          // Clase UML
          const rawAttrs = Array.isArray(n.data?.attributes) ? n.data.attributes : [];
          const rawMethods = Array.isArray(n.data?.methods) ? n.data.methods : [];

          const normalizedAttrs = rawAttrs.map((attr: any, aIdx: number) => {
            if (typeof attr === "string") {
              return {
                id: `attr-${now}-${aIdx}`,
                visibility: "+",
                name: attr,
                type: "string",
              };
            }
            return {
              id: attr.id || `attr-${now}-${aIdx}`,
              visibility: normalizeVisibility(attr.visibility),
              name: attr.name || `attr_${aIdx + 1}`,
              type: attr.type || "string",
            };
          });

          const normalizedMethods = rawMethods.map((m: any, mIdx: number) => {
            if (typeof m === "string") {
              return {
                id: `meth-${now}-${mIdx}`,
                visibility: "+",
                name: m,
                parameters: "",
                returnType: "void",
              };
            }
            return {
              id: m.id || `meth-${now}-${mIdx}`,
              visibility: normalizeVisibility(m.visibility),
              name: m.name || `metodo_${mIdx + 1}`,
              parameters: m.parameters || "",
              returnType: m.returnType || "void",
            };
          });

          return {
            id: nodeId,
            type: "umlClass",
            position: pos,
            data: {
              name: n.data?.name || `Clase_${idx + 1}`,
              stereotype: n.data?.stereotype || "",
              attributes: normalizedAttrs,
              methods: normalizedMethods,
            },
          };
        });

        // Normalizar relaciones
        const rawEdges = Array.isArray(parsed.edges) ? parsed.edges : [];
        const validNodeIds = new Set(finalNodes.map((n) => n.id));

        const finalEdges: Edge[] = rawEdges
          .filter((e: any) => validNodeIds.has(e.source) && validNodeIds.has(e.target))
          .map((e: any, eIdx: number) => {
            const edgeName =
              e.data?.name ||
              e.data?.label ||
              e.name ||
              e.label ||
              "";

            return {
              id: e.id || `edge-${now}-${eIdx}`,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle || "bottom-source",
              targetHandle: e.targetHandle || "top-target",
              type: "umlEdge",
              data: {
                relationType: normalizeRelationType(e.data?.relationType || e.type),
                sourceMultiplicity: e.data?.sourceMultiplicity || "",
                targetMultiplicity: e.data?.targetMultiplicity || "",
                name: edgeName,
              },
            };
          });

        return {
          nodes: finalNodes,
          edges: finalEdges,
          explanation:
            parsed.explanation ||
            "Diagrama actualizado correctamente según las instrucciones con Gemini AI.",
        };
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
 * Convierte una imagen de un diagrama de clases UML (digital o hecho a mano)
 * en un JSON estructurado compatible con el diagramador, usando Gemini Visión Multimodal.
 */
export async function convertImageToDiagramWithGemini(
  base64Data: string,
  mimeType: string,
  apiKey: string = DEFAULT_GEMINI_API_KEY
): Promise<AiDiagramResult> {
  if (!apiKey) {
    throw new Error("No se ha configurado la API Key de Gemini.");
  }

  const systemInstruction = `
Eres un Sistema de Visión por Computadora especializado en reconocimiento de Diagramas de Clases UML 2.5.
Tu tarea es analizar la imagen proporcionada (puede ser un diagrama digital, una captura de pantalla, una foto de pizarra o un boceto hecho a mano) y extraer con precisión TODAS las clases, atributos, métodos, estereotipos, notas y relaciones UML que encuentres.

### REGLAS DE EXTRACCIÓN:

1. CLASES (type: "umlClass"):
   - Identifica cada rectángulo o caja que represente una clase UML.
   - Extrae:
     - name: nombre de la clase en PascalCase.
     - stereotype: si hay texto entre <<>> (ej: "interface", "abstract", "entity", "service").
     - attributes: cada línea en el compartimento de atributos.
       Formato: { id: "attr-N", visibility: "+"|"-"|"#"|"~", name: string, type: string }
       Interpreta visibilidades: "+" (public), "-" (private), "#" (protected), "~" (package).
       Si no se ve visibilidad, usa "-" para atributos.
     - methods: cada línea en el compartimento de métodos/operaciones.
       Formato: { id: "meth-N", visibility: "+"|"-"|"#"|"~", name: string, parameters: string, returnType: string }
       Si no se ve visibilidad, usa "+" para métodos.
   - position: estima coordenadas { x, y } aproximadas basándote en la ubicación relativa de la clase en la imagen.
     Usa un rango de x: 50-900 y y: 50-700. Las clases que estén a la izquierda deben tener menor x, las de arriba menor y.

2. NOTAS (type: "umlNote"):
   - Identifica rectángulos con esquina doblada o cajas de texto que sean notas/comentarios.
   - Extrae: { id: "note-N", type: "umlNote", position: {x, y}, data: { content: "texto de la nota" } }

3. RELACIONES / CONECTORES (type: "umlEdge"):
   - Identifica TODAS las líneas que conectan clases entre sí.
   - Determina el tipo de relación por los símbolos en los extremos:
     - Línea simple sin flechas = "ASSOCIATION"
     - Flecha abierta (►) = "DIRECTED_ASSOCIATION"
     - Triángulo vacío (▷) con línea sólida = "GENERALIZATION" (herencia)
     - Triángulo vacío (▷) con línea punteada = "REALIZATION" (implementación)
     - Rombo vacío (◇) = "AGGREGATION"
     - Rombo relleno (◆) = "COMPOSITION"
     - Flecha abierta con línea punteada (- - ►) = "DEPENDENCY"
   - Extrae multiplicidades si son visibles (ej: "1", "0..*", "1..*", "*").
   - Extrae el nombre/verbo de la relación si está escrito cerca de la línea.
   - sourceHandle y targetHandle: usa "bottom-source"/"top-target" por defecto, o ajusta según la dirección visual de la conexión.

4. FORMATO DE RESPUESTA (JSON estricto):
{
  "explanation": "Descripción en español de lo que se encontró en la imagen.",
  "nodes": [ ...todos los nodos extraídos (clases y notas)... ],
  "edges": [ ...todas las relaciones extraídas... ]
}

5. IMPORTANTE:
   - Si la imagen está borrosa o tiene texto ilegible, haz tu mejor esfuerzo para interpretar los nombres y tipos.
   - Si un boceto es a mano, interpreta las cajas como clases y las líneas como relaciones.
   - Mantén los IDs únicos y consistentes entre source/target de edges y los IDs de los nodos.
   - Devuelve SIEMPRE JSON válido, nunca texto adicional fuera del JSON.
`;

  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
    // Reintentar hasta 3 veces con backoff si responde 503 (alta demanda momentánea)
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
                    { text: systemInstruction + "\n\nAnaliza la siguiente imagen de diagrama UML y extrae toda la información en formato JSON." },
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
          break; // Pasar al siguiente modelo
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
          throw new Error("La IA no pudo extraer nodos del diagrama de la imagen.");
        }

        const now = Date.now();

        // Normalizar nodos
        const finalNodes: Node[] = parsed.nodes.map((n: any, idx: number) => {
          const isNote = n.type === "umlNote";
          const nodeId = n.id || `${isNote ? "note" : "class"}-${now}-${idx}`;

          let pos = n.position;
          if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
            const cols = 3;
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            pos = { x: 80 + col * 320, y: 80 + row * 260 };
          }

          if (isNote) {
            return {
              id: nodeId,
              type: "umlNote",
              position: pos,
              data: { content: n.data?.content || "Nota importada" },
            };
          }

          const rawAttrs = Array.isArray(n.data?.attributes) ? n.data.attributes : [];
          const rawMethods = Array.isArray(n.data?.methods) ? n.data.methods : [];

          return {
            id: nodeId,
            type: "umlClass",
            position: pos,
            data: {
              name: n.data?.name || `Clase_${idx + 1}`,
              stereotype: n.data?.stereotype || "",
              attributes: rawAttrs.map((attr: any, aIdx: number) => {
                if (typeof attr === "string") {
                  return { id: `attr-${now}-${idx}-${aIdx}`, visibility: "-", name: attr, type: "string" };
                }
                return {
                  id: attr.id || `attr-${now}-${idx}-${aIdx}`,
                  visibility: normalizeVisibility(attr.visibility),
                  name: attr.name || `attr_${aIdx + 1}`,
                  type: attr.type || "string",
                };
              }),
              methods: rawMethods.map((m: any, mIdx: number) => {
                if (typeof m === "string") {
                  return { id: `meth-${now}-${idx}-${mIdx}`, visibility: "+", name: m, parameters: "", returnType: "void" };
                }
                return {
                  id: m.id || `meth-${now}-${idx}-${mIdx}`,
                  visibility: normalizeVisibility(m.visibility),
                  name: m.name || `metodo_${mIdx + 1}`,
                  parameters: m.parameters || "",
                  returnType: m.returnType || "void",
                };
              }),
            },
          };
        });

        // Normalizar edges
        const rawEdges = Array.isArray(parsed.edges) ? parsed.edges : [];
        const validNodeIds = new Set(finalNodes.map((n) => n.id));

        const finalEdges: Edge[] = rawEdges
          .filter((e: any) => validNodeIds.has(e.source) && validNodeIds.has(e.target))
          .map((e: any, eIdx: number) => ({
            id: e.id || `edge-${now}-${eIdx}`,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || "bottom-source",
            targetHandle: e.targetHandle || "top-target",
            type: "umlEdge",
            data: {
              relationType: normalizeRelationType(e.data?.relationType || e.type),
              sourceMultiplicity: e.data?.sourceMultiplicity || "",
              targetMultiplicity: e.data?.targetMultiplicity || "",
              name: e.data?.name || e.data?.label || "",
            },
          }));

        return {
          nodes: finalNodes,
          edges: finalEdges,
          explanation: parsed.explanation || "Diagrama extraído correctamente desde la imagen con Gemini Vision AI.",
        };
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
