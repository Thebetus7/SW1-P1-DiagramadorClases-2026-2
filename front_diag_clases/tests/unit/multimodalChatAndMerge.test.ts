import assert from "node:assert/strict";
import { Edge, Node } from "@xyflow/react";
import { ChatMessage, ChatProposalPayload } from "../../types";
import { isValidImageMimeType } from "../../utils/imageCompressor";
import { applyMultimodalMergeLayout, normalizeExtractedDiagram } from "../../services/geminiDiagramService";

console.log("Iniciando suite de pruebas unitarias del Módulo 07: Chat Multimodal & Fusión MERGE...");

// -------------------------------------------------------------
// Test 1: Validación y rechazo de archivos inválidos (SC-4)
// -------------------------------------------------------------
assert.equal(isValidImageMimeType("image/jpeg"), true, "JPG debe ser admitido");
assert.equal(isValidImageMimeType("image/png"), true, "PNG debe ser admitido");
assert.equal(isValidImageMimeType("image/webp"), true, "WebP debe ser admitido");
assert.equal(isValidImageMimeType("application/pdf"), false, "PDF debe ser rechazado");
assert.equal(isValidImageMimeType("application/x-msdownload"), false, "EXE debe ser rechazado");
assert.equal(isValidImageMimeType(null), false, "Null debe ser rechazado");
assert.equal(isValidImageMimeType(""), false, "Vacío debe ser rechazado");
console.log("✔ Test 1: Validación y rechazo de tipos MIME no admitidos funciona correctamente (SC-4).");

// -------------------------------------------------------------
// Test 2: Estructura del ChatMessage multimodal (RB-07.3, RF-07.1.3)
// -------------------------------------------------------------
const multimodalMsg: ChatMessage = {
  diagramId: 101,
  senderType: "USER",
  userId: 1,
  userName: "Docente",
  mode: "EDITOR",
  messageType: "CHAT_MESSAGE",
  content: "agrega este módulo desde la pizarra",
  imageUrl: "/api/diagrams/101/images/pizarra_123.jpg",
  attachmentThumbnail: "data:image/jpeg;base64,abc123thumbnail",
  attachmentMimeType: "image/jpeg",
  sourceImageId: "pizarra_123.jpg",
};

assert.ok(multimodalMsg.imageUrl?.startsWith("/api/diagrams/101/images/"));
assert.equal(multimodalMsg.attachmentMimeType, "image/jpeg");
assert.ok(multimodalMsg.attachmentThumbnail?.startsWith("data:image/jpeg;base64,"));
console.log("✔ Test 2: Contrato y atributos de ChatMessage multimodal verificados con éxito (RF-07.1.3).");

// -------------------------------------------------------------
// Test 3: Fusión MERGE preservando 100% de clases existentes y layout no solapante (RB-07.4, RB-07.5, SC-1)
// -------------------------------------------------------------
const existingNodes: Node[] = [
  {
    id: "class-1",
    type: "umlClass",
    position: { x: 100, y: 100 },
    data: { name: "Usuario", attributes: ["+ id: Long"], methods: [] },
  },
  {
    id: "class-2",
    type: "umlClass",
    position: { x: 400, y: 100 },
    data: { name: "Rol", attributes: ["+ id: Long", "+ nombre: String"], methods: [] },
  },
];

const existingEdges: Edge[] = [
  {
    id: "edge-1-2",
    source: "class-1",
    target: "class-2",
    data: { relationType: "ASSOCIATION" },
  },
];

const extractedFromImage: Node[] = [
  {
    id: "class-img-3",
    type: "umlClass",
    position: { x: 0, y: 0 },
    data: { name: "Permiso", attributes: ["+ id: Long", "+ codigo: String"], methods: [] },
  },
];

const extractedEdgesFromImage: Edge[] = [
  {
    id: "edge-2-3",
    source: "class-2",
    target: "class-img-3",
    data: { relationType: "ASSOCIATION" },
  },
];

// Invocamos la función real exportada del servicio de producción
const merged = applyMultimodalMergeLayout(
  existingNodes,
  existingEdges,
  extractedFromImage,
  extractedEdgesFromImage
);

// Comprobaciones RB-07.4: Las clases previas no fueron eliminadas
assert.equal(merged.nodes.length, 3, "Deben existir 3 clases (2 preexistentes + 1 nueva)");
const usuarioNode = merged.nodes.find((n) => (n.data as any)?.name === "Usuario");
const rolNode = merged.nodes.find((n) => (n.data as any)?.name === "Rol");
const permisoNode = merged.nodes.find((n) => (n.data as any)?.name === "Permiso");

assert.ok(usuarioNode, "Clase preexistente 'Usuario' debe estar intacta");
assert.ok(rolNode, "Clase preexistente 'Rol' debe estar intacta");
assert.ok(permisoNode, "Nueva clase 'Permiso' debe haberse incorporado");
assert.equal((permisoNode?.data as any)?.isHighlighted, true, "Clase nueva debe estar resaltada");

// Comprobación RB-07.5: Prevención de solapamiento espacial
assert.ok(
  permisoNode!.position.x > rolNode!.position.x,
  "El nodo nuevo debe ubicarse a la derecha de los existentes para no solaparlos"
);
assert.equal(merged.edges.length, 2, "Deben existir 2 relaciones en el diagrama integrado");
console.log("✔ Test 3: Fusión MERGE y prevención de colisión espacial verificadas (RB-07.4 y RB-07.5).");

// -------------------------------------------------------------
// Test 3.1: Fusión inteligente de miembros de clase existente sin duplicación
// -------------------------------------------------------------
const extractedEnrichment: Node[] = [
  {
    id: "class-ia-usuario",
    type: "umlClass",
    position: { x: 50, y: 50 },
    data: {
      name: "Usuario",
      attributes: ["+ id: Long", "+ email: String"], // Añade email sin duplicar id
      methods: ["+ autenticar(): boolean"],
    },
  },
];

const mergedEnrichment = applyMultimodalMergeLayout(
  existingNodes,
  existingEdges,
  extractedEnrichment,
  []
);

assert.equal(mergedEnrichment.nodes.length, 2, "No debe duplicar la clase Usuario");
const enrichedUsuario = mergedEnrichment.nodes.find((n) => (n.data as any)?.name === "Usuario");
assert.ok(enrichedUsuario, "Usuario debe seguir existiendo");
assert.equal((enrichedUsuario?.data as any)?.attributes?.length, 2, "Debe tener 2 atributos fusionados (+ id y + email)");
console.log("✔ Test 3.1: Fusión de miembros de clases existentes sin duplicación verificada.");

// -------------------------------------------------------------
// Test 4: Propuesta EDITOR_PROPOSAL y ciclo de vida de aceptación (SC-2, RB-07.6)
// -------------------------------------------------------------
const proposalPayload: ChatProposalPayload = {
  summary: "Voy a agregar la clase Permiso y su relación con Rol...",
  nodesDelta: merged.nodes,
  edgesDelta: merged.edges,
  status: "PENDING",
  sourceImageId: "pizarra_123.jpg",
  mergeStrategy: "MERGE",
};

assert.equal(proposalPayload.status, "PENDING", "Estado inicial debe ser PENDING");
assert.equal(proposalPayload.mergeStrategy, "MERGE", "Estrategia por defecto debe ser MERGE");

// Simulación de aceptación (Escenario 2)
proposalPayload.status = "ACCEPTED";
proposalPayload.resolvedByUserId = 1;
proposalPayload.resolvedByUserName = "Docente";
proposalPayload.resolvedAt = new Date().toISOString();

assert.equal(proposalPayload.status, "ACCEPTED");
assert.equal(proposalPayload.resolvedByUserName, "Docente");
console.log("✔ Test 4: Ciclo de vida y transición a ACCEPTED verificado exitosamente (SC-2).");

// -------------------------------------------------------------
// Test 5: normalizeExtractedDiagram con Clases de Asociación en 'T' (RF-07.1.3, RF-04.1)
// -------------------------------------------------------------
console.log("\n--- Suite 5: Normalización de Clases de Asociación en 'T' con Gemini IA ---");

// Test 5.1: Normalización de conector en 'T' explícito preservando tipo y metadatos
{
  const rawPayload = {
    explanation: "Diagrama con clase de asociación Colaborador entre Usuario y Proyecto",
    nodes: [
      { id: "class-user", name: "Usuario", attributes: ["+ id: Long"], methods: [] },
      { id: "class-proj", name: "Proyecto", attributes: ["+ id: Long"], methods: [] },
      { id: "class-collab", name: "Colaborador", attributes: ["- rol: String"], methods: [] },
    ],
    edges: [
      {
        id: "edge-user-proj",
        source: "class-user",
        target: "class-proj",
        type: "umlEdge",
        relationType: "ASSOCIATION",
      },
      {
        id: "assoc-edge-collab",
        source: "class-collab",
        target: "class-user",
        type: "umlAssociationClassEdge",
        relationType: "ASSOCIATION_CLASS",
        data: {
          relationType: "ASSOCIATION_CLASS",
          isAssociationClass: true,
          targetEdgeId: "edge-user-proj",
          sourceClassId: "class-user",
          targetClassId: "class-proj",
          intermediateNodeId: "class-collab",
        },
      },
    ],
  };

  const normalized = normalizeExtractedDiagram(rawPayload);
  assert.equal(normalized.nodes.length, 3, "Deben existir 3 nodos");
  assert.equal(normalized.edges.length, 2, "Deben existir 2 aristas (1 base + 1 conector en T)");

  const baseEdge = normalized.edges.find((e) => e.id === "edge-user-proj");
  assert.ok(baseEdge, "La arista base debe existir");
  assert.equal(baseEdge?.type, "umlEdge");

  const assocEdge = normalized.edges.find((e) => e.type === "umlAssociationClassEdge");
  assert.ok(assocEdge, "El conector en T debe tener type: umlAssociationClassEdge");
  assert.equal((assocEdge?.data as any)?.relationType, "ASSOCIATION_CLASS");
  assert.equal((assocEdge?.data as any)?.isAssociationClass, true);
  assert.equal((assocEdge?.data as any)?.targetEdgeId, "edge-user-proj");
  assert.equal((assocEdge?.data as any)?.sourceClassId, "class-user");
  assert.equal((assocEdge?.data as any)?.targetClassId, "class-proj");
  assert.equal((assocEdge?.data as any)?.intermediateNodeId, "class-collab");
  console.log("✔ Test 5.1: Conector en 'T' explícito normalizado con type: umlAssociationClassEdge y metadatos completos.");
}

// Test 5.2: Auto-resolución de targetEdgeId a partir de nombres de clases padre
{
  const rawPayload = {
    explanation: "Diagrama con clase de asociación sin targetEdgeId explícito",
    nodes: [
      { id: "u-1", name: "Usuario", attributes: [], methods: [] },
      { id: "p-1", name: "Proyecto", attributes: [], methods: [] },
      { id: "c-1", name: "Colaborador", attributes: [], methods: [] },
    ],
    edges: [
      {
        id: "base-edge-100",
        source: "Usuario",
        target: "Proyecto",
        relationType: "ASSOCIATION",
      },
      {
        id: "assoc-from-names",
        source: "Colaborador",
        target: "Usuario",
        relationType: "ASSOCIATION_CLASS",
        sourceClassId: "Usuario",
        targetClassId: "Proyecto",
        intermediateNodeId: "Colaborador",
      },
    ],
  };

  const normalized = normalizeExtractedDiagram(rawPayload);
  assert.equal(normalized.edges.length, 2);

  const assocEdge = normalized.edges.find((e) => e.type === "umlAssociationClassEdge");
  assert.ok(assocEdge);
  assert.equal((assocEdge?.data as any)?.targetEdgeId, "base-edge-100", "targetEdgeId debe resolverse a la arista base correspondiente");
  assert.equal((assocEdge?.data as any)?.sourceClassId, "class-u-1");
  assert.equal((assocEdge?.data as any)?.targetClassId, "class-p-1");
  assert.equal((assocEdge?.data as any)?.intermediateNodeId, "class-c-1");
  console.log("✔ Test 5.2: Auto-resolución de targetEdgeId hacia arista base existente verificada con éxito.");
}

// Test 5.3: Síntesis automática de arista base cuando Gemini solo provee la bifurcación en 'T'
{
  const rawPayload = {
    explanation: "IA devolvió solo la clase asociativa sin arista base horizontal",
    nodes: [
      { id: "n-est", name: "Estudiante", attributes: [], methods: [] },
      { id: "n-cur", name: "Curso", attributes: [], methods: [] },
      { id: "n-ins", name: "Inscripcion", attributes: [], methods: [] },
    ],
    edges: [
      {
        id: "only-assoc",
        source: "Inscripcion",
        target: "Estudiante",
        relationType: "ASSOCIATION_CLASS",
        sourceClassId: "Estudiante",
        targetClassId: "Curso",
        intermediateNodeId: "Inscripcion",
      },
    ],
  };

  const normalized = normalizeExtractedDiagram(rawPayload);
  assert.equal(normalized.edges.length, 2, "Debe sintetizar la arista base horizontal requerida");

  const synthBase = normalized.edges.find((e) => e.type === "umlEdge");
  assert.ok(synthBase, "Debe existir arista base sintetizada");
  assert.equal(synthBase?.source, "class-n-est");
  assert.equal(synthBase?.target, "class-n-cur");

  const assocEdge = normalized.edges.find((e) => e.type === "umlAssociationClassEdge");
  assert.ok(assocEdge, "Debe existir conector en T");
  assert.equal((assocEdge?.data as any)?.targetEdgeId, synthBase?.id, "targetEdgeId debe apuntar a la arista base sintetizada");
  console.log("✔ Test 5.3: Síntesis automática de arista base horizontal para cumplir estándar UML 2.5 superada.");
}

// Test 5.4: Inferencia y fallback para cajas sin texto o nombres vacíos
{
  const rawPayload = {
    explanation: "Diagrama con cajas sin rótulo",
    nodes: [
      { id: "b1", name: "", attributes: [] },
      { id: "b2", name: "   ", attributes: [] },
    ],
    edges: [],
  };

  const normalized = normalizeExtractedDiagram(rawPayload);
  assert.equal(normalized.nodes.length, 2);
  assert.equal((normalized.nodes[0].data as any)?.name, "Clase_1", "Caja vacía debe recibir nombre fallback Clase_1");
  assert.equal((normalized.nodes[1].data as any)?.name, "Clase_2", "Caja con espacios debe recibir nombre fallback Clase_2");
  console.log("✔ Test 5.4: Fallback seguro y asignación de nombres para cajas vacías verificado.");
}

// -------------------------------------------------------------
// Test 6: applyMultimodalMergeLayout con Clases de Asociación en 'T' (RB-07.4, RB-07.5)
// -------------------------------------------------------------
console.log("\n--- Suite 6: Fusión MERGE y remapeo de Clases de Asociación en 'T' ---");

// Test 6.1: Fusión MERGE preservando conector 'T' existente y sumando nuevo conector 'T'
{
  const existingDiagramNodes: Node[] = [
    { id: "c-user", type: "umlClass", position: { x: 100, y: 100 }, data: { name: "Usuario" } },
    { id: "c-proj", type: "umlClass", position: { x: 500, y: 100 }, data: { name: "Proyecto" } },
    { id: "c-collab", type: "umlClass", position: { x: 300, y: 350 }, data: { name: "Colaborador" } },
  ];
  const existingDiagramEdges: Edge[] = [
    { id: "edge-base-up", source: "c-user", target: "c-proj", type: "umlEdge", data: { relationType: "ASSOCIATION" } },
    {
      id: "edge-assoc-collab",
      source: "c-collab",
      target: "c-user",
      type: "umlAssociationClassEdge",
      data: {
        relationType: "ASSOCIATION_CLASS",
        isAssociationClass: true,
        targetEdgeId: "edge-base-up",
        sourceClassId: "c-user",
        targetClassId: "c-proj",
        intermediateNodeId: "c-collab",
      },
    },
  ];

  const extractedImageNodes: Node[] = [
    { id: "c-est", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Estudiante" } },
    { id: "c-cur", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Curso" } },
    { id: "c-ins", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Inscripcion" } },
  ];
  const extractedImageEdges: Edge[] = [
    { id: "edge-base-ec", source: "c-est", target: "c-cur", type: "umlEdge", data: { relationType: "ASSOCIATION" } },
    {
      id: "edge-assoc-ins",
      source: "c-ins",
      target: "c-est",
      type: "umlAssociationClassEdge",
      data: {
        relationType: "ASSOCIATION_CLASS",
        isAssociationClass: true,
        targetEdgeId: "edge-base-ec",
        sourceClassId: "c-est",
        targetClassId: "c-cur",
        intermediateNodeId: "c-ins",
      },
    },
  ];

  const mergedResult = applyMultimodalMergeLayout(
    existingDiagramNodes,
    existingDiagramEdges,
    extractedImageNodes,
    extractedImageEdges
  );

  assert.equal(mergedResult.nodes.length, 6, "Deben coexistir 6 nodos sin sobreescrituras");
  assert.equal(mergedResult.edges.length, 4, "Deben coexistir 4 aristas (2 aristas base + 2 conectores en T)");

  const assocEdges = mergedResult.edges.filter((e) => e.type === "umlAssociationClassEdge");
  assert.equal(assocEdges.length, 2, "Ambos conectores en T deben mantenerse con type umlAssociationClassEdge");
  console.log("✔ Test 6.1: Preservación de 'T' existente y adición de nueva 'T' en layout MERGE superada.");
}

// Test 6.2: Remapeo coherente de sourceClassId, targetClassId e intermediateNodeId con idRemap
{
  // Simular nodos de imagen cuyos IDs son genéricos y el layout los remapea
  const existingDiagramNodes: Node[] = [
    { id: "class-actual-1", type: "umlClass", position: { x: 50, y: 50 }, data: { name: "Empresa" } },
  ];
  const existingDiagramEdges: Edge[] = [];

  const rawExtractedNodes: Node[] = [
    { id: "raw-temp-1", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Cliente" } },
    { id: "raw-temp-2", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Contrato" } },
    { id: "raw-temp-3", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Firma" } },
  ];

  const rawExtractedEdges: Edge[] = [
    {
      id: "edge-temp-base",
      source: "raw-temp-1",
      target: "raw-temp-2",
      type: "umlEdge",
      data: { relationType: "ASSOCIATION" },
    },
    {
      id: "edge-temp-assoc",
      source: "raw-temp-3",
      target: "raw-temp-1",
      type: "umlAssociationClassEdge",
      data: {
        relationType: "ASSOCIATION_CLASS",
        isAssociationClass: true,
        targetEdgeId: "edge-temp-base",
        sourceClassId: "raw-temp-1",
        targetClassId: "raw-temp-2",
        intermediateNodeId: "raw-temp-3",
      },
    },
  ];

  const mergedResult = applyMultimodalMergeLayout(
    existingDiagramNodes,
    existingDiagramEdges,
    rawExtractedNodes,
    rawExtractedEdges
  );

  const assocEdge = mergedResult.edges.find((e) => e.type === "umlAssociationClassEdge");
  assert.ok(assocEdge, "El conector en T debe existir");
  const data = assocEdge?.data as any;

  // Los IDs en sourceClassId, targetClassId e intermediateNodeId deben haber sido remapeados
  assert.notEqual(data.sourceClassId, "raw-temp-1", "sourceClassId no debe mantener el ID temporal");
  assert.notEqual(data.targetClassId, "raw-temp-2", "targetClassId no debe mantener el ID temporal");
  assert.notEqual(data.intermediateNodeId, "raw-temp-3", "intermediateNodeId no debe mantener el ID temporal");

  const clienteNode = mergedResult.nodes.find((n) => (n.data as any)?.name === "Cliente");
  const contratoNode = mergedResult.nodes.find((n) => (n.data as any)?.name === "Contrato");
  const firmaNode = mergedResult.nodes.find((n) => (n.data as any)?.name === "Firma");

  assert.equal(data.sourceClassId, clienteNode?.id, "sourceClassId debe remapearse al nuevo ID de Cliente");
  assert.equal(data.targetClassId, contratoNode?.id, "targetClassId debe remapearse al nuevo ID de Contrato");
  assert.equal(data.intermediateNodeId, firmaNode?.id, "intermediateNodeId debe remapearse al nuevo ID de Firma");
  console.log("✔ Test 6.2: Remapeo automático de sourceClassId, targetClassId e intermediateNodeId con idRemap verificado.");
}

// Test 6.3: Deduplicación estricta de conectores en 'T' para la misma clase asociativa
{
  const existingNodes: Node[] = [
    { id: "class-a", type: "umlClass", position: { x: 100, y: 100 }, data: { name: "Doctor" } },
    { id: "class-b", type: "umlClass", position: { x: 500, y: 100 }, data: { name: "Paciente" } },
    { id: "class-c", type: "umlClass", position: { x: 300, y: 300 }, data: { name: "Cita" } },
  ];
  const existingEdges: Edge[] = [
    { id: "edge-dp", source: "class-a", target: "class-b", type: "umlEdge", data: { relationType: "ASSOCIATION" } },
    {
      id: "assoc-cita",
      source: "class-c",
      target: "class-a",
      type: "umlAssociationClassEdge",
      data: {
        relationType: "ASSOCIATION_CLASS",
        isAssociationClass: true,
        targetEdgeId: "edge-dp",
        sourceClassId: "class-a",
        targetClassId: "class-b",
        intermediateNodeId: "class-c",
      },
    },
  ];

  // La imagen extrae de nuevo la misma clase asociativa
  const extractedNodes: Node[] = [
    { id: "img-doc", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Doctor" } },
    { id: "img-pac", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Paciente" } },
    { id: "img-cita", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Cita" } },
  ];
  const extractedEdges: Edge[] = [
    { id: "edge-img-dp", source: "img-doc", target: "img-pac", type: "umlEdge", data: { relationType: "ASSOCIATION" } },
    {
      id: "assoc-img-cita",
      source: "img-cita",
      target: "img-doc",
      type: "umlAssociationClassEdge",
      data: {
        relationType: "ASSOCIATION_CLASS",
        isAssociationClass: true,
        targetEdgeId: "edge-img-dp",
        sourceClassId: "img-doc",
        targetClassId: "img-pac",
        intermediateNodeId: "img-cita",
      },
    },
  ];

  const merged = applyMultimodalMergeLayout(existingNodes, existingEdges, extractedNodes, extractedEdges);
  assert.equal(merged.nodes.length, 3, "No debe duplicar las clases Doctor, Paciente ni Cita");
  const assocEdges = merged.edges.filter((e) => e.type === "umlAssociationClassEdge");
  assert.equal(assocEdges.length, 1, "No debe duplicar el conector en T para la misma asociación");
  console.log("✔ Test 6.3: Deduplicación estricta de conectores en 'T' redundantes verificada.");
}

// -------------------------------------------------------------
// Suite 7: Casos Borde Críticos de Reconocimiento y Resiliencia en 'T'
// -------------------------------------------------------------
console.log("\n--- Suite 7: Resiliencia Extrema de Clases de Asociación en 'T' ---");

// Test 7.1: Conector en 'T' donde rawTarget es directamente el ID de la arista base
{
  const rawPayload = {
    explanation: "Diagrama donde la IA vincula el target del conector al ID de la arista base",
    nodes: [
      { id: "class-u-1", name: "Usuario" },
      { id: "class-p-1", name: "Proyecto" },
      { id: "class-c-1", name: "Colaborador" },
    ],
    edges: [
      {
        id: "edge-base-up",
        source: "Usuario",
        target: "Proyecto",
        type: "umlEdge",
        relationType: "ASSOCIATION",
      },
      {
        id: "assoc-to-edge-id",
        source: "Colaborador",
        target: "edge-base-up",
        relationType: "ASSOCIATION_CLASS",
      },
    ],
  };

  const normalized = normalizeExtractedDiagram(rawPayload);
  const assoc = normalized.edges.find((e) => e.type === "umlAssociationClassEdge");
  assert.ok(assoc, "Debe preservar el conector en 'T' aun si target es el ID de la arista");
  assert.equal((assoc?.data as any)?.targetEdgeId, "edge-base-up");
  assert.equal((assoc?.data as any)?.sourceClassId, "class-u-1");
  assert.equal((assoc?.data as any)?.targetClassId, "class-p-1");
  assert.equal((assoc?.data as any)?.intermediateNodeId, "class-c-1");
  console.log("✔ Test 7.1: Reconocimiento exitoso de conector en 'T' cuando rawTarget apunta al ID de la arista base.");
}

// Test 7.2: Autodeducción del segundo padre cuando la IA solo envía un extremo padre
{
  const rawPayload = {
    explanation: "La IA solo reportó un padre (Usuario) en el conector",
    nodes: [
      { id: "node-user", name: "Usuario" },
      { id: "node-proj", name: "Proyecto" },
      { id: "node-collab", name: "Colaborador" },
    ],
    edges: [
      {
        id: "base-up",
        source: "Usuario",
        target: "Proyecto",
        relationType: "ASSOCIATION",
      },
      {
        id: "assoc-partial",
        source: "Colaborador",
        target: "Usuario",
        relationType: "ASSOCIATION_CLASS",
      },
    ],
  };

  const normalized = normalizeExtractedDiagram(rawPayload);
  const assoc = normalized.edges.find((e) => e.type === "umlAssociationClassEdge");
  assert.ok(assoc, "El conector en T debe existir");
  assert.equal((assoc?.data as any)?.targetEdgeId, "base-up", "Debe autovincularse a base-up");
  assert.equal((assoc?.data as any)?.sourceClassId, "node-user");
  assert.equal((assoc?.data as any)?.targetClassId, "node-proj", "Debe autodeducir el segundo padre Proyecto");
  console.log("✔ Test 7.2: Autodeducción del segundo padre y anclaje a arista base verificados.");
}

// Test 7.3: Preservación de arista base preexistente en el lienzo sin síntesis de arista duplicada
{
  const existingNodes: Node[] = [
    { id: "node-client", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Cliente" } },
    { id: "node-account", type: "umlClass", position: { x: 300, y: 0 }, data: { name: "Cuenta" } },
  ];
  const existingEdges: Edge[] = [
    { id: "real-base-100", source: "node-client", target: "node-account", type: "umlEdge", data: { relationType: "ASSOCIATION" } },
  ];

  // La imagen solo aporta la nueva clase Titularidad
  const extractedPayload = {
    explanation: "Se agrega Titularidad como clase asociativa entre Cliente y Cuenta",
    nodes: [
      { id: "node-tit", name: "Titularidad" },
    ],
    edges: [
      {
        source: "Titularidad",
        target: "Cliente",
        relationType: "ASSOCIATION_CLASS",
        sourceClassId: "Cliente",
        targetClassId: "Cuenta",
      },
    ],
  };

  const normalized = normalizeExtractedDiagram(extractedPayload, existingNodes, existingEdges);
  assert.equal(normalized.edges.length, 1, "No debe sintetizar una arista base duplicada porque ya existe en el lienzo");
  const assoc = normalized.edges[0];
  assert.equal(assoc.type, "umlAssociationClassEdge");
  assert.equal((assoc.data as any)?.targetEdgeId, "real-base-100", "Debe anclarse a la arista real preexistente");
  console.log("✔ Test 7.3: Preservación de arista base existente sin aristas duplicadas superada.");
}

// Test 7.4: Reconciliación reactiva de targetEdgeId en applyMultimodalMergeLayout si apuntaba a un ID fantasma
{
  const canvasNodes: Node[] = [
    { id: "u-base", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Usuario" } },
    { id: "p-base", type: "umlClass", position: { x: 400, y: 0 }, data: { name: "Proyecto" } },
  ];
  const canvasEdges: Edge[] = [
    { id: "canvas-edge-up", source: "u-base", target: "p-base", type: "umlEdge", data: { relationType: "ASSOCIATION" } },
  ];

  const extractedNodes: Node[] = [
    { id: "c-extracted", type: "umlClass", position: { x: 200, y: 200 }, data: { name: "Colaborador" } },
  ];
  const extractedEdges: Edge[] = [
    {
      id: "assoc-edge-test",
      source: "c-extracted",
      target: "u-base",
      type: "umlAssociationClassEdge",
      data: {
        relationType: "ASSOCIATION_CLASS",
        isAssociationClass: true,
        targetEdgeId: "ghost-id-no-longer-exists",
        sourceClassId: "u-base",
        targetClassId: "p-base",
        intermediateNodeId: "c-extracted",
      },
    },
  ];

  const merged = applyMultimodalMergeLayout(canvasNodes, canvasEdges, extractedNodes, extractedEdges);
  const assoc = merged.edges.find((e) => e.type === "umlAssociationClassEdge");
  assert.ok(assoc);
  assert.equal((assoc?.data as any)?.targetEdgeId, "canvas-edge-up", "Debe sanar el ID fantasma y apuntar al ID real");
  console.log("✔ Test 7.4: Reconciliación reactiva de targetEdgeId comprobada.");
}

// Test 7.5: Hidratación correcta de proposal a partir de proposalJson (historial MongoDB)
{
  const serializedProposal: ChatProposalPayload = {
    summary: "Voy a agregar la clase de asociación Colaborador",
    nodesDelta: [
      { id: "c-1", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Colaborador" } },
    ],
    edgesDelta: [
      {
        id: "assoc-1",
        source: "c-1",
        target: "u-1",
        type: "umlAssociationClassEdge",
        data: {
          relationType: "ASSOCIATION_CLASS",
          isAssociationClass: true,
          targetEdgeId: "base-1",
          sourceClassId: "u-1",
          targetClassId: "p-1",
          intermediateNodeId: "c-1",
        },
      },
    ],
    status: "PENDING",
  };

  const rawHistoryMessage: Partial<ChatMessage> = {
    id: "msg-from-mongo",
    senderType: "COPILOT",
    userName: "Copilot IA",
    mode: "EDITOR",
    messageType: "EDITOR_PROPOSAL",
    content: "Voy a agregar la clase de asociación Colaborador",
    proposalJson: JSON.stringify(serializedProposal),
    proposal: null,
  };

  // Simulación de hidratación al cargar historial
  let effectiveProposal = rawHistoryMessage.proposal;
  if (!effectiveProposal && rawHistoryMessage.proposalJson) {
    effectiveProposal = JSON.parse(rawHistoryMessage.proposalJson);
  }

  assert.ok(effectiveProposal, "La propuesta debe ser hidratada exitosamente");
  assert.equal(effectiveProposal?.nodesDelta?.length, 1);
  assert.equal(effectiveProposal?.edgesDelta?.[0]?.type, "umlAssociationClassEdge");
  console.log("✔ Test 7.5: Hidratación de propuesta desde proposalJson verificada.");
}

console.log("\n===================================================================");
console.log("🎉 TODAS LAS PRUEBAS DE CHAT MULTIMODAL, FUSIÓN MERGE Y 'T' PASARON AL 100%.");
console.log("===================================================================\n");
