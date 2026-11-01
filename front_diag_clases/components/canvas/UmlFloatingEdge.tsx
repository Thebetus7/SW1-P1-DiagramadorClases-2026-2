"use client";

import React, { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  useInternalNode,
} from "@xyflow/react";
import { UmlEdgeData, UmlRelationType } from "@/types";
import { getFloatingEdgeParams } from "./utils/floatingEdgeUtils";

function UmlFloatingEdgeComponent({
  id,
  source,
  target,
  sourceX: defaultSourceX,
  sourceY: defaultSourceY,
  targetX: defaultTargetX,
  targetY: defaultTargetY,
  sourcePosition: defaultSourcePos,
  targetPosition: defaultTargetPos,
  style = {},
  data,
  selected,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  // Calcular anclaje perimetral adaptativo directo si ambos nodos están disponibles
  let sx = defaultSourceX;
  let sy = defaultSourceY;
  let tx = defaultTargetX;
  let ty = defaultTargetY;

  if (sourceNode && targetNode) {
    const params = getFloatingEdgeParams(sourceNode, targetNode);
    sx = params.sourceX;
    sy = params.sourceY;
    tx = params.targetX;
    ty = params.targetY;
  }

  // Trazo directo centro-a-perímetro estilo Enterprise Architect
  const edgePath = `M ${sx} ${sy} L ${tx} ${ty}`;
  const labelX = (sx + tx) / 2;
  const labelY = (sy + ty) / 2;

  // Cálculo de offsets vectoriales para multiplicidades junto a la línea
  const len = Math.hypot(tx - sx, ty - sy) || 1;
  const ux = (tx - sx) / len;
  const uy = (ty - sy) / len;
  const nx = -uy;
  const ny = ux;

  const sourceLabelPos = {
    x: sx + ux * 28 + nx * 14,
    y: sy + uy * 28 + ny * 14,
  };
  const targetLabelPos = {
    x: tx - ux * 28 + nx * 14,
    y: ty - uy * 28 + ny * 14,
  };

  const edgeData = data as UmlEdgeData | undefined;
  const relType: UmlRelationType = edgeData?.relationType || "ASSOCIATION";
  const sourceMultiplicity = edgeData?.sourceMultiplicity;
  const targetMultiplicity = edgeData?.targetMultiplicity;
  const relationName = edgeData?.name;

  // Marcadores según tipo de relación UML 2.5
  let markerStart: string | undefined = undefined;
  let markerEnd: string | undefined = undefined;
  let strokeDasharray: string | undefined = undefined;

  const strokeColor = isHovered ? "#4f46e5" : selected ? "#2563eb" : "#334155";
  const strokeWidth = isHovered ? 2.5 : selected ? 2 : 1.5;

  switch (relType) {
    case "GENERALIZATION":
      markerEnd = "url(#uml-generalization-marker)";
      break;

    case "REALIZATION":
      markerEnd = "url(#uml-generalization-marker)";
      strokeDasharray = "6 4";
      break;

    case "DIRECTED_ASSOCIATION":
      markerEnd = "url(#uml-open-arrow-marker)";
      break;

    case "AGGREGATION":
      markerStart = "url(#uml-aggregation-marker)";
      break;

    case "COMPOSITION":
      markerStart = "url(#uml-composition-marker)";
      break;

    case "DEPENDENCY":
      markerEnd = "url(#uml-open-arrow-marker)";
      strokeDasharray = "5 4";
      break;

    case "ASSOCIATION":
    default:
      break;
  }

  return (
    <>
      {/* 1. Hitbox magnético de captura para selección y hover fácil */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={26}
        className="cursor-pointer"
        style={{ pointerEvents: "all" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-edge-id={id}
      />

      {/* 2. Trazo adaptativo de la arista UML */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
          transition: "stroke 0.15s ease, stroke-width 0.15s ease",
          pointerEvents: "none",
        }}
      />

      {/* 3. Indicador central interactivo en hover */}
      {isHovered && (
        <circle
          cx={labelX}
          cy={labelY}
          r={5.5}
          fill="#4f46e5"
          stroke="#ffffff"
          strokeWidth={2}
          className="animate-pulse pointer-events-none z-20 shadow-md"
        />
      )}

      {/* 4. Multiplicidades y etiquetas orientadas */}
      <EdgeLabelRenderer>
        {sourceMultiplicity && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${sourceLabelPos.x}px, ${sourceLabelPos.y}px)`,
              pointerEvents: "none",
            }}
            className="px-1 py-0.5 text-[11px] font-mono font-semibold bg-white/90 border border-slate-200 text-slate-700 rounded shadow-2xs z-10"
          >
            {sourceMultiplicity}
          </div>
        )}

        {targetMultiplicity && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${targetLabelPos.x}px, ${targetLabelPos.y}px)`,
              pointerEvents: "none",
            }}
            className="px-1 py-0.5 text-[11px] font-mono font-semibold bg-white/90 border border-slate-200 text-slate-700 rounded shadow-2xs z-10"
          >
            {targetMultiplicity}
          </div>
        )}

        {relationName && !isHovered && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
            }}
            className="px-1.5 py-0.5 text-[10px] font-sans font-medium bg-white/95 border border-slate-300 text-slate-800 rounded shadow-xs z-10"
          >
            {relationName}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export const UmlFloatingEdge = memo(UmlFloatingEdgeComponent);
