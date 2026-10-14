/**
 * Utilidades matemáticas y geométricas para el cálculo de Clases de Asociación en 'T' (UML 2.5)
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Calcula el punto medio cartesiano entre dos coordenadas.
 */
export function calculateMidpoint(p1: Point, p2: Point): Point {
  return {
    x: Math.round((p1.x + p2.x) / 2),
    y: Math.round((p1.y + p2.y) / 2),
  };
}

/**
 * Calcula la distancia euclidiana entre dos puntos.
 */
export function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Genera la trayectoria SVG perpendicular para una arista de clase de asociación en 'T'.
 * Conecta el puerto de la clase intermedia con el punto medio de la arista base.
 */
export function calculateAssociationClassPath(
  source: Point,
  targetMidpoint: Point
): {
  path: string;
  midpointX: number;
  midpointY: number;
} {
  // Trazado directo o con quiebre ortogonal suave
  const path = `M ${source.x} ${source.y} L ${targetMidpoint.x} ${targetMidpoint.y}`;
  return {
    path,
    midpointX: Math.round((source.x + targetMidpoint.x) / 2),
    midpointY: Math.round((source.y + targetMidpoint.y) / 2),
  };
}

/**
 * Determina si un punto (cursor del mouse) está dentro del radio de tolerancia
 * de un segmento de línea (para detección de anclaje magnético).
 */
export function isPointNearSegment(
  p: Point,
  p1: Point,
  p2: Point,
  tolerance: number = 24
): boolean {
  const lineLen = calculateDistance(p1, p2);
  if (lineLen === 0) return calculateDistance(p, p1) <= tolerance;

  // Proyección escalar t sobre el segmento [0, 1]
  const t = Math.max(
    0,
    Math.min(1, ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / (lineLen * lineLen))
  );

  const projection: Point = {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };

  return calculateDistance(p, projection) <= tolerance;
}
