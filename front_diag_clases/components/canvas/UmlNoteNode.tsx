"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Edit2 } from "lucide-react";
import { UmlNoteData } from "@/types";

function UmlNoteNodeComponent({ id, data, selected }: NodeProps) {
  const noteData = data as unknown as UmlNoteData;

  const onEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof (data as any).onEdit === "function") {
      (data as any).onEdit(id, noteData);
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof (data as any).onEdit === "function") {
      (data as any).onEdit(id, noteData);
    }
  };

  return (
    <div
      onDoubleClick={onDoubleClick}
      className={`group bg-[#FFFFE6] border border-amber-300 rounded-none p-3 min-w-[160px] max-w-[240px] text-xs shadow-sm font-sans text-slate-800 relative select-none cursor-pointer transition-shadow ${
        selected ? "ring-2 ring-amber-500 shadow-md" : "hover:shadow-md"
      }`}
    >
      {/* Pliegue doblado técnico dog-ear en la esquina superior derecha (estilo Enterprise Architect) */}
      <div className="absolute top-0 right-0 w-3.5 h-3.5 overflow-hidden pointer-events-none">
        <svg width="14" height="14" viewBox="0 0 14 14" className="block">
          {/* Tapa la esquina superior derecha con el fondo del lienzo */}
          <polygon points="0,0 14,0 14,14" fill="#F8FAFC" />
          <line x1="0" y1="0" x2="14" y2="14" stroke="#D97706" strokeWidth="1" />
          {/* Solapa doblada hacia adentro */}
          <polygon points="0,0 14,14 0,14" fill="#FEF08A" stroke="#D97706" strokeWidth="1" />
        </svg>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!w-2 !h-2 !bg-amber-500 !border !border-white !rounded-none opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="!w-2 !h-2 !bg-amber-500 !border !border-white !rounded-none opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="!w-2 !h-2 !bg-amber-500 !border !border-white !rounded-none opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!w-2 !h-2 !bg-amber-500 !border !border-white !rounded-none opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!w-2 !h-2 !bg-amber-500 !border !border-white !rounded-none opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!w-2 !h-2 !bg-amber-500 !border !border-white !rounded-none opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
      />

      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="!w-2 !h-2 !bg-amber-500 !border !border-white !rounded-none opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!w-2 !h-2 !bg-amber-500 !border !border-white !rounded-none opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
      />

      {/* Cabecera con etiqueta y botón de edición */}
      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-amber-300/80 mr-2">
        <span className="font-bold text-[10px] text-amber-900/80 uppercase tracking-wider font-mono">
          Nota UML
        </span>
        <button
          onClick={onEditClick}
          title="Editar contenido de la nota (o haz doble clic)"
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-amber-200 rounded-none transition-opacity text-amber-800"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </div>

      {/* Contenido textual de la nota */}
      <div className="text-[12px] leading-snug whitespace-pre-wrap text-slate-800 break-words max-h-[180px] overflow-y-auto">
        {noteData.content || "Escribe una nota aquí..."}
      </div>
    </div>
  );
}

export const UmlNoteNode = memo(UmlNoteNodeComponent);
