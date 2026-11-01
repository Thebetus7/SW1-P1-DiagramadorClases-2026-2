import { Position, InternalNode, Node } from "@xyflow/react";

export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IntersectionPoint {
  x: number;
  y: number;
  position: Position;
}

export interface FloatingEdgeParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  angleDeg: number;
}

/**
 * Extrae las coordenadas y dimensiones rectangulares absolutas de un nodo de React Flow
 */
export function getNodeRect(node: InternalNode | Node): NodeRect {
  const x = node.position.x;
  const y = node.position.y;
  const width = (node as any).measured?.width ?? (node as any).width ?? 220;
  const height = (node as any).measured?.height ?? (node as any).height ?? 140;

  return { x, y, width, height };
}

/**
 * Calcula el punto de intersección exacto entre el vector centro-a-centro y el perímetro
 * rectangular del nodo origen estilo Enterprise Architect (sin ángulos fijos a 90 grados).
 */
export function getNodeIntersection(sourceRect: NodeRect, targetRect: NodeRect): IntersectionPoint {
  const c1 = {
    x: sourceRect.x + sourceRect.width / 2,
    y: sourceRect.y + sourceRect.height / 2,
  };

  const c2 = {
    x: targetRect.x + targetRect.width / 2,
    y: targetRect.y + targetRect.height / 2,
  };

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;

  // Si ambos centros son idénticos o están extremadamente cerca
  if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) {
    return { x: c1.x, y: c1.y, position: Position.Top };
  }

  const halfW = sourceRect.width / 2;
  const halfH = sourceRect.height / 2;

  // Comparación de pendientes relativas (|dy| / halfH vs |dx| / halfW)
  if (Math.abs(dy) * halfW > Math.abs(dx) * halfH) {
    // Interseca cara superior o inferior
    if (dy > 0) {
      // Cara inferior (Bottom)
      const ratio = halfH / dy;
      return {
        x: c1.x + dx * ratio,
        y: c1.y + halfH,
        position: Position.Bottom,
      };
    } else {
      // Cara superior (Top)
      const ratio = -halfH / dy;
      return {
        x: c1.x + dx * ratio,
        y: c1.y - halfH,
        position: Position.Top,
      };
    }
  } else {
    // Interseca cara izquierda o derecha
    if (dx > 0) {
      // Cara derecha (Right)
      const ratio = halfW / dx;
      return {
        x: c1.x + halfW,
        y: c1.y + dy * ratio,
        position: Position.Right,
      };
    } else {
      // Cara izquierda (Left)
      const ratio = -halfW / dx;
      return {
        x: c1.x - halfW,
        y: c1.y + dy * ratio,
        position: Position.Left,
      };
    }
  }
}

/**
 * Retorna los parámetros de coordenadas, posiciones de handle flotante y ángulo director
 * para dibujar la arista adaptativa directa entre sourceNode y targetNode.
 */
export function getFloatingEdgeParams(
  sourceNode: InternalNode | Node,
  targetNode: InternalNode | Node
): FloatingEdgeParams {
  const sourceRect = getNodeRect(sourceNode);
  const targetRect = getNodeRect(targetNode);

  const sourcePoint = getNodeIntersection(sourceRect, targetRect);
  const targetPoint = getNodeIntersection(targetRect, sourceRect);

  const dx = targetPoint.x - sourcePoint.x;
  const dy = targetPoint.y - sourcePoint.y;
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  return {
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    targetX: targetPoint.x,
    targetY: targetPoint.y,
    sourcePosition: sourcePoint.position,
    targetPosition: targetPoint.position,
    angleDeg,
  };
}
