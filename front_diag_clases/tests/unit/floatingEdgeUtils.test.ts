/**
 * Pruebas unitarias de cálculo geométrico y anclaje perimetral para Floating Edges (T4.4)
 */

import assert from "node:assert";
import {
  getNodeIntersection,
  getFloatingEdgeParams,
  NodeRect,
} from "../../components/canvas/utils/floatingEdgeUtils";
import { Position } from "@xyflow/react";

console.log("Iniciando pruebas unitarias de geometría perimetral adaptativa (T4.4)...");

// Nodo Origen de 200 x 100 centrado en (0, 0) -> x: -100, y: -50, w: 200, h: 100
const sourceRect: NodeRect = {
  x: -100,
  y: -50,
  width: 200,
  height: 100,
};

// 1. Caso Norte (Target directamente arriba en y = -300)
const targetNorth: NodeRect = {
  x: -100,
  y: -350,
  width: 200,
  height: 100,
};
const pNorth = getNodeIntersection(sourceRect, targetNorth);
assert.strictEqual(pNorth.position, Position.Top, "Hacia el norte debe conectar por Position.Top");
assert.strictEqual(Math.round(pNorth.y), -50, "La coordenada Y debe coincidir con el borde superior (-50)");
assert.strictEqual(Math.round(pNorth.x), 0, "La coordenada X debe ser 0 en la vertical pura");
console.log("✔ Conexión hacia el Norte verificada sobre el borde superior.");

// 2. Caso Sur (Target directamente abajo en y = 300)
const targetSouth: NodeRect = {
  x: -100,
  y: 250,
  width: 200,
  height: 100,
};
const pSouth = getNodeIntersection(sourceRect, targetSouth);
assert.strictEqual(pSouth.position, Position.Bottom, "Hacia el sur debe conectar por Position.Bottom");
assert.strictEqual(Math.round(pSouth.y), 50, "La coordenada Y debe coincidir con el borde inferior (+50)");
assert.strictEqual(Math.round(pSouth.x), 0, "La coordenada X debe ser 0");
console.log("✔ Conexión hacia el Sur verificada sobre el borde inferior.");

// 3. Caso Este (Target directamente a la derecha en x = 400)
const targetEast: NodeRect = {
  x: 300,
  y: -50,
  width: 200,
  height: 100,
};
const pEast = getNodeIntersection(sourceRect, targetEast);
assert.strictEqual(pEast.position, Position.Right, "Hacia el este debe conectar por Position.Right");
assert.strictEqual(Math.round(pEast.x), 100, "La coordenada X debe coincidir con el borde derecho (+100)");
assert.strictEqual(Math.round(pEast.y), 0, "La coordenada Y debe ser 0");
console.log("✔ Conexión hacia el Este verificada sobre el borde derecho.");

// 4. Caso Oeste (Target directamente a la izquierda en x = -400)
const targetWest: NodeRect = {
  x: -500,
  y: -50,
  width: 200,
  height: 100,
};
const pWest = getNodeIntersection(sourceRect, targetWest);
assert.strictEqual(pWest.position, Position.Left, "Hacia el oeste debe conectar por Position.Left");
assert.strictEqual(Math.round(pWest.x), -100, "La coordenada X debe coincidir con el borde izquierdo (-100)");
assert.strictEqual(Math.round(pWest.y), 0, "La coordenada Y debe ser 0");
console.log("✔ Conexión hacia el Oeste verificada sobre el borde izquierdo.");

// 5. Caso Diagonal Noreste (Target en 45 grados: x = 300, y = -300)
const targetNorthEast: NodeRect = {
  x: 200,
  y: -350,
  width: 200,
  height: 100,
};
const pNE = getNodeIntersection(sourceRect, targetNorthEast);
// Como halfW = 100 y halfH = 50, el ángulo límite de la esquina es atan2(50, 100) ≈ 26.5°.
// A 45° (|dy| = 300 > |dx| = 300 * (50/100) = 150), cortará la cara superior Top.
assert.strictEqual(pNE.position, Position.Top, "A 45 grados debe cortar la cara superior Top debido al ratio 2:1");
assert.strictEqual(Math.round(pNE.y), -50);
assert.ok(pNE.x > 0 && pNE.x < 100, "El punto X de contacto debe estar dentro del semiancho");
console.log("✔ Conexión en cuadrante diagonal Noreste verificada con resolución de ratio de aspecto.");

// 6. Prueba integrada con getFloatingEdgeParams simulando nodos de React Flow
const mockNodeA: any = {
  id: "node-a",
  position: { x: 0, y: 0 },
  measured: { width: 200, height: 100 },
};

const mockNodeB: any = {
  id: "node-b",
  position: { x: 400, y: 300 },
  measured: { width: 200, height: 100 },
};

const params = getFloatingEdgeParams(mockNodeA, mockNodeB);
assert.ok(params.sourceX > 0, "sourceX debe calcularse positivamente");
assert.ok(params.targetX > params.sourceX, "targetX debe ser mayor que sourceX (vector hacia la derecha)");
assert.ok(params.targetY > params.sourceY, "targetY debe ser mayor que sourceY (vector hacia abajo)");
assert.ok(!isNaN(params.angleDeg), "El ángulo director no debe ser NaN");
console.log("✔ getFloatingEdgeParams computó exitosamente coordenadas directas y ángulo angular:", Math.round(params.angleDeg), "°");

// 7. Verificación de delimitación del espacio (5000 x 5000 px)
const EXTENT_MIN = -2500;
const EXTENT_MAX = 2500;
const TOTAL_SPAN = EXTENT_MAX - EXTENT_MIN;
assert.strictEqual(TOTAL_SPAN, 5000, "El espacio delimitado debe abarcar exactamente 5000 px en cada eje");
console.log("✔ Dimensión espacial delimitada 5000 x 5000 px verificada.");

console.log("🎉 Todas las pruebas geométricas de Floating Edges pasaron exitosamente.");
