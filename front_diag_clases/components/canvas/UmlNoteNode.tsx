"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { UmlNoteData } from "@/types";

function UmlNoteNodeComponent({ id, data, selected }: NodeProps) {
  const noteData = data as unknown as UmlNoteData;

  return (
    <div
      className={`bg-amber-50 border border-amber-300/80 rounded-sm p-3 min-w-[160px] max-w-[220px] text-xs shadow-sm font-sans text-slate-800 relative select-none ${
        selected ? "ring-2 ring-amber-500 shadow-md" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-amber-400 border border-amber-600 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-amber-400 border border-amber-600 rounded-full"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 bg-amber-400 border border-amber-600 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 bg-amber-400 border border-amber-600 rounded-full"
      />

      <div className="font-semibold text-[11px] text-amber-900/70 mb-1 uppercase tracking-wider">
        Nota
      </div>
      <div className="text-[12px] leading-snug whitespace-pre-wrap">
        {noteData.content || "Escribe una nota aquí..."}
      </div>
    </div>
  );
}

export const UmlNoteNode = memo(UmlNoteNodeComponent);
