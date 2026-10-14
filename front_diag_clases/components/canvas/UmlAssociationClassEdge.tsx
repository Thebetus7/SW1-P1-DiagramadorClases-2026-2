"use client";

import React, { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  useReactFlow,
} from "@xyflow/react";
import { UmlEdgeData } from "@/types";
import { calculateAssociationClassPath } from "@/services/associationClassMath";

function UmlAssociationClassEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as UmlEdgeData | undefined;
  const relationName = edgeData?.name;
  const { getNode, getEdge } = useReactFlow();

  let targetPointX = targetX;
  let targetPointY = targetY;

  if (edgeData?.targetEdgeId) {
    const baseEdge = getEdge(edgeData.targetEdgeId);
    if (baseEdge) {
      const nodeA = getNode(baseEdge.source);
      const nodeB = getNode(baseEdge.target);
      if (nodeA && nodeB) {
        const ax = nodeA.position.x + ((nodeA.measured?.width ?? 200) / 2);
        const ay = nodeA.position.y + ((nodeA.measured?.height ?? 120) / 2);
        const bx = nodeB.position.x + ((nodeB.measured?.width ?? 200) / 2);
        const by = nodeB.position.y + ((nodeB.measured?.height ?? 120) / 2);
        targetPointX = Math.round((ax + bx) / 2);
        targetPointY = Math.round((ay + by) / 2);
      }
    }
  }

  // Calculamos la trayectoria discontinua perpendicular en 'T'
  const { path: edgePath, midpointX: labelX, midpointY: labelY } = calculateAssociationClassPath(
    { x: sourceX, y: sourceY },
    { x: targetPointX, y: targetPointY }
  );

  const strokeColor = selected ? "#4f46e5" : "#64748b";
  const strokeWidth = selected ? 2.5 : 1.8;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: "6 4",
          transition: "stroke 0.15s ease, stroke-width 0.15s ease",
        }}
      />

      {/* Punto de unión en 'T' sobre el centro de la arista destino */}
      <circle
        cx={targetPointX}
        cy={targetPointY}
        r={4}
        fill={selected ? "#4f46e5" : "#475569"}
        stroke="#ffffff"
        strokeWidth={1.5}
        className="transition-colors pointer-events-none"
      />

      {relationName && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
            }}
            className="px-1.5 py-0.5 text-[10px] font-mono font-medium bg-white/95 border border-indigo-200 text-indigo-900 rounded shadow-xs z-10"
          >
            {relationName}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const UmlAssociationClassEdge = memo(UmlAssociationClassEdgeComponent);
