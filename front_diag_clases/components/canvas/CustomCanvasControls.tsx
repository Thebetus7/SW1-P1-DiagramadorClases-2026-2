"use client";

import React from "react";
import { useReactFlow } from "@xyflow/react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

export function CustomCanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute bottom-5 left-5 z-20 flex flex-col bg-white border border-slate-300 shadow-sm rounded-md overflow-hidden select-none divide-y divide-slate-200">
      {/* Botón Zoom In */}
      <button
        type="button"
        onClick={() => zoomIn({ duration: 200 })}
        title="Acercar (Zoom In)"
        className="w-8 h-8 flex items-center justify-center text-slate-800 hover:bg-slate-100 transition-colors bg-white"
      >
        <ZoomIn className="w-4 h-4 text-slate-800 stroke-[2.2]" />
      </button>

      {/* Botón Zoom Out */}
      <button
        type="button"
        onClick={() => zoomOut({ duration: 200 })}
        title="Alejar (Zoom Out)"
        className="w-8 h-8 flex items-center justify-center text-slate-800 hover:bg-slate-100 transition-colors bg-white"
      >
        <ZoomOut className="w-4 h-4 text-slate-800 stroke-[2.2]" />
      </button>

      {/* Botón Fit View (Centrar lienzo) */}
      <button
        type="button"
        onClick={() => fitView({ duration: 200, padding: 0.2 })}
        title="Centrar y Ajustar Lienzo"
        className="w-8 h-8 flex items-center justify-center text-slate-800 hover:bg-slate-100 transition-colors bg-white"
      >
        <Maximize2 className="w-4 h-4 text-slate-800 stroke-[2.2]" />
      </button>
    </div>
  );
}
