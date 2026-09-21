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
      className={`group bg-amber-50/95 border border-amber-300/90 rounded-sm p-3 min-w-[160px] max-w-[240px] text-xs shadow-sm font-sans text-slate-800 relative select-none cursor-pointer transition-shadow ${
        selected ? "ring-2 ring-amber-500 shadow-md" : "hover:shadow-md"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="w-2.5 h-2.5 bg-amber-400 border-2 border-white rounded-full hover:bg-amber-600 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="w-2.5 h-2.5 bg-amber-400 border-2 border-white rounded-full opacity-0 hover:opacity-100"
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="w-2.5 h-2.5 bg-amber-400 border-2 border-white rounded-full hover:bg-amber-600 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="w-2.5 h-2.5 bg-amber-400 border-2 border-white rounded-full opacity-0 hover:opacity-100"
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="w-2.5 h-2.5 bg-amber-400 border-2 border-white rounded-full hover:bg-amber-600 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="w-2.5 h-2.5 bg-amber-400 border-2 border-white rounded-full opacity-0 hover:opacity-100"
      />

      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="w-2.5 h-2.5 bg-amber-400 border-2 border-white rounded-full hover:bg-amber-600 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="w-2.5 h-2.5 bg-amber-400 border-2 border-white rounded-full opacity-0 hover:opacity-100"
      />

      {/* Cabecera con etiqueta y botón de edición */}
      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-amber-200/70">
        <span className="font-bold text-[10px] text-amber-900/80 uppercase tracking-wider font-mono">
          Nota UML
        </span>
        <button
          onClick={onEditClick}
          title="Editar contenido de la nota (o haz doble clic)"
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-amber-200/80 rounded transition-opacity text-amber-800"
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

