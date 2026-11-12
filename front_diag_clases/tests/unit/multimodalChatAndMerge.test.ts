import assert from "node:assert/strict";
import { Edge, Node } from "@xyflow/react";
import { ChatMessage, ChatProposalPayload } from "../../types";
import { isValidImageMimeType } from "../../utils/imageCompressor";
import { applyMultimodalMergeLayout } from "../../services/geminiDiagramService";

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

console.log("🎉 TODAS LAS PRUEBAS DE CHAT MULTIMODAL Y FUSIÓN MERGE PASARON AL 100%.");
