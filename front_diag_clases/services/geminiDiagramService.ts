import { Edge, Node } from "@xyflow/react";
import { UmlAttribute, UmlClassData, UmlEdgeData, UmlMethod, UmlRelationType, UmlVisibility, ChatMessage } from "@/types";
import { cleanSpecialCharacters } from "./xmiEncodingHelper";

export interface AiDiagramResult {
  nodes: Node[];
  edges: Edge[];
  explanation: string;
}

export interface ImageAttachmentData {
  base64Data: string;
  mimeType: string;
}

const DEFAULT_GEMINI_API_KEY =
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  "";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Modelos activos y vigentes en la API de Google Gemini (2.5 Flash como principal con alta capacidad de visión)
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
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
    ASSOCIATION_CLASS: "ASSOCIATION_CLASS",
    CLASE_DE_ASOCIACION: "ASSOCIATION_CLASS",
    CLASE_ASOCIATIVA: "ASSOCIATION_CLASS",
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
  existingNodes: Node[] = [],
  existingEdges: Edge[] = []
): { nodes: Node[]; edges: Edge[]; explanation: string } {
  const rawNodes = Array.isArray(rawResult?.nodes)
    ? rawResult.nodes
    : Array.isArray(rawResult?.classes)
    ? rawResult.classes
    : Array.isArray(rawResult?.classesDelta)
    ? rawResult.classesDelta
    : [];
  const rawEdges = Array.isArray(rawResult?.edges)
    ? rawResult.edges
    : Array.isArray(rawResult?.relationships)
    ? rawResult.relationships
    : Array.isArray(rawResult?.relations)
    ? rawResult.relations
    : [];
  const explanation =
    rawResult?.explanation ||
    rawResult?.summary ||
    "Diagrama UML 2.5 procesado y reconocido correctamente.";

  const now = Date.now();

  // Mapeo flexible de identificadores (permite resolver tanto por ID como por nombre de clase)
  const nodeLookup = new Map<string, string>(); // token normalizado -> nodeId real
  const nodePositions = new Map<string, { x: number; y: number }>();

  // Registrar nodos existentes en caso de haber sido proporcionados
  existingNodes.forEach((n) => {
    nodeLookup.set(n.id.toLowerCase(), n.id);
    const nName = ((n.data as any)?.name || "").toString().trim();
    if (nName) {
      nodeLookup.set(nName.toLowerCase(), n.id);
      nodeLookup.set(cleanSpecialCharacters(nName).toLowerCase(), n.id);
    }
    if (n.position) {
      nodePositions.set(n.id, n.position);
    }
  });

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
    const className = cleanSpecialCharacters(rawName) || `Clase_${idx + 1}`;

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
  const validNodeIds = new Set([
    ...finalNodes.map((n) => n.id),
    ...existingNodes.map((n) => n.id),
  ]);

  const resolveNodeId = (ref: any): string | null => {
    if (!ref) return null;
    const str = String(ref).trim().toLowerCase();
    if (nodeLookup.has(str)) return nodeLookup.get(str)!;
    // Búsqueda por subcadena
    for (const [key, val] of nodeLookup.entries()) {
      if (key && str && (key === str || key.includes(str) || str.includes(key))) {
        return val;
      }
    }
    return null;
  };

  // Separar aristas binarias normales de clases de asociación ('T')
  const normalEdges: any[] = [];
  const associationEdges: any[] = [];

  rawEdges.forEach((e: any) => {
    const rawRel = e.data?.relationType || e.relationType || e.type || e.relationship;
    const relType = normalizeRelationType(rawRel);
    const isAssoc =
      e.type === "umlAssociationClassEdge" ||
      relType === "ASSOCIATION_CLASS" ||
      Boolean(
        e.data?.isAssociationClass ||
        e.isAssociationClass ||
        e.data?.targetEdgeId ||
        e.targetEdgeId ||
        e.data?.intermediateNodeId ||
        e.intermediateNodeId
      );

    if (isAssoc) {
      associationEdges.push(e);
    } else {
      normalEdges.push(e);
    }
  });

  const finalEdges: Edge[] = [];
  const processedPairs = new Set<string>();

  // 2.1 Procesar primero aristas normales para registrar las aristas base
  normalEdges.forEach((e: any, eIdx: number) => {
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

  // 2.2 Procesar clases de asociación en 'T' (ancladas a aristas base con línea discontinua perpendicular)
  const allBaseEdgesPool = [
    ...finalEdges.filter((fe) => fe.type !== "umlAssociationClassEdge"),
    ...existingEdges.filter((ee) => ee.type !== "umlAssociationClassEdge"),
  ];

  associationEdges.forEach((e: any, aIdx: number) => {
    const rawSource = e.source || e.from || e.origen;
    const rawTarget = e.target || e.to || e.destino;
    const rawInter = e.data?.intermediateNodeId || e.intermediateNodeId || rawSource;
    const rawParent1 = e.data?.sourceClassId || e.sourceClassId || e.sourceClass;
    const rawParent2 = e.data?.targetClassId || e.targetClassId || e.targetClass;
    let targetEdgeId = String(e.data?.targetEdgeId || e.targetEdgeId || "").trim();

    const resolvedInter = resolveNodeId(rawInter) || resolveNodeId(rawSource);
    let resolvedParent1 = resolveNodeId(rawParent1);
    let resolvedParent2 = resolveNodeId(rawParent2);

    // Caso especial: rawTarget puede ser directamente el ID de la arista base generada o existente
    if (rawTarget && !targetEdgeId) {
      const matchBaseEdge = allBaseEdgesPool.find(
        (be) => be.id === rawTarget || be.id.toLowerCase() === String(rawTarget).toLowerCase().trim()
      );
      if (matchBaseEdge) {
        targetEdgeId = matchBaseEdge.id;
        if (!resolvedParent1) resolvedParent1 = matchBaseEdge.source;
        if (!resolvedParent2) resolvedParent2 = matchBaseEdge.target;
      }
    }

    const resolvedTarget = resolveNodeId(rawTarget);
    if (!resolvedParent1 && resolvedTarget && resolvedTarget !== resolvedInter) {
      resolvedParent1 = resolvedTarget;
    } else if (
      !resolvedParent2 &&
      resolvedTarget &&
      resolvedTarget !== resolvedInter &&
      resolvedTarget !== resolvedParent1
    ) {
      resolvedParent2 = resolvedTarget;
    }

    // Si targetEdgeId existe, buscar la arista base entre las aristas registradas o preexistentes
    if (targetEdgeId) {
      const foundBase = allBaseEdgesPool.find((fe) => fe.id === targetEdgeId);
      if (foundBase) {
        if (!resolvedParent1) resolvedParent1 = foundBase.source;
        if (!resolvedParent2) resolvedParent2 = foundBase.target;
      }
    }

    // Si solo tenemos un extremo padre resuelto, buscar si ese padre participa en una arista base activa
    if (!targetEdgeId && resolvedParent1 && !resolvedParent2) {
      const candidateBase = allBaseEdgesPool.find(
        (be) =>
          (be.source === resolvedParent1 || be.target === resolvedParent1) &&
          be.source !== resolvedInter &&
          be.target !== resolvedInter
      );
      if (candidateBase) {
        targetEdgeId = candidateBase.id;
        resolvedParent2 = candidateBase.source === resolvedParent1 ? candidateBase.target : candidateBase.source;
      }
    } else if (!targetEdgeId && !resolvedParent1 && resolvedParent2) {
      const candidateBase = allBaseEdgesPool.find(
        (be) =>
          (be.source === resolvedParent2 || be.target === resolvedParent2) &&
          be.source !== resolvedInter &&
          be.target !== resolvedInter
      );
      if (candidateBase) {
        targetEdgeId = candidateBase.id;
        resolvedParent1 = candidateBase.source === resolvedParent2 ? candidateBase.target : candidateBase.source;
      }
    }

    // Si no tenemos targetEdgeId pero tenemos ambos padres, buscar la arista base o sintetizarla
    if (!targetEdgeId && resolvedParent1 && resolvedParent2) {
      const foundBase = allBaseEdgesPool.find(
        (fe) =>
          (fe.source === resolvedParent1 && fe.target === resolvedParent2) ||
          (fe.source === resolvedParent2 && fe.target === resolvedParent1)
      );
      if (foundBase) {
        targetEdgeId = foundBase.id;
      } else if (validNodeIds.has(resolvedParent1) && validNodeIds.has(resolvedParent2)) {
        // Generar la arista base requerida por el estándar UML 2.5
        targetEdgeId = `edge-base-${now}-${aIdx}`;
        const p1Pos = nodePositions.get(resolvedParent1) || { x: 0, y: 0 };
        const p2Pos = nodePositions.get(resolvedParent2) || { x: 300, y: 300 };
        const handles = calculateBestHandles(p1Pos, p2Pos);

        const newBaseEdge: Edge = {
          id: targetEdgeId,
          source: resolvedParent1,
          target: resolvedParent2,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          type: "umlEdge",
          data: {
            relationType: "ASSOCIATION",
            sourceMultiplicity: "",
            targetMultiplicity: "",
            name: "",
          },
        };
        finalEdges.push(newBaseEdge);
        allBaseEdgesPool.push(newBaseEdge);
      }
    }

    const effectiveSource = resolvedInter;
    const effectiveTarget =
      resolvedParent1 ||
      resolvedParent2 ||
      (resolvedTarget && validNodeIds.has(resolvedTarget) ? resolvedTarget : null);

    if (
      effectiveSource &&
      effectiveTarget &&
      validNodeIds.has(effectiveSource) &&
      validNodeIds.has(effectiveTarget)
    ) {
      const parentsKey = [resolvedParent1 || effectiveTarget, resolvedParent2 || ""].sort().join("<->");
      const assocKey = `assoc:${effectiveSource}->[${parentsKey}]`;
      if (processedPairs.has(assocKey)) return;
      processedPairs.add(assocKey);

      const sourcePos = nodePositions.get(effectiveSource) || { x: 0, y: 0 };
      const targetPos = nodePositions.get(effectiveTarget) || { x: 300, y: 300 };
      const { sourceHandle, targetHandle } = calculateBestHandles(sourcePos, targetPos);

      const edgeName = cleanSpecialCharacters(
        String(e.data?.name || e.name || e.data?.label || e.label || "").trim()
      );
      const sourceMultiplicity = cleanSpecialCharacters(
        String(e.data?.sourceMultiplicity || e.sourceMultiplicity || "").trim()
      );
      const targetMultiplicity = cleanSpecialCharacters(
        String(e.data?.targetMultiplicity || e.targetMultiplicity || "").trim()
      );

      finalEdges.push({
        id: e.id || `assoc-edge-${now}-${aIdx}`,
        source: effectiveSource,
        target: effectiveTarget,
        sourceHandle: e.sourceHandle || sourceHandle,
        targetHandle: e.targetHandle || targetHandle,
        type: "umlAssociationClassEdge",
        data: {
          relationType: "ASSOCIATION_CLASS",
          sourceMultiplicity,
          targetMultiplicity,
          name: edgeName,
          isAssociationClass: true,
          targetEdgeId: targetEdgeId || "",
          sourceClassId: resolvedParent1 || effectiveTarget,
          targetClassId: resolvedParent2 || "",
          intermediateNodeId: effectiveSource,
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
  apiKey: string = DEFAULT_GEMINI_API_KEY,
  chatHistory?: ChatMessage[]
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
    edges: currentEdges.map((e) => {
      const isAssoc =
        e.type === "umlAssociationClassEdge" ||
        (e.data as any)?.relationType === "ASSOCIATION_CLASS" ||
        Boolean((e.data as any)?.isAssociationClass || (e.data as any)?.targetEdgeId);

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || "bottom-source",
        targetHandle: e.targetHandle || "top-target",
        type: isAssoc ? "umlAssociationClassEdge" : (e.type || "umlEdge"),
        data: {
          relationType: (e.data as any)?.relationType || (isAssoc ? "ASSOCIATION_CLASS" : "ASSOCIATION"),
          sourceMultiplicity: (e.data as any)?.sourceMultiplicity || "",
          targetMultiplicity: (e.data as any)?.targetMultiplicity || "",
          name: (e.data as any)?.name || (e.data as any)?.label || "",
          ...(isAssoc
            ? {
                isAssociationClass: true,
                targetEdgeId: (e.data as any)?.targetEdgeId || "",
                sourceClassId: (e.data as any)?.sourceClassId || "",
                targetClassId: (e.data as any)?.targetClassId || "",
                intermediateNodeId: (e.data as any)?.intermediateNodeId || e.source || "",
              }
            : {}),
        },
      };
    }),
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
     * relationType: "ASSOCIATION" | "DIRECTED_ASSOCIATION" | "GENERALIZATION" | "REALIZATION" | "AGGREGATION" | "COMPOSITION" | "DEPENDENCY" | "ASSOCIATION_CLASS"
     * sourceMultiplicity: string opcional ("1", "0..1", "1..*", "*")
     * targetMultiplicity: string opcional ("1", "0..1", "1..*", "*")
     * name: string opcional (verbo o rol de la relación)

4. CLASES DE ASOCIACIÓN EN 'T' (UML 2.5):
   - Cuando se describa una relación muchos a muchos con atributos propios (ej: "Usuario y Diagrama tienen Colaborador con rol", "Estudiante y Curso con Inscripcion"):
     * Modela la clase intermedia con sus atributos (type: "umlClass").
     * Modela la relación base directa entre las dos clases padre (type: "umlEdge").
     * Conecta la clase intermedia a la relación base usando:
       type: "umlAssociationClassEdge",
       source: idClaseIntermedia,
       target: idClasePadre1,
       data: {
         relationType: "ASSOCIATION_CLASS",
         isAssociationClass: true,
         targetEdgeId: idAristaBase,
         sourceClassId: idClasePadre1,
         targetClassId: idClasePadre2,
         intermediateNodeId: idClaseIntermedia,
         name: ""
       }

### FORMATO JSON REQUERIDO DE RESPUESTA:
{
  "explanation": "Propuesta técnica directa en español redactada OBLIGATORIAMENTE en tiempo futuro indicando con precisión qué vas a hacer antes de que se confirme (por ejemplo: 'Voy a agregar la clase Factura con atributos id y fecha, y estableceré la relación con Pedido...'). NUNCA uses tiempo pasado ni digas 'Se agregaron' o 'He agregado'.",
  "nodes": [ ...todos los nodos actualizados... ],
  "edges": [ ...todas las aristas actualizadas... ]
}
`;

  const historyContext =
    chatHistory && chatHistory.length > 0
      ? `\nMemoria conversacional previa (últimos ${Math.min(chatHistory.length, 8)} mensajes):\n` +
        chatHistory
          .slice(-8)
          .map((m) => {
            const role = m.senderType === "USER" ? `@${m.userName || "Usuario"}` : "Copilot IA";
            const text = m.proposal?.summary || m.content;
            return `- ${role}: ${text}`;
          })
          .join("\n") +
        "\n"
      : "";

  const userContent = `
Estado actual del diagrama UML:
${JSON.stringify(currentDiagramState, null, 2)}
${historyContext}
Instrucción del usuario:
"${prompt}"

Genera el JSON resultante con la estructura solicitada.`;

  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🌐 [Gemini API - Modo Editor] Consultando '${model}' (intento ${attempt}/3)...`);
        const editStart = performance.now();
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

        const editDuration = ((performance.now() - editStart) / 1000).toFixed(2);

        if (!response.ok) {
          const errorText = await response.text();
          if ((response.status === 503 || response.status === 429) && attempt < 3) {
            console.warn(`⚠️ [Gemini API] '${model}' respondió ${response.status} en ${editDuration}s. Reintentando en ${attempt * 800}ms...`);
            await sleep(attempt * 800);
            continue;
          }
          console.warn(`⚠️ [Gemini API] '${model}' respondió ${response.status} en ${editDuration}s, probando modelo alternativo...`, errorText);
          lastError = new Error(`Error (${model}): ${response.statusText} - ${errorText}`);
          break;
        }

        console.log(`✨ [Gemini API - Modo Editor] Modelo '${model}' generó estructura JSON en ${editDuration}s`);
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

        return normalizeExtractedDiagram(parsed, currentNodes, currentEdges);
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

function getAttributeName(attr: any): string {
  if (typeof attr === "string") {
    const clean = attr.replace(/^[+\-#~]\s*/, "").split(":")[0].trim();
    return clean.toLowerCase();
  }
  return String(attr?.name || "").toLowerCase().trim();
}

function getMethodName(meth: any): string {
  if (typeof meth === "string") {
    const clean = meth.replace(/^[+\-#~]\s*/, "").split("(")[0].trim();
    return clean.toLowerCase();
  }
  return String(meth?.name || "").toLowerCase().trim();
}

export function mergeAttributes(existing: any[], incoming: any[]): any[] {
  const result = [...existing];
  const existingNames = new Set(existing.map(getAttributeName).filter(Boolean));

  for (const item of incoming) {
    const name = getAttributeName(item);
    if (name && !existingNames.has(name)) {
      existingNames.add(name);
      result.push(item);
    }
  }
  return result;
}

export function mergeMethods(existing: any[], incoming: any[]): any[] {
  const result = [...existing];
  const existingNames = new Set(existing.map(getMethodName).filter(Boolean));

  for (const item of incoming) {
    const name = getMethodName(item);
    if (name && !existingNames.has(name)) {
      existingNames.add(name);
      result.push(item);
    }
  }
  return result;
}

/**
 * Aplica la estrategia de FUSIÓN CONTEXTUAL (MERGE por defecto) y cálculo de layout espacial
 * para integrar los elementos reconocidos de una imagen preservando el 100% de las entidades
 * y evitando solapamientos espaciales respecto al bounding box actual (RB-07.4 y RB-07.5).
 */
export function applyMultimodalMergeLayout(
  existingNodes: Node[],
  existingEdges: Edge[],
  extractedNodes: Node[],
  extractedEdges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  // 1. Preservar 100% de las entidades existentes (RB-07.4)
  const mergedNodes: Node[] = existingNodes.map((n) => ({ ...n }));
  const existingNodeIds = new Set(existingNodes.map((n) => n.id.toLowerCase().trim()));
  const existingNodeNames = new Set(
    existingNodes
      .map((n) => ((n.data as any)?.name || "").toString().toLowerCase().trim())
      .filter(Boolean)
  );

  // 2. Calcular Bounding Box de los nodos existentes
  let maxX = 0;
  let minY = Infinity;
  if (existingNodes.length > 0) {
    for (const n of existingNodes) {
      const estimatedWidth = (n.measured?.width ?? (n as any).width ?? 220);
      const rightEdge = n.position.x + estimatedWidth;
      if (rightEdge > maxX) maxX = rightEdge;
      if (n.position.y < minY) minY = n.position.y;
    }
  }
  if (minY === Infinity) minY = 80;

  // 3. Procesar y posicionar los nodos extraídos de la imagen
  let newIndex = 0;
  const idRemap = new Map<string, string>();

  for (const extracted of extractedNodes) {
    const rawId = (extracted.id || "").toString().toLowerCase().trim();
    const rawName = ((extracted.data as any)?.name || (extracted as any).name || "").toString().toLowerCase().trim();

    const idExists = rawId && existingNodeIds.has(rawId);
    const nameExists = rawName && existingNodeNames.has(rawName);

    if (idExists || nameExists) {
      // Clase ya existente: fusionar miembros sin duplicar el nodo ni modificar su posición preexistente
      const existingMatch = mergedNodes.find((n) => {
        const matchId = n.id.toLowerCase().trim();
        const matchName = ((n.data as any)?.name || "").toString().toLowerCase().trim();
        return matchId === rawId || (rawName && matchName === rawName);
      });

      if (existingMatch) {
        idRemap.set(extracted.id, existingMatch.id);
        const existingAttrs = (existingMatch.data as any)?.attributes || [];
        const incomingAttrs = (extracted.data as any)?.attributes || (extracted as any).attributes || [];
        const existingMethods = (existingMatch.data as any)?.methods || [];
        const incomingMethods = (extracted.data as any)?.methods || (extracted as any).methods || [];

        existingMatch.data = {
          ...existingMatch.data,
          attributes: mergeAttributes(existingAttrs, incomingAttrs),
          methods: mergeMethods(existingMethods, incomingMethods),
        };
      }
    } else {
      // Clase genuinamente nueva deducida de la imagen: calcular posición adyacente libre (RB-07.5)
      const offsetX = (maxX > 0 ? maxX + 100 : 80) + (newIndex % 2) * 320;
      const offsetY = minY + Math.floor(newIndex / 2) * 260;

      const newId = extracted.id && (extracted.id.startsWith("class-") || extracted.id.startsWith("note-"))
        ? extracted.id
        : `class-img-${Date.now()}-${newIndex}`;
      idRemap.set(extracted.id, newId);

      mergedNodes.push({
        ...extracted,
        id: newId,
        position: { x: offsetX, y: offsetY },
        data: {
          ...extracted.data,
          isHighlighted: true,
        },
      });
      newIndex++;
    }
  }

  // 4. Preservar y fusionar aristas / relaciones
  const mergedEdges: Edge[] = existingEdges.map((e) => ({ ...e }));

  const getEdgeKey = (e: Edge, src?: string, tgt?: string, edgeData?: any) => {
    const s = src || e.source;
    const t = tgt || e.target;
    const d = edgeData || e.data || {};
    const rel = d.relationType || "ASSOCIATION";
    const isAssoc =
      e.type === "umlAssociationClassEdge" ||
      rel === "ASSOCIATION_CLASS" ||
      Boolean(d.isAssociationClass);

    if (isAssoc) {
      const inter = d.intermediateNodeId || s;
      const sClass = d.sourceClassId || t;
      const tClass = d.targetClassId || "";
      const parents = [sClass, tClass].sort().join("<->");
      return `assoc:${inter}->[${parents}]`;
    }
    return `${s}->${t}:${rel}`;
  };

  const existingEdgeKeys = new Set(existingEdges.map((e) => getEdgeKey(e)));
  const existingEdgeIds = new Set(existingEdges.map((e) => e.id));
  const edgeIdRemap = new Map<string, string>();

  for (const edge of extractedEdges) {
    const source = idRemap.get(edge.source) || edge.source;
    const target = idRemap.get(edge.target) || edge.target;
    const rawRel = (edge.data as any)?.relationType || (edge as any).relationType || "ASSOCIATION";
    const relType = normalizeRelationType(rawRel);

    const edgeData: any = { ...(edge.data || {}) };

    // Remapear identificadores de nodos si fueron modificados por idRemap (RB-07.4)
    if (edgeData.sourceClassId && idRemap.has(edgeData.sourceClassId)) {
      edgeData.sourceClassId = idRemap.get(edgeData.sourceClassId);
    }
    if (edgeData.targetClassId && idRemap.has(edgeData.targetClassId)) {
      edgeData.targetClassId = idRemap.get(edgeData.targetClassId);
    }
    if (edgeData.intermediateNodeId && idRemap.has(edgeData.intermediateNodeId)) {
      edgeData.intermediateNodeId = idRemap.get(edgeData.intermediateNodeId);
    }

    const isAssoc =
      edge.type === "umlAssociationClassEdge" ||
      relType === "ASSOCIATION_CLASS" ||
      Boolean(edgeData.isAssociationClass || edgeData.targetEdgeId);

    if (isAssoc) {
      edgeData.isAssociationClass = true;
      edgeData.relationType = "ASSOCIATION_CLASS";
      if (!edgeData.intermediateNodeId) {
        edgeData.intermediateNodeId = source;
      }
      if (!edgeData.sourceClassId) {
        edgeData.sourceClassId = target;
      }

      // Reconciliar si targetEdgeId fue remapeado previamente
      if (edgeData.targetEdgeId && edgeIdRemap.has(edgeData.targetEdgeId)) {
        edgeData.targetEdgeId = edgeIdRemap.get(edgeData.targetEdgeId);
      }

      // Si falta targetEdgeId o si el targetEdgeId actual no existe en mergedEdges, buscar la arista base
      const targetEdgeExistsInMerged = Boolean(
        edgeData.targetEdgeId && mergedEdges.some((m) => m.id === edgeData.targetEdgeId)
      );
      if (!targetEdgeExistsInMerged && edgeData.sourceClassId && edgeData.targetClassId) {
        const base = mergedEdges.find(
          (m) =>
            m.type !== "umlAssociationClassEdge" &&
            ((m.source === edgeData.sourceClassId && m.target === edgeData.targetClassId) ||
              (m.source === edgeData.targetClassId && m.target === edgeData.sourceClassId))
        );
        if (base) {
          edgeData.targetEdgeId = base.id;
        }
      }
    } else {
      edgeData.relationType = relType;
    }

    const key = getEdgeKey({ ...edge, type: isAssoc ? "umlAssociationClassEdge" : edge.type }, source, target, edgeData);

    if (!existingEdgeKeys.has(key)) {
      existingEdgeKeys.add(key);

      const edgeId = existingEdgeIds.has(edge.id)
        ? `${isAssoc ? "assoc-" : ""}edge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        : edge.id;
      existingEdgeIds.add(edgeId);

      if (edge.id && edgeId !== edge.id) {
        edgeIdRemap.set(edge.id, edgeId);
      }

      mergedEdges.push({
        ...edge,
        id: edgeId,
        source,
        target,
        type: isAssoc ? "umlAssociationClassEdge" : (edge.type || "umlEdge"),
        data: edgeData,
      });
    }
  }

  return { nodes: mergedNodes, edges: mergedEdges };
}

/**
 * Procesa una imagen adjunta de diagrama o boceto en Modo EDITOR con Gemini Vision,
 * aplicando estrictamente la estrategia de FUSIÓN CONTEXTUAL (MERGE por defecto)
 * para preservar el 100% de las clases y relaciones preexistentes (RB-07.4 y RB-07.5).
 */
export async function processMultimodalDiagramWithGemini(
  prompt: string,
  imageAttachment: ImageAttachmentData,
  currentNodes: Node[],
  currentEdges: Edge[],
  diagramName: string = "diagrama",
  apiKey: string = DEFAULT_GEMINI_API_KEY,
  chatHistory?: ChatMessage[]
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
    edges: currentEdges.map((e) => {
      const isAssoc =
        e.type === "umlAssociationClassEdge" ||
        (e.data as any)?.relationType === "ASSOCIATION_CLASS" ||
        Boolean((e.data as any)?.isAssociationClass || (e.data as any)?.targetEdgeId);

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || "bottom-source",
        targetHandle: e.targetHandle || "top-target",
        type: isAssoc ? "umlAssociationClassEdge" : (e.type || "umlEdge"),
        data: {
          relationType: (e.data as any)?.relationType || (isAssoc ? "ASSOCIATION_CLASS" : "ASSOCIATION"),
          sourceMultiplicity: (e.data as any)?.sourceMultiplicity || "",
          targetMultiplicity: (e.data as any)?.targetMultiplicity || "",
          name: (e.data as any)?.name || (e.data as any)?.label || "",
          ...(isAssoc
            ? {
                isAssociationClass: true,
                targetEdgeId: (e.data as any)?.targetEdgeId || "",
                sourceClassId: (e.data as any)?.sourceClassId || "",
                targetClassId: (e.data as any)?.targetClassId || "",
                intermediateNodeId: (e.data as any)?.intermediateNodeId || e.source || "",
              }
            : {}),
        },
      };
    }),
  };

  const systemInstruction = `
Eres un Arquitecto de Software y Especialista en Visión Artificial y Modelado UML 2.5 para un Diagramador de Clases interactivo.
El usuario ha adjuntado una imagen (captura de pantalla, foto de pizarra o boceto) y una directiva para enriquecer su modelo UML actual.

### DIRECTIVAS OBLIGATORIAS DE FUSIÓN CONTEXTUAL (MERGE POR DEFECTO - RB-07.4):
1. PRESERVACIÓN ESTRICTA DEL TRABAJO PREVIO: No elimines ni alteres las clases o relaciones que ya existen en el diagrama, a menos que el usuario lo solicite taxativamente con comandos como 'borra' o 'reemplaza todo'. Conserva íntegramente los nombres, atributos y relaciones preexistentes.
2. EXTRACCIÓN Y FUSIÓN DE NUEVAS ENTIDADES: Identifica en la imagen los clasificadores, atributos, métodos o relaciones adicionales que complementen el modelo. Si una clase de la imagen coincide con una existente, complementa sus miembros sin borrar los que ya estaban.
3. PREVENCIÓN DE SOLAPAMIENTO ESPACIAL (RB-07.5): Posiciona los clasificadores deducidos de la imagen en coordenadas adyacentes libres (desplazadas en el eje X hacia la derecha o en el eje Y hacia abajo respecto a los nodos existentes) para que no se superpongan directamente encima de las clases preexistentes.
4. ESTÁNDAR UML 2.5 Y DETECCIÓN PRECISA DE TERMINALES EN IMÁGENES:
   - Clases (type: "umlClass"): Nombres en PascalCase, visibilidades (+, -, #, ~), atributos y métodos tipados.
   - Notas (type: "umlNote"): contenido explicativo.
   - Relaciones (type: "umlEdge"):
     * COMPOSITION: Rombo relleno negro sólido (◆). 'source' es OBLIGATORIAMENTE la clase con el rombo (contenedor), 'target' es la clase contenida. NUNCA clasifiques como simple ASSOCIATION si hay un rombo negro.
     * AGGREGATION: Rombo hueco blanco (◇). 'source' es la clase con el rombo (agregador), 'target' la clase agregada.
     * GENERALIZATION: Herencia con triángulo cerrado hueco blanco (▷). 'target' es la superclase / clase padre (a donde apunta el triángulo), 'source' es la subclase / clase hija. NUNCA la clasifiques como DIRECTED_ASSOCIATION ni inviertas su dirección.
     * DIRECTED_ASSOCIATION: Flecha abierta simple en la punta (►).
     * REALIZATION: Línea discontinua con triángulo cerrado hueco ( - - ▷).
     * DEPENDENCY: Línea discontinua con flecha abierta (- - ►).
     * ASSOCIATION: Línea sólida sin flechas ni rombos en los extremos.

### INTERPRETACIÓN DE BIFURCACIONES Y UNIONES EN 'T' (CLASES DE ASOCIACIÓN UML 2.5):
Cualquier dibujo, boceto a mano alzada o diagrama en la imagen que presente una bifurcación o unión en 'T' (dos clases conectadas horizontalmente con una rama perpendicular o vertical hacia una tercera clase intermedia/inferior) DEBE interpretarse OBLIGATORIAMENTE como una CLASE DE ASOCIACIÓN:
1. Genera un edge base horizontal directo entre las dos clases padre extremas (type: "umlEdge"):
   {
     "id": "edge-base-1",
     "source": "<id-padre-1>",
     "target": "<id-padre-2>",
     "type": "umlEdge",
     "data": { "relationType": "ASSOCIATION", "name": "" }
   }
2. Genera un edge asociativo (conector en 'T' con línea discontinua perpendicular) desde la clase intermedia hacia la arista base:
   {
     "id": "assoc-edge-1",
     "source": "<id-clase-intermedia>",
     "target": "<id-padre-1>",
     "type": "umlAssociationClassEdge",
     "data": {
       "relationType": "ASSOCIATION_CLASS",
       "isAssociationClass": true,
       "targetEdgeId": "edge-base-1",
       "sourceClassId": "<id-padre-1>",
       "targetClassId": "<id-padre-2>",
       "intermediateNodeId": "<id-clase-intermedia>",
       "name": ""
     }
   }

### INFERENCIA CONTEXTUAL DE NOMBRES PARA CAJAS VACÍAS O SIN TEXTO:
Si en la imagen aparecen rectángulos, cajas o nodos vacíos, sin texto legible o con trazos incompletos dentro de una estructura:
- NUNCA generes nombres vacíos ni nombres genéricos como "Clase1" o "Untitled".
- Infiere y sugiere nombres contextuales inteligentes y coherentes con el dominio deducido a partir del texto visible (por ejemplo, si una caja rotula 'Colaborador' en una estructura en 'T', sugiere 'Proyecto' y 'Usuario' o 'Asignacion' para las entidades complementarias; si rotula 'Inscripcion', sugiere 'Estudiante' y 'Curso').
- Sugiere atributos esenciales coherentes para dichas entidades (como 'id: Long', 'nombre: String', 'fechaCreacion: Date').

### FORMATO JSON REQUERIDO DE RESPUESTA:
{
  "explanation": "Propuesta técnica directa en español redactada OBLIGATORIAMENTE en tiempo futuro explicando con precisión qué vas a hacer antes de que se confirme (ej: 'Voy a incorporar la clase Factura extraída de la imagen y la relacionaré con Pedido...'). NUNCA uses tiempo pasado ni digas 'Se agregaron'.",
  "nodes": [ ...todos los nodos actualizados: los existentes preservados + los nuevos... ],
  "edges": [ ...todas las relaciones actualizadas: las existentes preservadas + las nuevas... ]
}
`;

  const historyContext =
    chatHistory && chatHistory.length > 0
      ? `\nMemoria conversacional previa (últimos ${Math.min(chatHistory.length, 8)} mensajes):\n` +
        chatHistory
          .slice(-8)
          .map((m) => {
            const role = m.senderType === "USER" ? `@${m.userName || "Usuario"}` : "Copilot IA";
            const text = m.proposal?.summary || m.content;
            return `- ${role}: ${text}`;
          })
          .join("\n") +
        "\n"
      : "";

  const userContent = `
Estado actual del diagrama UML (DEBES PRESERVAR ESTAS ENTIDADES - MERGE):
${JSON.stringify(currentDiagramState, null, 2)}
${historyContext}
Instrucción del usuario con respecto a la imagen adjunta:
"${prompt || "Analiza la imagen adjunta e incorpora las clases y relaciones nuevas al diagrama actual"}"

Genera el JSON resultante con la estructura solicitada.`;

  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🌐 [Gemini API - Visión Multimodal Editor] Consultando '${model}' (intento ${attempt}/3)...`);
        const editStart = performance.now();
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
                  parts: [
                    {
                      inlineData: {
                        mimeType: imageAttachment.mimeType || "image/jpeg",
                        data: imageAttachment.base64Data,
                      },
                    },
                    {
                      text: `${systemInstruction}\n\n${userContent}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            }),
          }
        );

        const editDuration = ((performance.now() - editStart) / 1000).toFixed(2);

        if (!response.ok) {
          const errorText = await response.text();
          if ((response.status === 503 || response.status === 429) && attempt < 3) {
            console.warn(`⚠️ [Gemini API] '${model}' respondió ${response.status} en ${editDuration}s. Reintentando en ${attempt * 800}ms...`);
            await sleep(attempt * 800);
            continue;
          }
          console.warn(`⚠️ [Gemini API] '${model}' respondió ${response.status} en ${editDuration}s, probando modelo alternativo...`, errorText);
          lastError = new Error(`Error (${model}): ${response.statusText} - ${errorText}`);
          break;
        }

        console.log(`✨ [Gemini API - Visión Multimodal Editor] Modelo '${model}' procesó imagen y generó estructura JSON en ${editDuration}s`);
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

        // Normalizar y enriquecer el esquema devuelto por la IA
        const normalized = normalizeExtractedDiagram(parsed, currentNodes, currentEdges);

        // FUSIÓN CONTEXTUAL DETERMINISTA Y PREVENCIÓN DE SOLAPAMIENTO ESPACIAL (RB-07.4 y RB-07.5)
        const layoutMerged = applyMultimodalMergeLayout(
          currentNodes,
          currentEdges,
          normalized.nodes,
          normalized.edges
        );

        return {
          nodes: layoutMerged.nodes,
          edges: layoutMerged.edges,
          explanation: normalized.explanation,
        };
      } catch (err: any) {
        if (attempt < 3) {
          await sleep(attempt * 800);
          continue;
        }
        console.warn(`Error procesando multimodal con modelo ${model}:`, err);
        lastError = err;
      }
    }
  }

  throw lastError || new Error("No se pudo procesar la imagen multimodal con Gemini AI.");
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
   - Extrae el NOMBRE DE LA CLASE en PascalCase (ej: "Cliente", "Pedido", "DetalleFactura"). ¡NUNCA dejes nombres genéricos ni vacíos! Si una caja rectangular está vacía o sin rótulo legible dentro de una estructura, infiere un nombre contextual inteligente y coherente con el dominio deducido a partir de los elementos visibles (ej: si se ancla a 'Colaborador', sugiere 'Proyecto' y 'Usuario' o 'Asignacion').
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
   - Identifica cajas de notas (esquina doblada o rectángulo con texto explicativo) y extrae su texto en { "id": "note-1", "type": "umlNote", "content": "..." }.

3. TODAS LAS RELACIONES ENTRE CLASES Y NOTAS (ARISTAS):
   - Reconoce las líneas que conectan clases y su semántica UML exacta:
     * "ASSOCIATION": Línea sólida simple sin flecha ni rombo en los extremos.
     * "DIRECTED_ASSOCIATION": Línea sólida con flecha abierta en la punta (► o >).
     * "GENERALIZATION": Herencia con triángulo cerrado hueco blanco (▷, △, ◁, ▽).
     * "REALIZATION": Implementación con línea punteada/discontinua y triángulo cerrado hueco ( - - ▷).
     * "AGGREGATION": Agregación débil con rombo hueco/blanco (◇).
     * "COMPOSITION": Composición fuerte con rombo relleno negro sólido (◆).
     * "DEPENDENCY": Dependencia con línea punteada y flecha abierta (- - ►).
     * "ASSOCIATION_CLASS": Conector o unión en 'T' de clase de asociación con línea discontinua perpendicular que ancla una clase intermedia a una arista base existente entre dos entidades. DEBES generar la arista base directa horizontal (type: "umlEdge") y el conector asociativo hacia ella con type: "umlAssociationClassEdge" indicando targetEdgeId, sourceClassId, targetClassId e intermediateNodeId.

   - REGLAS INNEGOCIABLES DE DETECCIÓN Y ORIENTACIÓN DE EXTREMOS (UML 2.5):
     * COMPOSITION (◆): Examina minuciosamente el punto de contacto con cada clase. Si hay un rombo relleno de color negro pegado a una clase, la relación ES OBLIGATORIAMENTE "COMPOSITION". 'source' DEBE ser siempre la clase con el rombo negro (el contenedor/todo), y 'target' la clase contenida (parte). ¡NUNCA lo clasifiques como ASSOCIATION ni DIRECTED_ASSOCIATION si tiene rombo!
     * AGGREGATION (◇): Si hay un rombo hueco o blanco pegado a una clase, ES "AGGREGATION". 'source' DEBE ser la clase con el rombo (contenedor), y 'target' la clase agregada.
     * GENERALIZATION (Herencia ▷): El triángulo hueco blanco apunta SIEMPRE hacia la clase padre / superclase. Por tanto, 'target' DEBE ser la superclase (hacia donde apunta el triángulo hueco), y 'source' DEBE ser la subclase / clase hija (de donde sale la línea). ¡NUNCA inviertas este sentido ni uses DIRECTED_ASSOCIATION para herencia!
     * MULTIPLICIDADES: 'sourceMultiplicity' corresponde al número/rango escrito junto a la clase 'source'. 'targetMultiplicity' corresponde al número/rango junto a la clase 'target'. (Ejemplo: si Customer tiene el rombo negro y dice '1', y ShoppingCart dice '0..*', entonces source: "Customer", target: "ShoppingCart", relationType: "COMPOSITION", sourceMultiplicity: "1", targetMultiplicity: "0..*").
   - Para líneas punteadas o anclajes que conectan una nota a una clase (NoteLink), usa relationType: "DEPENDENCY" o "ASSOCIATION".
   - "source": Nombre o ID de la clase/nota origen conforme a las reglas anteriores.
   - "target": Nombre o ID de la clase/nota destino conforme a las reglas anteriores.
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
    },
    {
      "id": "note-1",
      "type": "umlNote",
      "content": "Regla de negocio o nota explicativa detectada en la imagen"
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

  throw lastError || new Error("IA saturada, vuelve a escribir");
}

// =========================================================================
// MÓDULO COPILOT IA: MODO DUAL, SUGERENCIAS PROACTIVAS Y RESILIENCIA 429
// =========================================================================

import { ChatProposalPayload, CopilotMode } from "@/types";

/**
 * Clasifica la intención del usuario entre consulta conceptual ("CHAT")
 * y orden de mutación estructural de diagrama ("EDITOR")
 */
export function classifyPromptIntent(userText: string): CopilotMode {
  const text = (userText || "").toLowerCase().trim();

  // Patrones directos de mutación / edición
  const editPatterns = [
    /\b(crea|crear|agrega|agregar|añade|añadir|elimina|eliminar|borra|borrar)\b/,
    /\b(modifica|modificar|cambia|cambiar|conecta|conectar|asocia|asociar)\b/,
    /\b(nueva clase|nuevo atributo|nuevo metodo|nueva relacion)\b/,
    /\b(agrega atributo|añade atributo|ponle atributo|creale clase)\b/,
  ];

  for (const pattern of editPatterns) {
    if (pattern.test(text)) {
      return "EDITOR";
    }
  }

  return "CHAT";
}

export interface ProactiveSuggestionResult {
  content: string;
  taggedUserName: string;
  proposal?: ChatProposalPayload;
}

/**
 * Genera una sugerencia proactiva breve ante cambios en el lienzo,
 * etiquetando obligatoriamente al autor (@usuario).
 */
export async function generateProactiveSuggestion(
  canvasNodes: Node[],
  canvasEdges: Edge[],
  projectName: string,
  authorName: string,
  customApiKey?: string
): Promise<ProactiveSuggestionResult> {
  const apiKey = customApiKey || DEFAULT_GEMINI_API_KEY;
  if (!apiKey) {
    return {
      taggedUserName: authorName,
      content: `@${authorName}: He registrado tu cambio en el lienzo. Puedes solicitarme sugerencias de normalización o nuevas clases asociadas cuando gustes.`,
    };
  }

  const prompt = `
Analiza este diagrama de clases UML '${projectName}' tras una edición realizada por el colaborador '${authorName}'.
Genera una sugerencia proactiva MUY CONCISA (máximo 2 líneas de texto) empezando obligatoriamente con '@${authorName}:'.
Indica una recomendación útil de normalización, un atributo faltante o una relación recomendada (ej: composición, clase de asociación).
Si la recomendación implica modificar el diagrama, describe en 'proposal.summary' la instrucción técnica exacta y directa para aplicar el cambio (ej: 'Renombrar NuevaClase_2 a Categoría y agregar stock: int a Producto').

FORMATO JSON REQUERIDO:
{
  "taggedUserName": "${authorName}",
  "content": "@${authorName}: [Tu sugerencia concisa]",
  "proposal": {
    "summary": "Instrucción técnica directa de la edición propuesta (ej: Renombrar X a Y, agregar atributo Z)",
    "nodesDelta": [],
    "edgesDelta": []
  }
}
Diagrama actual:
${JSON.stringify({
  nodes: canvasNodes.map((n) => ({ id: n.id, name: n.data?.name, attributes: n.data?.attributes })),
  edges: canvasEdges.map((e) => ({ source: e.source, target: e.target, type: e.data?.relationType })),
})}
`;

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("IA saturada, vuelve a escribir");
        }
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(rawText);

      return {
        taggedUserName: authorName,
        content: parsed.content || `@${authorName}: Sugiero revisar las multiplicidades y atributos de las clases recién editadas.`,
        proposal: parsed.proposal?.summary ? parsed.proposal : undefined,
      };
    } catch (err: any) {
      if (err.message?.includes("IA saturada")) throw err;
    }
  }

  // Fallback seguro ante agotamiento de modelos
  return {
    taggedUserName: authorName,
    content: `@${authorName}: Cambio registrado en el lienzo. ¿Deseas normalizar atributos o agregar operaciones CRUD para esta entidad?`,
  };
}

export interface CopilotChatResponse {
  replyText: string;
  proposal?: ChatProposalPayload;
  newNodes?: Node[];
  newEdges?: Edge[];
}

/**
 * Procesa un mensaje conversacional o directiva de edición con el Copilot IA
 */
export async function chatWithCopilot(
  userText: string,
  mode: CopilotMode,
  canvasNodes: Node[],
  canvasEdges: Edge[],
  projectName: string,
  customApiKey?: string,
  chatHistory?: ChatMessage[],
  imageAttachment?: ImageAttachmentData | null
): Promise<CopilotChatResponse> {
  const apiKey = customApiKey || DEFAULT_GEMINI_API_KEY;
  if (!apiKey) {
    return {
      replyText: "No se encontró configurada la clave NEXT_PUBLIC_GEMINI_API_KEY. Por favor configúrala para habilitar el Copilot en vivo.",
    };
  }

  // Si está en modo EDITOR, procesar mutación de diagrama con tiempo futuro y contexto
  if (mode === "EDITOR") {
    try {
      const result =
        imageAttachment && imageAttachment.base64Data
          ? await processMultimodalDiagramWithGemini(
              userText,
              imageAttachment,
              canvasNodes,
              canvasEdges,
              projectName,
              apiKey,
              chatHistory
            )
          : await processDiagramWithGemini(
              userText,
              canvasNodes,
              canvasEdges,
              projectName,
              apiKey,
              chatHistory
            );

      return {
        replyText: result.explanation,
        proposal: {
          summary: result.explanation,
          nodesDelta: result.nodes,
          edgesDelta: result.edges,
          status: "PENDING",
          mergeStrategy: "MERGE",
        },
        newNodes: result.nodes,
        newEdges: result.edges,
      };
    } catch (err: any) {
      if (err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("saturada")) {
        throw new Error("IA saturada, vuelve a escribir");
      }
      throw err;
    }
  }

  // Si está en modo CHAT, responder de forma conversacional explicativa con memoria de 8 turnos
  const systemPrompt = `
Eres Copilot UML, un asistente experto en ingeniería de software, arquitectura orientada a objetos, normalización y patrones de diseño UML 2.5 para el proyecto '${projectName}'.
DIRECTIVA ESTRICTA DE COMUNICACIÓN:
- Sé DIRECTO, conciso y técnico.
- Cero fórmulas de cortesía, presentaciones vacías o saludos ('¡Hola!', 'Soy tu asistente', 'Como IA', 'Espero te sirva').
- Inicia de inmediato con la explicación técnica, sugerencia arquitectónica o resumen de impacto.
- Responde de forma clara, profesional y formateada en Markdown estructurado (listas, negritas, bloques de código si es necesario).
- NO devuelvas JSON de nodos ni órdenes directas de edición de lienzo a menos que te lo pidan explícitamente.
`;

  const historyContext =
    chatHistory && chatHistory.length > 0
      ? `\nMemoria de mensajes previos (últimos ${Math.min(chatHistory.length, 8)}):\n` +
        chatHistory
          .slice(-8)
          .map((m) => `${m.senderType === "USER" ? `@${m.userName || "Usuario"}` : "Copilot IA"}: ${m.proposal?.summary || m.content}`)
          .join("\n") +
        "\n"
      : "";

  const userPrompt = `
Contexto del diagrama actual '${projectName}':
${JSON.stringify({
  nodes: canvasNodes.map((n) => ({ name: n.data?.name, stereotype: n.data?.stereotype, attributes: n.data?.attributes, methods: n.data?.methods })),
  edges: canvasEdges.map((e) => ({ source: e.source, target: e.target, type: e.data?.relationType })),
})}
${historyContext}
Consulta del usuario:
"${userText}"
`;

  const requestParts: any[] = [];
  if (imageAttachment && imageAttachment.base64Data) {
    requestParts.push({
      inlineData: {
        mimeType: imageAttachment.mimeType || "image/jpeg",
        data: imageAttachment.base64Data,
      },
    });
  }
  requestParts.push({
    text: `${systemPrompt}\n\n${userPrompt}${
      imageAttachment && imageAttachment.base64Data
        ? "\n\nInstrucción adicional multimodal: El usuario ha adjuntado una imagen de soporte (captura, diagrama o boceto). Analiza minuciosamente su contenido visual en relación a la consulta técnica y responde de manera consultiva en Markdown sin generar propuestas de edición ni mutar el lienzo."
        : ""
    }`,
  });

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`🌐 [Gemini API] Enviando solicitud a modelo '${model}'...`);
      const apiStart = performance.now();
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: requestParts }
            ],
            generationConfig: { temperature: 0.4 },
          }),
        }
      );

      const apiDuration = ((performance.now() - apiStart) / 1000).toFixed(2);

      if (!response.ok) {
        console.warn(`⚠️ [Gemini API] Modelo '${model}' retornó status ${response.status} en ${apiDuration}s.`);
        if (response.status === 429) {
          throw new Error("IA saturada, vuelve a escribir");
        }
        continue;
      }

      console.log(`✨ [Gemini API] Respuesta HTTP 200 de '${model}' en ${apiDuration}s`);
      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar respuesta.";
      return { replyText: reply };
    } catch (err: any) {
      if (err.message?.includes("IA saturada")) throw err;
    }
  }

  throw new Error("IA saturada, vuelve a escribir");
}

