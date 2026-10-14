import assert from "node:assert/strict";
import { Edge, Node } from "@xyflow/react";
import { UmlAssociationEdgeData } from "../../types";

console.log("Iniciando suite de pruebas de interacción y restricciones de Clases de Asociación en Lienzo...");

// Función pura que emula la lógica de conexión hacia una arista existente en el lienzo (T2.1 & T2.2)
function connectNodeToEdge(
  sourceNodeId: string,
  targetEdgeId: string,
  currentEdges: Edge[]
): { success: boolean; edges: Edge[]; error?: string } {
  const baseEdge = currentEdges.find((e) => e.id === targetEdgeId);
  if (!baseEdge) {
    return { success: false, edges: currentEdges, error: "Arista no encontrada" };
  }

  // Restricción: No asociar a otra clase asociativa (no ternarias/n-arias)
  if (baseEdge.type === "umlAssociationClassEdge") {
    return { success: false, edges: currentEdges, error: "No se puede asociar a un conector en T existente" };
  }

  // Restricción: No asociar una clase que ya es extremo de la relación
  if (baseEdge.source === sourceNodeId || baseEdge.target === sourceNodeId) {
    return { success: false, edges: currentEdges, error: "La clase ya es extremo de la relación" };
  }

  // RB-01: Regla de Unicidad (Máximo 1 clase asociativa por arista)
  const existingAssoc = currentEdges.find(
    (e) =>
      e.type === "umlAssociationClassEdge" &&
      ((e.data as any)?.targetEdgeId === targetEdgeId ||
        ((e.data as any)?.sourceClassId === baseEdge.source && (e.data as any)?.targetClassId === baseEdge.target))
  );

  if (existingAssoc) {
    return {
      success: false,
      edges: currentEdges,
      error: "Esta relación ya cuenta con una clase de asociación vinculada",
    };
  }

  const newAssocEdge: Edge = {
    id: `assoc-edge-${Date.now()}`,
    source: sourceNodeId,
    target: baseEdge.source,
    type: "umlAssociationClassEdge",
    data: {
      relationType: "ASSOCIATION_CLASS",
      isAssociationClass: true,
      targetEdgeId: baseEdge.id,
      sourceClassId: baseEdge.source,
      targetClassId: baseEdge.target,
      intermediateNodeId: sourceNodeId,
      name: "",
    } as any,
  };

  return {
    success: true,
    edges: [...currentEdges, newAssocEdge],
  };
}

// Función pura que emula la desvinculación limpia y borrado en cascada (T2.3)
function deleteEdgeWithCascade(edgeIdToDelete: string, currentEdges: Edge[]): Edge[] {
  const edgeToDelete = currentEdges.find((e) => e.id === edgeIdToDelete);
  if (!edgeToDelete) return currentEdges;

  if (edgeToDelete.type === "umlAssociationClassEdge") {
    // Si la arista eliminada es la T, solo se elimina ella misma. La arista base queda intacta.
    return currentEdges.filter((e) => e.id !== edgeIdToDelete);
  }

  // Si se elimina la arista base, se remueve ella y en cascada su conector en 'T' asociado
  return currentEdges.filter((e) => {
    if (e.id === edgeIdToDelete) return false;
    if (e.type === "umlAssociationClassEdge" && (e.data as any)?.targetEdgeId === edgeIdToDelete) {
      return false;
    }
    return true;
  });
}

// Función pura que emula el borrado de nodo y su impacto en aristas (T2.3)
function deleteNodeWithCascade(
  nodeIdToDelete: string,
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const nextNodes = nodes.filter((n) => n.id !== nodeIdToDelete);
  const deletedDirectEdgeIds = edges
    .filter((e) => e.source === nodeIdToDelete || e.target === nodeIdToDelete)
    .map((e) => e.id);

  const nextEdges = edges.filter((e) => {
    if (e.source === nodeIdToDelete || e.target === nodeIdToDelete) return false;
    if (e.type === "umlAssociationClassEdge") {
      if ((e.data as any)?.intermediateNodeId === nodeIdToDelete) return false;
      if (deletedDirectEdgeIds.includes((e.data as any)?.targetEdgeId)) return false;
    }
    return true;
  });

  return { nodes: nextNodes, edges: nextEdges };
}

// ==========================================
// EJECUCIÓN DE PRUEBAS
// ==========================================

// Setup inicial
const nodeA: Node = { id: "class-user", type: "umlClass", position: { x: 50, y: 100 }, data: { name: "Usuario" } };
const nodeB: Node = { id: "class-diag", type: "umlClass", position: { x: 450, y: 100 }, data: { name: "Diagrama" } };
const nodeC: Node = { id: "class-collab", type: "umlClass", position: { x: 250, y: 300 }, data: { name: "Colaborador" } };
const nodeD: Node = { id: "class-other", type: "umlClass", position: { x: 250, y: 500 }, data: { name: "Auditor" } };

const initialNodes = [nodeA, nodeB, nodeC, nodeD];
const baseEdge: Edge = {
  id: "edge-user-diag",
  source: "class-user",
  target: "class-diag",
  type: "umlEdge",
  data: { relationType: "ASSOCIATION", name: "posee" },
};

let edges = [baseEdge];

// Test 1: Conexión de Clase Intermedia en 'T' (RF-01.1, RF-01.3)
const result1 = connectNodeToEdge("class-collab", "edge-user-diag", edges);
assert.equal(result1.success, true, "La conexión en T debe ser exitosa");
assert.equal(result1.edges.length, 2, "Debe haber 2 aristas (la base y la T)");
const assocEdge = result1.edges.find((e) => e.type === "umlAssociationClassEdge");
assert.ok(assocEdge, "Debe existir la arista de tipo umlAssociationClassEdge");
assert.equal((assocEdge!.data as any).targetEdgeId, "edge-user-diag");
assert.equal((assocEdge!.data as any).intermediateNodeId, "class-collab");
console.log("✔ Test 1: Conexión interactiva y registro del conector en 'T' superado.");

edges = result1.edges;

// Test 2: Regla de Unicidad RB-01 / RF-01.4 (Máximo 1 clase asociativa por arista)
const result2 = connectNodeToEdge("class-other", "edge-user-diag", edges);
assert.equal(result2.success, false, "No debe permitir conectar una segunda clase intermedia a la misma arista");
assert.equal(
  result2.error,
  "Esta relación ya cuenta con una clase de asociación vinculada",
  "Debe emitir el mensaje exacto de restricción"
);
assert.equal(result2.edges.length, 2, "La lista de aristas no debe alterarse");
console.log("✔ Test 2: Regla de Unicidad (RB-01) y alerta informativa superadas.");

// Test 3: Desvinculación limpia del conector en 'T' (RB-02 / RF-02.1)
const edgesAfterTDelete = deleteEdgeWithCascade(assocEdge!.id, edges);
assert.equal(edgesAfterTDelete.length, 1, "Debe quedar solo 1 arista tras eliminar la T");
assert.equal(edgesAfterTDelete[0].id, "edge-user-diag", "La arista base debe permanecer intacta");
assert.equal(edgesAfterTDelete[0].data?.relationType, "ASSOCIATION", "El tipo de la arista base no debe cambiar");
console.log("✔ Test 3: Desvinculación limpia de la 'T' con preservación de arista base superada.");

// Test 4: Eliminación de la arista base y borrado en cascada de la 'T'
const edgesAfterBaseDelete = deleteEdgeWithCascade("edge-user-diag", edges);
assert.equal(edgesAfterBaseDelete.length, 0, "Al borrar la arista base, el conector en 'T' dependiente debe desaparecer en cascada");
console.log("✔ Test 4: Eliminación de arista base con borrado en cascada de la 'T' superada.");

// Test 5: Eliminación de nodo intermedio y persistencia de nodos base
const nodesAfterNodeDelete = deleteNodeWithCascade("class-collab", initialNodes, edges);
assert.equal(nodesAfterNodeDelete.nodes.length, 3, "Debe quedar 3 nodos");
assert.equal(nodesAfterNodeDelete.edges.length, 1, "Debe quedar solo la arista base");
assert.equal(nodesAfterNodeDelete.edges[0].id, "edge-user-diag", "La arista base permanece intacta");
console.log("✔ Test 5: Eliminación del nodo intermedio manteniendo intacta la arista base superada.");

console.log("🎉 TODAS LAS PRUEBAS DE INTERACCIÓN, UNICIDAD Y DESVINCULACIÓN PASARON EXITOSAMENTE.");
