"use client";

import React, { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { UmlRelationType } from "@/types";

interface RelationTypePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: UmlRelationType, relationName?: string) => void;
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

const COMMON_VERBS = [
  "contiene",
  "actualiza",
  "es",
  "depende",
  "administra",
  "pertenece a",
  "genera",
  "posee",
];

export function RelationTypePickerModal({
  isOpen,
  onClose,
  onSelect,
}: RelationTypePickerModalProps) {
  const [relationName, setRelationName] = useState("");

  if (!isOpen) return null;

  const handleSelect = (type: UmlRelationType) => {
    onSelect(type, relationName.trim());
    setRelationName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white rounded-xl border border-slate-300 shadow-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Nueva Relación UML</h3>
            <p className="text-xs text-slate-500">
              Personaliza el nombre de la relación y selecciona el tipo de conector
            </p>
          </div>
          <button
            onClick={() => {
              setRelationName("");
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input para Nombre/Verbo de la Relación */}
        <div className="px-5 pt-4 pb-2 bg-white border-b border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nombre / Verbo de la Relación <span className="text-slate-400 font-normal">(Opcional)</span>
          </label>
          <input
            type="text"
            value={relationName}
            onChange={(e) => setRelationName(e.target.value)}
            placeholder="Ej. contiene, actualiza, depende, administra..."
            className="w-full px-3 py-1.5 text-xs font-sans border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-slate-800"
          />

          {/* Chips de Verbos Rápidos */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[10px] text-slate-400 font-medium mr-0.5">Sugerencias:</span>
            {COMMON_VERBS.map((verb) => (
              <button
                key={verb}
                type="button"
                onClick={() => setRelationName(verb)}
                className={`px-2 py-0.5 text-[11px] rounded-md border transition-colors ${
                  relationName === verb
                    ? "bg-indigo-600 text-white border-indigo-600 font-medium"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {verb}
              </button>
            ))}
          </div>
        </div>

        {/* Options List */}
        <div className="p-4 space-y-1.5 max-h-[50vh] overflow-y-auto bg-slate-50/50">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Selecciona el tipo de conector:
          </div>
          {RELATION_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => handleSelect(opt.type)}
              className="w-full flex items-center justify-between p-2.5 text-left rounded-lg border border-slate-200 bg-white hover:border-indigo-600 hover:shadow-xs transition-all group"
            >
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-950">
                    {opt.title}
                  </span>
                  <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded">
                    {opt.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">{opt.description}</p>
              </div>

              <div className="px-2 py-1 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-700 font-mono text-xs font-bold text-slate-700 rounded transition-colors whitespace-nowrap">
                {opt.symbol}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 flex justify-end bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setRelationName("");
              onClose();
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
