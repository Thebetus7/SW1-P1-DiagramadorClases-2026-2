"use client";

import React from "react";
import { X, GitFork, ArrowRight, Share2, Diamond, ShieldAlert, Layers } from "lucide-react";
import { UmlRelationType } from "@/types";

interface RelationTypePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: UmlRelationType) => void;
}

interface RelationOption {
  type: UmlRelationType;
  title: string;
  description: string;
  badge: string;
  symbol: string;
}

const RELATION_OPTIONS: RelationOption[] = [
  {
    type: "ASSOCIATION",
    title: "Asociación Simple",
    description: "Conexión general bidireccional entre clases",
    badge: "UML 2.5",
    symbol: "─────",
  },
  {
    type: "DIRECTED_ASSOCIATION",
    title: "Asociación Dirigida",
    description: "Navegabilidad unidireccional hacia la clase destino",
    badge: "Navegabilidad",
    symbol: "────►",
  },
  {
    type: "GENERALIZATION",
    title: "Generalización / Herencia",
    description: "Subclase hereda atributos y métodos de superclase",
    badge: "Herencia",
    symbol: "────▷",
  },
  {
    type: "REALIZATION",
    title: "Realización / Implementación",
    description: "Clase implementa contrato o interfaz",
    badge: "Interfaz",
    symbol: "- - - ▷",
  },
  {
    type: "AGGREGATION",
    title: "Agregación",
    description: "Relación todo-parte débil (el ciclo de vida no depende)",
    badge: "Compartida",
    symbol: "◇────",
  },
  {
    type: "COMPOSITION",
    title: "Composición",
    description: "Relación todo-parte fuerte (la parte depende del todo)",
    badge: "Exclusiva",
    symbol: "◆────",
  },
  {
    type: "DEPENDENCY",
    title: "Dependencia",
    description: "Uso o referencia temporal entre elementos",
    badge: "<<use>>",
    symbol: "- - - ►",
  },
];

export function RelationTypePickerModal({
  isOpen,
  onClose,
  onSelect,
}: RelationTypePickerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-md mx-4 flex flex-col overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Seleccionar Tipo de Relación UML</h3>
            <p className="text-xs text-slate-500">Elige el tipo de conector para la nueva conexión</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-3 space-y-1.5 max-h-[60vh] overflow-y-auto">
          {RELATION_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => {
                onSelect(opt.type);
                onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 text-left rounded-md border border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition-all group"
            >
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-slate-950">
                    {opt.title}
                  </span>
                  <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded">
                    {opt.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">{opt.description}</p>
              </div>

              <div className="px-2 py-1 bg-slate-100 group-hover:bg-slate-200 font-mono text-xs font-bold text-slate-700 rounded transition-colors whitespace-nowrap">
                {opt.symbol}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 flex justify-end bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
