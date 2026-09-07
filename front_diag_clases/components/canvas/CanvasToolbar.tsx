"use client";

import React from "react";
import { Plus, StickyNote, Download, FileCode, Eye, Wifi, Server, Sparkles, Smartphone } from "lucide-react";

interface CanvasToolbarProps {
  onAddClass: () => void;
  onAddNote: () => void;
  onOpenPreview: () => void;
  onOpenSpringBootExport: () => void;
  onOpenFlutterExport: () => void;
  isWsConnected: boolean;
}

export function CanvasToolbar({
  onAddClass,
  onAddNote,
  onOpenPreview,
  onOpenSpringBootExport,
  onOpenFlutterExport,
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

      {/* Botón Preview XMI / JSON */}
      <button
        onClick={onOpenPreview}
        title="Previsualizar y exportar código generado XMI y JSON"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 rounded transition-colors border border-indigo-200"
      >
        <Eye className="w-3.5 h-3.5 text-indigo-600" />
        Preview (XMI / JSON)
      </button>

      <div className="h-4 w-px bg-slate-200" />

      {/* Botón Exportar Proyecto Spring Boot */}
      <button
        onClick={onOpenSpringBootExport}
        title="Generar y descargar proyecto backend Spring Boot (MVC + PostgreSQL + Endpoints)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition-all border border-emerald-300 shadow-xs hover:scale-[1.02] active:scale-[0.98]"
      >
        <Server className="w-3.5 h-3.5 text-emerald-600" />
        Exportar Spring Boot (ZIP)
      </button>

      <div className="h-4 w-px bg-slate-200" />

      {/* Botón Exportar Proyecto Flutter */}
      <button
        onClick={onOpenFlutterExport}
        title="Generar y descargar proyecto frontend Flutter con IA Local (Voz + NL a CRUD)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded transition-all border border-sky-300 shadow-xs hover:scale-[1.02] active:scale-[0.98]"
      >
        <Smartphone className="w-3.5 h-3.5 text-sky-600" />
        Exportar Flutter (ZIP)
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

