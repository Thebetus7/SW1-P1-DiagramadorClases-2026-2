import assert from "node:assert/strict";
import { Edge, Node } from "@xyflow/react";
import { ImportCanvasMode } from "../../types";

console.log("Iniciando suite de pruebas unitarias de importación de diagramas y Layout de Fusión Espacial (Merge vs Replace)...");

/**
 * Función pura que calcula la integración de nodos y aristas importadas (T3.3)
 */
function applyImageImport(
  existingNodes: Node[],
  existingEdges: Edge[],
  importedNodes: Node[],
  importedEdges: Edge[],
  mode: ImportCanvasMode
): { nodes: Node[]; edges: Edge[] } {
  if (mode === "REPLACE") {
    return {
      nodes: importedNodes.map((n) => ({ ...n })),
      edges: importedEdges.map((e) => ({ ...e })),
    };
  }

  // Modo MERGE: Cálculo armónico de layout espacial para evitar solapamientos
  let maxX = 0;
  let minY = Infinity;
  if (existingNodes.length > 0) {
    for (const n of existingNodes) {
      const nodeWidth = (n.measured?.width ?? (n as any).width ?? 220);
      const rightEdge = n.position.x + nodeWidth;
      if (rightEdge > maxX) maxX = rightEdge;
      if (n.position.y < minY) minY = n.position.y;
    }
  }
  if (minY === Infinity) minY = 100;

  let importMinX = Infinity;
  let importMinY = Infinity;
  for (const n of importedNodes) {
    if (n.position.x < importMinX) importMinX = n.position.x;
    if (n.position.y < importMinY) importMinY = n.position.y;
  }
  if (importMinX === Infinity) importMinX = 0;
  if (importMinY === Infinity) importMinY = 0;

  const offsetX = (maxX > 0 ? maxX + 120 : 100) - importMinX;
  const offsetY = (minY > 0 ? minY : 100) - importMinY;

  const timestamp = Date.now();
  const idMap = new Map<string, string>();

  const remappedNodes = importedNodes.map((n, idx) => {
    const newId = `imported-${timestamp}-${idx}`;
    idMap.set(n.id, newId);
    return {
      ...n,
      id: newId,
      position: {
        x: Math.round(n.position.x + offsetX),
        y: Math.round(n.position.y + offsetY),
      },
    };
  });

  const remappedEdges = importedEdges.map((e, idx) => {
    const newSource = idMap.get(e.source) || e.source;
    const newTarget = idMap.get(e.target) || e.target;
    const newEdgeId = `imported-edge-${timestamp}-${idx}`;
    return {
      ...e,
      id: newEdgeId,
      source: newSource,
      target: newTarget,
    };
  });

  return {
    nodes: [...existingNodes, ...remappedNodes],
    edges: [...existingEdges, ...remappedEdges],
  };
}

// ==========================================
// EJECUCIÓN DE PRUEBAS
// ==========================================

const existingNodes: Node[] = [
  { id: "node-1", type: "umlClass", position: { x: 50, y: 100 }, data: { name: "Usuario" } },
  { id: "node-2", type: "umlClass", position: { x: 350, y: 100 }, data: { name: "Rol" } },
];

const existingEdges: Edge[] = [
  { id: "edge-1", source: "node-1", target: "node-2", type: "umlEdge", data: { relationType: "ASSOCIATION" } },
];

const importedNodes: Node[] = [
  { id: "class-order", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Pedido" } },
  { id: "class-item", type: "umlClass", position: { x: 250, y: 0 }, data: { name: "ItemPedido" } },
];

const importedEdges: Edge[] = [
  { id: "edge-order-item", source: "class-order", target: "class-item", type: "umlEdge", data: { relationType: "COMPOSITION" } },
];

// Test 1: Modo REPLACE (Sobrescritura completa)
const replaceResult = applyImageImport(existingNodes, existingEdges, importedNodes, importedEdges, "REPLACE");
assert.equal(replaceResult.nodes.length, 2, "En REPLACE debe haber exactamente 2 nodos");
assert.equal(replaceResult.nodes[0].data?.name, "Pedido", "El primer nodo debe ser el importado");
assert.equal(replaceResult.edges.length, 1, "En REPLACE debe haber exactamente 1 arista");
assert.equal(replaceResult.edges[0].data?.relationType, "COMPOSITION", "La arista debe ser la importada");
console.log("✔ Test 1: Modo REPLACE sustituye el lienzo al 100% correctamente.");

// Test 2: Modo MERGE (Suma de nodos y aristas)
const mergeResult = applyImageImport(existingNodes, existingEdges, importedNodes, importedEdges, "MERGE");
assert.equal(mergeResult.nodes.length, 4, "En MERGE debe haber 4 nodos en total (2 existentes + 2 nuevos)");
assert.equal(mergeResult.edges.length, 2, "En MERGE debe haber 2 aristas en total");
console.log("✔ Test 2: Modo MERGE preserva nodos y aristas existentes sumando los importados.");

// Test 3: Desplazamiento espacial sin solapamiento
const existingMaxX = 350 + 220; // 570px
for (const n of mergeResult.nodes) {
  if (n.id.startsWith("imported-")) {
    assert.ok(
      n.position.x >= existingMaxX + 50,
      `El nodo importado (${n.data?.name}) con x=${n.position.x} debe posicionarse a la derecha de los existentes (maxX=${existingMaxX})`
    );
  }
}
console.log("✔ Test 3: Desplazamiento espacial armónico sin solapamientos verificado.");

// Test 4: Mapeo de identificadores de aristas en modo MERGE
const newEdge = mergeResult.edges.find((e) => e.id.startsWith("imported-edge-"));
assert.ok(newEdge, "Debe existir la arista remapeada");
assert.ok(newEdge!.source.startsWith("imported-"), "El source de la arista debe apuntar al ID remapeado");
assert.ok(newEdge!.target.startsWith("imported-"), "El target de la arista debe apuntar al ID remapeado");
console.log("✔ Test 4: Remapeo coherente de aristas en modo MERGE verificado.");

console.log("🎉 TODAS LAS PRUEBAS DE IMPORTACIÓN DUAL (REPLACE vs MERGE) PASARON EXITOSAMENTE.");
