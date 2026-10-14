import {
  calculateMidpoint,
  calculateDistance,
  calculateAssociationClassPath,
  isPointNearSegment,
  Point,
} from "../../services/associationClassMath";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

console.log("Iniciando pruebas unitarias de associationClassMath...");

// 1. Prueba de Midpoint
const p1: Point = { x: 100, y: 200 };
const p2: Point = { x: 300, y: 400 };
const mid = calculateMidpoint(p1, p2);
assert(mid.x === 200 && mid.y === 300, `Midpoint esperado (200, 300), obtenido (${mid.x}, ${mid.y})`);
console.log("✔ calculateMidpoint pasó con éxito.");

// 2. Prueba de Distancia Euclidiana
const dist = calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
assert(Math.abs(dist - 5) < 0.0001, `Distancia esperada 5, obtenida ${dist}`);
console.log("✔ calculateDistance pasó con éxito.");

// 3. Prueba de Trayectoria Perpendicular en 'T'
const intermediateSource: Point = { x: 200, y: 100 };
const targetMidpoint: Point = { x: 200, y: 300 };
const pathResult = calculateAssociationClassPath(intermediateSource, targetMidpoint);
assert(pathResult.path === "M 200 100 L 200 300", `Trayectoria inesperada: ${pathResult.path}`);
assert(pathResult.midpointX === 200 && pathResult.midpointY === 200, "Centro de trayectoria incorrecto");
console.log("✔ calculateAssociationClassPath pasó con éxito.");

// 4. Prueba de Detección de Proximidad al Segmento (Hitbox Magnético)
const segA: Point = { x: 50, y: 100 };
const segB: Point = { x: 250, y: 100 };
const pointClose: Point = { x: 150, y: 110 }; // A 10px de distancia
const pointFar: Point = { x: 150, y: 200 };   // A 100px de distancia
assert(isPointNearSegment(pointClose, segA, segB, 24) === true, "pointClose debió ser detectado dentro de 24px");
assert(isPointNearSegment(pointFar, segA, segB, 24) === false, "pointFar no debió ser detectado dentro de 24px");
console.log("✔ isPointNearSegment pasó con éxito.");

console.log("🎉 TODAS LAS PRUEBAS DE GEOMETRÍA PERPENDICULAR Y ANCLAJE PASARON EXITOSAMENTE.");
