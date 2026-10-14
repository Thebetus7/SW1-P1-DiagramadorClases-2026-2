"use client";

import React, { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
  Position,
} from "@xyflow/react";
import { UmlEdgeData, UmlRelationType } from "@/types";

function calculateOffsetPosition(
  x: number,
  y: number,
  pos: Position,
  offset = 24
): { x: number; y: number } {
  switch (pos) {
    case Position.Top:
      return { x: x + 10, y: y - offset };
    case Position.Bottom:
      return { x: x + 10, y: y + offset - 8 };
    case Position.Left:
      return { x: x - offset - 10, y: y - 10 };
    case Position.Right:
      return { x: x + offset, y: y - 10 };
    default:
      return { x: x + 10, y: y + 10 };
  }
}

function UmlEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const edgeData = data as UmlEdgeData | undefined;
  const relType: UmlRelationType = edgeData?.relationType || "ASSOCIATION";
  const sourceMultiplicity = edgeData?.sourceMultiplicity;
  const targetMultiplicity = edgeData?.targetMultiplicity;
  const relationName = edgeData?.name;
  const hasAssociationClass = Boolean(edgeData?.isAssociationClass);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  // Determinar estilos y marcadores según tipo UML 2.5
  let markerStart: string | undefined = undefined;
  let markerEnd: string | undefined = undefined;
  let strokeDasharray: string | undefined = undefined;
  
  // Resaltado: si está hovered o seleccionado
  let strokeColor = isHovered ? "#4f46e5" : selected ? "#2563eb" : "#334155";
  let strokeWidth = isHovered ? 2.5 : selected ? 2 : 1.5;

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

  // Posiciones de etiquetas de multiplicidad cerca de los extremos
  const sourceLabelPos = calculateOffsetPosition(sourceX, sourceY, sourcePosition, 20);
  const targetLabelPos = calculateOffsetPosition(targetX, targetY, targetPosition, 20);

  return (
    <>
      {/* 1. Hitbox magnético invisible expandido (24px) para captura ultra-suave de hover y drag */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        className="cursor-pointer"
        style={{ pointerEvents: "all" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-edge-id={id}
      />

      {/* 2. Trazo visible de la arista UML */}
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

      {/* 3. Punto magnético central circular cuando se sobrevuela con el cursor */}
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

      {/* 4. Etiquetas de Multiplicidad y Nombre de la relación */}
      <EdgeLabelRenderer>
        {/* Multiplicidad de Origen */}
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

        {/* Multiplicidad de Destino */}
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

        {/* Nombre / Estereotipo de la relación en el centro */}
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

export const UmlEdge = memo(UmlEdgeComponent);
