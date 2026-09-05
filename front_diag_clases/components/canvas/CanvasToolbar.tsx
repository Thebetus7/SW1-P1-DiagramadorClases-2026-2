"use client";

import React from "react";
import { Plus, StickyNote, Download, FileCode, Eye, Wifi } from "lucide-react";

interface CanvasToolbarProps {
  onAddClass: () => void;
  onAddNote: () => void;
  onExportJson: () => void;
  onExportXmi: () => void;
  onOpenPreview: () => void;
  isWsConnected: boolean;
}

export function CanvasToolbar({
  onAddClass,
  onAddNote,
  onExportJson,
  onExportXmi,
  onOpenPreview,
  isWsConnected,
}: CanvasToolbarProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white border border-slate-300 shadow-md rounded-md p-1.5 select-none">
      <button
        onClick={onAddClass}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded transition-colors"
      >
        <Plus className="w-3.5 h-3.5 text-slate-900" />
        Añadir Clase
      </button>

      <div className="h-4 w-px bg-slate-200" />

      <button
        onClick={onAddNote}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors"
      >
        <StickyNote className="w-3.5 h-3.5 text-amber-600" />
        Añadir Nota
      </button>

      <div className="h-4 w-px bg-slate-200" />

      {/* Botón Previsualizar XMI / JSON */}
      <button
        onClick={onOpenPreview}
        title="Previsualizar código generado XMI y JSON"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition-colors border border-slate-300"
      >
        <Eye className="w-3.5 h-3.5 text-slate-700" />
        Previsualizar (XMI / JSON)
      </button>

      <div className="h-4 w-px bg-slate-200" />

      {/* Botón Exportar XMI para Enterprise Architect */}
      <button
        onClick={onExportXmi}
        title="Exportar archivo XMI 2.1 compatible con Enterprise Architect v15"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 rounded transition-colors border border-indigo-200"
      >
        <FileCode className="w-3.5 h-3.5 text-indigo-600" />
        Exportar XMI
      </button>

      <div className="h-4 w-px bg-slate-200" />

      {/* Botón Exportar Respaldo JSON */}
      <button
        onClick={onExportJson}
        title="Descargar respaldo JSON del lienzo"
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        JSON
      </button>

      <div className="h-4 w-px bg-slate-200" />

      {/* Connection Indicator */}
      <div
        title={isWsConnected ? "Conectado en tiempo real" : "Modo offline / Reconectando"}
        className="flex items-center gap-1 px-2 text-[11px] text-slate-500"
      >
        {isWsConnected ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-emerald-700">En vivo</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Local</span>
          </>
        )}
      </div>
    </div>
  );
}
