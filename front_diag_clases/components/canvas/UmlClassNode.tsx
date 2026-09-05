"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Edit2 } from "lucide-react";
import { UmlClassData } from "@/types";
import { normalizeAttribute, normalizeMethod } from "@/services/xmiExporter";

function UmlClassNodeComponent({ id, data, selected }: NodeProps) {
  const classData = data as unknown as UmlClassData;

  const onEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof (data as any).onEdit === "function") {
      (data as any).onEdit(id, classData);
    }
  };

  const attributes = (classData.attributes || []).map(normalizeAttribute);
  const methods = (classData.methods || []).map(normalizeMethod);

  return (
    <div
      className={`bg-white rounded-md border min-w-[210px] max-w-[300px] shadow-sm text-xs font-mono transition-shadow select-none ${
        selected ? "border-slate-800 ring-2 ring-slate-800/20 shadow-md" : "border-slate-300"
      }`}
    >
      {/* Handles de conexión en los 4 bordes */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="w-2.5 h-2.5 bg-slate-600 border-2 border-white rounded-full hover:bg-slate-900 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="w-2.5 h-2.5 bg-slate-600 border-2 border-white rounded-full opacity-0 hover:opacity-100"
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="w-2.5 h-2.5 bg-slate-600 border-2 border-white rounded-full hover:bg-slate-900 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="w-2.5 h-2.5 bg-slate-600 border-2 border-white rounded-full opacity-0 hover:opacity-100"
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="w-2.5 h-2.5 bg-slate-600 border-2 border-white rounded-full hover:bg-slate-900 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="w-2.5 h-2.5 bg-slate-600 border-2 border-white rounded-full opacity-0 hover:opacity-100"
      />

      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="w-2.5 h-2.5 bg-slate-600 border-2 border-white rounded-full hover:bg-slate-900 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="w-2.5 h-2.5 bg-slate-600 border-2 border-white rounded-full opacity-0 hover:opacity-100"
      />

      {/* Cabecera / Nombre de la Clase */}
      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 rounded-t-md flex items-center justify-between group">
        <div className="text-center w-full">
          {classData.stereotype && (
            <div className="text-[10px] text-slate-500 font-sans italic font-normal">
              &laquo;{classData.stereotype}&raquo;
            </div>
          )}
          <div className="font-bold text-slate-900 font-sans text-sm tracking-tight truncate">
            {classData.name || "ClaseSinNombre"}
          </div>
        </div>

        <button
          onClick={onEditClick}
          title="Editar Clase"
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-opacity text-slate-600 shrink-0"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Compartimento de Atributos */}
      <div className="p-2 space-y-1 border-b border-slate-200 bg-white min-h-[32px]">
        {attributes.length > 0 ? (
          attributes.map((attr, idx) => (
            <div key={attr.id || idx} className="text-slate-700 text-[11px] truncate leading-tight flex items-center gap-1">
              <span className="font-bold text-slate-800 w-3 shrink-0 text-center">{attr.visibility}</span>
              <span className="font-medium text-slate-900">{attr.name}</span>
              <span className="text-slate-400">:</span>
              <span className="text-slate-600 italic">{attr.type}</span>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-slate-400 italic">sin atributos</div>
        )}
      </div>

      {/* Compartimento de Métodos / Operaciones */}
      <div className="p-2 space-y-1 bg-white rounded-b-md min-h-[32px]">
        {methods.length > 0 ? (
          methods.map((method, idx) => (
            <div key={method.id || idx} className="text-slate-700 text-[11px] truncate leading-tight flex items-center gap-1">
              <span className="font-bold text-slate-800 w-3 shrink-0 text-center">{method.visibility}</span>
              <span className="font-medium text-slate-900">{method.name}</span>
              <span className="text-slate-500 font-normal">({method.parameters || ""})</span>
              <span className="text-slate-400">:</span>
              <span className="text-slate-600 italic">{method.returnType || "void"}</span>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-slate-400 italic">sin métodos</div>
        )}
      </div>
    </div>
  );
}

export const UmlClassNode = memo(UmlClassNodeComponent);
